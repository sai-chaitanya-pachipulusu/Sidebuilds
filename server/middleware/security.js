const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');

// Enhanced rate limiting with Redis support (fallback to memory)
const createRateLimiter = (windowMs, max, message, options = {}) => {
  const config = {
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.round(windowMs / 1000),
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    keyGenerator: (req) => {
      // Use IP + User-Agent for better fingerprinting
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent') || '';
      return crypto.createHash('sha256').update(ip + userAgent).digest('hex');
    },
    handler: (req, res) => {
      console.warn(`[Security] Rate limit exceeded for ${req.ip}: ${message}`);
      res.status(429).json({
        error: message,
        retryAfter: Math.round(windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    },
    onLimitReached: (req, res, options) => {
      console.warn(`[Security] Rate limit reached for ${req.ip}: ${message}`);
    }
  };

  return rateLimit(config);
};

// Sophisticated rate limiters for different endpoints
const rateLimiters = {
  // General API requests
  general: createRateLimiter(15 * 60 * 1000, 1000, 'Too many requests from this IP'),
  
  // Authentication endpoints (stricter)
  auth: createRateLimiter(15 * 60 * 1000, 10, 'Too many authentication attempts', {
    skipSuccessfulRequests: true
  }),
  
  // Password reset (very strict)
  passwordReset: createRateLimiter(60 * 60 * 1000, 3, 'Too many password reset attempts'),
  
  // Payment endpoints (strict)
  payment: createRateLimiter(60 * 60 * 1000, 20, 'Too many payment requests'),
  
  // API endpoints (moderate)
  api: createRateLimiter(1 * 60 * 1000, 100, 'API rate limit exceeded'),
  
  // File uploads (strict)
  upload: createRateLimiter(60 * 60 * 1000, 50, 'Too many file uploads'),
  
  // Search endpoints (moderate)
  search: createRateLimiter(1 * 60 * 1000, 200, 'Too many search requests'),
  
  // AI endpoints (strict due to cost)
  ai: createRateLimiter(60 * 60 * 1000, 100, 'Too many AI requests')
};

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://www.sidebuilds.space',
      'https://sidebuilds.space',
      'https://app.sidebuilds.space',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
    ];
    
    // Development mode - allow localhost with any port
    if (process.env.NODE_ENV === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`[Security] CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Auth-Token',
    'X-API-Key',
    'X-Forwarded-For',
    'X-Real-IP'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
};

// Input validation and sanitization
const sanitizeInput = (req, res, next) => {
  // Remove any potential NoSQL injection attempts
  const sanitizeObject = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          // Remove potential script tags and SQL injection attempts
          obj[key] = obj[key]
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/(\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$regex)/gi, '');
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  
  next();
};

// Request logging for security monitoring
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//g,  // Path traversal
    /<script/gi, // XSS attempts
    /union\s+select/gi, // SQL injection
    /javascript:/gi, // JavaScript injection
    /eval\(/gi, // Code injection
    /document\.cookie/gi // Cookie theft attempts
  ];
  
  const requestString = JSON.stringify({
    url: req.url,
    body: req.body,
    query: req.query,
    headers: req.headers
  });
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestString));
  
  if (isSuspicious) {
    console.warn(`[Security] Suspicious request detected:`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
  
  // Log response time and status
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    if (duration > 5000) { // Log slow requests
      console.warn(`[Security] Slow request detected: ${req.method} ${req.url} - ${duration}ms`);
    }
    
    if (res.statusCode >= 400) {
      console.warn(`[Security] Error response: ${res.statusCode} for ${req.method} ${req.url}`);
    }
  });
  
  next();
};

// Brute force protection
const bruteForceProtection = new Map();

const checkBruteForce = (identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const key = `${identifier}_${req.ip}`;
    const now = Date.now();
    
    if (!bruteForceProtection.has(key)) {
      bruteForceProtection.set(key, { attempts: 0, lastAttempt: now });
    }
    
    const record = bruteForceProtection.get(key);
    
    // Reset if window has passed
    if (now - record.lastAttempt > windowMs) {
      record.attempts = 0;
      record.lastAttempt = now;
    }
    
    if (record.attempts >= maxAttempts) {
      const timeLeft = Math.ceil((windowMs - (now - record.lastAttempt)) / 1000);
      return res.status(429).json({
        error: 'Too many failed attempts. Please try again later.',
        retryAfter: timeLeft,
        timestamp: new Date().toISOString()
      });
    }
    
    // Increment on failed requests
    res.on('finish', () => {
      if (res.statusCode === 401 || res.statusCode === 403) {
        record.attempts++;
        record.lastAttempt = now;
      } else if (res.statusCode < 400) {
        // Reset on successful request
        record.attempts = 0;
      }
    });
    
    next();
  };
};

// Content Security Policy
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Required for React
      "'unsafe-eval'", // Required for development
      "https://js.stripe.com",
      "https://m.stripe.network",
      "https://*.stripe.com"
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Required for styled-components
      "https://js.stripe.com",
      "https://*.stripe.com"
    ],
    imgSrc: [
      "'self'",
      "data:",
      "blob:",
      "https:",
      "http:" // Allow all images for user uploads
    ],
    fontSrc: [
      "'self'",
      "data:",
      "https://js.stripe.com",
      "https://*.stripe.com"
    ],
    connectSrc: [
      "'self'",
      "https://api.stripe.com",
      "https://m.stripe.network",
      "https://*.stripe.com",
      "ws://localhost:*", // WebSocket for development
      "wss://*" // WebSocket for production
    ],
    frameSrc: [
      "'self'",
      "https://js.stripe.com",
      "https://hooks.stripe.com",
      "https://m.stripe.network",
      "https://*.stripe.com"
    ],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
  }
};

// Main security middleware setup
const setupSecurity = (app) => {
  // Trust proxy for accurate IP addresses
  app.set('trust proxy', 1);
  
  // Basic security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? cspConfig : false,
    crossOriginEmbedderPolicy: false, // Disable for Stripe compatibility
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));
  
  // CORS
  app.use(cors(corsOptions));
  
  // Security logging
  app.use(securityLogger);
  
  // Input sanitization
  app.use(sanitizeInput);
  
  // General rate limiting
  app.use(rateLimiters.general);
  
  return rateLimiters;
};

// IP whitelist/blacklist functionality
const ipFilter = {
  whitelist: new Set(process.env.IP_WHITELIST?.split(',') || []),
  blacklist: new Set(process.env.IP_BLACKLIST?.split(',') || []),
  
  middleware: (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    
    // Check blacklist first
    if (ipFilter.blacklist.has(ip)) {
      console.warn(`[Security] Blocked blacklisted IP: ${ip}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // If whitelist is configured and IP is not whitelisted
    if (ipFilter.whitelist.size > 0 && !ipFilter.whitelist.has(ip)) {
      console.warn(`[Security] Blocked non-whitelisted IP: ${ip}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
  },
  
  addToBlacklist: (ip) => {
    ipFilter.blacklist.add(ip);
    console.log(`[Security] Added ${ip} to blacklist`);
  },
  
  removeFromBlacklist: (ip) => {
    ipFilter.blacklist.delete(ip);
    console.log(`[Security] Removed ${ip} from blacklist`);
  }
};

// Security monitoring and alerting
const securityMonitor = {
  alerts: [],
  thresholds: {
    failedLogins: 10,
    suspiciousRequests: 20,
    errorRate: 0.1 // 10% error rate
  },
  
  logAlert: (type, message, metadata = {}) => {
    const alert = {
      type,
      message,
      metadata,
      timestamp: new Date().toISOString(),
      severity: metadata.severity || 'medium'
    };
    
    securityMonitor.alerts.push(alert);
    
    // Keep only last 1000 alerts
    if (securityMonitor.alerts.length > 1000) {
      securityMonitor.alerts.shift();
    }
    
    console.warn(`[Security Alert] ${type}: ${message}`, metadata);
    
    // In production, you might want to send alerts to external services
    if (process.env.NODE_ENV === 'production' && alert.severity === 'high') {
      // Send to monitoring service, Slack, email, etc.
    }
  },
  
  getAlerts: (since = Date.now() - 24 * 60 * 60 * 1000) => {
    return securityMonitor.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > since
    );
  },
  
  clearAlerts: () => {
    securityMonitor.alerts = [];
  }
};

module.exports = {
  setupSecurity,
  rateLimiters,
  bruteForceProtection: checkBruteForce,
  ipFilter,
  securityMonitor,
  corsOptions
};
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "https://js.stripe.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.stripe.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"],
      },
    },
  }));

  // CORS
  app.use(cors(corsOptions));

  // Body parsing security
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Data sanitization
  app.use(mongoSanitize());
  app.use(xss());
  app.use(hpp());

  // Apply rate limiters
  app.use('/api/auth', rateLimiters.auth);
  app.use('/api/payments', rateLimiters.payment);
  app.use('/api', rateLimiters.api);
  app.use(rateLimiters.general);

  // Custom security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
};

module.exports = { setupSecurity, rateLimiters }; 