import { useState, useEffect, useCallback, useContext } from 'react';
import { initializeSocket, disconnectSocket, getCurrentSocketStatus, getTokenStatus, refreshAuthToken } from '../utils/socket';
import { AuthContext } from '../context/AuthContext';

// Custom hook for managing Socket.IO authentication
export const useSocketAuth = () => {
  const { token, user, logout } = useContext(AuthContext);
  const [socketStatus, setSocketStatus] = useState(getCurrentSocketStatus());
  const [tokenStatus, setTokenStatus] = useState({ status: 'unknown' });
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize socket when we have a token
  const initializeSocketConnection = useCallback(async () => {
    if (!token || !user) {
      console.log('[useSocketAuth] No token or user, skipping socket initialization');
      return;
    }

    try {
      console.log('[useSocketAuth] Initializing socket connection...');
      await initializeSocket(token);
      setIsInitialized(true);
    } catch (error) {
      console.error('[useSocketAuth] Failed to initialize socket:', error);
    }
  }, [token, user]);

  // Update socket status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setSocketStatus(getCurrentSocketStatus());
      setTokenStatus(getTokenStatus());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Handle token changes
  useEffect(() => {
    if (token && user && !isInitialized) {
      initializeSocketConnection();
    } else if (!token && isInitialized) {
      // User logged out, disconnect socket
      disconnectSocket();
      setIsInitialized(false);
    }
  }, [token, user, isInitialized, initializeSocketConnection]);

  // Socket event listeners
  useEffect(() => {
    const handleSocketAuthFailed = (event) => {
      console.error('[useSocketAuth] Socket authentication failed:', event.detail);
      
      // If auth failed and we should redirect to login, trigger logout
      if (event.detail?.shouldRedirectToLogin) {
        logout();
      }
    };

    const handleTokenExpiring = (event) => {
      console.warn('[useSocketAuth] Token expiring soon:', event.detail);
      
      // Could show a warning to the user here
      // For now, we'll let the automatic refresh handle it
    };

    const handleTokenRefreshed = (event) => {
      console.log('[useSocketAuth] Token refreshed:', event.detail);
      
      // Update token status
      setTokenStatus(getTokenStatus());
    };

    const handleConnectionFailed = (event) => {
      console.error('[useSocketAuth] Connection failed:', event.detail);
      
      // Could show connection error to user
    };

    const handleReconnected = (event) => {
      console.log('[useSocketAuth] Reconnected:', event.detail);
      
      // Update status
      setSocketStatus(getCurrentSocketStatus());
    };

    // Add event listeners
    window.addEventListener('socket-auth-failed', handleSocketAuthFailed);
    window.addEventListener('socket-token-expiring', handleTokenExpiring);
    window.addEventListener('socket-token-refreshed', handleTokenRefreshed);
    window.addEventListener('socket-connection-failed', handleConnectionFailed);
    window.addEventListener('socket-reconnected', handleReconnected);

    // Handle auth token requests from socket utility
    const handleGetAuthToken = () => {
      window.dispatchEvent(new CustomEvent('provide-auth-token', {
        detail: { token }
      }));
    };

    window.addEventListener('get-auth-token', handleGetAuthToken);

    return () => {
      window.removeEventListener('socket-auth-failed', handleSocketAuthFailed);
      window.removeEventListener('socket-token-expiring', handleTokenExpiring);
      window.removeEventListener('socket-token-refreshed', handleTokenRefreshed);
      window.removeEventListener('socket-connection-failed', handleConnectionFailed);
      window.removeEventListener('socket-reconnected', handleReconnected);
      window.removeEventListener('get-auth-token', handleGetAuthToken);
    };
  }, [token, logout]);

  // Manual refresh function
  const manualRefreshToken = useCallback(async () => {
    try {
      await refreshAuthToken();
      setTokenStatus(getTokenStatus());
      return true;
    } catch (error) {
      console.error('[useSocketAuth] Manual token refresh failed:', error);
      return false;
    }
  }, []);

  // Disconnect function
  const disconnect = useCallback(() => {
    disconnectSocket();
    setIsInitialized(false);
    setSocketStatus(getCurrentSocketStatus());
  }, []);

  // Reconnect function
  const reconnect = useCallback(() => {
    if (token && user) {
      disconnect();
      setTimeout(() => {
        initializeSocketConnection();
      }, 1000);
    }
  }, [token, user, disconnect, initializeSocketConnection]);

  return {
    socketStatus,
    tokenStatus,
    isInitialized,
    isConnected: socketStatus.isConnected,
    isHealthy: socketStatus.quality !== 'poor' && socketStatus.isConnected,
    connectionQuality: socketStatus.quality,
    latency: socketStatus.latency,
    manualRefreshToken,
    disconnect,
    reconnect
  };
};

// Simplified hook for components that just need connection status
export const useSocketStatus = () => {
  const [status, setStatus] = useState(getCurrentSocketStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getCurrentSocketStatus());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return {
    isConnected: status.isConnected,
    quality: status.quality,
    latency: status.latency,
    status: status.status
  };
};

export default useSocketAuth;
