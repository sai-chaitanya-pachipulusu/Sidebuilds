import React, { useState, useEffect, useCallback } from 'react';
import { getUserProfile, updateUserProfile, createStripeAccountLink, checkStripeOnboardingStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import './ProfileSettingsPage.css';
import StripeConnectModal from '../components/StripeConnectModal'; // Assuming you have this or will create it

function ProfileSettingsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    bio: '',
    location: '',
    phone_number: '',
    portfolio_link: '',
    linkedin_profile_url: '',
    github_profile_url: '',
    twitter_profile_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [stripeStatus, setStripeStatus] = useState(null);
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState('');
  const [showStripeModal, setShowStripeModal] = useState(false);

  // Utility function to create a direct Stripe link as a fallback mechanism
  // This provides an alternative way to connect with Stripe if the modal approach fails
  // It's used by the "Direct Stripe Link" button in the error handling UI
  const getStripeLink = async (type = 'account_onboarding') => {
    try {
      const { url } = await createStripeAccountLink(type);
      return url;
    } catch (err) {
      console.error("Error creating Stripe link:", err);
      throw err;
    }
  };

  const fetchProfileAndStripeStatus = useCallback(async () => {
    setLoading(true);
    setIsStripeLoading(true);
    setError('');
    setStripeError('');
    setSuccess('');

    try {
      const profileData = await getUserProfile();
      setProfile({
        username: profileData.username || '',
        email: profileData.email || '',
        bio: profileData.bio || '',
        location: profileData.location || '',
        phone_number: profileData.phone_number || '',
        portfolio_link: profileData.portfolio_link || '',
        linkedin_profile_url: profileData.linkedin_profile_url || '',
        github_profile_url: profileData.github_profile_url || '',
        twitter_profile_url: profileData.twitter_profile_url || ''
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch profile.');
      console.error("Fetch profile error:", err);
    }

    try {
      const stripeData = await checkStripeOnboardingStatus(); // Use the new endpoint
      setStripeStatus(stripeData);
    } catch (err) {
      setStripeError(err.message || 'Failed to fetch Stripe status.');
      console.error("Fetch Stripe status error:", err);
    } finally {
      setLoading(false);
      setIsStripeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfileAndStripeStatus();
    }
  }, [user, fetchProfileAndStripeStatus]);

  // Handle URL parameters when returning from Stripe
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const stripeReturn = query.get('stripe_return');
    const stripeRefresh = query.get('stripe_refresh');
    
    if (stripeReturn === 'true') {
      // User has returned from successful Stripe onboarding
      console.log('User returned from Stripe onboarding');
      setSuccess('Stripe account connection successful! Refreshing your status...');
      fetchProfileAndStripeStatus();
      // Clear the URL parameters
      navigate('/profile-settings', { replace: true });
    } else if (stripeRefresh === 'true') {
      // User needs to retry Stripe onboarding
      console.log('User needs to refresh Stripe onboarding');
      setStripeError('Stripe onboarding session expired. Please try connecting again.');
      setShowStripeModal(true);
      // Clear the URL parameters
      navigate('/profile-settings', { replace: true });
    }
  }, [location, navigate, fetchProfileAndStripeStatus]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'email') return;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { email, ...dataToSubmit } = profile;
      const updatedProfile = await updateUserProfile(dataToSubmit);
      setProfile({
        username: updatedProfile.username || '',
        email: updatedProfile.email || '',
        bio: updatedProfile.bio || '',
        location: updatedProfile.location || '',
        phone_number: updatedProfile.phone_number || '',
        portfolio_link: updatedProfile.portfolio_link || '',
        linkedin_profile_url: updatedProfile.linkedin_profile_url || '',
        github_profile_url: updatedProfile.github_profile_url || '',
        twitter_profile_url: updatedProfile.twitter_profile_url || ''
      });
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
      console.error("Update profile error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile.username && !stripeStatus) { // Show loading only on initial load
    return <div className="profile-settings-page"><p>Loading profile and payment settings...</p></div>;
  }

  return (
    <div className="profile-settings-page">
      <h2>Profile & Payment Settings</h2>
      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}
      
      <div className="stripe-connect-section">
        <h3>Stripe Account for Payouts</h3>
        {stripeError && (
          <div className="error-message">
            <p>{stripeError}</p>
            <div className="debug-actions">
              <button 
                onClick={fetchProfileAndStripeStatus} 
                className="retry-button"
                disabled={isStripeLoading}
              >
                {isStripeLoading ? 'Retrying...' : 'Retry'}
              </button>
              <button 
                onClick={async () => {
                  try {
                    setIsStripeLoading(true);
                    // Try to get a direct Stripe link as a fallback method
                    const url = await getStripeLink();
                    if (url) {
                      window.location.href = url; // Direct redirect if modal approach fails
                    }
                  } catch (err) {
                    setStripeError(`Failed direct link method: ${err.message}`);
                  } finally {
                    setIsStripeLoading(false);
                  }
                }}
                className="direct-link-button"
                disabled={isStripeLoading}
              >
                Direct Stripe Link
              </button>
              <button 
                onClick={() => {
                  // Try each diagnostic endpoint
                  window.open('/api/public/stripe-status', '_blank');
                  setTimeout(() => window.open('/api/stripe/test-status', '_blank'), 500);
                }}
                className="test-api-button"
              >
                Test Stripe API
              </button>
            </div>
          </div>
        )}
        {isStripeLoading && <p>Loading Stripe status...</p>}
        {!isStripeLoading && stripeStatus && (
          <div>
            {stripeStatus.accountId && stripeStatus.isOnboardingComplete ? (
              <>
                <p className="success-message">Your Stripe account is connected and ready for payouts.</p>
                <p>Stripe Account ID: {stripeStatus.accountId}</p>
                {stripeStatus.needsAttention && <p className="warning-message">Your Stripe account requires attention. Please update your details.</p>}
                <button 
                  onClick={() => {
                    setShowStripeModal(true);
                  }} 
                  className="stripe-button"
                >
                  Manage Stripe Account
                </button>
              </>
            ) : stripeStatus.accountId && !stripeStatus.isOnboardingComplete ? (
              <>
                <p className="warning-message">Your Stripe onboarding is incomplete. Please complete the setup to receive payouts.</p>
                <button onClick={() => setShowStripeModal(true)} className="stripe-button">
                  Complete Stripe Onboarding
                </button>
              </>
            ) : (
              <>
                <p>Connect your Stripe account to receive payouts for your sold projects.</p>
                <button onClick={() => setShowStripeModal(true)} className="stripe-button">
                  Connect with Stripe
                </button>
              </>
            )}
          </div>
        )}
        {!isStripeLoading && !stripeStatus && !stripeError && (
            <p>Could not load Stripe status. Please refresh.</p>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <h3>User Information</h3>
        <div>
          <label htmlFor="username">Username</label>
          <input type="text" id="username" name="username" value={profile.username} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="email">Email (Read-only)</label>
          <input type="email" id="email" name="email" value={profile.email} onChange={handleChange} readOnly />
        </div>
        <div>
          <label htmlFor="bio">Bio</label>
          <textarea id="bio" name="bio" value={profile.bio} onChange={handleChange} rows="4" />
        </div>
        <div>
          <label htmlFor="location">Location</label>
          <input type="text" id="location" name="location" value={profile.location} onChange={handleChange} placeholder="City, Country" />
        </div>
        <div>
          <label htmlFor="phone_number">Phone Number</label>
          <input type="tel" id="phone_number" name="phone_number" value={profile.phone_number} onChange={handleChange} placeholder="+1 123-456-7890" />
        </div>
        <div>
          <label htmlFor="portfolio_link">Portfolio Link</label>
          <input type="text" id="portfolio_link" name="portfolio_link" value={profile.portfolio_link} onChange={handleChange} placeholder="https://myportfolio.com" />
        </div>
        <div>
          <label htmlFor="linkedin_profile_url">LinkedIn Profile URL</label>
          <input type="text" id="linkedin_profile_url" name="linkedin_profile_url" value={profile.linkedin_profile_url} onChange={handleChange} placeholder="https://linkedin.com/in/yourname" />
        </div>
        <div>
          <label htmlFor="github_profile_url">GitHub Profile URL</label>
          <input type="text" id="github_profile_url" name="github_profile_url" value={profile.github_profile_url} onChange={handleChange} placeholder="https://github.com/yourusername" />
        </div>
        <div>
          <label htmlFor="twitter_profile_url">Twitter Profile URL</label>
          <input type="text" id="twitter_profile_url" name="twitter_profile_url" value={profile.twitter_profile_url} onChange={handleChange} placeholder="https://twitter.com/yourusername" />
        </div>
        <button type="submit" disabled={loading} className="save-profile-button">
          {loading ? 'Saving Profile...' : 'Save Profile'}
        </button>
      </form>
      {showStripeModal && (
        <StripeConnectModal
          isOpen={showStripeModal}
          onClose={() => setShowStripeModal(false)}
          onSuccess={() => {
            setShowStripeModal(false);
            fetchProfileAndStripeStatus(); // Refresh status after modal interaction
          }}
          accountType={stripeStatus?.isOnboardingComplete ? 'account_update' : 'account_onboarding'}
        />
      )}
    </div>
  );
}

export default ProfileSettingsPage;