import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import SellerCertificate from '../components/SellerCertificate';
import './VerifyPage.css';

const VerifyPage = () => {
  const { verificationCode } = useParams();
  const navigate = useNavigate();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [manualCode, setManualCode] = useState('');
  
  const verifyCertificate = async (code) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiClient.get(`/certificates/verify/${code}`);
      if (response.data.verified) {
        setCertificate(response.data.certificate);
      } else {
        setError('Certificate could not be verified');
      }
    } catch (err) {
      console.error('Verification failed:', err);
      setError(err.response?.data?.error || 'Certificate verification failed');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (verificationCode) {
      verifyCertificate(verificationCode);
    } else {
      setLoading(false);
    }
  }, [verificationCode]);
  
  const handleManualVerify = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      navigate(`/verify/${manualCode.trim()}`);
    }
  };
  
  return (
    <div className="verify-page">
      <div className="verify-container">
        <div className="verify-header">
          <h1>Certificate Verification</h1>
          <p>Verify the authenticity of a SideBuilds seller certificate</p>
        </div>
        
        {!verificationCode && (
          <div className="verify-form-container">
            <form onSubmit={handleManualVerify} className="verify-form">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter verification code"
                className="verify-input"
              />
              <button type="submit" className="verify-button">
                Verify Certificate
              </button>
            </form>
          </div>
        )}
        
        {loading && verificationCode && (
          <div className="verify-loading">
            Verifying certificate...
          </div>
        )}
        
        {error && (
          <div className="verify-error">
            <h3>Verification Failed</h3>
            <p>{error}</p>
            <button 
              onClick={() => {
                setError('');
                setManualCode('');
                navigate('/verify');
              }} 
              className="try-again-button"
            >
              Try Again
            </button>
          </div>
        )}
        
        {certificate && (
          <div className="verification-result">
            <div className="verification-success">
              <h3>Certificate Verified</h3>
              <p>This certificate is authentic and was issued by SideBuilds.</p>
            </div>
            
            <SellerCertificate certificate={certificate} isPrintable={true} />
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyPage; 