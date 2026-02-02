import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
  Briefcase,
  Brain,
  Lightbulb,
  History,
  TrendingDown,
  Filter as FilterIcon,
  CheckCircle2,
  AlertCircle,
  Info,
  Loader2,
  BookmarkCheck
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useDebounce } from '../hooks/useDebounce'

const AdvancedSearchEnhanced = ({ projects, onFilteredResults, className }) => {
  // Core search state
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
  
  // Enhanced search state
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchMetrics, setSearchMetrics] = useState({
    totalMatches: 0,
    searchTime: 0,
    lastSearchAt: null
  })
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  
  // Refs for advanced functionality
  const searchInputRef = useRef(null)
  const suggestionsRef = useRef(null)
  const searchCache = useRef(new Map())

  // Debounce search terms with different delays for different purposes
  const debouncedSearchTerm = useDebounce(searchTerm, 250)
  const suggestionSearchTerm = useDebounce(searchTerm, 150)

  // Enhanced categories with better organization
  const categories = [
    { id: 'all', name: 'All Categories', icon: Globe, count: 0, color: 'text-gray-400' },
    { id: 'saas', name: 'SaaS & Web Apps', icon: Zap, count: 0, color: 'text-gray-300' },
    { id: 'ecommerce', name: 'E-commerce', icon: Briefcase, count: 0, color: 'text-gray-300' },
    { id: 'mobile', name: 'Mobile Apps', icon: Smartphone, count: 0, color: 'text-gray-300' },
    { id: 'ai', name: 'AI & ML', icon: Brain, count: 0, color: 'text-gray-300' },
    { id: 'tools', name: 'Developer Tools', icon: Code, count: 0, color: 'text-gray-300' },
    { id: 'games', name: 'Games', icon: Target, count: 0, color: 'text-orange-400' },
    { id: 'content', name: 'Content & Media', icon: Monitor, count: 0, color: 'text-gray-300' }
  ]

  // Enhanced tech stacks with categories
  const techStacks = [
    { id: 'react', name: 'React', color: 'bg-blue-500', category: 'frontend' },
    { id: 'vue', name: 'Vue.js', color: 'bg-green-500', category: 'frontend' },
    { id: 'angular', name: 'Angular', color: 'bg-red-500', category: 'frontend' },
    { id: 'svelte', name: 'Svelte', color: 'bg-orange-500', category: 'frontend' },
    { id: 'nodejs', name: 'Node.js', color: 'bg-green-600', category: 'backend' },
    { id: 'python', name: 'Python', color: 'bg-yellow-500', category: 'backend' },
    { id: 'django', name: 'Django', color: 'bg-green-700', category: 'backend' },
    { id: 'fastapi', name: 'FastAPI', color: 'bg-green-600', category: 'backend' },
    { id: 'rails', name: 'Ruby on Rails', color: 'bg-red-600', category: 'backend' },
    { id: 'php', name: 'PHP', color: 'bg-gray-600', category: 'backend' },
    { id: 'laravel', name: 'Laravel', color: 'bg-red-500', category: 'backend' },
    { id: 'nextjs', name: 'Next.js', color: 'bg-gray-800', category: 'fullstack' },
    { id: 'nuxtjs', name: 'Nuxt.js', color: 'bg-green-600', category: 'fullstack' },
    { id: 'flutter', name: 'Flutter', color: 'bg-blue-400', category: 'mobile' },
    { id: 'reactnative', name: 'React Native', color: 'bg-blue-600', category: 'mobile' },
    { id: 'swift', name: 'Swift', color: 'bg-orange-500', category: 'mobile' },
    { id: 'kotlin', name: 'Kotlin', color: 'bg-gray-500', category: 'mobile' },
    { id: 'mongodb', name: 'MongoDB', color: 'bg-green-500', category: 'database' },
    { id: 'postgresql', name: 'PostgreSQL', color: 'bg-blue-600', category: 'database' },
    { id: 'mysql', name: 'MySQL', color: 'bg-blue-500', category: 'database' },
    { id: 'redis', name: 'Redis', color: 'bg-red-500', category: 'database' },
    { id: 'aws', name: 'AWS', color: 'bg-orange-400', category: 'cloud' },
    { id: 'gcp', name: 'Google Cloud', color: 'bg-blue-500', category: 'cloud' },
    { id: 'azure', name: 'Azure', color: 'bg-blue-600', category: 'cloud' },
    { id: 'vercel', name: 'Vercel', color: 'bg-black', category: 'cloud' },
    { id: 'firebase', name: 'Firebase', color: 'bg-yellow-500', category: 'cloud' },
    { id: 'supabase', name: 'Supabase', color: 'bg-green-600', category: 'cloud' }
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

  // Enhanced fuzzy search with Levenshtein distance
  const calculateFuzzyMatch = useCallback((term, text, threshold = 0.6) => {
    if (!term || !text) return 0
    
    const termLower = term.toLowerCase()
    const textLower = text.toLowerCase()
    
    // Exact match gets highest score
    if (textLower.includes(termLower)) return 1.0
    
    // Calculate Levenshtein distance for fuzzy matching
    const levenshteinDistance = (str1, str2) => {
      const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0))
      
      for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
      for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
      
      for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
          const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
          matrix[j][i] = Math.min(
            matrix[j][i - 1] + 1,    // insertion
            matrix[j - 1][i] + 1,    // deletion
            matrix[j - 1][i - 1] + cost // substitution
          )
        }
      }
      
      return matrix[str2.length][str1.length]
    }
    
    const words = textLower.split(/\s+/)
    let maxScore = 0
    
    words.forEach(word => {
      const distance = levenshteinDistance(termLower, word)
      const similarity = 1 - (distance / Math.max(termLower.length, word.length))
      maxScore = Math.max(maxScore, similarity)
    })
    
    return maxScore >= threshold ? maxScore : 0
  }, [])
  
  // Generate smart suggestions based on search term
  const generateSuggestions = useCallback((term) => {
    if (!term || term.length < 2) return []
    
    const termLower = term.toLowerCase()
    const suggestions = new Set()
    
    // Add category suggestions
    categories.forEach(cat => {
      if (cat.name.toLowerCase().includes(termLower) && cat.id !== 'all') {
        suggestions.add({
          type: 'category',
          value: cat.name,
          icon: cat.icon,
          description: `Browse ${cat.name} projects`,
          action: () => setFilters(prev => ({ ...prev, category: cat.id }))
        })
      }
    })
    
    // Add tech stack suggestions
    techStacks.forEach(tech => {
      if (tech.name.toLowerCase().includes(termLower)) {
        suggestions.add({
          type: 'tech',
          value: tech.name,
          icon: Code,
          description: `Projects using ${tech.name}`,
          action: () => setFilters(prev => ({
            ...prev,
            techStack: [...prev.techStack, tech.id]
          }))
        })
      }
    })
    
    // Add project name suggestions
    projects?.slice(0, 5).forEach(project => {
      const fuzzyScore = calculateFuzzyMatch(term, project.name)
      if (fuzzyScore > 0.3) {
        suggestions.add({
          type: 'project',
          value: project.name,
          icon: Target,
          description: `Go to ${project.name}`,
          score: fuzzyScore,
          action: () => setSearchTerm(project.name)
        })
      }
    })
    
    // Add recent searches
    searchHistory.slice(0, 3).forEach(historyTerm => {
      if (historyTerm.toLowerCase().includes(termLower)) {
        suggestions.add({
          type: 'history',
          value: historyTerm,
          icon: History,
          description: 'Recent search',
          action: () => setSearchTerm(historyTerm)
        })
      }
    })
    
    return Array.from(suggestions)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 8)
  }, [projects, categories, techStacks, searchHistory, calculateFuzzyMatch])
  
  // Advanced search logic with improved fuzzy matching and scoring
  const filteredProjects = useMemo(() => {
    if (!projects || projects.length === 0) return []
    
    const startTime = performance.now()
    let filtered = [...projects]
    
    // Check cache first
    const cacheKey = JSON.stringify({ term: debouncedSearchTerm, filters })
    if (searchCache.current.has(cacheKey)) {
      const cached = searchCache.current.get(cacheKey)
      setSearchMetrics(prev => ({
        ...prev,
        totalMatches: cached.length,
        searchTime: performance.now() - startTime,
        lastSearchAt: new Date()
      }))
      return cached
    }

    // Text search with enhanced fuzzy matching
    if (debouncedSearchTerm) {
      setIsSearching(true)
      const searchResults = []
      
      filtered.forEach(project => {
        let totalScore = 0
        let matchCount = 0
        
        // Search in different fields with different weights
        const searchFields = [
          { field: project.name, weight: 10 },
          { field: project.description, weight: 5 },
          { field: project.tech_stack?.join(' '), weight: 3 },
          { field: project.category, weight: 2 },
          { field: project.tags?.join(' '), weight: 1 },
          { field: project.owner_username, weight: 2 }
        ]
        
        searchFields.forEach(({ field, weight }) => {
          if (field) {
            const fuzzyScore = calculateFuzzyMatch(debouncedSearchTerm, field, 0.4)
            if (fuzzyScore > 0) {
              totalScore += fuzzyScore * weight
              matchCount++
            }
          }
        })
        
        // Include project if it has any matches
        if (matchCount > 0) {
          searchResults.push({ 
            ...project, 
            searchScore: totalScore / matchCount,
            matchCount 
          })
        }
      })
      
      // Sort by search relevance
      filtered = searchResults.sort((a, b) => b.searchScore - a.searchScore)
      setIsSearching(false)

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

    // Enhanced sorting with multiple criteria
    if (!debouncedSearchTerm || filters.sortBy !== 'relevance') {
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
            // Calculate trending score based on recent views and revenue
            const trendingScoreA = (a.view_count || 0) * 0.1 + (a.monthly_revenue || 0) * 0.001
            const trendingScoreB = (b.view_count || 0) * 0.1 + (b.monthly_revenue || 0) * 0.001
            return trendingScoreB - trendingScoreA
          case 'featured':
            return (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
          case 'relevance':
          default:
            return 0 // Already sorted by search score if search term exists
        }
      })
    }
    
    // Cache the results
    if (searchCache.current.size > 50) {
      searchCache.current.clear() // Simple cache cleanup
    }
    searchCache.current.set(cacheKey, filtered)
    
    // Update metrics
    setSearchMetrics(prev => ({
      ...prev,
      totalMatches: filtered.length,
      searchTime: performance.now() - startTime,
      lastSearchAt: new Date()
    }))

    return filtered
  }, [projects, debouncedSearchTerm, filters, searchHistory, calculateFuzzyMatch])

  // Handle keyboard navigation for suggestions
  const handleKeyDown = useCallback((e) => {
    if (!showSuggestions || suggestions.length === 0) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex >= 0) {
          suggestions[selectedSuggestionIndex].action()
          setShowSuggestions(false)
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        break
    }
  }, [showSuggestions, suggestions, selectedSuggestionIndex])
  
  // Update suggestions when search term changes
  useEffect(() => {
    if (suggestionSearchTerm) {
      const newSuggestions = generateSuggestions(suggestionSearchTerm)
      setSuggestions(newSuggestions)
      setShowSuggestions(newSuggestions.length > 0 && document.activeElement === searchInputRef.current)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
    setSelectedSuggestionIndex(-1)
  }, [suggestionSearchTerm, generateSuggestions])

  // Update parent component with filtered results
  useEffect(() => {
    onFilteredResults(filteredProjects)
  }, [filteredProjects, onFilteredResults])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

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
      {/* Enhanced Main Search Bar */}
      <div className="relative">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          {isSearching && (
            <Loader2 className="absolute left-12 top-1/2 -translate-y-1/2 w-4 h-4 text-white animate-spin" />
          )}
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search projects with AI-powered fuzzy matching..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true)
            }}
            onBlur={(e) => {
              // Delay hiding suggestions to allow clicking
              setTimeout(() => {
                if (!suggestionsRef.current?.contains(e.relatedTarget)) {
                  setShowSuggestions(false)
                  setSelectedSuggestionIndex(-1)
                }
              }, 150)
            }}
            className="w-full pl-12 pr-20 py-4 bg-gray-900/50 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:border-white focus:outline-none transition-colors duration-200 text-lg"
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
            <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-600">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-600">K</kbd>
            </div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={cn(
                "p-2 rounded-lg transition-colors duration-200",
                showAdvancedFilters
                  ? "bg-white/20 text-white"
                  : "hover:bg-gray-700 text-gray-400"
              )}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Enhanced Search Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div 
            ref={suggestionsRef}
            className="absolute top-full mt-2 w-full bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto"
          >
            <div className="p-2">
              <div className="px-3 py-2 text-xs text-gray-500 font-medium flex items-center gap-2">
                <Brain className="w-3 h-3" />
                Smart Suggestions
              </div>
              {suggestions.map((suggestion, index) => {
                const Icon = suggestion.icon
                return (
                  <motion.button
                    key={`${suggestion.type}-${suggestion.value}`}
                    onClick={suggestion.action}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors duration-200",
                      selectedSuggestionIndex === index
                        ? "bg-white/20 border border-white/50/30"
                        : "hover:bg-white/5"
                    )}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Icon className={cn(
                      "w-4 h-4",
                      suggestion.type === 'category' && 'text-white',
                      suggestion.type === 'tech' && 'text-blue-400',
                      suggestion.type === 'project' && 'text-green-400',
                      suggestion.type === 'history' && 'text-gray-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-300 font-medium truncate">
                        {suggestion.value}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {suggestion.description}
                      </div>
                    </div>
                    {suggestion.score && (
                      <div className="text-xs text-white font-medium">
                        {Math.round(suggestion.score * 100)}% match
                      </div>
                    )}
                  </motion.button>
                )
              })}
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
                  ? "bg-white/10 text-white border border-white/20"
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
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <FilterIcon className="w-5 h-5" />
                Advanced Filters
              </h3>
              <button
                onClick={clearFilters}
                className="text-sm text-red-400 hover:text-red-300 transition-colors duration-200"
              >
                Clear All Filters
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Enhanced Tech Stack with Categories */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-3">Tech Stack</label>
                <div className="space-y-3">
                  {['frontend', 'backend', 'fullstack', 'mobile', 'database', 'cloud'].map(category => {
                    const categoryTechs = techStacks.filter(tech => tech.category === category)
                    if (categoryTechs.length === 0) return null
                    
                    return (
                      <div key={category}>
                        <div className="text-xs text-gray-500 font-medium mb-2 capitalize flex items-center gap-2">
                          {category === 'frontend' && <Monitor className="w-3 h-3" />}
                          {category === 'backend' && <Database className="w-3 h-3" />}
                          {category === 'fullstack' && <Layers className="w-3 h-3" />}
                          {category === 'mobile' && <Smartphone className="w-3 h-3" />}
                          {category === 'database' && <Database className="w-3 h-3" />}
                          {category === 'cloud' && <Cloud className="w-3 h-3" />}
                          {category}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {categoryTechs.map((tech) => (
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
                                "px-3 py-1 rounded-full text-xs transition-all duration-200 border",
                                filters.techStack.includes(tech.id)
                                  ? "bg-white text-black border-white shadow-lg shadow-white/25"
                                  : "bg-gray-800/50 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white hover:border-gray-600"
                              )}
                            >
                              {tech.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
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

              {/* Enhanced Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Price Range: ${filters.priceRange[0].toLocaleString()} - ${filters.priceRange[1].toLocaleString()}
                </label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Min</label>
                      <input
                        type="range"
                        min="0"
                        max="50000"
                        step="1000"
                        value={filters.priceRange[0]}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          priceRange: [parseInt(e.target.value), prev.priceRange[1]] 
                        }))}
                        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-gray-600"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Max</label>
                      <input
                        type="range"
                        min="1000"
                        max="100000"
                        step="1000"
                        value={filters.priceRange[1]}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          priceRange: [prev.priceRange[0], parseInt(e.target.value)] 
                        }))}
                        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-gray-600"
                      />
                    </div>
                  </div>
                  {/* Quick price filters */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Under $10k', range: [0, 10000] },
                      { label: '$10k-$25k', range: [10000, 25000] },
                      { label: '$25k-$50k', range: [25000, 50000] },
                      { label: '$50k+', range: [50000, 100000] }
                    ].map(({ label, range }) => (
                      <button
                        key={label}
                        onClick={() => setFilters(prev => ({ ...prev, priceRange: range }))}
                        className={cn(
                          "px-2 py-1 rounded text-xs transition-colors duration-200",
                          filters.priceRange[0] === range[0] && filters.priceRange[1] === range[1]
                            ? "bg-white text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Save Search */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  {filteredProjects.length} matches
                </div>
                {searchMetrics.searchTime > 0 && (
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    {searchMetrics.searchTime.toFixed(1)}ms
                  </div>
                )}
                {debouncedSearchTerm && (
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-white" />
                    AI-enhanced search
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href + '?q=' + encodeURIComponent(searchTerm))
                    // You could show a toast here
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors duration-200 text-sm"
                >
                  <ArrowRight className="w-4 h-4" />
                  Share
                </button>
                <button
                  onClick={saveCurrentSearch}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 border border-white/50/30 rounded-lg text-gray-300 hover:bg-white/30 transition-colors duration-200"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>Save Search</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Saved Searches */}
      {savedSearches.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <Bookmark className="w-4 h-4" />
            Saved Searches
          </h4>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {savedSearches.map((search) => (
              <motion.button
                key={search.id}
                onClick={() => loadSavedSearch(search)}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-gray-900/50 border border-white/10 rounded-lg hover:border-white/20 transition-all duration-200 group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <BookmarkCheck className="w-4 h-4 text-white" />
                <div className="text-left">
                  <div className="text-sm text-white font-medium">{search.name}</div>
                  <div className="text-xs text-gray-500">
                    {search.results} results • {new Date(search.savedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSavedSearches(prev => prev.filter(s => s.id !== search.id))
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all duration-200"
                >
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedSearchEnhanced
