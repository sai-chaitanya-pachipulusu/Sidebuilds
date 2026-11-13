// Rate Limiting Middleware
// Implements token bucket algorithm for API rate limiting

const rateLimitStore = new Map();
let limiterSequence = 0;
const MAX_RATE_LIMIT_ENTRIES = 50000;

// Default rate limit configuration
const DEFAULT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: process.env.NODE_ENV === 'development' ? 2000 : 600,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
  handler: (req, res) => {
    const retryAfter = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000));
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      error: 'Too many requests, please try again later.',
      retryAfter
    });
  },
  onLimitReached: (req, res, options) => {
    console.warn(`[RateLimit] Limit reached for IP: ${options.keyGenerator(req)}`);
  }
};

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL);
cleanupTimer.unref?.();

/**
 * Token Bucket Rate Limiter
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware
 */
function rateLimit(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  // Each limiter needs its own bucket namespace. Without this, the general API
  // bucket was reused by stricter upload/search limiters for the same IP.
  const namespace = options.namespace || `limiter-${++limiterSequence}`;
  
  return (req, res, next) => {
    const rawKey = config.keyGenerator(req);
    const key = `${namespace}:${rawKey}`;
    const now = Date.now();
    
    // Get or create rate limit data for this key
    let limitData = rateLimitStore.get(key);
    
    if (!limitData || now > limitData.resetTime) {
      if (!limitData && rateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES) {
        const oldestKey = rateLimitStore.keys().next().value;
        if (oldestKey) rateLimitStore.delete(oldestKey);
      }

      // Reset or create new bucket
      limitData = {
        tokens: config.maxRequests,
        resetTime: now + config.windowMs,
        totalRequests: 0
      };
      rateLimitStore.set(key, limitData);
    }
    
    // Add rate limit info to request
    req.rateLimit = {
      limit: config.maxRequests,
      remaining: Math.max(0, limitData.tokens - 1),
      resetTime: limitData.resetTime
    };
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', req.rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(limitData.resetTime / 1000));
    
    // Check if limit exceeded
    if (limitData.tokens <= 0) {
      config.onLimitReached(req, res, config);
      return config.handler(req, res);
    }
    
    // Consume token
    limitData.tokens--;
    limitData.totalRequests++;
    
    // Track response for potential token restoration
    const originalEnd = res.end;
    res.end = function(...args) {
      res.end = originalEnd;
      res.end(...args);
      
      // Restore token on certain conditions
      if (config.skipSuccessfulRequests && res.statusCode < 400) {
        limitData.tokens = Math.min(config.maxRequests, limitData.tokens + 1);
      }
      if (config.skipFailedRequests && res.statusCode >= 400) {
        limitData.tokens = Math.min(config.maxRequests, limitData.tokens + 1);
      }
    };
    
    next();
  };
}

/**
 * Strict rate limiter for sensitive endpoints
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts
  keyGenerator: (req) => `${req.ip}:${req.body?.email || req.body?.username || 'unknown'}`
});

/**
 * API rate limiter for general endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // A data-rich SPA performs several parallel reads per page. This still
  // blocks abusive bursts without rate-limiting normal navigation.
  maxRequests: process.env.NODE_ENV === 'development' ? 2000 : 600
});

/**
 * Public API rate limiter (more lenient for public data)
 */
const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: process.env.NODE_ENV === 'development' ? 600 : 120
});

/**
 * Search rate limiter (prevents abuse of search functionality)
 */
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30 // 30 searches per minute
});

/**
 * Upload rate limiter (prevents abuse of file uploads)
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10 // 10 uploads per hour
});

/**
 * Webhook rate limiter (allows more requests for webhooks)
 */
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 1000 // 1000 webhook calls per minute
});

/**
 * Admin rate limiter (less restrictive for admin operations)
 */
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 500 // 500 requests per 15 minutes
});

/**
 * Burst rate limiter (allows short bursts)
 */
const burstLimiter = rateLimit({
  windowMs: 1000, // 1 second
  maxRequests: 10 // 10 requests per second
});

/**
 * AI rate limiter (protects paid and compute-heavy model calls)
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: process.env.NODE_ENV === 'development' ? 100 : 10,
  keyGenerator: (req) => `${req.ip}:${req.user?.user_id || 'anonymous'}`
});

// Export all limiters
module.exports = {
  rateLimit,
  strictLimiter,
  apiLimiter,
  publicLimiter,
  searchLimiter,
  uploadLimiter,
  webhookLimiter,
  adminLimiter,
  burstLimiter,
  aiLimiter,
  
  // Preset configurations
  presets: {
    // Authentication endpoints
    auth: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      skipSuccessfulRequests: true
    },
    
    // API endpoints
    api: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 100
    },
    
    // Public read-only endpoints
    public: {
      windowMs: 60 * 1000,
      maxRequests: 60
    },
    
    // Search endpoints
    search: {
      windowMs: 60 * 1000,
      maxRequests: 30
    },
    
    // File upload endpoints
    upload: {
      windowMs: 60 * 60 * 1000,
      maxRequests: 10
    },
    
    // Webhook endpoints
    webhook: {
      windowMs: 60 * 1000,
      maxRequests: 1000
    }
  }
};
