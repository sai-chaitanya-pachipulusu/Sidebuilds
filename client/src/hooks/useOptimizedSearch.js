import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';

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
    caseSensitive = false
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

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

  // Build search index for faster searching
  const buildSearchIndex = useCallback((itemsToIndex) => {
    if (!enableIndexing) return;

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
      const words = searchableText.split(/\s+/);
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
    console.log(`[Search] Index built in ${indexTime.toFixed(2)}ms for ${itemsToIndex.length} items`);
  }, [searchKeys, enableIndexing, enableFuzzySearch]);

  // Get nested object value by path
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Generate cache key
  const getCacheKey = useCallback((term, currentFilters) => {
    return JSON.stringify({ term: term.toLowerCase(), filters: currentFilters });
  }, []);

  // Clean up old cache entries
  const cleanupCache = useCallback(() => {
    if (searchCache.current.size > cacheSize) {
      const entries = Array.from(searchCache.current.entries());
      const cutoff = Math.floor(cacheSize * 0.8); // Keep 80% of cache size
      
      // Sort by last access time and remove oldest entries
      entries
        .sort((a, b) => a[1].lastAccess - b[1].lastAccess)
        .slice(0, entries.length - cutoff)
        .forEach(([key]) => searchCache.current.delete(key));
    }
  }, [cacheSize]);

  // Fuzzy search scoring
  const calculateFuzzyScore = useCallback((term, text) => {
    if (!enableFuzzySearch) return term === text ? 1 : 0;

    const termLower = term.toLowerCase();
    const textLower = text.toLowerCase();

    // Exact match
    if (textLower.includes(termLower)) {
      return 1.0;
    }

    // Character-based similarity (Levenshtein-inspired)
    let matches = 0;
    let termIndex = 0;

    for (let i = 0; i < textLower.length && termIndex < termLower.length; i++) {
      if (textLower[i] === termLower[termIndex]) {
        matches++;
        termIndex++;
      }
    }

    return matches / termLower.length;
  }, [enableFuzzySearch]);

  // Fallback linear search
  const performLinearSearch = useCallback((term, itemsToSearch) => {
    const termLower = caseSensitive ? term : term.toLowerCase();
    
    return itemsToSearch.filter(item => {
      return searchKeys.some(key => {
        const value = getNestedValue(item, key);
        if (!value) return false;
        
        const stringValue = caseSensitive ? String(value) : String(value).toLowerCase();
        
        if (enableFuzzySearch) {
          const score = calculateFuzzyScore(termLower, stringValue);
          return score > 0.5; // Adjust threshold as needed
        } else {
          return stringValue.includes(termLower);
        }
      });
    });
  }, [searchKeys, caseSensitive, enableFuzzySearch, calculateFuzzyScore]);

  // Fast search using index
  const performIndexedSearch = useCallback((term, itemsToSearch) => {
    if (!enableIndexing || !searchIndex.current.size) {
      return performLinearSearch(term, itemsToSearch);
    }

    const termLower = term.toLowerCase();
    const words = termLower.split(/\s+/).filter(word => word.length > 0);
    
    if (words.length === 0) return itemsToSearch;

    // Find candidate items for each word
    const candidateSets = words.map(word => {
      const candidates = new Set();
      
      // Look for exact matches and n-grams
      for (const [ngram, indices] of searchIndex.current.entries()) {
        if (ngram.includes(word) || word.includes(ngram)) {
          indices.forEach(index => candidates.add(index));
        }
      }
      
      return candidates;
    });

    // Find intersection of all candidate sets
    let finalCandidates = candidateSets[0] || new Set();
    for (let i = 1; i < candidateSets.length; i++) {
      finalCandidates = new Set([...finalCandidates].filter(x => candidateSets[i].has(x)));
    }

    // Convert indices back to items and score them
    const results = Array.from(finalCandidates)
      .map(index => {
        const item = itemsToSearch[index];
        const searchText = searchKeys
          .map(key => getNestedValue(item, key))
          .join(' ');
        
        const score = calculateFuzzyScore(term, searchText);
        return { item, score };
      })
      .filter(result => result.score > 0.3) // Minimum relevance threshold
      .sort((a, b) => b.score - a.score)
      .map(result => result.item);

    return results;
  }, [enableIndexing, searchKeys, calculateFuzzyScore, performLinearSearch]);

  // Apply filters to items
  const applyFilters = useCallback((itemsToFilter, currentFilters) => {
    return itemsToFilter.filter(item => {
      return Object.entries(currentFilters).every(([key, value]) => {
        if (!value || value === '' || value === 'all') return true;
        
        const itemValue = getNestedValue(item, key);
        
        // Handle different filter types
        if (Array.isArray(value)) {
          return value.includes(itemValue);
        } else if (typeof value === 'object' && value.min !== undefined) {
          // Range filter
          const numValue = Number(itemValue) || 0;
          return numValue >= (value.min || 0) && numValue <= (value.max || Infinity);
        } else {
          return itemValue === value;
        }
      });
    });
  }, []);


  // Build index when items change
  useEffect(() => {
    if (items.length > 0) {
      buildSearchIndex(items);
    }
  }, [items, buildSearchIndex]);

  // Synchronous search function for immediate results
  const performSyncSearch = useCallback((term, currentFilters, itemsToSearch) => {
    const startTime = performance.now();
    const cacheKey = getCacheKey(term, currentFilters);
    
    // Check cache first
    if (searchCache.current.has(cacheKey)) {
      const cached = searchCache.current.get(cacheKey);
      cached.lastAccess = Date.now();
      
      setSearchMetrics(prev => ({ 
        ...prev, 
        cacheHits: prev.cacheHits + 1,
        searchTime: performance.now() - startTime
      }));
      
      return cached.results;
    }

    let results = [...itemsToSearch];

    // Apply search if term exists
    if (term && term.trim()) {
      if (enableIndexing && searchIndex.current.size > 0) {
        results = performIndexedSearch(term.trim(), results);
      } else {
        results = performLinearSearch(term.trim(), results);
      }
    }

    // Apply filters
    results = applyFilters(results, currentFilters);

    const searchTime = performance.now() - startTime;

    // Cache results
    searchCache.current.set(cacheKey, {
      results,
      lastAccess: Date.now(),
      searchTime
    });

    cleanupCache();

    setSearchMetrics(prev => ({
      totalItems: itemsToSearch.length,
      filteredItems: results.length,
      searchTime,
      cacheHits: prev.cacheHits,
      cacheMisses: prev.cacheMisses + 1
    }));

    return results;
  }, [
    getCacheKey, 
    performIndexedSearch, 
    performLinearSearch, 
    applyFilters, 
    cleanupCache,
    enableIndexing
  ]);
  
  // Memoized filtered results - now synchronous
  const filteredItems = useMemo(() => {
    if (items.length === 0) return [];
    
    return performSyncSearch(debouncedSearchTerm, filters, items);
  }, [items, debouncedSearchTerm, filters, performSyncSearch]);

  // Batched results for virtualization
  const [displayBatch, setDisplayBatch] = useState(0);
  const batchedResults = useMemo(() => {
    if (!enableVirtualization) return filteredItems;
    
    const endIndex = (displayBatch + 1) * batchSize;
    return filteredItems.slice(0, endIndex);
  }, [filteredItems, displayBatch, batchSize, enableVirtualization]);

  // Load more results (for virtualization)
  const loadMoreResults = useCallback(() => {
    if (enableVirtualization && (displayBatch + 1) * batchSize < filteredItems.length) {
      setDisplayBatch(prev => prev + 1);
    }
  }, [displayBatch, batchSize, filteredItems.length, enableVirtualization]);

  // Reset batch when search changes
  useEffect(() => {
    setDisplayBatch(0);
  }, [debouncedSearchTerm, filters]);

  // Update individual filter
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchTerm('');
  }, [initialFilters]);

  // Clear cache manually
  const clearCache = useCallback(() => {
    searchCache.current.clear();
    setSearchMetrics(prev => ({ ...prev, cacheHits: 0, cacheMisses: 0 }));
  }, []);

  return {
    // State
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    updateFilter,
    isSearching,
    
    // Results
    filteredItems,
    batchedResults,
    
    // Actions
    clearFilters,
    clearCache,
    loadMoreResults,
    
    // Metrics
    searchMetrics,
    hasMoreResults: enableVirtualization && batchedResults.length < filteredItems.length,
    
    // Status
    isEmpty: filteredItems.length === 0,
    isFiltered: searchTerm.length > 0 || Object.values(filters).some(v => v && v !== 'all'),
  };
};

export default useOptimizedSearch;