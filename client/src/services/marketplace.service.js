import apiClient from './api';

const MarketplaceService = {
  // Advanced search with filters
  searchProjects: async (filters) => {
    const { data } = await apiClient.post('/marketplace/search', filters);
    return data;
  },

  // Get personalized recommendations
  getRecommendations: async () => {
    const { data } = await apiClient.get('/marketplace/recommendations');
    return data;
  },

  // Get trending projects
  getTrending: async (category = 'all', timeframe = 'week') => {
    const { data } = await apiClient.get('/marketplace/trending', {
      params: { category, timeframe }
    });
    return data;
  },

  // Request project valuation
  requestValuation: async (projectId) => {
    const { data } = await apiClient.post(`/marketplace/projects/${projectId}/valuation`);
    return data;
  },

  // Compare projects
  compareProjects: async (projectIds) => {
    const { data } = await apiClient.post('/marketplace/compare', { projectIds });
    return data;
  }
};

export default MarketplaceService; 