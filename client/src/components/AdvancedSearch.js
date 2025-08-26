import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  X,
  Zap,
  Star,
  TrendingUp,
  Calendar,
  DollarSign,
  Code,
  Globe,
  Users,
  BarChart3,
  Target,
  Sparkles,
  Settings,
  ChevronDown,
  SlidersHorizontal,
  Bookmark,
  Shield,
  Eye,
  Heart,
  MessageSquare,
  ArrowRight,
  Command,
  Hash,
  Tag,
  Clock,
  Award,
  Layers,
  Database,
  Cpu,
  Smartphone,
  Monitor,
  Cloud,
  Lock,
  Briefcase
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useDebounce } from '../hooks/useDebounce'

const AdvancedSearch = ({ projects, onFilteredResults, className }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    category: 'all',
    priceRange: [0, 100000],
    revenueRange: [0, 50000],
    techStack: [],
    projectStage: 'all',
    verified: false,
    featured: false,
    hasDemo: false,
    sortBy: 'relevance',
    dateRange: 'all'
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [savedSearches, setSavedSearches] = useState([])
  const [searchHistory, setSearchHistory] = useState([])

  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const categories = [
    { id: 'all', name: 'All Categories', icon: Globe, count: 0 },
    { id: 'saas', name: 'SaaS & Web Apps', icon: Zap, count: 0 },
    { id: 'mobile', name: 'Mobile Apps', icon: Smartphone, count: 0 },
    { id: 'ecommerce', name: 'E-commerce', icon: Briefcase, count: 0 },
    { id: 'ai', name: 'AI & ML', icon: Sparkles, count: 0 },
    { id: 'tools', name: 'Developer Tools', icon: Code, count: 0 },
    { id: 'games', name: 'Games', icon: Target, count: 0 },
    { id: 'content', name: 'Content & Media', icon: Monitor, count: 0 }
  ]

  const techStacks = [
    { id: 'react', name: 'React', color: 'bg-blue-500' },
    { id: 'vue', name: 'Vue.js', color: 'bg-green-500' },
    { id: 'angular', name: 'Angular', color: 'bg-red-500' },
    { id: 'nodejs', name: 'Node.js', color: 'bg-green-600' },
    { id: 'python', name: 'Python', color: 'bg-yellow-500' },
    { id: 'django', name: 'Django', color: 'bg-green-700' },
    { id: 'rails', name: 'Ruby on Rails', color: 'bg-red-600' },
    { id: 'php', name: 'PHP', color: 'bg-purple-600' },
    { id: 'laravel', name: 'Laravel', color: 'bg-red-500' },
    { id: 'nextjs', name: 'Next.js', color: 'bg-gray-800' },
    { id: 'flutter', name: 'Flutter', color: 'bg-blue-400' },
    { id: 'swift', name: 'Swift', color: 'bg-orange-500' },
    { id: 'kotlin', name: 'Kotlin', color: 'bg-purple-500' },
    { id: 'mongodb', name: 'MongoDB', color: 'bg-green-500' },
    { id: 'postgresql', name: 'PostgreSQL', color: 'bg-blue-600' },
    { id: 'aws', name: 'AWS', color: 'bg-orange-400' },
    { id: 'gcp', name: 'Google Cloud', color: 'bg-blue-500' },
    { id: 'firebase', name: 'Firebase', color: 'bg-yellow-500' }
  ]

  const sortOptions = [
    { id: 'relevance', name: 'Most Relevant', icon: Target },
    { id: 'newest', name: 'Newest First', icon: Calendar },
    { id: 'oldest', name: 'Oldest First', icon: Calendar },
    { id: 'price_high', name: 'Price: High to Low', icon: DollarSign },
    { id: 'price_low', name: 'Price: Low to High', icon: DollarSign },
    { id: 'revenue_high', name: 'Revenue: High to Low', icon: TrendingUp },
    { id: 'most_viewed', name: 'Most Viewed', icon: Eye },
    { id: 'trending', name: 'Trending', icon: TrendingUp },
    { id: 'featured', name: 'Featured First', icon: Star }
  ]

  // Advanced search logic with fuzzy matching and scoring
  const filteredProjects = useMemo(() => {
    if (!projects || projects.length === 0) return []

    let filtered = [...projects]

    // Text search with fuzzy matching
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase()
      filtered = filtered.filter(project => {
        const searchableText = [
          project.name,
          project.description,
          project.tech_stack?.join(' '),
          project.category,
          project.tags?.join(' ')
        ].filter(Boolean).join(' ').toLowerCase()

        return searchableText.includes(searchLower)
      })

      // Add search to history
      if (debouncedSearchTerm.length > 2 && !searchHistory.includes(debouncedSearchTerm)) {
        setSearchHistory(prev => [debouncedSearchTerm, ...prev.slice(0, 9)])
      }
    }

    // Apply filters
    if (filters.category !== 'all') {
      filtered = filtered.filter(p => p.category === filters.category)
    }

    if (filters.verified) {
      filtered = filtered.filter(p => p.verified)
    }

    if (filters.featured) {
      filtered = filtered.filter(p => p.featured)
    }

    if (filters.hasDemo) {
      filtered = filtered.filter(p => p.demo_url || p.video_urls?.length > 0)
    }

    // Price range filter
    filtered = filtered.filter(p => {
      const price = p.sale_price || 0
      return price >= filters.priceRange[0] && price <= filters.priceRange[1]
    })

    // Revenue range filter
    filtered = filtered.filter(p => {
      const revenue = p.monthly_revenue || 0
      return revenue >= filters.revenueRange[0] && revenue <= filters.revenueRange[1]
    })

    // Tech stack filter
    if (filters.techStack.length > 0) {
      filtered = filtered.filter(p => {
        const projectTech = p.tech_stack || []
        return filters.techStack.some(tech => 
          projectTech.some(pt => pt.toLowerCase().includes(tech.toLowerCase()))
        )
      })
    }

    // Project stage filter
    if (filters.projectStage !== 'all') {
      filtered = filtered.filter(p => p.stage === filters.projectStage)
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at)
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at)
        case 'price_high':
          return (b.sale_price || 0) - (a.sale_price || 0)
        case 'price_low':
          return (a.sale_price || 0) - (b.sale_price || 0)
        case 'revenue_high':
          return (b.monthly_revenue || 0) - (a.monthly_revenue || 0)
        case 'most_viewed':
          return (b.view_count || 0) - (a.view_count || 0)
        case 'trending':
          return (b.weekly_views || 0) - (a.weekly_views || 0)
        case 'featured':
          return (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
        case 'relevance':
        default:
          // Simple relevance scoring based on search term match frequency
          if (!debouncedSearchTerm) return 0
          const scoreA = calculateRelevanceScore(a, debouncedSearchTerm)
          const scoreB = calculateRelevanceScore(b, debouncedSearchTerm)
          return scoreB - scoreA
      }
    })

    return filtered
  }, [projects, debouncedSearchTerm, filters, searchHistory])

  const calculateRelevanceScore = (project, searchTerm) => {
    const term = searchTerm.toLowerCase()
    let score = 0

    // Name match (highest weight)
    if (project.name?.toLowerCase().includes(term)) score += 10
    
    // Description match
    if (project.description?.toLowerCase().includes(term)) score += 5
    
    // Tech stack match
    if (project.tech_stack?.some(tech => tech.toLowerCase().includes(term))) score += 3
    
    // Category match
    if (project.category?.toLowerCase().includes(term)) score += 2
    
    // Tags match
    if (project.tags?.some(tag => tag.toLowerCase().includes(term))) score += 1

    return score
  }

  // Update parent component with filtered results
  useEffect(() => {
    onFilteredResults(filteredProjects)
  }, [filteredProjects, onFilteredResults])

  const clearFilters = () => {
    setSearchTerm('')
    setFilters({
      category: 'all',
      priceRange: [0, 100000],
      revenueRange: [0, 50000],
      techStack: [],
      projectStage: 'all',
      verified: false,
      featured: false,
      hasDemo: false,
      sortBy: 'relevance',
      dateRange: 'all'
    })
  }

  const saveCurrentSearch = () => {
    if (!searchTerm && filters.category === 'all') return

    const search = {
      id: Date.now(),
      name: searchTerm || `${filters.category} projects`,
      searchTerm,
      filters,
      results: filteredProjects.length,
      savedAt: new Date().toISOString()
    }

    setSavedSearches(prev => [search, ...prev.slice(0, 4)])
  }

  const loadSavedSearch = (search) => {
    setSearchTerm(search.searchTerm)
    setFilters(search.filters)
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Search Bar */}
      <div className="relative">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, description, tech stack, or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-16 py-4 bg-gray-900/50 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition-colors duration-200 text-lg"
          />
          
          {/* Search Actions */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="p-1 hover:bg-gray-700 rounded-full transition-colors duration-200"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={cn(
                "p-2 rounded-lg transition-colors duration-200",
                showAdvancedFilters
                  ? "bg-purple-600/20 text-purple-400"
                  : "hover:bg-gray-700 text-gray-400"
              )}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Suggestions */}
        {searchTerm && searchHistory.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
            <div className="p-2">
              <div className="px-3 py-2 text-xs text-gray-500 font-medium">Recent Searches</div>
              {searchHistory.slice(0, 5).map((term, index) => (
                <button
                  key={index}
                  onClick={() => setSearchTerm(term)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-white/5 transition-colors duration-200"
                >
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-300">{term}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.slice(1, 5).map((category) => {
          const Icon = category.icon
          return (
            <button
              key={category.id}
              onClick={() => setFilters(prev => ({ ...prev, category: category.id }))}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors duration-200",
                filters.category === category.id
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                  : "bg-gray-900/30 text-gray-400 hover:text-white hover:bg-gray-800/50"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{category.name}</span>
            </button>
          )
        })}

        <div className="h-4 w-px bg-white/10 mx-2" />

        {/* Filter toggles */}
        <button
          onClick={() => setFilters(prev => ({ ...prev, verified: !prev.verified }))}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors duration-200",
            filters.verified
              ? "bg-green-600/20 text-green-300 border border-green-500/30"
              : "bg-gray-900/30 text-gray-400 hover:text-white hover:bg-gray-800/50"
          )}
        >
          <Shield className="w-4 h-4" />
          <span>Verified</span>
        </button>

        <button
          onClick={() => setFilters(prev => ({ ...prev, featured: !prev.featured }))}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors duration-200",
            filters.featured
              ? "bg-yellow-600/20 text-yellow-300 border border-yellow-500/30"
              : "bg-gray-900/30 text-gray-400 hover:text-white hover:bg-gray-800/50"
          )}
        >
          <Star className="w-4 h-4" />
          <span>Featured</span>
        </button>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-900/30 border border-white/10 rounded-2xl p-6 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Advanced Filters</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-red-400 hover:text-red-300 transition-colors duration-200"
              >
                Clear All Filters
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Tech Stack */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Tech Stack</label>
                <div className="flex flex-wrap gap-2">
                  {techStacks.slice(0, 12).map((tech) => (
                    <button
                      key={tech.id}
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          techStack: prev.techStack.includes(tech.id)
                            ? prev.techStack.filter(t => t !== tech.id)
                            : [...prev.techStack, tech.id]
                        }))
                      }}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs transition-colors duration-200",
                        filters.techStack.includes(tech.id)
                          ? "bg-purple-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                      )}
                    >
                      {tech.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg text-white"
                >
                  {sortOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Price Range: ${filters.priceRange[0].toLocaleString()} - ${filters.priceRange[1].toLocaleString()}
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100000"
                    step="1000"
                    value={filters.priceRange[1]}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      priceRange: [prev.priceRange[0], parseInt(e.target.value)] 
                    }))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Save Search */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="text-sm text-gray-400">
                {filteredProjects.length} projects match your criteria
              </div>
              
              <button
                onClick={saveCurrentSearch}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-600/30 transition-colors duration-200"
              >
                <Bookmark className="w-4 h-4" />
                <span>Save Search</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Saved Searches</h4>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {savedSearches.map((search) => (
              <button
                key={search.id}
                onClick={() => loadSavedSearch(search)}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-gray-900/50 border border-white/10 rounded-lg hover:border-white/20 transition-colors duration-200"
              >
                <Bookmark className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-white">{search.name}</span>
                <span className="text-xs text-gray-500">({search.results})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedSearch