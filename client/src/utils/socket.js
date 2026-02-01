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
      return socket;
    } else if (socket.connecting) {
      return socket;
    }
  }
  
  // Clean up existing connection if needed
  if (socket) {
    cleanupSocket();
  }
  
  currentToken = token;
  
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
  socket.on('server_heartbeat', handleServerHeartbeat);
  
  // Enhanced token refresh handling
  socket.on('token_refresh_required', handleTokenRefreshRequired);
  socket.on('token_refresh_warning', handleTokenRefreshWarning);
  socket.on('token_refresh_success', handleTokenRefreshSuccess);
  socket.on('token_refresh_error', handleTokenRefreshError);
  
  // Server events
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
};

// Reconnection attempt handler
const handleReconnectAttempt = (attempt) => {
  reconnectAttempt = attempt;
  updateStatus('reconnecting', `Attempt ${attempt}/${maxReconnectAttempts}`);
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
  // Reduce heartbeat frequency temporarily
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    startHeartbeat(30000); // Reduce to 30 seconds
  }
};

// Generic error handler
const handleError = (error) => {
  // Categorize error types
  if (error.type === 'RateLimitError') {
    handleRateLimitWarning(error.data);
  }
};

// Enhanced disconnect with cleanup
export const disconnectSocket = () => {
  if (socket) {
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

// Enhanced heartbeat functionality for connection monitoring
const startHeartbeat = (interval = 15000) => {
  stopHeartbeat(); // Clear any existing heartbeat
  
  heartbeatInterval = setInterval(() => {
    if (socket && socket.connected) {
      sendPing();
      
      // Send heartbeat every 3rd ping
      if (Math.random() < 0.33) {
        sendHeartbeat();
      }
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
    socket.emit('ping', { 
      timestamp: lastPingTime,
      clientInfo: {
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 100),
        connectionQuality,
        bufferSize: messageBuffer.length
      }
    });
  }
};

// Send periodic heartbeat with client status
const sendHeartbeat = () => {
  if (socket && socket.connected) {
    socket.emit('client_heartbeat', {
      timestamp: Date.now(),
      status: 'active',
      page: window.location.pathname,
      connectionMetrics: {
        quality: connectionQuality,
        latency: averageLatency,
        bufferSize: messageBuffer.length,
        uptime: connectionMetrics.totalUptime
      }
    });
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
  }
};

// Handle server heartbeat response
const handleServerHeartbeat = (data) => {
  // Update server status information
  if (data.connectedUsers !== undefined) {
    // Emit event for UI components that might want to show this
    window.dispatchEvent(new CustomEvent('socket-server-status', {
      detail: {
        connectedUsers: data.connectedUsers,
        serverStatus: data.status,
        timestamp: data.timestamp
      }
    }));
  }
};

// Enhanced token refresh success handler
const handleTokenRefreshSuccess = (data) => {
  updateStatus('connected', 'Authentication refreshed');
  
  // Emit success event for UI components
  window.dispatchEvent(new CustomEvent('socket-token-refreshed', {
    detail: {
      expiresAt: data.expiresAt,
      refreshedAt: data.refreshedAt
    }
  }));
};

// Enhanced token refresh error handler
const handleTokenRefreshError = (data) => {
  updateStatus('error', `Token refresh failed: ${data.error}`);
  
  // Try to get a new token one more time
  setTimeout(() => {
    refreshTokenAndReconnect();
  }, 2000);
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

// Enhanced token refresh functionality with multiple strategies
const handleTokenRefreshRequired = async () => {
  await refreshTokenAndReconnect();
};

const handleTokenRefreshWarning = (data) => {
  // Emit custom event for UI components to show warning
  window.dispatchEvent(new CustomEvent('socket-token-expiring', {
    detail: {
      expiresAt: data.expiresAt,
      timeRemaining: data.timeRemaining
    }
  }));
  
  // Proactively refresh token if less than 2 minutes remaining
  if (data.timeRemaining < 120000) { // 2 minutes
    refreshTokenAndReconnect();
  }
};

const refreshTokenAndReconnect = async () => {
  try {
    updateStatus('reconnecting', 'Refreshing authentication...');
    
    // Strategy 1: Try refresh endpoint
    let newToken = await tryRefreshEndpoint();
    
    // Strategy 2: Try to get fresh token from auth context/localStorage
    if (!newToken) {
      newToken = await tryGetFreshToken();
    }
    
    // Strategy 3: Try to refresh using stored refresh token
    if (!newToken) {
      newToken = await tryRefreshWithRefreshToken();
    }
    
    if (newToken) {
      // Update token in localStorage
      localStorage.setItem('token', newToken);
      currentToken = newToken;
      
      // If socket exists and is connected, send new token
      if (socket && socket.connected) {
        socket.emit('refresh_token', { newToken });
        
        // Wait for confirmation or reconnect
        const refreshPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Token refresh timeout'));
          }, 5000);
          
          const successHandler = () => {
            clearTimeout(timeout);
            socket.off('token_refresh_error', errorHandler);
            resolve();
          };
          
          const errorHandler = (error) => {
            clearTimeout(timeout);
            socket.off('token_refresh_success', successHandler);
            reject(new Error(error.error || 'Token refresh failed'));
          };
          
          socket.once('token_refresh_success', successHandler);
          socket.once('token_refresh_error', errorHandler);
        });
        
        await refreshPromise;
        updateStatus('connected', 'Token refreshed successfully');
      } else {
        // Reconnect with new token
        await initializeSocket(newToken);
      }
    } else {
      throw new Error('Unable to obtain new token');
    }
  } catch (error) {
    // Redirect to login if refresh fails
    updateStatus('error', 'Authentication expired - please log in again');
    notifyAuthenticationFailure();
  }
};

// Strategy 1: Try dedicated refresh endpoint
const tryRefreshEndpoint = async () => {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.token || data.accessToken;
    }
  } catch (error) {
    console.log('[Socket.IO] Refresh endpoint failed:', error.message);
  }
  return null;
};

// Strategy 2: Get fresh token from current auth state
const tryGetFreshToken = async () => {
  try {
    // Try to get token from React context or global state
    const authEvent = new CustomEvent('get-auth-token');
    let freshToken = null;
    
    const handleAuthToken = (event) => {
      freshToken = event.detail?.token;
    };
    
    window.addEventListener('provide-auth-token', handleAuthToken);
    window.dispatchEvent(authEvent);
    
    // Give a brief moment for the auth context to respond
    await new Promise(resolve => setTimeout(resolve, 100));
    
    window.removeEventListener('provide-auth-token', handleAuthToken);
    
    return freshToken;
  } catch (error) {
    console.log('[Socket.IO] Fresh token retrieval failed:', error.message);
  }
  return null;
};

// Strategy 3: Use refresh token if available
const tryRefreshWithRefreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;
    
    const response = await fetch('/api/auth/token', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken })
    });
    
    if (response.ok) {
      const data = await response.json();
      // Also update refresh token if provided
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      return data.token || data.accessToken;
    }
  } catch (error) {
    console.log('[Socket.IO] Refresh token strategy failed:', error.message);
  }
  return null;
};

// Enhanced connection re-establishment with better state management
const reestablishConnection = () => {
  try {
    // Re-join user room if we have user info
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      socket.emit('join_user_room', { userId: user.id });
    }
    
    // Flush any buffered messages
    flushMessageBuffer();
    
    // Emit reconnection event for UI components
    window.dispatchEvent(new CustomEvent('socket-reconnected', {
      detail: {
        socketId: socket.id,
        timestamp: Date.now(),
        reconnectCount: connectionMetrics.reconnectCount
      }
    }));
    
    console.log('[Socket.IO] Connection re-established successfully');
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
  // Clear stored tokens
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  currentToken = null;
  
  // Emit custom event for auth handling
  window.dispatchEvent(new CustomEvent('socket-auth-failed', {
    detail: {
      message: 'Authentication expired, please log in again',
      shouldRedirectToLogin: true,
      timestamp: Date.now()
    }
  }));
  
  // Disconnect socket to prevent further attempts
  if (socket) {
    socket.disconnect();
  }
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

// Enhanced token management utilities
export const getTokenStatus = () => {
  if (!socket || !socket.connected) {
    return { status: 'disconnected' };
  }
  
  // Try to decode current token to get expiry
  try {
    if (currentToken) {
      const tokenParts = currentToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        const expiresAt = payload.exp * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        
        return {
          status: 'connected',
          expiresAt: new Date(expiresAt).toISOString(),
          timeUntilExpiry,
          isExpiringSoon: timeUntilExpiry < 300000, // 5 minutes
          isExpired: timeUntilExpiry <= 0
        };
      }
    }
  } catch (error) {
    console.warn('[Socket.IO] Could not decode token:', error);
  }
  
  return { status: 'connected', tokenInfo: 'unavailable' };
};

// Manual token refresh trigger
export const refreshAuthToken = async () => {
  if (!socket || !socket.connected) {
    throw new Error('Socket not connected');
  }
  
  return await refreshTokenAndReconnect();
};

// Enhanced connection info with token status
export const getDetailedConnectionInfo = () => {
  return {
    ...getCurrentSocketStatus(),
    tokenStatus: getTokenStatus(),
    lastPingTime,
    messageBufferSize: messageBuffer.length,
    heartbeatActive: heartbeatInterval !== null
  };
}; 