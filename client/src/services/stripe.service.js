import axios from 'axios';

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Stripe service functions
const StripeService = {
  // Create checkout session using purchase request ID
  createCheckoutSession: async (purchase_request_id) => {
    try {
      console.log(`Creating checkout session for purchase request ${purchase_request_id}`);
      
      const response = await axios.post(`${API_URL}/payments/create-checkout-session`, { 
        purchase_request_id
      });
      
      console.log('Checkout session created:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      
      throw error.response?.data || { error: 'Failed to create checkout session' };
    }
  },

  // Legacy method for direct project checkout (deprecated - use purchase requests)
  createDirectCheckout: async (projectId) => {
    console.warn('createDirectCheckout is deprecated. Use purchase request flow instead.');
    
    // Check if this is a seeded project
    const isSeededProject = projectId.includes('aaaaaaaa') || 
                          projectId.includes('bbbbbbbb') || 
                          projectId.includes('cccccccc') || 
                          projectId.includes('dddddddd') || 
                          projectId.includes('eeeeeeee') || 
                          projectId.includes('ffffffff') || 
                          projectId.includes('99999999') || 
                          projectId.includes('88888888') || 
                          projectId.includes('77777777');
                          
    try {
      console.log(`Creating checkout session for project ${projectId}, seeded: ${isSeededProject}`);
      
      // For seeded projects, add extra headers and config
      const config = {};
      if (isSeededProject) {
        config.headers = {
          'X-Seeded-Project': 'true'
        };
        config.timeout = 15000;
      }
      
      // First create a purchase request, then checkout
      const purchaseResponse = await axios.post(`${API_URL}/purchase-requests`, {
        project_id: projectId,
        message: 'Direct purchase request'
      });
      
      const purchase_request_id = purchaseResponse.data.id;
      
      // Now create checkout session
      const response = await axios.post(`${API_URL}/payments/create-checkout-session`, { 
        purchase_request_id
      }, config);
      
      console.log('Checkout session created:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      
      throw error.response?.data || { error: 'Failed to create checkout session' };
    }
  },

  // Get transaction status by session ID
  getTransactionStatus: async (sessionId) => {
    try {
      const response = await axios.get(`${API_URL}/payments/status/${sessionId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to get transaction status' };
    }
  },

  // Get user transactions
  getUserTransactions: async () => {
    try {
      const response = await axios.get(`${API_URL}/payments/transactions`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to get user transactions' };
    }
  },

  // Create Stripe Connect account
  createConnectAccount: async () => {
    try {
      const response = await axios.post(`${API_URL}/payments/connect/create-account`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create Connect account' };
    }
  },

  // Check Stripe Connect account status
  getConnectStatus: async () => {
    try {
      const response = await axios.get(`${API_URL}/payments/connect/status`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to get Connect account status' };
    }
  },

  // Refresh Stripe Connect onboarding link
  refreshConnectLink: async () => {
    try {
      const response = await axios.post(`${API_URL}/payments/connect/refresh-link`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to refresh Connect link' };
    }
  },

  // Get transfer status for a project
  getTransferStatus: async (projectId) => {
    try {
      const response = await axios.get(`${API_URL}/payments/transfers/${projectId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to get transfer status' };
    }
  },

  // Update transfer status
  updateTransferStatus: async (projectId, transferData) => {
    try {
      const response = await axios.post(`${API_URL}/payments/transfers/${projectId}/update`, transferData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update transfer status' };
    }
  },

  // Get saved payment methods
  getSavedPaymentMethods: async () => {
    try {
      const response = await axios.get(`${API_URL}/payments/methods`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to get payment methods' };
    }
  },

  // Save new payment method
  savePaymentMethod: async (paymentMethodId) => {
    try {
      const response = await axios.post(`${API_URL}/payments/methods`, { paymentMethodId });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to save payment method' };
    }
  },

  // Delete saved payment method
  deletePaymentMethod: async (paymentMethodId) => {
    try {
      const response = await axios.delete(`${API_URL}/payments/methods/${paymentMethodId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to delete payment method' };
    }
  },

  // Get payout preferences
  getPayoutPreferences: async () => {
    try {
      const response = await axios.get(`${API_URL}/payments/payout-preferences`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to get payout preferences' };
    }
  },

  // Update payout preferences
  updatePayoutPreferences: async (preferences) => {
    try {
      const response = await axios.put(`${API_URL}/payments/payout-preferences`, preferences);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update payout preferences' };
    }
  },

  // Get payment analytics
  getPaymentAnalytics: async () => {
    try {
      const response = await axios.get(`${API_URL}/payments/analytics`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to get payment analytics' };
    }
  },

  // File a dispute
  fileDispute: async (transactionId, disputeData) => {
    try {
      const response = await axios.post(`${API_URL}/payments/disputes`, { 
        transactionId, 
        ...disputeData 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to file dispute' };
    }
  },

  // Get disputes
  getDisputes: async () => {
    try {
      const response = await axios.get(`${API_URL}/payments/disputes`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to get disputes' };
    }
  },
};

export default StripeService; 