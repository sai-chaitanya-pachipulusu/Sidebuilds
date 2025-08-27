import React from 'react';

// performance.js - Enhanced Performance optimization utilities

// Lazy load components with error boundaries and loading states
export const lazyLoad = (importFunc, fallback = null) => {
  const LazyComponent = React.lazy(importFunc);
  
  return (props) => (
    <React.Suspense fallback={fallback || <div className="animate-pulse bg-gray-800 rounded-lg h-32" />}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
};

// Enhanced debounce with immediate execution option
export const debounce = (func, delay, immediate = false) => {
  let timeoutId;
  return (...args) => {
    const callNow = immediate && !timeoutId;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!immediate) func.apply(null, args);
    }, delay);
    if (callNow) func.apply(null, args);
  };
};

// Enhanced throttle with leading and trailing options
export const throttle = (func, limit, options = {}) => {
  const { leading = true, trailing = true } = options;
  let inThrottle;
  let lastFunc;
  let lastRan;
  
  return function(...args) {
    const context = this;
    
    if (!inThrottle) {
      if (leading) func.apply(context, args);
      lastRan = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          if (trailing) func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

// Advanced Intersection Observer with multiple thresholds
export const createIntersectionObserver = (callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: [0, 0.1, 0.5, 1.0],
    ...options
  };

  if (!window.IntersectionObserver) {
    // Fallback for older browsers
    return {
      observe: () => {},
      unobserve: () => {},
      disconnect: () => {}
    };
  }

  return new IntersectionObserver(callback, defaultOptions);
};

// Virtual scrolling implementation
export class VirtualScroller {
  constructor(container, itemHeight, renderItem, bufferSize = 5) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.renderItem = renderItem;
    this.bufferSize = bufferSize;
    this.scrollTop = 0;
    this.containerHeight = 0;
    this.items = [];
    
    this.init();
  }
  
  init() {
    this.container.addEventListener('scroll', this.handleScroll.bind(this));
    this.updateContainerHeight();
    window.addEventListener('resize', this.updateContainerHeight.bind(this));
  }
  
  updateContainerHeight() {
    this.containerHeight = this.container.clientHeight;
    this.render();
  }
  
  handleScroll() {
    this.scrollTop = this.container.scrollTop;
    this.render();
  }
  
  setItems(items) {
    this.items = items;
    this.render();
  }
  
  render() {
    const startIndex = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.bufferSize);
    const endIndex = Math.min(
      this.items.length - 1,
      Math.ceil((this.scrollTop + this.containerHeight) / this.itemHeight) + this.bufferSize
    );
    
    const visibleItems = this.items.slice(startIndex, endIndex + 1);
    const offsetY = startIndex * this.itemHeight;
    
    // Clear container - SECURITY FIX: Use safe DOM manipulation instead of innerHTML
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    
    // Create wrapper with proper height
    const wrapper = document.createElement('div');
    wrapper.style.height = `${this.items.length * this.itemHeight}px`;
    wrapper.style.position = 'relative';
    
    // Create visible items container
    const itemsContainer = document.createElement('div');
    itemsContainer.style.transform = `translateY(${offsetY}px)`;
    
    visibleItems.forEach((item, index) => {
      const element = this.renderItem(item, startIndex + index);
      itemsContainer.appendChild(element);
    });
    
    wrapper.appendChild(itemsContainer);
    this.container.appendChild(wrapper);
  }
  
  destroy() {
    this.container.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.updateContainerHeight);
  }
}

// Image lazy loading with progressive enhancement
export const createLazyImageLoader = () => {
  const imageObserver = createIntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;
        
        if (src) {
          // Create a new image to preload
          const newImg = new Image();
          newImg.onload = () => {
            img.src = src;
            img.classList.add('loaded');
            img.removeAttribute('data-src');
          };
          newImg.onerror = () => {
            img.classList.add('error');
          };
          newImg.src = src;
        }
        
        imageObserver.unobserve(img);
      }
    });
  }, {
    rootMargin: '100px'
  });
  
  return {
    observe: (img) => imageObserver.observe(img),
    disconnect: () => imageObserver.disconnect()
  };
};

// Memory cleanup utilities
export const cleanupTimers = (timers) => {
  if (Array.isArray(timers)) {
    timers.forEach(timer => {
      if (timer) {
        clearTimeout(timer);
        clearInterval(timer);
      }
    });
  }
};

// Performance monitoring
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      renderTimes: [],
      memoryUsage: [],
      networkRequests: [],
      userInteractions: []
    };
    
    this.init();
  }
  
  init() {
    // Monitor render performance
    if (window.performance && window.performance.observer) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.entryType === 'measure') {
            this.metrics.renderTimes.push({
              name: entry.name,
              duration: entry.duration,
              timestamp: entry.startTime
            });
          }
        });
      });
      
      observer.observe({ entryTypes: ['measure'] });
    }
    
    // Monitor memory usage
    if (window.performance && window.performance.memory) {
      setInterval(() => {
        this.metrics.memoryUsage.push({
          used: window.performance.memory.usedJSHeapSize,
          total: window.performance.memory.totalJSHeapSize,
          limit: window.performance.memory.jsHeapSizeLimit,
          timestamp: Date.now()
        });
        
        // Keep only last 100 entries
        if (this.metrics.memoryUsage.length > 100) {
          this.metrics.memoryUsage.shift();
        }
      }, 5000);
    }
  }
  
  markRenderStart(componentName) {
    if (window.performance) {
      window.performance.mark(`${componentName}-render-start`);
    }
  }
  
  markRenderEnd(componentName) {
    if (window.performance) {
      window.performance.mark(`${componentName}-render-end`);
      window.performance.measure(
        `${componentName}-render`,
        `${componentName}-render-start`,
        `${componentName}-render-end`
      );
    }
  }
  
  trackUserInteraction(type, target, duration = 0) {
    this.metrics.userInteractions.push({
      type,
      target,
      duration,
      timestamp: Date.now()
    });
    
    // Keep only last 50 interactions
    if (this.metrics.userInteractions.length > 50) {
      this.metrics.userInteractions.shift();
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      summary: {
        avgRenderTime: this.metrics.renderTimes.length > 0 
          ? this.metrics.renderTimes.reduce((sum, entry) => sum + entry.duration, 0) / this.metrics.renderTimes.length
          : 0,
        currentMemoryUsage: this.metrics.memoryUsage.length > 0 
          ? this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1]
          : null,
        totalInteractions: this.metrics.userInteractions.length
      }
    };
  }
  
  exportMetrics() {
    const data = this.getMetrics();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Bundle size analyzer
export const analyzeBundleSize = () => {
  if (window.performance && window.performance.getEntriesByType) {
    const resources = window.performance.getEntriesByType('resource');
    const jsResources = resources.filter(resource => 
      resource.name.includes('.js') || resource.name.includes('.jsx')
    );
    
    const totalSize = jsResources.reduce((total, resource) => {
      return total + (resource.transferSize || 0);
    }, 0);
    
    return {
      totalJSSize: totalSize,
      resources: jsResources.map(resource => ({
        name: resource.name,
        size: resource.transferSize,
        loadTime: resource.duration
      })),
      recommendations: totalSize > 1000000 ? [
        'Consider code splitting',
        'Implement lazy loading',
        'Remove unused dependencies'
      ] : []
    };
  }
  
  return null;
};

// React performance hooks
export const usePerformanceMonitor = (componentName) => {
  const monitor = React.useRef(new PerformanceMonitor());
  
  React.useEffect(() => {
    monitor.current.markRenderStart(componentName);
    
    return () => {
      monitor.current.markRenderEnd(componentName);
    };
  });
  
  return monitor.current;
};

// Memoization utilities
export const createMemoizedSelector = (selector, equalityFn = (a, b) => a === b) => {
  let lastArgs = [];
  let lastResult;
  
  return (...args) => {
    const hasChanged = args.length !== lastArgs.length || 
      args.some((arg, index) => !equalityFn(arg, lastArgs[index]));
    
    if (hasChanged) {
      lastResult = selector(...args);
      lastArgs = args;
    }
    
    return lastResult;
  };
};

// Network optimization
export const createRequestBatcher = (batchSize = 10, delay = 100) => {
  let batch = [];
  let timeoutId = null;
  
  return (request) => {
    return new Promise((resolve, reject) => {
      batch.push({ request, resolve, reject });
      
      if (batch.length >= batchSize) {
        processBatch();
      } else if (!timeoutId) {
        timeoutId = setTimeout(processBatch, delay);
      }
    });
  };
  
  function processBatch() {
    const currentBatch = batch.splice(0);
    clearTimeout(timeoutId);
    timeoutId = null;
    
    // Process all requests in the batch
    Promise.allSettled(currentBatch.map(item => item.request()))
      .then(results => {
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            currentBatch[index].resolve(result.value);
          } else {
            currentBatch[index].reject(result.reason);
          }
        });
      });
  }
};

// Export performance monitor instance
export const performanceMonitor = new PerformanceMonitor();
  timers.forEach(timer => {
    if (timer) clearTimeout(timer);
  });
};

export const cleanupIntervals = (intervals) => {
  intervals.forEach(interval => {
    if (interval) clearInterval(interval);
  });
};

// Performance monitoring
export const measurePerformance = (name, fn) => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  console.log(`${name} took ${end - start} milliseconds`);
  return result;
};

// Bundle analysis helper
export const checkBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Bundle analysis available in production build');
  }
};

export default {
  lazyLoad,
  debounce,
  throttle,
  createIntersectionObserver,
  cleanupTimers,
  cleanupIntervals,
  measurePerformance,
  checkBundleSize
}; 