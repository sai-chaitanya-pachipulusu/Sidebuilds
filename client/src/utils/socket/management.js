// Status and connection management
import { 
  status, connectionMetrics, reconnectAttempt,
  statusListeners, connectionListeners,
  socket, connectionQuality, averageLatency,
  currentToken, lastPingTime, heartbeatInterval
} from './state';
import { refreshTokenAndReconnect } from './events';

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
    messageBufferSize: 0, // Will be updated by buffering module
    heartbeatActive: heartbeatInterval !== null
  };
};

// Subscription methods
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