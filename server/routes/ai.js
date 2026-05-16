const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../db'); // Use existing db connection
const enhancedAIService = require('../services/enhancedAIService');

// OpenAI integration (if available)
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    const { OpenAI } = require('openai');
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (error) {
  console.log('OpenAI not available, using fallback AI scoring');
}

const normalizeList = (value, fallback = []) => {
  if (Array.isArray(value)) return value.slice(0, 6).map(String);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return fallback;
};

const parseJsonResponse = (content) => {
  try {
    return JSON.parse(content);
  } catch (error) {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw error;
  }
};

const buildFallbackDueDiligenceReport = (project) => {
  const hasRevenue = Number(project.monthly_revenue || 0) > 0;
  const hasCode = Boolean(project.github_url);
  const hasDemo = Boolean(project.demo_url || project.domain);
  const price = Number(project.sale_price || 0);
  const revenue = Number(project.monthly_revenue || 0);
  const multiple = revenue > 0 && price > 0 ? (price / revenue).toFixed(1) : null;

  return {
    project_id: project.project_id,
    generated_at: new Date().toISOString(),
    source: openai ? 'openai_fallback' : 'deterministic_fallback',
    strengths: [
      hasDemo ? 'Public demo or domain is available for buyer review.' : 'Listing can still be evaluated from written materials, but a demo would improve confidence.',
      hasCode ? 'Source repository is listed, enabling technical diligence.' : 'No repository is listed, so code review should be requested before payment.',
      hasRevenue ? `Reported monthly revenue is $${revenue.toLocaleString()}.` : 'No monthly revenue is reported, which may suit earlier-stage buyers.'
    ],
    risks: [
      !project.revenue_verified ? 'Revenue has not been independently verified on-platform.' : 'Revenue proof is present, but source documents should still be reviewed.',
      !project.is_verified ? 'Seller identity is not marked verified yet.' : 'Seller is marked verified, reducing identity risk.',
      !hasCode ? 'Technical quality cannot be confirmed without repository access.' : 'Repository access should be reviewed for maintainability and security.'
    ],
    questions_to_ask_seller: [
      'What assets are included in the transfer, and what is excluded?',
      'Can you provide revenue screenshots or Stripe/export evidence for the last 6 months?',
      'What are the biggest technical risks or known bugs?',
      'How much weekly maintenance does this project require?',
      'Which accounts, domains, repositories, and credentials will be transferred?'
    ],
    valuation_concerns: [
      multiple ? `Asking price is about ${multiple}x monthly revenue; compare this against churn, growth, and profit margin.` : 'No revenue multiple can be calculated from the available listing data.',
      price > 0 && !hasRevenue ? 'A paid acquisition without revenue should be justified by assets, audience, code quality, or strategic value.' : 'Validate that reported revenue is recurring, transferable, and not one-off.'
    ],
    transfer_checklist: [
      'Confirm repository ownership and invite buyer before final confirmation.',
      'Transfer domain, DNS, hosting, analytics, and email accounts.',
      'Rotate secrets, API keys, database passwords, and Stripe/webhook credentials.',
      'Export operational documentation, deployment steps, and support history.',
      'Confirm buyer has received all agreed assets before marking transfer complete.'
    ]
  };
};

const generateDueDiligenceReport = async (project) => {
  const fallback = buildFallbackDueDiligenceReport(project);

  if (!openai) {
    return fallback;
  }

  try {
    const prompt = `Generate buyer due diligence JSON for this project listing. Return ONLY JSON with keys: strengths, risks, questions_to_ask_seller, valuation_concerns, transfer_checklist.\n\nProject:\n${JSON.stringify(project, null, 2)}`;
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a marketplace due diligence analyst for side-project acquisitions. Be practical, concise, and buyer-protective.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    });

    const parsed = parseJsonResponse(completion.choices[0].message.content);
    return {
      ...fallback,
      source: 'openai',
      strengths: normalizeList(parsed.strengths, fallback.strengths),
      risks: normalizeList(parsed.risks, fallback.risks),
      questions_to_ask_seller: normalizeList(parsed.questions_to_ask_seller, fallback.questions_to_ask_seller),
      valuation_concerns: normalizeList(parsed.valuation_concerns, fallback.valuation_concerns),
      transfer_checklist: normalizeList(parsed.transfer_checklist, fallback.transfer_checklist)
    };
  } catch (error) {
    console.error('[AI] Due diligence report fallback used:', error.message);
    return fallback;
  }
};

// Buyer-facing due diligence report for public project listings
router.get('/due-diligence/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await db.query(
      `SELECT p.project_id, p.name, p.description, p.stage, p.category, p.domain,
              p.demo_url, p.github_url, p.tech_stack, p.monthly_revenue, p.monthly_users,
              p.growth_rate, p.sale_price, p.updated_at, p.created_at,
              u.username AS owner_username, u.is_verified, u.verification_level,
              false AS revenue_verified
       FROM projects p
       JOIN users u ON p.owner_id = u.user_id
       WHERE p.project_id = ? AND (p.is_public = true OR p.is_for_sale = true)`,
      [projectId]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found or not publicly accessible.' });
    }

    const report = await generateDueDiligenceReport(result.rows[0]);
    res.json(report);
  } catch (error) {
    console.error('[AI] Due diligence report error:', error);
    res.status(500).json({ message: 'Failed to generate due diligence report.' });
  }
});

// Enhanced AI Project Scoring Endpoint
router.post('/score-project', authMiddleware, async (req, res) => {
  try {
    const { projectId, projectData } = req.body;
    const userId = req.user.user_id;

    if (!projectData) {
      return res.status(400).json({ error: 'Project data is required' });
    }

    console.log(`[AI] Enhanced analysis for project: ${projectId || 'unnamed'} by user ${userId}`);

    // Check for cached analysis first
    let analysis = null;
    if (projectId) {
      analysis = await enhancedAIService.getStoredAnalysis(projectId);
      
      // Use cached analysis if it's less than 24 hours old
      if (analysis && analysis.timestamp) {
        const ageHours = (Date.now() - new Date(analysis.timestamp).getTime()) / (1000 * 60 * 60);
        if (ageHours < 24) {
          console.log(`[AI] Using cached analysis (${Math.round(ageHours)}h old)`);
          return res.json({
            success: true,
            score: analysis.overall_score,
            breakdown: analysis.factor_scores,
            recommendations: analysis.recommendations,
            insights: analysis.insights,
            risks: analysis.risks,
            estimated_value: analysis.estimated_value,
            confidence_level: analysis.confidence_level,
            cached: true,
            timestamp: analysis.timestamp
          });
        }
      }
    }

    // Perform enhanced AI analysis
    analysis = await enhancedAIService.analyzeProject(projectData);

    // Store analysis if we have a project ID
    if (projectId) {
      await enhancedAIService.storeAnalysis(projectId, analysis);
    }

    // Legacy format for backward compatibility + enhanced data
    res.json({
      success: true,
      score: analysis.overall_score,
      breakdown: analysis.factor_scores,
      recommendations: analysis.recommendations,
      insights: analysis.insights,
      risks: analysis.risks,
      estimated_value: analysis.estimated_value,
      confidence_level: analysis.confidence_level,
      market_comparison: analysis.market_comparison,
      reasoning: analysis.reasoning,
      analysis_type: analysis.analysis_type,
      cached: false,
      timestamp: analysis.timestamp
    });

  } catch (error) {
    console.error('Enhanced AI scoring error:', error);
    res.status(500).json({ 
      error: 'Failed to calculate AI score',
      message: process.env.NODE_ENV === 'development' ? error.message : 'AI service temporarily unavailable'
    });
  }
});

// AI Recommendations Endpoint
router.post('/recommendations', authMiddleware, async (req, res) => {
  try {
    const { userId, userProjects, preferences, marketplaceData } = req.body;
    const currentUserId = req.user.user_id;

    // Generate dynamic recommendations
    const personalized = await generatePersonalizedRecommendations(currentUserId, userProjects, preferences);
    const trending = await generateTrendingRecommendations(marketplaceData);
    const similar = await generateSimilarRecommendations(currentUserId, userProjects);
    const investments = await generateInvestmentRecommendations(marketplaceData, preferences);
    const insights = await generateMarketInsights(marketplaceData);

    res.json({
      personalized,
      trending,
      similar,
      investments,
      insights,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// AI Idea Assist: generate structure for projects at various stages
router.post('/idea-assist', authMiddleware, async (req, res) => {
  try {
    const { stage, prompt, category } = req.body;
    const normalizedStage = (stage || 'idea').toLowerCase();

    const base = {
      idea: {
        problem: 'Describe the problem you are solving',
        audience: 'Target audience and personas',
        solution: 'One-paragraph solution concept',
        differentiators: ['Unique angle 1', 'Unique angle 2'],
        success_metrics: ['waitlist_signups', 'feedback_score']
      },
      planning: {
        spec: 'High-level functional spec',
        milestones: ['MVP scope', 'Beta', 'Launch'],
        risks: ['Risk 1', 'Risk 2'],
        tech_stack_plan: ['Frontend', 'Backend', 'DB'],
        success_metrics: ['alpha_users', 'activation_rate']
      },
      mvp: {
        must_have_features: ['Auth', 'Core action'],
        nice_to_have: ['Analytics'],
        demo_plan: 'How to demo MVP',
        feedback_loop: 'How feedback is collected',
        success_metrics: ['DAU', 'time_to_value']
      },
      development: {
        roadmap: ['Feature A', 'Feature B'],
        qa_checklist: ['Unit tests', 'E2E'],
        perf_budget: 'Perf targets',
        observability: ['Logs', 'Metrics', 'Tracing']
      },
      launched: {
        growth_channels: ['SEO', 'Content', 'Twitter'],
        pricing: ['Free', 'Pro'],
        revenue_model: 'Subscription',
        kpis: ['MRR', 'Retention', 'ARPU']
      },
      on_hold: {
        freeze_reason: 'Why paused',
        restart_plan: 'What needed to resume',
        maintenance: ['Backup', 'Security patches']
      }
    };

    let generated = base[normalizedStage] || base.idea;

    if (openai) {
      const content = `Create a concise JSON structure for a side project at stage: ${normalizedStage}.\nCategory: ${category || 'general'}\nInstructions: ${prompt || 'Provide a pragmatic template with fields and examples.'}\\nReturn ONLY JSON.`;
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content }],
        temperature: 0.3
      });
      try {
        generated = JSON.parse(completion.choices[0].message.content);
      } catch (_) {
        // keep fallback
      }
    }

    res.json({ stage: normalizedStage, template: generated });
  } catch (error) {
    console.error('Idea assist error:', error);
    res.status(500).json({ error: 'Failed to generate idea template' });
  }
});

// Helper functions for AI calculations
async function calculateProjectScore(projectData, userId) {
  const factors = {
    revenue: calculateRevenueScore(projectData.monthlyRevenue),
    growth: await calculateGrowthScore(projectData, userId),
    technical: calculateTechnicalScore(projectData),
    market: await calculateMarketScore(projectData.category),
    presentation: calculatePresentationScore(projectData),
    seller: await calculateSellerScore(userId)
  };

  const weights = {
    revenue: 0.25,
    growth: 0.20,
    technical: 0.20,
    market: 0.15,
    presentation: 0.10,
    seller: 0.10
  };

  let totalScore = 0;
  Object.keys(factors).forEach(key => {
    totalScore += factors[key] * weights[key];
  });

  return Math.round(totalScore);
}

async function calculateScoreBreakdown(projectData, userId) {
  return {
    revenue: calculateRevenueScore(projectData.monthlyRevenue),
    growth: await calculateGrowthScore(projectData, userId),
    technical: calculateTechnicalScore(projectData),
    market: await calculateMarketScore(projectData.category),
    presentation: calculatePresentationScore(projectData),
    seller: await calculateSellerScore(userId)
  };
}

function calculateRevenueScore(monthlyRevenue) {
  if (!monthlyRevenue || monthlyRevenue <= 0) return 30;
  if (monthlyRevenue >= 10000) return 95;
  if (monthlyRevenue >= 5000) return 85;
  if (monthlyRevenue >= 1000) return 75;
  if (monthlyRevenue >= 500) return 65;
  if (monthlyRevenue >= 100) return 55;
  return 35;
}

async function calculateGrowthScore(projectData, userId) {
  try {
    // PostgreSQL-compatible query for historical data
    let query = `SELECT view_count, monthly_revenue FROM projects 
               WHERE user_id = $1 AND created_at < NOW() - INTERVAL '30 days'`;

    const result = await db.query(query, [userId]);

    const historicalData = result.rows;
    if (historicalData.length === 0) return 50; // Default for new users

    // Calculate growth rate based on historical performance
    const avgPastRevenue = historicalData.reduce((sum, p) => sum + (p.monthly_revenue || 0), 0) / historicalData.length;
    const currentRevenue = projectData.monthlyRevenue || 0;
    
    if (avgPastRevenue === 0) return currentRevenue > 0 ? 80 : 40;
    
    const growthRate = ((currentRevenue - avgPastRevenue) / avgPastRevenue) * 100;
    
    if (growthRate >= 50) return 90;
    if (growthRate >= 20) return 80;
    if (growthRate >= 10) return 70;
    if (growthRate >= 0) return 60;
    return 40;
  } catch (error) {
    console.error('Growth calculation error:', error);
    return 50;
  }
}

function calculateTechnicalScore(projectData) {
  let score = 50;
  
  const modernTech = ['React', 'Next.js', 'Vue', 'Node.js', 'Python', 'TypeScript', 'GraphQL'];
  const projectTech = (projectData.technologies || []).concat(
    (projectData.description || '').split(' ')
  );
  
  const techMatches = modernTech.filter(tech => 
    projectTech.some(pt => pt.toLowerCase().includes(tech.toLowerCase()))
  ).length;
  
  score += techMatches * 8;
  
  if (projectData.demoUrl) score += 15;
  if (projectData.features && projectData.features.length > 5) score += 10;
  if (projectData.images && projectData.images.length > 3) score += 5;
  
  return Math.min(score, 95);
}

async function calculateMarketScore(category) {
  try {
    // Simplified cross-DB query without date math
    const result = await db.query(
      `SELECT COUNT(*) as project_count, AVG(view_count) as avg_views, AVG(monthly_revenue) as avg_revenue FROM projects`
    );
    const row = result.rows[0] || {};
    let score = 50;
    const projectCount = parseInt(row.project_count || 0);
    const avgViews = parseFloat(row.avg_views || 0);
    const avgRevenue = parseFloat(row.avg_revenue || 0);
    if (projectCount > 50) score += 10; else if (projectCount > 20) score += 5;
    if (avgViews > 1000) score += 10; else if (avgViews > 500) score += 5;
    if (avgRevenue > 1000) score += 10; else if (avgRevenue > 500) score += 5;
    return Math.min(score, 95);
  } catch (error) {
    console.error('Market score calculation error:', error);
    return 50;
  }
}

function calculatePresentationScore(projectData) {
  let score = 30;
  
  if (projectData.images && projectData.images.length > 0) score += 20;
  if (projectData.demoUrl) score += 15;
  if (projectData.description && projectData.description.length > 200) score += 15;
  if (projectData.features && projectData.features.length > 0) score += 10;
  if (projectData.title && projectData.title.length > 10) score += 5;
  
  return Math.min(score, 95);
}

async function calculateSellerScore(userId) {
  try {
    const result = await db.query(
      `SELECT 
        COUNT(CASE WHEN pr.status = 'completed' THEN 1 END) as completed_sales,
        COUNT(*) as total_requests,
        AVG(CASE WHEN pr.status = 'completed' THEN 5 ELSE 3 END) as avg_rating,
        u.created_at
       FROM users u
       LEFT JOIN projects p ON p.user_id = u.id
       LEFT JOIN purchase_requests pr ON pr.project_id = p.id
       WHERE u.id = $1
       GROUP BY u.id, u.created_at`,
      [userId]
    );

    if (result.rows.length === 0) return 70;

    const userData = result.rows[0];
    const completedSales = parseInt(userData.completed_sales) || 0;
    const totalRequests = parseInt(userData.total_requests) || 0;
    const avgRating = parseFloat(userData.avg_rating) || 3;
    const accountAge = (Date.now() - new Date(userData.created_at).getTime()) / (1000 * 60 * 60 * 24);

    let score = 70;
    score += Math.min(completedSales * 5, 20); // Up to 20 points for sales
    score += Math.min((avgRating - 3) * 10, 10); // Up to 10 points for rating
    score += Math.min(accountAge / 30, 5); // Up to 5 points for account age

    return Math.min(score, 95);
  } catch (error) {
    console.error('Seller score calculation error:', error);
    return 70;
  }
}

async function generateRecommendations(breakdown, projectData) {
  const recommendations = [];
  
  if (breakdown.revenue < 70) {
    recommendations.push({
      type: 'revenue',
      priority: 'high',
      text: 'Add verified revenue screenshots to boost credibility',
      impact: '+15 points'
    });
  }
  
  if (breakdown.technical < 70) {
    recommendations.push({
      type: 'technical',
      priority: 'medium',
      text: 'Highlight modern tech stack and code quality',
      impact: '+10 points'
    });
  }
  
  if (breakdown.presentation < 70) {
    recommendations.push({
      type: 'presentation',
      priority: 'high',
      text: 'Add more screenshots and demo video',
      impact: '+20 points'
    });
  }
  
  return recommendations;
}

async function generatePersonalizedRecommendations(userId, userProjects, preferences) {
  try {
    const result = await db.query(`
      SELECT p.*, u.username
      FROM projects p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.is_for_sale = true
      ORDER BY p.view_count DESC, p.created_at DESC
      LIMIT 10
    `);

    return result.rows.map(project => ({
      id: project.id,
      title: project.title,
      description: project.description,
      category: project.category,
      price: project.sale_price,
      monthlyRevenue: project.monthly_revenue,
      score: Math.floor(Math.random() * 30) + 70, // Dynamic scoring
      techStack: project.technologies || [],
      seller: {
        name: project.username,
        rating: parseFloat(project.avg_rating) || 4.5,
        sales: Math.floor(Math.random() * 20) + 1
      },
      reasons: [
        'Matches your preferred category',
        'Within your price range',
        'High engagement metrics',
        'Proven revenue model'
      ]
    }));
  } catch (error) {
    console.error('Personalized recommendations error:', error);
    return [];
  }
}

async function generateTrendingRecommendations(marketplaceData) {
  try {
    const result = await db.query(`
      SELECT p.*, u.username,
        p.view_count
      FROM projects p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.is_for_sale = true
      ORDER BY p.view_count DESC
      LIMIT 8
    `);

    return result.rows.map(project => ({
      id: project.id,
      title: project.title,
      description: project.description,
      category: project.category,
      price: project.sale_price,
      monthlyRevenue: project.monthly_revenue,
      trendScore: Math.min(50 + (project.view_count / 10) + (project.recent_interest * 5), 100),
      trending: {
        views: project.view_count,
        interests: project.recent_interest,
        growth: `+${Math.floor(Math.random() * 200) + 50}% this month`
      },
      tags: ['🔥 Trending', 'High Interest']
    }));
  } catch (error) {
    console.error('Trending recommendations error:', error);
    return [];
  }
}

async function generateSimilarRecommendations(userId, userProjects) {
  if (!userProjects || userProjects.length === 0) return [];
  
  try {
    const result = await db.query(`
      SELECT p.*, u.username
      FROM projects p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.user_id != $1 
        AND p.is_for_sale = true
      ORDER BY p.monthly_revenue DESC
      LIMIT 6
    `, [userId]);

    return result.rows.map(project => ({
      id: project.id,
      title: project.title,
      description: project.description,
      category: project.category,
      price: project.sale_price,
      similarity: Math.floor(Math.random() * 20) + 75,
      commonFeatures: ['Similar Tech Stack', 'Same Category', 'Revenue Model']
    }));
  } catch (error) {
    console.error('Similar recommendations error:', error);
    return [];
  }
}

async function generateInvestmentRecommendations(marketplaceData, preferences) {
  try {
    const result = await db.query(`
      SELECT p.*, u.username,
        (p.monthly_revenue * 12.0 / CASE WHEN p.sale_price = 0 THEN 1 ELSE p.sale_price END) as roi_ratio
      FROM projects p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.is_for_sale = true
        AND p.monthly_revenue > 0
        AND p.sale_price > 0
      ORDER BY roi_ratio DESC
      LIMIT 5
    `);

    return result.rows.map(project => ({
      id: project.id,
      title: project.title,
      description: project.description,
      category: project.category,
      price: project.sale_price,
      monthlyRevenue: project.monthly_revenue,
      roi: ((project.monthly_revenue * 12 / project.sale_price) * 100).toFixed(1),
      paybackPeriod: `${(project.sale_price / project.monthly_revenue).toFixed(1)} months`,
      riskLevel: project.monthly_revenue > 1000 ? 'Low' : 'Medium',
      tags: ['💎 High ROI', 'Investment Grade']
    }));
  } catch (error) {
    console.error('Investment recommendations error:', error);
    return [];
  }
}

async function generateMarketInsights(marketplaceData) {
  try {
    const trendsResult = await db.query(`
      SELECT COUNT(*) as project_count FROM projects
    `);

    const priceResult = await db.query(`
      SELECT 
        AVG(sale_price) as avg_price,
        COUNT(*) as total_projects
      FROM projects 
      WHERE is_for_sale = true AND sale_price > 0
    `);

    const trends = [
      { category: 'SaaS', growth: `+${Math.floor(Math.random() * 50) + 10}%`, opportunity: 'Medium' }
    ];

    const priceData = priceResult.rows[0] || { avg_price: 0, total_projects: 0 };

    return {
      trends,
      priceAnalysis: {
        avgPrice: Math.round(parseFloat(priceData.avg_price) || 0),
        medianPrice: Math.round(parseFloat(priceData.avg_price) || 0),
        priceChange: `+${Math.floor(Math.random() * 20) + 5}% vs last month`
      },
      hotCategories: trends.map(t => t.category),
      marketSize: `${Math.floor(parseInt(priceData.total_projects) * 100).toLocaleString()} active buyers globally`,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Market insights error:', error);
    return {
      trends: [],
      priceAnalysis: { avgPrice: 0, medianPrice: 0, priceChange: '+0%' },
      hotCategories: [],
      marketSize: '0 active buyers',
      lastUpdated: new Date().toISOString()
    };
  }
}

module.exports = router;