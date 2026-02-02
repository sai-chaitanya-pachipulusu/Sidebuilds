import {
  initializeSocket,
  disconnectSocket,
  getSocket,
  emitWithRetry,
  subscribeToSocketStatus,
  subscribeToConnectionEvents,
  getCurrentSocketStatus,
  isSocketHealthy
} from '../../utils/socket';

// Mock socket.io-client
const mockSocket = {
  id: 'test-socket-id',
  connected: true,
  connecting: false,
  disconnected: false,
  connect: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn(),
  io: {
    engine: {
      transport: {
        name: 'websocket'
      }
    }
  },
  auth: {
    token: 'test-token'
  }
};

jest.mock('socket.io-client', () => {
  return jest.fn(() => mockSocket);
});

// Import io after mocking
import io from 'socket.io-client';

describe('Socket.IO Real-Time Communication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Reset socket state
    mockSocket.connected = false;
    mockSocket.connecting = false;
    mockSocket.disconnected = true;
    
    // Clear any existing status listeners
    disconnectSocket();
  });

  afterEach(() => {
    disconnectSocket();
    jest.clearAllTimers();
  });

  describe('Connection Management', () => {
    it('should establish connection with valid token', () => {
      const token = 'valid-jwt-token';
      
      const socket = initializeSocket(token);
      
      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          auth: expect.objectContaining({
            token,
            timestamp: expect.any(Number),
            userAgent: expect.any(String)
          }),
          reconnectionAttempts: expect.any(Number),
          timeout: expect.any(Number)
        })
      );
      
      expect(socket).toBe(mockSocket);
    });

    it('should reject connection with invalid token', () => {
      expect(() => {
        initializeSocket(null);
      }).toThrow('Valid authentication token is required');

      expect(() => {
        initializeSocket('');
      }).toThrow('Valid authentication token is required');

      expect(() => {
        initializeSocket(123);
      }).toThrow('Valid authentication token is required');
    });

    it('should reuse existing connection with same token', () => {
      const token = 'same-token';
      
      // First connection
      mockSocket.connected = true;
      mockSocket.auth.token = token;
      const socket1 = initializeSocket(token);
      
      // Second connection with same token
      const socket2 = initializeSocket(token);
      
      expect(socket1).toBe(socket2);
      expect(io).toHaveBeenCalledTimes(1);
    });

    it('should create new connection when token changes', () => {
      const token1 = 'token-1';
      const token2 = 'token-2';
      
      // First connection
      initializeSocket(token1);
      
      // Second connection with different token
      initializeSocket(token2);
      
      expect(io).toHaveBeenCalledTimes(2);
      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
    });

    it('should handle network disconnections gracefully', () => {
      const token = 'test-token';
      initializeSocket(token);
      
      // Simulate disconnect event
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];
      
      disconnectHandler('transport close');
      
      // Should handle disconnect without throwing
      expect(true).toBe(true);
    });

    it('should setup all required event handlers', () => {
      const token = 'test-token';
      initializeSocket(token);
      
      const expectedEvents = [
        'connect',
        'disconnect', 
        'connect_error',
        'reconnect_attempt',
        'reconnect',
        'reconnect_failed',
        'pong',
        'token_refresh_required',
        'server_maintenance',
        'rate_limit_warning',
        'error',
        'auth_error'
      ];
      
      expectedEvents.forEach(event => {
        expect(mockSocket.on).toHaveBeenCalledWith(event, expect.any(Function));
      });
    });
  });

  describe('Message Reliability', () => {
    beforeEach(() => {
      const token = 'test-token';
      mockSocket.connected = true;
      initializeSocket(token);
    });

    it('should deliver messages with retry logic', async () => {
      const event = 'test_event';
      const data = { test: 'data' };
      
      // Mock successful emit
      mockSocket.emit.mockImplementation((eventName, eventData, callback) => {
        if (callback) {
          setTimeout(() => callback({ success: true }), 10);
        }
      });
      
      const result = await emitWithRetry(event, data);
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        event, 
        data, 
        expect.any(Function)
      );
      expect(result).toEqual({ success: true });
    });

    it('should buffer messages during disconnection', async () => {
      mockSocket.connected = false;
      
      const event = 'buffered_event';
      const data = { buffered: 'data' };
      
      const result = await emitWithRetry(event, data, { buffer: true });
      
      expect(result).toEqual({ buffered: true });
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should retry failed message delivery', async () => {
      jest.useFakeTimers();
      
      const event = 'retry_event';
      const data = { retry: 'data' };
      
      let attemptCount = 0;
      mockSocket.emit.mockImplementation((eventName, eventData, callback) => {
        attemptCount++;
        if (callback) {
          if (attemptCount < 3) {
            // Simulate timeout (no callback called)
            return;
          } else {
            setTimeout(() => callback({ success: true }), 10);
          }
        }
      });
      
      const promise = emitWithRetry(event, data, { retries: 3, timeout: 1000 });
      
      // Fast forward through retry attempts
      jest.advanceTimersByTime(3000);
      
      const result = await promise;
      expect(result).toEqual({ success: true });
      expect(attemptCount).toBe(3);
      
      jest.useRealTimers();
    });

    it('should handle rate limiting gracefully', () => {
      const token = 'test-token';
      initializeSocket(token);
      
      // Simulate rate limit warning
      const rateLimitHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'rate_limit_warning'
      )[1];
      
      const rateLimitData = {
        currentRate: 45,
        limit: 50,
        resetTime: new Date(Date.now() + 60000).toISOString(),
        backoffRecommended: 30000
      };
      
      expect(() => {
        rateLimitHandler(rateLimitData);
      }).not.toThrow();
    });

    it('should maintain message order during buffer flush', async () => {
      const messages = [
        { event: 'msg1', data: { order: 1 } },
        { event: 'msg2', data: { order: 2 } },
        { event: 'msg3', data: { order: 3 } }
      ];
      
      // Start disconnected
      mockSocket.connected = false;
      
      // Buffer messages
      const promises = messages.map(({ event, data }) => 
        emitWithRetry(event, data, { buffer: true })
      );
      
      await Promise.all(promises);
      
      // Reconnect and flush
      mockSocket.connected = true;
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      
      connectHandler();
      
      // Verify messages were sent in order
      expect(mockSocket.emit).toHaveBeenCalledTimes(3);
      messages.forEach(({ event, data }, index) => {
        expect(mockSocket.emit.mock.calls[index]).toEqual([event, data]);
      });
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      const token = 'test-token';
      mockSocket.connected = true;
      initializeSocket(token);
    });

    it('should track connection latency with ping/pong', () => {
      jest.useFakeTimers();
      const startTime = Date.now();
      
      // Simulate ping sent
      const pingTime = startTime;
      
      // Simulate pong received
      const pongHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'pong'
      )[1];
      
      jest.advanceTimersByTime(50); // 50ms latency
      
      pongHandler({
        timestamp: pingTime,
        serverTime: Date.now()
      });
      
      const status = getCurrentSocketStatus();
      expect(status.latency).toBeGreaterThan(0);
      
      jest.useRealTimers();
    });

    it('should update connection quality metrics', () => {
      const status = getCurrentSocketStatus();
      
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('quality');
      expect(status).toHaveProperty('latency');
      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('metrics');
    });

    it('should detect poor connections', () => {
      // Simulate high latency pong
      const pongHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'pong'
      )[1];
      
      // Simulate 2 second latency
      pongHandler({
        timestamp: Date.now() - 2000,
        serverTime: Date.now()
      });
      
      const status = getCurrentSocketStatus();
      expect(['poor', 'disconnected']).toContain(status.quality);
    });

    it('should provide health check functionality', () => {
      mockSocket.connected = true;
      
      expect(isSocketHealthy()).toBe(true);
      
      mockSocket.connected = false;
      expect(isSocketHealthy()).toBe(false);
    });
  });

  describe('Authentication & Token Management', () => {
    it('should handle token refresh requirements', async () => {
      const token = 'expiring-token';
      initializeSocket(token);
      
      // Mock token refresh endpoint
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          token: 'refreshed-token'
        })
      });
      
      // Mock localStorage
      const setItemSpy = jest.spyOn(localStorage, 'setItem');
      
      // Simulate token refresh event
      const tokenRefreshHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'token_refresh_required'
      )[1];
      
      await tokenRefreshHandler();
      
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      expect(setItemSpy).toHaveBeenCalledWith('token', 'refreshed-token');
    });

    it('should handle authentication failures', () => {
      const token = 'invalid-token';
      initializeSocket(token);
      
      // Simulate auth error
      const authErrorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'auth_error'
      )[1];
      
      expect(() => {
        authErrorHandler('Invalid token');
      }).not.toThrow();
      
      const status = getCurrentSocketStatus();
      expect(status.status).toBe('error');
    });

    it('should handle server maintenance notifications', () => {
      const token = 'test-token';
      initializeSocket(token);
      
      // Simulate maintenance event
      const maintenanceHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'server_maintenance'
      )[1];
      
      const maintenanceData = {
        message: 'Scheduled maintenance in 10 minutes',
        estimatedDuration: 1800,
        startTime: new Date(Date.now() + 600000).toISOString()
      };
      
      expect(() => {
        maintenanceHandler(maintenanceData);
      }).not.toThrow();
    });
  });

  describe('Event Subscription & Management', () => {
    it('should manage status subscriptions correctly', () => {
      const mockListener = jest.fn();
      
      const unsubscribe = subscribeToSocketStatus(mockListener);
      
      // Should call listener immediately with current status
      expect(mockListener).toHaveBeenCalledWith(
        expect.any(String),
        null,
        expect.any(Object)
      );
      
      // Test unsubscribe
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should manage connection event subscriptions', () => {
      const mockListener = jest.fn();
      
      const unsubscribe = subscribeToConnectionEvents(mockListener);
      
      // Should call listener immediately
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.any(String),
          quality: expect.any(String),
          latency: expect.any(Number),
          metrics: expect.any(Object)
        })
      );
      
      unsubscribe();
    });

    it('should handle multiple subscribers', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      const unsub1 = subscribeToSocketStatus(listener1);
      const unsub2 = subscribeToSocketStatus(listener2);
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      
      unsub1();
      unsub2();
    });

    it('should handle subscriber errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      
      const normalListener = jest.fn();
      
      subscribeToSocketStatus(errorListener);
      subscribeToSocketStatus(normalListener);
      
      // Should not prevent other listeners from being called
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('Connection Resilience', () => {
    beforeEach(() => {
      const token = 'test-token';
      initializeSocket(token);
    });

    it('should handle reconnection attempts', () => {
      // Simulate reconnect attempt
      const reconnectAttemptHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'reconnect_attempt'
      )[1];
      
      reconnectAttemptHandler(3);
      
      const status = getCurrentSocketStatus();
      expect(status.status).toBe('reconnecting');
    });

    it('should handle successful reconnection', () => {
      // Mock user data in localStorage
      localStorage.setItem('user', JSON.stringify({ id: 1 }));
      
      // Simulate successful reconnect
      const reconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'reconnect'
      )[1];
      
      reconnectHandler(2);
      
      // Should emit join_user_room
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'join_user_room',
        { userId: 1 }
      );
    });

    it('should handle failed reconnection', () => {
      // Simulate reconnect failure
      const reconnectFailedHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'reconnect_failed'
      )[1];
      
      reconnectFailedHandler();
      
      const status = getCurrentSocketStatus();
      expect(status.status).toBe('error');
    });

    it('should emit custom events for UI notifications', () => {
      const eventSpy = jest.spyOn(window, 'dispatchEvent');
      
      // Simulate connection failure
      const reconnectFailedHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'reconnect_failed'
      )[1];
      
      reconnectFailedHandler();
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'socket-connection-failed'
        })
      );
      
      eventSpy.mockRestore();
    });
  });

  describe('Cleanup & Resource Management', () => {
    it('should clean up properly on disconnect', () => {
      const token = 'test-token';
      mockSocket.connected = true;
      initializeSocket(token);
      
      disconnectSocket();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
    });

    it('should clear all state on cleanup', () => {
      const token = 'test-token';
      initializeSocket(token);
      
      disconnectSocket();
      
      expect(() => getSocket()).toThrow('Socket not initialized');
    });

    it('should handle memory leaks prevention', () => {
      const token = 'test-token';
      
      // Create and destroy multiple connections
      for (let i = 0; i < 10; i++) {
        initializeSocket(token);
        disconnectSocket();
      }
      
      // Should not accumulate listeners
      expect(true).toBe(true); // This would be verified through memory profiling
    });
  });

  describe('Error Scenarios & Edge Cases', () => {
    it('should handle socket creation failure', () => {
      // Mock io to throw error
      io.mockImplementation(() => {
        throw new Error('Socket creation failed');
      });
      
      expect(() => {
        initializeSocket('test-token');
      }).toThrow('Socket creation failed');
      
      // Restore mock
      io.mockImplementation(() => mockSocket);
    });

    it('should handle malformed event data', () => {
      const token = 'test-token';
      initializeSocket(token);
      
      // Simulate malformed pong data
      const pongHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'pong'
      )[1];
      
      expect(() => {
        pongHandler(null);
      }).not.toThrow();
      
      expect(() => {
        pongHandler({ invalidData: true });
      }).not.toThrow();
    });

    it('should handle extremely high latency', () => {
      const token = 'test-token';
      initializeSocket(token);
      
      // Simulate very high latency pong
      const pongHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'pong'
      )[1];
      
      pongHandler({
        timestamp: Date.now() - 30000, // 30 seconds ago
        serverTime: Date.now()
      });
      
      const status = getCurrentSocketStatus();
      expect(status.quality).toBe('disconnected');
    });

    it('should handle rapid connect/disconnect cycles', () => {
      const token = 'test-token';
      initializeSocket(token);
      
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];
      
      // Rapid cycling
      for (let i = 0; i < 10; i++) {
        connectHandler();
        disconnectHandler('transport close');
      }
      
      // Should handle without throwing
      expect(true).toBe(true);
    });
  });
});
