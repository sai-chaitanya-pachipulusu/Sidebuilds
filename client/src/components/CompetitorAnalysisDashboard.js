import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  Target,
  Zap,
  Shield,
  Smartphone,
  Brain,
  Globe,
  Star,
  AlertTriangle,
  CheckCircle,
  X,
  ArrowRight,
  BarChart3,
  Users,
  DollarSign,
  Clock,
  Award,
  Lightbulb,
  Rocket,
  Eye,
  Heart,
  MessageSquare,
  Code,
  Settings,
  Sparkles,
  Command,
  Layers,
  Lock,
  Cpu,
  ChevronRight,
  Plus,
  Minus
} from 'lucide-react'
import { cn } from '../lib/utils'

const CompetitorAnalysisDashboard = ({ className }) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedCompetitor, setSelectedCompetitor] = useState('acquire')
  const [showAdvantages, setShowAdvantages] = useState(true)

  const competitors = {
    acquire: {
      name: 'Acquire.com',
      logo: '🏢',
      color: 'blue',
      focus: 'Premium SaaS ($50K-$10M)',
      strengths: [
        'Vetted businesses only',
        'Professional M&A tools',
        'No seller fees',
        'Fast 90-day timeline'
      ],
      weaknesses: [
        'Unrealistic valuations',
        'High buyer barriers ($390/year)',
        'US-only focus',
        'Limited inventory (2K listings)'
      ],
      marketShare: 25,
      avgDealSize: 250000,
      userSatisfaction: 7.2
    },
    flippa: {
      name: 'Flippa.com',
      logo: '🌐',
      color: 'green',
      focus: 'Volume play ($500-$50M+)',
      strengths: [
        'Massive scale (2M+ buyers)',
        'Low barrier to entry',
        'Established network',
        'Comprehensive tools'
      ],
      weaknesses: [
        'Quality control issues',
        'Trust issues from fraud',
        'Complex fee structure',
        'Poor success rates'
      ],
      marketShare: 45,
      avgDealSize: 15000,
      userSatisfaction: 5.8
    },
    sidebuilds: {
      name: 'SideBuilds',
      logo: '🚀',
      color: 'gray',
      focus: 'AI-powered side projects ($5K-$100K)',
      strengths: [
        'AI-native architecture',
        'Mobile-first design',
        'Developer-focused UX',
        'Real-time market intelligence'
      ],
      weaknesses: [
        'New platform',
        'Building network effects',
        'Proving market fit'
      ],
      marketShare: 0,
      avgDealSize: 25000,
      userSatisfaction: 9.1
    }
  }

  const ourAdvantages = [
    {
      id: 'ai_first',
      title: 'AI-First Architecture',
      description: 'Native machine learning in every feature',
      icon: Brain,
      impact: 'High',
      competitors_lack: ['acquire', 'flippa'],
      features: [
        'Smart project matching',
        'Automated valuation',
        'Quality assurance AI',
        'Market trend analysis'
      ]
    },
    {
      id: 'mobile_native',
      title: 'Mobile-Native Experience',
      description: 'Built for mobile-first deal making',
      icon: Smartphone,
      impact: 'High',
      competitors_lack: ['acquire', 'flippa'],
      features: [
        'Native iOS/Android apps',
        'Mobile deal negotiation',
        'Push notifications',
        'Offline capabilities'
      ]
    },
    {
      id: 'developer_ux',
      title: 'Modern Developer UX',
      description: 'Command palette, GitHub-style interface',
      icon: Command,
      impact: 'Medium',
      competitors_lack: ['acquire', 'flippa'],
      features: [
        '⌘+K navigation',
        'API-first architecture',
        'Modern tech showcase',
        'Keyboard shortcuts'
      ]
    },
    {
      id: 'global_first',
      title: 'Global-First Platform',
      description: 'Multi-currency, multi-legal from day one',
      icon: Globe,
      impact: 'High',
      competitors_lack: ['acquire'],
      features: [
        'Multi-currency support',
        'Legal frameworks',
        'Time zone intelligence',
        'Cultural adaptation'
      ]
    },
    {
      id: 'blockchain_integration',
      title: 'Blockchain Integration',
      description: 'Web3-native with smart contracts',
      icon: Lock,
      impact: 'Medium',
      competitors_lack: ['acquire', 'flippa'],
      features: [
        'Smart contract escrow',
        'NFT certificates',
        'Crypto payments',
        'Immutable records'
      ]
    },
    {
      id: 'quality_assurance',
      title: 'AI Quality Assurance',
      description: 'Automated fraud detection and verification',
      icon: Shield,
      impact: 'High',
      competitors_lack: ['flippa'],
      features: [
        'ML fraud detection',
        'Revenue verification',
        'Traffic validation',
        'Quality scoring'
      ]
    }
  ]

  const marketGaps = [
    {
      id: 'underserved_middle',
      title: 'The $5K-$50K Gap',
      description: 'No quality platform serves this range',
      opportunity: 'Huge',
      size: '$2.3B annually',
      problem: 'Flippa too noisy, Acquire too premium'
    },
    {
      id: 'mobile_experience',
      title: 'Mobile Deal Making',
      description: 'All competitors are desktop-only',
      opportunity: 'High',
      size: '70% of users mobile-first',
      problem: 'Outdated desktop-centric platforms'
    },
    {
      id: 'ai_automation',
      title: 'AI-Powered Intelligence',
      description: 'Zero meaningful AI in existing platforms',
      opportunity: 'Very High',
      size: '90% want AI features',
      problem: 'Manual processes, no automation'
    },
    {
      id: 'developer_focus',
      title: 'Developer-Native Experience',
      description: 'Generic platforms ignore dev workflow',
      opportunity: 'Medium',
      size: '45M developers globally',
      problem: 'Non-technical interfaces'
    }
  ]

  const getColorClasses = (color, type = 'text') => {
    const colors = {
      blue: type === 'text' ? 'text-blue-400' : 'bg-blue-400/10 border-blue-400/20',
      green: type === 'text' ? 'text-green-400' : 'bg-green-400/10 border-green-400/20',
      gray: type === 'text' ? 'text-white' : 'bg-white/10 border-white/20',
      red: type === 'text' ? 'text-red-400' : 'bg-red-400/10 border-red-400/20',
      yellow: type === 'text' ? 'text-yellow-400' : 'bg-yellow-400/10 border-yellow-400/20'
    }
    return colors[color] || colors.gray
  }

  const tabs = [
    { id: 'overview', name: 'Market Overview', icon: BarChart3 },
    { id: 'advantages', name: 'Our Advantages', icon: Rocket },
    { id: 'gaps', name: 'Market Gaps', icon: Target },
    { id: 'strategy', name: 'Strategy', icon: Lightbulb }
  ]

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Competitive Intelligence</h2>
          <p className="text-gray-400">Strategic analysis of market opportunities</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-green-600/20 border border-green-500/30 rounded-full text-green-300 text-sm">
            Market Leader Potential
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-900/50 p-1 rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200",
                activeTab === tab.id
                  ? "bg-white text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Competitor Cards */}
              <div className="grid md:grid-cols-3 gap-6">
                {Object.entries(competitors).map(([key, competitor]) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-6 rounded-2xl border transition-all duration-200 cursor-pointer",
                      key === 'sidebuilds' 
                        ? "bg-white/10 border-white/30 ring-2 ring-white/20"
                        : "bg-gray-900/50 border-white/10 hover:border-white/20"
                    )}
                    onClick={() => setSelectedCompetitor(key)}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="text-2xl">{competitor.logo}</div>
                      <div>
                        <h3 className="font-semibold text-white">{competitor.name}</h3>
                        <p className="text-xs text-gray-400">{competitor.focus}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-400">Market Share</span>
                          <span className="text-white">{competitor.marketShare}%</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-1.5">
                          <div 
                            className={cn("h-1.5 rounded-full", getColorClasses(competitor.color).replace('text-', 'bg-'))}
                            style={{ width: `${competitor.marketShare}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Avg Deal</span>
                        <span className="text-white">${(competitor.avgDealSize / 1000).toFixed(0)}K</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Satisfaction</span>
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            competitor.userSatisfaction >= 8 ? "text-green-400" :
                            competitor.userSatisfaction >= 6 ? "text-yellow-400" : "text-red-400"
                          )}>
                            {competitor.userSatisfaction}/10
                          </span>
                          <Star className="w-3 h-3 text-yellow-400" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Detailed Comparison */}
              <div className="bg-gray-900/30 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Detailed Comparison</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-green-400 mb-3">Strengths</h4>
                    <ul className="space-y-2">
                      {competitors[selectedCompetitor].strengths.map((strength, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-red-400 mb-3">Weaknesses</h4>
                    <ul className="space-y-2">
                      {competitors[selectedCompetitor].weaknesses.map((weakness, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-gray-300">
                          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          <span>{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advantages' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Our Competitive Advantages</h3>
                <button
                  onClick={() => setShowAdvantages(!showAdvantages)}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-lg text-sm text-gray-300 hover:text-white"
                >
                  <Eye className="w-4 h-4" />
                  {showAdvantages ? 'Hide Details' : 'Show Details'}
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {ourAdvantages.map((advantage, index) => {
                  const Icon = advantage.icon
                  return (
                    <motion.div
                      key={advantage.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gray-900/50 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors duration-200"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-white/20 rounded-lg">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-white">{advantage.title}</h4>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs",
                              advantage.impact === 'High' ? "bg-green-600/20 text-green-400" :
                              advantage.impact === 'Medium' ? "bg-yellow-600/20 text-yellow-400" :
                              "bg-gray-600/20 text-gray-400"
                            )}>
                              {advantage.impact} Impact
                            </span>
                          </div>
                          
                          <p className="text-gray-400 text-sm mb-3">{advantage.description}</p>

                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-gray-500">Competitors lack:</span>
                            {advantage.competitors_lack.map(comp => (
                              <span key={comp} className="px-2 py-0.5 bg-red-600/20 text-red-400 text-xs rounded">
                                {competitors[comp].name}
                              </span>
                            ))}
                          </div>

                          <AnimatePresence>
                            {showAdvantages && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-1"
                              >
                                {advantage.features.map((feature, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                                    <ChevronRight className="w-3 h-3" />
                                    <span>{feature}</span>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'gaps' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Market Gap Analysis</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                {marketGaps.map((gap, index) => (
                  <motion.div
                    key={gap.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-900/50 border border-white/10 rounded-2xl p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "p-2 rounded-lg",
                        gap.opportunity === 'Huge' ? "bg-green-600/20" :
                        gap.opportunity === 'Very High' ? "bg-blue-600/20" :
                        gap.opportunity === 'High' ? "bg-white/20" :
                        "bg-yellow-600/20"
                      )}>
                        <Target className={cn(
                          "w-5 h-5",
                          gap.opportunity === 'Huge' ? "text-green-400" :
                          gap.opportunity === 'Very High' ? "text-blue-400" :
                          gap.opportunity === 'High' ? "text-white" :
                          "text-yellow-400"
                        )} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-white">{gap.title}</h4>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs",
                            gap.opportunity === 'Huge' ? "bg-green-600/20 text-green-400" :
                            gap.opportunity === 'Very High' ? "bg-blue-600/20 text-blue-400" :
                            gap.opportunity === 'High' ? "bg-white/20 text-white" :
                            "bg-yellow-600/20 text-yellow-400"
                          )}>
                            {gap.opportunity}
                          </span>
                        </div>
                        
                        <p className="text-gray-400 text-sm mb-3">{gap.description}</p>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Market Size:</span>
                            <span className="text-white font-medium">{gap.size}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-red-400">Problem: </span>
                            <span className="text-gray-300">{gap.problem}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Market Opportunity Summary */}
              <div className="bg-gradient-to-br from-gray-600/10 to-blue-600/10 border border-white/50/20 rounded-2xl p-6">
                <h4 className="text-lg font-semibold text-white mb-3">Total Market Opportunity</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">$2.3B</div>
                    <div className="text-sm text-gray-400">Underserved Market</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">45M</div>
                    <div className="text-sm text-gray-400">Global Developers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">70%</div>
                    <div className="text-sm text-gray-400">Mobile-First Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">90%</div>
                    <div className="text-sm text-gray-400">Want AI Features</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'strategy' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Strategic Roadmap</h3>
              
              {/* Phase Timeline */}
              <div className="space-y-6">
                {[
                  {
                    phase: 'Phase 1: Foundation',
                    timeframe: 'Month 1-3',
                    focus: 'Core platform + AI features',
                    color: 'gray',
                    features: [
                      'AI-powered project scoring',
                      'Mobile-responsive design',
                      'Command palette (⌘+K)',
                      'Real-time notifications'
                    ]
                  },
                  {
                    phase: 'Phase 2: Differentiation',
                    timeframe: 'Month 3-6',
                    focus: 'Advanced features',
                    color: 'blue',
                    features: [
                      'Blockchain integration',
                      'Mobile native apps',
                      'AI valuation engine',
                      'Global payment support'
                    ]
                  },
                  {
                    phase: 'Phase 3: Dominance',
                    timeframe: 'Month 6-12',
                    focus: 'Market leadership',
                    color: 'green',
                    features: [
                      'AR project demos',
                      'Social trading features',
                      'Enterprise solutions',
                      'Global expansion'
                    ]
                  }
                ].map((phase, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.2 }}
                    className={cn(
                      "border border-white/10 rounded-2xl p-6",
                      phase.color === 'gray' ? "bg-white/5" :
                      phase.color === 'blue' ? "bg-blue-600/5" :
                      "bg-green-600/5"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold",
                        phase.color === 'gray' ? "bg-white" :
                        phase.color === 'blue' ? "bg-blue-600" :
                        "bg-green-600"
                      )}>
                        {index + 1}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-white">{phase.phase}</h4>
                          <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                            {phase.timeframe}
                          </span>
                        </div>
                        
                        <p className="text-gray-400 text-sm mb-4">{phase.focus}</p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {phase.features.map((feature, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                              <CheckCircle className={cn(
                                "w-4 h-4",
                                phase.color === 'gray' ? "text-white" :
                                phase.color === 'blue' ? "text-blue-400" :
                                "text-green-400"
                              )} />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default CompetitorAnalysisDashboard
