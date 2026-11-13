import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getMarketplaceProjects } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';
import PaymentService from '../services/paymentService';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useOptimizedSearch } from '../hooks/useOptimizedSearch';
import { useDebounce } from '../hooks/useDebounce';
import MarketplaceLoadingSkeleton, { SearchLoadingSkeleton, MetricsSkeleton, LoadMoreSkeleton } from '../components/MarketplaceLoadingSkeleton';
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
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useEscapeKey } from '../hooks/useEscapeKey';

const MarketplacePage = () => {
  // Core data state
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [featuredProjects, setFeaturedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // UI state
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [wishlist, setWishlist] = useState(new Set());
  const [activeTab, setActiveTab] = useState('all');
  
  // Payment modal state
  const [showQuickPurchaseModal, setShowQuickPurchaseModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Close modal with ESC key
  useEscapeKey(() => {
    if (showQuickPurchaseModal) {
      setShowQuickPurchaseModal(false);
    }
  }, showQuickPurchaseModal);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Enhanced search with optimization
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
    isFiltered
  } = useOptimizedSearch(projects, {
    category: 'all',
    stage: '',
    priceRange: '',
    revenueRange: [0, 100000],
    tab: 'all'
  }, {
    searchKeys: ['name', 'description', 'tech_stack', 'creator_username'],
    debounceMs: 300,
    cacheSize: 200,
    enableVirtualization: true,
    batchSize: 15,
    enableIndexing: true,
    enableFuzzySearch: true
  });

  // Enhanced categories with better organization - Chronicle/Linear inspired
  const categories = [
    { id: 'all', name: 'All Projects', icon: Globe, count: 0, color: 'text-gray-400' },
    { id: 'saas', name: 'SaaS', icon: Zap, count: 0, color: 'text-gray-300' },
    { id: 'ecommerce', name: 'E-commerce', icon: ShoppingBag, count: 0, color: 'text-gray-300' },
    { id: 'mobile', name: 'Mobile Apps', icon: Code, count: 0, color: 'text-gray-300' },
    { id: 'ai', name: 'AI & ML', icon: Sparkles, count: 0, color: 'text-gray-300' },
    { id: 'marketplace', name: 'Marketplace', icon: Users, count: 0, color: 'text-gray-300' },
    { id: 'tools', name: 'Dev Tools', icon: Settings, count: 0, color: 'text-gray-300' },
  ];

  // Enhanced tabs with modern styling
  const tabs = [
    { id: 'all', name: 'All Projects', icon: Layout, description: 'Browse all available projects' },
    { id: 'featured', name: 'Featured', icon: Flame, description: 'Top performing projects' },
    { id: 'trending', name: 'Trending', icon: TrendingUp, description: 'Popular this week' },
    { id: 'new', name: 'New', icon: Sparkles, description: 'Recently added' },
  ];

  useEffect(() => {
    const fetchMarketplaceProjects = async () => {
      try {
        setError('');
        setLoading(true);
        const marketplaceProjects = await getMarketplaceProjects();
        setProjects(marketplaceProjects);
        setFilteredProjects(marketplaceProjects);
        
        // Set featured projects (top revenue or trending)
        const featured = marketplaceProjects
          .filter(p => p.monthly_revenue > 5000 || p.view_count > 100)
          .slice(0, 6);
        setFeaturedProjects(featured);
        
      } catch (err) {
        console.error("Failed to fetch marketplace projects:", err);
        setError(err.message || 'Failed to load marketplace projects.');
      } finally {
        setLoading(false);
      }
    };

    fetchMarketplaceProjects();
    
    // Load wishlist from localStorage
    const savedWishlist = localStorage.getItem('marketplace_wishlist');
    if (savedWishlist) {
      setWishlist(new Set(JSON.parse(savedWishlist)));
    }
  }, []);

  // Tab-based filtering before search
  const tabFilteredProjects = useMemo(() => {
    if (activeTab === 'featured') {
      return featuredProjects;
    } else if (activeTab === 'trending') {
      return projects.filter(p => p.view_count > 50);
    } else if (activeTab === 'new') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return projects.filter(p => new Date(p.created_at) > oneWeekAgo);
    }
    return projects;
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
  }, [activeTab]); // Removed updateFilter from dependencies to prevent infinite loop

  // Enhanced category count calculation
  const enhancedCategories = useMemo(() => {
    return categories.map(category => ({
      ...category,
      count: tabFilteredProjects.filter(project => {
        if (category.id === 'all') return true;
        
        const name = project.name.toLowerCase();
        const desc = project.description.toLowerCase();
        
        switch (category.id) {
          case 'saas': return name.includes('saas') || desc.includes('saas') || desc.includes('software');
          case 'ecommerce': return name.includes('shop') || desc.includes('ecommerce') || desc.includes('store');
          case 'mobile': return name.includes('mobile') || name.includes('app') || desc.includes('ios') || desc.includes('android');
          case 'ai': return name.includes('ai') || desc.includes('ai') || desc.includes('ml') || desc.includes('machine learning');
          case 'marketplace': return name.includes('marketplace') || desc.includes('marketplace') || desc.includes('platform');
          case 'tools': return name.includes('tool') || desc.includes('developer') || desc.includes('utility');
          default: return false;
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

  // Professional muted color palette for project stages - returns full class names
  const getStageColorClasses = (stage) => {
    const stageColors = {
      'idea': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      'planning': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      'mvp': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'development': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      'launched': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'on_hold': 'bg-stone-500/10 text-stone-400 border-stone-500/20'
    };
    return stageColors[stage?.toLowerCase()] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
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

  const toggleWishlist = (projectId) => {
    const newWishlist = new Set(wishlist);
    
    if (newWishlist.has(projectId)) {
      newWishlist.delete(projectId);
      toast.success("Removed from wishlist");
    } else {
      newWishlist.add(projectId);
      toast.success("Added to wishlist");
    }
    
    setWishlist(newWishlist);
    localStorage.setItem('marketplace_wishlist', JSON.stringify([...newWishlist]));
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
    const isInWishlist = wishlist.has(project.project_id);
    const monthsToBreakeven = project.monthly_revenue ? (project.sale_price / project.monthly_revenue).toFixed(1) : 'N/A';

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-6 hover:border-white/[0.12] transition-all duration-300 group relative overflow-hidden ${
          featured ? 'ring-2 ring-blue-500/20' : ''
        }`}
      >
        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-4 left-4 z-20">
            <div className="px-3 py-1 bg-neutral-800   rounded-none text-xs font-medium flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              Featured
            </div>
          </div>
        )}

        {/* On Hold / Under Negotiation Badge */}
        {project.is_on_hold === 1 && (
          <div className="absolute top-4 left-4 z-20">
            <div className="px-3 py-1 bg-red-600/90 backdrop-blur-md rounded-none text-white text-[10px] font-bold uppercase tracking-wider shadow-lg border border-red-400/30 flex items-center gap-1.5 animate-pulse">
              <Clock4 className="w-3 h-3" />
              On Hold
            </div>
          </div>
        )}

        {/* Wishlist Button */}
        <div className="absolute top-4 right-4 z-20">
          <motion.button
            onClick={() => toggleWishlist(project.project_id)}
            className="p-2 bg-gray-800/80 backdrop-blur-sm rounded-none hover:bg-gray-700/80 transition-colors duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isInWishlist ? (
              <BookmarkCheck className="w-4 h-4 text-blue-400" />
            ) : (
              <Bookmark className="w-4 h-4 text-gray-400" />
            )}
          </motion.button>
        </div>

        {/* Background gradient on hover */}
        <div className="absolute inset-0 bg-black/20   opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative z-10 space-y-4">
          {/* Header */}
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

          {/* Metrics Row */}
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
                {project.rating || 'N/A'}
              </div>
              <div className="text-xs text-gray-500">Rating</div>
            </div>
          </div>

          {/* Stage and Status */}
          <div className="flex items-center justify-between">
            <div className={`px-3 py-1 rounded-none text-xs font-medium ${getStageColorClasses(project.stage)}`}>
              {project.stage}
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{new Date(project.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Tech Stack */}
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

          {/* Financial Metrics */}
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
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t border-white/[0.08]">
            {!isOwnProject && (
              <motion.button
                disabled={project.is_on_hold === 1}
                onClick={() => handleQuickPurchase(project)}
                className={`w-full px-4 py-2 text-sm rounded-none transition-all duration-200 font-medium flex items-center justify-center gap-2 ${
                  project.is_on_hold === 1
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                    : 'bg-neutral-800   text-white  '
                }`}
                whileHover={project.is_on_hold === 1 ? {} : { scale: 1.02 }}
                whileTap={project.is_on_hold === 1 ? {} : { scale: 0.98 }}
              >
                <DollarSign className="w-4 h-4" />
                {project.is_on_hold === 1 ? 'Currently on Hold' : `Quick Buy • ${formatPrice(project.sale_price)}`}
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
                  disabled={project.is_on_hold === 1}
                  onClick={() => handleShowInterest(project.project_id)}
                  className={`flex-1 px-4 py-2 text-sm rounded-none transition-all duration-200 font-medium flex items-center justify-center gap-2 ${
                    project.is_on_hold === 1
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                      : 'bg-neutral-800   text-white  '
                  }`}
                  whileHover={project.is_on_hold === 1 ? {} : { scale: 1.02 }}
                  whileTap={project.is_on_hold === 1 ? {} : { scale: 0.98 }}
                >
                  <Heart className="w-4 h-4" />
                  {project.is_on_hold === 1 ? 'On Hold' : 'Make Offer'}
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Enhanced Hero Section - Antimetal/Linear inspired
  const HeroSection = () => (
    <motion.div
      className="relative bg-neutral-800    border-b border-gray-800"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-none blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-none blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        <div className="text-center space-y-4 sm:space-y-6">
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-none backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-2 h-2 bg-green-400 rounded-none animate-pulse" />
            <span className="text-sm text-blue-200">Live marketplace with {projects.length} projects</span>
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
              <span className="    text-neutral-100">
                Premium
              </span>{' '}
              Projects
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
              Browse verified side projects from top makers. Find your next acquisition or inspiration.
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 pt-4 sm:pt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {[
              { label: 'Active Projects', value: projects.length, icon: Code },
              { label: 'Total GMV', value: '$2.3M+', icon: DollarSign },
              { label: 'Success Rate', value: '94%', icon: Target },
            ].map((stat, index) => (
              <div key={stat.label} className="text-center min-w-0 flex-1 sm:flex-initial">
                <div className="flex items-center justify-center gap-2 text-xl sm:text-2xl font-bold text-white mb-1">
                  <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
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

  // Enhanced Search and Filter Bar - Chronicle inspired
  const SearchAndFilters = () => (
    <motion.div
      className="sticky top-16 z-40 bg-black/90 backdrop-blur-xl border-b border-gray-800"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="space-y-4 sm:space-y-6">
          
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search projects, technologies, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-16 sm:pr-4 py-3 sm:py-4 bg-gray-900/50 border border-gray-700 rounded-none sm:rounded-none text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-sm sm:text-base"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 hidden sm:flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-800 text-gray-400 text-xs rounded border">⌘</kbd>
              <kbd className="px-2 py-1 bg-gray-800 text-gray-400 text-xs rounded border">K</kbd>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-none sm:rounded-none text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.name}
                  </motion.button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center bg-gray-800/50 rounded-none p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-gray-800/50 border border-gray-700 rounded-none px-3 sm:px-4 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 pr-6 sm:pr-8"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="revenue">Highest Revenue</option>
                  <option value="views">Most Views</option>
                  <option value="rating">Highest Rated</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>

              {/* Advanced Filters Button */}
              <motion.button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`hidden sm:flex items-center gap-2 px-3 sm:px-4 py-2 rounded-none text-xs sm:text-sm font-medium border transition-all duration-200 ${
                  showAdvancedFilters
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'text-gray-400 border-gray-700 hover:text-white hover:border-gray-600'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </motion.button>
              
              {/* Mobile Filter Button */}
              <motion.button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`sm:hidden p-2 rounded-none border transition-all duration-200 ${
                  showAdvancedFilters
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'text-gray-400 border-gray-700 hover:text-white hover:border-gray-600'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {enhancedCategories.map((category) => {
              const Icon = category.icon;
              const isActive = filters.category === category.id;
              return (
                <motion.button
                  key={category.id}
                  onClick={() => updateFilter('category', category.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-none text-xs sm:text-sm whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'bg-gray-800 text-white border border-gray-600'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className={`w-3 h-3 sm:w-4 sm:h-4 ${category.color}`} />
                  <span className="hidden sm:inline">{category.name}</span>
                  <span className="sm:hidden">{category.name.split(' ')[0]}</span>
                  {category.count > 0 && (
                    <span className="px-1.5 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-none">
                      {category.count}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Advanced Filters Panel */}
          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gray-900/50 rounded-none border border-gray-700 p-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  
                  {/* Stage Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Stage</label>
                    <select
                      value={filters.stage || ''}
                      onChange={(e) => updateFilter('stage', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-none px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="">All Stages</option>
                      <option value="idea">Idea</option>
                      <option value="mvp">MVP</option>
                      <option value="development">Development</option>
                      <option value="launched">Launched</option>
                    </select>
                  </div>

                  {/* Price Range Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Price Range</label>
                    <select
                      value={filters.priceRange || ''}
                      onChange={(e) => updateFilter('priceRange', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-none px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="">All Prices</option>
                      <option value="under-10k">Under $10k</option>
                      <option value="10k-25k">$10k - $25k</option>
                      <option value="25k-50k">$25k - $50k</option>
                      <option value="over-50k">Over $50k</option>
                    </select>
                  </div>

                  {/* Revenue Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Monthly Revenue</label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">$0</span>
                      <input
                        type="range"
                        min="0"
                        max="100000"
                        step="1000"
                        value={filters.revenueRange?.[1] || 100000}
                        onChange={(e) => updateFilter('revenueRange', [0, parseInt(e.target.value)])}
                        className="flex-1 h-2 bg-gray-800 rounded-none appearance-none cursor-pointer accent-blue-600"
                      />
                      <span className="text-xs text-gray-400">$100k+</span>
                    </div>
                    <div className="text-center mt-1 text-sm text-blue-400">
                      Up to ${(filters.revenueRange?.[1] || 100000).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Clear Filters */}
                <div className="flex justify-end mt-4">
                  <motion.button
                    onClick={clearFilters}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded-none transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Clear All Filters
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );

  // Enhanced loading with skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <SEO 
          title="Marketplace - Loading..." 
          description="Loading marketplace projects..." 
        />
        <MarketplaceLoadingSkeleton viewMode={viewMode} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <SEO 
        title="Marketplace - Buy Side Projects" 
        description="Discover and purchase verified side projects with revenue, code, and complete documentation." 
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <HeroSection />

        {/* Search and Filters */}
        <SearchAndFilters />

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-none p-6 mb-8"
          >
            <p className="text-red-400">{error}</p>
          </motion.div>
        )}

        {/* Performance Metrics */}
        {searchMetrics && sortedAndFilteredProjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 flex items-center justify-between text-xs text-gray-500"
          >
            <div className="flex items-center gap-4">
              <span>{sortedAndFilteredProjects.length} of {searchMetrics.totalItems} projects</span>
              <span>Search: {searchMetrics.searchTime.toFixed(1)}ms</span>
              <span>Cache hits: {searchMetrics.cacheHits}</span>
              {isFiltered && (
                <span className="text-blue-400">Filtered</span>
              )}
            </div>
            
            {hasMoreResults && (
              <span className="text-blue-400">+ {searchResults.length - batchedResults.length} more</span>
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
              
              {/* Load More Button */}
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
                    Load More Projects ({searchResults.length - batchedResults.length} remaining)
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
                  ? 'Try adjusting your filters or search terms.'
                  : `No projects are currently available in this category.`
                }
              </p>
              
              {isFiltered && (
                <motion.button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-none transition-colors duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Clear All Filters
                </motion.button>
              )}
            </div>
          )}
        </motion.div>
      </div>
      
      {/* Quick Purchase Modal */}
      <AnimatePresence>
        {showQuickPurchaseModal && selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowQuickPurchaseModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-gray-900 border border-white/[0.08] rounded-none p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[95vh] overflow-y-auto mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Quick Purchase</h2>
                <button
                  onClick={() => setShowQuickPurchaseModal(false)}
                  className="p-2 min-w-[44px] min-h-[44px] hover:bg-gray-800 rounded-none transition-colors duration-200"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {/* Project Summary */}
                <div className="bg-gray-800/30 rounded-none p-4 sm:p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-white mb-2">{selectedProject.name}</h3>
                      <p className="text-gray-300 text-xs sm:text-sm line-clamp-2">{selectedProject.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                    <div className="text-center p-2 sm:p-3 bg-gray-800/50 rounded-none">
                      <div className="text-sm sm:text-lg font-bold text-white">
                        {selectedProject.monthly_revenue ? formatPrice(selectedProject.monthly_revenue) : '$0'}
                      </div>
                      <div className="text-xs text-gray-500">Monthly Revenue</div>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-gray-800/50 rounded-none">
                      <div className="text-sm sm:text-lg font-bold text-white">
                        {selectedProject.view_count || 0}
                      </div>
                      <div className="text-xs text-gray-500">Views</div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-700 pt-4">
                    <div className="flex justify-between text-base sm:text-lg">
                      <span className="text-white font-semibold">Total Price</span>
                      <span className="text-white font-bold">{formatPrice(selectedProject.sale_price)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Choose Payment Method</h3>
                  <PaymentMethodSelector
                    selectedMethod={selectedPaymentMethod}
                    onMethodSelect={handlePaymentMethodSelect}
                    amount={selectedProject.sale_price}
                  />
                </div>

                {/* Quick Purchase Benefits */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-none p-4">
                  <h4 className="text-green-300 font-medium mb-2">✨ Quick Purchase Benefits</h4>
                  <ul className="space-y-1 text-green-300 text-sm">
                    <li>• Instant access after payment confirmation</li>
                    <li>• Secure escrow protection</li>
                    <li>• Complete source code and documentation</li>
                    <li>• 30-day support included</li>
                  </ul>
                </div>

                {/* Security Notice */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-none p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-blue-300 text-sm">
                        <strong>Secure Transaction:</strong> Your payment is processed securely. 
                        Funds are held safely until project transfer is complete.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                  <button
                    onClick={() => setShowQuickPurchaseModal(false)}
                    className="flex-1 px-4 sm:px-6 py-3 min-h-[48px] text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-none transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={handlePurchase}
                    disabled={!selectedPaymentMethod || paymentProcessing}
                    className="flex-1 px-4 sm:px-6 py-3 min-h-[48px] bg-neutral-800   text-white rounded-none font-medium disabled:opacity-50 disabled:cursor-not-allowed   transition-all duration-200 flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {paymentProcessing ? (
                      <div className="animate-spin rounded-none h-4 w-4 border-b-2 border-white"></div>
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
  );
};

export default MarketplacePage; 
