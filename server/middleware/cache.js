// Server-side API Response Caching Middleware
// Implements in-memory caching with Redis-like features

const crypto = require('crypto');

// Cache configuration
const DEFAULT_CONFIG = {
  ttl: 60 * 1000, // 1 minute default
  maxSize: 1000, // Maximum number of cached entries
  staleWhileRevalidate: true,
  compression: false,
  keyGenerator: (req) => {
    const data = `${req.method}:${req.originalUrl || req.url}:${JSON.stringify(req.query)}:${JSON.stringify(req.body)}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }
};

// In-memory cache store
const cacheStore = new Map();
const accessOrder = []; // For LRU eviction

// Cache statistics
const stats = {
  hits: 0,
  misses: 0,
  evictions: 0,
  size: 0
};

/**
 * Generate cache key from request
 */
function generateKey(req, customKeyGenerator) {
  if (customKeyGenerator) {
    return customKeyGenerator(req);
  }
  return DEFAULT_CONFIG.keyGenerator(req);
}

/**
 * Update access order for LRU
 */
function updateAccessOrder(key) {
  const index = accessOrder.indexOf(key);
  if (index > -1) {
    accessOrder.splice(index, 1);
  }
  accessOrder.push(key);
}

/**
 * Evict least recently used items
 */
function evictLRU(maxSize) {
  while (cacheStore.size >= maxSize && accessOrder.length > 0) {
    const oldestKey = accessOrder.shift();
    if (cacheStore.has(oldestKey)) {
      cacheStore.delete(oldestKey);
      stats.evictions++;
    }
  }
}

/**
 * Get cached response
 */
function get(key) {
  const cached = cacheStore.get(key);
  
  if (!cached) {
    stats.misses++;
    return null;
  }
  
  const now = Date.now();
  
  // Check if data is fresh
  if (now <= cached.expiry) {
    updateAccessOrder(key);
    stats.hits++;
    return cached.data;
  }
  
  // Check stale-while-revalidate
  if (cached.staleExpiry && now <= cached.staleExpiry) {
    updateAccessOrder(key);
    stats.hits++;
    return { ...cached.data, __stale: true };
  }
  
  // Expired
  cacheStore.delete(key);
  const index = accessOrder.indexOf(key);
  if (index > -1) accessOrder.splice(index, 1);
  stats.size = cacheStore.size;
  
  stats.misses++;
  return null;
}

/**
 * Set cached response
 */
function set(key, data, ttl, staleWhileRevalidate = true) {
  // Evict if at capacity
  if (cacheStore.size >= DEFAULT_CONFIG.maxSize) {
    evictLRU(DEFAULT_CONFIG.maxSize);
  }
  
  const now = Date.now();
  
  cacheStore.set(key, {
    data,
    expiry: now + ttl,
    staleExpiry: staleWhileRevalidate ? now + ttl * 2 : null,
    timestamp: now
  });
  
  updateAccessOrder(key);
  stats.size = cacheStore.size;
}

/**
 * Invalidate cache entries
 */
function invalidate(pattern) {
  for (const key of cacheStore.keys()) {
    if (key.includes(pattern)) {
      cacheStore.delete(key);
      const index = accessOrder.indexOf(key);
      if (index > -1) accessOrder.splice(index, 1);
    }
  }
  stats.size = cacheStore.size;
}

/**
 * Clear entire cache
 */
function clear() {
  cacheStore.clear();
  accessOrder.length = 0;
  stats.size = 0;
}

/**
 * Get cache statistics
 */
function getStats() {
  const totalRequests = stats.hits + stats.misses;
  return {
    ...stats,
    hitRate: totalRequests > 0 ? (stats.hits / totalRequests * 100).toFixed(2) + '%' : '0%',
    keys: Array.from(cacheStore.keys())
  };
}

/**
 * Cache middleware factory
 */
function cache(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  return (req, res, next) => {
    // Only cache GET requests by default
    if (req.method !== 'GET' && !config.methods?.includes(req.method)) {
      return next();
    }
    
    // Skip caching if disabled for this request
    if (req.skipCache) {
      return next();
    }
    
    const key = generateKey(req, config.keyGenerator);
    
    // Check cache
    const cached = get(key);
    
    if (cached && !cached.__stale) {
      // Add cache headers
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Key', key);
      
      return res.json(cached);
    }
    
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method to cache response
    res.json = function(data) {
      // Restore original json method
      res.json = originalJson;
      
      // Add cache headers
      res.setHeader('X-Cache', cached?.__stale ? 'STALE' : 'MISS');
      res.setHeader('X-Cache-Key', key);
      
      // Cache the response
      if (res.statusCode < 400) {
        set(key, data, config.ttl, config.staleWhileRevalidate);
      }
      
      // Send response
      return res.json(data);
    };
    
    next();
  };
}

/**
 * Cache tags for tag-based invalidation
 */
const tagIndex = new Map();

function setWithTags(key, data, ttl, tags = []) {
  set(key, data, ttl);
  
  // Index by tags
  tags.forEach(tag => {
    if (!tagIndex.has(tag)) {
      tagIndex.set(tag, new Set());
    }
    tagIndex.get(tag).add(key);
  });
}

function invalidateTags(tags) {
  const tagsArray = Array.isArray(tags) ? tags : [tags];
  
  tagsArray.forEach(tag => {
    const keys = tagIndex.get(tag);
    if (keys) {
      keys.forEach(key => {
        cacheStore.delete(key);
        const index = accessOrder.indexOf(key);
        if (index > -1) accessOrder.splice(index, 1);
      });
      tagIndex.delete(tag);
    }
  });
  
  stats.size = cacheStore.size;
}

// Preset cache configurations
const presets = {
  // Short cache for frequently changing data
  short: {
    ttl: 30 * 1000, // 30 seconds
    staleWhileRevalidate: true
  },
  
  // Medium cache for semi-static data
  medium: {
    ttl: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true
  },
  
  // Long cache for static data
  long: {
    ttl: 60 * 60 * 1000, // 1 hour
    staleWhileRevalidate: false
  },
  
  // Marketplace data cache
  marketplace: {
    ttl: 30 * 1000, // 30 seconds
    keyGenerator: (req) => `marketplace:${JSON.stringify(req.query)}`,
    tags: ['marketplace', 'projects']
  },
  
  // User data cache
  user: {
    ttl: 5 * 60 * 1000, // 5 minutes
    keyGenerator: (req) => `user:${req.user?.id}:${req.originalUrl}`,
    tags: ['user']
  },
  
  // Statistics cache
  stats: {
    ttl: 5 * 60 * 1000, // 5 minutes
    tags: ['stats']
  },
  
  // Public projects cache
  public: {
    ttl: 60 * 1000, // 1 minute
    tags: ['public', 'projects']
  }
};

// Export everything
module.exports = {
  cache,
  get,
  set,
  invalidate,
  invalidateTags,
  clear,
  getStats,
  presets,
  
  // Direct access for advanced usage
  cacheStore,
  stats
};
