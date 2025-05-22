import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkStripeOnboardingStatus } from '../services/api'; // To refresh status
import './StripeConnectCompletePage.css'; // We'll create this for styling

function StripeConnectCompletePage() {
    const navigate = useNavigate();
    const { user, fetchUserProfile } = useAuth(); // Assuming fetchUserProfile can update user context
    const [message, setMessage] = useState('Processing Stripe connection details...');
    const [error, setError] = useState('');

    useEffect(() => {
        const verifyAndUpdateStatus = async () => {
            if (user) {
                try {
                    setMessage('Verifying Stripe account status...');
                    const status = await checkStripeOnboardingStatus();
                    console.log('Stripe status on return:', status);
                    
                    if (status && status.isOnboardingComplete && status.arePayoutsEnabled) {
                        setMessage('Stripe account connected successfully! Redirecting to your dashboard...');
                        // Optionally refresh user profile in AuthContext if it holds Stripe status
                        if (fetchUserProfile) {
                            await fetchUserProfile(); 
                        }
                    } else if (status && status.isOnboardingComplete && !status.arePayoutsEnabled) {
                        setMessage('Stripe account details submitted. Payouts may still be pending review by Stripe. Redirecting...');
                         if (fetchUserProfile) {
                            await fetchUserProfile(); 
                        }
                    } else {
                         setMessage('Stripe onboarding may not be fully complete. Please check your profile settings or complete onboarding via Stripe. Redirecting...');
                         // Potentially set an error or a more specific message
                    }

                    setTimeout(() => {
                        navigate('/dashboard'); // Or '/profile-settings'
                    }, 4000); // Redirect after 4 seconds

                } catch (err) {
                    console.error("Failed to verify Stripe status on return:", err);
                    setError('There was an issue verifying your Stripe account status. Please check your Profile Settings.');
                    setMessage(''); // Clear processing message
                    // Don't redirect immediately on error, let user see the message
                }
            } else {
                // Should not happen if this is a protected route, but handle defensively
                setMessage('User not found. Redirecting to login...');
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            }
        };

        verifyAndUpdateStatus();
    }, [user, navigate, fetchUserProfile]);

    return (
        <div className="stripe-connect-complete-container">
            <h2>Stripe Connection Update</h2>
            {message && <p className="status-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}
            {!error && !message && <p>Loading...</p>} {/* Fallback loading message */}
            <div className="action-links">
                {error ? (
                     <Link to="/profile-settings" className="button-link">Go to Profile Settings</Link>
                ) : (
                    <p>If you are not redirected automatically, <Link to="/dashboard">click here to go to your Dashboard</Link>.</p>
                )}
                <Link to="/" className="button-link-secondary">Go Home</Link>
            </div>
        </div>
    );
}

export default StripeConnectCompletePage; 