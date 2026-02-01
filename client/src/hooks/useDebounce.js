import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Enhanced useDebounce hook with multiple optimization strategies
 * 
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @param {Object} options - Configuration options
 * @param {boolean} options.immediate - Execute on leading edge
 * @param {number} options.maxWait - Maximum time to wait before executing
 * @param {Function} options.onFlush - Callback when debounced value is flushed
 * @returns {any} The debounced value
 */
export function useDebounce(value, delay, options = {}) {
  const { immediate = false, maxWait = null, onFlush = null } = options;
  
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef(null);
  const maxWaitTimeoutRef = useRef(null);
  const lastCallTimeRef = useRef(Date.now());
  const lastValueRef = useRef(value);

  // Clear all timeouts
  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxWaitTimeoutRef.current) {
      clearTimeout(maxWaitTimeoutRef.current);
      maxWaitTimeoutRef.current = null;
    }
  }, []);

  // Flush the debounced value immediately
  const flush = useCallback(() => {
    clearTimeouts();
    if (lastValueRef.current !== debouncedValue) {
      setDebouncedValue(lastValueRef.current);
      if (onFlush) {
        onFlush(lastValueRef.current);
      }
    }
  }, [clearTimeouts, debouncedValue, onFlush]);

  // Cancel pending debounce
  const cancel = useCallback(() => {
    clearTimeouts();
  }, [clearTimeouts]);

  useEffect(() => {
    lastValueRef.current = value;
    const now = Date.now();
    const isFirstCall = !timeoutRef.current && !maxWaitTimeoutRef.current;
    
    // Handle immediate execution on leading edge
    if (immediate && isFirstCall) {
      setDebouncedValue(value);
      lastCallTimeRef.current = now;
      if (onFlush) {
        onFlush(value);
      }
      return;
    }

    // Clear existing timeout
    clearTimeouts();

    // Set up max wait timeout if specified
    if (maxWait && !maxWaitTimeoutRef.current) {
      const timeSinceLastCall = now - lastCallTimeRef.current;
      const timeToWait = Math.max(0, maxWait - timeSinceLastCall);
      
      maxWaitTimeoutRef.current = setTimeout(() => {
        flush();
        maxWaitTimeoutRef.current = null;
      }, timeToWait);
    }

    // Set up the main debounce timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
      lastCallTimeRef.current = Date.now();
      timeoutRef.current = null;
      
      if (maxWaitTimeoutRef.current) {
        clearTimeout(maxWaitTimeoutRef.current);
        maxWaitTimeoutRef.current = null;
      }
      
      if (onFlush) {
        onFlush(value);
      }
    }, delay);

    return clearTimeouts;
  }, [value, delay, immediate, maxWait, clearTimeouts, flush, onFlush]);

  // Cleanup on unmount
  useEffect(() => {
    return clearTimeouts;
  }, [clearTimeouts]);

  return debouncedValue;
}

/**
 * useDebouncedCallback hook - Debounces a callback function
 * 
 * @param {Function} callback - The callback to debounce
 * @param {number} delay - Delay in milliseconds
 * @param {Object} options - Configuration options
 * @returns {Function} The debounced callback with flush and cancel methods
 */
export function useDebouncedCallback(callback, delay, options = {}) {
  const { immediate = false, maxWait = null } = options;
  
  const timeoutRef = useRef(null);
  const maxWaitTimeoutRef = useRef(null);
  const lastCallTimeRef = useRef(Date.now());
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxWaitTimeoutRef.current) {
      clearTimeout(maxWaitTimeoutRef.current);
      maxWaitTimeoutRef.current = null;
    }
  }, []);

  const debouncedCallback = useCallback((...args) => {
    const now = Date.now();
    const isFirstCall = !timeoutRef.current && !maxWaitTimeoutRef.current;

    // Handle immediate execution on leading edge
    if (immediate && isFirstCall) {
      callbackRef.current(...args);
      lastCallTimeRef.current = now;
      return;
    }

    // Clear existing timeouts
    clearTimeouts();

    // Set up max wait timeout if specified
    if (maxWait && !maxWaitTimeoutRef.current) {
      const timeSinceLastCall = now - lastCallTimeRef.current;
      const timeToWait = Math.max(0, maxWait - timeSinceLastCall);
      
      maxWaitTimeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        maxWaitTimeoutRef.current = null;
        timeoutRef.current = null;
        lastCallTimeRef.current = Date.now();
      }, timeToWait);
    }

    // Set up the main debounce timeout
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
      timeoutRef.current = null;
      
      if (maxWaitTimeoutRef.current) {
        clearTimeout(maxWaitTimeoutRef.current);
        maxWaitTimeoutRef.current = null;
      }
      
      lastCallTimeRef.current = Date.now();
    }, delay);
  }, [delay, immediate, maxWait, clearTimeouts]);

  // Flush the callback immediately
  debouncedCallback.flush = useCallback((...args) => {
    clearTimeouts();
    callbackRef.current(...args);
  }, [clearTimeouts]);

  // Cancel pending callback
  debouncedCallback.cancel = clearTimeouts;

  // Check if there's a pending call
  debouncedCallback.pending = () => timeoutRef.current !== null;

  // Cleanup on unmount
  useEffect(() => {
    return clearTimeouts;
  }, [clearTimeouts]);

  return debouncedCallback;
}

/**
 * useThrottledCallback hook - Throttles a callback function
 * 
 * @param {Function} callback - The callback to throttle
 * @param {number} limit - Throttle limit in milliseconds
 * @param {Object} options - Configuration options
 * @param {boolean} options.leading - Execute on leading edge
 * @param {boolean} options.trailing - Execute on trailing edge
 * @returns {Function} The throttled callback
 */
export function useThrottledCallback(callback, limit, options = {}) {
  const { leading = true, trailing = true } = options;
  
  const timeoutRef = useRef(null);
  const lastCallTimeRef = useRef(0);
  const lastArgsRef = useRef(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledCallback = useCallback((...args) => {
    const now = Date.now();
    lastArgsRef.current = args;

    if (!lastCallTimeRef.current) {
      // First call
      if (leading) {
        callbackRef.current(...args);
      }
      lastCallTimeRef.current = now;
      
      if (trailing && !leading) {
        timeoutRef.current = setTimeout(() => {
          if (lastArgsRef.current) {
            callbackRef.current(...lastArgsRef.current);
            lastArgsRef.current = null;
          }
          lastCallTimeRef.current = 0;
          timeoutRef.current = null;
        }, limit);
      }
      return;
    }

    const timeSinceLastCall = now - lastCallTimeRef.current;

    if (timeSinceLastCall >= limit) {
      // Enough time has passed
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (leading) {
        callbackRef.current(...args);
      }
      lastCallTimeRef.current = now;
      
      if (trailing && !leading) {
        timeoutRef.current = setTimeout(() => {
          if (lastArgsRef.current) {
            callbackRef.current(...lastArgsRef.current);
            lastArgsRef.current = null;
          }
          lastCallTimeRef.current = 0;
          timeoutRef.current = null;
        }, limit);
      }
    } else if (trailing && !timeoutRef.current) {
      // Schedule trailing call
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...lastArgsRef.current);
        lastArgsRef.current = null;
        lastCallTimeRef.current = 0;
        timeoutRef.current = null;
      }, limit - timeSinceLastCall);
    }
  }, [limit, leading, trailing]);

  // Cancel pending call
  throttledCallback.cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    lastCallTimeRef.current = 0;
    lastArgsRef.current = null;
  }, []);

  // Flush pending call
  throttledCallback.flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      if (lastArgsRef.current) {
        callbackRef.current(...lastArgsRef.current);
        lastArgsRef.current = null;
      }
      lastCallTimeRef.current = 0;
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

/**
 * useDebounceWithStatus hook - Returns debounced value along with pending status
 * 
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Object} { value, isPending }
 */
export function useDebounceWithStatus(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setIsPending(true);
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
      setIsPending(false);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return { value: debouncedValue, isPending };
}

export default useDebounce;
