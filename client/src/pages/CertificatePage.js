import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SellerCertificate from '../components/SellerCertificate';
import apiClient from '../services/api';
import './CertificatePage.css';

const CertificatePage = () => {
  const { certificateId } = useParams();
  const { user } = useAuth();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await apiClient.get(`/certificates/${certificateId}`);
        setCertificate(response.data);
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
  }, [certificateId]);
  
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
          <p>This certificate is proof that you sold a project on the SideBuilds platform.</p>
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
        
        <SellerCertificate certificate={certificate} />
      </div>
    </div>
  );
};

export default CertificatePage; 