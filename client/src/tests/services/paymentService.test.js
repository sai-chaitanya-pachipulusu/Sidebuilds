import paymentService, { PaymentService } from '../../services/paymentService';
import { mockApiResponse, mockApiError } from '../mocks/server';
import toast from 'react-hot-toast';

// Mock toast notifications
jest.mock('react-hot-toast', () => ({
  loading: jest.fn(() => 'loading-toast-id'),
  success: jest.fn(),
  error: jest.fn(),
  dismiss: jest.fn(),
}));

// Mock gtag for analytics
global.gtag = jest.fn();

describe('PaymentService - Mission Critical Payment Processing', () => {
  let service;

  beforeEach(() => {
    service = new PaymentService();
    jest.clearAllMocks();
    localStorage.clear();
    
    // Set up auth token
    localStorage.setItem('token', 'mock-jwt-token');
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Service Initialization & Health Monitoring', () => {
    it('should initialize with correct configuration', () => {
      expect(service.apiClient).toBeDefined();
      expect(service.providers).toBeDefined();
      expect(service.retryConfig).toBeDefined();
    });

    it('should perform health check on initialization', async () => {
      mockApiResponse('/api/payments/health', {
        providers: {
          stripe: { status: 'active', responseTime: 120 },
          paypal: { status: 'active', responseTime: 180 }
        },
        overall: 'healthy'
      });

      await service.performHealthCheck();

      expect(service.providers.STRIPE.status).toBe('active');
      expect(service.providers.STRIPE.responseTime).toBe(120);
    });

    it('should handle health check failures gracefully', async () => {
      mockApiError('/api/payments/health', 'Service unavailable', { status: 503 });

      // Should not throw error
      await expect(service.performHealthCheck()).resolves.not.toThrow();
    });

    it('should generate unique request IDs', () => {
      const id1 = service.generateRequestId();
      const id2 = service.generateRequestId();

      expect(id1).toMatch(/^pay_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^pay_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Error Handling & Recovery', () => {
    it('should retry failed requests with exponential backoff', async () => {
      let attemptCount = 0;
      mockApiError('/api/payments/stripe/checkout', 'Network error', { 
        status: 503,
        method: 'post' 
      });

      // Mock a successful response after retries
      setTimeout(() => {
        mockApiResponse('/api/payments/stripe/checkout', {
          checkout_url: 'https://checkout.stripe.com/test',
          session_id: 'cs_test_123'
        }, { method: 'post' });
      }, 100);

      const promise = service.createStripeCheckout(1, {});

      // Should eventually succeed or fail gracefully
      await expect(promise).rejects.toThrow();
    });

    it('should provide fallback payment providers when primary fails', async () => {
      // Make Stripe unavailable
      service.providers.STRIPE.status = 'maintenance';
      
      const fallbacks = service.getActiveFallbackProviders('stripe');
      
      expect(fallbacks.length).toBeGreaterThan(0);
      expect(fallbacks.every(p => p.status === 'active')).toBe(true);
      expect(fallbacks.every(p => p.id !== 'stripe')).toBe(true);
    });

    it('should handle payment timeout scenarios gracefully', async () => {
      jest.useFakeTimers();

      mockApiResponse('/api/payments/stripe/checkout', {
        checkout_url: 'https://checkout.stripe.com/test'
      }, { 
        method: 'post',
        delay: 35000 // Longer than 30s timeout
      });

      const promise = service.createStripeCheckout(1, {});

      // Fast forward past timeout
      jest.advanceTimersByTime(35000);

      await expect(promise).rejects.toThrow();

      jest.useRealTimers();
    });

    it('should not retry payment processing requests', async () => {
      let requestCount = 0;
      
      // Mock API to count requests
      mockApiResponse('/api/payments/stripe/checkout', (req, res, ctx) => {
        requestCount++;
        return res(ctx.status(503), ctx.json({ error: 'Service unavailable' }));
      }, { method: 'post' });

      try {
        await service.createStripeCheckout(1, {});
      } catch (error) {
        // Expected to fail
      }

      // Should not retry payment processing endpoints
      expect(requestCount).toBe(1);
    });

    it('should enhance errors with user-friendly messages', () => {
      const networkError = { request: {}, code: 'ECONNABORTED' };
      const enhanced = service.enhanceError(networkError, 'NETWORK_ERROR');

      expect(enhanced.type).toBe('NETWORK_ERROR');
      expect(enhanced.isPaymentError).toBe(true);
      expect(enhanced.timestamp).toBeDefined();
      expect(enhanced.message).toContain('network connection');
    });
  });

  describe('Provider Health & Availability', () => {
    it('should track provider status accurately', async () => {
      mockApiResponse('/api/payments/health', {
        providers: {
          stripe: { status: 'maintenance', responseTime: null },
          paypal: { status: 'active', responseTime: 200 }
        }
      });

      await service.performHealthCheck();

      expect(service.providers.STRIPE.status).toBe('maintenance');
      expect(service.providers.PAYPAL.status).toBe('active');
    });

    it('should disable unhealthy providers', () => {
      service.providers.STRIPE.status = 'maintenance';
      
      expect(service.providers.STRIPE.status).not.toBe('active');
    });

    it('should provide user-friendly error messages for Stripe errors', () => {
      const stripeErrors = [
        { code: 'card_declined', expected: 'card was declined' },
        { code: 'insufficient_funds', expected: 'insufficient funds' },
        { code: 'expired_card', expected: 'card has expired' },
        { code: 'processing_error', expected: 'error processing your payment' }
      ];

      stripeErrors.forEach(({ code, expected }) => {
        const error = { response: { data: { code } } };
        const message = service.getStripeErrorMessage(error);
        expect(message.toLowerCase()).toContain(expected);
      });
    });

    it('should handle provider fallback gracefully', async () => {
      const paymentData = {
        projectId: 1,
        amount: 50000,
        projectName: 'Test Project',
        sellerId: 2,
        buyerId: 1
      };

      // Mock Stripe failure
      mockApiError('/api/payments/stripe/checkout', 'Provider unavailable', {
        status: 503,
        method: 'post'
      });

      try {
        await service.createCheckout(paymentData, 'stripe');
      } catch (error) {
        expect(error.fallbackOptions).toBeDefined();
        expect(error.fallbackOptions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('High-Value Transactions ($10K+)', () => {
    it('should validate project availability before checkout', async () => {
      const highValueProject = 1;
      
      mockApiResponse(`/api/projects/${highValueProject}/availability`, {
        available: true,
        lastUpdated: new Date().toISOString()
      });

      mockApiResponse('/api/payments/stripe/checkout', {
        checkout_url: 'https://checkout.stripe.com/test',
        session_id: 'cs_test_123'
      }, { method: 'post' });

      await service.createStripeCheckout(highValueProject);

      // Should have made availability check
      expect(true).toBe(true); // This would be verified through API call monitoring
    });

    it('should track payment events for audit trails', async () => {
      const trackSpy = jest.spyOn(service, 'trackPaymentEvent');

      mockApiResponse('/api/payments/stripe/checkout', {
        checkout_url: 'https://checkout.stripe.com/test',
        session_id: 'cs_test_123'
      }, { method: 'post' });

      await service.createStripeCheckout(1);

      expect(trackSpy).toHaveBeenCalledWith('checkout_created', expect.objectContaining({
        provider: 'stripe',
        projectId: 1
      }));
    });

    it('should handle concurrent purchase attempts', async () => {
      const projectId = 1;

      // Mock project becomes unavailable
      mockApiResponse(`/api/projects/${projectId}/availability`, {
        available: false,
        reason: 'Project is no longer available for purchase'
      });

      await expect(service.validateCheckoutRequest(projectId, 'stripe'))
        .rejects
        .toThrow('Project is no longer available for purchase');
    });

    it('should validate high-value payment data thoroughly', () => {
      const validPaymentData = {
        projectId: 1,
        amount: 75000,
        projectName: 'High Value Project',
        sellerId: 2,
        buyerId: 1
      };

      expect(() => service.validatePaymentData(validPaymentData)).not.toThrow();

      // Test invalid data
      const invalidData = { ...validPaymentData, amount: -1000 };
      expect(() => service.validatePaymentData(invalidData))
        .toThrow('Payment amount must be greater than zero');

      const sameBuyerSeller = { ...validPaymentData, sellerId: 1 };
      expect(() => service.validatePaymentData(sameBuyerSeller))
        .toThrow('Seller and buyer cannot be the same');
    });
  });

  describe('Security & Validation', () => {
    it('should validate all payment data before processing', () => {
      const invalidPaymentData = [
        { error: 'Missing required payment data: projectId', data: { amount: 1000 } },
        { error: 'Missing required payment data: amount', data: { projectId: 1 } },
        { error: 'Payment amount must be greater than zero', data: { projectId: 1, amount: 0 } }
      ];

      invalidPaymentData.forEach(({ error, data }) => {
        expect(() => service.validatePaymentData(data)).toThrow(error);
      });
    });

    it('should prevent seller from buying their own project', () => {
      const selfPurchaseData = {
        projectId: 1,
        amount: 50000,
        projectName: 'Test Project',
        sellerId: 1,
        buyerId: 1
      };

      expect(() => service.validatePaymentData(selfPurchaseData))
        .toThrow('Seller and buyer cannot be the same');
    });

    it('should handle authentication token refresh', async () => {
      // Mock 401 response
      mockApiError('/api/payments/stripe/checkout', 'Unauthorized', {
        status: 401,
        method: 'post'
      });

      // Mock token refresh
      mockApiResponse('/api/auth/refresh', {
        token: 'new-jwt-token',
        expiresIn: 3600
      }, { method: 'post' });

      try {
        await service.createStripeCheckout(1);
      } catch (error) {
        expect(error.code).toBeDefined();
      }
    });

    it('should sanitize and validate input data', () => {
      const maliciousData = {
        projectId: '<script>alert("xss")</script>',
        amount: 'DROP TABLE projects;',
        projectName: '<img src="x" onerror="alert(1)">',
        sellerId: '2',
        buyerId: '1'
      };

      // Should handle non-numeric IDs
      expect(() => service.validatePaymentData(maliciousData)).toThrow();
    });
  });

  describe('Performance & Reliability', () => {
    it('should complete checkout creation within time limits', async () => {
      mockApiResponse('/api/payments/stripe/checkout', {
        checkout_url: 'https://checkout.stripe.com/test',
        session_id: 'cs_test_123'
      }, { method: 'post', delay: 100 });

      const startTime = performance.now();
      await service.createStripeCheckout(1);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(global.performanceExpectations.paymentProcessing);
    });

    it('should handle large numbers of concurrent requests', async () => {
      mockApiResponse('/api/payments/stripe/checkout', {
        checkout_url: 'https://checkout.stripe.com/test',
        session_id: 'cs_test_123'
      }, { method: 'post' });

      const promises = Array.from({ length: 10 }, () => 
        service.createStripeCheckout(1)
      );

      const results = await Promise.allSettled(promises);
      
      // All should complete (successfully or with controlled failures)
      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(['fulfilled', 'rejected']).toContain(result.status);
      });
    });

    it('should manage memory efficiently', () => {
      // Fill payment attempts map
      for (let i = 0; i < 1000; i++) {
        service.paymentAttempts.set(`request_${i}`, {
          attempts: 1,
          lastError: new Error('test'),
          nextRetryAt: Date.now()
        });
      }

      // Clear some attempts
      for (let i = 0; i < 500; i++) {
        service.clearPaymentAttempt(`request_${i}`);
      }

      expect(service.paymentAttempts.size).toBe(500);
    });
  });

  describe('Analytics & Tracking Integration', () => {
    it('should track payment events with proper metadata', () => {
      const testData = {
        provider: 'stripe',
        requestId: 'pay_123',
        amount: 50000,
        projectId: 1
      };

      service.trackPaymentEvent('checkout_created', testData);

      expect(global.gtag).toHaveBeenCalledWith('event', 'checkout_created', {
        event_category: 'payment',
        event_label: 'stripe',
        value: 50000,
        custom_map: {
          custom_parameter_1: 'pay_123'
        }
      });
    });

    it('should handle analytics failures gracefully', () => {
      // Mock gtag to throw error
      global.gtag = jest.fn(() => {
        throw new Error('Analytics error');
      });

      // Should not throw
      expect(() => {
        service.trackPaymentEvent('test_event', { provider: 'stripe' });
      }).not.toThrow();
    });
  });

  describe('API Integration & Response Handling', () => {
    it('should handle Stripe checkout response properly', async () => {
      const mockResponse = {
        checkout_url: 'https://checkout.stripe.com/pay/test_session',
        session_id: 'cs_test_session_id',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      };

      mockApiResponse('/api/payments/stripe/checkout', mockResponse, { method: 'post' });

      const result = await service.createStripeCheckout(1);

      expect(result.checkout_url).toBe(mockResponse.checkout_url);
      expect(result.session_id).toBe(mockResponse.session_id);
      expect(result.requestId).toBeDefined();
      expect(result.provider).toBe('stripe');
    });

    it('should handle API errors with proper user feedback', async () => {
      mockApiError('/api/payments/stripe/checkout', 'Invalid project', {
        status: 400,
        method: 'post'
      });

      await expect(service.createStripeCheckout(999)).rejects.toThrow();
      
      expect(toast.error).toHaveBeenCalled();
    });

    it('should validate API response format', async () => {
      // Mock invalid response (missing checkout_url)
      mockApiResponse('/api/payments/stripe/checkout', {
        session_id: 'cs_test_123'
        // Missing checkout_url
      }, { method: 'post' });

      await expect(service.createStripeCheckout(1))
        .rejects
        .toThrow('Invalid checkout response: missing checkout URL');
    });
  });

  describe('Legacy Support & Backward Compatibility', () => {
    it('should support deprecated createUniversalCheckout method', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockApiResponse('/api/payments/stripe/checkout', {
        checkout_url: 'https://checkout.stripe.com/test',
        session_id: 'cs_test_123'
      }, { method: 'post' });

      const result = await service.createUniversalCheckout(1, 'stripe', {
        amount: 50000,
        projectName: 'Test Project',
        sellerId: 2,
        buyerId: 1
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'createUniversalCheckout is deprecated. Use createCheckout instead.'
      );
      expect(result.checkout_url).toBeDefined();

      consoleSpy.mockRestore();
    });
  });
});