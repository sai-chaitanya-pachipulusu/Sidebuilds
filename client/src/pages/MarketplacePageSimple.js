import React, { useState, useEffect } from 'react';
import { getMarketplaceProjects } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, 
  DollarSign,
  Star,
  Eye,
  Heart,
  Calendar,
  Shield,
  Bookmark,
  BookmarkCheck,
  Trophy
} from 'lucide-react';
import toast from 'react-hot-toast';

const MarketplacePageSimple = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
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
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      project.name.toLowerCase().includes(searchLower) ||
      project.description.toLowerCase().includes(searchLower) ||
      (project.tech_stack && project.tech_stack.toLowerCase().includes(searchLower))
    );
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return (a.sale_price || 0) - (b.sale_price || 0);
      case 'price-high':
        return (b.sale_price || 0) - (a.sale_price || 0);
      case 'revenue':
        return (b.monthly_revenue || 0) - (a.monthly_revenue || 0);
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

  const ProjectCard = ({ project }) => {
    const isOwnProject = user && project.owner_id === user.id;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6 hover:border-white/[0.12] transition-all duration-300 group relative overflow-hidden"
      >
        <div className="relative z-10 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white group-hover:text-purple-300 transition-colors duration-200">
                {project.name}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 mt-2">
                {project.description}
              </p>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-3 gap-3 py-3 bg-gray-800/30 rounded-lg">
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
                {project.overall_score || 'N/A'}
              </div>
              <div className="text-xs text-gray-500">AI Score</div>
            </div>
          </div>

          {/* Stage and Status */}
          <div className="flex items-center justify-between">
            <div className={`px-3 py-1 rounded-lg text-xs font-medium bg-${getStageColor(project.stage)}-500/10 text-${getStageColor(project.stage)}-400 border border-${getStageColor(project.stage)}-500/20`}>
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
              {JSON.parse(project.tech_stack || '[]').slice(0, 4).map((tech, index) => (
                <span key={index} className="px-2 py-1 bg-gray-800/50 text-gray-300 text-xs rounded-lg border border-gray-700">
                  {tech}
                </span>
              ))}
            </div>
          )}

          {/* Financial Metrics */}
          <div className="bg-gray-800/20 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Sale Price</span>
              <span className="text-white font-bold">{formatPrice(project.sale_price)}</span>
            </div>
            {project.monthly_revenue && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Breakeven</span>
                <span className="text-purple-400 text-sm">
                  {(project.sale_price / project.monthly_revenue).toFixed(1)} months
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t border-white/[0.08]">
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => navigate(`/projects/${project.project_id}`)}
                className="flex-1 px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Eye className="w-4 h-4" />
                View Details
              </motion.button>
              
              {!isOwnProject && (
                <motion.button
                  onClick={() => handleShowInterest(project.project_id)}
                  className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Heart className="w-4 h-4" />
                  Show Interest
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

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
                placeholder="Search projects..."
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
            </select>
          </div>
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