// Message buffering for offline scenarios
let messageBuffer = [];
const maxBufferSize = 100;

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
  // Note: socket reference would need to be imported or passed in a real implementation
  // For now, we'll keep this as a placeholder that would be implemented with proper socket access
  if (messageBuffer.length > 0) {
    console.log('[Socket.IO] Flushing message buffer:', messageBuffer.length, 'messages');
    // In a full implementation, we would emit each buffered message here
    messageBuffer.length = 0;
  }
};

export { bufferMessage, flushMessageBuffer };

// Export for access in other modules if needed
export { messageBuffer, maxBufferSize };