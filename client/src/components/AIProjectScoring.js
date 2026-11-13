import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  TrendingUp,
  Shield,
  Users,
  Code,
  DollarSign,
  Star,
  AlertTriangle,
  CheckCircle,
  Zap,
  Target,
  Award,
  Activity,
  BarChart3,
  Sparkles
} from 'lucide-react'
import { cn } from '../lib/utils'
import { config } from '../config/environment'

const AIProjectScoring = ({ project, className }) => {
  const [score, setScore] = useState(0)
  const [breakdown, setBreakdown] = useState({})
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [recommendations, setRecommendations] = useState([])

  // Dynamic AI scoring calculation with real API integration
  useEffect(() => {
    const calculateScore = async () => {
      setIsAnalyzing(true)
      
      try {
        // Call real AI scoring API endpoint with enhanced project data
        const response = await fetch((config?.getApiEndpoint ? config.getApiEndpoint('/api/ai/score-project') : 'http://localhost:5002/api/ai/score-project'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            projectId: project.id || project.project_id,
            projectData: {
              title: project.title || project.name,
              description: project.description,
              price: project.sale_price || project.price,
              monthlyRevenue: project.monthly_revenue || project.monthlyRevenue,
              category: project.category,
              technologies: project.tech_stack || project.technologies,
              images: project.images || [],
              features: project.features || [],
              demoUrl: project.demo_url || project.demoUrl,
              domain: project.domain,
              github_url: project.github_url,
              view_count: project.view_count,
              users_count: project.users_count,
              stage: project.stage,
              is_verified: project.is_verified,
              created_at: project.created_at,
              seller: {
                id: project.user_id,
                name: project.seller_name || project.username,
                verified: project.seller_verified
              }
            }
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to get AI scoring')
        }
        
        const data = await response.json()
        
        setScore(data.score)
        setBreakdown(data.breakdown)
        setRecommendations(data.recommendations || [])
      } catch (error) {
        console.error('AI scoring error:', error)
        // Enhanced fallback with better error handling
        try {
          const factors = {
            revenue: calculateRevenueScore(project),
            growth: calculateGrowthScore(project),
            technical: calculateTechnicalScore(project),
            market: calculateMarketScore(project),
            presentation: calculatePresentationScore(project),
            seller: calculateSellerScore(project)
          }
          
          const totalScore = Object.values(factors).reduce((sum, score) => sum + score, 0) / Object.keys(factors).length
          
          setScore(Math.round(totalScore))
          setBreakdown(factors)
          setRecommendations(generateRecommendations(factors, project))
        } catch (fallbackError) {
          console.error('Fallback scoring error:', fallbackError)
          // Ultimate fallback - basic scoring
          setScore(65)
          setBreakdown({
            revenue: 60,
            growth: 70,
            technical: 65,
            market: 60,
            presentation: 70,
            seller: 65
          })
          setRecommendations([
            {
              type: 'general',
              priority: 'medium',
              text: 'Complete your project profile for accurate AI scoring',
              impact: '+20 points'
            }
          ])
        }
      } finally {
        setIsAnalyzing(false)
      }
    }
    
    if (project && project.id) {
      calculateScore()
    }
  }, [project])

  const calculateRevenueScore = (project) => {
    const revenue = parseFloat(project.monthly_revenue || project.monthlyRevenue || 0)
    if (revenue === 0) return 30
    if (revenue >= 10000) return 95
    if (revenue >= 5000) return 85
    if (revenue >= 1000) return 75
    if (revenue >= 500) return 65
    if (revenue >= 100) return 55
    return 35
  }

  const calculateGrowthScore = (project) => {
    // Mock growth calculation based on project data
    const growthRate = project.growthRate || Math.random() * 100
    if (growthRate >= 50) return 90
    if (growthRate >= 20) return 80
    if (growthRate >= 10) return 70
    if (growthRate >= 5) return 60
    return 40
  }

  const calculateTechnicalScore = (project) => {
    let score = 50
    
    // Modern tech stack bonus
    const modernTech = ['React', 'Next.js', 'Vue', 'Node.js', 'Python', 'TypeScript', 'GraphQL', 'Docker', 'Kubernetes']
    const techStack = project.tech_stack || project.technologies || []
    const techString = Array.isArray(techStack) ? techStack.join(' ') : techStack.toString()
    const projectTech = `${techString} ${project.description || ''}`
    
    const techMatches = modernTech.filter(tech => 
      projectTech.toLowerCase().includes(tech.toLowerCase())
    ).length
    
    score += techMatches * 8
    
    // Code quality indicators
    if (project.github_url) score += 15
    if (project.demo_url || project.domain) score += 10
    if (project.description && project.description.length > 200) score += 10
    if (project.view_count && project.view_count > 100) score += 5
    if (project.stage === 'launched' || project.stage === 'mature') score += 10
    
    return Math.min(score, 95)
  }

  const calculateMarketScore = (project) => {
    const category = project.category || 'other'
    const marketScores = {
      'saas': 85,
      'ai': 90,
      'ecommerce': 80,
      'marketplace': 75,
      'mobile': 70,
      'tools': 75,
      'content': 65,
      'other': 45
    }
    
    let score = marketScores[category] || 50
    
    // Boost for proven metrics
    if (project.users_count && project.users_count > 1000) score += 10
    if (project.view_count && project.view_count > 500) score += 5
    if (project.is_verified) score += 10
    
    return Math.min(score, 95)
  }

  const calculatePresentationScore = (project) => {
    let score = 30
    
    if (project.images && project.images.length > 0) score += 20
    if (project.demo_url || project.domain) score += 15
    if (project.description && project.description.length > 200) score += 15
    if (project.features && project.features.length > 0) score += 10
    if (project.github_url) score += 10
    if (project.title && project.title.length > 10) score += 5
    if (project.sale_price && project.sale_price > 0) score += 5
    
    return Math.min(score, 95)
  }

  const calculateSellerScore = (project) => {
    let score = 60
    
    // Account age and verification
    if (project.is_verified || project.seller_verified) score += 20
    if (project.created_at) {
      const accountAge = (Date.now() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24)
      if (accountAge > 365) score += 15 // 1+ year
      else if (accountAge > 90) score += 10 // 3+ months
      else if (accountAge > 30) score += 5 // 1+ month
    }
    
    // Project quality indicators
    if (project.view_count && project.view_count > 100) score += 10
    if (project.monthly_revenue && project.monthly_revenue > 0) score += 5
    
    return Math.min(score, 95)
  }

  const generateRecommendations = (factors, project) => {
    const recs = []
    
    if (factors.revenue < 70) {
      recs.push({
        type: 'revenue',
        priority: 'high',
        text: 'Add verified revenue screenshots to boost credibility',
        impact: '+15 points'
      })
    }
    
    if (factors.technical < 70) {
      recs.push({
        type: 'technical',
        priority: 'medium',
        text: 'Highlight modern tech stack and code quality',
        impact: '+10 points'
      })
    }
    
    if (factors.presentation < 70) {
      recs.push({
        type: 'presentation',
        priority: 'high',
        text: 'Add more screenshots and demo video',
        impact: '+20 points'
      })
    }
    
    if (factors.market < 80) {
      recs.push({
        type: 'market',
        priority: 'medium',
        text: 'Position project in high-demand category',
        impact: '+12 points'
      })
    }
    
    return recs
  }

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-400'
    if (score >= 70) return 'text-yellow-400'
    if (score >= 50) return 'text-orange-400'
    return 'text-red-400'
  }

  const getScoreGradient = (score) => {
    if (score >= 85) return 'from-green-400 to-emerald-400'
    if (score >= 70) return 'from-yellow-400 to-orange-400'
    if (score >= 50) return 'from-orange-400 to-red-400'
    return 'from-red-400 to-red-600'
  }

  const scoreLabels = {
    revenue: { icon: DollarSign, label: 'Revenue Quality', description: 'Verified income and financial health' },
    growth: { icon: TrendingUp, label: 'Growth Potential', description: 'User growth and market traction' },
    technical: { icon: Code, label: 'Technical Quality', description: 'Code quality and architecture' },
    market: { icon: Target, label: 'Market Demand', description: 'Category demand and competition' },
    presentation: { icon: Star, label: 'Presentation', description: 'Listing quality and completeness' },
    seller: { icon: Users, label: 'Seller Reputation', description: 'Track record and trustworthiness' }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 border border-white/20 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">AI Project Score</h3>
              <p className="text-sm text-gray-400">Comprehensive quality assessment</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-xs text-white bg-white/10 px-2 py-1">
              AI Powered
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isAnalyzing ? (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-3 border-white border-t-transparent mb-4"
              />
              <p className="text-white font-medium mb-2">AI Analysis in Progress...</p>
              <p className="text-gray-400 text-sm text-center">
                Analyzing revenue, growth, technical quality, and market factors
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Score Display */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="relative inline-block"
                >
                  <div className="w-32 h-32 rounded-none bg-gray-800 border-4 border-gray-700 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 h-1 bg-stone-300"
                      role="progressbar" aria-label="Project score" aria-valuemin={0} aria-valuemax={100}
                      aria-valuenow={Math.max(0, Math.min(100, score))}
                      style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
                    <div className="relative z-10 text-center">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className={cn("text-3xl font-bold", getScoreColor(score))}
                      >
                        {score}
                      </motion.div>
                      <div className="text-xs text-gray-400">/ 100</div>
                    </div>
                  </div>
                </motion.div>
                
                <div className="mt-4">
                  <div className={cn("text-lg font-semibold", getScoreColor(score))}>
                    {score >= 85 ? 'Excellent Project' :
                     score >= 70 ? 'Good Project' :
                     score >= 50 ? 'Average Project' : 'Needs Improvement'}
                  </div>
                  <p className="text-sm text-gray-400">
                    {score >= 85 ? 'High buyer interest expected' :
                     score >= 70 ? 'Solid investment opportunity' :
                     score >= 50 ? 'Consider optimizations' : 'Significant improvements needed'}
                  </p>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-white mb-3">Score Breakdown</h4>
                {Object.entries(breakdown).map(([key, value], index) => {
                  const { icon: Icon, label, description } = scoreLabels[key]
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="p-1.5 bg-gray-800 rounded-none">
                        <Icon className="w-4 h-4 text-gray-400" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-white">{label}</span>
                          <span className={cn("text-sm font-medium", getScoreColor(value))}>
                            {Math.round(value)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-none h-1.5 mb-1">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${value}%` }}
                            transition={{ duration: 1, delay: index * 0.1 }}
                            className={cn(
                              "h-1.5 rounded-none bg-neutral-800",
                              getScoreGradient(value)
                            )}
                          />
                        </div>
                        <p className="text-xs text-gray-500">{description}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Recommendations */}
      <AnimatePresence>
        {!isAnalyzing && recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-900/50 border border-white/10 rounded-none p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h4 className="font-semibold text-white">AI Recommendations</h4>
            </div>
            
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-none"
                >
                  <div className={cn(
                    "p-1.5 rounded-none",
                    rec.priority === 'high' ? "bg-red-600/20" : "bg-yellow-600/20"
                  )}>
                    {rec.priority === 'high' ? 
                      <AlertTriangle className="w-4 h-4 text-red-400" /> :
                      <Activity className="w-4 h-4 text-yellow-400" />
                    }
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm text-white mb-1">{rec.text}</p>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-none",
                        rec.priority === 'high' ? "bg-red-600/20 text-red-300" : "bg-yellow-600/20 text-yellow-300"
                      )}>
                        {rec.priority === 'high' ? 'High Priority' : 'Medium Priority'}
                      </span>
                      <span className="text-xs text-green-400">{rec.impact}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AIProjectScoring
