// Enhanced API Cache with LRU eviction, compression hints, and stale-while-revalidate
// Reduces redundant network requests and improves perceived performance

class APICache {
  constructor(options = {}) {
    this.cache = new Map();
    this.accessOrder = []; // For LRU tracking
    this.defaultTTL = options.defaultTTL || 60000; // 1 minute default
    this.maxSize = options.maxSize || 100; // Maximum number of cached items
    this.staleWhileRevalidate = options.staleWhileRevalidate || true;
    this.compressionEnabled = options.compressionEnabled || false;
    
    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0
    };
  }

  // Generate a cache key from URL and params
  generateKey(url, params = {}) {
    // Sort params for consistent keys
    const sortedParams = Object.keys(params).sort().reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {});
    const paramStr = JSON.stringify(sortedParams);
    return `${url}:${paramStr}`;
  }

  // Update access order for LRU
  updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  // Evict least recently used items
  evictLRU() {
    while (this.cache.size >= this.maxSize && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift();
      if (this.cache.has(oldestKey)) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }
  }

  // Get cached data if valid
  get(key, options = {}) {
    const cached = this.cache.get(key);
    
    if (!cached) {
      this.stats.misses++;
      return null;
    }
    
    const now = Date.now();
    
    // Check if data is fresh
    if (now <= cached.expiry) {
      this.updateAccessOrder(key);
      this.stats.hits++;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📦 Cache HIT: ${key.substring(0, 50)}...`);
      }
      
      return cached.data;
    }
    
    // Check stale-while-revalidate
    if (this.staleWhileRevalidate && now <= cached.staleExpiry) {
      this.updateAccessOrder(key);
      this.stats.hits++;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📦 Cache STALE: ${key.substring(0, 50)}... (returning stale data)`);
      }
      
      // Mark as stale so caller knows to revalidate
      return {
        ...cached.data,
        __stale: true,
        __revalidate: () => this.revalidate(key)
      };
    }
    
    // Expired
    this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) this.accessOrder.splice(index, 1);
    
    this.stats.misses++;
    return null;
  }

  // Set cache data with TTL
  set(key, data, ttl = this.defaultTTL) {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    const now = Date.now();
    
    this.cache.set(key, {
      data,
      expiry: now + ttl,
      staleExpiry: now + ttl * 2, // Stale period is 2x TTL
      timestamp: now,
      size: JSON.stringify(data).length // Approximate size
    });
    
    this.updateAccessOrder(key);
    this.stats.size = this.cache.size;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`💾 Cache SET: ${key.substring(0, 50)}... (TTL: ${ttl/1000}s)`);
    }
  }

  // Revalidate stale data
  async revalidate(key) {
    // This would be called by the cachedFetch wrapper
    this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) this.accessOrder.splice(index, 1);
  }

  // Invalidate specific cache entry
  invalidate(key) {
    this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) this.accessOrder.splice(index, 1);
    this.stats.size = this.cache.size;
  }

  // Invalidate all entries matching a pattern
  invalidatePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        const index = this.accessOrder.indexOf(key);
        if (index > -1) this.accessOrder.splice(index, 1);
      }
    }
    this.stats.size = this.cache.size;
  }

  // Invalidate by tags (for tag-based cache invalidation)
  invalidateTags(tags) {
    const tagsArray = Array.isArray(tags) ? tags : [tags];
    
    for (const [key, value] of this.cache.entries()) {
      if (value.tags && tagsArray.some(tag => value.tags.includes(tag))) {
        this.cache.delete(key);
        const index = this.accessOrder.indexOf(key);
        if (index > -1) this.accessOrder.splice(index, 1);
      }
    }
    this.stats.size = this.cache.size;
  }

  // Clear entire cache
  clear() {
    this.cache.clear();
    this.accessOrder = [];
    this.stats.size = 0;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Cache cleared');
    }
  }

  // Get cache stats
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0;
    
    // Calculate total size
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size || 0;
    }
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      totalSize: `${(totalSize / 1024).toFixed(2)}KB`,
      keys: Array.from(this.cache.keys())
    };
  }

  // Preload data into cache
  preload(key, fetchFn, ttl = this.defaultTTL) {
    // Don't preload if already cached
    if (this.cache.has(key)) return;
    
    fetchFn().then(data => {
      this.set(key, data, ttl);
    }).catch(err => {
      console.warn(`[Cache] Preload failed for ${key}:`, err.message);
    });
  }

  // Get or fetch pattern with automatic caching
  async getOrFetch(key, fetchFn, ttl = this.defaultTTL) {
    const cached = this.get(key);
    if (cached && !cached.__stale) {
      return cached;
    }
    
    // If stale, return stale data immediately and refresh in background
    if (cached && cached.__stale) {
      // Trigger background refresh
      fetchFn().then(data => {
        this.set(key, data, ttl);
      }).catch(() => {
        // Keep stale data on error
      });
      
      // Return stale data without the metadata
      const { __stale, __revalidate, ...data } = cached;
      return data;
    }
    
    // Fetch fresh data
    const data = await fetchFn();
    this.set(key, data, ttl);
    return data;
  }
}

// Singleton instance with optimized settings
const apiCache = new APICache({
  maxSize: 200,
  defaultTTL: 60000,
  staleWhileRevalidate: true
});

// Cache TTL configurations for different endpoints
export const CACHE_TTL = {
  MARKETPLACE: 30000,      // 30 seconds - frequently updated
  USER_PROJECTS: 60000,    // 1 minute
  PROJECT_DETAIL: 120000,  // 2 minutes
  STATS: 300000,           // 5 minutes - rarely changes
  USER_PROFILE: 180000,    // 3 minutes
  STATIC: 3600000,         // 1 hour - very static data
  SEARCH: 15000,           // 15 seconds - search results
};

// Cache tags for invalidation
export const CACHE_TAGS = {
  PROJECTS: 'projects',
  USERS: 'users',
  MARKETPLACE: 'marketplace',
  STATS: 'stats',
  PURCHASES: 'purchases'
};

// Enhanced wrapper function for cached API calls
export const cachedFetch = async (fetchFn, cacheKey, ttl = 60000, options = {}) => {
  const { 
    tags = [], 
    forceRefresh = false,
    backgroundRefresh = false 
  } = options;
  
  // Force refresh if requested
  if (forceRefresh) {
    apiCache.invalidate(cacheKey);
  }
  
  // Check cache first
  const cached = apiCache.get(cacheKey);
  
  if (cached) {
    // Handle stale data
    if (cached.__stale && !backgroundRefresh) {
      // Trigger background refresh
      fetchFn().then(data => {
        apiCache.set(cacheKey, data, ttl);
      }).catch(() => {});
      
      const { __stale, __revalidate, ...data } = cached;
      return data;
    }
    
    return cached;
  }
  
  // Fetch fresh data
  try {
    const data = await fetchFn();
    
    // Store with tags if provided
    apiCache.set(cacheKey, data, ttl);
    if (tags.length > 0 && apiCache.cache.has(cacheKey)) {
      apiCache.cache.get(cacheKey).tags = tags;
    }
    
    return data;
  } catch (error) {
    // On error, return stale data if available
    const stale = apiCache.cache.get(cacheKey);
    if (stale) {
      console.warn('[Cache] Returning stale data due to fetch error');
      return stale.data;
    }
    throw error;
  }
};

// Batch multiple cache requests
export const batchCacheRequests = async (requests) => {
  const results = await Promise.all(
    requests.map(({ fetchFn, cacheKey, ttl, options }) =>
      cachedFetch(fetchFn, cacheKey, ttl, options).catch(err => ({ error: err.message }))
    )
  );
  
  return results;
};

// Preload common data
export const preloadCommonData = (fetchers) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      Object.entries(fetchers).forEach(([key, { fetchFn, ttl }]) => {
        apiCache.preload(key, fetchFn, ttl);
      });
    }, { timeout: 5000 });
  }
};

// Cache warming for critical data
export const warmCache = async (endpoints) => {
  const warmPromises = endpoints.map(({ key, fetchFn, ttl }) =>
    apiCache.getOrFetch(key, fetchFn, ttl).catch(() => null)
  );
  
  await Promise.all(warmPromises);
};

// Expose cache for debugging
if (typeof window !== 'undefined') {
  window.apiCache = apiCache;
  window.CACHE_TTL = CACHE_TTL;
  window.CACHE_TAGS = CACHE_TAGS;
}

export { apiCache };
export default apiCache;
