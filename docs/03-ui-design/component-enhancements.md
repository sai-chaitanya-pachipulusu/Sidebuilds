# SideBuilds Marketplace - Component Enhancement Specifications

## Executive Summary

This document provides implementation-ready design specifications for enhancing the SideBuilds marketplace components, focusing on P0 and P1 priority items identified in the UX research and planning phases. The enhancements maintain the Chronicle/Linear-inspired dark theme with glassmorphism effects while addressing critical mobile UX issues, trust signal improvements, and purchase flow optimization.

**Key Design Principles:**
- Mobile-first responsive design (48px minimum touch targets)
- Chronicle/Linear aesthetic with glassmorphism effects
- Trust-focused visual hierarchy
- Accessibility compliance (WCAG AA)
- Performance-optimized interactions

---

## P0 Priority Enhancements

### P0.1 Mobile-Responsive ProjectCard Component

**File**: `client/src/components/ProjectCard.js`
**Priority**: Critical | **Timeline**: Week 1

#### Current Issues
- Touch targets smaller than 48px minimum requirement
- Cramped information display on mobile screens
- Difficult price comparison and action interactions
- Missing swipe gesture support

#### Enhanced Mobile-First Design

```jsx
// Enhanced responsive breakpoints and touch targets
const mobileEnhancedStyles = {
  // Minimum 48px touch targets for mobile
  touchTarget: "min-h-[48px] min-w-[48px]",
  
  // Responsive card padding
  cardPadding: "p-4 md:p-6",
  
  // Mobile-optimized text hierarchy
  mobileText: {
    title: "text-lg md:text-xl font-semibold",
    description: "text-sm md:text-base",
    price: "text-xl md:text-2xl",
    metadata: "text-xs md:text-sm"
  },
  
  // Enhanced grid layout
  mobileGrid: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
};
```

#### Trust Badge Enhancement

```jsx
// Enhanced trust badge system with granular verification
const TrustBadgeSystem = {
  // Revenue verification badge
  revenueVerified: {
    className: "bg-green-500/10 text-green-400 border-green-500/30 flex items-center gap-1.5 px-2 py-1",
    icon: "FiDollarSign",
    label: "Revenue Verified",
    tooltip: "Monthly revenue confirmed through Stripe integration"
  },
  
  // Code quality badge
  codeVerified: {
    className: "bg-blue-500/10 text-blue-400 border-blue-500/30 flex items-center gap-1.5 px-2 py-1",
    icon: "FiCode",
    label: "Code Reviewed",
    tooltip: "Repository analyzed for quality and security"
  },
  
  // Identity verification badge
  identityVerified: {
    className: "bg-purple-500/10 text-purple-400 border-purple-500/30 flex items-center gap-1.5 px-2 py-1",
    icon: "FiShield",
    label: "ID Verified",
    tooltip: "Seller identity confirmed"
  },
  
  // Trust score indicator
  trustScore: {
    className: "bg-gradient-to-r from-yellow-400/20 to-orange-400/20 text-yellow-300 border-yellow-400/30 px-2 py-1 rounded-full",
    scoreDisplay: "flex items-center gap-1 text-sm font-medium"
  }
};
```

#### Mobile-Optimized Component Structure

```jsx
// Enhanced ProjectCard with mobile-first approach
const ProjectCard = ({ project, variant = 'default', showPrice = true, className = '' }) => {
  return (
    <motion.div
      className={`group relative ${className}`}
      whileHover={{ y: -2 }} // Reduced movement for mobile
      transition={{ duration: 0.2 }}
    >
      {/* Enhanced card with better mobile spacing */}
      <div className="relative h-full overflow-hidden">
        {/* Gradient border effect */}
        <motion.div
          className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-2xl opacity-0 blur-sm"
          animate={{ opacity: isHovered ? 0.3 : 0 }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Main card with mobile-optimized structure */}
        <div className="relative h-full bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-2xl overflow-hidden transition-all duration-300 hover:border-gray-700">
          
          {/* Mobile-optimized header */}
          <div className="p-4 md:p-6 border-b border-gray-800/50">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-4">
              <div className="flex-1 w-full sm:w-auto">
                {/* Title and verification badges */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <h3 className="text-lg md:text-xl font-semibold text-white group-hover:text-purple-300 transition-colors">
                    {project.name}
                  </h3>
                  
                  {/* Trust badges with mobile-friendly layout */}
                  <div className="flex flex-wrap gap-1.5">
                    {project.is_verified && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/30 flex items-center gap-1 text-xs">
                          <FiCheck className="w-3 h-3" />
                          Verified
                        </Badge>
                      </motion.div>
                    )}
                    
                    {project.revenue_verified && (
                      <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 flex items-center gap-1 text-xs">
                        <FiDollarSign className="w-3 h-3" />
                        Revenue
                      </Badge>
                    )}
                    
                    {project.trust_score && (
                      <Badge className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 text-yellow-300 border-yellow-400/30 text-xs">
                        ⭐ {project.trust_score}/100
                      </Badge>
                    )}
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
            <p className="text-gray-300 text-sm leading-relaxed line-clamp-2">
              {project.description}
            </p>
          </div>

          {/* Content section with mobile optimization */}
          <div className="p-4 md:p-6 space-y-4">
            
            {/* Tech stack - mobile-friendly pills */}
            {techStack.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {techStack.slice(0, 3).map((tech, index) => (
                  <motion.span
                    key={tech}
                    className="px-2 py-1 bg-gray-800/60 text-gray-300 text-xs rounded-lg border border-gray-700/50"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {tech}
                  </motion.span>
                ))}
                {techStack.length > 3 && (
                  <span className="px-2 py-1 bg-gray-800/60 text-gray-400 text-xs rounded-lg border border-gray-700/50">
                    +{techStack.length - 3}
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-3">
                {project.github_url && (
                  <motion.a
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 px-3 py-2 min-h-[48px] text-gray-400 hover:text-white text-sm transition-colors border border-gray-700 rounded-lg hover:border-gray-600"
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
                    className="flex items-center justify-center gap-1 px-3 py-2 min-h-[48px] text-gray-400 hover:text-white text-sm transition-colors border border-gray-700 rounded-lg hover:border-gray-600"
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
                  className="w-full sm:w-auto px-4 py-2 min-h-[48px] bg-purple-600/20 text-purple-300 rounded-lg text-sm font-medium border border-purple-600/30 hover:bg-purple-600/30 transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  View Details
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
```

### P0.2 Enhanced MarketplaceFilters Component

**File**: `client/src/components/MarketplaceFilters.js`
**Priority**: Critical | **Timeline**: Week 1

#### Mobile-First Filter Design

```jsx
// Mobile-optimized filter component with bottom sheet modals
const MobileFilterEnhancements = {
  // Bottom sheet modal for mobile filters
  bottomSheetModal: {
    className: "fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-gray-900/95 backdrop-blur-xl border-t border-white/10",
    animation: "slide-up-from-bottom",
    maxHeight: "80vh",
    touchDragClose: true
  },
  
  // Enhanced touch targets
  filterButtons: {
    className: "flex items-center gap-2 px-4 py-3 min-h-[48px] bg-gray-900/50 border border-white/10 rounded-xl text-white hover:border-white/20 transition-colors duration-200",
    touchFeedback: "active:scale-95 transition-transform duration-100"
  },
  
  // Mobile-specific search enhancements
  mobileSearch: {
    className: "w-full pl-12 pr-4 py-3 min-h-[48px] bg-gray-900/50 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition-colors duration-200",
    clearButton: "absolute right-4 top-1/2 -translate-y-1/2 p-2 min-w-[44px] min-h-[44px] hover:bg-gray-700 rounded-full transition-colors duration-200"
  }
};
```

#### Bottom Sheet Filter Modal Implementation

```jsx
// Mobile-optimized filter modal component
const MobileFilterModal = ({ isOpen, onClose, filters, onApplyFilters }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] bg-gray-900/95 backdrop-blur-xl border-t border-white/10 rounded-t-2xl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Filters</h3>
              <button
                onClick={onClose}
                className="p-2 min-w-[44px] min-h-[44px] hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {/* Filter Content */}
            <div className="overflow-y-auto p-6 space-y-6">
              {/* Categories */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">Category</h4>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setCategoryFilter(category.id)}
                        className={cn(
                          "flex items-center gap-2 p-3 min-h-[48px] rounded-xl text-left transition-colors duration-200",
                          categoryFilter === category.id 
                            ? "bg-purple-600/20 border border-purple-500/30 text-purple-300" 
                            : "bg-gray-800/50 border border-gray-700 text-gray-300 hover:border-gray-600"
                        )}
                      >
                        <Icon className={cn("w-4 h-4", category.color)} />
                        <span className="text-sm">{category.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Price Range */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">Price Range</h4>
                <div className="space-y-2">
                  {priceRanges.map((range) => (
                    <button
                      key={range.id}
                      onClick={() => setPriceFilter(range.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 min-h-[48px] rounded-xl text-left transition-colors duration-200",
                        priceFilter === range.id 
                          ? "bg-green-600/20 border border-green-500/30 text-green-300" 
                          : "bg-gray-800/50 border border-gray-700 text-gray-300 hover:border-gray-600"
                      )}
                    >
                      <span className="text-sm">{range.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Sort Options */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">Sort By</h4>
                <div className="space-y-2">
                  {sortOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setSortBy(option.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 min-h-[48px] rounded-xl text-left transition-colors duration-200",
                          sortBy === option.id 
                            ? "bg-blue-600/20 border border-blue-500/30 text-blue-300" 
                            : "bg-gray-800/50 border border-gray-700 text-gray-300 hover:border-gray-600"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{option.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 p-6 border-t border-white/10">
              <button
                onClick={clearAllFilters}
                className="flex-1 px-4 py-3 min-h-[48px] bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => {
                  onApplyFilters(filters);
                  onClose();
                }}
                className="flex-1 px-4 py-3 min-h-[48px] bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
```

### P0.3 Enhanced Modal Component (Bottom Sheet Support)

**File**: `client/src/components/uikit/Modal.js`
**Priority**: Critical | **Timeline**: Week 1

#### Mobile-Responsive Modal Enhancements

```jsx
// Enhanced Modal with mobile bottom sheet support
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  variant = 'center', // 'center' | 'bottom-sheet'
  size = 'md' // 'sm' | 'md' | 'lg' | 'full'
}) => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Auto-use bottom sheet on mobile for better UX
  const modalVariant = isMobile && variant === 'center' ? 'bottom-sheet' : variant;
  
  const modalStyles = {
    center: {
      content: "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl z-50 p-6",
      animation: {
        initial: { opacity: 0, y: 30, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 30, scale: 0.95 }
      }
    },
    'bottom-sheet': {
      content: "fixed inset-x-0 bottom-0 z-50 max-h-[80vh] bg-gray-900/95 backdrop-blur-xl border-t border-gray-700 rounded-t-2xl shadow-2xl",
      animation: {
        initial: { opacity: 0, y: "100%" },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: "100%" }
      }
    }
  };
  
  const currentStyle = modalStyles[modalVariant];
  
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className={currentStyle.content}
                initial={currentStyle.animation.initial}
                animate={currentStyle.animation.animate}
                exit={currentStyle.animation.exit}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                {modalVariant === 'bottom-sheet' && (
                  <>
                    {/* Drag Handle */}
                    <div className="flex justify-center pt-3 pb-2">
                      <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
                    </div>
                    
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                      <Dialog.Title className="text-lg font-semibold text-white">
                        {title}
                      </Dialog.Title>
                      <Dialog.Close asChild>
                        <button className="p-2 min-w-[44px] min-h-[44px] text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </Dialog.Close>
                    </div>
                    
                    {/* Content */}
                    <div className="overflow-y-auto p-6">
                      {children}
                    </div>
                  </>
                )}
                
                {modalVariant === 'center' && (
                  <>
                    <Dialog.Title className="text-xl font-bold text-white mb-4">
                      {title}
                    </Dialog.Title>
                    
                    {children}

                    <Dialog.Close asChild>
                      <button className="absolute top-4 right-4 p-1 min-w-[44px] min-h-[44px] text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </Dialog.Close>
                  </>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </AnimatePresence>
  );
};
```

---

## P1 Priority Enhancements

### P1.1 Enhanced Trust Signal System

**New Component**: `client/src/components/TrustBadge.js`
**Priority**: High | **Timeline**: Week 1-2

#### Trust Score Visualization Component

```jsx
// Comprehensive trust badge system
const TrustBadge = ({ 
  user, 
  project, 
  variant = 'detailed', // 'minimal' | 'detailed' | 'score-only'
  showTooltip = true 
}) => {
  const trustMetrics = calculateTrustScore(user, project);
  
  const trustLevels = {
    basic: {
      score: 0-39,
      color: 'from-gray-500 to-gray-600',
      textColor: 'text-gray-400',
      label: 'Basic',
      icon: Shield
    },
    verified: {
      score: 40-69,
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-400',
      label: 'Verified',
      icon: CheckCircle
    },
    trusted: {
      score: 70-89,
      color: 'from-green-500 to-green-600',
      textColor: 'text-green-400',
      label: 'Trusted',
      icon: Award
    },
    premium: {
      score: 90-100,
      color: 'from-purple-500 to-pink-500',
      textColor: 'text-purple-400',
      label: 'Premium',
      icon: Star
    }
  };
  
  const currentLevel = Object.values(trustLevels).find(
    level => trustMetrics.totalScore >= level.score[0] && trustMetrics.totalScore <= level.score[1]
  ) || trustLevels.basic;
  
  const TrustIcon = currentLevel.icon;
  
  if (variant === 'minimal') {
    return (
      <div className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border",
        `bg-gradient-to-r ${currentLevel.color} bg-opacity-10`,
        `${currentLevel.textColor} border-current border-opacity-30`
      )}>
        <TrustIcon className="w-3 h-3" />
        <span>{trustMetrics.totalScore}</span>
      </div>
    );
  }
  
  if (variant === 'score-only') {
    return (
      <div className="flex items-center gap-2">
        <div className={cn(
          "relative w-12 h-12 rounded-full p-0.5",
          `bg-gradient-to-r ${currentLevel.color}`
        )}>
          <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">{trustMetrics.totalScore}</span>
          </div>
        </div>
        <div>
          <div className={cn("text-sm font-medium", currentLevel.textColor)}>
            {currentLevel.label}
          </div>
          <div className="text-xs text-gray-400">Trust Score</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
      {/* Trust Score Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "relative w-14 h-14 rounded-full p-0.5",
            `bg-gradient-to-r ${currentLevel.color}`
          )}>
            <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-bold">{trustMetrics.totalScore}</span>
            </div>
          </div>
          <div>
            <div className={cn("text-lg font-semibold", currentLevel.textColor)}>
              {currentLevel.label} Seller
            </div>
            <div className="text-sm text-gray-400">Trust Score: {trustMetrics.totalScore}/100</div>
          </div>
        </div>
        
        {showTooltip && (
          <Tooltip content="Based on verification, sales history, and buyer feedback">
            <HelpCircle className="w-5 h-5 text-gray-400" />
          </Tooltip>
        )}
      </div>
      
      {/* Verification Badges */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {trustMetrics.verifications.map((verification, index) => {
          const IconComponent = verification.icon;
          return (
            <div
              key={index}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg text-xs",
                verification.verified 
                  ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                  : "bg-gray-700/30 text-gray-500 border border-gray-600/20"
              )}
            >
              <IconComponent className="w-3 h-3" />
              <span>{verification.label}</span>
              {verification.verified && <CheckCircle className="w-3 h-3 ml-auto" />}
            </div>
          );
        })}
      </div>
      
      {/* Trust Metrics */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Successful Sales</span>
          <span className="text-white font-medium">{trustMetrics.successfulSales}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Avg. Rating</span>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400 fill-current" />
            <span className="text-white font-medium">{trustMetrics.averageRating}</span>
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Response Time</span>
          <span className="text-white font-medium">{trustMetrics.responseTime}</span>
        </div>
      </div>
    </div>
  );
};

// Trust score calculation function
const calculateTrustScore = (user, project) => {
  let score = 0;
  let verifications = [];
  
  // Identity verification (20 points)
  const identityVerified = user?.identity_verified || false;
  verifications.push({
    label: 'Identity',
    verified: identityVerified,
    icon: Shield,
    points: identityVerified ? 20 : 0
  });
  score += identityVerified ? 20 : 0;
  
  // Revenue verification (25 points)
  const revenueVerified = project?.revenue_verified || false;
  verifications.push({
    label: 'Revenue',
    verified: revenueVerified,
    icon: DollarSign,
    points: revenueVerified ? 25 : 0
  });
  score += revenueVerified ? 25 : 0;
  
  // Code quality verification (20 points)
  const codeVerified = project?.code_verified || false;
  verifications.push({
    label: 'Code Quality',
    verified: codeVerified,
    icon: Code,
    points: codeVerified ? 20 : 0
  });
  score += codeVerified ? 20 : 0;
  
  // Transaction history (35 points)
  const salesCount = user?.successful_sales || 0;
  const salesPoints = Math.min(salesCount * 5, 35);
  verifications.push({
    label: 'Sales History',
    verified: salesCount > 0,
    icon: TrendingUp,
    points: salesPoints
  });
  score += salesPoints;
  
  return {
    totalScore: Math.min(score, 100),
    verifications,
    successfulSales: salesCount,
    averageRating: user?.average_rating || 0,
    responseTime: user?.avg_response_time || 'N/A'
  };
};
```

### P1.2 Enhanced Search Interface

**File**: `client/src/components/AdvancedSearch.js`
**Priority**: High | **Timeline**: Week 3-4

#### Smart Search Component Enhancement

```jsx
// Enhanced search with AI-powered suggestions and semantic matching
const AdvancedSearch = ({ 
  searchTerm, 
  onSearchChange, 
  onFiltersChange,
  suggestions = [],
  recentSearches = [],
  showAdvanced = false 
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [smartSuggestions, setSmartSuggestions] = useState([]);
  
  // AI-powered search suggestions
  const searchSuggestions = {
    semantic: {
      'ecommerce': ['online store', 'marketplace', 'shopping platform', 'retail'],
      'saas': ['software service', 'web app', 'cloud platform', 'subscription'],
      'ai': ['machine learning', 'artificial intelligence', 'neural network', 'automation'],
      'react': ['react.js', 'next.js', 'javascript', 'typescript', 'frontend']
    },
    
    trending: [
      { term: 'AI SaaS', count: 234, trend: '+15%' },
      { term: 'E-commerce', count: 189, trend: '+8%' },
      { term: 'Mobile App', count: 156, trend: '+12%' },
      { term: 'Marketplace', count: 134, trend: '+6%' }
    ],
    
    revenue: [
      { range: '$0-1K', projects: 45 },
      { range: '$1K-5K', projects: 78 },
      { range: '$5K-10K', projects: 34 },
      { range: '$10K+', projects: 23 }
    ]
  };
  
  return (
    <div className="relative">
      {/* Enhanced search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search projects, tech stack, revenue range..."
          value={searchTerm}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          className="w-full pl-12 pr-16 py-4 min-h-[48px] bg-gray-900/50 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition-colors duration-200"
        />
        
        {/* Search actions */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchTerm && (
            <button
              onClick={() => {
                onSearchChange('');
                setShowSuggestions(false);
              }}
              className="p-2 min-w-[40px] min-h-[40px] hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          
          <button className="p-2 min-w-[40px] min-h-[40px] hover:bg-gray-700 rounded-lg transition-colors">
            <Command className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
      
      {/* Smart search suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && (searchTerm || recentSearches.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute top-full mt-2 w-full bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto"
          >
            {/* Search suggestions */}
            {searchTerm && (
              <div className="p-3 border-b border-white/10">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Suggestions</h4>
                <div className="space-y-1">
                  {getSmartSuggestions(searchTerm).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        onSearchChange(suggestion.term);
                        setShowSuggestions(false);
                      }}
                      className="w-full flex items-center justify-between p-2 min-h-[40px] hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300">{suggestion.term}</span>
                        {suggestion.type === 'semantic' && (
                          <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">
                            Similar
                          </span>
                        )}
                      </div>
                      {suggestion.count && (
                        <span className="text-xs text-gray-500">{suggestion.count} projects</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Trending searches */}
            <div className="p-3 border-b border-white/10">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Trending</h4>
              <div className="grid grid-cols-2 gap-2">
                {searchSuggestions.trending.map((trend, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      onSearchChange(trend.term);
                      setShowSuggestions(false);
                    }}
                    className="flex items-center gap-2 p-2 min-h-[40px] hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    <span className="text-sm text-gray-300">{trend.term}</span>
                    <span className="text-xs text-green-400 ml-auto">{trend.trend}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Recent searches */}
            {recentSearches.length > 0 && (
              <div className="p-3">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Recent</h4>
                <div className="space-y-1">
                  {recentSearches.slice(0, 5).map((recent, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        onSearchChange(recent);
                        setShowSuggestions(false);
                      }}
                      className="w-full flex items-center gap-2 p-2 min-h-[40px] hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">{recent}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Click outside to close */}
      {showSuggestions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
};

// Smart suggestion generation
const getSmartSuggestions = (searchTerm) => {
  const suggestions = [];
  const term = searchTerm.toLowerCase();
  
  // Semantic suggestions
  Object.entries(searchSuggestions.semantic).forEach(([key, synonyms]) => {
    if (term.includes(key) || synonyms.some(synonym => term.includes(synonym))) {
      synonyms.forEach(synonym => {
        if (!suggestions.find(s => s.term === synonym)) {
          suggestions.push({
            term: synonym,
            type: 'semantic',
            count: Math.floor(Math.random() * 100) + 10
          });
        }
      });
    }
  });
  
  // Tech stack suggestions
  const techSuggestions = ['React', 'Vue', 'Angular', 'Node.js', 'Python', 'Ruby'];
  techSuggestions.forEach(tech => {
    if (tech.toLowerCase().includes(term) && term.length > 1) {
      suggestions.push({
        term: tech,
        type: 'tech',
        count: Math.floor(Math.random() * 50) + 5
      });
    }
  });
  
  return suggestions.slice(0, 6);
};
```

### P1.3 Enhanced Payment Flow Integration

**File**: `client/src/components/PaymentMethodSelector.js`
**Priority**: High | **Timeline**: Week 2-3

#### Payment Flow UI Improvements

```jsx
// Enhanced payment selector with better mobile UX and trust indicators
const PaymentMethodSelector = ({ 
  projectId, 
  amount, 
  currency = 'USD', 
  onPaymentStart, 
  onPaymentSuccess, 
  onPaymentError,
  className = '',
  marketAnalysis = null // New prop for market data
}) => {
  // ... existing state and logic ...
  
  return (
    <div className={`bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-4 md:p-6 ${className}`}>
      {/* Enhanced header with market context */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-5 h-5 text-green-400" />
          <h3 className="text-lg md:text-xl font-bold text-white">Secure Payment</h3>
        </div>
        <p className="text-gray-400 text-sm">Choose your preferred payment method</p>
        
        {/* Market analysis integration */}
        {marketAnalysis && (
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <BarChart3 className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="text-blue-400 font-semibold text-sm">Market Analysis</h4>
                <p className="text-gray-300 text-sm">
                  Similar projects sold for {formatAmount(marketAnalysis.averagePrice, currency)} on average. 
                  This price is {marketAnalysis.comparison}% {marketAnalysis.isAbove ? 'above' : 'below'} market rate.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile-optimized amount display */}
      <div className="bg-gray-800/30 rounded-xl p-4 mb-6">
        <div className="text-center">
          <div className="text-2xl md:text-3xl font-bold text-white mb-1">
            {formatAmount(amount, currency)}
          </div>
          <div className="text-gray-400 text-sm">One-time purchase</div>
          
          {/* Payment breakdown */}
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Project Price</span>
              <span>{formatAmount(amount * 0.97, currency)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>Platform Fee</span>
              <span>{formatAmount(amount * 0.03, currency)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-white pt-2 border-t border-gray-700">
              <span>Total</span>
              <span>{formatAmount(amount, currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced payment methods with mobile optimization */}
      <div className="space-y-3 mb-6">
        <h4 className="text-base md:text-lg font-semibold text-white mb-3">Payment Methods</h4>
        
        {availableMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod?.id === method.id;
          
          return (
            <motion.div
              key={method.id}
              className={`relative p-3 md:p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-700 hover:border-gray-600 bg-gray-800/30'
              }`}
              onClick={() => setSelectedMethod(method)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={`p-2 md:p-3 rounded-xl bg-gradient-to-r ${method.color}`}>
                    <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <h5 className="text-white font-semibold text-sm md:text-base">{method.name}</h5>
                      {method.popularity > 90 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 rounded-full">
                          <Star className="w-3 h-3 text-yellow-400" />
                          <span className="text-yellow-400 text-xs font-medium">Popular</span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs md:text-sm">{method.description}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-xs text-gray-500">
                      <span>Fees: {method.fees}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{method.processingTime}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isSelected && (
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </div>
              </div>
              
              {/* Method Features - Mobile Optimized */}
              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 pt-3 border-t border-gray-700"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {method.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Enhanced security info */}
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 md:p-4 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-green-400 font-semibold text-sm">Buyer Protection</h4>
            <p className="text-gray-300 text-sm">
              30-day money back guarantee. Secure escrow service. Full asset transfer guaranteed.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile-optimized payment button */}
      <motion.button
        onClick={handlePayment}
        disabled={processing || !selectedMethod}
        className="w-full px-6 py-3 md:py-4 min-h-[48px] bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2"
        whileHover={{ scale: processing ? 1 : 1.02 }}
        whileTap={{ scale: processing ? 1 : 0.98 }}
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm md:text-base">Processing Payment...</span>
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            <span className="text-sm md:text-base">Pay {formatAmount(amount, currency)}</span>
          </>
        )}
      </motion.button>

      {/* Enhanced trust indicators */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          <span>SSL Encrypted</span>
        </div>
        <div className="flex items-center gap-1">
          <Lock className="w-3 h-3" />
          <span>PCI Compliant</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          <span>Verified Secure</span>
        </div>
        <div className="flex items-center gap-1">
          <Award className="w-3 h-3" />
          <span>Buyer Protected</span>
        </div>
      </div>
    </div>
  );
};
```

### P1.4 Enhanced Badge Component System

**File**: `client/src/shadcn/ui/badge.jsx`
**Priority**: High | **Timeline**: Week 1-2

#### Trust-Focused Badge Variants

```jsx
// Enhanced badge variants with trust-focused design
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#5e5eff] text-white hover:bg-[#4b4bff]",
        secondary: "border-transparent bg-[#333] text-white hover:bg-[#444]",
        destructive: "border-transparent bg-red-500 text-white hover:bg-red-600",
        outline: "border-[#5e5eff] text-[#5e5eff] bg-transparent",
        
        // Trust signal variants
        verified: "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20",
        "revenue-verified": "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20",
        "code-verified": "bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20",
        "identity-verified": "bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20",
        
        // Trust score variants
        "trust-basic": "bg-gray-500/10 text-gray-400 border-gray-500/30",
        "trust-verified": "bg-blue-500/10 text-blue-400 border-blue-500/30",
        "trust-trusted": "bg-green-500/10 text-green-400 border-green-500/30",
        "trust-premium": "bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-400 border-purple-500/30",
        
        // Status variants
        "for-sale": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        "sold": "bg-gray-500/10 text-gray-400 border-gray-500/30",
        "featured": "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
        
        // Mobile-optimized variants
        "mobile-compact": "px-2 py-0.5 text-[10px] min-h-[24px]",
        "mobile-touch": "px-3 py-1.5 text-xs min-h-[32px] min-w-[32px]"
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
        xl: "px-4 py-1.5 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

// Enhanced Badge component with icon support
function Badge({
  className,
  variant,
  size,
  icon: Icon,
  children,
  tooltip,
  interactive = false,
  ...props
}) {
  const badgeContent = (
    <div 
      className={cn(
        badgeVariants({ variant, size }), 
        interactive && "cursor-pointer hover:scale-105 transition-transform duration-200",
        className
      )} 
      {...props}
    >
      {Icon && <Icon className="w-3 h-3 mr-1" />}
      {children}
    </div>
  );

  if (tooltip) {
    return (
      <Tooltip content={tooltip}>
        {badgeContent}
      </Tooltip>
    );
  }

  return badgeContent;
}
```

### P1.5 Seller Credibility Indicators

**New Component**: `client/src/components/SellerCredibility.js`
**Priority**: High | **Timeline**: Week 2

#### Comprehensive Seller Profile Enhancement

```jsx
// Seller credibility component with detailed metrics
const SellerCredibility = ({ 
  seller, 
  projects = [], 
  variant = 'detailed', // 'minimal' | 'detailed' | 'compact'
  showHistory = true 
}) => {
  const credibilityMetrics = calculateCredibilityMetrics(seller, projects);
  
  return (
    <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
      {/* Seller Profile Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          <img
            src={seller.avatar_url || '/default-avatar.png'}
            alt={seller.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
          />
          {seller.is_verified && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-gray-900">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-white">{seller.name}</h3>
            <Badge variant="trust-verified" icon={Shield}>
              Trust Score: {credibilityMetrics.trustScore}
            </Badge>
          </div>
          
          <p className="text-gray-400 text-sm mb-2">{seller.bio}</p>
          
          {/* Quick stats */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1 text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>Joined {formatDate(seller.created_at)}</span>
            </div>
            <div className="flex items-center gap-1 text-green-400">
              <TrendingUp className="w-4 h-4" />
              <span>{credibilityMetrics.totalSales} sales</span>
            </div>
            <div className="flex items-center gap-1 text-yellow-400">
              <Star className="w-4 h-4 fill-current" />
              <span>{credibilityMetrics.averageRating}/5.0</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Verification Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className={cn(
          "flex items-center gap-2 p-2 rounded-lg border",
          seller.identity_verified 
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-gray-700/30 border-gray-600/20 text-gray-500"
        )}>
          <Shield className="w-4 h-4" />
          <span className="text-xs font-medium">ID Verified</span>
        </div>
        
        <div className={cn(
          "flex items-center gap-2 p-2 rounded-lg border",
          seller.email_verified 
            ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
            : "bg-gray-700/30 border-gray-600/20 text-gray-500"
        )}>
          <Mail className="w-4 h-4" />
          <span className="text-xs font-medium">Email</span>
        </div>
        
        <div className={cn(
          "flex items-center gap-2 p-2 rounded-lg border",
          seller.phone_verified 
            ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
            : "bg-gray-700/30 border-gray-600/20 text-gray-500"
        )}>
          <Phone className="w-4 h-4" />
          <span className="text-xs font-medium">Phone</span>
        </div>
        
        <div className={cn(
          "flex items-center gap-2 p-2 rounded-lg border",
          credibilityMetrics.isTopSeller 
            ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
            : "bg-gray-700/30 border-gray-600/20 text-gray-500"
        )}>
          <Award className="w-4 h-4" />
          <span className="text-xs font-medium">Top Seller</span>
        </div>
      </div>
      
      {/* Performance Metrics */}
      {variant === 'detailed' && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300">Performance</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Response Time</span>
                <Clock className="w-3 h-3 text-gray-400" />
              </div>
              <div className="text-lg font-semibold text-white">
                {credibilityMetrics.avgResponseTime}
              </div>
              <div className="text-xs text-green-400">
                {credibilityMetrics.responseImprovement > 0 ? '+' : ''}{credibilityMetrics.responseImprovement}% this month
              </div>
            </div>
            
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Completion Rate</span>
                <CheckCircle className="w-3 h-3 text-gray-400" />
              </div>
              <div className="text-lg font-semibold text-white">
                {credibilityMetrics.completionRate}%
              </div>
              <div className="text-xs text-green-400">
                {credibilityMetrics.completionTrend > 0 ? 'Improving' : 'Stable'}
              </div>
            </div>
            
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Repeat Buyers</span>
                <Users className="w-3 h-3 text-gray-400" />
              </div>
              <div className="text-lg font-semibold text-white">
                {credibilityMetrics.repeatBuyerRate}%
              </div>
              <div className="text-xs text-blue-400">
                {credibilityMetrics.repeatBuyers} customers
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Recent Reviews */}
      {showHistory && credibilityMetrics.recentReviews.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Recent Reviews</h4>
          <div className="space-y-2">
            {credibilityMetrics.recentReviews.slice(0, 2).map((review, index) => (
              <div key={index} className="bg-gray-900/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "w-3 h-3",
                            star <= review.rating 
                              ? "text-yellow-400 fill-current" 
                              : "text-gray-600"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">{review.buyer_name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(review.created_at)}</span>
                </div>
                <p className="text-sm text-gray-300 line-clamp-2">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Credibility metrics calculation
const calculateCredibilityMetrics = (seller, projects) => {
  const totalSales = seller.successful_sales || 0;
  const averageRating = seller.average_rating || 0;
  const responseTime = seller.avg_response_time || 'N/A';
  const completionRate = seller.completion_rate || 0;
  
  // Calculate trust score based on multiple factors
  let trustScore = 0;
  if (seller.identity_verified) trustScore += 20;
  if (seller.email_verified) trustScore += 10;
  if (seller.phone_verified) trustScore += 10;
  if (totalSales > 0) trustScore += Math.min(totalSales * 5, 30);
  if (averageRating >= 4.5) trustScore += 20;
  if (completionRate >= 95) trustScore += 10;
  
  return {
    trustScore: Math.min(trustScore, 100),
    totalSales,
    averageRating,
    avgResponseTime: responseTime,
    completionRate,
    repeatBuyerRate: seller.repeat_buyer_rate || 0,
    repeatBuyers: seller.repeat_buyers || 0,
    isTopSeller: totalSales >= 10 && averageRating >= 4.8,
    responseImprovement: seller.response_improvement || 0,
    completionTrend: seller.completion_trend || 0,
    recentReviews: seller.recent_reviews || []
  };
};
```

### P1.6 Enhanced Search Interface with Filters

**File**: `client/src/components/AdvancedSearch.js` (Enhancement)
**Priority**: High | **Timeline**: Week 3-4

#### Mobile-First Search Enhancement

```jsx
// Enhanced search interface with intelligent filtering
const EnhancedSearchInterface = ({ 
  onSearchChange, 
  onFiltersChange, 
  currentFilters,
  searchResults = [],
  loading = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [savedSearches, setSavedSearches] = useState([]);

  const searchTabs = [
    { id: 'all', name: 'All Projects', count: searchResults.length },
    { id: 'for-sale', name: 'For Sale', count: searchResults.filter(p => p.is_for_sale).length },
    { id: 'featured', name: 'Featured', count: searchResults.filter(p => p.is_featured).length },
    { id: 'verified', name: 'Verified', count: searchResults.filter(p => p.is_verified).length }
  ];

  return (
    <div className="space-y-4">
      {/* Enhanced search header */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Main search input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by project name, technology, revenue..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                onSearchChange(e.target.value);
              }}
              className="w-full pl-12 pr-16 py-3 min-h-[48px] bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition-colors duration-200"
            />
            
            {/* Search actions */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    onSearchChange('');
                  }}
                  className="p-2 min-w-[40px] min-h-[40px] hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "p-2 min-w-[40px] min-h-[40px] rounded-lg transition-colors",
                  showFilters 
                    ? "bg-purple-600 text-white" 
                    : "hover:bg-gray-600 text-gray-400"
                )}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Quick filter buttons */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <button className="flex items-center gap-2 px-4 py-2 min-h-[48px] bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-300 hover:bg-purple-600/30 transition-colors whitespace-nowrap">
              <Sparkles className="w-4 h-4" />
              <span>AI Match</span>
            </button>
            
            <button className="flex items-center gap-2 px-4 py-2 min-h-[48px] bg-gray-700 border border-gray-600 rounded-xl text-gray-300 hover:bg-gray-600 transition-colors whitespace-nowrap">
              <TrendingUp className="w-4 h-4" />
              <span>High Revenue</span>
            </button>
            
            <button className="flex items-center gap-2 px-4 py-2 min-h-[48px] bg-gray-700 border border-gray-600 rounded-xl text-gray-300 hover:bg-gray-600 transition-colors whitespace-nowrap">
              <Shield className="w-4 h-4" />
              <span>Verified Only</span>
            </button>
          </div>
        </div>
        
        {/* Search tabs */}
        <div className="flex items-center gap-1 mt-4 p-1 bg-gray-800/50 rounded-xl overflow-x-auto scrollbar-hide">
          {searchTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-white text-gray-900"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              )}
            >
              <span>{tab.name}</span>
              <span className={cn(
                "px-1.5 py-0.5 text-xs rounded-full",
                activeTab === tab.id
                  ? "bg-gray-200 text-gray-700"
                  : "bg-gray-700 text-gray-300"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Advanced filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-900/30 border border-white/10 rounded-xl overflow-hidden"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Advanced Filters</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Price Range</label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="100000"
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>$0</span>
                      <span>$100K+</span>
                    </div>
                  </div>
                </div>
                
                {/* Revenue Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Monthly Revenue</label>
                  <select className="w-full px-3 py-2 min-h-[40px] bg-gray-800 border border-gray-700 rounded-lg text-white">
                    <option value="">Any Revenue</option>
                    <option value="0-1000">$0 - $1K</option>
                    <option value="1000-5000">$1K - $5K</option>
                    <option value="5000-10000">$5K - $10K</option>
                    <option value="10000+">$10K+</option>
                  </select>
                </div>
                
                {/* Technology Stack */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Technology</label>
                  <div className="flex flex-wrap gap-1">
                    {['React', 'Vue', 'Angular', 'Node.js', 'Python', 'Ruby'].map((tech) => (
                      <button
                        key={tech}
                        className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        {tech}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Verification Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Verification</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Verified Projects</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Revenue Verified</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Top Sellers</span>
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Filter actions */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-4 py-2 min-h-[44px] text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                
                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 min-h-[44px] bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                    Clear All
                  </button>
                  <button className="px-6 py-2 min-h-[44px] bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Search results summary */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <div>
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Searching...</span>
            </div>
          ) : (
            <span>
              Showing <span className="text-white font-medium">{searchResults.length}</span> projects
              {searchTerm && <span> for "{searchTerm}"</span>}
            </span>
          )}
        </div>
        
        {/* Save search */}
        {searchTerm && (
          <button className="flex items-center gap-1 px-3 py-1 hover:bg-gray-700 rounded-lg transition-colors">
            <Bookmark className="w-4 h-4" />
            <span>Save Search</span>
          </button>
        )}
      </div>
    </div>
  );
};
```

---

## Implementation Guidelines

### Responsive Breakpoints
```css
/* Mobile-first breakpoint system */
.responsive-grid {
  /* Mobile: Single column */
  grid-template-columns: 1fr;
  gap: 1rem;
  
  /* Tablet: 2 columns */
  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
  
  /* Desktop: 3-4 columns */
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
  
  @media (min-width: 1280px) {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Touch target requirements */
.touch-target {
  min-height: 48px;
  min-width: 48px;
  touch-action: manipulation;
}

/* Enhanced glassmorphism effects */
.glass-card {
  background: rgba(17, 24, 39, 0.5);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
}
```

### Accessibility Enhancements
```jsx
// ARIA labels and keyboard navigation
const AccessibilityProps = {
  // Enhanced button accessibility
  button: {
    role: "button",
    tabIndex: 0,
    "aria-label": "Descriptive action label",
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handleClick();
      }
    }
  },
  
  // Modal accessibility
  modal: {
    role: "dialog",
    "aria-modal": true,
    "aria-labelledby": "modal-title",
    "aria-describedby": "modal-description"
  },
  
  // Trust badge accessibility
  trustBadge: {
    role: "img",
    "aria-label": `Trust score: ${score} out of 100. Verified seller.`,
    tabIndex: 0
  }
};
```

### Performance Optimizations
```jsx
// Lazy loading and code splitting
const LazyComponents = {
  // Lazy load heavy components
  PaymentMethodSelector: lazy(() => import('./PaymentMethodSelector')),
  TrustBadge: lazy(() => import('./TrustBadge')),
  
  // Image optimization
  optimizedImage: {
    loading: "lazy",
    decoding: "async",
    sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
  },
  
  // Bundle optimization
  bundleSettings: {
    splitChunks: {
      chunks: 'async',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  }
};
```

---

## Testing Requirements

### Mobile Testing Checklist
- [ ] All touch targets meet 48px minimum requirement
- [ ] Swipe gestures work correctly on mobile devices
- [ ] Bottom sheet modals slide smoothly
- [ ] Text remains readable at all screen sizes
- [ ] Payment flow completes successfully on mobile
- [ ] Trust badges display correctly across devices

### Accessibility Testing
- [ ] Screen reader compatibility verified
- [ ] Keyboard navigation functions properly
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus indicators are visible and clear
- [ ] Alternative text provided for all images

### Performance Testing
- [ ] First Contentful Paint < 1.5s
- [ ] Bundle size remains under 300KB gzipped
- [ ] Smooth animations at 60fps
- [ ] Quick response to user interactions

---

## Success Metrics

### Key Performance Indicators
- **Mobile Conversion Rate**: Target +25% improvement
- **Trust Badge Engagement**: Target +40% click-through rate
- **Search Completion Rate**: Target +35% improvement
- **Payment Success Rate**: Target +20% improvement
- **User Session Duration**: Target +30% increase

### User Experience Metrics
- **Task Completion Time**: Reduce time to purchase by 30%
- **Mobile Bounce Rate**: Reduce by 25%
- **Trust Signal Effectiveness**: Increase verified project views by 60%
- **Filter Usage**: Increase advanced filter usage by 40%

---

## Additional P1 Implementation Details

### Payment Flow Transaction States

**Integration**: `client/src/components/PaymentMethodSelector.js`
**Focus**: Enhanced transaction state management and user feedback

```jsx
// Transaction state management for better UX
const TransactionStates = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  PROCESSING: 'processing',
  VERIFYING: 'verifying',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

const PaymentStateIndicator = ({ state, progress = 0 }) => {
  const stateConfig = {
    [TransactionStates.IDLE]: {
      icon: CreditCard,
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
      message: 'Ready to process payment'
    },
    [TransactionStates.INITIALIZING]: {
      icon: Loader2,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      message: 'Initializing secure payment...',
      animated: true
    },
    [TransactionStates.PROCESSING]: {
      icon: Zap,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      message: 'Processing payment securely...',
      animated: true
    },
    [TransactionStates.VERIFYING]: {
      icon: Shield,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      message: 'Verifying transaction...',
      animated: true
    },
    [TransactionStates.SUCCESS]: {
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      message: 'Payment successful!'
    },
    [TransactionStates.FAILED]: {
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      message: 'Payment failed. Please try again.'
    }
  };

  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${config.bgColor} border-current/20`}>
      <div className="relative">
        <Icon 
          className={cn(
            "w-6 h-6", 
            config.color,
            config.animated && "animate-spin"
          )} 
        />
        {state === TransactionStates.PROCESSING && (
          <div className="absolute inset-0 border-2 border-purple-400/30 rounded-full animate-ping" />
        )}
      </div>
      
      <div className="flex-1">
        <div className={cn("font-medium", config.color)}>
          {config.message}
        </div>
        {progress > 0 && (
          <div className="mt-2">
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

### Mobile-Specific Responsive Design Patterns

```css
/* Enhanced mobile-first design system */
@layer components {
  /* Touch-friendly interactive elements */
  .touch-target {
    @apply min-h-[48px] min-w-[48px] touch-manipulation;
  }
  
  /* Mobile-optimized cards */
  .mobile-card {
    @apply p-4 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-white/10;
    @apply hover:border-white/20 transition-all duration-300;
  }
  
  /* Mobile navigation patterns */
  .mobile-nav {
    @apply fixed bottom-0 inset-x-0 z-50 bg-gray-900/95 backdrop-blur-xl;
    @apply border-t border-white/10 safe-area-pb;
  }
  
  /* Bottom sheet modals */
  .bottom-sheet {
    @apply fixed inset-x-0 bottom-0 z-50 max-h-[85vh];
    @apply bg-gray-900/95 backdrop-blur-xl border-t border-white/10;
    @apply rounded-t-2xl transform translate-y-full;
    @apply transition-transform duration-300 ease-out;
  }
  
  .bottom-sheet.open {
    @apply translate-y-0;
  }
  
  /* Mobile-friendly form inputs */
  .mobile-input {
    @apply w-full px-4 py-3 min-h-[48px] text-base;
    @apply bg-gray-800/50 border border-gray-700 rounded-xl;
    @apply text-white placeholder-gray-400;
    @apply focus:border-purple-500 focus:outline-none;
    @apply transition-colors duration-200;
  }
  
  /* Responsive grid systems */
  .responsive-grid {
    @apply grid grid-cols-1 gap-4;
    @apply sm:grid-cols-2 sm:gap-6;
    @apply lg:grid-cols-3 lg:gap-8;
    @apply xl:grid-cols-4;
  }
  
  /* Trust badge layouts */
  .trust-badges {
    @apply flex flex-wrap gap-1.5;
    @apply sm:gap-2;
  }
  
  .trust-badge {
    @apply inline-flex items-center gap-1 px-2 py-1;
    @apply text-xs font-medium rounded-lg border;
    @apply transition-all duration-200;
  }
  
  /* Mobile-specific glassmorphism */
  .glass-effect {
    @apply backdrop-blur-sm bg-white/5 border border-white/10;
    @apply supports-[backdrop-filter]:bg-white/5;
  }
  
  /* Enhanced mobile typography */
  .mobile-heading {
    @apply text-lg font-semibold text-white;
    @apply sm:text-xl;
    @apply lg:text-2xl;
  }
  
  .mobile-body {
    @apply text-sm text-gray-300 leading-relaxed;
    @apply sm:text-base;
  }
  
  /* Safe area handling */
  .safe-area-pt {
    padding-top: env(safe-area-inset-top);
  }
  
  .safe-area-pb {
    padding-bottom: env(safe-area-inset-bottom);
  }
  
  .safe-area-pl {
    padding-left: env(safe-area-inset-left);
  }
  
  .safe-area-pr {
    padding-right: env(safe-area-inset-right);
  }
}

/* Mobile-specific animations */
@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slide-down {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Scroll behavior optimizations */
.smooth-scroll {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
```

### Component File Structure & Organization

```
client/src/components/
├── trust/
│   ├── TrustBadge.js
│   ├── TrustScore.js
│   ├── SellerCredibility.js
│   └── VerificationIndicators.js
├── search/
│   ├── AdvancedSearch.js
│   ├── SearchSuggestions.js
│   ├── SearchFilters.js
│   └── SearchResults.js
├── payment/
│   ├── PaymentMethodSelector.js
│   ├── PaymentProgress.js
│   ├── TransactionStates.js
│   └── PaymentSecurity.js
├── mobile/
│   ├── MobileNavigation.js
│   ├── BottomSheet.js
│   ├── MobileFilters.js
│   └── TouchGestures.js
└── enhanced/
    ├── ProjectCard.js (enhanced)
    ├── MarketplaceFilters.js (enhanced)
    └── Modal.js (enhanced)
```

### Development Implementation Checklist

#### P0 Mobile UX Critical Fixes
- [ ] **ProjectCard Mobile Optimization**
  - [ ] Implement 48px minimum touch targets
  - [ ] Add responsive text scaling
  - [ ] Optimize button layouts for mobile
  - [ ] Test swipe gestures on touch devices
  - [ ] Ensure proper spacing and padding

- [ ] **MarketplaceFilters Bottom Sheet**
  - [ ] Create mobile-specific filter modal
  - [ ] Implement slide-up animation
  - [ ] Add drag-to-close functionality
  - [ ] Optimize filter categories for mobile
  - [ ] Test on various screen sizes

- [ ] **Modal System Enhancement**
  - [ ] Add bottom sheet variant
  - [ ] Implement mobile detection
  - [ ] Create touch-friendly close mechanisms
  - [ ] Test accessibility on mobile devices

#### P1 Trust Signal Enhancement
- [ ] **Badge System Expansion**
  - [ ] Add trust-focused variants to shadcn/ui badge
  - [ ] Implement icon support
  - [ ] Create tooltip integration
  - [ ] Test interactive badge behaviors

- [ ] **Trust Score Calculation**
  - [ ] Implement trust score algorithm
  - [ ] Create visual trust indicators
  - [ ] Add verification level progression
  - [ ] Test score accuracy and display

- [ ] **Seller Credibility Component**
  - [ ] Build comprehensive seller profiles
  - [ ] Add performance metrics display
  - [ ] Implement review integration
  - [ ] Test mobile responsiveness

#### P1 Enhanced Search Interface
- [ ] **Search Enhancement**
  - [ ] Add AI-powered suggestions
  - [ ] Implement semantic search matching
  - [ ] Create saved search functionality
  - [ ] Test search performance

- [ ] **Filter Integration**
  - [ ] Build advanced filter panel
  - [ ] Add quick filter buttons
  - [ ] Implement filter state management
  - [ ] Test filter combinations

#### P1 Payment Flow Optimization
- [ ] **Transaction States**
  - [ ] Implement payment progress indicators
  - [ ] Add transaction state management
  - [ ] Create payment security displays
  - [ ] Test payment flow completion

- [ ] **Mobile Payment UX**
  - [ ] Optimize payment method selection
  - [ ] Add market analysis integration
  - [ ] Implement payment breakdown display
  - [ ] Test mobile payment flows

### Performance Optimization Guidelines

```jsx
// Code splitting for mobile optimization
const LazyMobileComponents = {
  // Split heavy components
  MobileFilters: lazy(() => import('./mobile/MobileFilters')),
  AdvancedSearch: lazy(() => import('./search/AdvancedSearch')),
  PaymentFlow: lazy(() => import('./payment/PaymentFlow')),
  TrustAnalytics: lazy(() => import('./trust/TrustAnalytics')),
};

// Image optimization for mobile
const OptimizedImage = ({ src, alt, ...props }) => (
  <img
    src={src}
    alt={alt}
    loading="lazy"
    decoding="async"
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
    {...props}
  />
);

// Bundle optimization settings
const webpackConfig = {
  optimization: {
    splitChunks: {
      chunks: 'async',
      cacheGroups: {
        mobile: {
          name: 'mobile',
          test: /[\\/]mobile[\\/]/,
          chunks: 'all',
          priority: 30
        },
        trust: {
          name: 'trust',
          test: /[\\/]trust[\\/]/,
          chunks: 'all',
          priority: 25
        },
        payment: {
          name: 'payment',
          test: /[\\/]payment[\\/]/,
          chunks: 'all',
          priority: 25
        }
      }
    }
  }
};
```

This comprehensive enhancement specification provides the development team with implementation-ready designs that address the critical mobile UX issues, enhance trust signals, and optimize the purchase flow while maintaining the Chronicle/Linear aesthetic and ensuring accessibility compliance. The additional P1 implementation details ensure comprehensive coverage of all priority requirements identified in the UX research and planning phases.