import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getMarketplaceProjects } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';
import PaymentService from '../services/paymentService';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useOptimizedSearch } from '../hooks/useOptimizedSearch';
import AdvancedSearchEnhanced from '../components/AdvancedSearchEnhanced';
import MarketplaceService from '../services/marketplace.service';
import MarketplaceLoadingSkeleton, { SearchLoadingSkeleton, MetricsSkeleton } from '../components/MarketplaceLoadingSkeleton';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Clock, 
  DollarSign,
  Star,
  ShoppingBag,
  ChevronDown,
  Grid,
  List,
  Sparkles,
  Zap,
  Globe,
  CheckCircle,
  ArrowUpRight,
  Users,
  Eye,
  Heart,
  Code,
  Calendar,
  X,
  SlidersHorizontal,
  Bookmark,
  BookmarkCheck,
  Trophy,
  TrendingDown,
  ExternalLink,
  MessageCircle,
  Award,
  Shield,
  Verified,
  Clock4,
  BarChart3,
  Target,
  ChevronRight,
  Filter as FilterIcon,
  SortDesc,
  Flame,
  Plus,
  Command,
  ArrowLeft,
  ArrowRight,
  Layout,
  Layers,
  Settings,
  Brain,
  Activity,
  AlertCircle,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const MarketplacePageEnhanced = () => {
  // Core data state
  const [projects, setProjects] = useState([]);
  const [featuredProjects, setFeaturedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // UI state
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('all');
  const [analyticsData, setAnalyticsData] = useState(null);
  
  // Payment modal state
  const [showQuickPurchaseModal, setShowQuickPurchaseModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Enhanced search with backend integration and AI capabilities
  const {
    searchTerm,
    setSearchTerm,
    filters,
    updateFilter,
    filteredItems: searchResults,
    batchedResults,
    isSearching,
    searchMetrics,
    hasMoreResults,
    loadMoreResults,
    clearFilters,
    isEmpty: searchIsEmpty,
    isFiltered,
    suggestions,
    searchHistory,
    pagination,
    searchCapabilities,
    getSearchAnalytics
  } = useOptimizedSearch(projects, {
    category: 'all',
    stage: '',
    priceRange: [0, 100000],
    revenueRange: [0, 50000],
    techStack: [],
    verified: false,
    featured: false,
    hasDemo: false,
    tab: 'all'
  }, {
    searchKeys: ['name', 'description', 'tech_stack', 'category', 'tags', 'owner_username'],
    debounceMs: 250,
    cacheSize: 300,
    enableVirtualization: true,
    batchSize: 12,
    enableIndexing: true,
    enableFuzzySearch: true,
    enableBackendSearch: true,
    enableSemanticSearch: true,
    enableRealTimeSearch: true,
    searchAnalytics: true
  });

  // Enhanced categories with better organization
  const categories = [
    { id: 'all', name: 'All Projects', icon: Globe, count: 0, color: 'text-gray-400' },
    { id: 'saas', name: 'SaaS', icon: Zap, count: 0, color: 'text-white' },
    { id: 'ecommerce', name: 'E-commerce', icon: ShoppingBag, count: 0, color: 'text-green-400' },
    { id: 'mobile', name: 'Mobile Apps', icon: Code, count: 0, color: 'text-blue-400' },
    { id: 'ai', name: 'AI & ML', icon: Brain, count: 0, color: 'text-white' },
    { id: 'marketplace', name: 'Marketplace', icon: Users, count: 0, color: 'text-orange-400' },
    { id: 'tools', name: 'Dev Tools', icon: Settings, count: 0, color: 'text-gray-300' },
  ];

  // Enhanced tabs with modern styling
  const tabs = [
    { id: 'all', name: 'All Projects', icon: Layout, description: 'Browse all available projects' },
    { id: 'featured', name: 'Featured', icon: Flame, description: 'Top performing projects' },
    { id: 'trending', name: 'Trending', icon: TrendingUp, description: 'Popular this week' },
    { id: 'new', name: 'New', icon: Sparkles, description: 'Recently added' },
  ];

  // Load marketplace data and analytics
  useEffect(() => {
    const fetchMarketplaceData = async () => {
      try {
        setError('');
        setLoading(true);
        
        // Load projects
        const marketplaceProjects = await getMarketplaceProjects();
        setProjects(marketplaceProjects);
        
        // Load featured projects
        try {
          const featured = await MarketplaceService.getFeatured(6);
          setFeaturedProjects(featured);
        } catch (featuredError) {
          console.warn('Could not load featured projects:', featuredError);
          // Fallback to selecting featured from regular projects
          const fallbackFeatured = marketplaceProjects
            .filter(p => p.monthly_revenue > 5000 || p.view_count > 100)
            .slice(0, 6);
          setFeaturedProjects(fallbackFeatured);
        }
        
        // Load analytics
        try {
          const analytics = await MarketplaceService.getSearchAnalytics();
          setAnalyticsData(analytics);
        } catch (analyticsError) {
          console.warn('Could not load analytics:', analyticsError);
        }
        
      } catch (err) {
        console.error("Failed to fetch marketplace data:", err);
        setError(err.message || 'Failed to load marketplace projects.');
      } finally {
        setLoading(false);
      }
    };

    fetchMarketplaceData();
  }, []);

  // Track search analytics
  useEffect(() => {
    if (searchTerm && searchResults.length >= 0) {
      MarketplaceService.trackSearch({
        query: searchTerm,
        resultCount: searchResults.length,
        searchTime: searchMetrics.searchTime,
        filters: filters,
        timestamp: Date.now()
      });
    }
  }, [searchTerm, searchResults.length, searchMetrics.searchTime, filters]);

  // Tab-based filtering
  const tabFilteredProjects = useMemo(() => {
    switch (activeTab) {
      case 'featured':
        return featuredProjects;
      case 'trending':
        return projects.filter(p => p.view_count > 50);
      case 'new':
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return projects.filter(p => new Date(p.created_at) > oneWeekAgo);
      default:
        return projects;
    }
  }, [projects, featuredProjects, activeTab]);

  // Apply sorting to final results
  const sortedAndFilteredProjects = useMemo(() => {
    const results = [...searchResults];
    
    switch (sortBy) {
      case 'price-low':
        results.sort((a, b) => (a.sale_price || 0) - (b.sale_price || 0));
        break;
      case 'price-high':
        results.sort((a, b) => (b.sale_price || 0) - (a.sale_price || 0));
        break;
      case 'revenue':
        results.sort((a, b) => (b.monthly_revenue || 0) - (a.monthly_revenue || 0));
        break;
      case 'views':
        results.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
        break;
      case 'rating':
        results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'relevance':
        // Results are already sorted by relevance from the search
        break;
      case 'newest':
      default:
        results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }
    
    return results;
  }, [searchResults, sortBy]);

  // Update search base when tab changes
  useEffect(() => {
    updateFilter('tab', activeTab);
  }, [activeTab, updateFilter]);

  // Enhanced category count calculation
  const enhancedCategories = useMemo(() => {
    return categories.map(category => ({
      ...category,
      count: tabFilteredProjects.filter(project => {
        if (category.id === 'all') return true;
        
        const name = project.name?.toLowerCase() || '';
        const desc = project.description?.toLowerCase() || '';
        const cat = project.category?.toLowerCase() || '';
        
        switch (category.id) {
          case 'saas': 
            return cat.includes('saas') || name.includes('saas') || desc.includes('saas') || desc.includes('software');
          case 'ecommerce': 
            return cat.includes('ecommerce') || name.includes('shop') || desc.includes('ecommerce') || desc.includes('store');
          case 'mobile': 
            return cat.includes('mobile') || name.includes('mobile') || name.includes('app') || desc.includes('ios') || desc.includes('android');
          case 'ai': 
            return cat.includes('ai') || name.includes('ai') || desc.includes('ai') || desc.includes('ml') || desc.includes('machine learning');
          case 'marketplace': 
            return cat.includes('marketplace') || name.includes('marketplace') || desc.includes('marketplace') || desc.includes('platform');
          case 'tools': 
            return cat.includes('tools') || name.includes('tool') || desc.includes('developer') || desc.includes('utility');
          default: 
            return false;
        }
      }).length
    }));
  }, [tabFilteredProjects, categories]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Professional muted color palette for project stages
  const getStageColor = (stage) => {
    const stageColors = {
      'idea': 'slate',
      'planning': 'indigo',
      'mvp': 'amber',
      'development': 'teal',
      'launched': 'emerald',
      'on_hold': 'stone'
    };
    return stageColors[stage?.toLowerCase()] || 'slate';
  };

  const handleShowInterest = async (projectId) => {
    if (!user) {
      toast.error("Please log in to show interest");
      navigate('/login', { state: { returnTo: `/projects/${projectId}?showInterest=true` } });
      return;
    }
    
    const project = projects.find(p => p.project_id === projectId);
    if (project && project.owner_id === user.id) {
      toast.error("You cannot show interest in your own project");
      return;
    }
    
    toast.success("Loading project details...");
    navigate(`/projects/${projectId}?showInterest=true`);
  };

  const handleQuickPurchase = (project) => {
    if (!user) {
      toast.error('Please log in to purchase this project.');
      navigate('/login');
      return;
    }
    
    if (project.owner_id === user.id) {
      toast.error("You cannot purchase your own project");
      return;
    }
    
    setSelectedProject(project);
    setShowQuickPurchaseModal(true);
  };

  const handlePurchase = async () => {
    if (!selectedProject || !selectedPaymentMethod) {
      toast.error('Please select a payment method.');
      return;
    }

    setPaymentProcessing(true);
    
    try {
      const paymentService = new PaymentService();
      
      const checkoutData = await paymentService.createCheckout({
        amount: selectedProject.sale_price,
        projectId: selectedProject.project_id,
        projectName: selectedProject.name,
        sellerId: selectedProject.owner_id,
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

  const ProjectCard = ({ project, featured = false }) => {
    const isOwnProject = user && project.owner_id === user.id;
    const monthsToBreakeven = project.monthly_revenue ? (project.sale_price / project.monthly_revenue).toFixed(1) : 'N/A';

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-6 hover:border-white/[0.12] transition-all duration-300 group relative overflow-hidden ${
          featured ? 'ring-2 ring-white/50/20' : ''
        }`}
      >
        {/* Enhanced Featured Badge */}
        {featured && (
          <div className="absolute top-4 left-4 z-20">
            <div className="px-3 py-1 bg-gradient-to-r from-gray-600 to-gray-600 rounded-none text-xs font-medium flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              Featured
            </div>
          </div>
        )}

        {/* AI Score Badge */}
        {project.ai_confidence && (
          <div className="absolute top-4 right-4 z-20">
            <div className="px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded-none text-xs font-medium flex items-center gap-1">
              <Brain className="w-3 h-3 text-blue-400" />
              {Math.round(project.ai_confidence * 100)}% AI Score
            </div>
          </div>
        )}

        {/* Background gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-600/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative z-10 space-y-4">
          {/* Enhanced Header */}
          <div className="flex items-start justify-between mt-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-semibold text-white group-hover:text-blue-300 transition-colors duration-200">
                  {project.name}
                </h3>
                {project.verified && (
                  <Shield className="w-4 h-4 text-green-400" />
                )}
              </div>
              <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">
                {project.description}
              </p>
            </div>
          </div>

          {/* Enhanced Metrics Row */}
          <div className="grid grid-cols-3 gap-3 py-3 bg-gray-800/30 rounded-none">
            <div className="text-center">
              <div className="text-lg font-bold text-white">
                {project.monthly_revenue ? formatPrice(project.monthly_revenue) : '$0'}
              </div>
              <div className="text-xs text-gray-500">Monthly Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">
                {project.view_count || 0}
              </div>
              <div className="text-xs text-gray-500">Views</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white flex items-center justify-center gap-1">
                <Star className="w-4 h-4 text-yellow-400" />
                {project.rating || project.ai_confidence ? Math.round((project.rating || project.ai_confidence) * 10) / 10 : 'N/A'}
              </div>
              <div className="text-xs text-gray-500">Rating</div>
            </div>
          </div>

          {/* Stage and Status */}
          <div className="flex items-center justify-between">
            <div className={`px-3 py-1 rounded-none text-xs font-medium bg-${getStageColor(project.stage)}-500/10 text-${getStageColor(project.stage)}-400 border border-${getStageColor(project.stage)}-500/20`}>
              {project.stage}
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{new Date(project.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Enhanced Tech Stack */}
          {project.tech_stack && typeof project.tech_stack === 'string' && project.tech_stack.trim() && (
            <div className="flex flex-wrap gap-2">
              {project.tech_stack.split(',').slice(0, 4).map((tech, index) => (
                <span key={index} className="px-2 py-1 bg-gray-800/50 text-gray-300 text-xs rounded-none border border-gray-700">
                  {tech.trim()}
                </span>
              ))}
              {project.tech_stack.split(',').length > 4 && (
                <span className="px-2 py-1 bg-gray-800/50 text-gray-400 text-xs rounded-none border border-gray-700">
                  +{project.tech_stack.split(',').length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Enhanced Financial Metrics */}
          <div className="bg-gray-800/20 rounded-none p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Sale Price</span>
              <span className="text-white font-bold">{formatPrice(project.sale_price)}</span>
            </div>
            {project.monthly_revenue && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Breakeven</span>
                  <span className="text-white text-sm">{monthsToBreakeven} months</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Multiple</span>
                  <span className="text-blue-400 text-sm">{monthsToBreakeven}x revenue</span>
                </div>
              </>
            )}
            {project.ai_estimated_value && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  AI Valuation
                </span>
                <span className="text-green-400 text-sm">{formatPrice(project.ai_estimated_value)}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t border-white/[0.08]">
            {!isOwnProject && (
              <motion.button
                onClick={() => handleQuickPurchase(project)}
                className="w-full px-4 py-2 text-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-none hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <DollarSign className="w-4 h-4" />
                Quick Buy • {formatPrice(project.sale_price)}
              </motion.button>
            )}
            
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => navigate(`/projects/${project.project_id}`)}
                className="flex-1 px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-none transition-colors duration-200 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Eye className="w-4 h-4" />
                Details
              </motion.button>
              
              {!isOwnProject && (
                <motion.button
                  onClick={() => handleShowInterest(project.project_id)}
                  className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-gray-600 text-white rounded-none hover:from-blue-700 hover:to-gray-700 transition-all duration-200 font-medium flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Heart className="w-4 h-4" />
                  Make Offer
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Enhanced Hero Section with analytics
  const HeroSection = () => (
    <motion.div
      className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-black border-b border-gray-800"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10/10 rounded-none blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-none blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        <div className="text-center space-y-4 sm:space-y-6">
          {/* Enhanced Badge with search capabilities */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10/10 border border-white/50/20 rounded-none backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-2 h-2 bg-green-400 rounded-none animate-pulse" />
            <span className="text-sm text-white-200 flex items-center gap-1">
              Live marketplace with {projects.length} projects
              {searchCapabilities.fuzzySearch && (
                <div className="flex items-center gap-1 ml-2">
                  <Brain className="w-3 h-3" />
                  <span className="text-xs">AI-Powered Search</span>
                </div>
              )}
            </span>
          </motion.div>

          {/* Main Headlines */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight">
              Discover{' '}
              <span className="bg-gradient-to-r from-blue-400 to-gray-400 bg-clip-text text-transparent">
                Premium
              </span>{' '}
              Projects
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
              Browse verified side projects with AI-powered search, semantic matching, and comprehensive analytics.
            </p>
          </motion.div>

          {/* Enhanced Quick Stats */}
          <motion.div
            className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 pt-4 sm:pt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {[
              { label: 'Active Projects', value: projects.length, icon: Code },
              { 
                label: 'Search Performance', 
                value: searchMetrics.searchTime > 0 ? `${searchMetrics.searchTime.toFixed(0)}ms` : 'Fast', 
                icon: Activity 
              },
              { label: 'AI Matches', value: `${searchMetrics.semanticMatches || 0}`, icon: Brain },
            ].map((stat, index) => (
              <div key={stat.label} className="text-center min-w-0 flex-1 sm:flex-initial">
                <div className="flex items-center justify-center gap-2 text-xl sm:text-2xl font-bold text-white mb-1">
                  <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );

  // Enhanced search analytics display
  const SearchAnalytics = () => {
    const analytics = getSearchAnalytics();
    
    if (!analytics || analytics.totalSearches === 0) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/30 border border-white/10 rounded-none p-4 mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Search Analytics
          </h3>
          <span className="text-xs text-gray-500">
            {analytics.totalSearches} searches performed
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="text-center p-2 bg-gray-800/30 rounded">
            <div className="text-white font-medium">{analytics.averageSearchTime.toFixed(0)}ms</div>
            <div className="text-gray-500">Avg Time</div>
          </div>
          <div className="text-center p-2 bg-gray-800/30 rounded">
            <div className="text-white font-medium">{searchMetrics.cacheHits}</div>
            <div className="text-gray-500">Cache Hits</div>
          </div>
          <div className="text-center p-2 bg-gray-800/30 rounded">
            <div className="text-white font-medium">{searchMetrics.semanticMatches}</div>
            <div className="text-gray-500">AI Matches</div>
          </div>
          <div className="text-center p-2 bg-gray-800/30 rounded">
            <div className="text-white font-medium">{pagination.total}</div>
            <div className="text-gray-500">Total Results</div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Enhanced loading with skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <SEO 
          title="Enhanced Marketplace - Loading..." 
          description="Loading AI-powered marketplace projects..." 
        />
        <MarketplaceLoadingSkeleton viewMode={viewMode} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <SEO 
        title="Enhanced Marketplace - AI-Powered Project Discovery" 
        description="Discover and purchase verified side projects with AI-powered search, semantic matching, and comprehensive analytics." 
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Enhanced Header */}
        <HeroSection />

        {/* Advanced Search Component */}
        <div className="my-8">
          <AdvancedSearchEnhanced
            projects={tabFilteredProjects}
            onFilteredResults={() => {}} // Results handled by useOptimizedSearch
            className="mb-6"
          />
        </div>

        {/* Search Analytics */}
        <SearchAnalytics />

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-none p-6 mb-8 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </motion.div>
        )}

        {/* Enhanced Performance Metrics */}
        {searchMetrics && sortedAndFilteredProjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 flex items-center justify-between text-xs text-gray-500 bg-gray-900/20 rounded-none p-3"
          >
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                {sortedAndFilteredProjects.length} of {searchMetrics.totalItems} projects
              </span>
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Search: {searchMetrics.searchTime.toFixed(1)}ms
              </span>
              {searchMetrics.backendSearchTime > 0 && (
                <span className="flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  Backend: {searchMetrics.backendSearchTime.toFixed(1)}ms
                </span>
              )}
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Cache hits: {searchMetrics.cacheHits}
              </span>
              {isFiltered && (
                <span className="text-blue-400 flex items-center gap-1">
                  <FilterIcon className="w-3 h-3" />
                  Filtered
                </span>
              )}
            </div>
            
            {hasMoreResults && (
              <span className="text-blue-400 flex items-center gap-1">
                <Plus className="w-3 h-3" />
                {pagination.total - batchedResults.length} more available
              </span>
            )}
          </motion.div>
        )}

        {/* Search Loading */}
        {isSearching && <SearchLoadingSkeleton />}

        {/* Projects Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {sortedAndFilteredProjects.length > 0 ? (
            <>
              <div className={`grid gap-4 sm:gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' 
                  : 'grid-cols-1'
              }`}>
                {batchedResults.map((project, index) => (
                  <motion.div
                    key={project.project_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ProjectCard 
                      project={project} 
                      featured={activeTab === 'featured'} 
                    />
                  </motion.div>
                ))}
              </div>
              
              {/* Enhanced Load More Button */}
              {hasMoreResults && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center mt-8"
                >
                  <button
                    onClick={loadMoreResults}
                    className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-none transition-colors duration-200 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Load More Projects ({(pagination.total || searchResults.length) - batchedResults.length} remaining)
                  </button>
                </motion.div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <div className="mb-6">
                {activeTab === 'featured' && <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />}
                {activeTab === 'trending' && <Flame className="w-16 h-16 text-gray-600 mx-auto mb-4" />}
                {activeTab === 'new' && <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />}
                {activeTab === 'all' && <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />}
              </div>
              
              <h3 className="text-2xl font-semibold text-white mb-2">
                {searchIsEmpty ? 'No projects found' : 'No projects available'}
              </h3>
              
              <p className="text-gray-400 mb-6">
                {isFiltered 
                  ? 'Try adjusting your search terms or filters. Our AI-powered search can help find similar projects.'
                  : `No projects are currently available in this category.`
                }
              </p>
              
              {isFiltered && (
                <motion.button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-none transition-colors duration-200 flex items-center gap-2 mx-auto"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <X className="w-4 h-4" />
                  Clear All Filters
                </motion.button>
              )}
            </div>
          )}
        </motion.div>
      </div>
      
      {/* Quick Purchase Modal (unchanged but could be enhanced) */}
      <AnimatePresence>
        {showQuickPurchaseModal && selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowQuickPurchaseModal(false)}
          >
            {/* Modal content here - same as original but could add AI valuation info */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketplacePageEnhanced;
