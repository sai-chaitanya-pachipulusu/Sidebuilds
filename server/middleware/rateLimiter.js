// Rate Limiting Middleware
// Implements token bucket algorithm for API rate limiting

const rateLimitStore = new Map();

// Default rate limit configuration
const DEFAULT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // requests per window
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  },
  onLimitReached: (req, res, options) => {
    console.warn(`[RateLimit] Limit reached for IP: ${options.keyGenerator(req)}`);
  }
};

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Token Bucket Rate Limiter
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware
 */
function rateLimit(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  return (req, res, next) => {
    const key = config.keyGenerator(req);
    const now = Date.now();
    
    // Get or create rate limit data for this key
    let limitData = rateLimitStore.get(key);
    
    if (!limitData || now > limitData.resetTime) {
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
  maxRequests: 100 // 100 requests per 15 minutes
});

/**
 * Public API rate limiter (more lenient for public data)
 */
const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60 // 60 requests per minute
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
