import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  DollarSign, 
  Code, 
  Check, 
  Star,
  Users,
  TrendingUp,
  Award,
  Zap,
  Eye
} from 'lucide-react';
import { Badge } from '../shadcn/ui/badge';
import { cn } from '../lib/utils';

// Comprehensive trust badge system for SideBuilds marketplace
const TrustBadge = ({ 
  type, 
  value, 
  variant = 'default', 
  showTooltip = true, 
  animated = true,
  className = '' 
}) => {
  const trustBadgeConfigs = {
    // Core verification badges - monochrome
    identity_verified: {
      icon: Shield,
      label: 'ID Verified',
      description: 'Seller identity confirmed through document verification',
      className: 'bg-white/10 text-white border-white/30',
      priority: 'high'
    },
    
    revenue_verified: {
      icon: DollarSign,
      label: 'Revenue Verified',
      description: 'Monthly revenue confirmed through Stripe integration',
      className: 'bg-white/10 text-white border-white/30',
      priority: 'high'
    },
    
    code_reviewed: {
      icon: Code,
      label: 'Code Reviewed',
      description: 'Repository analyzed for quality and security standards',
      className: 'bg-white/10 text-gray-300 border-white/20',
      priority: 'medium'
    },
    
    // Trust score badge
    trust_score: {
      icon: Star,
      label: 'Trust Score',
      description: 'AI-calculated trustworthiness score based on multiple factors',
      className: 'bg-white/10 text-white border-white/30',
      priority: 'high',
      dynamic: true
    },
    
    // Performance badges
    top_seller: {
      icon: Award,
      label: 'Top Seller',
      description: 'Consistently high-performing seller with excellent ratings',
      className: 'bg-white/10 text-white border-white/30',
      priority: 'high'
    },
    
    fast_responder: {
      icon: Zap,
      label: 'Fast Response',
      description: 'Responds to messages within 2 hours on average',
      className: 'bg-white/10 text-gray-300 border-white/20',
      priority: 'medium'
    },
    
    // Community badges
    community_favorite: {
      icon: Users,
      label: 'Community Favorite',
      description: 'Project highly rated by the SideBuilds community',
      className: 'bg-white/10 text-gray-300 border-white/20',
      priority: 'medium'
    },
    
    trending: {
      icon: TrendingUp,
      label: 'Trending',
      description: 'High interest and activity in the past 7 days',
      className: 'bg-white/10 text-gray-300 border-white/20',
      priority: 'medium'
    },
    
    // Quality indicators
    high_quality: {
      icon: Check,
      label: 'High Quality',
      description: 'Meets premium quality standards for code and documentation',
      className: 'bg-white/10 text-gray-300 border-white/20',
      priority: 'medium'
    },
    
    popular: {
      icon: Eye,
      label: 'Popular',
      description: 'High view count and engagement metrics',
      className: 'bg-white/10 text-gray-300 border-white/20',
      priority: 'low'
    }
  };

  const config = trustBadgeConfigs[type];
  if (!config) return null;

  const Icon = config.icon;

  const renderBadgeContent = () => {
    if (config.dynamic && value !== undefined) {
      // Dynamic badges like trust score
      return (
        <>
          <Icon className="w-3 h-3" />
          <span>{type === 'trust_score' ? `${value}/100` : value}</span>
        </>
      );
    }
    
    // Static badges
    return (
      <>
        <Icon className="w-3 h-3" />
        <span>{variant === 'compact' ? config.label.split(' ')[0] : config.label}</span>
      </>
    );
  };

  const badgeVariants = {
    hidden: { opacity: 0, scale: 0, rotate: -20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      rotate: 0,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 25 
      }
    },
    hover: { 
      scale: 1.05,
      transition: { duration: 0.2 }
    }
  };

  const BadgeComponent = animated ? motion.div : 'div';
  const badgeProps = animated ? {
    variants: badgeVariants,
    initial: "hidden",
    animate: "visible",
    whileHover: "hover"
  } : {};

  return (
    <BadgeComponent
      className={cn("relative", className)}
      title={showTooltip ? config.description : undefined}
      {...badgeProps}
    >
      <Badge 
        className={cn(
          "flex items-center gap-1 text-xs font-medium border transition-all duration-200",
          config.className,
          variant === 'compact' ? "px-1.5 py-0.5" : "px-2 py-1"
        )}
      >
        {renderBadgeContent()}
      </Badge>
      
      {/* Premium glow effect for high priority badges */}
      {config.priority === 'high' && animated && (
        <motion.div
          className="absolute inset-0 -z-10 rounded-lg opacity-0"
          animate={{ 
            opacity: [0, 0.3, 0],
            scale: [0.8, 1.2, 0.8]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            repeatType: "loop"
          }}
          style={{
            background: `radial-gradient(circle, ${config.className.includes('gray') ? 'rgba(255, 255, 255, 0.3)' :
                        config.className.includes('green') ? 'rgba(34, 197, 94, 0.3)' :
                        config.className.includes('blue') ? 'rgba(59, 130, 246, 0.3)' :
                        'rgba(251, 191, 36, 0.3)'} 0%, transparent 70%)`
          }}
        />
      )}
    </BadgeComponent>
  );
};

// Trust Badge Group component for displaying multiple badges
export const TrustBadgeGroup = ({ 
  badges = [], 
  maxVisible = 3, 
  variant = 'default',
  animated = true,
  className = ''
}) => {
  const visibleBadges = badges.slice(0, maxVisible);
  const hiddenCount = Math.max(0, badges.length - maxVisible);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const Container = animated ? motion.div : 'div';
  const containerProps = animated ? {
    variants: containerVariants,
    initial: "hidden",
    animate: "visible"
  } : {};

  return (
    <Container 
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      {...containerProps}
    >
      {visibleBadges.map((badge, index) => (
        <TrustBadge
          key={`${badge.type}-${index}`}
          type={badge.type}
          value={badge.value}
          variant={variant}
          animated={animated}
        />
      ))}
      
      {hiddenCount > 0 && (
        <Badge className="bg-gray-700/50 text-gray-400 border-gray-600/50 text-xs px-2 py-1">
          +{hiddenCount}
        </Badge>
      )}
    </Container>
  );
};

// Trust Score Display component
export const TrustScoreDisplay = ({ 
  score, 
  breakdown = {}, 
  className = '',
  variant = 'full' // 'full' | 'compact' | 'minimal'
}) => {
  const getScoreColor = (score) => {
    if (score >= 85) return 'text-white';
    if (score >= 70) return 'text-gray-300';
    if (score >= 50) return 'text-gray-400';
    return 'text-gray-500';
  };

  const getScoreGradient = (score) => {
    if (score >= 85) return 'from-white to-gray-300';
    if (score >= 70) return 'from-gray-300 to-gray-400';
    if (score >= 50) return 'from-gray-400 to-gray-500';
    return 'from-gray-500 to-gray-600';
  };

  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Star className={cn("w-4 h-4", getScoreColor(score))} />
        <span className={cn("text-sm font-medium", getScoreColor(score))}>
          {score}
        </span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
            <span className={cn("text-xs font-bold", getScoreColor(score))}>
              {score}
            </span>
          </div>
          <div className="absolute inset-0 rounded-full" style={{
            background: `conic-gradient(from 0deg, ${getScoreColor(score).replace('text-', '')} ${score}%, transparent ${score}%)`
          }} />
        </div>
        <div>
          <div className={cn("text-sm font-medium", getScoreColor(score))}>
            Trust Score
          </div>
          <div className="text-xs text-gray-500">
            {score >= 85 ? 'Excellent' :
             score >= 70 ? 'Good' :
             score >= 50 ? 'Average' : 'Needs Work'}
          </div>
        </div>
      </div>
    );
  }

  // Full variant with detailed breakdown
  return (
    <div className={cn("bg-gray-900/50 border border-gray-700 rounded-xl p-4", className)}>
      <div className="text-center mb-4">
        <div className="relative inline-block">
          <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
            <div className="text-center">
              <div className={cn("text-xl font-bold", getScoreColor(score))}>
                {score}
              </div>
              <div className="text-xs text-gray-400">/100</div>
            </div>
          </div>
          <svg className="absolute inset-0 w-16 h-16 transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${(score / 100) * 188.5} 188.5`}
              className={cn("transition-all duration-1000", getScoreColor(score))}
            />
          </svg>
        </div>
        
        <div className="mt-2">
          <div className={cn("text-sm font-semibold", getScoreColor(score))}>
            {score >= 85 ? 'Excellent Trust' :
             score >= 70 ? 'Good Trust' :
             score >= 50 ? 'Average Trust' : 'Building Trust'}
          </div>
          <p className="text-xs text-gray-400">
            Based on verification and performance
          </p>
        </div>
      </div>
      
      {Object.keys(breakdown).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-300">Score Breakdown</h4>
          {Object.entries(breakdown).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-gray-400 capitalize">
                {key.replace('_', ' ')}
              </span>
              <span className={cn("text-xs font-medium", getScoreColor(value))}>
                {Math.round(value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrustBadge;
