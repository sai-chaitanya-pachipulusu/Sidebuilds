import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// =====================================================
// PERFORMANCE OPTIMIZATION UTILITIES
// =====================================================

/**
 * Enhanced debounce with immediate execution option
 */
export const debounce = (func, delay, immediate = false) => {
  let timeoutId;
  let lastCallTime = 0;
  
  return function executedFunction(...args) {
    const context = this;
    const callNow = immediate && !timeoutId;
    
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!immediate) func.apply(context, args);
    }, delay);
    
    if (callNow) {
      lastCallTime = Date.now();
      func.apply(context, args);
    }
  };
};

/**
 * Enhanced throttle with trailing execution
 */
export const throttle = (func, limit, trailing = true) => {
  let inThrottle;
  let lastFunc;
  let lastRan;
  
  return function(...args) {
    const context = this;
    
    if (!inThrottle) {
      func.apply(context, args);
      lastRan = Date.now();
      inThrottle = true;
    } else if (trailing) {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

/**
 * Intersection Observer hook for lazy loading
 */
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const targetRef = useRef(null);
  
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };
  
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      const isVisible = entry.isIntersecting;
      setIsIntersecting(isVisible);
      
      if (isVisible && !hasIntersected) {
        setHasIntersected(true);
      }
    }, defaultOptions);
    
    observer.observe(target);
    
    return () => {
      observer.unobserve(target);
    };
  }, [hasIntersected]);
  
  return { targetRef, isIntersecting, hasIntersected };
};

/**
 * Virtual scrolling hook for large lists
 */
export const useVirtualScrolling = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState(null);
  
  const visibleItems = useMemo(() => {
    if (!items.length || !itemHeight || !containerHeight) return items;
    
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );
    
    return {
      items: items.slice(startIndex, endIndex),
      startIndex,
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [items, itemHeight, containerHeight, scrollTop]);
  
  const handleScroll = useCallback(
    throttle((e) => {
      setScrollTop(e.target.scrollTop);
    }, 16), // 60fps
    []
  );
  
  return {
    containerRef: setContainerRef,
    visibleItems,
    handleScroll,
    totalHeight: visibleItems.totalHeight,
    offsetY: visibleItems.offsetY
  };
};

/**
 * Image lazy loading with progressive enhancement
 */
export const LazyImage = ({ 
  src, 
  alt, 
  placeholder, 
  className = '', 
  onLoad,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const { targetRef, hasIntersected } = useIntersectionObserver({
    rootMargin: '100px'
  });
  
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);
  
  const handleError = useCallback(() => {
    setIsError(true);
  }, []);
  
  return (
    <div ref={targetRef} className={`relative overflow-hidden ${className}`}>
      {/* Placeholder */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center">
          {placeholder || (
            <div className="w-8 h-8 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
          )}
        </div>
      )}
      
      {/* Actual image */}
      {hasIntersected && !isError && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}
      
      {/* Error state */}
      {isError && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center text-gray-400">
          <span className="text-sm">Failed to load</span>
        </div>
      )}
    </div>
  );
};

/**
 * Memory-efficient list component with recycling
 */
export const VirtualizedList = ({ 
  items, 
  itemHeight, 
  containerHeight, 
  renderItem,
  className = '',
  overscan = 3
}) => {
  const { 
    containerRef, 
    visibleItems, 
    handleScroll, 
    totalHeight, 
    offsetY 
  } = useVirtualScrolling(items, itemHeight, containerHeight);
  
  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.items.map((item, index) => (
            <div
              key={visibleItems.startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, visibleItems.startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Performance monitoring hook
 */
export const usePerformanceMonitor = (componentName) => {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());
  
  useEffect(() => {
    renderCount.current += 1;
  });
  
  const logPerformance = useCallback((operation) => {
    const endTime = Date.now();
    const duration = endTime - startTime.current;
    
    console.log(`[Performance] ${componentName}:`, {
      operation,
      duration: `${duration}ms`,
      renderCount: renderCount.current,
      timestamp: new Date().toISOString()
    });
    
    startTime.current = endTime;
  }, [componentName]);
  
  return { logPerformance, renderCount: renderCount.current };
};

/**
 * Optimized search hook with caching
 */
export const useOptimizedSearch = (items, searchFields, options = {}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState(items);
  const cache = useRef(new Map());
  
  const {
    minLength = 2,
    maxResults = 100,
    caseSensitive = false,
    fuzzyMatch = true
  } = options;
  
  const debouncedSearch = useMemo(
    () => debounce((term) => {
      if (term.length < minLength) {
        setResults(items);
        return;
      }
      
      // Check cache first
      const cacheKey = `${term}_${caseSensitive}_${fuzzyMatch}`;
      if (cache.current.has(cacheKey)) {
        setResults(cache.current.get(cacheKey));
        return;
      }
      
      const searchResults = items.filter(item => {
        return searchFields.some(field => {
          const value = item[field];
          if (!value) return false;
          
          const searchValue = caseSensitive ? value : value.toLowerCase();
          const searchTermValue = caseSensitive ? term : term.toLowerCase();
          
          if (fuzzyMatch) {
            // Simple fuzzy matching
            return searchValue.includes(searchTermValue);
          } else {
            return searchValue.startsWith(searchTermValue);
          }
        });
      }).slice(0, maxResults);
      
      // Cache results
      cache.current.set(cacheKey, searchResults);
      
      // Limit cache size
      if (cache.current.size > 50) {
        const firstKey = cache.current.keys().next().value;
        cache.current.delete(firstKey);
      }
      
      setResults(searchResults);
    }, 300),
    [items, searchFields, minLength, maxResults, caseSensitive, fuzzyMatch]
  );
  
  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);
  
  return {
    searchTerm,
    setSearchTerm,
    results,
    isSearching: searchTerm.length >= minLength,
    clearSearch: () => setSearchTerm('')
  };
};

/**
 * Bundle size analyzer (development only)
 */
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  
  console.group('📦 Bundle Analysis');
  
  scripts.forEach(script => {
    console.log(`JS: ${script.src.split('/').pop()}`);
  });
  
  styles.forEach(style => {
    console.log(`CSS: ${style.href.split('/').pop()}`);
  });
  
  console.groupEnd();
};

/**
 * Memory usage monitor
 */
export const useMemoryMonitor = (interval = 5000) => {
  const [memoryInfo, setMemoryInfo] = useState(null);
  
  useEffect(() => {
    if (!performance.memory) return;
    
    const updateMemoryInfo = () => {
      setMemoryInfo({
        used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
      });
    };
    
    updateMemoryInfo();
    const intervalId = setInterval(updateMemoryInfo, interval);
    
    return () => clearInterval(intervalId);
  }, [interval]);
  
  return memoryInfo;
};

/**
 * Preload critical resources
 */
export const preloadResources = (resources) => {
  resources.forEach(({ href, as, type }) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    if (type) link.type = type;
    document.head.appendChild(link);
  });
};

/**
 * Critical CSS inlining utility
 */
export const inlineCriticalCSS = (css) => {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
};

/**
 * Service Worker registration
 */
export const registerServiceWorker = async (swPath = '/sw.js') => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(swPath);
      console.log('SW registered:', registration);
      return registration;
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  }
};

/**
 * Performance observer for Core Web Vitals
 */
export const observeWebVitals = (callback) => {
  if (!window.PerformanceObserver) return;
  
  // Largest Contentful Paint
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    callback('LCP', lastEntry.startTime);
  }).observe({ entryTypes: ['largest-contentful-paint'] });
  
  // First Input Delay
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach(entry => {
      callback('FID', entry.processingStart - entry.startTime);
    });
  }).observe({ entryTypes: ['first-input'] });
  
  // Cumulative Layout Shift
  new PerformanceObserver((list) => {
    let clsValue = 0;
    const entries = list.getEntries();
    entries.forEach(entry => {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
      }
    });
    callback('CLS', clsValue);
  }).observe({ entryTypes: ['layout-shift'] });
};

export default {
  debounce,
  throttle,
  useIntersectionObserver,
  useVirtualScrolling,
  LazyImage,
  VirtualizedList,
  usePerformanceMonitor,
  useOptimizedSearch,
  analyzeBundleSize,
  useMemoryMonitor,
  preloadResources,
  inlineCriticalCSS,
  registerServiceWorker,
  observeWebVitals
};
