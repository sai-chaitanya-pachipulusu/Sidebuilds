import apiClient from './api';

const MarketplaceService = {
  // Enhanced advanced search with AI-powered fuzzy matching
  advancedSearch: async (searchParams) => {
    const {
      query = '',
      filters = {},
      sort = 'relevance',
      limit = 50,
      offset = 0,
      fuzzyMatch = true
    } = searchParams;

    try {
      const { data } = await apiClient.post('/public/marketplace/search', {
        query,
        filters,
        sort,
        limit,
        offset,
        fuzzyMatch
      });
      
      return data;
    } catch (error) {
      console.error('Advanced search error:', error);
      throw new Error(error.response?.data?.message || 'Search failed');
    }
  },

  // Get smart search suggestions
  getSearchSuggestions: async (query, limit = 10) => {
    try {
      const { data } = await apiClient.get('/public/marketplace/suggestions', {
        params: { q: query, limit }
      });
      
      return data;
    } catch (error) {
      console.error('Search suggestions error:', error);
      return { suggestions: [] };
    }
  },

  // Get search analytics and marketplace insights
  getSearchAnalytics: async () => {
    try {
      const { data } = await apiClient.get('/public/marketplace/analytics');
      return data;
    } catch (error) {
      console.error('Analytics error:', error);
      return null;
    }
  },

  // Legacy search method for backwards compatibility
  searchProjects: async (filters) => {
    return await MarketplaceService.advancedSearch({
      query: filters.query || '',
      filters: filters,
      sort: filters.sortBy || 'relevance',
      fuzzyMatch: true
    });
  },

  // Get personalized recommendations
  getRecommendations: async () => {
    const { data } = await apiClient.get('/marketplace/recommendations');
    return data;
  },

  // Get trending projects with enhanced algorithm
  getTrending: async (category = 'all', timeframe = 'week') => {
    const { data } = await apiClient.get('/public/projects/trending', {
      params: { category, timeframe }
    });
    return data;
  },

  // Get featured projects
  getFeatured: async (limit = 6) => {
    const { data } = await apiClient.get('/public/projects/featured', {
      params: { limit }
    });
    return data;
  },

  // Request project valuation
  requestValuation: async (projectId) => {
    const { data } = await apiClient.post(`/marketplace/projects/${projectId}/valuation`);
    return data;
  },

  // Compare projects with enhanced metrics
  compareProjects: async (projectIds) => {
    const { data } = await apiClient.post('/marketplace/compare', { projectIds });
    return data;
  },

  // Search performance tracking
  trackSearch: async (searchData) => {
    try {
      // In a production app, you'd send this to your analytics service
      console.log('Search tracked:', searchData);
      
      // Could also store in localStorage for offline analytics
      const searches = JSON.parse(localStorage.getItem('searchAnalytics') || '[]');
      searches.push({
        ...searchData,
        timestamp: Date.now()
      });
      
      // Keep only recent searches (last 100)
      if (searches.length > 100) {
        searches.splice(0, searches.length - 100);
      }
      
      localStorage.setItem('searchAnalytics', JSON.stringify(searches));
    } catch (error) {
      console.error('Search tracking error:', error);
    }
  },

  // Get cached search analytics
  getCachedAnalytics: () => {
    try {
      const searches = JSON.parse(localStorage.getItem('searchAnalytics') || '[]');
      
      return {
        totalSearches: searches.length,
        recentSearches: searches.slice(-10),
        popularTerms: MarketplaceService.calculatePopularTerms(searches),
        averageResultsPerSearch: searches.reduce((sum, s) => sum + (s.resultCount || 0), 0) / Math.max(searches.length, 1),
        averageSearchTime: searches.reduce((sum, s) => sum + (s.searchTime || 0), 0) / Math.max(searches.length, 1)
      };
    } catch (error) {
      console.error('Analytics error:', error);
      return null;
    }
  },

  // Calculate popular search terms
  calculatePopularTerms: (searches) => {
    const termCounts = {};
    
    searches.forEach(search => {
      if (search.query && search.query.length > 0) {
        const term = search.query.toLowerCase().trim();
        termCounts[term] = (termCounts[term] || 0) + 1;
      }
    });
    
    return Object.entries(termCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([term, count]) => ({ term, count }));
  }
};

export default MarketplaceService; 