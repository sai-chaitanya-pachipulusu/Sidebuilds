import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  TrendingUp,
  Target,
  Zap,
  Brain,
  BarChart3,
  Users,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Star,
  Lightbulb,
  Rocket,
  Eye,
  Heart,
  MessageSquare,
  Globe,
  Code,
  Shield,
  Award,
  ChevronRight,
  X,
  BookOpen,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  SortDesc
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useAuth } from '../context/AuthContext'

const AIRecommendations = ({ userProjects, userInterests, marketplaceProjects }) => {
  const { user } = useAuth()
  const [recommendations, setRecommendations] = useState([])
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('recommendations')
  const [showDetails, setShowDetails] = useState(false)

  // Simulated AI recommendation engine
  const generateRecommendations = async () => {
    setLoading(true)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Generate smart recommendations based on user data
    const mockRecommendations = [
      {
        id: 1,
        type: 'project_match',
        title: 'Perfect Match Found',
        description: 'AI-Powered Social Media Scheduler matches your interests in SaaS and marketing tools',
        project: {
          id: 'proj_123',
          name: 'SocialSync Pro',
          price: 15000,
          revenue: 2500,
          category: 'saas',
          tags: ['React', 'Node.js', 'AI'],
          matchScore: 94
        },
        confidence: 94,
        reasons: [
          'Matches your preferred tech stack (React, Node.js)',
          'Similar revenue to your successful projects',
          'High growth potential in social media automation',
          'Price within your typical investment range'
        ],
        action: 'view_project'
      },
      {
        id: 2,
        type: 'pricing_optimization',
        title: 'Pricing Opportunity',
        description: 'Your TaskFlow app could be priced 40% higher based on market analysis',
        currentPrice: 8000,
        suggestedPrice: 12000,
        confidence: 87,
        impact: '+$4,000 potential revenue',
        reasons: [
          'Similar projects sell for $10K-15K range',
          'Your monthly revenue justifies higher valuation',
          'Market demand is strong for productivity tools',
          'Feature set exceeds average in category'
        ],
        action: 'update_pricing'
      },
      {
        id: 3,
        type: 'market_trend',
        title: 'Trending Opportunity',
        description: 'AI tools category showing 340% growth - consider pivoting or expanding',
        trend: {
          category: 'AI & Machine Learning',
          growth: 340,
          avgPrice: 18500,
          timeToSell: '3-4 weeks'
        },
        confidence: 91,
        reasons: [
          'High buyer demand for AI-powered solutions',
          'Premium pricing accepted in this category',
          'Your development skills align with market needs',
          'Low competition in specific AI niches'
        ],
        action: 'explore_ai_pivot'
      },
      {
        id: 4,
        type: 'buyer_intent',
        title: 'Buyer Interest Predicted',
        description: 'High probability buyer will contact you about MindMap Pro within 48 hours',
        project: {
          name: 'MindMap Pro',
          id: 'proj_456'
        },
        confidence: 82,
        predictedActions: [
          'Profile view from enterprise buyer',
          'Demo request likely within 24h',
          'Price negotiation expected'
        ],
        action: 'prepare_demo'
      }
    ]

    const mockInsights = [
      {
        id: 1,
        type: 'performance',
        title: 'Portfolio Performance',
        value: '+23%',
        description: 'Average project value increased over last 3 months',
        trend: 'up',
        details: 'Your pricing strategy and project quality improvements are paying off'
      },
      {
        id: 2,
        type: 'market_position',
        title: 'Market Position',
        value: 'Top 15%',
        description: 'Your projects rank in top 15% for category',
        trend: 'up',
        details: 'Consistently outperforming similar projects in views and interest'
      },
      {
        id: 3,
        type: 'optimization',
        title: 'Optimization Score',
        value: '87/100',
        description: 'Room for improvement in descriptions and media',
        trend: 'neutral',
        details: 'Adding more screenshots and technical details could boost interest'
      }
    ]

    setRecommendations(mockRecommendations)
    setInsights(mockInsights)
    setLoading(false)
  }

  useEffect(() => {
    generateRecommendations()
  }, [])

  const getRecommendationIcon = (type) => {
    switch (type) {
      case 'project_match': return Target
      case 'pricing_optimization': return TrendingUp
      case 'market_trend': return BarChart3
      case 'buyer_intent': return Users
      default: return Lightbulb
    }
  }

  const getRecommendationColor = (type) => {
    switch (type) {
      case 'project_match': return 'text-green-400 bg-green-400/10'
      case 'pricing_optimization': return 'text-blue-400 bg-blue-400/10'
      case 'market_trend': return 'text-white bg-white/10'
      case 'buyer_intent': return 'text-orange-400 bg-orange-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return 'text-green-400'
    if (confidence >= 80) return 'text-blue-400'
    if (confidence >= 70) return 'text-yellow-400'
    return 'text-red-400'
  }

  const tabs = [
    { id: 'recommendations', name: 'AI Recommendations', icon: Brain, count: recommendations.length },
    { id: 'insights', name: 'Insights', icon: BarChart3, count: insights.length },
    { id: 'trends', name: 'Market Trends', icon: TrendingUp, count: 5 }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-none">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">AI Assistant</h2>
            <p className="text-gray-400 text-sm">Personalized recommendations and insights</p>
          </div>
        </div>

        <button
          onClick={generateRecommendations}
          disabled={loading}
          className={cn(
            "flex items-center gap-2 px-4 py-2 bg-white/20 border border-white/50/30 rounded-none text-gray-300 hover:bg-white/30 transition-colors duration-200",
            loading && "animate-pulse"
          )}
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          <span>{loading ? 'Analyzing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors duration-200",
                activeTab === tab.id
                  ? "border-white/50 text-gray-300"
                  : "border-transparent text-gray-400 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
              {tab.count > 0 && (
                <span className="px-2 py-0.5 bg-gray-700 text-xs rounded-none">
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-none flex items-center justify-center">
              <Brain className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">AI is thinking...</h3>
            <p className="text-gray-400">Analyzing your projects and market data</p>
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {activeTab === 'recommendations' && (
              <div className="space-y-4">
                {recommendations.map((rec, index) => {
                  const Icon = getRecommendationIcon(rec.type)
                  const colorClasses = getRecommendationColor(rec.type)

                  return (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gray-900/50 border border-white/10 rounded-none p-6 hover:border-white/20 transition-colors duration-200"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className={cn("p-2 rounded-none", colorClasses)}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-white mb-1">{rec.title}</h3>
                            <p className="text-gray-400 text-sm">{rec.description}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={cn("text-sm font-medium", getConfidenceColor(rec.confidence))}>
                            {rec.confidence}% confident
                          </div>
                          <div className="w-16 h-1 bg-gray-800 rounded-none mt-1">
                            <div 
                              className={cn("h-1 rounded-none", getConfidenceColor(rec.confidence).replace('text-', 'bg-'))}
                              style={{ width: `${rec.confidence}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Recommendation Details */}
                      {rec.project && (
                        <div className="bg-gray-800/50 rounded-none p-4 mb-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-white">{rec.project.name}</h4>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                                <span>${rec.project.price?.toLocaleString()}</span>
                                <span>${rec.project.revenue}/mo</span>
                                <span>Match: {rec.project.matchScore}%</span>
                              </div>
                            </div>
                            <button className="p-2 bg-white/20 rounded-none text-white hover:bg-white/30">
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Reasons */}
                      <div className="space-y-2 mb-4">
                        <h4 className="text-sm font-medium text-gray-300">Why this recommendation:</h4>
                        <ul className="space-y-1">
                          {rec.reasons.slice(0, 3).map((reason, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                              <CheckCircle className="w-3 h-3 text-green-400 mt-1 flex-shrink-0" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white text-white rounded-none hover:bg-white-700 transition-colors duration-200">
                          <span>Take Action</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button className="px-4 py-2 text-gray-400 hover:text-white transition-colors duration-200">
                          Maybe Later
                        </button>
                        <button className="ml-auto p-2 text-gray-400 hover:text-red-400 transition-colors duration-200">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {insights.map((insight, index) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-900/50 border border-white/10 rounded-none p-6"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        "w-2 h-2 rounded-none",
                        insight.trend === 'up' ? 'bg-green-400' : 
                        insight.trend === 'down' ? 'bg-red-400' : 'bg-yellow-400'
                      )} />
                      <h3 className="font-medium text-white">{insight.title}</h3>
                    </div>
                    
                    <div className="text-2xl font-bold text-white mb-2">{insight.value}</div>
                    <p className="text-gray-400 text-sm mb-3">{insight.description}</p>
                    <p className="text-xs text-gray-500">{insight.details}</p>
                  </motion.div>
                ))}
              </div>
            )}

            {activeTab === 'trends' && (
              <div className="text-center py-12 text-gray-500">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-40" />
                <h3 className="text-lg font-medium mb-2">Market Trends Coming Soon</h3>
                <p className="text-sm">Real-time market analysis and trend predictions</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AIRecommendations
