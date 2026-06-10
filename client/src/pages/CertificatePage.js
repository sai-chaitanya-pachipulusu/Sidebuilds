import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';

const CertificatePage = () => {
  const { certificateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    // Redirect if not authenticated
    if (!user) {
      navigate('/login', { state: { from: `/certificate/${certificateId}` } });
      return;
    }
    
    const fetchCertificate = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await apiClient.get(`/certificates/${certificateId}`);
        setCertificate(response.data);
        
        // Optional: Check if certificate belongs to the current user
        if (response.data && response.data.user_id !== user.id) {
          setError('You do not have permission to view this certificate');
        }
      } catch (err) {
        console.error('Failed to fetch certificate:', err);
        setError(err.response?.data?.error || 'Failed to load certificate');
      } finally {
        setLoading(false);
      }
    };
    
    if (certificateId) {
      fetchCertificate();
    }
  }, [certificateId, user, navigate]);
  
  if (loading) {
    return <div className="certificate-loading">Loading certificate...</div>;
  }
  
  if (error) {
    return (
      <div className="certificate-error">
        <h2>Error Loading Certificate</h2>
        <p>{error}</p>
        <Link to="/dashboard" className="back-link">Back to Dashboard</Link>
      </div>
    );
  }
  
  return (
    <div className="certificate-page">
      <div className="certificate-container">
        <div className="certificate-info">
          <h2>Seller Certificate</h2>
          <p>This certificate is proof that you sold a project on the Sidebuilds platform.</p>
          <p>You can print this certificate or share the verification link with others.</p>
          
          <div className="certificate-actions">
            <button className="share-button" onClick={() => {
              const verificationUrl = `${window.location.origin}/verify/${certificate.verification_code}`;
              navigator.clipboard.writeText(verificationUrl);
              alert('Verification URL copied to clipboard!');
            }}>
              Copy Verification Link
            </button>
          </div>
        </div>
        
        <div className="seller-certificate bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-purple-600">Certificate of Sale</h3>
            <p className="text-gray-500 mt-2">SideBuilds Marketplace</p>
          </div>
          <div className="border-t-2 border-purple-200 pt-6">
            <p className="text-lg mb-4">This certifies that a project was sold on the SideBuilds platform.</p>
            {certificate && (
              <div className="space-y-3">
                <p><span className="font-semibold">Certificate ID:</span> {certificate.id || certificate.certificate_id}</p>
                <p><span className="font-semibold">Project:</span> {certificate.project_name || certificate.project_title}</p>
                <p><span className="font-semibold">Sold on:</span> {new Date(certificate.created_at || certificate.issued_at).toLocaleDateString()}</p>
                {certificate.verification_code && (
                  <p><span className="font-semibold">Verification Code:</span> {certificate.verification_code}</p>
                )}
              </div>
            )}
            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-400">Verified on SideBuilds Platform</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificatePage; 
