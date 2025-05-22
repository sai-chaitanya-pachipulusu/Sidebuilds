import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001'; // Ensure this matches your server port

let socket;
let status = 'disconnected'; // 'disconnected', 'connecting', 'connected', 'error'
const statusListeners = new Set();

const updateStatus = (newStatus, details = null) => {
  status = newStatus;
  console.log(`[Socket.IO Status] ${newStatus}${details ? ': ' + details : ''}`);
  statusListeners.forEach(listener => listener(status, details));
};

export const getSocket = () => {
  if (!socket) {
    throw new Error("Socket not initialized. Call initializeSocket first.");
  }
  return socket;
};

export const initializeSocket = (token) => {
  // If socket already exists and is connected, or connecting, don't re-initialize unnecessarily
  // However, if token changes (e.g. re-login), we might need to disconnect and reconnect with new auth.
  if (socket && (socket.connected || socket.connecting)) {
    // If token is different, it implies a new session or user, so disconnect old one.
    if (socket.auth?.token !== token) {
        console.log('[Socket.IO] Token changed, disconnecting and reconnecting...');
        socket.disconnect();
    } else {
        console.log('[Socket.IO] Already connected or connecting with the same token.');
        return socket; // Return existing socket
    }
  }

  console.log(`[Socket.IO] Initializing connection to ${SOCKET_URL}`);
  socket = io(SOCKET_URL, {
    reconnectionAttempts: 5,
    reconnectionDelay: 3000,
    auth: {
      token: token // Send JWT token for authentication if your backend socket server expects it
    },
    // transports: ['websocket'] // You can force websockets if polling is an issue
  });
  updateStatus('connecting');

  socket.on('connect', () => {
    // console.log(`[Socket.IO] Connected with id: ${socket.id}`); - Replaced by updateStatus
    updateStatus('connected', `ID: ${socket.id}`);
    // Client should emit an event to join their user-specific room if your backend is set up for it
    // Example: socket.emit('join_user_room'); // The backend would get user ID from token
  });

  socket.on('disconnect', (reason) => {
    // console.log(`[Socket.IO] Disconnected: ${reason}`); - Replaced by updateStatus
    updateStatus('disconnected', reason);
    if (reason === 'io server disconnect') {
      // The server explicitly disconnected the socket, maybe due to auth failure
      // updateStatus('reconnecting', 'Server initiated disconnect'); // Socket.IO handles this internally
      // socket.connect(); // Attempt to reconnect if it was a server-side disconnect - Socket.IO handles this
    } else if (reason === 'io client disconnect'){
      // Explicitly disconnected by client (e.g., logout)
      // Status already set to disconnected by the disconnectSocket function
    } else {
      // Other reasons, socket will attempt to reconnect automatically
      updateStatus('connecting', `Reconnecting due to: ${reason}`);
    }
  });

  socket.on('connect_error', (error) => {
    // console.error(`[Socket.IO] Connection Error: ${error.message}`, error); - Replaced by updateStatus
    updateStatus('error', `Connection Error: ${error.message}`);
    // Potentially show a toast to the user if connection fails repeatedly
  });

  socket.on('reconnect_attempt', (attempt) => {
    updateStatus('connecting', `Reconnect attempt ${attempt}`);
  });

  socket.on('reconnect_succeeded', (attempt) => {
    updateStatus('connected', `Reconnected after ${attempt} attempts. ID: ${socket.id}`);
  });

  socket.on('reconnect_failed', () => {
    updateStatus('error', 'Failed to reconnect after multiple attempts.');
  });

  // General purpose listeners (can be moved or handled by specific components)
  socket.on('error', (error) => {
    console.error('[Socket.IO] General error:', error);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    console.log('[Socket.IO] Disconnecting socket...');
    socket.disconnect();
    updateStatus('disconnected', 'User initiated logout');
  }
  socket = null; // Clear the reference
};

export const subscribeToSocketStatus = (listener) => {
  statusListeners.add(listener);
  // Immediately call listener with current status
  listener(status);
  return () => {
    statusListeners.delete(listener);
  };
};

export const getCurrentSocketStatus = () => status; 