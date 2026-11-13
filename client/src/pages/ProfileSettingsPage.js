import React, { useState, useEffect, useCallback } from 'react';
import { getUserProfile, updateUserProfile, checkStripeOnboardingStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  MapPin,
  Github,
  Linkedin,
  Twitter,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Info,
  Settings,
  Save,
  Loader2,
  Link as LinkIcon,
  Shield,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';
import StripeConnectModal from '../components/StripeConnectModal';

function ProfileSettingsPage() {
  const { user, refreshUserData } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    username: '',
    email: '',
    bio: '',
    location: '',
    portfolio_link: '',
    linkedin_profile_url: '',
    github_profile_url: '',
    twitter_profile_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  const [stripeStatus, setStripeStatus] = useState(null);
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const processedParamsRef = React.useRef(new Set());

  const fetchProfileAndStripeStatus = useCallback(async () => {
    setLoading(true);
    setIsStripeLoading(true);

    try {
      const profileData = await getUserProfile();
      
      setProfile({
        username: profileData.username || '',
        email: profileData.email || '',
        bio: profileData.bio || '',
        location: profileData.location || '',
        portfolio_link: profileData.portfolio_link || '',
        linkedin_profile_url: profileData.linkedin_profile_url || '',
        github_profile_url: profileData.github_profile_url || '',
        twitter_profile_url: profileData.twitter_profile_url || ''
      });
    } catch (err) {
      console.error('❌ Profile fetch error:', err);
      toast.error(err.message || 'Failed to fetch profile.');
    }

    try {
      const stripeData = await checkStripeOnboardingStatus();
      setStripeStatus(stripeData);
    } catch (err) {
      setStripeStatus({ verificationStatus: 'unavailable', isOnboardingComplete: false });
      let specificMessage = err.message || 'Failed to fetch Stripe status.';
      if (err.code === 'STRIPE_ACCOUNT_AUTOCREATE_FAILED') {
        specificMessage = `Initial Stripe setup failed: ${err.error || err.message}`;
      }
      toast.error(specificMessage);
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

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const stripeReturn = query.get('stripe_return');
    const stripeRefresh = query.get('stripe_refresh');
    const tabParam = query.get('tab');
    
    // Handle tab parameter
    if (tabParam && ['profile', 'payouts', 'security'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    
    const paramsKey = location.search;
    
    if (stripeReturn === 'true' && !processedParamsRef.current.has('stripe_return_' + paramsKey)) {
      processedParamsRef.current.add('stripe_return_' + paramsKey);
      const checkStatus = async () => {
        const loadingToast = toast.loading("Checking your Stripe connection status...");
        try {
          const stripeData = await checkStripeOnboardingStatus();
          setStripeStatus(stripeData);
          if (stripeData.isOnboardingComplete) {
            toast.success("Stripe account fully connected and verified!", { id: loadingToast });
          } else {
            toast.error(stripeData.requiresReconnect ? 'Reconnect Stripe to use payments in this environment.' : stripeData.verificationStatus === 'unavailable' ? 'Stripe could not verify your connection. Try again shortly.' : 'Finish the requirements on Stripe before accepting payments.', { id: loadingToast });
          }
        } catch (err) {
          toast.error("Connected to Stripe, but failed to verify status.", { id: loadingToast });
        }
      };
      checkStatus();
      navigate('/profile-settings?tab=payouts', { replace: true });
    } else if (stripeRefresh === 'true' && !processedParamsRef.current.has('stripe_refresh_' + paramsKey)) {
      processedParamsRef.current.add('stripe_refresh_' + paramsKey);
      toast.error("Stripe session expired. Please try connecting again.");
      setShowStripeModal(true);
      navigate('/profile-settings', { replace: true });
    }
  }, [location, navigate, fetchProfileAndStripeStatus]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'email') return; // Email is read-only
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    if (e) {
      e.preventDefault(); // Prevent form submission
    }
    
    setSaveLoading(true);

    try {
      // Check authentication first
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('❌ No authentication token found');
        toast.error('You need to be logged in to save changes');
        setSaveLoading(false);
        return;
      }

      
      await updateUserProfile(profile);
      
      toast.success('Profile updated successfully!');
      
      // Refresh auth context if needed
      if (refreshUserData) {
        await refreshUserData();
      }
      
    } catch (err) {
      console.error('❌ Profile save error:', err);
      
      let errorMessage = 'Failed to update profile';
      
      if (err.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (err.response?.status === 409) {
        errorMessage = err.response?.data?.message || 'Username already taken';
      } else if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || 'Invalid data provided';
      } else if (err.response?.status === 503) {
        errorMessage = 'Database temporarily unavailable. Please try again later.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setSaveLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'payouts', name: 'Payouts', icon: CreditCard },
    { id: 'security', name: 'Security', icon: Shield },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-none h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile and payment settings...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Profile Settings" 
        description="Manage your account profile, payment settings, and security preferences." 
      />
      
      <div className="min-h-screen bg-black">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-none bg-white/10/10 border border-white/50/20 backdrop-blur-sm mb-6"
              >
                <Settings className="w-4 h-4 text-white" />
                <span className="text-sm text-gray-300">Account Settings</span>
              </motion.div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Profile &{' '}
                <span className="    text-neutral-100">
                  Settings
                </span>
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Manage your account profile, payment settings, and security preferences.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex justify-center">
              <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-none">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 rounded-none font-medium transition-all duration-200 flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'profile' && (
                  <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Personal Information</h2>
                    
                    <form onSubmit={handleSave} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Username */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            <User className="w-4 h-4 inline mr-2" />
                            Username
                          </label>
                          <input
                            type="text"
                            name="username"
                            value={profile.username}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-none text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors duration-200"
                            placeholder="Enter your username"
                          />
                        </div>

                        {/* Email (Read-only) */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            <Mail className="w-4 h-4 inline mr-2" />
                            Email
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={profile.email}
                            readOnly
                            className="w-full px-4 py-3 bg-gray-800/30 border border-gray-700 rounded-none text-gray-400 cursor-not-allowed"
                          />
                          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                        </div>
                      </div>

                      {/* Bio */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Bio
                        </label>
                        <textarea
                          name="bio"
                          value={profile.bio}
                          onChange={handleChange}
                          rows={4}
                          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-none text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors duration-200 resize-none"
                          placeholder="Tell us about yourself..."
                        />
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <MapPin className="w-4 h-4 inline mr-2" />
                          Location
                        </label>
                        <input
                          type="text"
                          name="location"
                          value={profile.location}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-none text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors duration-200"
                          placeholder="City, Country"
                        />
                      </div>

                      {/* Social Links */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Social Links</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Portfolio */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              <LinkIcon className="w-4 h-4 inline mr-2" />
                              Portfolio Link
                            </label>
                            <input
                              type="url"
                              name="portfolio_link"
                              value={profile.portfolio_link}
                              onChange={handleChange}
                              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-none text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors duration-200"
                              placeholder="https://myportfolio.com"
                            />
                          </div>

                          {/* LinkedIn */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              <Linkedin className="w-4 h-4 inline mr-2" />
                              LinkedIn Profile
                            </label>
                            <input
                              type="url"
                              name="linkedin_profile_url"
                              value={profile.linkedin_profile_url}
                              onChange={handleChange}
                              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-none text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors duration-200"
                              placeholder="https://linkedin.com/in/yourname"
                            />
                          </div>

                          {/* GitHub */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              <Github className="w-4 h-4 inline mr-2" />
                              GitHub Profile
                            </label>
                            <input
                              type="url"
                              name="github_profile_url"
                              value={profile.github_profile_url}
                              onChange={handleChange}
                              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-none text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors duration-200"
                              placeholder="https://github.com/yourusername"
                            />
                          </div>

                          {/* Twitter */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              <Twitter className="w-4 h-4 inline mr-2" />
                              Twitter Profile
                            </label>
                            <input
                              type="url"
                              name="twitter_profile_url"
                              value={profile.twitter_profile_url}
                              onChange={handleChange}
                              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-none text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors duration-200"
                              placeholder="https://twitter.com/yourusername"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Save Button */}
                      <motion.button
                        type="submit"
                        disabled={saveLoading}
                        className="w-full px-6 py-4 bg-neutral-800   text-white rounded-none font-medium disabled:opacity-50 disabled:cursor-not-allowed   transition-all duration-200 flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {saveLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5" />
                            Save Profile
                          </>
                        )}
                      </motion.button>
                    </form>
                  </div>
                )}

                {activeTab === 'payouts' && (
                  <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Payout Settings</h2>
                    
                    {isStripeLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-300 mr-3" />
                        <span className="text-gray-400">Loading Stripe status...</span>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {stripeStatus && (
                          <>
                            <div className="flex items-start gap-3 p-4 bg-[#141714] border border-[#353b34]">
                              {stripeStatus.isOnboardingComplete ? <CheckCircle className="w-5 h-5 text-[#d5efae] mt-0.5 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-[#efcc8d] mt-0.5 shrink-0" />}
                              <div>
                                <h3 className="text-white font-semibold">{stripeStatus.requiresReconnect ? 'Reconnect Stripe' : stripeStatus.verificationStatus === 'unavailable' ? 'Connection not verified' : stripeStatus.isOnboardingComplete ? 'Ready to receive payments' : stripeStatus.accountId ? 'Finish Stripe setup' : 'Connect Stripe'}</h3>
                                <p className="text-gray-300 text-sm mt-2">{stripeStatus.requiresReconnect ? 'Your saved connection is unavailable in the current payment environment. Reconnect below and complete verification on Stripe. An unfinished purchase may require support review first.' : stripeStatus.verificationStatus === 'unavailable' ? 'We could not check your Stripe connection. Try again shortly. Your existing connection has been kept.' : stripeStatus.isOnboardingComplete ? 'Stripe confirms payments, payouts and transfers are active. Each purchase checks your connection again.' : stripeStatus.accountId ? 'Complete the requirements on Stripe to enable payments, payouts and transfers.' : 'Connect your own Stripe account to receive payment for project sales.'}</p>
                              </div>
                            </div>
                            <button type="button" className="border border-[#b8c4ad] bg-[#d5efae] text-[#141714] px-5 py-3 font-semibold"
                              onClick={() => stripeStatus.verificationStatus === 'unavailable' ? fetchProfileAndStripeStatus() : setShowStripeModal(true)}>
                              {stripeStatus.verificationStatus === 'unavailable' ? 'Retry verification' : stripeStatus.requiresReconnect ? 'Reconnect Stripe' : stripeStatus.isOnboardingComplete ? 'Manage Stripe account' : stripeStatus.accountId ? 'Complete Stripe setup' : 'Connect Stripe'}
                            </button>
                          </>
                        )}
                        
                        {!stripeStatus && (
                          <div className="text-center py-8">
                            <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">Could not load Stripe status. Please try again later.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Security Settings</h2>
                    
                    <div className="space-y-6">
                      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-none">
                        <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div>
                          <h3 className="text-blue-400 font-semibold">Coming Soon</h3>
                          <p className="text-gray-300 text-sm">Advanced security settings including two-factor authentication, password changes, and account recovery options will be available soon.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-800/30 rounded-none">
                          <div className="flex items-center gap-3 mb-2">
                            <Shield className="w-5 h-5 text-white" />
                            <h4 className="text-white font-medium">Two-Factor Auth</h4>
                          </div>
                          <p className="text-gray-400 text-sm">Add an extra layer of security to your account.</p>
                          <button 
                            disabled 
                            className="mt-3 px-4 py-2 bg-gray-700 text-gray-500 rounded-none text-sm cursor-not-allowed"
                          >
                            Coming Soon
                          </button>
                        </div>

                        <div className="p-4 bg-gray-800/30 rounded-none">
                          <div className="flex items-center gap-3 mb-2">
                            <Zap className="w-5 h-5 text-yellow-400" />
                            <h4 className="text-white font-medium">Login Activity</h4>
                          </div>
                          <p className="text-gray-400 text-sm">Monitor your account login activity and devices.</p>
                          <button 
                            disabled 
                            className="mt-3 px-4 py-2 bg-gray-700 text-gray-500 rounded-none text-sm cursor-not-allowed"
                          >
                            Coming Soon
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Stripe Connect Modal */}
        <AnimatePresence>
          {showStripeModal && (
            <StripeConnectModal
              isOpen={showStripeModal}
              onClose={() => setShowStripeModal(false)}
              status={stripeStatus}
              onOnboardingComplete={() => {
                setShowStripeModal(false);
                fetchProfileAndStripeStatus();
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export default ProfileSettingsPage;
