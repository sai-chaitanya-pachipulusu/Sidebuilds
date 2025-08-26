import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, 
  Heart, 
  Star, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  ArrowRight,
  Bookmark,
  Share2,
  Activity,
  Award,
  Zap
} from 'lucide-react';
import { config } from '../config/environment';
import { useAuth } from '../context/AuthContext';

const DynamicProjectCard = ({ 
  project, 
  onView, 
  onInterest, 
  onBookmark,
  variant = 'default', // 'default', 'compact', 'featured', 'trending'
  showAnalytics = false,
  enableInteractions = true
}) => {
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [viewCount, setViewCount] = useState(project.view_count || 0);
  const [interestCount, setInterestCount] = useState(project.interest_count || 0);
  const [aiScore, setAiScore] = useState(project.ai_score || 0);
  const [trendingScore, setTrendingScore] = useState(project.trending_score || 0);

  // Real-time updates
  useEffect(() => {
    if (!config.isFeatureEnabled('realTimeNotifications')) return;

    const socket = window.io?.(config.SOCKET_URL, {
      auth: { token: localStorage.getItem('token') }
    });

    if (socket) {
      socket.on(`project_${project.id}_updated`, (data) => {
        if (data.viewCount !== undefined) setViewCount(data.viewCount);
        if (data.interestCount !== undefined) setInterestCount(data.interestCount);
        if (data.aiScore !== undefined) setAiScore(data.aiScore);
        if (data.trendingScore !== undefined) setTrendingScore(data.trendingScore);
      });

      return () => socket.disconnect();
    }
  }, [project.id]);

  const handleView = async () => {
    try {
      if (onView) {
        await onView(project.id);
      }
      
      // Track view event
      if (config.isFeatureEnabled('realTimeNotifications')) {
        const socket = window.io?.(config.SOCKET_URL, {
          auth: { token: localStorage.getItem('token') }
        });
        
        socket?.emit('project_view', { projectId: project.id });
      }
      
      setViewCount(prev => prev + 1);
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleInterest = async () => {
    try {
      if (onInterest) {
        await onInterest(project.id);
      }
      
      // Track interest event
      if (config.isFeatureEnabled('realTimeNotifications')) {
        const socket = window.io?.(config.SOCKET_URL, {
          auth: { token: localStorage.getItem('token') }
        });
        
        socket?.emit('project_interest', { projectId: project.id, interestType: 'like' });
      }
      
      setInterestCount(prev => prev + 1);
    } catch (error) {
      console.error('Error tracking interest:', error);
    }
  };

  const handleBookmark = async () => {
    try {
      if (onBookmark) {
        await onBookmark(project.id, !isBookmarked);
      }
      
      setIsBookmarked(!isBookmarked);
    } catch (error) {
      console.error('Error bookmarking:', error);
    }
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: project.title,
        text: project.description,
        url: `${window.location.origin}/projects/${project.id}`
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        // Show toast notification
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getVariantStyles = () => {
    const variants = {
      default: {
        container: "bg-gray-900/50 border border-white/10 rounded-2xl p-6",
        image: "h-48",
        content: "space-y-4"
      },
      compact: {
        container: "bg-gray-900/50 border border-white/10 rounded-xl p-4",
        image: "h-32",
        content: "space-y-2"
      },
      featured: {
        container: "bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl p-6",
        image: "h-56",
        content: "space-y-4"
      },
      trending: {
        container: "bg-gradient-to-br from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-2xl p-6",
        image: "h-48",
        content: "space-y-4"
      }
    };

    return variants[variant] || variants.default;
  };

  const styles = getVariantStyles();

  const formatPrice = (price) => {
    if (!price) return 'Price on request';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <motion.div
      className={`${styles.container} cursor-pointer group transition-all duration-300 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleView}
    >
      {/* Project Image */}
      <div className={`relative ${styles.image} bg-gray-800 rounded-lg overflow-hidden mb-4`}>
        {project.images && project.images.length > 0 ? (
          <img
            src={project.images[0]}
            alt={project.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center">
            <div className="text-gray-500 text-sm">No image available</div>
          </div>
        )}

        {/* Overlay Actions */}
        <div className={`absolute top-2 right-2 flex gap-2 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          {enableInteractions && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBookmark();
                }}
                className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
                  isBookmarked 
                    ? 'bg-purple-600/80 text-white' 
                    : 'bg-black/60 text-white hover:bg-purple-600/60'
                }`}
              >
                <Bookmark className="w-4 h-4" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                className="p-2 bg-black/60 text-white rounded-full backdrop-blur-sm hover:bg-blue-600/60 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {variant === 'trending' && (
            <span className="px-2 py-1 bg-orange-600/80 text-orange-100 text-xs font-medium rounded-full backdrop-blur-sm">
              🔥 Trending
            </span>
          )}
          
          {variant === 'featured' && (
            <span className="px-2 py-1 bg-purple-600/80 text-purple-100 text-xs font-medium rounded-full backdrop-blur-sm">
              ⭐ Featured
            </span>
          )}
          
          {project.monthly_revenue && project.monthly_revenue > 1000 && (
            <span className="px-2 py-1 bg-green-600/80 text-green-100 text-xs font-medium rounded-full backdrop-blur-sm">
              💰 High Revenue
            </span>
          )}
        </div>

        {/* AI Score Badge */}
        {aiScore > 0 && showAnalytics && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-black/60 rounded-full backdrop-blur-sm">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span className={`text-xs font-medium ${getScoreColor(aiScore)}`}>
              {aiScore}
            </span>
          </div>
        )}
      </div>

      {/* Project Content */}
      <div className={styles.content}>
        {/* Title and Description */}
        <div>
          <h3 className="font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors line-clamp-2">
            {project.title}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2">
            {project.description}
          </p>
        </div>

        {/* Technologies */}
        {project.technologies && project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.technologies.slice(0, 3).map((tech, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-full"
              >
                {tech}
              </span>
            ))}
            {project.technologies.length > 3 && (
              <span className="px-2 py-1 bg-gray-600/50 text-gray-400 text-xs rounded-full">
                +{project.technologies.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Metrics */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-gray-400">
              <Eye className="w-4 h-4" />
              <span>{formatNumber(viewCount)}</span>
            </div>
            
            {enableInteractions && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleInterest();
                }}
                className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors"
              >
                <Heart className="w-4 h-4" />
                <span>{formatNumber(interestCount)}</span>
              </button>
            )}
            
            {project.seller_rating && (
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="w-4 h-4 fill-current" />
                <span>{project.seller_rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {project.monthly_revenue && (
              <div className="flex items-center gap-1 text-green-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">${formatNumber(project.monthly_revenue)}/mo</span>
              </div>
            )}
          </div>
        </div>

        {/* Price and CTA */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span className="text-lg font-bold text-white">
              {formatPrice(project.sale_price)}
            </span>
          </div>

          <motion.button
            whileHover={{ x: 5 }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleView();
            }}
          >
            <span className="text-sm">View Details</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Analytics Row (if enabled) */}
        {showAnalytics && (
          <div className="pt-2 border-t border-gray-700/50">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-3">
                {trendingScore > 0 && (
                  <div className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    <span>Trending: {trendingScore}</span>
                  </div>
                )}
                
                {project.created_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {project.seller_name && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>by {project.seller_name}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DynamicProjectCard;