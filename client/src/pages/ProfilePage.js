import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { getUserProfileById, getUserProjects, getFollowStatus, followUser, unfollowUser, getSellerReviews } from '../services/api';
import { StarRating } from '../components/ProjectReviews';
import { Button } from '../shadcn/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../shadcn/ui/card';
import { AtSign, Github, Linkedin, Calendar, DollarSign, Edit, Eye, Trophy, CheckCircle, MapPin, ExternalLink, Package, Grid, List, User, Target, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [viewMode, setViewMode] = useState('grid');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followPending, setFollowPending] = useState(false);
  const [reviewSummary, setReviewSummary] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const [profileData, projectsData] = await Promise.all([
          getUserProfileById(userId),
          getUserProjects(userId)
        ]);

        setUser(profileData);
        setProjects(projectsData);
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  // Follow status + seller rating (non-critical, best-effort)
  useEffect(() => {
    let cancelled = false;
    if (currentUser && userId) {
      getFollowStatus(userId)
        .then((s) => {
          if (!cancelled) {
            setIsFollowing(Boolean(s.is_following));
            setFollowerCount(s.follower_count || 0);
          }
        })
        .catch(() => {});
    }
    getSellerReviews(userId)
      .then((r) => { if (!cancelled) setReviewSummary(r.summary); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser, userId]);

  const handleToggleFollow = async () => {
    if (followPending) return;
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowerCount((c) => Math.max(0, c + (next ? 1 : -1)));
    setFollowPending(true);
    try {
      if (next) {
        await followUser(userId);
        toast.success(`Following ${user?.username || 'seller'} — you'll be notified of new listings.`);
      } else {
        await unfollowUser(userId);
      }
    } catch (err) {
      // roll back optimistic update
      setIsFollowing(!next);
      setFollowerCount((c) => Math.max(0, c + (next ? -1 : 1)));
      toast.error('Could not update follow status.');
    } finally {
      setFollowPending(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const activeProjects = projects.filter(p => p.status === 'active');
  const soldProjects = projects.filter(p => p.status === 'sold');
  const totalViews = projects.reduce((sum, p) => sum + (p.view_count || 0), 0);
  const totalRevenue = projects.reduce((sum, p) => sum + (p.monthly_revenue || 0), 0);
  const successRate = projects.length > 0 
    ? Math.round((soldProjects.length / projects.length) * 100)
    : 0;

  const ProjectCard = ({ project }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-6 hover:border-white/[0.12] transition-all duration-300 group"
    >
      <div className="space-y-4">
        {/* Project Image */}
        <div className="aspect-video rounded-none overflow-hidden bg-gray-800">
          <img 
            src={project.cover_image_url || 'https://via.placeholder.com/400x225?text=Project+Image'} 
            alt={project.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors duration-200">
              {project.name}
            </h3>
            <p className="text-gray-400 text-sm line-clamp-2">
              {project.description}
            </p>
          </div>
          {project.status === 'sold' && (
            <div className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-none text-green-400 text-xs font-medium ml-2">
              Sold
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {project.view_count || 0} views
          </div>
          {project.monthly_revenue && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {formatPrice(project.monthly_revenue)}/mo
            </div>
          )}
          {project.sale_price && (
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              {formatPrice(project.sale_price)}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-32 h-32 bg-gray-800 rounded-none animate-pulse mx-auto mb-4"></div>
              <div className="h-6 bg-gray-800 rounded-none animate-pulse w-48 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-800 rounded-none animate-pulse w-64 mx-auto"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-900/50 rounded-none p-6 animate-pulse">
                  <div className="h-16 bg-gray-800 rounded-none"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-gray-900/50 border border-white/[0.08] rounded-none p-8">
            <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">User not found</h2>
            <p className="text-gray-400">This profile doesn't exist or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={`${user.username}'s Profile`}
        description={user.bio || `View ${user.username}'s projects and portfolio`}
      />
      
      <div className="min-h-screen bg-black">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Profile Header */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-none bg-gradient-to-br from-blue-600 to-gray-600 flex items-center justify-center text-white text-4xl font-bold">
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  {user.verified && (
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-none flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-white">{user.username}</h1>
                    {user.role === 'premium' && (
                      <div className="px-2 py-1 bg-white/10 border border-white/20 rounded-none text-white text-sm font-medium">
                        Pro
                      </div>
                    )}
                  </div>
                  
                  {user.bio && (
                    <p className="text-gray-300 text-lg mb-4 max-w-2xl">
                      {user.bio}
                    </p>
                  )}

                  {/* Seller rating from verified-buyer reviews */}
                  {reviewSummary && reviewSummary.review_count > 0 && (
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                      <StarRating value={Math.round(reviewSummary.average_rating)} />
                      <span className="text-sm text-gray-300">
                        {reviewSummary.average_rating} · {reviewSummary.review_count} review{reviewSummary.review_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </div>
                    {followerCount > 0 && (
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {followerCount} follower{followerCount !== 1 ? 's' : ''}
                      </div>
                    )}
                    {user.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {user.location}
                      </div>
                    )}
                    {user.website && (
                      <a 
                        href={user.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-blue-400 transition-colors duration-200"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Website
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Follow Button (if viewing someone else's profile) */}
                {currentUser && (currentUser.user_id || currentUser.id) !== (user.user_id || user.id) && (
                  <motion.button
                    onClick={handleToggleFollow}
                    disabled={followPending}
                    className={`px-6 py-3 rounded-none font-medium transition-all duration-200 disabled:opacity-60 ${
                      isFollowing
                        ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                        : 'bg-gradient-to-r from-blue-600 to-gray-600 text-white hover:from-blue-700 hover:to-gray-700'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isFollowing ? 'Following ✓' : 'Follow'}
                  </motion.button>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/10 rounded-none">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{activeProjects.length}</div>
                    <div className="text-sm text-gray-400">Active Projects</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500/10 rounded-none">
                    <Trophy className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{soldProjects.length}</div>
                    <div className="text-sm text-gray-400">Projects Sold</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 rounded-none">
                    <Eye className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{totalViews.toLocaleString()}</div>
                    <div className="text-sm text-gray-400">Total Views</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-500/10 rounded-none">
                    <Target className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{successRate}%</div>
                    <div className="text-sm text-gray-400">Success Rate</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Projects Section */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-6">
              {/* Tabs */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-none">
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-none font-medium transition-all duration-200 ${
                      activeTab === 'active'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Active ({activeProjects.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('sold')}
                    className={`px-4 py-2 rounded-none font-medium transition-all duration-200 ${
                      activeTab === 'sold'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Sold ({soldProjects.length})
                  </button>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-gray-800/50 rounded-none p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-none transition-colors duration-200 ${
                      viewMode === 'grid' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-none transition-colors duration-200 ${
                      viewMode === 'list' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Projects Grid */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'active' && (
                    <>
                      {activeProjects.length > 0 ? (
                        <div className={viewMode === 'grid' 
                          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                          : 'space-y-4'
                        }>
                          {activeProjects.map(project => (
                            <ProjectCard key={project.project_id} project={project} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-white mb-2">No active projects</h3>
                          <p className="text-gray-400">This user hasn't listed any active projects yet.</p>
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === 'sold' && (
                    <>
                      {soldProjects.length > 0 ? (
                        <div className={viewMode === 'grid' 
                          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                          : 'space-y-4'
                        }>
                          {soldProjects.map(project => (
                            <ProjectCard key={project.project_id} project={project} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-white mb-2">No sold projects</h3>
                          <p className="text-gray-400">This user hasn't sold any projects yet.</p>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default ProfilePage; 
