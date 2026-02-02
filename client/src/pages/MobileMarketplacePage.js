import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  SlidersHorizontal,
  Grid,
  List,
  TrendingUp,
  Star,
  DollarSign,
  Clock,
  X,
  ChevronDown,
  Sparkles,
  Zap,
  Award,
  Users,
  Code,
  RefreshCw
} from 'lucide-react';

import { getMarketplaceProjects } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MobileOptimizedProjectCard from '../components/MobileOptimizedProjectCard';
import { Button } from '../shadcn/ui/button';
import { Badge } from '../shadcn/ui/badge';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';

const MobileMarketplacePage = () => {
  // Core state
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  
  // Pagination
  const [displayCount, setDisplayCount] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Categories and stages
  const categories = [
    { value: 'all', label: 'All Categories', icon: Grid },
    { value: 'saas', label: 'SaaS', icon: Zap },
    { value: 'mobile-app', label: 'Mobile Apps', icon: Code },
    { value: 'fintech', label: 'FinTech', icon: DollarSign },
    { value: 'design-tools', label: 'Design Tools', icon: Sparkles },
    { value: 'developer-tools', label: 'Dev Tools', icon: Code },
    { value: 'education', label: 'Education', icon: Award },
    { value: 'business-tools', label: 'Business', icon: Users }
  ];

  const stages = [
    { value: 'all', label: 'All Stages', icon: Star },
    { value: 'idea', label: 'Idea', icon: Zap },
    { value: 'planning', label: 'Planning', icon: Clock },
    { value: 'mvp', label: 'MVP', icon: Code },
    { value: 'development', label: 'Development', icon: TrendingUp },
    { value: 'launched', label: 'Launched', icon: Award },
    { value: 'scaling', label: 'Scaling', icon: Users }
  ];

  const priceRanges = [
    { value: 'all', label: 'All Prices' },
    { value: '0-5000', label: 'Under $5K' },
    { value: '5000-15000', label: '$5K - $15K' },
    { value: '15000-50000', label: '$15K - $50K' },
    { value: '50000-100000', label: '$50K - $100K' },
    { value: '100000+', label: '$100K+' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'revenue', label: 'Highest Revenue' },
    { value: 'growth', label: 'Fastest Growing' },
    { value: 'popular', label: 'Most Popular' }
  ];

  // Fetch projects
  const fetchProjects = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      
      const data = await getMarketplaceProjects();
      setProjects(data);
      setFilteredProjects(data);
      
      if (showRefresh) {
        toast.success('Projects refreshed!');
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Filter and sort projects
  const processedProjects = useMemo(() => {
    let filtered = [...projects];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(term) ||
        project.description.toLowerCase().includes(term) ||
        project.tech_stack?.some(tech => tech.toLowerCase().includes(term)) ||
        project.category?.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(project => project.category === selectedCategory);
    }

    // Stage filter
    if (selectedStage !== 'all') {
      filtered = filtered.filter(project => project.stage === selectedStage);
    }

    // Price range filter
    if (priceRange !== 'all') {
      const [min, max] = priceRange.split('-').map(Number);
      filtered = filtered.filter(project => {
        const price = project.sale_price || 0;
        if (priceRange === '100000+') return price >= 100000;
        return price >= min && price <= max;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (a.sale_price || 0) - (b.sale_price || 0);
        case 'price-high':
          return (b.sale_price || 0) - (a.sale_price || 0);
        case 'revenue':
          return (b.monthly_revenue || 0) - (a.monthly_revenue || 0);
        case 'growth':
          return (b.growth_rate || 0) - (a.growth_rate || 0);
        case 'popular':
          return (b.view_count || 0) - (a.view_count || 0);
        case 'newest':
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

    return filtered;
  }, [projects, searchTerm, selectedCategory, selectedStage, priceRange, sortBy]);

  // Displayed projects with pagination
  const displayedProjects = useMemo(() => {
    const displayed = processedProjects.slice(0, displayCount);
    setHasMore(displayed.length < processedProjects.length);
    return displayed;
  }, [processedProjects, displayCount]);

  // Load more projects
  const loadMore = useCallback(() => {
    if (hasMore) {
      setDisplayCount(prev => prev + 10);
    }
  }, [hasMore]);

  // Handle project interest
  const handleProjectInterest = useCallback((project) => {
    if (!user) {
      toast.error('Please login to show interest');
      navigate('/login');
      return;
    }
    navigate(`/projects/${project.project_id}`);
  }, [user, navigate]);

  // Handle wishlist
  const handleWishlist = useCallback((projectId, isAdding) => {
    if (!user) {
      toast.error('Please login to save projects');
      return;
    }
    
    // TODO: Implement wishlist API
    toast.success(isAdding ? 'Added to wishlist' : 'Removed from wishlist');
  }, [user]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedStage('all');
    setPriceRange('all');
    setSortBy('newest');
    setShowFilters(false);
  }, []);

  // Initial load
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-gray-900/50 rounded-none p-4 animate-pulse">
          <div className="h-48 bg-gray-800 rounded-none mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-800 rounded w-3/4" />
            <div className="h-3 bg-gray-800 rounded w-1/2" />
            <div className="flex gap-2">
              <div className="h-6 bg-gray-800 rounded w-16" />
              <div className="h-6 bg-gray-800 rounded w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <SEO 
          title="Marketplace - SideBuilds"
          description="Discover and buy amazing side projects from verified makers"
        />
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Marketplace</h1>
            <p className="text-gray-400">Loading amazing projects...</p>
          </div>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <SEO 
        title="Marketplace - SideBuilds"
        description="Discover and buy amazing side projects from verified makers"
      />
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">Marketplace</h1>
              <p className="text-sm text-gray-400">
                {processedProjects.length} projects available
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchProjects(true)}
              disabled={refreshing}
              className="border-gray-700 text-gray-300"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects, technologies, categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-mobile w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-800/50 rounded-none text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Filter toggle and sort */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="border-gray-700 text-gray-300"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
              {(selectedCategory !== 'all' || selectedStage !== 'all' || priceRange !== 'all') && (
                <Badge className="ml-2 bg-blue-500 text-white text-xs">
                  Active
                </Badge>
              )}
            </Button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-gray-900/50 border border-gray-800/50 rounded-none text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gray-900/50 border-b border-gray-800/50 overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 space-y-4">
              {/* Categories */}
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.value}
                        onClick={() => setSelectedCategory(category.value)}
                        className={`filter-button-mobile flex items-center gap-2 px-3 py-2 rounded-none text-sm transition-colors ${
                          selectedCategory === category.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stages */}
              <div>
                <label className="block text-sm font-medium mb-2">Stage</label>
                <div className="flex flex-wrap gap-2">
                  {stages.map(stage => {
                    const Icon = stage.icon;
                    return (
                      <button
                        key={stage.value}
                        onClick={() => setSelectedStage(stage.value)}
                        className={`filter-button-mobile flex items-center gap-2 px-3 py-2 rounded-none text-sm transition-colors ${
                          selectedStage === stage.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {stage.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price range */}
              <div>
                <label className="block text-sm font-medium mb-2">Price Range</label>
                <div className="flex flex-wrap gap-2">
                  {priceRanges.map(range => (
                    <button
                      key={range.value}
                      onClick={() => setPriceRange(range.value)}
                      className={`filter-button-mobile px-3 py-2 rounded-none text-sm transition-colors ${
                        priceRange === range.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear filters */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="border-gray-700 text-gray-300"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Projects grid */}
      <div className="container mx-auto px-4 py-6">
        {displayedProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-none bg-gray-800/50 flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">No projects found</h3>
            <p className="text-gray-400 mb-4">
              Try adjusting your filters or search terms
            </p>
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {displayedProjects.map((project, index) => (
                <motion.div
                  key={project.project_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <MobileOptimizedProjectCard
                    project={project}
                    onInterest={handleProjectInterest}
                    onWishlist={handleWishlist}
                  />
                </motion.div>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="text-center mt-8">
                <Button
                  onClick={loadMore}
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Load More Projects
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MobileMarketplacePage;
