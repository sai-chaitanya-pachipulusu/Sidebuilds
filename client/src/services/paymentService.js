import axios from 'axios';
import toast from 'react-hot-toast';

// Production-ready Payment Service with comprehensive error handling
class PaymentService {
  constructor() {
    this.apiClient = axios.create({
      baseURL: process.env.REACT_APP_API_URL || '/api',
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
    this.userNotifications = new Set();

    // Add auth token to requests with retry mechanism
    this.apiClient.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
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

    // Available payment providers with status tracking
    this.providers = {
      STRIPE: { id: 'stripe', name: 'Stripe', status: 'active', fees: 2.9 },
      PAYPAL: { id: 'paypal', name: 'PayPal', status: 'active', fees: 3.5 },
      RAZORPAY: { id: 'razorpay', name: 'Razorpay', status: 'beta', fees: 2.0 },
      SQUARE: { id: 'square', name: 'Square', status: 'maintenance', fees: 2.6 },
      PADDLE: { id: 'paddle', name: 'Paddle', status: 'active', fees: 5.0 },
      LEMONSQUEEZY: { id: 'lemonsqueezy', name: 'Lemon Squeezy', status: 'active', fees: 5.0 }
    };

    // Initialize health check
    this.performHealthCheck();
  }

  // Generate unique request ID for tracking
  generateRequestId() {
    return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      enhanced.code = error.response.data?.code || 'UNKNOWN';
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

    // Don't retry payment processing requests (idempotency concerns)
    if (config.url?.includes('/checkout') || config.url?.includes('/process')) {
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

    // Show user-friendly retry notification
    if (attempt === 2) {
      toast.loading(`Retrying payment request... (${attempt}/${this.retryConfig.maxRetries})`, {
        id: `retry-${requestId}`,
        duration: delay + 1000
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
      toast.dismiss(`retry-${requestId}`);
    }
  }

  // Health check for payment providers
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

  // === ENHANCED STRIPE INTEGRATION ===
  
  async createStripeCheckout(projectId, options = {}) {
    const requestId = this.generateRequestId();
    
    try {
      // Pre-flight validation
      await this.validateCheckoutRequest(projectId, 'stripe');
      
      // Show loading state
      const loadingToast = toast.loading('Creating secure checkout session...', {
        id: `checkout-${requestId}`
      });

      const response = await this.apiClient.post('/payments/stripe/checkout', {
        projectId,
        successUrl: options.successUrl || `${window.location.origin}/purchase/success`,
        cancelUrl: options.cancelUrl || `${window.location.origin}/marketplace`,
        metadata: {
          ...options.metadata,
          requestId,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: document.referrer
        }
      });

      // Clear loading state
      toast.dismiss(`checkout-${requestId}`);
      
      // Validate response
      if (!response.data?.checkout_url) {
        throw new Error('Invalid checkout response: missing checkout URL');
      }

      // Track successful checkout creation
      this.trackPaymentEvent('checkout_created', {
        provider: 'stripe',
        projectId,
        requestId
      });

      return {
        ...response.data,
        requestId,
        provider: 'stripe'
      };
      
    } catch (error) {
      toast.dismiss(`checkout-${requestId}`);
      
      const enhancedError = this.enhanceError(error, 'STRIPE_CHECKOUT_FAILED');
      enhancedError.userMessage = this.getStripeErrorMessage(error);
      
      // Show user-friendly error
      toast.error(enhancedError.userMessage, {
        duration: 6000,
        action: {
          label: 'Retry',
          onClick: () => this.createStripeCheckout(projectId, options)
        }
      });
      
      throw enhancedError;
    }
  }

  // Validate checkout request before processing
  async validateCheckoutRequest(projectId, provider) {
    if (!projectId) {
      throw new Error('Project ID is required for checkout');
    }

    if (!this.providers[provider.toUpperCase()]?.status === 'active') {
      throw new Error(`${provider} is currently unavailable. Please try another payment method.`);
    }

    // Check if project is still available
    try {
      const projectCheck = await this.apiClient.get(`/projects/${projectId}/availability`);
      if (!projectCheck.data?.available) {
        throw new Error('This project is no longer available for purchase');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Project not found or has been removed');
      }
      // Don't block checkout for temporary API issues
      console.warn('Project availability check failed:', error.message);
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

    if (error.response?.status === 400) {
      return 'Please check your payment information and try again.';
    } else if (error.response?.status === 401) {
      return 'Your session has expired. Please refresh the page and try again.';
    } else if (error.response?.status === 403) {
      return 'This payment method is not authorized for this transaction.';
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
      
      // Log for debugging
      console.log('Payment Event:', event, data);
    } catch (error) {
      // Silent fail for analytics
      console.warn('Payment tracking failed:', error.message);
    }
  }

  async createStripeConnectAccount() {
    try {
      const response = await this.apiClient.post('/payments/stripe/connect/create-account');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to create Stripe Connect account');
    }
  }

  async getStripeConnectStatus() {
    try {
      const response = await this.apiClient.get('/payments/stripe/connect/status');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get Stripe Connect status');
    }
  }

  // === PAYPAL INTEGRATION ===
  
  async createPayPalOrder(projectId, options = {}) {
    try {
      const response = await this.apiClient.post('/payments/paypal/orders', {
        projectId,
        returnUrl: options.returnUrl || `${window.location.origin}/purchase/success`,
        cancelUrl: options.cancelUrl || `${window.location.origin}/marketplace`
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to create PayPal order');
    }
  }

  // === ENHANCED UNIVERSAL PAYMENT METHODS ===
  
  async getAvailablePaymentMethods() {
    try {
      const response = await this.apiClient.get('/payments/methods');
      
      // Merge with local provider status
      const methods = response.data?.methods || [];
      const enhancedMethods = methods.map(method => ({
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

  // Production-ready checkout creation with comprehensive error handling
  async createCheckout(paymentData, provider = 'stripe', options = {}) {
    const requestId = this.generateRequestId();
    
    try {
      // Validate input data
      this.validatePaymentData(paymentData);
      
      // Pre-flight checks
      await this.validateCheckoutRequest(paymentData.projectId, provider);
      
      // Show loading state with better UX
      const loadingToast = toast.loading(`Setting up ${provider} payment...`, {
        id: `checkout-${requestId}`,
        duration: 30000 // Longer duration for payment operations
      });

      // Route to appropriate provider method
      const methodMap = {
        stripe: () => this.createStripeCheckout(paymentData.projectId, {
          ...options,
          amount: paymentData.amount,
          projectName: paymentData.projectName,
          sellerId: paymentData.sellerId,
          buyerId: paymentData.buyerId
        }),
        paypal: () => this.createPayPalOrder(paymentData.projectId, {
          ...options,
          amount: paymentData.amount
        }),
      };

      const createMethod = methodMap[provider];
      if (!createMethod) {
        throw new Error(`Unsupported payment provider: ${provider}`);
      }

      const result = await createMethod();
      
      toast.dismiss(`checkout-${requestId}`);
      
      // Track successful checkout
      this.trackPaymentEvent('checkout_success', {
        provider,
        requestId,
        amount: paymentData.amount,
        projectId: paymentData.projectId
      });

      // Show success message
      toast.success('Payment session created successfully!', {
        duration: 3000
      });

      return {
        ...result,
        requestId,
        provider,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      };

    } catch (error) {
      toast.dismiss(`checkout-${requestId}`);
      
      const enhancedError = this.enhanceError(error, 'CHECKOUT_CREATION_FAILED');
      enhancedError.provider = provider;
      enhancedError.requestId = requestId;
      
      // Provide fallback options
      const fallbackProviders = this.getActiveFallbackProviders(provider);
      if (fallbackProviders.length > 0) {
        enhancedError.fallbackOptions = fallbackProviders;
        enhancedError.userMessage = `${provider} is currently unavailable. Try ${fallbackProviders[0].name} instead?`;
        
        toast.error(enhancedError.userMessage, {
          duration: 8000,
          action: {
            label: `Try ${fallbackProviders[0].name}`,
            onClick: () => this.createCheckout(paymentData, fallbackProviders[0].id, options)
          }
        });
      } else {
        enhancedError.userMessage = 'Payment processing is temporarily unavailable. Please try again in a few minutes.';
        toast.error(enhancedError.userMessage, {
          duration: 6000
        });
      }
      
      throw enhancedError;
    }
  }

  // Validate payment data before processing
  validatePaymentData(data) {
    const required = ['projectId', 'amount', 'projectName', 'sellerId', 'buyerId'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required payment data: ${missing.join(', ')}`);
    }
    
    if (data.amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }
    
    if (data.sellerId === data.buyerId) {
      throw new Error('Seller and buyer cannot be the same');
    }
  }

  // Get fallback payment providers when primary fails
  getActiveFallbackProviders(excludeProvider) {
    return Object.values(this.providers)
      .filter(provider => 
        provider.status === 'active' && 
        provider.id !== excludeProvider
      )
      .sort((a, b) => a.fees - b.fees); // Sort by fees (cheapest first)
  }

  async createUniversalCheckout(projectId, provider, options = {}) {
    console.warn('createUniversalCheckout is deprecated. Use createCheckout instead.');
    
    // Legacy support - convert to new format
    const paymentData = {
      projectId,
      amount: options.amount || 0,
      projectName: options.projectName || 'Unknown Project',
      sellerId: options.sellerId || 'unknown',
      buyerId: options.buyerId || 'unknown'
    };
    
    return this.createCheckout(paymentData, provider, options);
  }

  // === PAYMENT STATUS & HISTORY ===
  
  async getPaymentHistory() {
    try {
      const response = await this.apiClient.get('/payments/history');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get payment history');
    }
  }

  async getEarnings() {
    try {
      const response = await this.apiClient.get('/payments/earnings');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get earnings');
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
          return new Error(data.message || 'Invalid payment request');
        case 401:
          return new Error('Authentication required for payment');
        case 403:
          return new Error('Payment not authorized');
        case 404:
          return new Error('Payment method not found');
        case 409:
          return new Error(data.message || 'Payment conflict');
        case 429:
          return new Error('Too many payment requests. Please try again later.');
        case 500:
          return new Error('Payment service temporarily unavailable');
        default:
          return new Error(data.message || defaultMessage);
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