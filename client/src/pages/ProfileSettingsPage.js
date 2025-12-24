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
      console.log('🔄 Fetching user profile...');
      const profileData = await getUserProfile();
      console.log('✅ Profile data received:', profileData);
      
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
      console.log('🔄 Fetching Stripe status...');
      const stripeData = await checkStripeOnboardingStatus();
      console.log('✅ Stripe data received:', stripeData);
      setStripeStatus(stripeData);
    } catch (err) {
      console.error('❌ Stripe status error:', err);
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
            toast.success("Account created! Please finish onboarding to start selling.", { id: loadingToast, icon: '⚠️' });
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
    console.log(`📝 Field changed: ${name} = ${value}`);
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    if (e) {
      e.preventDefault(); // Prevent form submission
    }
    
    setSaveLoading(true);
    console.log('💾 Starting profile save...');
    console.log('📤 Profile data to save:', profile);

    try {
      // Check authentication first
      const token = localStorage.getItem('token');
      console.log('🔍 Token check - exists:', !!token, 'length:', token?.length, 'starts with:', token?.substring(0, 30) + '...');
      
      if (!token) {
        console.error('❌ No authentication token found');
        toast.error('You need to be logged in to save changes');
        setSaveLoading(false);
        return;
      }

      console.log('🔑 Token exists, proceeding with save...');
      
      const updatedProfile = await updateUserProfile(profile);
      console.log('✅ Profile updated successfully:', updatedProfile);
      
      toast.success('Profile updated successfully!');
      
      // Refresh auth context if needed
      if (refreshUserData) {
        await refreshUserData();
      }
      
    } catch (err) {
      console.error('❌ Profile save error:', err);
      console.error('📋 Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
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
      console.log('🏁 Profile save process completed');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 backdrop-blur-sm mb-6"
              >
                <Settings className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300">Account Settings</span>
              </motion.div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Profile &{' '}
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Settings
                </span>
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Manage your account profile, payment settings, and security preferences.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex justify-center">
              <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-2xl">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
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
                  <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-8">
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
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors duration-200"
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
                            className="w-full px-4 py-3 bg-gray-800/30 border border-gray-700 rounded-xl text-gray-400 cursor-not-allowed"
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
                          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors duration-200 resize-none"
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
                          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors duration-200"
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
                              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors duration-200"
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
                              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors duration-200"
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
                              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors duration-200"
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
                              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors duration-200"
                              placeholder="https://twitter.com/yourusername"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Save Button */}
                      <motion.button
                        type="submit"
                        disabled={saveLoading}
                        className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 flex items-center justify-center gap-2"
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
                  <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Payout Settings</h2>
                    
                    {isStripeLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-500 mr-3" />
                        <span className="text-gray-400">Loading Stripe status...</span>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {stripeStatus && (
                          <>
                            {stripeStatus.accountId && stripeStatus.isOnboardingComplete ? (
                              <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                                <div>
                                  <h3 className="text-green-400 font-semibold">Stripe Connected!</h3>
                                  <p className="text-gray-300 text-sm">Your Stripe account is connected and ready for payouts.</p>
                                  <p className="text-gray-500 text-xs mt-1">Account ID: {stripeStatus.accountId}</p>
                                </div>
                              </div>
                            ) : stripeStatus.accountId && !stripeStatus.isOnboardingComplete ? (
                              <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                                <div>
                                  <h3 className="text-yellow-400 font-semibold">Onboarding Incomplete</h3>
                                  <p className="text-gray-300 text-sm">Your Stripe onboarding is incomplete. Please complete the setup to receive payouts.</p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                                <div>
                                  <h3 className="text-blue-400 font-semibold">Connect Stripe</h3>
                                  <p className="text-gray-300 text-sm">Connect your Stripe account to receive payouts for your sold projects.</p>
                                </div>
                              </div>
                            )}
                            
                            {stripeStatus.needsAttention && (
                              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                                <div className="space-y-2">
                                  <h3 className="text-red-400 font-semibold">Attention Required</h3>
                                  <p className="text-gray-300 text-sm">Your Stripe account requires attention. Please complete the missing requirements to enable payouts.</p>
                                  {stripeStatus.currentlyDue && stripeStatus.currentlyDue.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-xs font-bold text-red-400/80 uppercase tracking-wider">Missing Requirements:</p>
                                      <ul className="list-disc list-inside text-xs text-gray-400 mt-1">
                                        {stripeStatus.currentlyDue.map((req, idx) => (
                                          <li key={idx}>
                                            {req.split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {stripeStatus.disabledReason && (
                                    <p className="text-xs text-red-400/60 mt-2 italic">
                                      Reason: {stripeStatus.disabledReason.replace(/_/g, ' ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            <motion.button
                              onClick={() => setShowStripeModal(true)}
                              className={`w-full px-6 py-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                                stripeStatus.isOnboardingComplete
                                  ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'
                                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700'
                              }`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <CreditCard className="w-5 h-5" />
                              {stripeStatus.accountId 
                                ? (stripeStatus.isOnboardingComplete ? "Manage Stripe Account" : "Complete Stripe Onboarding")
                                : "Connect with Stripe"
                              }
                            </motion.button>
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
                  <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Security Settings</h2>
                    
                    <div className="space-y-6">
                      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div>
                          <h3 className="text-blue-400 font-semibold">Coming Soon</h3>
                          <p className="text-gray-300 text-sm">Advanced security settings including two-factor authentication, password changes, and account recovery options will be available soon.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-800/30 rounded-xl">
                          <div className="flex items-center gap-3 mb-2">
                            <Shield className="w-5 h-5 text-purple-400" />
                            <h4 className="text-white font-medium">Two-Factor Auth</h4>
                          </div>
                          <p className="text-gray-400 text-sm">Add an extra layer of security to your account.</p>
                          <button 
                            disabled 
                            className="mt-3 px-4 py-2 bg-gray-700 text-gray-500 rounded-lg text-sm cursor-not-allowed"
                          >
                            Coming Soon
                          </button>
                        </div>

                        <div className="p-4 bg-gray-800/30 rounded-xl">
                          <div className="flex items-center gap-3 mb-2">
                            <Zap className="w-5 h-5 text-yellow-400" />
                            <h4 className="text-white font-medium">Login Activity</h4>
                          </div>
                          <p className="text-gray-400 text-sm">Monitor your account login activity and devices.</p>
                          <button 
                            disabled 
                            className="mt-3 px-4 py-2 bg-gray-700 text-gray-500 rounded-lg text-sm cursor-not-allowed"
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
              onSuccess={() => {
                setShowStripeModal(false);
                fetchProfileAndStripeStatus();
              }}
              accountType={stripeStatus?.isOnboardingComplete ? 'account_update' : 'account_onboarding'}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export default ProfileSettingsPage;