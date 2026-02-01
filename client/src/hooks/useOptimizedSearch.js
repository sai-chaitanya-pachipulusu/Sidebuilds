import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDebounce, useDebouncedCallback } from './useDebounce';

// Production-ready search hook with caching, debouncing, and performance optimization
export const useOptimizedSearch = (
  items = [],
  initialFilters = {},
  options = {}
) => {
  const {
    searchKeys = ['name', 'description'],
    debounceMs = 300,
    cacheSize = 100,
    enableVirtualization = false,
    batchSize = 20,
    enableIndexing = true,
    enableFuzzySearch = false,
    caseSensitive = false,
    minSearchLength = 2,
    maxResults = null,
    sortFn = null,
    filterFn = null
  } = options;

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMetrics, setSearchMetrics] = useState({
    totalItems: 0,
    filteredItems: 0,
    searchTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  });

  // Performance optimization refs
  const searchCache = useRef(new Map());
  const searchIndex = useRef(new Map());
  const lastSearchTime = useRef(0);
  const searchWorker = useRef(null);
  const abortControllerRef = useRef(null);

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs, {
    maxWait: debounceMs * 3 // Force update after 3x debounce time
  });

  // Get nested object value by path
  const getNestedValue = useCallback((obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }, []);

  // Build search index for faster searching
  const buildSearchIndex = useCallback((itemsToIndex) => {
    if (!enableIndexing || itemsToIndex.length === 0) return;

    const startTime = performance.now();
    const index = new Map();

    itemsToIndex.forEach((item, itemIndex) => {
      const searchableText = searchKeys
        .map(key => {
          const value = getNestedValue(item, key);
          return typeof value === 'string' ? value : String(value || '');
        })
        .join(' ')
        .toLowerCase();

      // Create n-grams for better partial matching
      const words = searchableText.split(/\s+/).filter(w => w.length > 0);
      const ngrams = new Set();

      words.forEach(word => {
        // Add full word
        ngrams.add(word);
        
        // Add character-level n-grams for fuzzy matching
        if (enableFuzzySearch) {
          for (let i = 0; i < word.length - 1; i++) {
            ngrams.add(word.substring(i, i + 2));
            if (i < word.length - 2) {
              ngrams.add(word.substring(i, i + 3));
            }
          }
        }
      });

      ngrams.forEach(ngram => {
        if (!index.has(ngram)) {
          index.set(ngram, new Set());
        }
        index.get(ngram).add(itemIndex);
      });
    });

    searchIndex.current = index;
    
    const indexTime = performance.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Search] Index built in ${indexTime.toFixed(2)}ms for ${itemsToIndex.length} items`);
    }
  }, [searchKeys, enableIndexing, enableFuzzySearch, getNestedValue]);

  // Generate cache key
  const getCacheKey = useCallback((term, currentFilters) => {
    return JSON.stringify({ 
      term: term.toLowerCase().trim(), 
      filters: currentFilters,
      keys: searchKeys
    });
  }, [searchKeys]);

  // Clean up old cache entries
  const cleanupCache = useCallback(() => {
    if (searchCache.current.size > cacheSize) {
      const entriesToDelete = searchCache.current.size - cacheSize;
      const keys = Array.from(searchCache.current.keys());
      for (let i = 0; i < entriesToDelete; i++) {
        searchCache.current.delete(keys[i]);
      }
    }
  }, [cacheSize]);

  // Fuzzy match score calculation
  const calculateFuzzyScore = useCallback((term, text) => {
    if (!term || !text) return 0;
    
    const searchTerm = term.toLowerCase();
    const searchText = text.toLowerCase();
    
    // Exact match gets highest score
    if (searchText === searchTerm) return 100;
    
    // Starts with search term
    if (searchText.startsWith(searchTerm)) return 80;
    
    // Contains search term
    if (searchText.includes(searchTerm)) return 60;
    
    // Calculate Levenshtein distance for fuzzy matching
    if (enableFuzzySearch) {
      const distance = levenshteinDistance(searchTerm, searchText);
      const maxLength = Math.max(searchTerm.length, searchText.length);
      const similarity = 1 - (distance / maxLength);
      return similarity * 40; // Max 40 for fuzzy matches
    }
    
    return 0;
  }, [enableFuzzySearch]);

  // Levenshtein distance for fuzzy matching
  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  // Perform search using index
  const performSearch = useCallback((term, currentFilters) => {
    const startTime = performance.now();
    
    // Check cache first
    const cacheKey = getCacheKey(term, currentFilters);
    const cached = searchCache.current.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 30000) { // 30 second cache
      setSearchMetrics(prev => ({
        ...prev,
        cacheHits: prev.cacheHits + 1,
        searchTime: performance.now() - startTime
      }));
      return cached.results;
    }

    setSearchMetrics(prev => ({
      ...prev,
      cacheMisses: prev.cacheMisses + 1
    }));

    let results = [...items];

    // Apply text search
    if (term && term.length >= minSearchLength) {
      const searchTerm = caseSensitive ? term : term.toLowerCase();
      
      if (enableIndexing && searchIndex.current.size > 0) {
        // Use index for faster search
        const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 0);
        const matchedIndices = new Set();
        
        searchWords.forEach(word => {
          const indices = searchIndex.current.get(word);
          if (indices) {
            indices.forEach(idx => matchedIndices.add(idx));
          }
        });
        
        results = Array.from(matchedIndices).map(idx => items[idx]);
        
        // Score and sort by relevance if fuzzy search enabled
        if (enableFuzzySearch) {
          results = results.map(item => {
            const searchableText = searchKeys
              .map(key => {
                const value = getNestedValue(item, key);
                return typeof value === 'string' ? value : String(value || '');
              })
              .join(' ');
            
            return {
              item,
              score: calculateFuzzyScore(searchTerm, searchableText)
            };
          })
          .filter(r => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .map(r => r.item);
        }
      } else {
        // Fallback to linear search
        results = results.filter(item => {
          return searchKeys.some(key => {
            const value = getNestedValue(item, key);
            const text = typeof value === 'string' ? value : String(value || '');
            const compareText = caseSensitive ? text : text.toLowerCase();
            return compareText.includes(searchTerm);
          });
        });
      }
    }

    // Apply filters
    if (currentFilters && Object.keys(currentFilters).length > 0) {
      results = results.filter(item => {
        return Object.entries(currentFilters).every(([key, filterValue]) => {
          if (filterValue === null || filterValue === undefined || filterValue === '') {
            return true;
          }
          
          const itemValue = getNestedValue(item, key);
          
          // Handle different filter types
          if (Array.isArray(filterValue)) {
            return filterValue.includes(itemValue);
          }
          
          if (typeof filterValue === 'object') {
            // Range filters
            if (filterValue.min !== undefined && itemValue < filterValue.min) return false;
            if (filterValue.max !== undefined && itemValue > filterValue.max) return false;
            return true;
          }
          
          return String(itemValue).toLowerCase() === String(filterValue).toLowerCase();
        });
      });
    }

    // Apply custom filter function
    if (filterFn) {
      results = results.filter(filterFn);
    }

    // Apply custom sort
    if (sortFn) {
      results.sort(sortFn);
    }

    // Limit results
    if (maxResults && results.length > maxResults) {
      results = results.slice(0, maxResults);
    }

    // Cache results
    searchCache.current.set(cacheKey, {
      results,
      timestamp: Date.now()
    });
    cleanupCache();

    const searchTime = performance.now() - startTime;
    setSearchMetrics(prev => ({
      ...prev,
      searchTime,
      filteredItems: results.length,
      totalItems: items.length
    }));

    return results;
  }, [
    items, 
    searchKeys, 
    caseSensitive, 
    minSearchLength, 
    enableIndexing, 
    enableFuzzySearch,
    maxResults,
    sortFn,
    filterFn,
    getCacheKey,
    cleanupCache,
    getNestedValue,
    calculateFuzzyScore
  ]);

  // Build index when items change
  useEffect(() => {
    if (enableIndexing) {
      buildSearchIndex(items);
    }
  }, [items, enableIndexing, buildSearchIndex]);

  // Perform search when debounced term or filters change
  useEffect(() => {
    // Cancel previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsSearching(true);
    
    // Use requestAnimationFrame for non-blocking search
    requestAnimationFrame(() => {
      performSearch(debouncedSearchTerm, filters);
      setIsSearching(false);
    });

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedSearchTerm, filters, performSearch]);

  // Memoized filtered results
  const filteredItems = useMemo(() => {
    return performSearch(debouncedSearchTerm, filters);
  }, [debouncedSearchTerm, filters, performSearch]);

  // Virtualization helpers
  const getVirtualizedItems = useCallback((scrollTop, containerHeight) => {
    if (!enableVirtualization) return filteredItems;
    
    const startIndex = Math.floor(scrollTop / batchSize);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / batchSize) + 1,
      filteredItems.length
    );
    
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, enableVirtualization, batchSize]);

  // Update search term
  const updateSearchTerm = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchTerm('');
  }, [initialFilters]);

  // Clear cache
  const clearCache = useCallback(() => {
    searchCache.current.clear();
  }, []);

  return {
    // State
    searchTerm,
    debouncedSearchTerm,
    filters,
    isSearching,
    
    // Results
    filteredItems,
    
    // Metrics
    searchMetrics,
    
    // Actions
    setSearchTerm: updateSearchTerm,
    setFilters: updateFilters,
    clearFilters,
    clearCache,
    getVirtualizedItems,
    
    // Refs for advanced usage
    searchIndex: searchIndex.current,
    searchCache: searchCache.current
  };
};

/**
 * useServerSearch hook - For server-side search with debouncing
 * 
 * @param {Function} searchFn - Async function that performs the search
 * @param {Object} options - Configuration options
 */
export const useServerSearch = (searchFn, options = {}) => {
  const {
    debounceMs = 300,
    minSearchLength = 2,
    initialQuery = ''
  } = options;

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const abortControllerRef = useRef(null);

  const debouncedSearch = useDebouncedCallback(
    async (searchQuery) => {
      if (searchQuery.length < minSearchLength) {
        setResults([]);
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        const data = await searchFn(searchQuery, abortControllerRef.current.signal);
        setResults(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    },
    debounceMs,
    { maxWait: debounceMs * 2 }
  );

  useEffect(() => {
    debouncedSearch(query);
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, debouncedSearch]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    refresh: () => debouncedSearch(query)
  };
};

export default useOptimizedSearch;
