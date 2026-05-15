import io from 'socket.io-client';
import { 
  startHeartbeat, 
  updateStatus, 
  stopHeartbeat,
  bufferMessage,
  flushMessageBuffer
} from './state';
import { setupSocketEventHandlers } from './events';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5004';

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
    reconnectionAttempts: 3,         // fail fast — don't retry for minutes
    reconnectionDelay: 1000,
    reconnectionDelayMax: 3000,      // max 3s between retries
    maxReconnectionAttempts: 3,
    timeout: 8000,                   // match our API timeout
    
    auth: {
      token: token,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      version: process.env.REACT_APP_VERSION || '1.0.0'
    },
    
    transports: ['websocket', 'polling'],
    upgrade: true,
    forceNew: true,
    
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

// Disconnect socket with cleanup
export const disconnectSocket = () => {
  if (socket) {
    // Stop heartbeat
    stopHeartbeat();
    
    // Clear message buffer (will be imported from buffering module)
    // messageBuffer.length = 0; // Will be handled in buffering module
    
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