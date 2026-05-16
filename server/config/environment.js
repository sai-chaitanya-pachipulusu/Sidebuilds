// Server-side environment configuration
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Environment detection
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5002;

// Database configuration based on environment
const getDatabaseConfig = () => {
  const configs = {
    development: {
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/sidebuilds_dev',
      ssl: false,
      pool: {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
    },
    
    test: {
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/sidebuilds_test',
      ssl: false,
      pool: {
        min: 1,
        max: 5,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 2000,
      }
    },
    
    staging: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      pool: {
        min: 5,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
    },
    
    production: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      pool: {
        min: 10,
        max: 30,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
    }
  };

  return configs[NODE_ENV] || configs.development;
};

// Redis configuration for caching (if available)
const getRedisConfig = () => {
  if (!process.env.REDIS_URL) return null;
  
  const configs = {
    development: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    },
    
    production: {
      url: process.env.REDIS_URL,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      lazyConnect: true,
    }
  };

  return configs[NODE_ENV] || configs.development;
};

// CORS configuration
const getCorsConfig = () => {
  const baseOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://www.sidebuilds.online',
    'https://sidebuilds.online'
  ];

  const configs = {
    development: {
      origin: [...baseOrigins, `http://localhost:${PORT}`],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      optionsSuccessStatus: 200
    },
    
    production: {
      origin: process.env.ALLOWED_ORIGINS ? 
        process.env.ALLOWED_ORIGINS.split(',') : 
        ['https://www.sidebuilds.online', 'https://sidebuilds.online'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      optionsSuccessStatus: 200
    }
  };

  return configs[NODE_ENV] || configs.development;
};

// AI service configuration
const getAIConfig = () => {
  return {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
      enabled: !!process.env.OPENAI_API_KEY
    },
    
    scoring: {
      enabled: process.env.AI_SCORING_ENABLED !== 'false',
      cacheTimeout: parseInt(process.env.AI_CACHE_TIMEOUT) || 3600, // 1 hour
      batchSize: parseInt(process.env.AI_BATCH_SIZE) || 10,
      retryAttempts: parseInt(process.env.AI_RETRY_ATTEMPTS) || 3
    },
    
    recommendations: {
      enabled: process.env.AI_RECOMMENDATIONS_ENABLED !== 'false',
      refreshInterval: parseInt(process.env.RECOMMENDATIONS_REFRESH) || 300, // 5 minutes
      maxRecommendations: parseInt(process.env.MAX_RECOMMENDATIONS) || 20,
      similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.7
    }
  };
};

// Stripe configuration
const getStripeConfig = () => {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    connectWebhookSecret: process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
    
    fees: {
      platformFee: parseFloat(process.env.PLATFORM_FEE_PERCENT) || 5.0, // 5%
      stripeFee: 2.9, // Stripe's standard fee
      fixedFee: 0.30 // Stripe's fixed fee
    },
    
    limits: {
      minAmount: parseInt(process.env.MIN_TRANSACTION_AMOUNT) || 100, // $1.00
      maxAmount: parseInt(process.env.MAX_TRANSACTION_AMOUNT) || 100000000 // $1M
    }
  };
};

// Email service configuration
const getEmailConfig = () => {
  const emailService = process.env.EMAIL_SERVICE || 'sendgrid';
  
  const configs = {
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.FROM_EMAIL || 'noreply@sidebuilds.online',
      templates: {
        welcome: process.env.WELCOME_TEMPLATE_ID,
        passwordReset: process.env.PASSWORD_RESET_TEMPLATE_ID,
        purchaseConfirmation: process.env.PURCHASE_CONFIRMATION_TEMPLATE_ID,
        saleNotification: process.env.SALE_NOTIFICATION_TEMPLATE_ID
      }
    },
    
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      fromEmail: process.env.FROM_EMAIL || 'noreply@sidebuilds.online'
    }
  };

  return {
    service: emailService,
    ...configs[emailService],
    enabled: !!(process.env.SENDGRID_API_KEY || process.env.SMTP_HOST)
  };
};

// Rate limiting configuration
const getRateLimitConfig = () => {
  const configs = {
    development: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      skipSuccessfulRequests: true
    },
    
    production: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      skipSuccessfulRequests: false,
      standardHeaders: true,
      legacyHeaders: false
    }
  };

  return configs[NODE_ENV] || configs.development;
};

// File upload configuration
const getUploadConfig = () => {
  const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
  
  // Ensure upload directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return {
    directory: uploadDir,
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'video/mp4',
      'video/webm'
    ],
    
    storage: {
      type: process.env.STORAGE_TYPE || 'local', // 'local', 's3', 'cloudinary'
      
      s3: {
        bucket: process.env.S3_BUCKET,
        region: process.env.S3_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      },
      
      cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET
      }
    }
  };
};

// Logging configuration
const getLoggingConfig = () => {
  const configs = {
    development: {
      level: 'debug',
      format: 'combined',
      file: false,
      console: true
    },
    
    production: {
      level: process.env.LOG_LEVEL || 'info',
      format: 'json',
      file: process.env.LOG_FILE || 'logs/app.log',
      console: false,
      errorFile: process.env.ERROR_LOG_FILE || 'logs/error.log'
    }
  };

  return configs[NODE_ENV] || configs.development;
};

// Security configuration
const getSecurityConfig = () => {
  return {
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      algorithm: 'HS256'
    },
    
    bcrypt: {
      saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
    },
    
    session: {
      secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
      name: 'sidebuilds.sid',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict'
    },
    
    headers: {
      hsts: NODE_ENV === 'production',
      noSniff: true,
      frameguard: true,
      xssFilter: true,
      contentSecurityPolicy: NODE_ENV === 'production'
    }
  };
};

// Feature flags
const getFeatureFlags = () => {
  return {
    ai: {
      scoring: process.env.FEATURE_AI_SCORING !== 'false',
      recommendations: process.env.FEATURE_AI_RECOMMENDATIONS !== 'false',
      insights: process.env.FEATURE_AI_INSIGHTS !== 'false'
    },
    
    realtime: {
      notifications: process.env.FEATURE_REALTIME_NOTIFICATIONS !== 'false',
      collaboration: process.env.FEATURE_COLLABORATION === 'true',
      analytics: process.env.FEATURE_REALTIME_ANALYTICS !== 'false'
    },
    
    payments: {
      stripe: process.env.FEATURE_STRIPE_PAYMENTS !== 'false',
      escrow: process.env.FEATURE_ESCROW === 'true',
      subscriptions: process.env.FEATURE_SUBSCRIPTIONS === 'true'
    },
    
    beta: {
      advanced_analytics: process.env.FEATURE_ADVANCED_ANALYTICS === 'true',
      api_access: process.env.FEATURE_API_ACCESS === 'true',
      custom_branding: process.env.FEATURE_CUSTOM_BRANDING === 'true'
    }
  };
};

// Cache configuration
const getCacheConfig = () => {
  return {
    default: {
      ttl: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour
      max: parseInt(process.env.CACHE_MAX_ITEMS) || 1000
    },
    
    user: {
      ttl: parseInt(process.env.USER_CACHE_TTL) || 1800, // 30 minutes
      max: 500
    },
    
    project: {
      ttl: parseInt(process.env.PROJECT_CACHE_TTL) || 900, // 15 minutes
      max: 1000
    },
    
    analytics: {
      ttl: parseInt(process.env.ANALYTICS_CACHE_TTL) || 300, // 5 minutes
      max: 100
    },
    
    ai: {
      ttl: parseInt(process.env.AI_CACHE_TTL) || 3600, // 1 hour
      max: 200
    }
  };
};

// WebSocket configuration
const getWebSocketConfig = () => {
  return {
    cors: getCorsConfig(),
    transports: ['websocket', 'polling'],
    pingInterval: parseInt(process.env.WS_PING_INTERVAL) || 25000,
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT) || 60000,
    maxHttpBufferSize: parseInt(process.env.WS_MAX_BUFFER_SIZE) || 1000000, // 1MB
    
    rooms: {
      maxListeners: parseInt(process.env.WS_MAX_LISTENERS) || 100,
      cleanupInterval: parseInt(process.env.WS_CLEANUP_INTERVAL) || 60000 // 1 minute
    },
    
    auth: {
      timeout: parseInt(process.env.WS_AUTH_TIMEOUT) || 5000,
      required: process.env.WS_AUTH_REQUIRED !== 'false'
    }
  };
};

// API documentation configuration
const getApiDocConfig = () => {
  return {
    enabled: NODE_ENV !== 'production' || process.env.API_DOCS_ENABLED === 'true',
    version: process.env.API_VERSION || '1.0.0',
    title: 'SideBuilds API',
    description: 'API for SideBuilds marketplace platform',
    contact: {
      name: 'SideBuilds Support',
      email: 'support@sidebuilds.online'
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      },
      {
        url: 'https://api.sidebuilds.online',
        description: 'Production server'
      }
    ]
  };
};

// Monitoring and observability configuration
const getMonitoringConfig = () => {
  return {
    healthCheck: {
      enabled: true,
      endpoint: '/health',
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000 // 30 seconds
    },
    
    metrics: {
      enabled: process.env.METRICS_ENABLED !== 'false',
      endpoint: '/metrics',
      collectDefault: true,
      prefix: 'sidebuilds_'
    },
    
    tracing: {
      enabled: process.env.TRACING_ENABLED === 'true',
      serviceName: 'sidebuilds-api',
      jaegerEndpoint: process.env.JAEGER_ENDPOINT
    },
    
    alerting: {
      enabled: process.env.ALERTING_ENABLED === 'true',
      webhookUrl: process.env.ALERT_WEBHOOK_URL,
      thresholds: {
        errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD) || 0.05, // 5%
        responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD) || 1000, // 1s
        memoryUsage: parseFloat(process.env.MEMORY_USAGE_THRESHOLD) || 0.8 // 80%
      }
    }
  };
};

// Main configuration object
const config = {
  // Environment info
  NODE_ENV,
  PORT,
  isDevelopment: NODE_ENV === 'development',
  isProduction: NODE_ENV === 'production',
  isTest: NODE_ENV === 'test',
  
  // Service configurations
  database: getDatabaseConfig(),
  redis: getRedisConfig(),
  cors: getCorsConfig(),
  ai: getAIConfig(),
  stripe: getStripeConfig(),
  email: getEmailConfig(),
  rateLimit: getRateLimitConfig(),
  upload: getUploadConfig(),
  logging: getLoggingConfig(),
  security: getSecurityConfig(),
  features: getFeatureFlags(),
  cache: getCacheConfig(),
  websocket: getWebSocketConfig(),
  apiDoc: getApiDocConfig(),
  monitoring: getMonitoringConfig(),
  
  // Helper methods
  isFeatureEnabled: (featurePath) => {
    const parts = featurePath.split('.');
    let current = config.features;
    
    for (const part of parts) {
      if (current[part] === undefined) return false;
      current = current[part];
    }
    
    return current === true;
  },
  
  getFullUrl: (path = '') => {
    const protocol = config.isProduction ? 'https' : 'http';
    const host = process.env.HOST || 'localhost';
    const port = config.isProduction ? '' : `:${PORT}`;
    return `${protocol}://${host}${port}${path}`;
  },
  
  validate: () => {
    const required = [
      'JWT_SECRET',
      'DATABASE_URL'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Validate JWT secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      console.warn('Warning: JWT_SECRET should be at least 32 characters long');
    }
    
    // Validate database URL format
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgres')) {
      throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
    }
    
    return true;
  }
};

// Validate configuration on load
try {
  config.validate();
  console.log(`Configuration loaded for environment: ${NODE_ENV}`);
} catch (error) {
  console.error('Configuration validation failed:', error.message);
  process.exit(1);
}

module.exports = config;