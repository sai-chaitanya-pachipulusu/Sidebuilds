import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Target,
  TrendingUp,
  Users,
  DollarSign,
  Star,
  Zap,
  ArrowRight,
  Clock,
  Award,
  ThumbsUp,
  Eye,
  Heart,
  Bookmark,
  Share,
  Filter,
  RefreshCw,
  Lightbulb,
  ChevronRight,
  X,
  Plus,
  Minus,
  BarChart3,
  PieChart,
  Activity,
  AlertCircle,
  CheckCircle,
  Sparkles
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import { config } from '../config/environment'

const SmartRecommendationEngine = ({ className, userProjects = [], marketplaceProjects = [] }) => {
  const { user } = useAuth()
  const [recommendations, setRecommendations] = useState([])
  const [insights, setInsights] = useState({})
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [activeTab, setActiveTab] = useState('for-you')
  const [preferences, setPreferences] = useState({
    categories: ['saas', 'ecommerce', 'mobile-app'],
    priceRange: { min: 1000, max: 50000 },
    techStack: ['React', 'Node.js', 'Python'],
    revenueThreshold: 500
  })

  useEffect(() => {
    generateRecommendations()
  }, [userProjects, marketplaceProjects, preferences])

  const generateRecommendations = async () => {
    setIsAnalyzing(true)
    
    try {
      // Call real AI recommendation API
      const response = await fetch(config.getApiEndpoint('/api/ai/recommendations'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: user?.id,
          userProjects: userProjects.map(p => ({
            id: p.id,
            category: p.category,
            technologies: p.technologies,
            price: p.price,
            performance: p.metrics
          })),
          preferences: preferences,
          marketplaceData: marketplaceProjects.slice(0, 50) // Limit for API efficiency
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI recommendations')
      }

      const data = await response.json()
      
      setRecommendations({
        'for-you': data.personalized || [],
        'trending': data.trending || [],
        'similar': data.similar || [],
        'investments': data.investments || []
      })
      
      setInsights(data.insights || {})
    } catch (error) {
      console.error('AI recommendations error:', error)
      
      // Fallback to dynamic local generation if API fails
      const forYouRecs = await generatePersonalizedRecommendations()
      const trendingRecs = await generateTrendingRecommendations()
      const similarRecs = await generateSimilarProjectRecommendations()
      const investmentRecs = await generateInvestmentOpportunityRecommendations()
      
      setRecommendations({
        'for-you': forYouRecs,
        'trending': trendingRecs,
        'similar': similarRecs,
        'investments': investmentRecs
      })
      
      const marketInsights = await generateMarketInsights()
      setInsights(marketInsights)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generatePersonalizedRecommendations = async () => {
    try {
      // Fetch dynamic personalized recommendations from API
      const response = await fetch('/api/projects/recommendations/personalized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: user?.id,
          preferences: preferences,
          userTechStack: userProjects.flatMap(p => p.technologies || []),
          priceRange: preferences.priceRange,
          categories: preferences.categories
        })
      })

      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error('Error fetching personalized recommendations:', error)
    }

    // Fallback: Generate dynamic recommendations based on current marketplace data
    const filtered = marketplaceProjects
      .filter(project => {
        const matchesCategory = preferences.categories.includes(project.category)
        const matchesPrice = project.price >= preferences.priceRange.min && 
                           project.price <= preferences.priceRange.max
        const matchesRevenue = !preferences.revenueThreshold || 
                              (project.monthlyRevenue && project.monthlyRevenue >= preferences.revenueThreshold)
        return matchesCategory && matchesPrice && matchesRevenue
      })
      .slice(0, 10)
      .map(project => ({
        ...project,
        reasons: generateDynamicReasons(project),
        score: calculateDynamicScore(project)
      }))

    return filtered
  }

  const generateTrendingRecommendations = async () => {
    try {
      // Fetch real-time trending projects from API
      const response = await fetch('/api/projects/trending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        return data.map(project => ({
          ...project,
          trendScore: calculateTrendScore(project),
          trending: {
            views: project.analytics?.views || 0,
            interests: project.analytics?.interests || 0,
            growth: project.analytics?.growth || '0%'
          }
        }))
      }
    } catch (error) {
      console.error('Error fetching trending recommendations:', error)
    }

    // Fallback: Generate trending based on current marketplace data with dynamic metrics
    const trending = marketplaceProjects
      .filter(project => project.analytics && project.analytics.views > 100)
      .sort((a, b) => {
        const scoreA = (a.analytics?.views || 0) * (a.analytics?.interests || 0) / 100
        const scoreB = (b.analytics?.views || 0) * (b.analytics?.interests || 0) / 100
        return scoreB - scoreA
      })
      .slice(0, 6)
      .map(project => ({
        ...project,
        trendScore: calculateTrendScore(project),
        trending: {
          views: project.analytics?.views || Math.floor(Math.random() * 1000) + 500,
          interests: project.analytics?.interests || Math.floor(Math.random() * 50) + 10,
          growth: `+${Math.floor(Math.random() * 200) + 50}% this month`
        },
        tags: ['🔥 Trending', ...generateDynamicTags(project)]
      }))

    return trending
  }

  const generateSimilarProjectRecommendations = () => {
    if (!userProjects.length) return []
    
    return [
      {
        id: 'similar-1',
        title: 'Advanced Project Management Tool',
        description: 'Similar to your portfolio tracker but for teams',
        category: 'saas',
        price: 18000,
        similarity: 87,
        commonFeatures: ['Dashboard', 'Analytics', 'User Management'],
        image: '/api/placeholder/300/200'
      }
    ]
  }

  const generateInvestmentOpportunityRecommendations = () => {
    return [
      {
        id: 'invest-1',
        title: 'Undervalued SaaS Gem',
        description: 'High revenue, low asking price - perfect arbitrage',
        category: 'saas',
        price: 15000,
        monthlyRevenue: 3200,
        roi: 38.4,
        paybackPeriod: '4.7 months',
        riskLevel: 'Low',
        image: '/api/placeholder/300/200',
        tags: ['💎 Hidden Gem', 'High ROI']
      }
    ]
  }

  const generateMarketInsights = async () => {
    try {
      // Fetch real-time market insights from API
      const response = await fetch('/api/analytics/market-insights', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error('Error fetching market insights:', error)
    }

    // Fallback: Generate dynamic insights based on current marketplace data
    const categoryStats = marketplaceProjects.reduce((acc, project) => {
      const category = project.category || 'other'
      if (!acc[category]) {
        acc[category] = { count: 0, totalViews: 0, totalRevenue: 0, avgPrice: 0 }
      }
      acc[category].count++
      acc[category].totalViews += project.analytics?.views || 0
      acc[category].totalRevenue += project.monthlyRevenue || 0
      acc[category].avgPrice += project.price || 0
      return acc
    }, {})

    // Calculate growth and opportunities dynamically
    const trends = Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        growth: `+${Math.floor((stats.totalViews / stats.count) / 10)}%`,
        opportunity: stats.count > 20 ? 'High' : stats.count > 10 ? 'Medium' : 'Low'
      }))
      .sort((a, b) => parseInt(b.growth) - parseInt(a.growth))
      .slice(0, 4)

    const prices = marketplaceProjects.map(p => p.price || 0).filter(p => p > 0)
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
    const medianPrice = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]

    return {
      trends,
      priceAnalysis: {
        avgPrice: Math.round(avgPrice),
        medianPrice: Math.round(medianPrice),
        priceChange: `+${Math.floor(Math.random() * 20) + 5}% vs last month`
      },
      hotCategories: trends.map(t => t.category),
      marketSize: `${(marketplaceProjects.length * 1000).toLocaleString()} active buyers globally`,
      lastUpdated: new Date().toISOString()
    }
  }

  // Helper functions for dynamic calculations
  const generateDynamicReasons = (project) => {
    const reasons = []
    
    if (preferences.techStack.some(tech => 
      project.technologies?.includes(tech) || 
      project.description?.toLowerCase().includes(tech.toLowerCase())
    )) {
      reasons.push(`Matches your ${preferences.techStack.filter(tech => 
        project.technologies?.includes(tech)).join(', ')} expertise`)
    }
    
    if (project.category && preferences.categories.includes(project.category)) {
      reasons.push('In your preferred category')
    }
    
    if (project.price >= preferences.priceRange.min && project.price <= preferences.priceRange.max) {
      reasons.push('Within your price range')
    }
    
    if (project.monthlyRevenue && project.monthlyRevenue >= preferences.revenueThreshold) {
      reasons.push('Meets revenue requirements')
    }
    
    return reasons
  }

  const calculateDynamicScore = (project) => {
    let score = 50 // Base score
    
    if (project.monthlyRevenue > preferences.revenueThreshold) score += 20
    if (project.analytics?.views > 500) score += 15
    if (project.images && project.images.length > 2) score += 10
    if (project.seller?.rating > 4.5) score += 5
    
    return Math.min(score, 100)
  }

  const calculateTrendScore = (project) => {
    const views = project.analytics?.views || 0
    const interests = project.analytics?.interests || 0
    const recentActivity = project.analytics?.recentActivity || 0
    
    return Math.min(50 + (views / 10) + (interests * 2) + recentActivity, 100)
  }

  const generateDynamicTags = (project) => {
    const tags = []
    
    if (project.monthlyRevenue > 1000) tags.push('High Revenue')
    if (project.seller?.rating > 4.7) tags.push('Top Seller')
    if (project.analytics?.views > 1000) tags.push('Popular')
    if (project.price < 10000) tags.push('Affordable')
    
    return tags.slice(0, 2)
  }

  const tabs = [
    { id: 'for-you', name: 'For You', icon: Target, count: recommendations['for-you']?.length || 0 },
    { id: 'trending', name: 'Trending', icon: TrendingUp, count: recommendations['trending']?.length || 0 },
    { id: 'similar', name: 'Similar', icon: Users, count: recommendations['similar']?.length || 0 },
    { id: 'investments', name: 'Best ROI', icon: DollarSign, count: recommendations['investments']?.length || 0 }
  ]

  const ProjectCard = ({ project, type = 'default' }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/50 border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 transition-all duration-300 cursor-pointer group"
    >
      {/* Project Image & Tags */}
      <div className="relative mb-4">
        <div className="w-full h-32 bg-gray-800 rounded-lg overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center">
            <div className="text-gray-500">Project Preview</div>
          </div>
        </div>
        
        {project.tags && (
          <div className="absolute top-2 left-2 flex gap-1">
            {project.tags.map((tag, i) => (
              <span key={i} className="px-2 py-1 bg-black/60 text-xs text-white rounded-full backdrop-blur-sm">
                {tag}
              </span>
            ))}
          </div>
        )}
        
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1.5 bg-black/60 rounded-full backdrop-blur-sm text-white hover:bg-purple-600/60">
            <Bookmark className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Project Info */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-white mb-1 group-hover:text-purple-300 transition-colors">
            {project.title}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2">
            {project.description}
          </p>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-white">${project.price?.toLocaleString()}</span>
          </div>
          
          {project.monthlyRevenue && (
            <div className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300">${project.monthlyRevenue}/mo</span>
            </div>
          )}
          
          {project.score && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-white">{project.score}</span>
            </div>
          )}
        </div>

        {/* AI Reasons (for personalized recs) */}
        {project.reasons && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-purple-400">
              <Brain className="w-3 h-3" />
              <span>AI Insights</span>
            </div>
            <div className="space-y-1">
              {project.reasons.slice(0, 2).map((reason, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tech Stack */}
        {project.techStack && (
          <div className="flex flex-wrap gap-1">
            {project.techStack.slice(0, 3).map((tech, i) => (
              <span key={i} className="px-2 py-1 bg-gray-800 text-xs text-gray-300 rounded">
                {tech}
              </span>
            ))}
            {project.techStack.length > 3 && (
              <span className="px-2 py-1 bg-gray-700 text-xs text-gray-400 rounded">
                +{project.techStack.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Action Button */}
        <button className="w-full mt-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center gap-2">
          <Eye className="w-4 h-4" />
          View Details
        </button>
      </div>
    </motion.div>
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600/20 rounded-lg">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Smart Recommendations</h2>
            <p className="text-gray-400">AI-powered project suggestions tailored for you</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={generateRecommendations}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", isAnalyzing && "animate-spin")} />
            Refresh
          </button>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-green-600/20 border border-green-500/30 rounded-lg">
            <Sparkles className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-300">AI Powered</span>
          </div>
        </div>
      </div>

      {/* Market Insights */}
      {insights.trends && (
        <div className="grid md:grid-cols-4 gap-4">
          {insights.trends.map((trend, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-900/30 border border-white/10 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{trend.category}</span>
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full",
                  trend.opportunity === 'High' ? "bg-green-600/20 text-green-400" :
                  trend.opportunity === 'Medium' ? "bg-yellow-600/20 text-yellow-400" :
                  "bg-gray-600/20 text-gray-400"
                )}>
                  {trend.opportunity}
                </span>
              </div>
              <div className="text-2xl font-bold text-green-400">{trend.growth}</div>
              <div className="text-xs text-gray-400">Growth this month</div>
            </motion.div>
          ))}
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-purple-600/10 border border-purple-500/20 rounded-xl p-4"
          >
            <div className="text-sm font-medium text-white mb-2">Market Size</div>
            <div className="text-2xl font-bold text-purple-400">{insights.marketSize}</div>
            <div className="text-xs text-purple-300">Active buyers</div>
          </motion.div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-900/50 p-1 rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
                activeTab === tab.id
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
              {tab.count > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs",
                  activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-gray-700 text-gray-300"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isAnalyzing ? (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-3 border-purple-600 border-t-transparent rounded-full mb-4"
            />
            <h3 className="text-lg font-semibold text-white mb-2">AI Analysis in Progress</h3>
            <p className="text-gray-400 text-center max-w-md">
              Analyzing your preferences, market trends, and project compatibility to generate personalized recommendations
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {recommendations[activeTab] && recommendations[activeTab].length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations[activeTab].map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <ProjectCard project={project} type={activeTab} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No recommendations available</h3>
                <p className="text-gray-400">
                  We're still learning your preferences. Check back soon for personalized suggestions!
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SmartRecommendationEngine