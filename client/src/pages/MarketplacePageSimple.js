import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { getMarketplaceProjects } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../shadcn/ui/button';
import { Label } from '../shadcn/ui/label';
import toast from 'react-hot-toast';
import { useDebounce } from '../hooks/useDebounce';
import { useOptimizedSearch } from '../hooks/useOptimizedSearch';
import { apiCache, CACHE_TTL, CACHE_TAGS } from '../utils/apiCache';

// Use the enhanced ProjectCard component - memoized for performance
const MemoizedProjectCard = memo(({ project }) => {
  const ProjectCard = require('../components/ProjectCard').default;
  return <ProjectCard project={project} />;
});

// Virtualized list item renderer
const VirtualizedProjectItem = memo(({ project, index, style }) => (
  <motion.div
    style={style}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: Math.min(index * 0.05, 0.3) }}
  >
    <MemoizedProjectCard project={project} />
  </motion.div>
));

const MarketplacePageSimple = () => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);
  const itemsPerPage = 20;
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filters, setFilters] = useState({
    stage: '',
    minPrice: '',
    maxPrice: '',
    techStack: '',
    category: ''
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Debounced search term for performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch projects with pagination and caching
  const fetchProjects = useCallback(async (page = 1) => {
    const cacheKey = `marketplace:page:${page}:sort:${sortBy}`;
    
    try {
      setError('');
      setLoading(true);
      
      // Check cache first
      const cached = apiCache.get(cacheKey);
      if (cached && !cached.__stale) {
        setProjects(cached.data || []);
        setTotalPages(cached.pagination?.totalPages || 1);
        setTotalProjects(cached.pagination?.total || 0);
        setLoading(false);
        return;
      }
      
      // Map sort options to API parameters
      const sortMapping = {
        'newest': { sortBy: 'created_at', sortOrder: 'desc' },
        'price-low': { sortBy: 'sale_price', sortOrder: 'asc' },
        'price-high': { sortBy: 'sale_price', sortOrder: 'desc' },
        'revenue': { sortBy: 'monthly_revenue', sortOrder: 'desc' },
        'views': { sortBy: 'view_count', sortOrder: 'desc' },
        'score': { sortBy: 'overall_score', sortOrder: 'desc' }
      };
      
      const sortParams = sortMapping[sortBy] || sortMapping['newest'];
      
      // Fetch from API with pagination
      const response = await getMarketplaceProjects({
        page,
        limit: itemsPerPage,
        ...sortParams
      });
      
      if (response && response.data) {
        setProjects(response.data);
        setTotalPages(response.pagination?.totalPages || 1);
        setTotalProjects(response.pagination?.total || 0);
        
        // Cache the response
        apiCache.set(cacheKey, response, CACHE_TTL.MARKETPLACE);
      } else {
        // Fallback for old API format
        setProjects(response || []);
        setTotalPages(1);
        setTotalProjects(response?.length || 0);
      }
    } catch (err) {
      console.error("Failed to fetch marketplace projects:", err);
      setError(err.message || 'Failed to load marketplace projects.');
      
      // Try to use stale cache on error
      const stale = apiCache.get(cacheKey);
      if (stale) {
        setProjects(stale.data || []);
        toast.error('Using cached data - connection issue detected');
      }
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  // Initial fetch
  useEffect(() => {
    fetchProjects(currentPage);
  }, [fetchProjects, currentPage]);

  // Client-side filtering with optimized search
  const { filteredItems: filteredProjects, isSearching } = useOptimizedSearch(
    projects,
    {},
    {
      searchKeys: ['name', 'description', 'tech_stack', 'category'],
      debounceMs: 150,
      enableIndexing: true,
      minSearchLength: 1
    }
  );

  // Apply additional filters
  const fullyFilteredProjects = useMemo(() => {
    return filteredProjects.filter(project => {
      if (filters.stage && project.stage !== filters.stage) return false;
      if (filters.minPrice && (project.sale_price || 0) < parseInt(filters.minPrice)) return false;
      if (filters.maxPrice && (project.sale_price || 0) > parseInt(filters.maxPrice)) return false;
      if (filters.techStack && !project.tech_stack?.toLowerCase().includes(filters.techStack.toLowerCase())) return false;
      if (filters.category && project.category !== filters.category) return false;
      return true;
    });
  }, [filteredProjects, filters]);

  const handleShowInterest = (projectId) => {
    if (!user) {
      toast.error("Please log in to show interest");
      navigate('/login');
      return;
    }
    navigate(`/projects/${projectId}?showInterest=true`);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const clearFilters = () => {
    setFilters({
      stage: '',
      minPrice: '',
      maxPrice: '',
      techStack: '',
      category: ''
    });
    setSearchTerm('');
  };

  // Pagination component
  const Pagination = () => {
    if (totalPages <= 1) return null;
    
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 rounded ${
            i === currentPage
              ? 'bg-white text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {i}
        </button>
      );
    }
    
    return (
      <div className="flex items-center justify-center gap-2 mt-8">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        {startPage > 1 && (
          <>
            <button onClick={() => handlePageChange(1)} className="px-3 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700">1</button>
            {startPage > 2 && <span className="text-gray-500">...</span>}
          </>
        )}
        
        {pages}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-gray-500">...</span>}
            <button onClick={() => handlePageChange(totalPages)} className="px-3 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700">{totalPages}</button>
          </>
        )}
        
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/50 mx-auto mb-4"></div>
          <div className="text-white">Loading marketplace projects...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Marketplace
          </h1>
          <p className="text-gray-400 text-lg">
            Discover and purchase verified side projects
          </p>
          <div className="mt-4 text-blue-400">
            {totalProjects} projects available
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4 flex-wrap md:flex-nowrap">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search projects, technologies, categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1); // Reset to first page on sort change
              }}
              className="px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="revenue">Highest Revenue</option>
              <option value="views">Most Viewed</option>
              <option value="score">Highest AI Score</option>
            </select>
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-4 py-2"
            >
              {showAdvancedFilters ? 'Hide Filters' : 'Advanced'}
            </Button>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-lg p-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-gray-300 text-sm mb-2 block">Stage</Label>
                  <select
                    value={filters.stage}
                    onChange={(e) => setFilters({...filters, stage: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="">All Stages</option>
                    <option value="idea">Idea</option>
                    <option value="planning">Planning</option>
                    <option value="mvp">MVP</option>
                    <option value="development">Development</option>
                    <option value="launched">Launched</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>

                <div>
                  <Label className="text-gray-300 text-sm mb-2 block">Min Price</Label>
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <Label className="text-gray-300 text-sm mb-2 block">Max Price</Label>
                  <input
                    type="number"
                    placeholder="100000"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <Label className="text-gray-300 text-sm mb-2 block">Technology</Label>
                  <input
                    type="text"
                    placeholder="React, Node.js..."
                    value={filters.techStack}
                    onChange={(e) => setFilters({...filters, techStack: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  {fullyFilteredProjects.length} project{fullyFilteredProjects.length !== 1 ? 's' : ''} found
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-8">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => fetchProjects(currentPage)}
              className="mt-2 text-sm text-red-400 underline hover:text-red-300"
            >
              Retry
            </button>
          </div>
        )}

        {/* Projects Grid */}
        {fullyFilteredProjects.length > 0 ? (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {fullyFilteredProjects.map((project, index) => (
                <VirtualizedProjectItem
                  key={project.project_id}
                  project={project}
                  index={index}
                />
              ))}
            </div>
            
            {/* Pagination */}
            <Pagination />
          </>
        ) : (
          <div className="text-center py-16">
            <div className="text-gray-400 text-lg mb-4">
              {debouncedSearchTerm ? 'No projects found matching your search.' : 'No projects available.'}
            </div>
            {debouncedSearchTerm && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Search
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketplacePageSimple;
