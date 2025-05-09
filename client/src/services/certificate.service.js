import apiClient from './api';

const CertificateService = {
  // Get a specific certificate by ID
  getCertificate: async (certificateId) => {
    try {
      const response = await apiClient.get(`/certificates/${certificateId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch certificate' };
    }
  },
  
  // Get all certificates for the current user (as a seller)
  getSellerCertificates: async (userId) => {
    try {
      const response = await apiClient.get(`/certificates/seller/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch seller certificates' };
    }
  },
  
  // Verify a certificate by verification code
  verifyCertificate: async (verificationCode) => {
    try {
      const response = await apiClient.get(`/certificates/verify/${verificationCode}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to verify certificate' };
    }
  }
};

export default CertificateService; 