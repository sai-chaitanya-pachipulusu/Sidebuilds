import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { getProjects } from '../services/api';
import {
  Plus,
  Eye,
  Edit3,
  Calendar,
  TrendingUp,
  DollarSign,
  Sparkles,
  Filter,
  Grid,
  List,
  Search,
  PlusCircle,
  Trash2,
  Users,
  Star,
  BarChart3,
  ArrowUpRight,
  Target
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../shadcn/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../shadcn/ui/card';

const MyProjectsPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      try {
        const userProjects = await getProjects();
        setProjects(userProjects.filter(p => p.user_id === user.id));
      } catch (error) {
        console.error('Failed to fetch user projects:', error);
        toast.error('Failed to load your projects');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [user]);

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
    const matchesSearch = !searchTerm || 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = !stageFilter || project.stage === stageFilter;
    
    return matchesSearch && matchesStage;
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const ProjectCard = ({ project }) => {
    const stageColor = getStageColor(project.stage);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6 hover:border-white/[0.12] transition-all duration-300 group relative overflow-hidden"
      >
        {/* Background gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative z-10 space-y-4">
          {/* Project Image */}
          <div className="aspect-video rounded-xl overflow-hidden bg-gray-800">
            <img 
              src={project.cover_image_url || 'https://via.placeholder.com/400x225?text=Project+Image'} 
              alt={project.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors duration-200">
                {project.name}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">
                {project.description}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-lg text-xs font-medium bg-${stageColor}-500/10 text-${stageColor}-400 border border-${stageColor}-500/20 ml-3`}>
              {project.stage}
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3 py-3 bg-gray-800/20 rounded-lg">
            <div className="text-center">
              <div className="text-sm font-bold text-white">
                {project.view_count || 0}
              </div>
              <div className="text-xs text-gray-500">Views</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-white">
                {project.monthly_revenue ? formatPrice(project.monthly_revenue) : '$0'}
              </div>
              <div className="text-xs text-gray-500">Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-white">
                {project.sale_price ? formatPrice(project.sale_price) : 'N/A'}
              </div>
              <div className="text-xs text-gray-500">Price</div>
            </div>
          </div>

          {/* Creation Date */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-white/[0.08]">
            <motion.button
              onClick={() => navigate(`/projects/${project.project_id}`)}
              className="flex-1 px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Eye className="w-4 h-4" />
              View
            </motion.button>
            
            <motion.button
              onClick={() => navigate(`/projects/edit/${project.project_id}`)}
              className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  };

  const ProjectListItem = ({ project }) => {
    const stageColor = getStageColor(project.stage);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6 hover:border-white/[0.12] transition-all duration-300 group"
      >
        <div className="flex items-center gap-6">
          {/* Project Image */}
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
            <img 
              src={project.cover_image_url || 'https://via.placeholder.com/80x80?text=Project'} 
              alt={project.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Project Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors duration-200 truncate">
                {project.name}
              </h3>
              <div className={`px-3 py-1 rounded-lg text-xs font-medium bg-${stageColor}-500/10 text-${stageColor}-400 border border-${stageColor}-500/20 ml-3 flex-shrink-0`}>
                {project.stage}
              </div>
            </div>
            
            <p className="text-gray-400 text-sm line-clamp-1 mb-3">
              {project.description}
            </p>

            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {project.view_count || 0} views
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {project.monthly_revenue ? formatPrice(project.monthly_revenue) : '$0'} revenue
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(project.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            <motion.button
              onClick={() => navigate(`/projects/${project.project_id}`)}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors duration-200 flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Eye className="w-4 h-4" />
              View
            </motion.button>
            
            <motion.button
              onClick={() => navigate(`/projects/edit/${project.project_id}`)}
              className="px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-8 bg-gray-800 rounded-lg animate-pulse w-48"></div>
                <div className="h-4 bg-gray-800 rounded-lg animate-pulse w-64"></div>
              </div>
              <div className="h-10 bg-gray-800 rounded-lg animate-pulse w-32"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-900/50 rounded-2xl p-6 animate-pulse">
                  <div className="space-y-4">
                    <div className="aspect-video bg-gray-800 rounded-xl"></div>
                    <div className="h-6 bg-gray-800 rounded"></div>
                    <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                    <div className="flex gap-2">
                      <div className="h-8 bg-gray-800 rounded flex-1"></div>
                      <div className="h-8 bg-gray-800 rounded flex-1"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="My Projects - Creator Studio"
        description="Manage all of your project showcases."
      />
      
      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                  My Projects
                </h1>
                <p className="text-xl text-gray-400">
                  Your personal collection of digital creations.
                </p>
              </div>
              
              <motion.button
                onClick={() => navigate('/projects/new')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium flex items-center gap-2 hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-5 h-5" />
                Create New Project
              </motion.button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/10 rounded-xl">
                    <Target className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{projects.length}</div>
                    <div className="text-sm text-gray-400">Total Projects</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500/10 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {projects.filter(p => p.stage === 'launched').length}
                    </div>
                    <div className="text-sm text-gray-400">Launched</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 rounded-xl">
                    <Eye className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {projects.reduce((sum, p) => sum + (p.view_count || 0), 0)}
                    </div>
                    <div className="text-sm text-gray-400">Total Views</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-500/10 rounded-xl">
                    <DollarSign className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {formatPrice(projects.reduce((sum, p) => sum + (p.monthly_revenue || 0), 0))}
                    </div>
                    <div className="text-sm text-gray-400">Total Revenue</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search your projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition-colors duration-200"
                  />
                </div>
                
                {/* Filters */}
                <div className="flex items-center gap-3">
                  <select
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                    className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">All Stages</option>
                    <option value="idea">Idea</option>
                    <option value="planning">Planning</option>
                    <option value="mvp">MVP</option>
                    <option value="development">Development</option>
                    <option value="launched">Launched</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                  
                  <div className="flex items-center gap-1 bg-gray-800/50 rounded-xl p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-colors duration-200 ${
                        viewMode === 'grid' 
                          ? 'bg-purple-600 text-white' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-colors duration-200 ${
                        viewMode === 'list' 
                          ? 'bg-purple-600 text-white' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <p className="text-gray-400 text-sm">
                  {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>

            {/* Projects Grid/List */}
            <AnimatePresence>
              {filteredProjects.length > 0 ? (
                <div className={viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                  : 'space-y-4'
                }>
                  {filteredProjects.map((project, index) => (
                    <motion.div
                      key={project.project_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {viewMode === 'grid' ? (
                        <ProjectCard project={project} />
                      ) : (
                        <ProjectListItem project={project} />
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-12">
                    <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-semibold text-white mb-2">
                      {searchTerm || stageFilter ? 'No matching projects' : 'No projects yet'}
                    </h3>
                    <p className="text-gray-400 mb-6">
                      {searchTerm || stageFilter 
                        ? 'Try adjusting your search or filters.'
                        : 'Start building your portfolio by creating your first project.'
                      }
                    </p>
                    {!searchTerm && !stageFilter && (
                      <motion.button
                        onClick={() => navigate('/projects/new')}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium flex items-center gap-2 mx-auto hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Plus className="w-5 h-5" />
                        Create Your First Project
                      </motion.button>
                    )}
                  </div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default MyProjectsPage; 