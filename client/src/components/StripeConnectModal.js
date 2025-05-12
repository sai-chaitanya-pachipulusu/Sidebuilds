import React, { useState, useEffect, useCallback } from 'react';
import { createStripeAccountLink } from '../services/api'; // Import the new API function
import './StripeConnectModal.css';

const StripeConnectModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [connectUrl, setConnectUrl] = useState('');

    const getConnectUrl = useCallback(async () => {
        if (!isOpen) return; // Don't fetch if modal is not open

        setLoading(true);
        setError('');
        try {
            // Use the new API function
            const data = await createStripeAccountLink('account_onboarding');
            if (data.url) {
                setConnectUrl(data.url);
            } else {
                throw new Error('No URL returned from Stripe account link creation.');
            }
        } catch (err) {
            console.error('Failed to create Stripe Connect account link:', err);
            setError(err.message || 'Failed to create Stripe Connect link. Please try again later.');
        } finally {
            setLoading(false);
        }
    }, [isOpen]);

    useEffect(() => {
        getConnectUrl();
    }, [getConnectUrl]); // Rerun when isOpen changes (via getConnectUrl dependency)

    if (!isOpen) return null;

    return (
        <div className="stripe-connect-modal-overlay">
            <div className="stripe-connect-modal">
                <div className="stripe-connect-modal-header">
                    <h2>Connect Stripe to Sell Projects</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                
                <div className="stripe-connect-modal-content">
                    <div className="stripe-connect-info">
                        <div className="info-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6772e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                        </div>
                        
                        <div className="info-text">
                            <p>To list projects for sale, you need to connect your Stripe account. This allows us to:</p>
                            <ul>
                                <li>Securely process payments for your projects</li>
                                <li>Automatically transfer funds to your bank account</li>
                                <li>Manage marketplace transactions efficiently</li>
                            </ul>
                            <p>Your Stripe account information is secure and never stored on our servers.</p>
                        </div>
                    </div>
                    
                    {error && <div className="error-message">{error}</div>}
                    
                    <div className="stripe-connect-actions">
                        {loading ? (
                            <div className="loading-spinner">Loading...</div>
                        ) : (
                            <>
                                <a 
                                    href={connectUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="connect-button"
                                    onClick={() => {
                                        window.open(connectUrl, '_blank', 'width=1000,height=800');
                                        // Success will be handled when user returns to the app
                                        if (onSuccess) setTimeout(onSuccess, 1000);
                                    }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M13 17l5-5-5-5M6 17l5-5-5-5"></path>
                                    </svg>
                                    Connect with Stripe
                                </a>
                                <button className="cancel-button" onClick={onClose}>
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StripeConnectModal; 