import React, { useState, useEffect } from 'react';
import { getMarketplaceProjects } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Button } from '../shadcn/ui/button';
import { Label } from '../shadcn/ui/label';
import toast from 'react-hot-toast';

// Use the enhanced ProjectCard component
import ProjectCard from '../components/ProjectCard';

const MarketplacePageSimple = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMarketplaceProjects = async () => {
      try {
        console.log('Fetching marketplace projects...');
        setError('');
        setLoading(true);
        const marketplaceProjects = await getMarketplaceProjects();
        console.log('Received projects:', marketplaceProjects.length);
        setProjects(marketplaceProjects);
      } catch (err) {
        console.error("Failed to fetch marketplace projects:", err);
        setError(err.message || 'Failed to load marketplace projects.');
      } finally {
        setLoading(false);
      }
    };

    fetchMarketplaceProjects();
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStageColor = (stage) => {
    const stageColors = {
      'idea': 'gray',
      'planning': 'blue',
      'mvp': 'purple',
      'development': 'orange',
      'launched': 'green',
      'on_hold': 'red'
    };
    return stageColors[stage?.toLowerCase()] || 'gray';
  };

  const filteredProjects = projects.filter(project => {
    // Text search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        project.name?.toLowerCase().includes(searchLower) ||
        project.description?.toLowerCase().includes(searchLower) ||
        project.tech_stack?.toLowerCase().includes(searchLower) ||
        project.category?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;
    }

    // Advanced filters
    if (filters.stage && project.stage !== filters.stage) return false;
    if (filters.minPrice && (project.sale_price || 0) < parseInt(filters.minPrice)) return false;
    if (filters.maxPrice && (project.sale_price || 0) > parseInt(filters.maxPrice)) return false;
    if (filters.techStack && !project.tech_stack?.toLowerCase().includes(filters.techStack.toLowerCase())) return false;
    if (filters.category && project.category !== filters.category) return false;

    return true;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return (a.sale_price || 0) - (b.sale_price || 0);
      case 'price-high':
        return (b.sale_price || 0) - (a.sale_price || 0);
      case 'revenue':
        return (b.monthly_revenue || 0) - (a.monthly_revenue || 0);
      case 'views':
        return (b.view_count || 0) - (a.view_count || 0);
      case 'score':
        return (b.overall_score || 0) - (a.overall_score || 0);
      case 'newest':
      default:
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  const handleShowInterest = (projectId) => {
    if (!user) {
      toast.error("Please log in to show interest");
      navigate('/login');
      return;
    }
    navigate(`/projects/${projectId}?showInterest=true`);
  };

  // Removed inline ProjectCard - using enhanced component from ../components/ProjectCard

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading marketplace projects...</div>
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
          <div className="mt-4 text-purple-400">
            {projects.length} projects available
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search projects, technologies, categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div>
                  <Label className="text-gray-300 text-sm mb-2 block">Max Price</Label>
                  <input
                    type="number"
                    placeholder="100000"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div>
                  <Label className="text-gray-300 text-sm mb-2 block">Technology</Label>
                  <input
                    type="text"
                    placeholder="React, Node.js..."
                    value={filters.techStack}
                    onChange={(e) => setFilters({...filters, techStack: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} found
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({
                      stage: '',
                      minPrice: '',
                      maxPrice: '',
                      techStack: '',
                      category: ''
                    })}
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
          </div>
        )}

        {/* Projects Grid */}
        {sortedProjects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedProjects.map((project, index) => (
              <motion.div
                key={project.project_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ProjectCard project={project} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-gray-400 text-lg mb-4">
              {searchTerm ? 'No projects found matching your search.' : 'No projects available.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketplacePageSimple;