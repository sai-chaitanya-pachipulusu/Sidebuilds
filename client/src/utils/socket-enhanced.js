import { io } from 'socket.io-client';

// =====================================================
// ENHANCED SOCKET.IO CLIENT WITH AUTHENTICATION
// =====================================================

class EnhancedSocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.listeners = new Map();
    this.connectionState = 'disconnected'; // disconnected, connecting, connected, error
    this.stateListeners = new Set();
    
    // Bind methods to preserve context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.emit = this.emit.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
  }

  /**
   * Connect to the socket server with authentication
   */
  connect(token = null) {
    if (this.socket?.connected) {
      console.log('[Socket] Already connected');
      return this.socket;
    }

    const authToken = token || localStorage.getItem('token');
    if (!authToken) {
      console.warn('[Socket] No authentication token available');
      return null;
    }

    this.setConnectionState('connecting');
    
    const serverUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5002';
    
    console.log('[Socket] Connecting to:', serverUrl);
    
    this.socket = io(serverUrl, {
      auth: {
        token: authToken
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 15000,
      maxReconnectionAttempts: this.maxReconnectAttempts,
      forceNew: false
    });

    this.setupEventHandlers();
    return this.socket;
  }

  /**
   * Setup socket event handlers
   */
  setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('[Socket] Connected successfully:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.setConnectionState('connected');
      
      // Rejoin rooms after reconnection
      this.rejoinRooms();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.isConnected = false;
      this.setConnectionState('disconnected');
      
      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        console.log('[Socket] Server disconnected, attempting reconnection...');
        setTimeout(() => this.reconnect(), this.reconnectDelay);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      this.setConnectionState('error');
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[Socket] Max reconnection attempts reached');
        this.setConnectionState('failed');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`[Socket] Reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
      this.setConnectionState('connected');
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[Socket] Reconnection attempt ${attemptNumber}`);
      this.setConnectionState('reconnecting');
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('[Socket] Reconnection error:', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after max attempts');
      this.setConnectionState('failed');
    });

    // Authentication events
    this.socket.on('authenticated', (data) => {
      console.log('[Socket] Authentication successful:', data);
    });

    this.socket.on('unauthorized', (error) => {
      console.error('[Socket] Authentication failed:', error);
      this.setConnectionState('unauthorized');
      
      // Try to refresh token and reconnect
      this.handleAuthenticationFailure();
    });

    // Restore custom listeners
    this.listeners.forEach((handler, event) => {
      this.socket.on(event, handler);
    });
  }

  /**
   * Handle authentication failure
   */
  async handleAuthenticationFailure() {
    console.log('[Socket] Handling authentication failure...');
    
    try {
      // Try to refresh the token
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        // Implement token refresh logic here
        // const newToken = await refreshAuthToken(refreshToken);
        // localStorage.setItem('token', newToken);
        // this.reconnect(newToken);
      } else {
        // No refresh token, user needs to login again
        console.log('[Socket] No refresh token available, user needs to login');
        this.disconnect();
        // Emit event to trigger logout in the app
        window.dispatchEvent(new CustomEvent('socket-auth-failed'));
      }
    } catch (error) {
      console.error('[Socket] Token refresh failed:', error);
      this.disconnect();
      window.dispatchEvent(new CustomEvent('socket-auth-failed'));
    }
  }

  /**
   * Rejoin rooms after reconnection
   */
  rejoinRooms() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      console.log('[Socket] Rejoining user room:', user.id);
      this.emit('join_user_room', { userId: user.id });
    }
    
    // Rejoin any other rooms stored in session
    const activeRooms = JSON.parse(sessionStorage.getItem('activeSocketRooms') || '[]');
    activeRooms.forEach(room => {
      console.log('[Socket] Rejoining room:', room);
      this.emit('join_room', { room });
    });
  }

  /**
   * Reconnect with optional new token
   */
  reconnect(newToken = null) {
    if (this.socket) {
      this.socket.disconnect();
    }
    
    setTimeout(() => {
      this.connect(newToken);
    }, 1000);
  }

  /**
   * Disconnect from the socket server
   */
  disconnect() {
    if (this.socket) {
      console.log('[Socket] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.setConnectionState('disconnected');
    this.listeners.clear();
    sessionStorage.removeItem('activeSocketRooms');
  }

  /**
   * Emit an event to the server
   */
  emit(event, data = {}) {
    if (!this.socket || !this.isConnected) {
      console.warn(`[Socket] Cannot emit '${event}': not connected`);
      return false;
    }

    console.log(`[Socket] Emitting '${event}':`, data);
    this.socket.emit(event, data);
    return true;
  }

  /**
   * Listen for an event from the server
   */
  on(event, handler) {
    if (!this.socket) {
      console.warn(`[Socket] Cannot listen for '${event}': not connected`);
      return;
    }

    // Store the listener for reconnection
    this.listeners.set(event, handler);
    
    console.log(`[Socket] Listening for '${event}'`);
    this.socket.on(event, handler);
  }

  /**
   * Remove event listener
   */
  off(event, handler = null) {
    if (!this.socket) return;

    if (handler) {
      this.socket.off(event, handler);
    } else {
      this.socket.off(event);
      this.listeners.delete(event);
    }
    
    console.log(`[Socket] Stopped listening for '${event}'`);
  }

  /**
   * Join a specific room
   */
  joinRoom(roomId, roomType = 'general') {
    if (!this.emit('join_room', { roomId, roomType })) {
      return false;
    }
    
    // Store active rooms for reconnection
    const activeRooms = JSON.parse(sessionStorage.getItem('activeSocketRooms') || '[]');
    if (!activeRooms.includes(roomId)) {
      activeRooms.push(roomId);
      sessionStorage.setItem('activeSocketRooms', JSON.stringify(activeRooms));
    }
    
    return true;
  }

  /**
   * Leave a specific room
   */
  leaveRoom(roomId) {
    if (!this.emit('leave_room', { roomId })) {
      return false;
    }
    
    // Remove from active rooms
    const activeRooms = JSON.parse(sessionStorage.getItem('activeSocketRooms') || '[]');
    const updatedRooms = activeRooms.filter(room => room !== roomId);
    sessionStorage.setItem('activeSocketRooms', JSON.stringify(updatedRooms));
    
    return true;
  }

  /**
   * Join purchase request room for messaging
   */
  joinPurchaseRequestRoom(requestId) {
    return this.emit('join_purchase_request_room', { purchase_request_id: requestId });
  }

  /**
   * Leave purchase request room
   */
  leavePurchaseRequestRoom(requestId) {
    return this.emit('leave_purchase_request_room', { purchase_request_id: requestId });
  }

  /**
   * Send typing indicators
   */
  startTyping(requestId) {
    return this.emit('typing_started', { purchase_request_id: requestId });
  }

  stopTyping(requestId) {
    return this.emit('typing_stopped', { purchase_request_id: requestId });
  }

  /**
   * Set connection state and notify listeners
   */
  setConnectionState(state) {
    if (this.connectionState !== state) {
      this.connectionState = state;
      console.log(`[Socket] State changed to: ${state}`);
      
      // Notify state listeners
      this.stateListeners.forEach(listener => {
        try {
          listener(state);
        } catch (error) {
          console.error('[Socket] State listener error:', error);
        }
      });
    }
  }

  /**
   * Subscribe to connection state changes
   */
  onStateChange(listener) {
    this.stateListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * Get current connection state
   */
  getConnectionState() {
    return {
      state: this.connectionState,
      isConnected: this.isConnected,
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Health check - ping the server
   */
  async healthCheck() {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      this.socket.emit('ping', Date.now(), (response) => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  }
}

// Create singleton instance
const socketManager = new EnhancedSocketManager();

// =====================================================
// REACT HOOKS FOR SOCKET INTEGRATION
// =====================================================

/**
 * Hook for socket connection management
 */
export const useSocket = () => {
  const [connectionState, setConnectionState] = React.useState(
    socketManager.getConnectionState()
  );

  React.useEffect(() => {
    const unsubscribe = socketManager.onStateChange((state) => {
      setConnectionState(socketManager.getConnectionState());
    });

    return unsubscribe;
  }, []);

  return {
    socket: socketManager.socket,
    connect: socketManager.connect,
    disconnect: socketManager.disconnect,
    emit: socketManager.emit,
    on: socketManager.on,
    off: socketManager.off,
    joinRoom: socketManager.joinRoom,
    leaveRoom: socketManager.leaveRoom,
    connectionState,
    isConnected: connectionState.isConnected
  };
};

/**
 * Hook for real-time messaging
 */
export const useRealTimeMessaging = (requestId) => {
  const [messages, setMessages] = React.useState([]);
  const [typingUsers, setTypingUsers] = React.useState([]);
  const { socket, isConnected } = useSocket();

  React.useEffect(() => {
    if (!socket || !isConnected || !requestId) return;

    // Join the purchase request room
    socketManager.joinPurchaseRequestRoom(requestId);

    // Listen for new messages
    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    // Listen for typing indicators
    const handleTypingStarted = ({ userId, username }) => {
      setTypingUsers(prev => {
        if (!prev.find(user => user.userId === userId)) {
          return [...prev, { userId, username }];
        }
        return prev;
      });
    };

    const handleTypingStopped = ({ userId }) => {
      setTypingUsers(prev => prev.filter(user => user.userId !== userId));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('opponent_typing_started', handleTypingStarted);
    socket.on('opponent_typing_stopped', handleTypingStopped);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('opponent_typing_started', handleTypingStarted);
      socket.off('opponent_typing_stopped', handleTypingStopped);
      socketManager.leavePurchaseRequestRoom(requestId);
    };
  }, [socket, isConnected, requestId]);

  const sendMessage = React.useCallback((message) => {
    if (socket && isConnected) {
      socket.emit('send_message', {
        purchase_request_id: requestId,
        message
      });
    }
  }, [socket, isConnected, requestId]);

  const startTyping = React.useCallback(() => {
    socketManager.startTyping(requestId);
  }, [requestId]);

  const stopTyping = React.useCallback(() => {
    socketManager.stopTyping(requestId);
  }, [requestId]);

  return {
    messages,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping
  };
};

/**
 * Hook for real-time notifications
 */
export const useRealTimeNotifications = () => {
  const [notifications, setNotifications] = React.useState([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const { socket, isConnected } = useSocket();

  React.useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewNotification = (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico'
        });
      }
    };

    const handleNotificationRead = ({ notificationId }) => {
      setNotifications(prev => 
        prev.map(notif => 
          notif.notification_id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('notification_read', handleNotificationRead);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('notification_read', handleNotificationRead);
    };
  }, [socket, isConnected]);

  const markAsRead = React.useCallback((notificationId) => {
    if (socket && isConnected) {
      socket.emit('mark_notification_read', { notificationId });
    }
  }, [socket, isConnected]);

  return {
    notifications,
    unreadCount,
    markAsRead
  };
};

// =====================================================
// LEGACY COMPATIBILITY
// =====================================================

/**
 * Initialize socket connection (legacy function)
 */
export const initializeSocket = (token) => {
  return socketManager.connect(token);
};

/**
 * Disconnect socket (legacy function)
 */
export const disconnectSocket = () => {
  socketManager.disconnect();
};

/**
 * Get socket instance (legacy function)
 */
export const getSocket = () => {
  return socketManager.socket;
};

// Export the socket manager instance
export default socketManager;
