import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { getProjectById, expressInterestInProject } from '../services/api';
import PaymentService from '../services/paymentService';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import ProjectDetailSkeleton from '../components/ProjectDetailSkeleton';
import ErrorBoundary from '../components/ErrorBoundary';
import { 
  DollarSign, Zap, Shield, Users, Calendar, ArrowLeft, Share2, Bookmark, 
  Code2, Eye, PlayCircle, ImageIcon, TrendingUp, Star, Edit3, Heart, 
  Github, Send, X, CheckCircle, BookmarkCheck, Trophy, ExternalLink, 
  Lightbulb, Clock4, AlertCircle, Loader2, Info, AlertTriangle 
} from 'lucide-react';
import toast from 'react-hot-toast';

// Generate unique idempotency key
const generateIdempotencyKey = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Validation helper functions
const validateInterestMessage = (message) => {
  if (!message || message.trim().length === 0) {
    return 'Please include a message to the seller.';
  }
  if (message.trim().length < 10) {
    return 'Message must be at least 10 characters long.';
  }
  if (message.trim().length > 2000) {
    return 'Message must be less than 2000 characters.';
  }
  return null;
};

const validateCommitments = (commitments) => {
  if (commitments.size < 3) {
    return 'Please agree to all commitments.';
  }
  return null;
};

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
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [purchaseError, setPurchaseError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isBuyButtonLoading, setIsBuyButtonLoading] = useState(false);
  const [isOfferButtonLoading, setIsOfferButtonLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [purchaseInitiated, setPurchaseInitiated] = useState(false);
  
  // Abort controller for request cancellation
  const abortControllerRef = useRef(null);

  // Fetch project data with proper error handling
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) {
        setError('No project ID provided');
        setLoading(false);
        return;
      }

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();

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
        if (err.name === 'AbortError') {
          console.log('Request was cancelled');
          return;
        }
        console.error('Error fetching project:', err);
        setError(err.message || 'Failed to load project. It may be private or does not exist.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProject();
    
    // Cleanup function to abort pending requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [projectId]);
  
  // Handle URL parameters - opens modal once and clears the URL param
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('showInterest') === 'true' && project) {
      setShowInterestModal(true);
      // Clear the URL parameter to prevent re-opening on state changes
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [location.search, project]);

  // ESC key handler to close modals
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        if (showInterestModal) {
          console.log('ESC pressed - closing interest modal');
          setShowInterestModal(false);
          setInterestMessage('');
          setCommitments(new Set());
          setValidationErrors({});
        }
        if (showPaymentModal) {
          console.log('ESC pressed - closing payment modal');
          setShowPaymentModal(false);
          setSelectedPaymentMethod('');
          setPurchaseError(null);
        }
        if (showConfirmationModal) {
          setShowConfirmationModal(false);
        }
      }
    };
    
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [showInterestModal, showPaymentModal, showConfirmationModal]);

  // Enhanced interest submission with better error handling
  const handleInterestSubmit = async () => {
    console.log('handleInterestSubmit called');
    
    if (!user) {
      toast.error('Please log in to express interest.');
      navigate('/login');
      return;
    }
    
    if (!project) {
      toast.error('Project information not available.');
      return;
    }
    
    // Frontend validation
    const messageError = validateInterestMessage(interestMessage);
    const commitmentsError = validateCommitments(commitments);
    
    const errors = {};
    if (messageError) errors.message = messageError;
    if (commitmentsError) errors.commitments = commitmentsError;
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error('Please fix the validation errors.');
      return;
    }
    
    setValidationErrors({});
    console.log('All validations passed, submitting interest...');
    setIsOfferButtonLoading(true);
    setIsSubmitting(true);
    
    try {
      console.log('Sending interest:', {
        projectId,
        commitments: Array.from(commitments),
        message: interestMessage
      });
      
      const result = await expressInterestInProject(
        projectId, 
        Array.from(commitments), 
        interestMessage
      );
      
      console.log('Interest submission successful:', result);
      
      // Reset form first
      setInterestMessage('');
      setCommitments(new Set());
      
      // Close modal immediately
      setShowInterestModal(false);
      
      // Show success message after modal closes
      setTimeout(() => {
        toast.success('Interest sent! The seller has been notified.', {
          duration: 4000,
          position: 'top-center',
        });
      }, 100);
      
    } catch (error) {
      console.error('Interest submission error:', error);
      
      // Enhanced error handling with specific messages
      let errorMessage = 'Failed to send interest. Please try again.';
      if (error.response?.status === 401) {
        const serverMessage = error.response.data?.message;
        if (serverMessage?.includes('Invalid token format') || serverMessage?.includes('Token expired')) {
          errorMessage = 'Your session has expired. Please log in again.';
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
      } else if (error.response?.status === 409) {
        errorMessage = error.response.data?.error || 'You already have an active request for this project.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        duration: 5000,
        position: 'top-center',
      });
      
      // If it's a critical error (like session expired), close modal after showing error
      if (error.response?.status === 401 || error.response?.status === 403) {
        setTimeout(() => {
          setShowInterestModal(false);
          setInterestMessage('');
          setCommitments(new Set());
        }, 2000);
      }
    } finally {
      setIsSubmitting(false);
      setIsOfferButtonLoading(false);
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
    // Clear commitment error when user makes a selection
    if (validationErrors.commitments) {
      setValidationErrors(prev => ({ ...prev, commitments: null }));
    }
  };

  const handleMessageChange = (e) => {
    setInterestMessage(e.target.value);
    // Clear message error when user types
    if (validationErrors.message) {
      setValidationErrors(prev => ({ ...prev, message: null }));
    }
  };

  // Handle buy now button click - show confirmation modal
  const handleBuyNowClick = () => {
    if (!user) {
      toast.error('Please log in to purchase this project.');
      navigate('/login');
      return;
    }
    
    setShowConfirmationModal(true);
  };

  // Handle purchase confirmation
  const handleConfirmPurchase = async () => {
    setShowConfirmationModal(false);
    setShowPaymentModal(true);
  };

  // Handle actual purchase
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

    // Prevent duplicate submissions
    if (purchaseInitiated || paymentProcessing) {
      return;
    }

    setPaymentProcessing(true);
    setPurchaseInitiated(true);
    setPurchaseError(null);
    
    // Generate idempotency key
    const idempotencyKey = generateIdempotencyKey();
    
    try {
      const paymentService = new PaymentService();
      
      const checkoutData = await paymentService.createCheckout({
        amount: project.sale_price,
        projectId: project.project_id || project.id,
        projectName: project.name,
        sellerId: project.owner_id,
        buyerId: user.user_id || user.id
      }, selectedPaymentMethod, {
        idempotencyKey
      });

      if (checkoutData.checkout_url || checkoutData.url) {
        // Store purchase attempt in session storage for recovery
        sessionStorage.setItem('pendingPurchase', JSON.stringify({
          projectId: project.project_id || project.id,
          timestamp: Date.now(),
          idempotencyKey
        }));
        
        window.location.href = checkoutData.checkout_url || checkoutData.url;
      } else {
        throw new Error('No checkout URL received from payment provider.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      
      let errorMessage = error.message || 'Payment failed. Please try again.';
      
      // Handle specific error types
      if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection failed. Please check your internet connection.';
      } else if (error.code === 'TIMEOUT') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.response?.status === 409) {
        errorMessage = 'You already have an active purchase process for this project.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Invalid request. Please check your input.';
      }
      
      setPurchaseError(errorMessage);
      toast.error(errorMessage, {
        duration: 6000,
      });
      
      // Allow retry
      setRetryCount(prev => prev + 1);
      setPurchaseInitiated(false);
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handlePaymentMethodSelect = (method) => {
    setSelectedPaymentMethod(method);
    setPurchaseError(null);
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
    setShowConfirmationModal(false);
    setInterestMessage('');
    setCommitments(new Set());
    setSelectedPaymentMethod('');
    setIsSubmitting(false);
    setPaymentProcessing(false);
    setValidationErrors({});
    setPurchaseError(null);
    
    // Additional cleanup to ensure modal is closed
    document.body.style.overflow = 'unset';
  }, []);

  // Handle backdrop clicks
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      forceCloseModal(e);
    }
  };

  // Loading state with skeleton screen
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <SEO title="Loading Project..." />
        <div className="max-w-7xl mx-auto px-4 pt-8">
          <ProjectDetailSkeleton />
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
            <div className="text-red-400 text-4xl mb-4">
              <AlertTriangle className="w-16 h-16 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Unable to Load Project</h2>
            <p className="text-red-400 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <motion.button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors duration-200 flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Loader2 className="w-4 h-4" />
                Try Again
              </motion.button>
              <motion.button
                onClick={() => navigate('/marketplace')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ArrowLeft className="w-4 h-4 mr-2 inline" />
                Back to Marketplace
              </motion.button>
            </div>
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
            className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors duration-200"
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
  const isOwner = user && project && (user.user_id === project.owner_id || user.id === project.owner_id);
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
            <div className="relative h-[35vh] min-h-[300px] rounded-3xl overflow-hidden bg-gray-900">
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
                        <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-sm font-medium flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          Featured
                        </div>
                      )}
                      {project.is_on_hold === 1 && (
                        <div className="px-3 py-1 bg-red-600/90 backdrop-blur-md border border-red-500/30 rounded-full text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2 animate-pulse">
                          <Clock4 className="w-4 h-4" />
                          On Hold / Under Negotiation
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
                        className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
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
                        <BookmarkCheck className="w-5 h-5 text-blue-400" />
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

        {/* Content Grid */}
        <div className="max-w-7xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.name}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-8"
              >
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-4">About This Project</h2>
                      <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {projectDescription}
                      </p>
                    </div>
                    
                    {project.detailed_description && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Details</h3>
                        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {project.detailed_description}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'demo' && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-white mb-4">Live Demo</h2>
                    {project.domain ? (
                      <div className="aspect-video rounded-xl overflow-hidden bg-gray-800">
                        <iframe
                          src={`https://${project.domain}`}
                          title="Live Demo"
                          className="w-full h-full"
                          sandbox="allow-same-origin allow-scripts"
                        />
                      </div>
                    ) : (
                      <p className="text-gray-400">No live demo available for this project.</p>
                    )}
                  </div>
                )}

                {activeTab === 'gallery' && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Project Gallery</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {project.gallery_images?.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Gallery ${index + 1}`}
                          className="rounded-xl w-full h-48 object-cover"
                        />
                      )) || (
                        <p className="text-gray-400 col-span-2">No gallery images available.</p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'code' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-4">Tech Stack</h2>
                      <div className="flex flex-wrap gap-2">
                        {techStack.map((tech, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {project.github_url && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Source Code</h3>
                        <a
                          href={project.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                        >
                          <Github className="w-5 h-5" />
                          View on GitHub
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'ai' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white mb-4">AI Insights</h2>
                    {project.ai_analysis ? (
                      <div className="space-y-4">
                        <div className="bg-gray-800/50 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-white mb-2">Overall Score</h3>
                          <div className="flex items-center gap-4">
                            <div className="text-4xl font-bold text-blue-400">
                              {project.ai_analysis.overall_score}/100
                            </div>
                            <div className="text-gray-400">
                              {project.ai_analysis.confidence_level} confidence
                            </div>
                          </div>
                        </div>
                        
                        {project.ai_analysis.insights && (
                          <div className="bg-gray-800/50 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-2">Key Insights</h3>
                            <p className="text-gray-300">{project.ai_analysis.insights}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-400">No AI analysis available for this project.</p>
                    )}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Purchase Card */}
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6 sticky top-24">
                <div className="mb-6">
                  <div className="text-sm text-gray-400 mb-1">Sale Price</div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-bold text-white">
                      {project.is_for_sale ? formatPrice(salePrice) : 'Not for Sale'}
                    </div>
                    {monthlyRevenue > 0 && (
                      <div className="text-blue-400 text-sm">
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
                      className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-gray-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-blue-700 hover:to-gray-700 transition-all duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Project
                    </motion.button>
                  ) : project.is_for_sale ? (
                    <>
                      {project.is_on_hold === 1 ? (
                        <div className="w-full px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center mb-4">
                          <p className="text-red-400 font-bold uppercase tracking-wider text-sm mb-1">Under Negotiation</p>
                          <p className="text-gray-400 text-xs text-balance">This project is currently on hold as the owner is in active discussions with a potential buyer.</p>
                        </div>
                      ) : (
                        <>
                          <motion.button
                            onClick={handleBuyNowClick}
                            disabled={isBuyButtonLoading || purchaseInitiated}
                            className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={{ scale: isBuyButtonLoading ? 1 : 1.02 }}
                            whileTap={{ scale: isBuyButtonLoading ? 1 : 0.98 }}
                          >
                            {isBuyButtonLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <DollarSign className="w-4 h-4" />
                            )}
                            {isBuyButtonLoading ? 'Processing...' : `Buy Now • ${formatPrice(salePrice)}`}
                          </motion.button>
                          <motion.button
                            onClick={() => setShowInterestModal(true)}
                            disabled={isOfferButtonLoading}
                            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-gray-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-blue-700 hover:to-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={{ scale: isOfferButtonLoading ? 1 : 1.02 }}
                            whileTap={{ scale: isOfferButtonLoading ? 1 : 0.98 }}
                          >
                            {isOfferButtonLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Heart className="w-4 h-4" />
                            )}
                            {isOfferButtonLoading ? 'Sending...' : 'Make Offer'}
                          </motion.button>
                        </>
                      )}
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
                    {isOwner && project.github_url && (
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

        {/* Confirmation Modal */}
        <AnimatePresence>
          {showConfirmationModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50"
              onClick={handleBackdropClick}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-gray-900 border border-white/[0.12] rounded-2xl p-8 max-w-md w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-yellow-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Confirm Purchase</h2>
                  <p className="text-gray-400">
                    You are about to purchase <span className="text-white font-semibold">{projectName}</span> for <span className="text-green-400 font-semibold">{formatPrice(salePrice)}</span>
                  </p>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-300">
                      <p className="mb-2">By proceeding, you agree to:</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-400">
                        <li>Pay the full amount of {formatPrice(salePrice)}</li>
                        <li>Complete the purchase process</li>
                        <li>Our terms of service and buyer protection policy</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <motion.button
                    onClick={() => setShowConfirmationModal(false)}
                    className="flex-1 px-6 py-3 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-xl transition-colors duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleConfirmPurchase}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Continue
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interest Modal */}
        <AnimatePresence>
          {showInterestModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50"
              onClick={handleBackdropClick}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-gray-900 border border-white/[0.12] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Make an Offer for {projectName}</h2>
                    <button
                      type="button"
                      onClick={forceCloseModal}
                      className="p-2 hover:bg-red-600 rounded-lg transition-colors duration-200 text-gray-400 hover:text-white z-10 relative bg-gray-800"
                      style={{ pointerEvents: 'auto' }}
                      title="Close modal (or press ESC)"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Press ESC key or click the X button above to close this modal</p>
                </div>

                <div className="space-y-6">
                  <p className="text-gray-300">
                    Your offer will be sent to the seller. This is a negotiation starting point.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Message to Seller <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={interestMessage}
                      onChange={handleMessageChange}
                      placeholder="Introduce yourself, your offer amount, and why you're interested in this project..."
                      className={`w-full h-32 px-4 py-3 bg-gray-800 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-colors ${
                        validationErrors.message 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-gray-700 focus:border-blue-500'
                      }`}
                    />
                    {validationErrors.message && (
                      <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {validationErrors.message}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {interestMessage.length}/2000 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-4">
                      Commitments (all required) <span className="text-red-400">*</span>
                    </label>
                    <div className={`space-y-3 p-4 rounded-xl border ${validationErrors.commitments ? 'border-red-500 bg-red-500/5' : 'border-gray-700'}`}>
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
                            className="mt-1 w-4 h-4 bg-gray-800 border border-gray-600 rounded focus:ring-blue-500 focus:ring-2 text-blue-600"
                          />
                          <span className="text-gray-300 text-sm">{commitment.text}</span>
                        </label>
                      ))}
                    </div>
                    {validationErrors.commitments && (
                      <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {validationErrors.commitments}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={forceCloseModal}
                      disabled={isSubmitting}
                      className="flex-1 px-6 py-3 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-xl transition-colors duration-200 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleInterestSubmit}
                      disabled={isSubmitting}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-gray-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-gray-700 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Offer
                        </>
                      )}
                    </button>
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
              onClick={handleBackdropClick}
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
                    onClick={forceCloseModal}
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

                  {/* Error Display */}
                  {purchaseError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-red-400 font-medium">Payment Error</p>
                          <p className="text-red-300/80 text-sm">{purchaseError}</p>
                          {retryCount > 0 && (
                            <p className="text-gray-400 text-sm mt-1">
                              Retry attempt {retryCount}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

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
                      onClick={forceCloseModal}
                      disabled={paymentProcessing}
                      className="flex-1 px-6 py-3 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-xl transition-colors duration-200 disabled:opacity-50"
                      whileHover={{ scale: paymentProcessing ? 1 : 1.02 }}
                      whileTap={{ scale: paymentProcessing ? 1 : 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={handlePurchase}
                      disabled={!selectedPaymentMethod || paymentProcessing}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center justify-center gap-2"
                      whileHover={{ scale: (!selectedPaymentMethod || paymentProcessing) ? 1 : 1.02 }}
                      whileTap={{ scale: (!selectedPaymentMethod || paymentProcessing) ? 1 : 0.98 }}
                    >
                      {paymentProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
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
