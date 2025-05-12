import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createStripeAccountLink } from '../services/api';
import './StripeConnectModal.css';

function StripeConnectModal({ isOpen, onClose, onSuccess }) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleConnectStripe = async () => {
        setIsLoading(true);
        setError('');
        try {
            const { url } = await createStripeAccountLink();
            window.location.href = url; // Redirect user to Stripe onboarding
            // If successful, onSuccess will be handled when user returns to the app
        } catch (err) {
            setError(err.message || 'Failed to connect to Stripe. Please try again.');
            console.error("Stripe Connect error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="stripe-connect-modal-overlay">
            <div className="stripe-connect-modal">
                <h2>Connect with Stripe</h2>
                <p>To receive payments for your sold projects, you need to connect your Stripe account.</p>
                
                {error && <p className="error-message">{error}</p>}
                
                <div className="stripe-connect-info">
                    <p>SideBuilds uses Stripe to:</p>
                    <ul>
                        <li>Securely process payments</li>
                        <li>Transfer funds directly to your bank account</li>
                        <li>Handle tax documentation</li>
                    </ul>
                </div>
                
                <div className="stripe-connect-actions">
                    <button 
                        onClick={handleConnectStripe} 
                        disabled={isLoading} 
                        className="stripe-connect-button"
                    >
                        {isLoading ? 'Connecting...' : 'Connect with Stripe'}
                    </button>
                    <button onClick={onClose} className="cancel-button">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

export default StripeConnectModal; 