import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { getProjectById, expressInterestInProject } from '../services/api';
import PaymentService from '../services/paymentService';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import { DollarSign, Zap, Shield, Users, Calendar, ArrowLeft, Share2, Bookmark, Code2, Eye, PlayCircle, ImageIcon, TrendingUp, Star, Edit3, Heart, Github, Send, X, CheckCircle, BookmarkCheck, Trophy, ExternalLink, Lightbulb } from 'lucide-react';
import toast from 'react-hot-toast';

const ProjectDetailPage = () => {
  const { id: projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State management with proper initialization
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [interestMessage, setInterestMessage] = useState('');
  const [commitments, setCommitments] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Fetch project data with proper error handling
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) {
        setError('No project ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        console.log('Fetching project with ID:', projectId);
        
        const data = await getProjectById(projectId);
        console.log('Project data received:', data);
        
        if (!data) {
          throw new Error('No project data received');
        }
        
        setProject(data);
      } catch (err) {
        console.error('Error fetching project:', err);
        setError(err.message || 'Failed to load project. It may be private or does not exist.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProject();
  }, [projectId]);
  
  // Handle URL parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('showInterest') === 'true' && !showInterestModal && project) {
      setShowInterestModal(true);
    }
  }, [location.search, showInterestModal, project]);

  // Enhanced interest submission with better error handling
  const handleInterestSubmit = async () => {
    console.log('handleInterestSubmit called');
    
    if (!user) {
      toast.error('Please log in to express interest.');
      return;
    }
    
    if (!project) {
      toast.error('Project information not available.');
      return;
    }
    
    if (commitments.size < 3) {
      toast.error('Please agree to all commitments.');
      return;
    }
    
    if (!interestMessage.trim()) {
      toast.error('Please include a message to the seller.');
      return;
    }

    console.log('All validations passed, submitting interest...');
    setIsSubmitting(true);
    
    try {
      console.log('Sending interest:', {
        projectId,
        commitments: Array.from(commitments),
        message: interestMessage
      });
      
      const result = await expressInterestInProject(projectId, Array.from(commitments), interestMessage);
      console.log('Interest submission successful:', result);
      
      toast.success('Interest sent! The seller has been notified.');
      
      // Reset form and close modal
      setShowInterestModal(false);
      setInterestMessage('');
      setCommitments(new Set());
      
    } catch (error) {
      console.error('Interest submission error:', error);
      
      // Enhanced error handling with specific messages
      let errorMessage = 'Failed to send interest. Please try again.';
      if (error.response?.status === 401) {
        const serverMessage = error.response.data?.message;
        if (serverMessage?.includes('Invalid token format') || serverMessage?.includes('Token expired')) {
          errorMessage = 'Your session has expired. Please log in again.';
          // Clear the invalid token and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setTimeout(() => window.location.href = '/login', 2000);
        } else {
          errorMessage = 'Please log in again to send an offer.';
        }
      } else if (error.response?.status === 404) {
        errorMessage = 'Project not found. It may have been removed.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You cannot make an offer on your own project.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Invalid request. Please check your input.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCommitment = (commitment) => {
    const newCommitments = new Set(commitments);
    if (newCommitments.has(commitment)) {
      newCommitments.delete(commitment);
    } else {
      newCommitments.add(commitment);
    }
    setCommitments(newCommitments);
  };

  const handlePurchase = async () => {
    if (!user) {
      toast.error('Please log in to purchase this project.');
      navigate('/login');
      return;
    }
    
    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method.');
      return;
    }

    setPaymentProcessing(true);
    
    try {
      const paymentService = new PaymentService();
      
      const checkoutData = await paymentService.createCheckout({
        amount: project.sale_price,
        projectId: project.id,
        projectName: project.name,
        sellerId: project.owner_id,
        buyerId: user.id
      }, selectedPaymentMethod);

      if (checkoutData.checkout_url) {
        window.location.href = checkoutData.checkout_url;
      } else {
        toast.error('Failed to create checkout session. Please try again.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handlePaymentMethodSelect = (method) => {
    setSelectedPaymentMethod(method);
  };

  // Force close modal function with comprehensive cleanup
  const forceCloseModal = useCallback((e) => {
    console.log('forceCloseModal called');
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Force close all modals and reset all states
    setShowInterestModal(false);
    setShowPaymentModal(false);
    setInterestMessage('');
    setCommitments(new Set());
    setSelectedPaymentMethod('');
    setIsSubmitting(false);
    setPaymentProcessing(false);
    
    // Additional cleanup to ensure modal is closed
    document.body.style.overflow = 'unset';
  }, []);

  // Handle backdrop clicks
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      forceCloseModal(e);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        console.log('Escape key pressed, closing modal');
        forceCloseModal();
      }
    };

    if (showInterestModal || showPaymentModal) {
      document.addEventListener('keydown', handleEscapeKey, true); // Use capture phase
      return () => document.removeEventListener('keydown', handleEscapeKey, true);
    }
  }, [showInterestModal, showPaymentModal]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading project details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-red-500/20 rounded-2xl p-8"
          >
            <div className="text-red-400 text-xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-white mb-2">Project Not Found</h2>
            <p className="text-red-400 mb-6">{error}</p>
            <motion.button
              onClick={() => navigate('/marketplace')}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ArrowLeft className="w-4 h-4 mr-2 inline" />
              Back to Marketplace
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  // No project data
  if (!project) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">No project data available</p>
          <motion.button
            onClick={() => navigate('/marketplace')}
            className="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Back to Marketplace
          </motion.button>
        </div>
      </div>
    );
  }

  // Safe property access with defaults
  const isOwner = user && project.owner_id === user.id;
  const projectName = project.name || 'Untitled Project';
  const projectDescription = project.description || 'No description available.';
  const creatorUsername = project.creator_username || project.owner_username || 'Unknown';
  const salePrice = project.sale_price || 0;
  const monthlyRevenue = project.monthly_revenue || 0;
  const viewCount = project.view_count || 0;
  const yearsRunning = project.years_running || 0;

  const formatPrice = (price) => {
    if (!price || price === 0) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const techStack = Array.isArray(project.tech_stack) 
    ? project.tech_stack 
    : (project.tech_stack && typeof project.tech_stack === 'string' 
        ? (()=>{ try { const arr = JSON.parse(project.tech_stack); return Array.isArray(arr)? arr : project.tech_stack.split(',').map(t=>t.trim()); } catch { return project.tech_stack.split(',').map(t=>t.trim()); } })()
        : []);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Eye },
    { id: 'demo', name: 'Live Demo', icon: PlayCircle },
    { id: 'gallery', name: 'Gallery', icon: ImageIcon },
    { id: 'code', name: 'Tech Details', icon: Code2 },
    { id: 'ai', name: 'AI Insights', icon: Lightbulb },
  ];

  const monthsToBreakeven = monthlyRevenue > 0 ? (salePrice / monthlyRevenue).toFixed(1) : 'N/A';

  return (
    <>
      <SEO 
        title={`${projectName} by @${creatorUsername}`}
        description={projectDescription}
      />
      
      <div className="min-h-screen bg-black">
        {/* Back Button */}
        <div className="max-w-7xl mx-auto px-4 pt-8">
          <motion.button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200 mb-6"
            whileHover={{ x: -4 }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </motion.button>
        </div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="max-w-7xl mx-auto px-4 pb-8">
            <div className="relative h-[60vh] rounded-3xl overflow-hidden bg-gray-900">
              <img 
                src={project.cover_image_url || 'https://via.placeholder.com/1200x675?text=Project+Image'} 
                alt={projectName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              {/* Project Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="flex items-end justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      {project.verified && (
                        <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-sm font-medium flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Verified
                        </div>
                      )}
                      {project.is_featured && (
                        <div className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-400 text-sm font-medium flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          Featured
                        </div>
                      )}
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                      {projectName}
                    </h1>
                    <p className="text-xl text-gray-300 mb-4">
                      by{' '}
                      <RouterLink 
                        to={`/profile/${project.owner_id}`}
                        className="text-purple-400 hover:text-purple-300 transition-colors duration-200"
                      >
                        @{creatorUsername}
                      </RouterLink>
                    </p>
                    
                    {/* Quick Stats */}
                    <div className="flex items-center gap-6 text-sm text-gray-300">
                      {viewCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {viewCount} views
                        </div>
                      )}
                      {monthlyRevenue > 0 && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          {formatPrice(monthlyRevenue)}/mo
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {yearsRunning} years running
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={() => setIsBookmarked(!isBookmarked)}
                      className="p-3 bg-gray-800/80 backdrop-blur-sm rounded-full hover:bg-gray-700/80 transition-colors duration-200"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isBookmarked ? (
                        <BookmarkCheck className="w-5 h-5 text-purple-400" />
                      ) : (
                        <Bookmark className="w-5 h-5 text-gray-400" />
                      )}
                    </motion.button>
                    
                    <motion.button
                      className="p-3 bg-gray-800/80 backdrop-blur-sm rounded-full hover:bg-gray-700/80 transition-colors duration-200"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Share2 className="w-5 h-5 text-gray-400" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Navigation Tabs */}
              <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-2xl">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                      activeTab === tab.id
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.name}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-8"
                >
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-4">Creator's Story</h2>
                        <p className="text-gray-300 text-lg leading-relaxed">
                          {projectDescription}
                        </p>
                      </div>
                      
                      {/* Key Features */}
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-4">Key Features</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            'Revenue generating',
                            'Fully documented',
                            'Production ready',
                            'Scalable architecture'
                          ].map((feature, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <CheckCircle className="w-5 h-5 text-green-400" />
                              <span className="text-gray-300">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'demo' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-bold text-white mb-4">Live Demo</h2>
                      <div className="aspect-video bg-gray-800 rounded-xl overflow-hidden">
                        <iframe
                          title={`${projectName} Live Demo`}
                          src={project.domain ? `https://${project.domain}` : undefined}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      </div>
                      <p className="text-sm text-gray-500">
                        Note: Live demo is embedded. Some features may be restricted.
                      </p>
                    </div>
                  )}

                  {activeTab === 'gallery' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-bold text-white mb-4">Project Gallery</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="aspect-video bg-gray-800 rounded-xl flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-600" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'code' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-bold text-white mb-4">Technical Details</h2>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-2">Tech Stack</h3>
                          <div className="flex flex-wrap gap-2">
                            {techStack.map((tech, index) => (
                              <span key={index} className="px-3 py-1 bg-gray-800 text-gray-300 rounded-lg border border-gray-700">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="bg-gray-800/50 rounded-xl p-4">
                          <h4 className="text-white font-medium mb-2">What's Included</h4>
                          <ul className="space-y-2 text-gray-300">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              Complete source code
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              Documentation & setup guide
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              Database schema
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              30-day support
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'ai' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-bold text-white mb-4">AI Insights</h2>
                      <div className="bg-gray-800/50 rounded-xl p-6">
                        <p className="text-gray-300 mb-4">AI-driven recommendations to improve listing quality and sale readiness.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-lg border border-white/10 bg-gray-900/40">
                            <div className="text-sm text-gray-400 mb-2">Valuation Helper</div>
                            <button className="px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                              onClick={async ()=>{
                                try {
                                  const resp = await fetch('http://localhost:5002/api/ai/score-project', { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ projectId: project.project_id || project.id, projectData: { title: project.name, description: project.description, monthlyRevenue: project.monthly_revenue, category: project.category, technologies: project.tech_stack } }) });
                                  const data = await resp.json();
                                  if (!resp.ok) throw new Error(data.error||'AI scoring failed');
                                  toast.success(`AI Score: ${data.score}`);
                                } catch (e) { toast.error(e.message); }
                              }}>
                              Get AI Score
                            </button>
                          </div>
                          <div className="p-4 rounded-lg border border-white/10 bg-gray-900/40">
                            <div className="text-sm text-gray-400 mb-2">Idea Assist</div>
                            <button className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                              onClick={async ()=>{
                                try {
                                  const resp = await fetch('http://localhost:5002/api/ai/idea-assist', { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ stage: project.stage, category: project.category }) });
                                  const data = await resp.json();
                                  if (!resp.ok) throw new Error(data.error||'AI idea assist failed');
                                  navigator.clipboard.writeText(JSON.stringify(data.template, null, 2));
                                  toast.success('AI template copied to clipboard');
                                } catch (e) { toast.error(e.message); }
                              }}>
                              Generate Stage Template
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Project Details Card */}
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6 sticky top-8">
                <h3 className="text-xl font-bold text-white mb-6">Project Details</h3>
                
                {/* Price */}
                <div className="bg-gray-800/30 rounded-xl p-4 mb-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">
                      {project.is_for_sale ? formatPrice(salePrice) : 'Not for Sale'}
                    </div>
                    {monthlyRevenue > 0 && (
                      <div className="text-purple-400 text-sm">
                        {monthsToBreakeven}x monthly revenue
                      </div>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>Monthly Visitors</span>
                    </div>
                    <span className="text-white font-medium">
                      {(project.traffic_data?.monthly_visitors || 0).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <TrendingUp className="w-4 h-4" />
                      <span>Monthly Revenue</span>
                    </div>
                    <span className="text-white font-medium">
                      {monthlyRevenue > 0 ? formatPrice(monthlyRevenue) : '$0'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>Project Age</span>
                    </div>
                    <span className="text-white font-medium">
                      {yearsRunning} years
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Star className="w-4 h-4" />
                      <span>Rating</span>
                    </div>
                    <span className="text-white font-medium">
                      {project.rating || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {isOwner ? (
                    <motion.button
                      onClick={() => navigate(`/projects/edit/${projectId}`)}
                      className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Project
                    </motion.button>
                  ) : project.is_for_sale ? (
                    <>
                      <motion.button
                        onClick={() => setShowPaymentModal(true)}
                        className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-green-700 hover:to-emerald-700 transition-all duration-200"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <DollarSign className="w-4 h-4" />
                        Buy Now • {formatPrice(salePrice)}
                      </motion.button>
                      <motion.button
                        onClick={() => setShowInterestModal(true)}
                        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Heart className="w-4 h-4" />
                        Make Offer
                      </motion.button>
                    </>
                  ) : (
                    <button
                      disabled
                      className="w-full px-6 py-3 bg-gray-700 text-gray-400 rounded-xl font-medium cursor-not-allowed"
                    >
                      Not Available for Purchase
                    </button>
                  )}
                  
                  {/* External Links */}
                  <div className="flex gap-3">
                    {project.github_url && (
                      <motion.a
                        href={project.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Github className="w-4 h-4" />
                        Code
                      </motion.a>
                    )}
                    
                    {project.domain && (
                      <motion.a
                        href={`https://${project.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Live
                      </motion.a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interest Modal */}
        <AnimatePresence>
          {showInterestModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowInterestModal(false);
                }
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-gray-900 border border-white/[0.12] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Make an Offer for {projectName}</h2>
                  <motion.button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('X button clicked - closing modal');
                      setShowInterestModal(false);
                    }}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors duration-200 text-gray-400 hover:text-white z-10 relative"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    style={{ pointerEvents: 'auto' }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="space-y-6">
                  <p className="text-gray-300">
                    Your offer will be sent to the seller. This is a negotiation starting point.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Message to Seller
                    </label>
                    <textarea
                      value={interestMessage}
                      onChange={(e) => setInterestMessage(e.target.value)}
                      placeholder="Introduce yourself, your offer amount, and why you're interested in this project..."
                      className="w-full h-32 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-4">
                      Commitments (all required)
                    </label>
                    <div className="space-y-3">
                      {[
                        { id: 'funds_ready', text: 'I have the funds available for this purchase.' },
                        { id: 'respect_process', text: 'I understand this is a negotiation and the seller may decline.' },
                        { id: 'prompt_payment', text: 'I agree to make the payment promptly if my offer is accepted.' }
                      ].map((commitment) => (
                        <label key={commitment.id} className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={commitments.has(commitment.id)}
                            onChange={() => toggleCommitment(commitment.id)}
                            className="mt-1 w-4 h-4 bg-gray-800 border border-gray-600 rounded focus:ring-purple-500 focus:ring-2 text-purple-600"
                          />
                          <span className="text-gray-300 text-sm">{commitment.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Cancel button clicked - closing modal');
                        setShowInterestModal(false);
                      }}
                      className="flex-1 px-6 py-3 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-xl transition-colors duration-200 z-10 relative"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{ pointerEvents: 'auto' }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Send Offer button clicked');
                        handleInterestSubmit();
                      }}
                      disabled={commitments.size < 3 || !interestMessage.trim() || isSubmitting}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isSubmitting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Offer
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Payment Modal */}
        <AnimatePresence>
          {showPaymentModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowPaymentModal(false);
                }
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-gray-900 border border-white/[0.08] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Purchase {projectName}</h2>
                  <motion.button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Payment modal X button clicked - closing modal');
                      setShowPaymentModal(false);
                    }}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors duration-200 text-gray-400 hover:text-white z-10 relative"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    style={{ pointerEvents: 'auto' }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="space-y-6">
                  {/* Purchase Summary */}
                  <div className="bg-gray-800/30 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Purchase Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Project</span>
                        <span className="text-white font-medium">{projectName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Seller</span>
                        <span className="text-white font-medium">@{creatorUsername}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Monthly Revenue</span>
                        <span className="text-green-400 font-medium">
                          {monthlyRevenue > 0 ? formatPrice(monthlyRevenue) : 'N/A'}
                        </span>
                      </div>
                      <div className="border-t border-gray-700 pt-3">
                        <div className="flex justify-between text-lg">
                          <span className="text-white font-semibold">Total</span>
                          <span className="text-white font-bold">{formatPrice(salePrice)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Choose Payment Method</h3>
                    <PaymentMethodSelector
                      selectedMethod={selectedPaymentMethod}
                      onMethodSelect={handlePaymentMethodSelect}
                      amount={salePrice}
                    />
                  </div>

                  {/* Security Notice */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-blue-300 text-sm">
                          <strong>Secure Transaction:</strong> Your payment is processed securely through our verified payment partners. 
                          Funds are held in escrow until project transfer is complete.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Payment modal Cancel button clicked - closing modal');
                        setShowPaymentModal(false);
                      }}
                      className="flex-1 px-6 py-3 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-xl transition-colors duration-200 z-10 relative"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{ pointerEvents: 'auto' }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={handlePurchase}
                      disabled={!selectedPaymentMethod || paymentProcessing}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {paymentProcessing ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Complete Purchase
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default ProjectDetailPage;