const db = require('../db');
const jwt = require('jsonwebtoken');

// WebSocket event handlers for real-time features
class WebSocketEvents {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // Store user connections
    this.roomSubscriptions = new Map(); // Track room subscriptions
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.use(this.authenticateSocket.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));
  }

  // Authenticate WebSocket connections
  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user data from database
      const userId = decoded.user ? decoded.user.id : decoded.userId;
      const result = await db.query(
        'SELECT user_id, username, email FROM users WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return next(new Error('User not found'));
      }

      socket.user = result.rows[0];
      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  }

  // Handle new WebSocket connections
  handleConnection(socket) {
    const userId = socket.user.id;
    const username = socket.user.username;

    console.log(`[WebSocket] User ${username} (${userId}) connected: ${socket.id}`);

    // Store user connection
    this.connectedUsers.set(userId, {
      socketId: socket.id,
      socket: socket,
      username: username,
      connectedAt: new Date()
    });

    // Join user's personal room for notifications
    socket.join(`user_${userId}`);

    // Send connection confirmation
    socket.emit('connection_confirmed', {
      userId: userId,
      username: username,
      timestamp: new Date().toISOString()
    });

    // Set up event listeners
    this.setupSocketEventListeners(socket);

    // Handle disconnect
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  // Set up event listeners for a socket
  setupSocketEventListeners(socket) {
    const userId = socket.user.id;

    // Data subscription events
    socket.on('subscribe', (data) => this.handleSubscription(socket, data));
    socket.on('unsubscribe', (data) => this.handleUnsubscription(socket, data));

    // Project-specific events
    socket.on('project_view', (data) => this.handleProjectView(socket, data));
    socket.on('project_interest', (data) => this.handleProjectInterest(socket, data));
    socket.on('project_update', (data) => this.handleProjectUpdate(socket, data));

    // Real-time messaging
    socket.on('typing_started', (data) => this.handleTypingStarted(socket, data));
    socket.on('typing_stopped', (data) => this.handleTypingStopped(socket, data));
    socket.on('send_message', (data) => this.handleSendMessage(socket, data));

    // Analytics events
    socket.on('track_event', (data) => this.handleTrackEvent(socket, data));
    socket.on('page_view', (data) => this.handlePageView(socket, data));

    // Collaboration events
    socket.on('join_collaboration', (data) => this.handleJoinCollaboration(socket, data));
    socket.on('leave_collaboration', (data) => this.handleLeaveCollaboration(socket, data));
    socket.on('cursor_move', (data) => this.handleCursorMove(socket, data));

    // AI and recommendation events
    socket.on('request_recommendations', (data) => this.handleRequestRecommendations(socket, data));
    socket.on('feedback_recommendation', (data) => this.handleRecommendationFeedback(socket, data));
  }

  // Handle data subscriptions
  async handleSubscription(socket, data) {
    try {
      const { dataType, filters = {} } = data;
      const userId = socket.user.id;
      const roomName = `${dataType}_${userId}`;

      socket.join(roomName);

      // Track subscription
      if (!this.roomSubscriptions.has(roomName)) {
        this.roomSubscriptions.set(roomName, new Set());
      }
      this.roomSubscriptions.get(roomName).add(socket.id);

      console.log(`[WebSocket] User ${userId} subscribed to ${dataType}`);

      // Send initial data
      const initialData = await this.getInitialData(dataType, userId, filters);
      socket.emit(`${dataType}_initial_data`, initialData);

    } catch (error) {
      console.error('Subscription error:', error);
      socket.emit('subscription_error', { error: error.message });
    }
  }

  // Handle data unsubscriptions
  handleUnsubscription(socket, data) {
    const { dataType } = data;
    const userId = socket.user.id;
    const roomName = `${dataType}_${userId}`;

    socket.leave(roomName);

    // Remove from subscription tracking
    if (this.roomSubscriptions.has(roomName)) {
      this.roomSubscriptions.get(roomName).delete(socket.id);
    }

    console.log(`[WebSocket] User ${userId} unsubscribed from ${dataType}`);
  }

  // Handle project view events
  async handleProjectView(socket, data) {
    try {
      const { projectId } = data;
      const userId = socket.user.id;

      // Update view count in database
      await db.query(`
        UPDATE project_analytics 
        SET view_count = view_count + 1, last_activity = NOW()
        WHERE project_id = $1
      `, [projectId]);

      // Log activity
      await this.logActivity(userId, 'project_view', 'project', projectId, 'Viewed project');

      // Broadcast to project owner
      const projectOwner = await this.getProjectOwner(projectId);
      if (projectOwner && projectOwner !== userId) {
        this.io.to(`user_${projectOwner}`).emit('project_viewed', {
          projectId,
          viewerId: userId,
          viewerName: socket.user.username,
          timestamp: new Date().toISOString()
        });
      }

      // Update trending score
      await this.updateTrendingScore(projectId);

    } catch (error) {
      console.error('Project view error:', error);
    }
  }

  // Handle project interest events
  async handleProjectInterest(socket, data) {
    try {
      const { projectId, interestType = 'like' } = data;
      const userId = socket.user.id;

      // Update interest count
      await db.query(`
        UPDATE project_analytics 
        SET interest_count = interest_count + 1
        WHERE project_id = $1
      `, [projectId]);

      // Log activity
      await this.logActivity(userId, 'project_interest', 'project', projectId, `Showed interest in project`);

      // Notify project owner
      const projectOwner = await this.getProjectOwner(projectId);
      if (projectOwner && projectOwner !== userId) {
        this.io.to(`user_${projectOwner}`).emit('project_interest_received', {
          projectId,
          userId,
          username: socket.user.username,
          interestType,
          timestamp: new Date().toISOString()
        });
      }

      // Update trending score
      await this.updateTrendingScore(projectId);

    } catch (error) {
      console.error('Project interest error:', error);
    }
  }

  // Handle project updates
  async handleProjectUpdate(socket, data) {
    try {
      const { projectId, updateType, updateData } = data;
      const userId = socket.user.id;

      // Verify user owns the project
      const isOwner = await this.verifyProjectOwnership(projectId, userId);
      if (!isOwner) {
        socket.emit('error', { message: 'Unauthorized project update' });
        return;
      }

      // Broadcast update to interested users
      const interestedUsers = await this.getInterestedUsers(projectId);
      interestedUsers.forEach(interestedUserId => {
        if (interestedUserId !== userId) {
          this.io.to(`user_${interestedUserId}`).emit('project_updated', {
            projectId,
            updateType,
            updateData,
            timestamp: new Date().toISOString()
          });
        }
      });

    } catch (error) {
      console.error('Project update error:', error);
    }
  }

  // Handle typing indicators
  handleTypingStarted(socket, data) {
    const { roomId, context } = data;
    const userId = socket.user.id;
    const username = socket.user.username;

    socket.to(roomId).emit('user_typing_started', {
      userId,
      username,
      context,
      timestamp: new Date().toISOString()
    });
  }

  handleTypingStopped(socket, data) {
    const { roomId, context } = data;
    const userId = socket.user.id;
    const username = socket.user.username;

    socket.to(roomId).emit('user_typing_stopped', {
      userId,
      username,
      context,
      timestamp: new Date().toISOString()
    });
  }

  // Handle real-time messaging
  async handleSendMessage(socket, data) {
    try {
      const { roomId, message, messageType = 'text' } = data;
      const userId = socket.user.id;
      const username = socket.user.username;

      // Store message in database
      const result = await db.query(`
        INSERT INTO realtime_events (
          event_type, user_id, entity_type, payload, created_at
        ) VALUES ('message_sent', $1, 'room', $2, NOW())
        RETURNING id
      `, [userId, JSON.stringify({ roomId, message, messageType })]);

      const messageData = {
        id: result.rows[0].id,
        userId,
        username,
        message,
        messageType,
        timestamp: new Date().toISOString()
      };

      // Broadcast to room
      this.io.to(roomId).emit('new_message', messageData);

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('message_error', { error: error.message });
    }
  }

  // Handle analytics event tracking
  async handleTrackEvent(socket, data) {
    try {
      const { eventType, eventData } = data;
      const userId = socket.user.id;

      // Store analytics event
      await db.query(`
        INSERT INTO realtime_events (
          event_type, user_id, entity_type, payload, created_at
        ) VALUES ($1, $2, 'analytics', $3, NOW())
      `, [eventType, userId, JSON.stringify(eventData)]);

      // Broadcast to admin dashboard if needed
      if (this.shouldBroadcastToAdmin(eventType)) {
        this.io.to('admin_dashboard').emit('analytics_event', {
          eventType,
          userId,
          eventData,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Track event error:', error);
    }
  }

  // Handle page view tracking
  async handlePageView(socket, data) {
    try {
      const { page, metadata = {} } = data;
      const userId = socket.user.id;

      await this.logActivity(userId, 'page_view', 'page', page, `Viewed ${page}`, metadata);

    } catch (error) {
      console.error('Page view error:', error);
    }
  }

  // Handle collaboration events
  handleJoinCollaboration(socket, data) {
    const { projectId } = data;
    const userId = socket.user.id;
    const username = socket.user.username;

    const collaborationRoom = `collaboration_${projectId}`;
    socket.join(collaborationRoom);

    // Notify other collaborators
    socket.to(collaborationRoom).emit('user_joined_collaboration', {
      userId,
      username,
      timestamp: new Date().toISOString()
    });

    // Send current active users
    const activeUsers = this.getActiveCollaborators(collaborationRoom);
    socket.emit('active_collaborators', activeUsers);
  }

  handleLeaveCollaboration(socket, data) {
    const { projectId } = data;
    const userId = socket.user.id;
    const username = socket.user.username;

    const collaborationRoom = `collaboration_${projectId}`;
    socket.leave(collaborationRoom);

    // Notify other collaborators
    socket.to(collaborationRoom).emit('user_left_collaboration', {
      userId,
      username,
      timestamp: new Date().toISOString()
    });
  }

  // Handle cursor movement in collaboration
  handleCursorMove(socket, data) {
    const { projectId, position } = data;
    const userId = socket.user.id;

    const collaborationRoom = `collaboration_${projectId}`;
    socket.to(collaborationRoom).emit('cursor_moved', {
      userId,
      position,
      timestamp: new Date().toISOString()
    });
  }

  // Handle AI recommendation requests
  async handleRequestRecommendations(socket, data) {
    try {
      const { preferences, context } = data;
      const userId = socket.user.id;

      // Generate recommendations (integrate with AI service)
      const recommendations = await this.generateRecommendations(userId, preferences, context);

      socket.emit('recommendations_generated', {
        recommendations,
        context,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Recommendation error:', error);
      socket.emit('recommendation_error', { error: error.message });
    }
  }

  // Handle recommendation feedback
  async handleRecommendationFeedback(socket, data) {
    try {
      const { recommendationId, feedback, rating } = data;
      const userId = socket.user.id;

      // Store feedback
      await db.query(`
        INSERT INTO realtime_events (
          event_type, user_id, entity_type, entity_id, payload, created_at
        ) VALUES ('recommendation_feedback', $1, 'recommendation', $2, $3, NOW())
      `, [userId, recommendationId, JSON.stringify({ feedback, rating })]);

    } catch (error) {
      console.error('Recommendation feedback error:', error);
    }
  }

  // Handle disconnection
  handleDisconnect(socket) {
    const userId = socket.user?.id;
    const username = socket.user?.username;

    if (userId) {
      console.log(`[WebSocket] User ${username} (${userId}) disconnected: ${socket.id}`);
      
      // Remove from connected users
      this.connectedUsers.delete(userId);
      
      // Clean up room subscriptions
      this.roomSubscriptions.forEach((subscribers, roomName) => {
        subscribers.delete(socket.id);
        if (subscribers.size === 0) {
          this.roomSubscriptions.delete(roomName);
        }
      });

      // Notify collaboration rooms
      socket.rooms.forEach(roomName => {
        if (roomName.startsWith('collaboration_')) {
          socket.to(roomName).emit('user_left_collaboration', {
            userId,
            username,
            timestamp: new Date().toISOString()
          });
        }
      });
    }
  }

  // Utility methods
  async getInitialData(dataType, userId, filters) {
    try {
      let query, params;
      
      switch (dataType) {
        case 'dashboard':
          return await this.getDashboardData(userId);
        case 'projects':
          return await this.getUserProjects(userId, filters);
        case 'notifications':
          return await this.getUserNotifications(userId, filters);
        case 'recommendations':
          return await this.getUserRecommendations(userId, filters);
        case 'analytics':
          return await this.getUserAnalytics(userId);
        default:
          return {};
      }
    } catch (error) {
      console.error(`Error getting initial data for ${dataType}:`, error);
      return {};
    }
  }

  async getDashboardData(userId) {
    const result = await db.query(`
      SELECT 
        ua.*,
        (SELECT COUNT(*) FROM projects WHERE user_id = $1 AND deleted_at IS NULL) as project_count,
        (SELECT COUNT(*) FROM purchase_requests pr JOIN projects p ON pr.project_id = p.id WHERE p.user_id = $1) as total_interest
      FROM user_analytics ua
      WHERE ua.user_id = $1
    `, [userId]);

    return result.rows[0] || {};
  }

  async getUserProjects(userId, filters) {
    let query = `
      SELECT p.*, pa.view_count, pa.trending_score
      FROM projects p
      LEFT JOIN project_analytics pa ON p.id = pa.project_id
      WHERE p.user_id = $1 AND p.deleted_at IS NULL
    `;
    
    const params = [userId];
    
    if (filters.category) {
      params.push(filters.category);
      query += ` AND p.category = $${params.length}`;
    }
    
    query += ` ORDER BY p.updated_at DESC`;
    
    if (filters.limit) {
      params.push(filters.limit);
      query += ` LIMIT $${params.length}`;
    }

    const result = await db.query(query, params);
    return result.rows;
  }

  async getUserNotifications(userId, filters) {
    const result = await db.query(`
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `, [userId, filters.limit || 20]);

    return result.rows;
  }

  async getUserRecommendations(userId, filters) {
    const result = await db.query(`
      SELECT r.*, p.title, p.description, p.sale_price
      FROM recommendations r
      JOIN projects p ON r.project_id = p.id
      WHERE r.user_id = $1 AND r.is_active = true
      ORDER BY r.score DESC
      LIMIT $2
    `, [userId, filters.limit || 10]);

    return result.rows;
  }

  async getUserAnalytics(userId) {
    const result = await db.query(`
      SELECT ua.*, 
        (SELECT json_agg(af.*) FROM (
          SELECT * FROM activity_feed 
          WHERE user_id = $1 
          ORDER BY created_at DESC 
          LIMIT 10
        ) af) as recent_activity
      FROM user_analytics ua
      WHERE ua.user_id = $1
    `, [userId]);

    return result.rows[0] || {};
  }

  async getProjectOwner(projectId) {
    const result = await db.query(
      'SELECT user_id FROM projects WHERE id = $1',
      [projectId]
    );
    return result.rows[0]?.user_id;
  }

  async verifyProjectOwnership(projectId, userId) {
    const result = await db.query(
      'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );
    return result.rows.length > 0;
  }

  async getInterestedUsers(projectId) {
    const result = await db.query(`
      SELECT DISTINCT buyer_id FROM purchase_requests 
      WHERE project_id = $1
    `, [projectId]);
    return result.rows.map(row => row.buyer_id);
  }

  async updateTrendingScore(projectId) {
    try {
      await db.query('SELECT calculate_trending_score($1)', [projectId]);
    } catch (error) {
      console.error('Error updating trending score:', error);
    }
  }

  async logActivity(userId, activityType, entityType, entityId, title, metadata = {}) {
    try {
      await db.query(`
        INSERT INTO activity_feed (
          user_id, activity_type, entity_type, entity_id, title, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [userId, activityType, entityType, entityId, title, JSON.stringify(metadata)]);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  getActiveCollaborators(roomName) {
    const room = this.io.sockets.adapter.rooms.get(roomName);
    if (!room) return [];

    const activeUsers = [];
    room.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket && socket.user) {
        activeUsers.push({
          id: socket.user.id,
          username: socket.user.username,
          socketId: socketId
        });
      }
    });

    return activeUsers;
  }

  shouldBroadcastToAdmin(eventType) {
    const adminEvents = ['error', 'purchase_completed', 'high_value_view', 'suspicious_activity'];
    return adminEvents.includes(eventType);
  }

  async generateRecommendations(userId, preferences, context) {
    // This would integrate with the AI recommendations API
    // For now, return mock data
    return {
      personalized: [],
      trending: [],
      similar: []
    };
  }

  // Public methods for external use
  broadcastToUser(userId, event, data) {
    const userConnection = this.connectedUsers.get(userId);
    if (userConnection) {
      userConnection.socket.emit(event, data);
    }
  }

  broadcastToRoom(roomName, event, data) {
    this.io.to(roomName).emit(event, data);
  }

  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }
}

module.exports = WebSocketEvents;