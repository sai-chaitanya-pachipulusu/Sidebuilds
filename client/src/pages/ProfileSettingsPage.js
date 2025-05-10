import React, { useState, useEffect, useCallback } from 'react';
import { getUserProfile, updateUserProfile } from '../services/api'; // Assuming api.js is in ../services
import { useAuth } from '../context/AuthContext'; // To get user ID if needed for initial fetch, or use token
import './ProfileSettingsPage.css';

function ProfileSettingsPage() {
  const { user } = useAuth(); // Get authenticated user context
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

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const data = await getUserProfile();
      setProfile({
        username: data.username || '',
        email: data.email || '',
        bio: data.bio || '',
        location: data.location || '',
        phone_number: data.phone_number || '',
        portfolio_link: data.portfolio_link || '',
        linkedin_profile_url: data.linkedin_profile_url || '',
        github_profile_url: data.github_profile_url || '',
        twitter_profile_url: data.twitter_profile_url || ''
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch profile.');
      console.error("Fetch profile error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) { // Only fetch if user is authenticated
      fetchProfile();
    }
  }, [user, fetchProfile]);

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

  if (loading && !profile.username) { // Show loading only on initial load
    return <div className="profile-settings-page"><p>Loading profile...</p></div>;
  }

  return (
    <div className="profile-settings-page">
      <h2>Profile Settings</h2>
      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}
      <form onSubmit={handleSubmit}>
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
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}

export default ProfileSettingsPage;