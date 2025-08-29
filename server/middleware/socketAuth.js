const jwt = require('jsonwebtoken');
const db = require('../db');

/**
 * Enhanced Socket.IO Authentication Middleware
 * Handles JWT token validation, refresh scenarios, and connection persistence
 */
class SocketAuthManager {
  constructor(io) {
    this.io = io;
    this.authenticatedSockets = new Map(); // socketId -> { userId, username, tokenExpiry }
    this.userConnections = new Map(); // userId -> Set of socketIds
    this.tokenRefreshBuffer = 30 * 1000; // 30 seconds buffer before token expiry
    
    this.setupTokenExpirationMonitoring();
  }

  /**
   * Main authentication middleware for Socket.IO
   */
  authenticate(socket, next) {
    const token = this.extractToken(socket);
    
    if (!token) {
      console.log(`[SocketAuth] No token provided for socket ${socket.id}`);
      return next(new Error('AUTHENTICATION_REQUIRED'));
    }

    this.validateAndAuthenticateSocket(socket, token, next);
  }

  /**
   * Extract token from various sources in handshake
   */
  extractToken(socket) {
    const { auth, headers, query } = socket.handshake;
    
    // Priority order: auth.token, query.token, Authorization header
    return auth?.token || 
           query?.token || 
           headers?.authorization?.replace('Bearer ', '') ||
           headers?.['x-auth-token'];
  }

  /**
   * Validate token and authenticate socket
   */
  async validateAndAuthenticateSocket(socket, token, next) {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (!decoded.user?.id) {
        throw new Error('Invalid token payload: missing user data');
      }

      // Get user data from database to ensure user still exists
      const userResult = await db.query(
        'SELECT user_id, username, email, is_active FROM users WHERE user_id = $1',
        [decoded.user.id]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found in database');
      }

      const userData = userResult.rows[0];
      
      if (!userData.is_active) {
        throw new Error('User account is deactivated');
      }

      // Calculate token expiry time
      const tokenExpiry = new Date(decoded.exp * 1000);
      const now = new Date();
      
      // Check if token is about to expire (within buffer time)
      if (tokenExpiry.getTime() - now.getTime() < this.tokenRefreshBuffer) {
        console.log(`[SocketAuth] Token for user ${decoded.user.id} expires soon, notifying client`);
        // Don't reject, but notify client to refresh
        setTimeout(() => {
          if (socket.connected) {
            socket.emit('token_refresh_required', {
              expiresAt: tokenExpiry.toISOString(),
              bufferTime: this.tokenRefreshBuffer
            });
          }
        }, 100);
      }

      // Set authentication data on socket
      socket.userId = decoded.user.id;
      socket.user = {
        id: decoded.user.id,
        username: userData.username,
        email: userData.email
      };
      socket.isAuthenticated = true;
      socket.tokenExpiry = tokenExpiry;
      socket.rawToken = token; // Store for refresh validation

      // Track authenticated socket
      this.authenticatedSockets.set(socket.id, {
        userId: socket.userId,
        username: socket.user.username,
        tokenExpiry: tokenExpiry,
        socket: socket
      });

      // Track user connections
      if (!this.userConnections.has(socket.userId)) {
        this.userConnections.set(socket.userId, new Set());
      }
      this.userConnections.get(socket.userId).add(socket.id);

      console.log(`[SocketAuth] User ${userData.username} (${socket.userId}) authenticated successfully`);
      console.log(`[SocketAuth] Token expires at: ${tokenExpiry.toISOString()}`);
      
      next();
    } catch (error) {
      console.log(`[SocketAuth] Authentication failed for socket ${socket.id}:`, error.message);
      
      // Enhanced error handling with specific error types
      let errorType = 'AUTHENTICATION_FAILED';
      if (error.name === 'TokenExpiredError') {
        errorType = 'TOKEN_EXPIRED';
      } else if (error.name === 'JsonWebTokenError') {
        errorType = 'INVALID_TOKEN';
      } else if (error.message.includes('User not found')) {
        errorType = 'USER_NOT_FOUND';
      } else if (error.message.includes('deactivated')) {
        errorType = 'USER_DEACTIVATED';
      }
      
      next(new Error(errorType));
    }
  }

  /**
   * Handle token refresh for existing socket
   */
  async refreshSocketToken(socket, newToken) {
    try {
      const decoded = jwt.verify(newToken, process.env.JWT_SECRET);
      
      if (!decoded.user?.id) {
        throw new Error('Invalid token payload');
      }

      // Verify this is the same user
      if (decoded.user.id !== socket.userId) {
        throw new Error('Token user mismatch');
      }

      // Update socket authentication data
      const newTokenExpiry = new Date(decoded.exp * 1000);
      socket.tokenExpiry = newTokenExpiry;
      socket.rawToken = newToken;

      // Update tracking data
      const authData = this.authenticatedSockets.get(socket.id);
      if (authData) {
        authData.tokenExpiry = newTokenExpiry;
      }

      console.log(`[SocketAuth] Token refreshed for user ${socket.userId}, new expiry: ${newTokenExpiry.toISOString()}`);
      
      socket.emit('token_refresh_success', {
        expiresAt: newTokenExpiry.toISOString()
      });
      
      return true;
    } catch (error) {
      console.error(`[SocketAuth] Token refresh failed for socket ${socket.id}:`, error.message);
      
      socket.emit('token_refresh_failed', {
        error: error.message,
        requiresReconnection: true
      });
      
      return false;
    }
  }

  /**
   * Handle socket disconnection cleanup
   */
  handleDisconnection(socket) {
    if (socket.userId) {
      // Remove from authenticated sockets
      this.authenticatedSockets.delete(socket.id);
      
      // Remove from user connections
      const userConnections = this.userConnections.get(socket.userId);
      if (userConnections) {
        userConnections.delete(socket.id);
        if (userConnections.size === 0) {
          this.userConnections.delete(socket.userId);
        }
      }
      
      console.log(`[SocketAuth] Cleaned up authentication data for socket ${socket.id} (user: ${socket.userId})`);
    }
  }

  /**
   * Monitor token expiration and proactively notify clients
   */
  setupTokenExpirationMonitoring() {
    setInterval(() => {
      const now = new Date();
      const warningTime = this.tokenRefreshBuffer;
      
      this.authenticatedSockets.forEach((authData, socketId) => {
        const timeToExpiry = authData.tokenExpiry.getTime() - now.getTime();
        
        if (timeToExpiry <= warningTime && timeToExpiry > 0) {
          // Token is about to expire, send warning
          if (authData.socket.connected) {
            authData.socket.emit('token_expiring_soon', {
              expiresAt: authData.tokenExpiry.toISOString(),
              timeRemaining: timeToExpiry
            });
            console.log(`[SocketAuth] Warning sent to user ${authData.userId}: token expires in ${Math.round(timeToExpiry / 1000)}s`);
          }
        } else if (timeToExpiry <= 0) {
          // Token has expired, disconnect socket
          if (authData.socket.connected) {
            console.log(`[SocketAuth] Disconnecting user ${authData.userId} due to token expiry`);
            authData.socket.emit('token_expired', {
              expiredAt: authData.tokenExpiry.toISOString(),
              requiresReconnection: true
            });
            authData.socket.disconnect(true);
          }
          this.authenticatedSockets.delete(socketId);
        }
      });
    }, 10000); // Check every 10 seconds
  }

  /**
   * Get connection count for a user
   */
  getUserConnectionCount(userId) {
    const connections = this.userConnections.get(userId);
    return connections ? connections.size : 0;
  }

  /**
   * Get all connected sockets for a user
   */
  getUserSockets(userId) {
    const socketIds = this.userConnections.get(userId);
    if (!socketIds) return [];
    
    return Array.from(socketIds)
      .map(socketId => this.io.sockets.sockets.get(socketId))
      .filter(socket => socket && socket.connected);
  }

  /**
   * Force disconnect all sessions for a user (e.g., on account security issues)
   */
  disconnectUserSessions(userId, reason = 'Security requirement') {
    const sockets = this.getUserSockets(userId);
    sockets.forEach(socket => {
      socket.emit('force_disconnect', { reason });
      socket.disconnect(true);
    });
    
    this.userConnections.delete(userId);
    console.log(`[SocketAuth] Disconnected ${sockets.length} sessions for user ${userId}: ${reason}`);
  }

  /**
   * Get authentication statistics
   */
  getAuthStats() {
    return {
      authenticatedSockets: this.authenticatedSockets.size,
      uniqueUsers: this.userConnections.size,
      averageConnectionsPerUser: this.userConnections.size > 0 
        ? this.authenticatedSockets.size / this.userConnections.size 
        : 0
    };
  }
}

module.exports = SocketAuthManager;