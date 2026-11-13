import axios from 'axios';
import toast from 'react-hot-toast';
import { resolveServiceUrl } from '../config/apiUrl';

// Production-ready Payment Service with comprehensive error handling.
// All endpoints mirror the real server routes:
//   POST /payments/create-checkout-session  (purchase-request based Stripe Checkout)
//   POST /purchase-requests/projects/:projectId/initiate-checkout ("Buy now" reservation)
//   GET  /payments/methods                  (server-reported provider availability)
//   GET  /payments/health
class PaymentService {
  constructor() {
    this.apiClient = axios.create({
      baseURL: resolveServiceUrl(process.env.REACT_APP_API_URL, 'http://localhost:5002/api'),
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds for payment operations
    });

    // Request retry configuration
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 10000, // 10 seconds
      backoffFactor: 2,
      retryableStatusCodes: [429, 502, 503, 504],
      retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'CONNECTION_REFUSED']
    };

    // Payment state management
    this.paymentAttempts = new Map();

    // Add auth token to requests
    this.apiClient.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
          config.headers['Authorization'] = `Bearer ${token}`;
        }

        // Add request metadata for tracking
        config.metadata = {
          requestId: this.generateRequestId(),
          timestamp: Date.now(),
          attempt: config.attempt || 1
        };

        return config;
      },
      (error) => {
        return Promise.reject(this.enhanceError(error, 'REQUEST_SETUP_FAILED'));
      }
    );

    // Enhanced response interceptor with retry logic
    this.apiClient.interceptors.response.use(
      (response) => {
        // Clear any previous errors for successful requests
        if (response.config.metadata?.requestId) {
          this.clearPaymentAttempt(response.config.metadata.requestId);
        }
        return response;
      },
      async (error) => {
        const config = error.config;
        const shouldRetry = this.shouldRetryRequest(error, config);

        if (shouldRetry) {
          return this.retryRequest(config, error);
        }

        return Promise.reject(this.enhanceError(error, 'PAYMENT_REQUEST_FAILED'));
      }
    );

    // Only providers the server actually implements. The health check can
    // downgrade Stripe to 'maintenance', but nothing here may advertise a
    // provider that has no server route.
    this.providers = {
      STRIPE: { id: 'stripe', name: 'Stripe', status: 'active', fees: 2.9 },
    };

    // Initialize health check
    this.performHealthCheck();
  }

  // Generate unique request ID for tracking
  generateRequestId() {
    return `pay_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  // Enhanced error with user-friendly messaging
  enhanceError(error, type) {
    const enhanced = new Error();
    enhanced.originalError = error;
    enhanced.type = type;
    enhanced.timestamp = new Date().toISOString();
    enhanced.isPaymentError = true;

    // Extract meaningful error information
    if (error.response) {
      enhanced.status = error.response.status;
      enhanced.data = error.response.data;
      enhanced.code = error.response.data?.code || error.response.data?.error?.code || 'UNKNOWN';
      enhanced.message =
        error.response.data?.message ||
        (typeof error.response.data?.error === 'string' ? error.response.data.error : null) ||
        error.message ||
        'Payment request failed.';
    } else if (error.request) {
      enhanced.code = 'NETWORK_ERROR';
      enhanced.message = 'Network connection failed. Please check your internet connection.';
    } else {
      enhanced.code = 'UNKNOWN_ERROR';
      enhanced.message = error.message || 'An unexpected error occurred.';
    }

    return enhanced;
  }

  // Determine if request should be retried
  shouldRetryRequest(error, config) {
    if (!config || config.attempt >= this.retryConfig.maxRetries) {
      return false;
    }

    // Don't retry checkout/session creation (idempotency concerns)
    if (config.url?.includes('/create-checkout-session') || config.url?.includes('/initiate-checkout')) {
      return false;
    }

    const status = error.response?.status;
    const isRetryableStatus = this.retryConfig.retryableStatusCodes.includes(status);
    const isNetworkError = !error.response && error.request;
    const isTimeoutError = error.code === 'ECONNABORTED';

    return isRetryableStatus || isNetworkError || isTimeoutError;
  }

  // Retry request with exponential backoff
  async retryRequest(config, originalError) {
    const attempt = (config.attempt || 1) + 1;
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt - 1),
      this.retryConfig.maxDelay
    );

    // Track retry attempt
    const requestId = config.metadata?.requestId;
    if (requestId) {
      this.paymentAttempts.set(requestId, {
        attempts: attempt,
        lastError: originalError,
        nextRetryAt: Date.now() + delay
      });
    }

    await new Promise(resolve => setTimeout(resolve, delay));

    config.attempt = attempt;
    return this.apiClient.request(config);
  }

  // Clear payment attempt tracking
  clearPaymentAttempt(requestId) {
    if (this.paymentAttempts.has(requestId)) {
      this.paymentAttempts.delete(requestId);
    }
  }

  // Health check for the payments API
  async performHealthCheck() {
    try {
      const response = await this.apiClient.get('/payments/health', {
        timeout: 5000
      });

      if (response.data?.providers) {
        Object.keys(response.data.providers).forEach(provider => {
          if (this.providers[provider.toUpperCase()]) {
            this.providers[provider.toUpperCase()].status = response.data.providers[provider].status;
            this.providers[provider.toUpperCase()].responseTime = response.data.providers[provider].responseTime;
          }
        });
      }
    } catch (error) {
      console.warn('Payment health check failed:', error.message);
      // Don't throw - health check is non-critical
    }
  }

  // === STRIPE CHECKOUT ===

  /**
   * Create a Stripe Checkout session for an accepted purchase request.
   * Mirrors POST /api/payments/create-checkout-session.
   */
  async createStripeCheckout(purchaseRequestId, options = {}) {
    const requestId = this.generateRequestId();

    try {
      await this.validateCheckoutRequest(purchaseRequestId, 'stripe');
      if (!options.agreementId) throw new Error('Review and approve the purchase agreement before payment.');

      toast.loading('Creating secure checkout session...', {
        id: `checkout-${requestId}`
      });

      const idempotencyKey = options.idempotencyKey || crypto.randomUUID();

      const response = await this.apiClient.post(
        '/payments/create-checkout-session',
        { purchase_request_id: purchaseRequestId, agreement_id: options.agreementId },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );

      toast.dismiss(`checkout-${requestId}`);

      // The server returns { url, sessionId }; normalize for callers.
      const checkoutUrl = response.data?.url || response.data?.checkout_url;
      if (!checkoutUrl) {
        throw new Error('Invalid checkout response: missing checkout URL');
      }

      this.trackPaymentEvent('checkout_created', {
        provider: 'stripe',
        purchaseRequestId,
        requestId
      });

      return {
        ...response.data,
        checkout_url: checkoutUrl,
        session_id: response.data?.sessionId || response.data?.session_id,
        requestId,
        provider: 'stripe'
      };
    } catch (error) {
      toast.dismiss(`checkout-${requestId}`);

      const enhancedError = this.enhanceError(error, 'STRIPE_CHECKOUT_FAILED');
      enhancedError.userMessage = this.getStripeErrorMessage(error);

      toast.error(enhancedError.userMessage, {
        duration: 6000,
        action: {
          label: 'Retry',
          onClick: () => this.createStripeCheckout(purchaseRequestId, options)
        }
      });

      throw enhancedError;
    }
  }

  // Validate checkout request before processing
  async validateCheckoutRequest(purchaseRequestId, provider) {
    if (!purchaseRequestId) {
      throw new Error('Purchase request ID is required for checkout');
    }

    if (this.providers[provider.toUpperCase()]?.status !== 'active') {
      throw new Error(`${provider} is currently unavailable. Please try again later.`);
    }
  }

  // Get user-friendly error messages for Stripe errors
  getStripeErrorMessage(error) {
    const stripeErrorCodes = {
      'card_declined': 'Your card was declined. Please check your card details or try a different payment method.',
      'insufficient_funds': 'Your card has insufficient funds. Please use a different payment method.',
      'expired_card': 'Your card has expired. Please update your payment information.',
      'incorrect_cvc': 'Your card\'s security code is incorrect. Please check and try again.',
      'processing_error': 'There was an error processing your payment. Please try again in a few moments.',
      'rate_limit': 'Too many payment attempts. Please wait a few minutes before trying again.',
      'api_connection_error': 'Unable to connect to payment processor. Please check your connection and try again.',
      'api_error': 'Payment service temporarily unavailable. Please try again shortly.',
      'authentication_error': 'Payment authentication failed. Please refresh the page and try again.',
      'invalid_request_error': 'Invalid payment request. Please refresh the page and try again.'
    };

    const errorCode = error.response?.data?.code || error.response?.data?.error?.code;
    if (errorCode && stripeErrorCodes[errorCode]) {
      return stripeErrorCodes[errorCode];
    }

    const serverMessage = error.response?.data?.error || error.response?.data?.message;
    if (typeof serverMessage === 'string' && serverMessage) {
      return serverMessage;
    }

    if (error.response?.status === 400) {
      return 'Please check your payment information and try again.';
    } else if (error.response?.status === 401) {
      return 'Your session has expired. Please refresh the page and try again.';
    } else if (error.response?.status === 403) {
      return 'This payment method is not authorized for this transaction.';
    } else if (error.response?.status === 404) {
      return 'This purchase request could not be found. It may have been cancelled or completed already.';
    } else if (error.response?.status >= 500) {
      return 'Payment service is temporarily unavailable. Please try again in a few minutes.';
    }

    return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }

  // Track payment events for analytics and debugging
  trackPaymentEvent(event, data) {
    try {
      // Send to analytics if available
      if (window.gtag) {
        window.gtag('event', event, {
          event_category: 'payment',
          event_label: data.provider,
          value: data.amount || 0,
          custom_map: {
            custom_parameter_1: data.requestId
          }
        });
      }
    } catch (_error) {
      // Silent fail for analytics
    }
  }

  async createStripeConnectAccount(idempotencyKey) {
    try {
      const response = await this.apiClient.post(
        '/payments/connect/create-account',
        {},
        idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to create Stripe Connect account');
    }
  }

  async getStripeConnectStatus() {
    try {
      const response = await this.apiClient.get('/payments/connect/status');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get Stripe Connect status');
    }
  }

  // === UNIVERSAL CHECKOUT ENTRYPOINT ===

  async getAvailablePaymentMethods() {
    try {
      const response = await this.apiClient.get('/payments/methods');

      const methods = response.data?.methods || [];
      const implementedIds = Object.values(this.providers).map(provider => provider.id);
      const enhancedMethods = methods
        .filter(method => implementedIds.includes(method.provider))
        .map(method => ({
          ...method,
          ...this.providers[method.provider?.toUpperCase()],
          available: this.providers[method.provider?.toUpperCase()]?.status === 'active'
        }));

      return {
        methods: enhancedMethods,
        healthCheck: response.data?.healthCheck,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      // Fallback to local provider information
      console.warn('Failed to fetch payment methods from API, using local data:', error.message);

      return {
        methods: Object.values(this.providers).map(provider => ({
          ...provider,
          available: provider.status === 'active'
        })),
        healthCheck: null,
        lastUpdated: new Date().toISOString(),
        source: 'local_fallback'
      };
    }
  }

  /**
   * Production checkout entrypoint used by marketplace pages.
   *
   * Flow (matches the server's escrow design):
   *   1. Reserve the project via "Buy now" -> creates/reuses a purchase request
   *      accepted-pending-payment (POST /purchase-requests/projects/:id/initiate-checkout).
   *   2. Create the Stripe Checkout session for that request
   *      (POST /payments/create-checkout-session).
   *
   * Returns { checkout_url, session_id, purchase_request_id, provider }.
   */
  async createCheckout(paymentData, _provider = 'stripe', options = {}) {
    const requestId = this.generateRequestId();

    try {
      if (!paymentData?.projectId) {
        throw new Error('Project ID is required for checkout');
      }
      if (!options.agreementId) throw new Error('Open the purchase agreement and approve its latest version before payment.');

      if (this.providers.STRIPE.status !== 'active') {
        throw new Error('Stripe is currently unavailable. Please try again later.');
      }

      toast.loading('Setting up secure payment...', {
        id: `checkout-${requestId}`,
        duration: 30000
      });

      const idempotencyKey = crypto.randomUUID();

      // Step 1: reserve the project and get/refresh the purchase request
      const initiation = await this.apiClient.post(
        `/purchase-requests/projects/${paymentData.projectId}/initiate-checkout`,
        { terms_agreed_version: 'v_direct_buy_1.0' },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );

      const purchaseRequestId = initiation.data?.purchase_request_id || initiation.data?.request_id;
      if (!purchaseRequestId) {
        throw new Error('Checkout could not be started. Please try again.');
      }

      // Step 2: create the Stripe Checkout session for that request
      const sessionResponse = await this.apiClient.post(
        '/payments/create-checkout-session',
        { purchase_request_id: purchaseRequestId, agreement_id: options.agreementId },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );

      const checkoutUrl = sessionResponse.data?.url || sessionResponse.data?.checkout_url;
      if (!checkoutUrl) {
        throw new Error('Invalid checkout response: missing checkout URL');
      }

      toast.dismiss(`checkout-${requestId}`);

      this.trackPaymentEvent('checkout_success', {
        provider: 'stripe',
        requestId,
        amount: paymentData.amount,
        projectId: paymentData.projectId
      });

      toast.success('Redirecting to secure checkout...', {
        duration: 3000
      });

      return {
        ...sessionResponse.data,
        checkout_url: checkoutUrl,
        session_id: sessionResponse.data?.sessionId || sessionResponse.data?.session_id,
        purchase_request_id: purchaseRequestId,
        requestId,
        provider: 'stripe',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      };
    } catch (error) {
      toast.dismiss(`checkout-${requestId}`);

      const enhancedError = this.enhanceError(error, 'CHECKOUT_CREATION_FAILED');
      enhancedError.provider = 'stripe';
      enhancedError.requestId = requestId;
      enhancedError.userMessage =
        (typeof error.response?.data?.error === 'string' && error.response.data.error) ||
        this.getStripeErrorMessage(error);

      toast.error(enhancedError.userMessage, {
        duration: 6000
      });

      throw enhancedError;
    }
  }

  // === PAYMENT STATUS & HISTORY ===

  async getPaymentHistory() {
    try {
      const response = await this.apiClient.get('/payments/transactions');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get payment history');
    }
  }

  // === SELLER CONNECT SETUP ===

  async getConnectStatus() {
    try {
      const response = await this.apiClient.get('/payments/connect/status');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get connect status');
    }
  }

  // === ERROR HANDLING ===

  handleError(error, defaultMessage) {
    console.error('Payment service error:', error);

    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          return new Error(data.message || data.error || 'Invalid payment request');
        case 401:
          return new Error('Authentication required for payment');
        case 403:
          return new Error('Payment not authorized');
        case 404:
          return new Error('Payment method not found');
        case 409:
          return new Error(data.message || data.error || 'Payment conflict');
        case 429:
          return new Error('Too many payment requests. Please try again later.');
        case 500:
          return new Error(data.message || data.error || 'Payment service temporarily unavailable');
        default:
          return new Error(data.message || data.error || defaultMessage);
      }
    }

    if (error.request) {
      return new Error('Payment service is currently unavailable');
    }

    return new Error(error.message || defaultMessage);
  }

  // === UTILITY METHODS ===

  formatAmount(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

// Create singleton instance
const paymentService = new PaymentService();

// Export both the class and instance
export { PaymentService };
export default paymentService;
