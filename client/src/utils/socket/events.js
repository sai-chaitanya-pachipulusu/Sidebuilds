// Event handlers for socket connection
import { 
  socket, status, currentToken, heartbeatInterval, reconnectAttempt, maxReconnectAttempts, 
  reconnectDelay, connectionQuality, lastPingTime, averageLatency, connectionMetrics,
  statusListeners, connectionListeners, messageBuffer, maxBufferSize,
  updateStatus, updateConnectionQuality, startHeartbeat, stopHeartbeat, sendPing, sendHeartbeat,
  bufferMessage, flushMessageBuffer, emitWithRetry
} from './state';

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

// Connection event handlers
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

const handleReconnectAttempt = (attempt) => {
  reconnectAttempt = attempt;
  updateStatus('reconnecting', `Attempt ${attempt}/${maxReconnectAttempts}`);
};

const handleReconnect = (attempt) => {
  reconnectAttempt = 0;
  updateStatus('connected', `Reconnected after ${attempt} attempts`);
  updateConnectionQuality('good');
  
  // Re-authenticate and rejoin rooms
  reestablishConnection();
};

const handleReconnectFailed = () => {
  updateStatus('error', 'All reconnection attempts failed');
  updateConnectionQuality('disconnected');
  stopHeartbeat();
  
  // Notify user about connection failure
  notifyConnectionFailure();
};

const handleAuthError = (message) => {
  updateStatus('error', `Auth error: ${message}`);
  
  // Attempt token refresh
  refreshTokenAndReconnect();
};

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

const handleRateLimitWarning = (data) => {
  // Reduce heartbeat frequency temporarily
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    startHeartbeat(30000); // Reduce to 30 seconds
  }
};

const handleError = (error) => {
  // Categorize error types
  if (error.type === 'RateLimitError') {
    handleRateLimitWarning(error.data);
  }
};

// Enhanced token refresh error handler
const handleTokenRefreshError = (data) => {
  updateStatus('error', `Token refresh failed: ${data.error}`);
  
  // Try to get a new token one more time
  setTimeout(() => {
    refreshTokenAndReconnect();
  }, 2000);
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

// Enhanced token refresh error handler
const handleTokenRefreshError = (data) => {
  updateStatus('error', `Token refresh failed: ${data.error}`);
  
  // Try to get a new token one more time
  setTimeout(() => {
    refreshTokenAndReconnect();
  }, 2000);
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

// Export functions needed by other modules
export { 
  setupSocketEventHandlers, 
  bufferMessage, 
  flushMessageBuffer, 
  reestablishConnection,
  handleTokenRefreshRequired,
  handleTokenRefreshWarning,
  refreshTokenAndReconnect,
  notifyConnectionFailure,
  notifyAuthenticationFailure,
  getSocket,
  initializeSocket,
  disconnectSocket,
  updateStatus,
  getCurrentSocketStatus,
  getConnectionMetrics,
  isSocketHealthy,
  getTokenStatus,
  refreshAuthToken,
  getDetailedConnectionInfo,
  subscribeToSocketStatus,
  subscribeToConnectionEvents,
  emitWithRetry
};

// Export variables for access in other modules if needed
export { socket, status, currentToken, heartbeatInterval, reconnectAttempt, maxReconnectAttempts, reconnectDelay, connectionQuality, lastPingTime, averageLatency, connectionMetrics, statusListeners, connectionListeners, messageBuffer, maxBufferSize };