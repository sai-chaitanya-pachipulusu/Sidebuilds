import React, { useState } from 'react';
import { createStripeAccountLink } from '../services/api';
import './StripeConnectModal.css';

function StripeConnectModal({ isOpen, onClose, onSuccess, accountType = 'account_onboarding' }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleConnectStripe = async () => {
        setIsLoading(true);
        setError('');
        setSuccess(false);
        try {
            // Add a small delay to ensure API connection is established
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('Initiating Stripe Connect with type:', accountType);
            const { url } = await createStripeAccountLink(accountType);
            
            if (!url) {
                throw new Error('No URL returned from Stripe. Please try again.');
            }
            
            console.log('Stripe link created successfully, redirecting to:', url);
            
            // Show success message before redirecting
            setSuccess(true);
            
            // Redirect after a short delay to allow the user to see the success message
            setTimeout(() => {
                window.location.href = url;
            }, 1500);
            
        } catch (err) {
            console.error("Stripe Connect error:", err);
            
            // Handle known error types with user-friendly messages
            if (err.message?.includes('Failed to fetch')) {
                setError('Network error: Unable to connect to our payment service. Please check your internet connection and try again.');
            } else if (err.message?.includes('timeout')) {
                setError('Connection timeout: Our payment service is taking longer than expected to respond. Please try again.');
            } else if (err.type === 'StripeInvalidRequestError') {
                setError('Stripe API error: ' + (err.message || 'Please try again or contact support.'));
            } else {
                setError(err.message || 'Failed to connect to Stripe. Please try again.');
            }
            setSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Add retry logic
    const handleRetry = () => {
        console.log('Retrying Stripe Connect...');
        handleConnectStripe();
    };

    if (!isOpen) return null;

    return (
        <div className="stripe-connect-modal-overlay">
            <div className="stripe-connect-modal">
                <div className="stripe-connect-modal-header">
                    <h2>Connect with Stripe</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                
                <div className="stripe-connect-modal-content">
                    {error && (
                        <div className="error-message">
                            <p>{error}</p>
                            <button 
                                onClick={handleRetry}
                                className="error-retry-button"
                            >
                                Retry Connection
                            </button>
                        </div>
                    )}
                    
                    <div className="stripe-branding">
                        <div className="stripe-logo">
                            <svg width="60" height="25" viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M59.64 14.28C59.64 10.14 57.35 7.04 53.55 7.04C49.73 7.04 47.2 10.14 47.2 14.24C47.2 19.1 50.13 21.5 53.89 21.5C55.95 21.5 57.5 20.92 58.65 20.02V16.85C57.5 17.61 56.07 18.03 54.38 18.03C52.64 18.03 51.16 17.4 50.9 15.74H59.58C59.58 15.5 59.64 14.68 59.64 14.28ZM50.84 12.7C50.84 10.99 51.97 10.14 53.52 10.14C55.03 10.14 56.08 10.99 56.08 12.7H50.84Z" fill="white"/>
                                <path d="M41.33 7.04C39.55 7.04 38.34 7.86 37.64 8.46L37.4 7.34H33.97V24.9L37.67 24.2V20.92C38.38 21.4 39.38 21.5 40.3 21.5C43.59 21.5 46.37 19.1 46.37 14.12C46.33 9.98 43.55 7.04 41.33 7.04ZM40.25 18.03C39.41 18.03 38.84 17.82 38.38 17.42V11.06C38.92 10.58 39.52 10.36 40.25 10.36C42.02 10.36 42.99 11.93 42.99 14.16C42.99 16.47 42.02 18.03 40.25 18.03Z" fill="white"/>
                                <path d="M30.19 3.22L26.5 3.92V7.34H24.2V10.72H26.5V16.14C26.5 19.32 28.41 21.5 31.81 21.5C32.9 21.5 34.19 21.18 34.95 20.79V17.51C34.32 17.79 30.19 18.95 30.19 15.45V10.72H34.95V7.34H30.19V3.22Z" fill="white"/>
                                <path d="M19.66 11.93L18.93 7.34H15.5L18.05 19.21L15.85 24.24L19.12 24.9L25.16 7.34H21.73L19.66 11.93Z" fill="white"/>
                                <path d="M11.29 7.04C9.4 7.04 8.2 7.86 7.4 8.46L7.16 7.34H3.73V21.08H7.43V11.06C7.97 10.58 8.84 10.36 9.57 10.36C10.76 10.36 11.5 10.99 11.5 12.38V21.08H15.2V12.38C15.24 9.14 13.63 7.04 11.29 7.04Z" fill="white"/>
                                <path d="M0.45 11.99C0.45 11.47 0.89 11.18 1.55 11.18C2.5 11.18 3.79 11.58 4.76 12.3V8.83C3.71 8.23 2.66 7.98 1.59 7.98C0.66 8.01 0 8.27 0 8.83V14.24C0 16.35 1.73 16.35 2.27 16.35C2.37 16.35 2.45 16.37 2.53 16.39C3.41 16.57 3.91 17.2 3.91 17.88C3.91 18.63 3.34 19.1 2.4 19.1C1.31 19.1 0.01 18.44 0.01 18.44V21.92C1.16 22.47 2.27 22.7 3.38 22.7C5.86 22.7 7.6 21.22 7.6 17.82C7.6 14.62 5.52 14.2 4.38 13.95C3.38 13.71 3.49 13.13 3.49 12.84C3.49 12.06 3.82 11.99 4.24 11.99C5.08 11.99 6.05 12.41 6.83 12.84V9.77C5.97 9.14 4.83 8.83 3.9 8.83C1.62 8.83 0.45 10.27 0.45 11.99Z" fill="white"/>
                            </svg>
                        </div>
                        <p className="stripe-tagline">Secure payments infrastructure for the internet</p>
                    </div>
                    
                    <div className="connect-description">
                        <p>To receive payments when you sell projects, you need to connect your Stripe account.</p>
                        <p>This secure connection allows SideBuilds to:</p>
                    </div>
                    
                    <div className="connect-benefits">
                        <div className="benefit-item">
                            <div className="benefit-icon">
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </div>
                            <div className="benefit-text">
                                <h4>Securely Process Payments</h4>
                                <p>Safely handle credit card and bank transfers with industry-leading security</p>
                            </div>
                        </div>
                        
                        <div className="benefit-item">
                            <div className="benefit-icon">
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                            </div>
                            <div className="benefit-text">
                                <h4>Fast Direct Deposits</h4>
                                <p>Receive funds directly to your bank account when your projects sell</p>
                            </div>
                        </div>
                        
                        <div className="benefit-item">
                            <div className="benefit-icon">
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                    <polyline points="10 9 9 9 8 9" />
                                </svg>
                            </div>
                            <div className="benefit-text">
                                <h4>Simplified Tax Documentation</h4>
                                <p>Automatically generate tax forms and reports for your sales</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="stripe-trust">
                        <p>Stripe is trusted by millions of businesses worldwide</p>
                    </div>
                    
                    {success && (
                        <div className="success-message">
                            <p>Success! You'll be redirected to Stripe to complete your account setup...</p>
                        </div>
                    )}
                    
                    <div className="stripe-connect-actions">
                        <button 
                            onClick={handleConnectStripe} 
                            disabled={isLoading || success} 
                            className="stripe-connect-button"
                        >
                            {isLoading ? (
                                <span className="loading-indicator">
                                    <span className="loading-dot"></span>
                                    <span className="loading-dot"></span>
                                    <span className="loading-dot"></span>
                                </span>
                            ) : success ? (
                                <>
                                    Redirecting to Stripe
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </>
                            ) : (
                                <>
                                    Connect with Stripe
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                        <polyline points="12 5 19 12 12 19" />
                                    </svg>
                                </>
                            )}
                        </button>
                        <button onClick={onClose} className="cancel-button" disabled={isLoading || success}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StripeConnectModal; 