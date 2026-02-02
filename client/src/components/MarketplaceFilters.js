import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  X,
  SlidersHorizontal,
  ChevronDown,
  DollarSign,
  Calendar,
  TrendingUp,
  Users,
  Code,
  Sparkles,
  Globe,
  Zap,
  ShoppingBag,
  Settings,
  BarChart3,
  Star,
  Shield,
  Flame
} from 'lucide-react'
import { cn } from '../lib/utils'

const MarketplaceFilters = ({ 
  searchTerm, 
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  sortBy,
  setSortBy,
  priceFilter,
  setPriceFilter,
  revenueRange,
  setRevenueRange,
  showAdvancedFilters,
  setShowAdvancedFilters,
  totalProjects,
  filteredCount
}) => {
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Mobile detection
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const categories = [
    { id: 'all', name: 'All Categories', icon: Globe, color: 'text-gray-400' },
    { id: 'saas', name: 'SaaS & Web Apps', icon: Zap, color: 'text-white' },
    { id: 'ecommerce', name: 'E-commerce', icon: ShoppingBag, color: 'text-gray-300' },
    { id: 'mobile', name: 'Mobile Apps', icon: Code, color: 'text-white' },
    { id: 'ai', name: 'AI & Machine Learning', icon: Sparkles, color: 'text-gray-300' },
    { id: 'marketplace', name: 'Marketplace', icon: Users, color: 'text-white' },
    { id: 'tools', name: 'Developer Tools', icon: Settings, color: 'text-gray-300' },
    { id: 'content', name: 'Content & Media', icon: Star, color: 'text-white' }
  ]

  const sortOptions = [
    { id: 'newest', name: 'Newest First', icon: Calendar },
    { id: 'oldest', name: 'Oldest First', icon: Calendar },
    { id: 'price_high', name: 'Price: High to Low', icon: DollarSign },
    { id: 'price_low', name: 'Price: Low to High', icon: DollarSign },
    { id: 'revenue_high', name: 'Revenue: High to Low', icon: TrendingUp },
    { id: 'most_viewed', name: 'Most Viewed', icon: BarChart3 },
    { id: 'featured', name: 'Featured First', icon: Flame }
  ]

  const priceRanges = [
    { id: 'all', name: 'Any Price', min: 0, max: Infinity },
    { id: 'under_1k', name: 'Under $1,000', min: 0, max: 1000 },
    { id: '1k_5k', name: '$1,000 - $5,000', min: 1000, max: 5000 },
    { id: '5k_10k', name: '$5,000 - $10,000', min: 5000, max: 10000 },
    { id: '10k_25k', name: '$10,000 - $25,000', min: 10000, max: 25000 },
    { id: '25k_50k', name: '$25,000 - $50,000', min: 25000, max: 50000 },
    { id: 'over_50k', name: 'Over $50,000', min: 50000, max: Infinity }
  ]

  const clearAllFilters = () => {
    setSearchTerm('')
    setCategoryFilter('all')
    setSortBy('newest')
    setPriceFilter('all')
    setRevenueRange([0, 100000])
    setShowAdvancedFilters(false)
  }

  return (
    <div className="space-y-4">
      {/* Mobile-First Filter Bar */}
      <div className="flex flex-col gap-4">
        {/* Search Bar - Always Visible */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={isMobile ? "Search projects..." : "Search projects, technologies, categories..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 min-h-[48px] bg-black border border-white/20 text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors duration-200 text-sm sm:text-base"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 min-w-[44px] min-h-[44px] hover:bg-gray-700 rounded-full transition-colors duration-200"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Mobile/Desktop Filter Actions */}
        {isMobile ? (
          // Mobile: Single filter button that opens bottom sheet
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setShowMobileFilters(true)}
              className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-gray-900/50 border border-white/10 rounded-xl text-white hover:border-white/20 transition-colors duration-200 flex-1"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {(categoryFilter !== 'all' || priceFilter !== 'all' || sortBy !== 'newest') && (
                <div className="ml-auto w-2 h-2 bg-white" />
              )}
            </button>
            
            {/* Quick Clear on Mobile */}
            {(searchTerm || categoryFilter !== 'all' || sortBy !== 'newest' || priceFilter !== 'all') && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-red-600/20 border border-red-500/30 rounded-xl text-red-300 hover:bg-red-600/30 transition-colors duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          // Desktop: Original dropdown layout
          <div className="flex items-center gap-3 overflow-x-auto">
            {/* Category Dropdown */}
            <div className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'category' ? null : 'category')}
                className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-gray-900/50 border border-white/10 rounded-xl text-white hover:border-white/20 transition-colors duration-200 whitespace-nowrap"
              >
                <Globe className="w-4 h-4" />
                <span>Category</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", activeDropdown === 'category' && "rotate-180")} />
              </button>

            <AnimatePresence>
              {activeDropdown === 'category' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full mt-2 w-64 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl z-50"
                >
                  <div className="p-2 max-h-80 overflow-y-auto">
                    {categories.map((category) => {
                      const Icon = category.icon
                      return (
                        <button
                          key={category.id}
                          onClick={() => {
                            setCategoryFilter(category.id)
                            setActiveDropdown(null)
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5 transition-colors duration-200",
                            categoryFilter === category.id && "bg-white/10 text-white"
                          )}
                        >
                          <Icon className={cn("w-4 h-4", category.color)} />
                          <span className="text-sm">{category.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
                className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-gray-900/50 border border-white/10 rounded-xl text-white hover:border-white/20 transition-colors duration-200 whitespace-nowrap"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Sort</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", activeDropdown === 'sort' && "rotate-180")} />
              </button>

            <AnimatePresence>
              {activeDropdown === 'sort' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full mt-2 w-56 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl z-50"
                >
                  <div className="p-2">
                    {sortOptions.map((option) => {
                      const Icon = option.icon
                      return (
                        <button
                          key={option.id}
                          onClick={() => {
                            setSortBy(option.id)
                            setActiveDropdown(null)
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-white/5 transition-colors duration-200",
                            sortBy === option.id && "bg-white/20 text-gray-300"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm">{option.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

            {/* Price Filter */}
            <div className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'price' ? null : 'price')}
                className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-gray-900/50 border border-white/10 rounded-xl text-white hover:border-white/20 transition-colors duration-200 whitespace-nowrap"
              >
                <DollarSign className="w-4 h-4" />
                <span>Price</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", activeDropdown === 'price' && "rotate-180")} />
              </button>

            <AnimatePresence>
              {activeDropdown === 'price' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full mt-2 w-56 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl z-50"
                >
                  <div className="p-2">
                    {priceRanges.map((range) => (
                      <button
                        key={range.id}
                        onClick={() => {
                          setPriceFilter(range.id)
                          setActiveDropdown(null)
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-white/5 transition-colors duration-200",
                          priceFilter === range.id && "bg-white/20 text-gray-300"
                        )}
                      >
                        <span className="text-sm">{range.name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 min-h-[48px] border transition-colors duration-200 whitespace-nowrap",
                showAdvancedFilters
                  ? "bg-white/10 border-white/30 text-white"
                  : "bg-black border-white/20 text-white hover:border-white/40"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>More Filters</span>
            </button>

            {/* Clear Filters */}
            {(searchTerm || categoryFilter !== 'all' || sortBy !== 'newest' || priceFilter !== 'all') && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-red-600/20 border border-red-500/30 rounded-xl text-red-300 hover:bg-red-600/30 transition-colors duration-200 whitespace-nowrap"
              >
                <X className="w-4 h-4" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <div>
          Showing <span className="text-white font-medium">{filteredCount}</span> of <span className="text-white font-medium">{totalProjects}</span> projects
        </div>
        
        {/* Active Filters */}
        <div className="flex items-center gap-2">
          {categoryFilter !== 'all' && (
            <div className="flex items-center gap-1 px-2 py-1 bg-white/10 border border-white/30 text-white">
              <span className="text-xs">{categories.find(c => c.id === categoryFilter)?.name}</span>
              <button onClick={() => setCategoryFilter('all')}>
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {priceFilter !== 'all' && (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-600/20 border border-green-500/30 rounded-lg text-green-300">
              <span className="text-xs">{priceRanges.find(p => p.id === priceFilter)?.name}</span>
              <button onClick={() => setPriceFilter('all')}>
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-900/30 border border-white/10 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Advanced Filters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Revenue Range */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Monthly Revenue Range</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="50000"
                      value={revenueRange[0]}
                      onChange={(e) => setRevenueRange([parseInt(e.target.value), revenueRange[1]])}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>${revenueRange[0].toLocaleString()}</span>
                    <span>${revenueRange[1].toLocaleString()}+</span>
                  </div>
                </div>
              </div>

              {/* Verification Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Verification</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <Shield className="w-4 h-4 text-green-400" />
                    <span className="text-sm">Verified Projects Only</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">Revenue Verified</span>
                  </label>
                </div>
              </div>

              {/* Project Stage */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Project Stage</label>
                <select className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg text-white">
                  <option value="">Any Stage</option>
                  <option value="mvp">MVP</option>
                  <option value="beta">Beta</option>
                  <option value="launched">Launched</option>
                  <option value="growing">Growing</option>
                  <option value="established">Established</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Filter Bottom Sheet */}
      <MobileFilterModal
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        categories={categories}
        sortOptions={sortOptions}
        priceRanges={priceRanges}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        priceFilter={priceFilter}
        setPriceFilter={setPriceFilter}
        clearAllFilters={clearAllFilters}
      />

      {/* Click outside to close dropdowns */}
      {activeDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setActiveDropdown(null)}
        />
      )}
    </div>
  )
}

// Mobile Filter Modal Component
const MobileFilterModal = ({ 
  isOpen, 
  onClose, 
  categories, 
  sortOptions, 
  priceRanges,
  categoryFilter,
  setCategoryFilter,
  sortBy,
  setSortBy,
  priceFilter,
  setPriceFilter,
  clearAllFilters
}) => {
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
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] bg-gray-900/95 backdrop-blur-xl border-t border-white/10 rounded-t-2xl safe-area-bottom"
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
            <div className="overflow-y-auto p-6 space-y-6 max-h-[60vh]">
              {/* Categories */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">Category</h4>
                <div className="grid grid-cols-1 gap-2">
                  {categories.map((category) => {
                    const Icon = category.icon
                    return (
                      <button
                        key={category.id}
                        onClick={() => setCategoryFilter(category.id)}
                        className={cn(
                          "flex items-center gap-2 p-3 min-h-[48px] rounded-xl text-left transition-colors duration-200",
                          categoryFilter === category.id 
                            ? "bg-white/20 border border-white/50/30 text-gray-300" 
                            : "bg-gray-800/50 border border-gray-700 text-gray-300 hover:border-gray-600"
                        )}
                      >
                        <Icon className={cn("w-4 h-4", category.color)} />
                        <span className="text-sm">{category.name}</span>
                      </button>
                    )
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
                    const Icon = option.icon
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
                    )
                  })}
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 p-6 border-t border-white/10 bg-gray-900/50">
              <button
                onClick={clearAllFilters}
                className="flex-1 px-4 py-3 min-h-[48px] bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 min-h-[48px] bg-white text-white rounded-xl font-medium hover:bg-white-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default MarketplaceFilters
