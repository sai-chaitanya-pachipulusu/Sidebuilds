import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import {
  getProjectById,
  getDueDiligenceReport,
  initiateProjectCheckout
} from '../services/api';
import ProjectDetailSkeleton from '../components/ProjectDetailSkeleton';
import ErrorBoundary from '../components/ErrorBoundary';
import ProjectQA from '../components/ProjectQA';
import ProjectReviews from '../components/ProjectReviews';
import BuyerBrief from '../components/BuyerBrief';
import ProjectInquiryModal from '../components/ProjectInquiryModal';
import { loginDestination, safeReturnTo } from '../utils/navigation';
import { 
  DollarSign, Zap, Shield, Users, Calendar, ArrowLeft, Share2, Bookmark, 
  Code2, Eye, PlayCircle, ImageIcon, TrendingUp, Star, Edit3, Heart, 
  Github, CheckCircle, BookmarkCheck, Trophy, ExternalLink,
  Lightbulb, Clock4, Loader2, Info, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

// Generate unique idempotency key
const generateIdempotencyKey = () => {
  return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const normalizeExternalUrl = (value) => {
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname === 'localhost' || url.hostname.includes('.') ? url.href : null;
  } catch (_error) {
    return null;
  }
};

const ProjectDetailPage = () => {
  const { id: projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State management with proper initialization
  const [project, setProject] = useState(null);
  const [questionPrompt, setQuestionPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBuyButtonLoading, setIsBuyButtonLoading] = useState(false);
  const [dueDiligenceReport, setDueDiligenceReport] = useState(null);
  const [isDueDiligenceLoading, setIsDueDiligenceLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportRetry, setReportRetry] = useState(0);
  const isPublicListing = project?.is_public === true || project?.is_public === 1;
  
  const purchaseLock = useRef(false);

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

  useEffect(() => {
    setShowInterestModal(false);
    setDueDiligenceReport(null);
    setQuestionPrompt(null);
    setReportError('');
    setIsDueDiligenceLoading(false);
  }, [projectId]);

  // Request a buyer report only when someone opens AI Insights on a public listing.
  useEffect(() => {
    if (activeTab !== 'ai' || !isPublicListing || project?.project_id !== projectId || dueDiligenceReport) return;
    let cancelled = false;
    setReportError('');
    setIsDueDiligenceLoading(true);
    getDueDiligenceReport(projectId).then(report => {
      if (cancelled) return;
      setDueDiligenceReport(report);
      setIsDueDiligenceLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setReportError('The buyer report could not be loaded. Your project details are still available.');
      setIsDueDiligenceLoading(false);
    });
    return () => { cancelled = true; };
  }, [activeTab, isPublicListing, project?.project_id, projectId, dueDiligenceReport, reportRetry]);
  
  // Handle URL parameters - opens modal once and clears the URL param
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('showInterest') === 'true' && project && user) {
      setShowInterestModal(true);
      // Clear the URL parameter to prevent re-opening on state changes
      queryParams.delete('showInterest');
      navigate({ pathname: location.pathname, search: queryParams.toString() }, { replace: true, state: location.state });
    }
  }, [location.search, location.pathname, location.state, project, user, navigate]);

  // Start a shared scope review. Payment is available only after both approvals.
  const handleBuyNowClick = async () => {
    if (!user) {
      navigate(loginDestination(location.pathname + location.search), { state: location.state });
      return;
    }
    if (purchaseLock.current) return;
    purchaseLock.current = true;
    setIsBuyButtonLoading(true);
    try {
      const purchaseRequest = await initiateProjectCheckout(project.project_id || project.id, generateIdempotencyKey());
      const requestId = purchaseRequest.purchase_request_id || purchaseRequest.request_id || purchaseRequest.id;
      if (!requestId) throw new Error('The purchase could not be opened. Please retry.');
      navigate(`/purchase-agreement/${requestId}`);
    } catch (failure) {
      toast.error(failure.response?.data?.error || failure.error || failure.message || 'Unable to start the purchase agreement.');
    } finally {
      purchaseLock.current = false;
      setIsBuyButtonLoading(false);
    }
  };

  // Loading state with skeleton screen
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
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
            className="bg-gray-900/50 backdrop-blur-sm border border-red-500/20 rounded-none p-8"
          >
            <div className="text-red-400 text-4xl mb-4">
              <AlertTriangle className="w-16 h-16 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Unable to Load Project</h2>
            <p className="text-red-400 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <motion.button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-none transition-colors duration-200 flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Loader2 className="w-4 h-4" />
                Try Again
              </motion.button>
              <motion.button
                onClick={() => navigate('/marketplace')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-none transition-colors duration-200"
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
            className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-none transition-colors duration-200"
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
  const healthScore = project.project_health_score || project.overall_score || project.ai_analysis?.overall_score;
  const updatedDate = project.updated_at
    ? new Date(project.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const formatPrice = (price) => {
    if (!price || price === 0) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: Number.isInteger(Number(price)) ? 0 : 2,
      maximumFractionDigits: 2,
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
        noindex={!(project.is_public === true || project.is_public === 1)}
      />
      
      <div className="min-h-screen bg-black">
        {/* Back Button */}
        <div className="max-w-7xl mx-auto px-4 pt-8">
          <motion.button
            onClick={() => navigate(safeReturnTo(location.state?.marketplaceSearch, isOwner ? '/my-projects' : '/marketplace'))}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200 mb-6"
            whileHover={{ x: -4 }}
          >
            <ArrowLeft className="w-4 h-4" />
            {location.state?.marketplaceSearch ? 'Back to results' : isOwner ? 'My projects' : 'Marketplace'}
          </motion.button>
        </div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="max-w-7xl mx-auto px-4 pb-8">
            <div className="relative h-[35vh] min-h-[300px] rounded-none overflow-hidden bg-gray-900">
              <img 
                src={project.cover_image_url || '/project-placeholder.svg'}
                alt={projectName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/65" />
              
              {/* Project Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="flex items-end justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      {Boolean(project.verified) && (
                        <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-none text-green-400 text-sm font-medium flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Verified
                        </div>
                      )}
                      {Boolean(project.is_verified) && (
                        <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-none text-green-400 text-sm font-medium flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Verified Seller
                        </div>
                      )}
                      {Boolean(healthScore) && (
                        <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-none text-blue-300 text-sm font-medium flex items-center gap-1">
                          <Lightbulb className="w-3 h-3" />
                          Health {Math.round(healthScore)}/100
                        </div>
                      )}
                      {Boolean(project.is_featured) && (
                        <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-none text-blue-400 text-sm font-medium flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          Featured
                        </div>
                      )}
                      {(project.is_on_hold === 1 || project.is_on_hold === true || project.checkout_reserved === true || project.checkout_reserved === 1) && (
                        <div className="px-3 py-1 bg-red-600/90 backdrop-blur-md border border-red-500/30 rounded-none text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2 animate-pulse">
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
                      {updatedDate && (
                        <div className="flex items-center gap-1">
                          <Clock4 className="w-4 h-4" />
                          Updated {updatedDate}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={() => setIsBookmarked(!isBookmarked)}
                      className="p-3 bg-gray-800/80 backdrop-blur-sm rounded-none hover:bg-gray-700/80 transition-colors duration-200"
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
                      className="p-3 bg-gray-800/80 backdrop-blur-sm rounded-none hover:bg-gray-700/80 transition-colors duration-200"
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
                      className={`flex items-center gap-2 px-4 py-2 rounded-none whitespace-nowrap transition-all duration-200 ${
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
                className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-8"
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
                    <BuyerBrief details={project.stage_details} onAsk={!isOwner && isPublicListing ? text => setQuestionPrompt({ text }) : undefined} />
                  </div>
                )}

                {activeTab === 'demo' && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-white mb-4">Live Demo</h2>
                    {normalizeExternalUrl(project.demo_url || project.domain) ? (
                      <div className="aspect-video rounded-none overflow-hidden bg-gray-800">
                        <iframe
                          src={normalizeExternalUrl(project.demo_url || project.domain)}
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
                          className="rounded-none w-full h-48 object-cover"
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
                            className="px-3 py-1 bg-gray-800 text-gray-300 rounded-none text-sm"
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
                          href={normalizeExternalUrl(project.github_url) || undefined}
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
                        <div className="bg-gray-800/50 rounded-none p-6">
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
                          <div className="bg-gray-800/50 rounded-none p-6">
                            <h3 className="text-lg font-semibold text-white mb-2">Key Insights</h3>
                            <p className="text-gray-300">{project.ai_analysis.insights}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-400">No AI analysis available for this project.</p>
                    )}

                    <div className="bg-gray-800/50 rounded-none p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">AI Due Diligence Report</h3>
                        {dueDiligenceReport?.source && (
                          <span className="text-xs text-gray-500 uppercase tracking-wider">{dueDiligenceReport.source}</span>
                        )}
                      </div>

                      {!isPublicListing ? (
                        <p className="text-gray-300">Buyer reports are available for public listings. Keep working privately and publish when you are ready.</p>
                      ) : isDueDiligenceLoading ? (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating buyer report...
                        </div>
                      ) : dueDiligenceReport ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            ['Strengths', dueDiligenceReport.strengths],
                            ['Risks', dueDiligenceReport.risks],
                            ['Questions to Ask', dueDiligenceReport.questions_to_ask_seller],
                            ['Valuation Concerns', dueDiligenceReport.valuation_concerns],
                            ['Transfer Checklist', dueDiligenceReport.transfer_checklist]
                          ].map(([title, items]) => (
                            <div key={title} className="border border-white/[0.08] p-4">
                              <h4 className="text-sm font-semibold text-blue-300 mb-3">{title}</h4>
                              <ul className="space-y-2 text-sm text-gray-300">
                                {(items || []).map((item, index) => (
                                  <li key={index} className="flex gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <p role={reportError ? 'alert' : undefined} className="text-gray-400">{reportError || 'Due diligence report is not available right now.'}</p>
                          {reportError && <button type="button" onClick={() => setReportRetry(value => value + 1)} className="mt-3 text-sm text-blue-300 underline underline-offset-4">Retry report</button>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Purchase Card */}
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-6 sticky top-24">
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
                      <span>Project Health</span>
                    </div>
                    <span className="text-white font-medium">
                      {healthScore ? `${Math.round(healthScore)}/100` : 'Pending'}
                    </span>
                  </div>

                  <div className="rounded-none border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-blue-300 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-white">Buyer Protection</div>
                        <p className="text-xs text-gray-400">
                          Payments use Stripe checkout, purchase requests track transfer status, and buyers confirm receipt before the workflow is completed.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={project.is_verified ? 'text-green-300' : 'text-gray-500'}>
                        {project.is_verified ? 'Seller verified' : 'Seller not verified'}
                      </div>
                      <div className={project.revenue_verified ? 'text-green-300' : 'text-gray-500'}>
                        {project.revenue_verified ? 'Revenue verified' : 'Revenue not verified'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {isOwner ? (
                    <motion.button
                      onClick={() => navigate(`/projects/edit/${projectId}`)}
                      className="w-full px-6 py-3 bg-neutral-800   text-white rounded-none font-medium flex items-center justify-center gap-2   transition-all duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Project
                    </motion.button>
                  ) : project.is_for_sale ? (
                    <>
                      {(project.is_on_hold === 1 || project.is_on_hold === true || project.checkout_reserved === true || project.checkout_reserved === 1) ? (
                        <div className="w-full px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-none text-center mb-4">
                          <p className="text-red-400 font-bold uppercase tracking-wider text-sm mb-1">Checkout or handover in progress</p>
                          <p className="text-gray-400 text-xs text-balance">This project is currently reserved or on hold. If this is your purchase, continue from your purchase agreement.</p>
                          <RouterLink to="/purchases" className="inline-block mt-3 text-sm text-emerald-300 underline">Open my purchases</RouterLink>
                        </div>
                      ) : (
                        <>
                          <motion.button
                            onClick={handleBuyNowClick}
                            disabled={isBuyButtonLoading}
                            className="w-full px-6 py-3 bg-neutral-800   text-white rounded-none font-medium flex items-center justify-center gap-2   transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={{ scale: isBuyButtonLoading ? 1 : 1.02 }}
                            whileTap={{ scale: isBuyButtonLoading ? 1 : 0.98 }}
                          >
                            {isBuyButtonLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <DollarSign className="w-4 h-4" />
                            )}
                            {isBuyButtonLoading ? 'Opening agreement…' : `Start purchase • ${formatPrice(salePrice)}`}
                          </motion.button>
                          <motion.button
                            onClick={() => user ? setShowInterestModal(true) : navigate(loginDestination(`${location.pathname}?showInterest=true`), { state: location.state })}
                            className="w-full px-6 py-3 bg-neutral-800   text-white rounded-none font-medium flex items-center justify-center gap-2   transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Heart className="w-4 h-4" />
                            Contact seller
                          </motion.button>
                        </>
                      )}
                    </>
                  ) : (
                    <button
                      disabled
                      className="w-full px-6 py-3 bg-gray-700 text-gray-400 rounded-none font-medium cursor-not-allowed"
                    >
                      Not Available for Purchase
                    </button>
                  )}
                  
                  {/* External Links - visible to everyone */}
                  {(() => {
                    const websiteUrl = normalizeExternalUrl(project.demo_url || project.domain);
                    return (
                      <div className="flex gap-3">
                        {project.github_url && (
                          <motion.a
                            href={normalizeExternalUrl(project.github_url) || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-none transition-colors duration-200 flex items-center justify-center gap-2"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Github className="w-4 h-4" />
                            Code
                          </motion.a>
                        )}
                        
                        {websiteUrl && (
                          <motion.a
                            href={websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-none transition-colors duration-200 flex items-center justify-center gap-2 font-medium"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <ExternalLink className="w-4 h-4" />
                            Visit Website
                          </motion.a>
                        )}
                      </div>
                    );
                  })()}

                </div>
              </div>
            </div>
          </div>

          {/* Community: Q&A and verified-buyer reviews */}
          {project && (
            <div className="max-w-7xl mx-auto px-4 pb-16">
              <ProjectQA projectId={projectId} ownerId={project.owner_id} isPublic={isPublicListing} questionPrompt={questionPrompt} />
              <ProjectReviews projectId={projectId} />
            </div>
          )}
        </div>

        {/* Interest Modal */}
        <ProjectInquiryModal key={projectId} open={showInterestModal} onClose={() => setShowInterestModal(false)} projectId={projectId} projectName={projectName}
          onContinue={(requestId, draft) => { setShowInterestModal(false); navigate(`/purchase-agreement/${requestId}#purchase-conversation`, { state: draft ? { inquiryDraft: draft, inquiryRequestId: String(requestId) } : null }); }} />


      </div>
    </>
  );
};

export default ProjectDetailPage;
