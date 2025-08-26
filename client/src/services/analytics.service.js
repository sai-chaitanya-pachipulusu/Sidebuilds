import apiClient from './api';

const AnalyticsService = {
  // Track project view
  trackProjectView: async (projectId, source = 'direct') => {
    try {
      await apiClient.post(`/analytics/projects/${projectId}/view`, { source });
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  },

  // Get project analytics
  getProjectAnalytics: async (projectId, dateRange = '30d') => {
    const { data } = await apiClient.get(`/analytics/projects/${projectId}`, {
      params: { range: dateRange }
    });
    return data;
  },

  // Get seller dashboard analytics
  getSellerAnalytics: async () => {
    const { data } = await apiClient.get('/analytics/seller/dashboard');
    return data;
  },

  // Track conversion funnel
  trackFunnelEvent: async (eventType, metadata) => {
    try {
      await apiClient.post('/analytics/funnel', { eventType, metadata });
    } catch (error) {
      console.error('Failed to track funnel event:', error);
    }
  }
};

export default AnalyticsService; 