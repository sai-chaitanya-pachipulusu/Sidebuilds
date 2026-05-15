// Socket utilities re-export
export { initializeSocket, disconnectSocket, getSocket, emitWithRetry } from './connection';
export { subscribeToSocketStatus, subscribeToConnectionEvents, getCurrentSocketStatus, getConnectionMetrics, isSocketHealthy, getTokenStatus, refreshAuthToken, getDetailedConnectionInfo } from './management';
export { bufferMessage, flushMessageBuffer } from './buffering';