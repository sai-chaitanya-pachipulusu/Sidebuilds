import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { config } from '../config/environment';
import { io } from 'socket.io-client';

// Real-time data synchronization hook
export const useRealTimeSync = (dataType, options = {}) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const {
    refreshInterval = config.getRefreshInterval(dataType),
    enableRealTime = config.isFeatureEnabled('realTimeNotifications'),
    enableOptimisticUpdates = true,
    retryAttempts = 3,
    cacheData = true
  } = options;

  const intervalRef = useRef(null);
  const socketRef = useRef(null);
  const retryCountRef = useRef(0);
  const cacheKeyRef = useRef(`sync_${dataType}_${user?.id}`);

  // Initialize data from cache
  useEffect(() => {
    if (cacheData && user) {
      const cached = localStorage.getItem(cacheKeyRef.current);
      if (cached) {
        try {
          const parsedData = JSON.parse(cached);
          if (parsedData.timestamp && Date.now() - parsedData.timestamp < refreshInterval) {
            setData(parsedData.data);
            setLastUpdated(new Date(parsedData.timestamp));
            setLoading(false);
          }
        } catch (error) {
          console.error('Error parsing cached data:', error);
        }
      }
    }
  }, [user, cacheData, refreshInterval]);

  // Fetch data from API
  const fetchData = useCallback(async (showLoading = true) => {
    if (!user) return;

    if (showLoading) setLoading(true);
    setError(null);

    try {
      const endpoint = getEndpointForDataType(dataType);
      const response = await fetch(config.getApiEndpoint(endpoint), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const newData = await response.json();
      const timestamp = Date.now();

      setData(newData);
      setLastUpdated(new Date(timestamp));
      retryCountRef.current = 0;

      // Cache the data
      if (cacheData) {
        localStorage.setItem(cacheKeyRef.current, JSON.stringify({
          data: newData,
          timestamp
        }));
      }

      return newData;
    } catch (err) {
      console.error(`Error fetching ${dataType}:`, err);
      setError(err.message);
      
      // Retry logic
      if (retryCountRef.current < retryAttempts) {
        retryCountRef.current++;
        setTimeout(() => fetchData(false), Math.pow(2, retryCountRef.current) * 1000);
      }
    } finally {
      setLoading(false);
    }
  }, [user, dataType, retryAttempts, cacheData]);

  // Optimistic update function
  const updateOptimistically = useCallback((updateFn) => {
    if (!enableOptimisticUpdates) return;
    
    setData(prevData => {
      const newData = updateFn(prevData);
      
      // Cache optimistic update
      if (cacheData) {
        localStorage.setItem(cacheKeyRef.current, JSON.stringify({
          data: newData,
          timestamp: Date.now(),
          optimistic: true
        }));
      }
      
      return newData;
    });
  }, [enableOptimisticUpdates, cacheData]);

  // Real-time WebSocket connection
  useEffect(() => {
    if (!enableRealTime || !user) return;

    const connectWebSocket = () => {
      try {
        socketRef.current = io(config.SOCKET_URL, {
          auth: {
            token: localStorage.getItem('token')
          },
          transports: ['websocket', 'polling']
        });

        socketRef.current.on('connect', () => {
          console.log(`Socket.IO connected for ${dataType}`);
          setIsConnected(true);
          
          // Subscribe to data type updates
          socketRef.current.emit('subscribe', {
            dataType,
            userId: user.id
          });
        });

        socketRef.current.on(`${dataType}_update`, (message) => {
          try {
            console.log(`Real-time update received for ${dataType}:`, message.data);
            
            if (message.operation === 'replace') {
              setData(message.data);
            } else if (message.operation === 'merge') {
              setData(prevData => ({ ...prevData, ...message.data }));
            } else if (message.operation === 'append') {
              setData(prevData => Array.isArray(prevData) 
                ? [...prevData, ...message.data] 
                : { ...prevData, ...message.data });
            }
            
            setLastUpdated(new Date());
            
            // Update cache
            if (cacheData) {
              localStorage.setItem(cacheKeyRef.current, JSON.stringify({
                data: message.data,
                timestamp: Date.now()
              }));
            }
          } catch (error) {
            console.error('Error processing Socket.IO message:', error);
          }
        });

        socketRef.current.on(`${dataType}_initial_data`, (data) => {
          console.log(`Initial data received for ${dataType}:`, data);
          setData(data);
          setLastUpdated(new Date());
          
          if (cacheData) {
            localStorage.setItem(cacheKeyRef.current, JSON.stringify({
              data: data,
              timestamp: Date.now()
            }));
          }
        });

        socketRef.current.on('disconnect', () => {
          console.log(`Socket.IO disconnected for ${dataType}`);
          setIsConnected(false);
        });

        socketRef.current.on('connect_error', (error) => {
          console.error(`Socket.IO connection error for ${dataType}:`, error);
          setIsConnected(false);
        });
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [enableRealTime, user, dataType, cacheData]);

  // Polling fallback
  useEffect(() => {
    if (enableRealTime && isConnected) return; // Skip polling if real-time is active

    const startPolling = () => {
      fetchData(false); // Initial fetch without loading state
      
      if (refreshInterval > 0) {
        intervalRef.current = setInterval(() => {
          fetchData(false);
        }, refreshInterval);
      }
    };

    startPolling();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refreshInterval, enableRealTime, isConnected]);

  // Manual refresh function
  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Force sync function (bypasses cache)
  const forceSync = useCallback(async () => {
    if (cacheData) {
      localStorage.removeItem(cacheKeyRef.current);
    }
    return fetchData(true);
  }, [fetchData, cacheData]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    lastUpdated,
    isConnected,
    refresh,
    forceSync,
    updateOptimistically,
    
    // Connection status
    connectionStatus: isConnected ? 'connected' : 'disconnected',
    
    // Data freshness
    isFresh: lastUpdated && (Date.now() - lastUpdated.getTime()) < refreshInterval,
    
    // Utility functions
    isEmpty: !data || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && Object.keys(data).length === 0),
    hasError: !!error
  };
};

// Helper function to get API endpoint for data type
function getEndpointForDataType(dataType) {
  const endpoints = {
    'dashboard': '/dashboard',
    'projects': '/projects',
    'notifications': '/notifications',
    'recommendations': '/ai/recommendations',
    'analytics': '/analytics/dashboard',
    'marketplace': '/public/projects',
    'insights': '/analytics/market-insights',
    'activity': '/analytics/activity',
    'revenue': '/analytics/revenue'
  };

  return endpoints[dataType] || `/${dataType}`;
}

// Specialized hooks for common data types
export const useDashboardSync = (options) => useRealTimeSync('dashboard', options);
export const useProjectsSync = (options) => useRealTimeSync('projects', options);
export const useNotificationsSync = (options) => useRealTimeSync('notifications', options);
export const useRecommendationsSync = (options) => useRealTimeSync('recommendations', options);
export const useMarketplaceSync = (options) => useRealTimeSync('marketplace', options);
export const useAnalyticsSync = (options) => useRealTimeSync('analytics', options);

export default useRealTimeSync;
