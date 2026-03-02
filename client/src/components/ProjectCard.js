import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Heart,
  Code,
  Check,
  TrendingUp,
  DollarSign,
  Star,
  Clock,
  Shield,
  Zap,
  Bookmark,
  ExternalLink,
  Github,
  Users,
  Calendar,
  Globe,
  Award,
  Activity,
  ArrowUpRight,
  Play,
  Flame,
  Sparkles
} from 'lucide-react';
import { Badge } from '../shadcn/ui/badge';
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
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
};

// Professional muted color palette for project stages
const getStageColor = (stage) => {
  const stageColors = {
    'idea': 'bg-slate-600',
    'planning': 'bg-indigo-600',
    'mvp': 'bg-amber-600',
    'development': 'bg-teal-600',
    'launched': 'bg-emerald-600',
    'on_hold': 'bg-stone-600'
  };
  return stageColors[stage?.toLowerCase()] || 'bg-slate-600';
};

// AI Score Ring Component
const AIScoreRing = ({ score, size = 48 }) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = ((score || 0) / 100) * circumference;
  
  const getScoreColor = (score) => {
    if (score >= 80) return { stroke: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' };
    if (score >= 60) return { stroke: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' };
    return { stroke: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
  };
  
  const colors = getScoreColor(score);
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="4"
        />
        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white">{score || 0}</span>
      </div>
    </div>
  );
};

// Skeleton loader for images
const ImageSkeleton = () => (
  <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-700/30 to-transparent skeleton-shimmer" />
  </div>
);

const ProjectCard = ({ project, variant = 'default', showPrice = true, className = '' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const cardRef = useRef(null);
  const navigate = useNavigate();
  
  // 3D tilt effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { damping: 30, stiffness: 200 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), springConfig);
  const scale = useSpring(isHovered ? 1.02 : 1, springConfig);
  
  // Glow position
  const glowX = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), springConfig);
  const glowY = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), springConfig);
  
  const handleMouseMove = (e) => {
    if (!cardRef.current || isMobile) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };
  
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Status mappings - professional muted color palette
  const statusConfig = {
    idea: {
      label: 'Concept',
      color: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
      gradient: 'from-slate-900 to-slate-800',
      icon: Zap
    },
    planning: {
      label: 'Planning',
      color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
      gradient: 'from-indigo-900 to-slate-900',
      icon: Calendar
    },
    development: {
      label: 'Building',
      color: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
      gradient: 'from-teal-900 to-slate-900',
      icon: Code
    },
    mvp: {
      label: 'MVP',
      color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      gradient: 'from-amber-900 to-slate-900',
      icon: Activity
    },
    launched: {
      label: 'Live',
      color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      gradient: 'from-emerald-900 to-slate-900',
      icon: Globe
    },
    mature: {
      label: 'Proven',
      color: 'bg-emerald-600/15 text-emerald-200 border-emerald-500/30',
      gradient: 'from-emerald-950 to-slate-900',
      icon: Award
    },
    on_hold: {
      label: 'On Hold',
      color: 'bg-stone-500/15 text-stone-300 border-stone-500/30',
      gradient: 'from-stone-900 to-slate-900',
      icon: Clock
    },
  };

  const status = statusConfig[project.stage] || statusConfig.idea;
  const StatusIcon = status.icon;

  // Enhanced tech stack display
  const techStack = project.tech_stack ? 
    (Array.isArray(project.tech_stack) ? project.tech_stack : project.tech_stack.split(',').map(t => t.trim())) 
    : [];

  // Determine if this is a "hot deal"
  const isHotDeal = project.sale_price && project.ai_estimated_value && 
    project.sale_price < project.ai_estimated_value * 0.8;
  
  // Is trending (views above threshold)
  const isTrending = project.view_count > 100 || project.trending;

  return (
    <motion.div
      ref={cardRef}
      className={`group relative ${className} cursor-pointer`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => navigate(`/projects/${project.project_id}`)}
      style={{
        perspective: 1000,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 3D tilting container */}
      <motion.div
        style={{
          rotateX: isMobile ? 0 : rotateX,
          rotateY: isMobile ? 0 : rotateY,
          scale,
          transformStyle: 'preserve-3d',
        }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
      >
        {/* Enhanced card with dynamic gradient glow */}
        <div className="relative h-full overflow-hidden">
          {/* Dynamic gradient glow that follows mouse */}
          <motion.div
            className="absolute -inset-1 rounded-none opacity-0 blur-xl transition-opacity duration-500"
            style={{
              background: `radial-gradient(circle at ${glowX}% ${glowY}%, rgba(59,130,246,0.5) 0%, rgba(6,182,212,0.3) 50%, transparent 80%)`,
              opacity: isHovered ? 0.7 : 0,
            }}
          />
          
          {/* Border on hover */}
          <motion.div
            className="absolute -inset-0.5 bg-white/20 opacity-0"
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
          
          {/* Main card */}
          <div className="relative h-full bg-[#0c0c0c] backdrop-blur-xl border border-white/[0.08] rounded-none overflow-hidden transition-all duration-300 hover:border-white/[0.15]">
            
            {/* Thumbnail/Image Section */}
            <div className="relative h-40 overflow-hidden bg-gradient-to-br from-gray-900 to-black">
              {project.thumbnail_url ? (
                <>
                  {!imageLoaded && <ImageSkeleton />}
                  <motion.img
                    src={project.thumbnail_url}
                    alt={project.name}
                    className={`w-full h-full object-cover transition-all duration-700 ${
                      imageLoaded ? 'opacity-100' : 'opacity-0'
                    } ${isHovered ? 'scale-110' : 'scale-100'}`}
                    onLoad={() => setImageLoaded(true)}
                  />
                </>
              ) : (
                // Placeholder gradient
                <div className={`absolute inset-0 bg-gradient-to-br ${status.gradient} opacity-20`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <StatusIcon className="w-16 h-16 text-white/20" />
                  </div>
                </div>
              )}
              
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-transparent to-transparent" />
              
              {/* Top badges row */}
              <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                {/* Status badge */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`px-2.5 py-1 rounded-none text-xs font-medium border backdrop-blur-md ${status.color}`}
                >
                  <span className="flex items-center gap-1.5">
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </motion.div>
                
                {/* Right side badges */}
                <div className="flex items-center gap-2">
                  {isTrending && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="px-2 py-1 rounded-none bg-orange-500/20 border border-orange-500/30 backdrop-blur-md flex items-center gap-1"
                    >
                      <Flame className="w-3 h-3 text-orange-400" />
                      <span className="text-xs text-orange-400 font-medium">Hot</span>
                    </motion.div>
                  )}
                  
                  {/* Bookmark button */}
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIsBookmarked(!isBookmarked);
                    }}
                    className={`w-8 h-8 rounded-none backdrop-blur-md flex items-center justify-center transition-colors ${
                      isBookmarked
                        ? 'bg-white/20 border-white/40'
                        : 'bg-black/30 border-white/10 hover:bg-white/10'
                    } border`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Bookmark className={`w-4 h-4 ${isBookmarked ? 'text-white fill-white' : 'text-white/70'}`} />
                  </motion.button>
                </div>
              </div>
              
              {/* AI Score Ring (bottom right of image) */}
              {(project.ai_score || project.overall_score) && (
                <div className="absolute bottom-3 right-3">
                  <div className="relative">
                    <AIScoreRing score={project.ai_score || project.overall_score} size={44} />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white flex items-center justify-center">
                      <Sparkles className="w-2.5 h-2.5 text-black" />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Quick action overlay on hover */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link to={`/projects/${project.project_id}`}>
                      <motion.button
                        className="px-4 py-2 bg-white text-black text-sm font-bold uppercase flex items-center gap-2 hover:bg-gray-200 transition-colors"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </motion.button>
                    </Link>
                    
                    {project.demo_url && (
                      <motion.a
                        href={project.demo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-white/10 text-white rounded-none text-sm font-medium flex items-center gap-2 border border-white/20 hover:bg-white/20 transition-colors"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.15 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Play className="w-4 h-4" />
                        Demo
                      </motion.a>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          
            {/* Content Section */}
            <div className="p-4 space-y-3">
              {/* Title and price row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Link to={`/projects/${project.project_id}`}>
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors truncate">
                      {project.name}
                    </h3>
                  </Link>
                  
                  {/* Trust badges */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    <TrustBadgeGroup
                      badges={[
                        ...(project.is_verified ? [{ type: 'identity_verified' }] : []),
                        ...(project.revenue_verified ? [{ type: 'revenue_verified' }] : []),
                        ...(project.code_quality_verified ? [{ type: 'code_reviewed' }] : []),
                      ]}
                      maxVisible={3}
                      variant="compact"
                      animated={true}
                    />
                  </div>
                </div>
                
                {/* Enhanced price display */}
                {showPrice && project.is_for_sale && project.sale_price && (
                  <div className="flex flex-col items-end shrink-0">
                    <div className="flex items-center gap-1.5">
                      {isHotDeal && (
                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded uppercase">
                          Deal
                        </span>
                      )}
                      <span className="text-xl font-bold text-white">
                        {formatPrice(project.sale_price)}
                      </span>
                    </div>
                    {project.monthly_revenue > 0 && (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {formatPrice(project.monthly_revenue)}/mo
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Description */}
              <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">
                {project.description}
              </p>
              
              {/* Tech stack pills */}
              {techStack.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {techStack.slice(0, 4).map((tech, index) => (
                    <motion.span
                      key={tech}
                      className="px-2 py-0.5 bg-white/[0.05] text-gray-300 text-xs rounded-md border border-white/[0.08] hover:bg-white/[0.1] transition-colors"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      {tech}
                    </motion.span>
                  ))}
                  {techStack.length > 4 && (
                    <span className="px-2 py-0.5 bg-white/[0.03] text-gray-500 text-xs rounded-md border border-white/[0.05]">
                      +{techStack.length - 4}
                    </span>
                  )}
                </div>
              )}
              
              {/* Stats row */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                <div className="flex items-center gap-4">
                  {project.view_count !== undefined && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{formatNumber(project.view_count)}</span>
                    </div>
                  )}
                  
                  {project.users_count && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Users className="w-3.5 h-3.5" />
                      <span>{formatNumber(project.users_count)}</span>
                    </div>
                  )}
                  
                  {project.created_at && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</span>
                    </div>
                  )}
                </div>
                
                {/* Quick links */}
                <div className="flex items-center gap-2">
                  {project.github_url && (
                    <motion.a
                      href={project.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-none bg-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.1] transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); }}
                    >
                      <Github className="w-3.5 h-3.5" />
                    </motion.a>
                  )}
                  
                  {project.domain && (
                    <motion.a
                      href={`https://${project.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-none bg-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.1] transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </motion.a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProjectCard;
