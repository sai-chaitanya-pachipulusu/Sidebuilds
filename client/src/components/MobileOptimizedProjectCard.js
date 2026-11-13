import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Eye, 
  Star, 
  DollarSign, 
  Calendar, 
  Code, 
  ExternalLink,
  Verified,
  TrendingUp,
  Users,
  Zap,
  Award,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Badge } from '../shadcn/ui/badge';
import { Button } from '../shadcn/ui/button';

const MobileOptimizedProjectCard = ({ project, onInterest, onWishlist, isWishlisted = false }) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(isWishlisted);
  const [viewCount, setViewCount] = useState(project.view_count || 0);

  const handleCardClick = () => {
    setViewCount(prev => prev + 1);
    navigate(`/projects/${project.project_id}`);
  };

  const handleLike = (e) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    onWishlist?.(project.project_id, !isLiked);
  };

  const handleInterest = (e) => {
    e.stopPropagation();
    onInterest?.(project);
  };

  const getStageColor = (stage) => {
    const colors = {
      idea: 'bg-white/10 text-gray-400 border-white/20',
      planning: 'bg-white/10 text-gray-400 border-white/20',
      mvp: 'bg-white/10 text-white border-white/30',
      development: 'bg-white/10 text-gray-400 border-white/20',
      launched: 'bg-white/10 text-white border-white/30',
      scaling: 'bg-white/10 text-white border-white/30',
      mature: 'bg-white/10 text-white border-white/30'
    };
    return colors[stage] || colors.idea;
  };

  const getStageIcon = (stage) => {
    const icons = {
      idea: Zap,
      planning: Calendar,
      mvp: Code,
      development: TrendingUp,
      launched: Award,
      scaling: Users,
      mature: Star
    };
    const Icon = icons[stage] || Zap;
    return <Icon className="w-3 h-3" />;
  };

  const formatPrice = (price) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(0)}K`;
    return `$${price.toLocaleString()}`;
  };

  const formatRevenue = (revenue) => {
    if (!revenue || revenue === 0) return 'Pre-revenue';
    if (revenue >= 1000) return `$${(revenue / 1000).toFixed(1)}K/mo`;
    return `$${revenue}/mo`;
  };

  return (
    <motion.div
      className="project-card-mobile bg-gray-900/50 backdrop-blur-xl border border-gray-800/50 rounded-none overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={handleCardClick}
    >
      {/* Header with thumbnail and quick actions */}
      <div className="relative">
        {project.thumbnail_url ? (
          <div className="project-image h-48 bg-white/5 relative overflow-hidden">
            <img 
              src={project.thumbnail_url} 
              alt={project.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/20   " />
          </div>
        ) : (
          <div className="project-image h-48 bg-white/5 flex items-center justify-center relative">
            <Code className="w-16 h-16 text-gray-400" />
            <div className="absolute inset-0 bg-black/20   " />
          </div>
        )}
        
        {/* Quick actions overlay */}
        <div className="absolute top-3 right-3 flex gap-2">
          <motion.button
            className={`p-2 rounded-none backdrop-blur-md ${
              isLiked 
                ? 'bg-red-500/80 text-white' 
                : 'bg-black/40 text-gray-300 hover:bg-black/60'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleLike}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          </motion.button>
        </div>

        {/* Stage badge */}
        <div className="absolute top-3 left-3">
          <Badge className={`${getStageColor(project.stage)} border text-xs font-medium`}>
            {getStageIcon(project.stage)}
            <span className="ml-1 capitalize">{project.stage}</span>
          </Badge>
        </div>

        {/* Price overlay */}
        <div className="absolute bottom-3 left-3">
          <div className="bg-black/60 backdrop-blur-md rounded-none px-3 py-1.5">
            <div className="text-white font-bold text-lg">
              {formatPrice(project.sale_price)}
            </div>
            {project.price_negotiable && (
              <div className="text-gray-300 text-xs">Negotiable</div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title and owner */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="project-title font-semibold text-white leading-tight">
              {project.name}
            </h3>
            {project.is_verified && (
              <Verified className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="text-sm text-gray-400">
              by {project.owner_username || project.username}
            </div>
            {project.verification_level === 'premium' && (
              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">
                Premium
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="project-description text-gray-300 text-sm leading-relaxed">
          {project.description}
        </p>

        {/* Metrics row */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{viewCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span>{formatRevenue(project.monthly_revenue)}</span>
            </div>
            {project.monthly_users > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{project.monthly_users}</span>
              </div>
            )}
          </div>
          {project.growth_rate > 0 && (
            <div className="flex items-center gap-1 text-green-400">
              <TrendingUp className="w-3 h-3" />
              <span>+{project.growth_rate}%</span>
            </div>
          )}
        </div>

        {/* Tech stack */}
        {project.tech_stack && project.tech_stack.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.tech_stack.slice(0, 3).map((tech, index) => (
              <Badge 
                key={index}
                className="bg-gray-800/50 text-gray-300 border-gray-700/50 text-xs px-2 py-0.5"
              >
                {tech}
              </Badge>
            ))}
            {project.tech_stack.length > 3 && (
              <Badge className="bg-gray-800/50 text-gray-400 border-gray-700/50 text-xs px-2 py-0.5">
                +{project.tech_stack.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            className="button-mobile flex-1 bg-white text-black font-bold uppercase hover:bg-gray-200 border-0"
            onClick={handleInterest}
          >
            <span>Show Interest</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          {project.demo_url && (
            <Button
              variant="outline"
              className="px-3 border-gray-700 text-gray-300 hover:bg-gray-800"
              onClick={(e) => {
                e.stopPropagation();
                window.open(project.demo_url, '_blank');
              }}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* AI Score if available */}
        {project.overall_score && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-800/50">
            <div className="text-xs text-gray-400">AI Score</div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400" />
                <span className="text-sm font-medium text-white">
                  {project.overall_score}/100
                </span>
              </div>
              {project.ai_confidence && (
                <div className="text-xs text-gray-400">
                  ({project.ai_confidence}% confidence)
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MobileOptimizedProjectCard;
