import React, { useMemo, useCallback, memo } from 'react';

// performance.js - Enhanced Performance optimization utilities

// Lazy load components with error boundaries and loading states
export const lazyLoad = (importFunc, fallback = null) => {
  const LazyComponent = React.lazy(importFunc);
  
  return (props) => (
    <React.Suspense fallback={fallback || <div className="animate-pulse bg-gray-800 rounded-none h-32" />}>
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

// Virtual scrolling implementation using react-window style approach
export class VirtualScroller {
  constructor(container, itemHeight, renderItem, bufferSize = 5) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.renderItem = renderItem;
    this.bufferSize = bufferSize;
    this.scrollTop = 0;
    this.containerHeight = 0;
    this.items = [];
    this.animationFrameId = null;
    
    this.init();
  }
  
  init() {
    // Use passive event listener for better scroll performance
    this.container.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    this.updateContainerHeight();
    window.addEventListener('resize', this.updateContainerHeight.bind(this), { passive: true });
  }
  
  updateContainerHeight() {
    this.containerHeight = this.container.clientHeight;
    this.render();
  }
  
  handleScroll() {
    // Cancel any pending animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Use requestAnimationFrame for smooth rendering
    this.animationFrameId = requestAnimationFrame(() => {
      this.scrollTop = this.container.scrollTop;
      this.render();
    });
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
    itemsContainer.style.willChange = 'transform'; // GPU acceleration hint
    
    visibleItems.forEach((item, index) => {
      const element = this.renderItem(item, startIndex + index);
      itemsContainer.appendChild(element);
    });
    
    wrapper.appendChild(itemsContainer);
    this.container.appendChild(wrapper);
  }
  
  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
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

// React.memo optimization helpers
export const areEqual = (prevProps, nextProps) => {
  // Deep comparison for simple objects
  if (typeof prevProps !== 'object' || typeof nextProps !== 'object') {
    return prevProps === nextProps;
  }
  
  const keys = Object.keys(prevProps);
  if (keys.length !== Object.keys(nextProps).length) {
    return false;
  }
  
  return keys.every(key => prevProps[key] === nextProps[key]);
};

// Memoized component wrapper
export const memoizeComponent = (Component, customAreEqual) => {
  return memo(Component, customAreEqual || areEqual);
};

// Web Worker for heavy computations
export const createWorker = (workerFunction) => {
  const workerCode = `
    self.onmessage = function(e) {
      const result = (${workerFunction.toString()})(e.data);
      self.postMessage(result);
    }
  `;
  
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

// RAF-based animation scheduler for smooth 60fps
export const createAnimationScheduler = () => {
  let rafId = null;
  const tasks = new Set();
  
  const schedule = () => {
    if (rafId) return;
    
    rafId = requestAnimationFrame((timestamp) => {
      rafId = null;
      tasks.forEach(task => task(timestamp));
      if (tasks.size > 0) {
        schedule();
      }
    });
  };
  
  return {
    add: (task) => {
      tasks.add(task);
      schedule();
    },
    remove: (task) => {
      tasks.delete(task);
    },
    clear: () => {
      tasks.clear();
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }
  };
};

// Bundle size analyzer helper
export const analyzeBundleSize = () => {
  if (typeof window !== 'undefined' && window.performance) {
    const navigation = window.performance.getEntriesByType('navigation')[0];
    if (navigation) {
      return {
        transferSize: navigation.transferSize,
        encodedBodySize: navigation.encodedBodySize,
        decodedBodySize: navigation.decodedBodySize,
        loadTime: navigation.loadEventEnd - navigation.startTime
      };
    }
  }
  return null;
};

// Code splitting with prefetch
export const prefetchComponent = (importFunc) => {
  const prefetch = () => {
    importFunc();
  };
  
  // Prefetch on idle time
  if ('requestIdleCallback' in window) {
    requestIdleCallback(prefetch, { timeout: 2000 });
  } else {
    setTimeout(prefetch, 2000);
  }
};

// GPU-accelerated animations helper
export const enableGPUAcceleration = (element) => {
  if (element && element.style) {
    element.style.willChange = 'transform, opacity';
    element.style.transform = 'translateZ(0)'; // Force GPU layer
  }
};

// Remove GPU acceleration to free memory
export const disableGPUAcceleration = (element) => {
  if (element && element.style) {
    element.style.willChange = 'auto';
    element.style.transform = '';
  }
};

// Memory leak detector
export const createMemoryLeakDetector = (threshold = 50 * 1024 * 1024) => {
  let baselineMemory = 0;
  
  return {
    start: () => {
      if (window.performance && window.performance.memory) {
        baselineMemory = window.performance.memory.usedJSHeapSize;
      }
    },
    check: () => {
      if (window.performance && window.performance.memory) {
        const currentMemory = window.performance.memory.usedJSHeapSize;
        const memoryGrowth = currentMemory - baselineMemory;
        
        if (memoryGrowth > threshold) {
          console.warn(`[Memory Leak] Potential leak detected: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB growth`);
          return true;
        }
      }
      return false;
    }
  };
};

// React hooks for performance optimization
export const useMemoizedCallback = (callback, deps) => {
  return useCallback(callback, deps);
};

export const useMemoizedValue = (factory, deps) => {
  return useMemo(factory, deps);
};

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

export default {
  lazyLoad,
  debounce,
  throttle,
  createIntersectionObserver,
  VirtualScroller,
  createLazyImageLoader,
  cleanupTimers,
  PerformanceMonitor,
  performanceMonitor,
  areEqual,
  memoizeComponent,
  createWorker,
  createAnimationScheduler,
  analyzeBundleSize,
  prefetchComponent,
  enableGPUAcceleration,
  disableGPUAcceleration,
  createMemoryLeakDetector,
  useMemoizedCallback,
  useMemoizedValue
};
