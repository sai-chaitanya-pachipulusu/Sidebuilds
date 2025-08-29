import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiEye,
  FiHeart,
  FiCode,
  FiCheck,
  FiTrendingUp,
  FiDollarSign,
  FiStar,
  FiClock,
  FiShield,
  FiZap,
  FiBookmark,
  FiExternalLink,
  FiGithub,
  FiUsers,
  FiCalendar,
  FiGlobe,
  FiAward
} from 'react-icons/fi';
import { Badge } from '../shadcn/ui/badge';
import { ExternalLink as ExternalLinkIcon, Github, Star, TrendingUp, Users, Calendar } from 'lucide-react';
import TrustBadge, { TrustBadgeGroup } from './TrustBadge';

// Helper functions
const formatPrice = (price) => {
  if (!price) return 'Contact for Price';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
};

const getStageColor = (stage) => {
  const stageColors = {
    'idea': 'bg-gray-600',
    'planning': 'bg-blue-600',
    'mvp': 'bg-purple-600',
    'development': 'bg-orange-600',
    'launched': 'bg-green-600',
    'on_hold': 'bg-red-600'
  };
  return stageColors[stage?.toLowerCase()] || 'bg-gray-600';
};

const ProjectCard = ({ project, variant = 'default', showPrice = true, className = '' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Enhanced status mappings with modern styling
  const statusConfig = {
    idea: { 
      label: 'Concept', 
      color: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
      icon: FiZap 
    },
    development: { 
      label: 'Building', 
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      icon: FiCode 
    },
    launched: { 
      label: 'Live', 
      color: 'bg-green-500/10 text-green-400 border-green-500/30',
      icon: FiGlobe 
    },
    mature: { 
      label: 'Proven', 
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      icon: FiAward 
    },
  };

  const status = statusConfig[project.stage] || statusConfig.idea;
  const StatusIcon = status.icon;

  // Enhanced tech stack display
  const techStack = project.tech_stack ? 
    (Array.isArray(project.tech_stack) ? project.tech_stack : project.tech_stack.split(',').map(t => t.trim())) 
    : [];

  return (
    <motion.div
      className={`group relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -2 }} // Reduced movement for mobile
      transition={{ duration: 0.2 }}
    >
      {/* Enhanced card with gradient border effect */}
      <div className="relative h-full overflow-hidden">
        {/* Gradient border on hover - Linear inspired */}
        <motion.div
          className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-2xl opacity-0 blur-sm"
          animate={{ opacity: isHovered ? 0.3 : 0 }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Main card */}
        <div className="relative h-full bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-2xl overflow-hidden transition-all duration-300 hover:border-gray-700">
          
          {/* Mobile-optimized header */}
          <div className="p-3 sm:p-4 md:p-6 border-b border-gray-800/50">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-4">
              <div className="flex-1 w-full sm:w-auto">
                {/* Title and verification badges */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                    {project.name}
                  </h3>
                  
                  {/* Enhanced trust badges with new system */}
                  <div className="flex flex-wrap gap-1.5">
                    <TrustBadgeGroup
                      badges={[
                        ...(project.is_verified ? [{ type: 'identity_verified' }] : []),
                        ...(project.revenue_verified ? [{ type: 'revenue_verified' }] : []),
                        ...(project.code_quality_verified ? [{ type: 'code_reviewed' }] : []),
                        ...(project.trust_score ? [{ type: 'trust_score', value: project.trust_score }] : []),
                        ...(project.top_seller ? [{ type: 'top_seller' }] : []),
                        ...(project.fast_responder ? [{ type: 'fast_responder' }] : []),
                        ...(project.trending ? [{ type: 'trending' }] : []),
                        ...(project.community_favorite ? [{ type: 'community_favorite' }] : [])
                      ]}
                      maxVisible={3}
                      variant="compact"
                      animated={true}
                    />
                  </div>
                </div>
                
                {/* Status and metrics - mobile-friendly */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge className={`${status.color} flex items-center gap-1.5 px-2 py-1 text-xs`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </Badge>
                  
                  {project.monthly_revenue && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <FiTrendingUp className="w-3 h-3 text-green-400" />
                      <span className="text-green-400 font-medium">
                        {formatPrice(project.monthly_revenue)}/mo
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Price tag - mobile-optimized */}
              {showPrice && project.is_for_sale && project.sale_price && (
                <motion.div
                  className="flex flex-col items-start sm:items-end"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="text-xl md:text-2xl font-bold text-white">
                    {formatPrice(project.sale_price)}
                  </div>
                  <div className="text-xs text-gray-400">asking price</div>
                </motion.div>
              )}
            </div>
            
            {/* Description with better mobile spacing */}
            <p className="text-gray-300 text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-3">
              {project.description}
            </p>
          </div>

          {/* Content section with mobile optimization */}
          <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
            
            {/* Tech stack - mobile-friendly pills */}
            {techStack.length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {techStack.slice(0, isMobile ? 2 : 3).map((tech, index) => (
                  <motion.span
                    key={tech}
                    className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-800/60 text-gray-300 text-xs rounded-md sm:rounded-lg border border-gray-700/50"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {tech}
                  </motion.span>
                ))}
                {techStack.length > (isMobile ? 2 : 3) && (
                  <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-800/60 text-gray-400 text-xs rounded-md sm:rounded-lg border border-gray-700/50">
                    +{techStack.length - (isMobile ? 2 : 3)}
                  </span>
                )}
              </div>
            )}

            {/* Enhanced metrics with mobile-friendly grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {project.users_count && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <FiUsers className="w-4 h-4" />
                  <span>{project.users_count.toLocaleString()} users</span>
                </div>
              )}
              
              {project.created_at && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <FiCalendar className="w-4 h-4" />
                  <span>{new Date(project.created_at).getFullYear()}</span>
                </div>
              )}
            </div>

            {/* Mobile-optimized action buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 pt-2">
              <div className="flex items-center gap-2 sm:gap-3">
                {project.github_url && (
                  <motion.a
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 px-2 sm:px-3 py-2 min-h-[44px] text-gray-400 hover:text-white text-xs sm:text-sm transition-colors border border-gray-700 rounded-lg hover:border-gray-600"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiGithub className="w-4 h-4" />
                    <span className="hidden sm:inline">Code</span>
                  </motion.a>
                )}
                
                {project.domain && (
                  <motion.a
                    href={`https://${project.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 px-2 sm:px-3 py-2 min-h-[44px] text-gray-400 hover:text-white text-xs sm:text-sm transition-colors border border-gray-700 rounded-lg hover:border-gray-600"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">Live</span>
                  </motion.a>
                )}
              </div>
              
              {/* Mobile-friendly view details button */}
              <Link to={`/projects/${project.project_id}`} className="flex-1 sm:flex-initial">
                <motion.button
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 min-h-[44px] bg-purple-600/20 text-purple-300 rounded-lg text-xs sm:text-sm font-medium border border-purple-600/30 hover:bg-purple-600/30 transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  View Details
                </motion.button>
              </Link>
            </div>
          </div>
          
          {/* Enhanced hover overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-transparent to-blue-600/5 opacity-0 pointer-events-none"
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
          
          {/* Mobile-friendly trust indicator */}
          {project.trust_score && project.trust_score >= 85 && (
            <div className="absolute top-2 left-2 sm:hidden">
              <div className="w-8 h-8 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center">
                <FiShield className="w-4 h-4 text-green-400" />
              </div>
            </div>
          )}
          
          {/* Floating indicators */}
          <AnimatePresence>
            {isHovered && project.is_for_sale && (
              <motion.div
                className="absolute top-4 right-4 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30"
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                For Sale
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectCard;

/*
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardBody,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  Avatar,
  Icon,
  Tooltip,
  Tag,
  TagLabel,
  TagLeftIcon,
  Divider,
  Flex,
  Image,
  Stack,
  Button,
  IconButton,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import {
  FiEye,
  FiHeart,
  FiCode,
  FiCheck,
  FiTrendingUp,
  FiDollarSign,
  FiStar,
  FiClock,
  FiShield,
  FiZap,
  FiBookmark,
} from 'react-icons/fi';

const MotionCard = motion(Card);

// Replace VerifiedIcon with FiCheck
const VerifiedIcon = FiCheck;

// Helper function to format price
const formatPrice = (price) => {
  if (!price) return 'Contact for Price';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

// Helper function to format numbers
const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
};

// Helper function to get stage color
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

// Verification badges component
const VerificationBadges = ({ project }) => {
  const badges = [];
  
  if (project.is_verified) {
    badges.push({
      icon: FiCheck,
      label: 'Verified Project',
      color: 'green',
    });
  }
  
  if (project.revenue_verified) {
    badges.push({
      icon: FiDollarSign,
      label: 'Revenue Verified',
      color: 'green',
    });
  }
  
  if (project.traffic_verified) {
    badges.push({
      icon: FiTrendingUp,
      label: 'Traffic Verified',
      color: 'green',
    });
  }
  
  if (project.code_transferred) {
    badges.push({
      icon: FiZap,
      label: 'Fast Transfer',
      color: 'blue',
    });
  }
  
  return (
    <HStack spacing={1}>
      {badges.map((badge, index) => (
        <Tooltip key={index} label={badge.label}>
          <Box
            p={1}
            bg={`${badge.color}.50`}
            borderRadius="md"
            color={`${badge.color}.500`}
          >
            <Icon as={badge.icon} boxSize={3} />
          </Box>
        </Tooltip>
      ))}
    </HStack>
  );
};

function ProjectCard({ project, variant = 'default', onLike, onSave }) {
  // Color mode values - DARK MODE ONLY
  const cardBg = 'gray.800';
  const borderColor = 'gray.700';
  const textSecondary = 'gray.400';
  const priceBg = 'brand.900';
  const priceColor = 'brand.200';
  const revenueBg = 'green.900';
  const revenueColor = 'green.300';
  const revenueBorderColor = 'green.700';
  
  const isLiked = project.is_liked || false;
  const isSaved = project.is_saved || false;
  
  const cardVariants = {
    default: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      whileHover: { y: -8 },
      transition: { duration: 0.3 }
    },
    featured: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      whileHover: { scale: 1.02 },
      transition: { duration: 0.3 }
    }
  };
  
  const currentVariant = cardVariants[variant] || cardVariants.default;
  
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl">
      //Gradient overlay for premium feel
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      // Content 
      <div className="relative p-6">
        // Premium badge 
        {project.verified && (
          <div className="absolute -top-2 -right-2 w-16 h-16">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full animate-pulse" />
            <div className="absolute inset-1 bg-yellow-400 rounded-full flex items-center justify-center">
              <VerifiedIcon className="w-6 h-6 text-yellow-900" />
            </div>
          </div>
        )}

        // Enhanced project details with better spacing and typography
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white tracking-tight group-hover:text-blue-300 transition-colors">
            {project.title}
          </h3>
          
          <p className="text-gray-300 line-clamp-2 leading-relaxed">
            {project.description}
          </p>

          // Stats with glassmorphism
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-2xl font-bold text-green-400">{formatPrice(project.price)}</span>
            <span className="text-sm text-gray-400">{project.stage}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectCard; 

*/

