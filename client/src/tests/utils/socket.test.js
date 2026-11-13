import io from 'socket.io-client';
import {
  disconnectSocket,
  emitWithRetry,
  getCurrentSocketStatus,
  getSocket,
  initializeSocket,
  subscribeToConnectionEvents,
  subscribeToSocketStatus,
} from '../../utils/socket';

jest.mock('socket.io-client', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const createMockSocket = () => ({
  id: 'socket-test-id',
  connected: false,
  connecting: false,
  disconnected: true,
  auth: {},
  connect: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn(),
});

describe('socket connection utility', () => {
  let socket;

  beforeEach(() => {
    disconnectSocket();
    socket = createMockSocket();
    io.mockReturnValue(socket);
  });

  afterEach(() => {
    disconnectSocket();
    jest.restoreAllMocks();
  });

  it('requires a non-empty authentication token', () => {
    expect(() => initializeSocket()).toThrow('Valid authentication token is required');
    expect(() => initializeSocket('')).toThrow('Valid authentication token is required');
    expect(() => initializeSocket(42)).toThrow('Valid authentication token is required');
  });

  it('creates a configured connection and registers the core handlers', () => {
    expect(initializeSocket('jwt-token')).toBe(socket);
    expect(io).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      auth: expect.objectContaining({ token: 'jwt-token' }),
      transports: ['websocket', 'polling'],
      timeout: 8000,
    }));
    for (const event of ['connect', 'disconnect', 'connect_error', 'error', 'auth_error']) {
      expect(socket.on).toHaveBeenCalledWith(event, expect.any(Function));
    }
  });

  it('reuses a connected socket for the same token', () => {
    socket.connected = true;
    socket.disconnected = false;
    socket.auth.token = 'same-token';
    const first = initializeSocket('same-token');
    const second = initializeSocket('same-token');
    expect(second).toBe(first);
    expect(io).toHaveBeenCalledTimes(1);
  });

  it('buffers an event before a connection exists', async () => {
    await expect(emitWithRetry('notification', { id: 1 })).resolves.toEqual({ buffered: true });
  });

  it('disconnects and removes listeners during cleanup', () => {
    socket.connected = true;
    initializeSocket('jwt-token');
    disconnectSocket();
    expect(socket.disconnect).toHaveBeenCalled();
    expect(socket.removeAllListeners).toHaveBeenCalled();
    expect(() => getSocket()).toThrow('Socket not initialized');
  });

  it('provides immediate status snapshots to subscribers', () => {
    const statusListener = jest.fn();
    const connectionListener = jest.fn();
    const unsubscribeStatus = subscribeToSocketStatus(statusListener);
    const unsubscribeConnection = subscribeToConnectionEvents(connectionListener);
    expect(statusListener).toHaveBeenCalledWith(expect.any(String), null, expect.any(Object));
    expect(connectionListener).toHaveBeenCalledWith(expect.objectContaining({
      status: expect.any(String),
      metrics: expect.any(Object),
    }));
    expect(getCurrentSocketStatus()).toEqual(expect.objectContaining({ isConnected: false }));
    unsubscribeStatus();
    unsubscribeConnection();
  });

  it('isolates subscriber errors from the application', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => subscribeToSocketStatus(() => { throw new Error('listener failed'); })).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith('Status listener error:', expect.any(Error));
  });
});
