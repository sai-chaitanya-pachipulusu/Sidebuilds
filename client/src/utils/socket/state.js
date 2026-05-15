// Shared state for socket utilities
let socket;
let status = 'disconnected'; // 'disconnected', 'connecting', 'connected', 'error', 'reconnecting'
let currentToken = null;
let heartbeatInterval = null;
let reconnectAttempt = 0;
let maxReconnectAttempts = 3;  // 3 attempts max — don't block UX for minutes
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
let messageBuffer = [];
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

// Update connection quality based on latency
const updateConnectionQuality = (quality) => {
  if (connectionQuality !== quality) {
    connectionQuality = quality;
  }
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
const emitWithRetry = (event, data, options = {}) => {
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

// Export state accessors and utility functions
export {
  socket,
  status,
  currentToken,
  heartbeatInterval,
  reconnectAttempt,
  maxReconnectAttempts,
  reconnectDelay,
  connectionQuality,
  lastPingTime,
  averageLatency,
  connectionMetrics,
  statusListeners,
  connectionListeners,
  messageBuffer,
  maxBufferSize,
  updateStatus,
  updateConnectionQuality,
  startHeartbeat,
  stopHeartbeat,
  sendPing,
  sendHeartbeat,
  bufferMessage,
  flushMessageBuffer,
  emitWithRetry
};