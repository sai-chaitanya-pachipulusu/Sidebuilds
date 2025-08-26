import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5004';

// Enhanced socket management with production features
let socket;
let status = 'disconnected'; // 'disconnected', 'connecting', 'connected', 'error', 'reconnecting'
let currentToken = null;
let heartbeatInterval = null;
let reconnectAttempt = 0;
let maxReconnectAttempts = 10;
let reconnectDelay = 1000;
let connectionQuality = 'unknown'; // 'excellent', 'good', 'poor', 'disconnected'
let lastPingTime = null;
let averageLatency = 0;
let connectionMetrics = {
  connectTime: 0,
  disconnectCount: 0,
  reconnectCount: 0,
  totalUptime: 0,
  lastConnectAt: null,
  lastDisconnectAt: null
};

const statusListeners = new Set();
const connectionListeners = new Set();
const messageBuffer = [];
const maxBufferSize = 100;

// Enhanced status updates with metrics
const updateStatus = (newStatus, details = null) => {
  const previousStatus = status;
  status = newStatus;
  
  // Update connection metrics
  if (newStatus === 'connected' && previousStatus !== 'connected') {
    connectionMetrics.lastConnectAt = Date.now();
    connectionMetrics.reconnectCount++;
    reconnectAttempt = 0;
  } else if (newStatus === 'disconnected' && previousStatus === 'connected') {
    connectionMetrics.lastDisconnectAt = Date.now();
    connectionMetrics.disconnectCount++;
    if (connectionMetrics.lastConnectAt) {
      connectionMetrics.totalUptime += Date.now() - connectionMetrics.lastConnectAt;
    }
  }
  
  console.log(`[Socket.IO] Status: ${newStatus}${details ? ' - ' + details : ''}`);
  
  // Notify all listeners
  statusListeners.forEach(listener => {
    try {
      listener(status, details, connectionMetrics);
    } catch (error) {
      console.error('Status listener error:', error);
    }
  });
  
  // Notify connection-specific listeners
  connectionListeners.forEach(listener => {
    try {
      listener({
        status: newStatus,
        details,
        quality: connectionQuality,
        latency: averageLatency,
        metrics: { ...connectionMetrics }
      });
    } catch (error) {
      console.error('Connection listener error:', error);
    }
  });
};

// Enhanced socket getter with validation
export const getSocket = () => {
  if (!socket) {
    throw new Error("Socket not initialized. Call initializeSocket first.");
  }
  
  if (!socket.connected && !socket.connecting) {
    console.warn('[Socket.IO] Socket exists but is not connected. Current status:', status);
  }
  
  return socket;
};

// Production-ready socket initialization with comprehensive error handling
export const initializeSocket = (token) => {
  // Token validation
  if (!token || typeof token !== 'string') {
    throw new Error('Valid authentication token is required');
  }
  
  // Check if we need to refresh the connection
  const needsReconnect = !socket || 
    socket.auth?.token !== token || 
    (socket.disconnected && status === 'error');
  
  if (socket && !needsReconnect) {
    if (socket.connected) {
      console.log('[Socket.IO] Already connected with same token');
      return socket;
    } else if (socket.connecting) {
      console.log('[Socket.IO] Connection in progress with same token');
      return socket;
    }
  }
  
  // Clean up existing connection if needed
  if (socket) {
    console.log('[Socket.IO] Cleaning up existing connection...');
    cleanupSocket();
  }
  
  currentToken = token;
  console.log(`[Socket.IO] Initializing production connection to ${SOCKET_URL}`);
  
  // Enhanced socket configuration
  socket = io(SOCKET_URL, {
    // Connection settings
    reconnectionAttempts: maxReconnectAttempts,
    reconnectionDelay: reconnectDelay,
    reconnectionDelayMax: 10000,
    maxReconnectionAttempts: maxReconnectAttempts,
    timeout: 10000,
    
    // Authentication
    auth: {
      token: token,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      version: process.env.REACT_APP_VERSION || '1.0.0'
    },
    
    // Transport optimization
    transports: ['websocket', 'polling'],
    upgrade: true,
    forceNew: true,
    
    // Query parameters for debugging
    query: {
      client: 'web',
      version: process.env.REACT_APP_VERSION || '1.0.0'
    }
  });
  
  setupSocketEventHandlers();
  startHeartbeat();
  updateStatus('connecting', 'Initializing connection...');
  
  return socket;
};

// Setup comprehensive event handlers
const setupSocketEventHandlers = () => {
  // Connection events
  socket.on('connect', handleConnect);
  socket.on('disconnect', handleDisconnect);
  socket.on('connect_error', handleConnectionError);
  socket.on('reconnect_attempt', handleReconnectAttempt);
  socket.on('reconnect', handleReconnect);
  socket.on('reconnect_failed', handleReconnectFailed);
  
  // Custom events for production monitoring
  socket.on('pong', handlePong);
  socket.on('token_refresh_required', handleTokenRefreshRequired);
  socket.on('server_maintenance', handleServerMaintenance);
  socket.on('rate_limit_warning', handleRateLimitWarning);
  
  // Error handling
  socket.on('error', handleError);
  socket.on('auth_error', handleAuthError);
};

// Enhanced connection handler
const handleConnect = () => {
  const connectTime = Date.now();
  connectionMetrics.connectTime = connectTime;
  
  updateStatus('connected', `ID: ${socket.id}`);
  updateConnectionQuality('excellent');
  
  // Send initial heartbeat
  sendPing();
  
  // Flush message buffer
  flushMessageBuffer();
  
  console.log('[Socket.IO] Connected successfully:', {
    socketId: socket.id,
    transport: socket.io.engine.transport.name,
    connectTime,
    reconnectAttempt
  });
};

// Enhanced disconnect handler
const handleDisconnect = (reason) => {
  updateConnectionQuality('disconnected');
  stopHeartbeat();
  
  if (reason === 'io server disconnect') {
    // Server disconnected us - might be auth issue or maintenance
    updateStatus('disconnected', `Server disconnect: ${reason}`);
    
    // Check if it's an auth issue
    if (reason.includes('auth') || reason.includes('token')) {
      handleAuthError('Token validation failed on server');
    }
  } else if (reason === 'io client disconnect') {
    // Client-initiated disconnect (logout, tab close, etc.)
    updateStatus('disconnected', 'Client disconnected');
  } else {
    // Network issues or other problems
    updateStatus('reconnecting', `Reconnecting due to: ${reason}`);
  }
  
  console.log('[Socket.IO] Disconnected:', reason);
};

// Enhanced error handling
const handleConnectionError = (error) => {
  reconnectAttempt++;
  
  let errorMessage = 'Connection failed';
  if (error.message) {
    errorMessage = error.message;
  } else if (error.type === 'TransportError') {
    errorMessage = 'Network transport error';
  } else if (error.type === 'AuthenticationError') {
    errorMessage = 'Authentication failed';
    handleAuthError(errorMessage);
    return;
  }
  
  updateStatus('error', `${errorMessage} (attempt ${reconnectAttempt}/${maxReconnectAttempts})`);
  updateConnectionQuality('disconnected');
  
  console.error('[Socket.IO] Connection error:', {
    error,
    attempt: reconnectAttempt,
    maxAttempts: maxReconnectAttempts
  });
};

// Reconnection attempt handler
const handleReconnectAttempt = (attempt) => {
  reconnectAttempt = attempt;
  updateStatus('reconnecting', `Attempt ${attempt}/${maxReconnectAttempts}`);
  
  // Exponential backoff with jitter
  const delay = Math.min(reconnectDelay * Math.pow(2, attempt - 1), 30000);
  const jitter = Math.random() * 1000;
  
  setTimeout(() => {
    if (socket && !socket.connected) {
      console.log(`[Socket.IO] Reconnect attempt ${attempt} after ${delay + jitter}ms`);
    }
  }, delay + jitter);
};

// Successful reconnection handler
const handleReconnect = (attempt) => {
  reconnectAttempt = 0;
  updateStatus('connected', `Reconnected after ${attempt} attempts`);
  updateConnectionQuality('good');
  
  // Re-authenticate and rejoin rooms
  reestablishConnection();
};

// Failed reconnection handler
const handleReconnectFailed = () => {
  updateStatus('error', 'All reconnection attempts failed');
  updateConnectionQuality('disconnected');
  stopHeartbeat();
  
  // Notify user about connection failure
  notifyConnectionFailure();
};

// Authentication error handler
const handleAuthError = (message) => {
  updateStatus('error', `Auth error: ${message}`);
  
  // Attempt token refresh
  refreshTokenAndReconnect();
};

// Server maintenance handler
const handleServerMaintenance = (data) => {
  updateStatus('disconnected', `Server maintenance: ${data.message}`);
  
  // Schedule reconnection after maintenance window
  if (data.estimatedDuration) {
    setTimeout(() => {
      if (socket && !socket.connected) {
        socket.connect();
      }
    }, data.estimatedDuration * 1000);
  }
};

// Rate limit warning handler
const handleRateLimitWarning = (data) => {
  console.warn('[Socket.IO] Rate limit warning:', data);
  
  // Reduce heartbeat frequency temporarily
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    startHeartbeat(30000); // Reduce to 30 seconds
  }
};

// Generic error handler
const handleError = (error) => {
  console.error('[Socket.IO] Socket error:', error);
  
  // Categorize error types
  if (error.type === 'RateLimitError') {
    handleRateLimitWarning(error.data);
  } else if (error.type === 'ValidationError') {
    console.error('[Socket.IO] Message validation error:', error);
  }
};

// Enhanced disconnect with cleanup
export const disconnectSocket = () => {
  if (socket) {
    console.log('[Socket.IO] Disconnecting socket...');
    
    // Stop heartbeat
    stopHeartbeat();
    
    // Clear message buffer
    messageBuffer.length = 0;
    
    // Disconnect socket
    if (socket.connected) {
      socket.disconnect();
    }
    
    // Clean up socket reference
    cleanupSocket();
    
    updateStatus('disconnected', 'User initiated disconnect');
  }
  
  // Reset state
  currentToken = null;
  reconnectAttempt = 0;
  connectionQuality = 'disconnected';
  averageLatency = 0;
};

// Complete socket cleanup
const cleanupSocket = () => {
  if (socket) {
    // Remove all event listeners
    socket.removeAllListeners();
    
    // Clear socket reference
    socket = null;
  }
  
  // Stop heartbeat
  stopHeartbeat();
};

// Heartbeat functionality for connection monitoring
const startHeartbeat = (interval = 15000) => {
  stopHeartbeat(); // Clear any existing heartbeat
  
  heartbeatInterval = setInterval(() => {
    if (socket && socket.connected) {
      sendPing();
    }
  }, interval);
};

const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

const sendPing = () => {
  if (socket && socket.connected) {
    lastPingTime = Date.now();
    socket.emit('ping', { timestamp: lastPingTime });
  }
};

const handlePong = (data) => {
  if (lastPingTime) {
    const latency = Date.now() - lastPingTime;
    
    // Update average latency with exponential moving average
    if (averageLatency === 0) {
      averageLatency = latency;
    } else {
      averageLatency = averageLatency * 0.8 + latency * 0.2;
    }
    
    // Update connection quality based on latency
    updateConnectionQuality(getQualityFromLatency(averageLatency));
    
    console.log(`[Socket.IO] Ping: ${latency}ms (avg: ${Math.round(averageLatency)}ms)`);
  }
};

// Determine connection quality from latency
const getQualityFromLatency = (latency) => {
  if (latency < 100) return 'excellent';
  if (latency < 300) return 'good';
  if (latency < 1000) return 'poor';
  return 'disconnected';
};

// Update connection quality
const updateConnectionQuality = (quality) => {
  if (connectionQuality !== quality) {
    connectionQuality = quality;
    console.log(`[Socket.IO] Connection quality: ${quality}`);
  }
};

// Message buffering for offline scenarios
const bufferMessage = (event, data) => {
  if (messageBuffer.length >= maxBufferSize) {
    messageBuffer.shift(); // Remove oldest message
  }
  
  messageBuffer.push({
    event,
    data,
    timestamp: Date.now(),
    attempts: 0
  });
};

const flushMessageBuffer = () => {
  if (socket && socket.connected && messageBuffer.length > 0) {
    console.log(`[Socket.IO] Flushing ${messageBuffer.length} buffered messages`);
    
    messageBuffer.forEach(message => {
      try {
        socket.emit(message.event, message.data);
      } catch (error) {
        console.error('[Socket.IO] Failed to send buffered message:', error);
      }
    });
    
    messageBuffer.length = 0;
  }
};

// Enhanced emit with buffering and retry
export const emitWithRetry = (event, data, options = {}) => {
  const { timeout = 5000, retries = 3, buffer = true } = options;
  
  return new Promise((resolve, reject) => {
    if (!socket) {
      if (buffer) {
        bufferMessage(event, data);
        resolve({ buffered: true });
      } else {
        reject(new Error('Socket not initialized'));
      }
      return;
    }
    
    if (!socket.connected) {
      if (buffer) {
        bufferMessage(event, data);
        resolve({ buffered: true });
      } else {
        reject(new Error('Socket not connected'));
      }
      return;
    }
    
    let attempts = 0;
    
    const attemptEmit = () => {
      attempts++;
      
      const timeoutId = setTimeout(() => {
        if (attempts < retries) {
          console.log(`[Socket.IO] Retry emit ${event} (attempt ${attempts + 1}/${retries})`);
          attemptEmit();
        } else {
          reject(new Error(`Failed to emit ${event} after ${retries} attempts`));
        }
      }, timeout);
      
      socket.emit(event, data, (response) => {
        clearTimeout(timeoutId);
        
        if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    };
    
    attemptEmit();
  });
};

// Token refresh functionality
const handleTokenRefreshRequired = async () => {
  console.log('[Socket.IO] Token refresh required');
  await refreshTokenAndReconnect();
};

const refreshTokenAndReconnect = async () => {
  try {
    // Attempt to refresh token using auth context or API
    const refreshResponse = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${currentToken}`
      }
    });
    
    if (refreshResponse.ok) {
      const { token: newToken } = await refreshResponse.json();
      
      if (newToken) {
        console.log('[Socket.IO] Token refreshed, reconnecting...');
        
        // Update token in localStorage
        localStorage.setItem('token', newToken);
        
        // Reconnect with new token
        initializeSocket(newToken);
      } else {
        throw new Error('No token in refresh response');
      }
    } else {
      throw new Error('Token refresh failed');
    }
  } catch (error) {
    console.error('[Socket.IO] Token refresh failed:', error);
    
    // Redirect to login if refresh fails
    updateStatus('error', 'Authentication expired');
    notifyAuthenticationFailure();
  }
};

// Re-establish connection after reconnect
const reestablishConnection = () => {
  try {
    // Re-join user room if we have user info
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      socket.emit('join_user_room', { userId: user.id });
    }
    
    // Flush any buffered messages
    flushMessageBuffer();
    
    console.log('[Socket.IO] Connection re-established');
  } catch (error) {
    console.error('[Socket.IO] Failed to re-establish connection:', error);
  }
};

// User notification functions
const notifyConnectionFailure = () => {
  // Emit custom event for UI components
  window.dispatchEvent(new CustomEvent('socket-connection-failed', {
    detail: {
      status,
      connectionMetrics,
      attempts: reconnectAttempt
    }
  }));
};

const notifyAuthenticationFailure = () => {
  // Emit custom event for auth handling
  window.dispatchEvent(new CustomEvent('socket-auth-failed', {
    detail: {
      message: 'Authentication expired, please log in again'
    }
  }));
};

// Enhanced subscription methods
export const subscribeToSocketStatus = (listener) => {
  statusListeners.add(listener);
  // Immediately call listener with current status
  listener(status, null, connectionMetrics);
  return () => {
    statusListeners.delete(listener);
  };
};

export const subscribeToConnectionEvents = (listener) => {
  connectionListeners.add(listener);
  // Immediately call with current state
  listener({
    status,
    quality: connectionQuality,
    latency: averageLatency,
    metrics: { ...connectionMetrics }
  });
  return () => {
    connectionListeners.delete(listener);
  };
};

// Utility getters
export const getCurrentSocketStatus = () => ({
  status,
  quality: connectionQuality,
  latency: averageLatency,
  isConnected: socket?.connected || false,
  socketId: socket?.id || null,
  metrics: { ...connectionMetrics }
});

export const getConnectionMetrics = () => ({ ...connectionMetrics });

export const isSocketHealthy = () => {
  return socket && 
         socket.connected && 
         status === 'connected' && 
         connectionQuality !== 'poor' &&
         averageLatency < 1000;
}; 