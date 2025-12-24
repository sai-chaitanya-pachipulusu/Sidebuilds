const db = require('../db');

class EnhancedAIService {
  constructor() {
    // Try to load OpenAI module if available
    let OpenAI = null;
    try {
      OpenAI = require('openai');
    } catch (error) {
      console.log('[AI Service] OpenAI module not installed - using mock responses');
    }
    
    this.openai = (OpenAI && process.env.OPENAI_API_KEY) ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;
    
    this.isAIEnabled = !!this.openai;
    console.log(`[AI Service] ${this.isAIEnabled ? 'Enabled' : 'Disabled'} - ${this.isAIEnabled ? 'Using OpenAI GPT-4' : 'Using enhanced mock responses'}`);
  }

  async analyzeProject(projectData) {
    try {
      if (this.isAIEnabled) {
        return await this.realAIAnalysis(projectData);
      } else {
        return await this.mockAIAnalysis(projectData);
      }
    } catch (error) {
      console.error('[AI Service] Analysis failed:', error);
      // Fallback to mock analysis if AI fails
      return await this.mockAIAnalysis(projectData);
    }
  }

  async realAIAnalysis(projectData) {
    const prompt = this.buildAnalysisPrompt(projectData);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert SaaS and side project valuation analyst. Analyze projects for market value, growth potential, technical quality, and investment risk. Respond with structured JSON data.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const aiResponse = response.choices[0].message.content;
    return this.parseAIResponse(aiResponse, projectData);
  }

  buildAnalysisPrompt(projectData) {
    return `
Analyze this side project for comprehensive valuation and scoring:

PROJECT DETAILS:
- Name: ${projectData.name || 'Unnamed Project'}
- Description: ${projectData.description || 'No description'}
- Category: ${projectData.category || 'Unknown'}
- Monthly Revenue: $${projectData.monthly_revenue || 0}
- Tech Stack: ${Array.isArray(projectData.tech_stack) ? projectData.tech_stack.join(', ') : projectData.tech_stack || 'Not specified'}
- Sale Price: $${projectData.sale_price || 0}
- Stage: ${projectData.stage || 'Unknown'}
- Domain: ${projectData.domain || 'No domain'}
- GitHub: ${projectData.github_url ? 'Available' : 'Not available'}

ANALYSIS REQUIREMENTS:
1. Overall Score (0-100): Comprehensive project quality score
2. Valuation: Estimated market value with confidence level
3. Factor Scores (0-100 each):
   - Revenue Quality: Sustainability and growth potential
   - Technical Quality: Code quality, architecture, scalability
   - Market Demand: Category demand and competition
   - Growth Potential: Scalability and expansion opportunities
   - Presentation Quality: Documentation, branding, completeness
   - Seller Credibility: Based on available information

4. Key Insights: 3-5 bullet points about strengths and weaknesses
5. Recommendations: 3-5 actionable improvement suggestions
6. Risk Assessment: Primary risks and mitigation strategies
7. Market Comparison: How it compares to similar projects

Respond with valid JSON in this exact format:
{
  "overall_score": number,
  "confidence_level": number,
  "estimated_value": number,
  "factor_scores": {
    "revenue": number,
    "technical": number,
    "market": number,
    "growth": number,
    "presentation": number,
    "seller": number
  },
  "insights": [string],
  "recommendations": [string],
  "risks": [string],
  "market_comparison": string,
  "reasoning": string
}
`;
  }

  parseAIResponse(aiResponse, projectData) {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(aiResponse);
      
      // Validate and sanitize the response
      return {
        overall_score: Math.max(0, Math.min(100, parsed.overall_score || 50)),
        confidence_level: Math.max(0, Math.min(100, parsed.confidence_level || 70)),
        estimated_value: Math.max(0, parsed.estimated_value || projectData.sale_price || 10000),
        factor_scores: {
          revenue: Math.max(0, Math.min(100, parsed.factor_scores?.revenue || 50)),
          technical: Math.max(0, Math.min(100, parsed.factor_scores?.technical || 60)),
          market: Math.max(0, Math.min(100, parsed.factor_scores?.market || 55)),
          growth: Math.max(0, Math.min(100, parsed.factor_scores?.growth || 45)),
          presentation: Math.max(0, Math.min(100, parsed.factor_scores?.presentation || 50)),
          seller: Math.max(0, Math.min(100, parsed.factor_scores?.seller || 70))
        },
        insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 5) : [
          'AI analysis completed',
          'Multiple factors considered',
          'Market conditions evaluated'
        ],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 5) : [
          'Improve project documentation',
          'Enhance revenue streams',
          'Optimize technical architecture'
        ],
        risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 3) : [
          'Market competition',
          'Technical debt',
          'Revenue sustainability'
        ],
        market_comparison: parsed.market_comparison || 'Competitive positioning analysis completed',
        reasoning: parsed.reasoning || 'Comprehensive analysis based on multiple factors',
        analysis_type: 'ai_powered',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[AI Service] Failed to parse AI response:', error);
      // Return fallback analysis
      return this.mockAIAnalysis(projectData);
    }
  }

  async mockAIAnalysis(projectData) {
    // Sophisticated mock analysis that simulates real AI
    const revenueScore = this.calculateRevenueScore(projectData);
    const techScore = this.calculateTechScore(projectData);
    const marketScore = this.calculateMarketScore(projectData);
    const growthScore = this.calculateGrowthScore(projectData);
    const presentationScore = this.calculatePresentationScore(projectData);
    const sellerScore = this.calculateSellerScore(projectData);

    const overallScore = Math.round(
      (revenueScore * 0.25) +
      (techScore * 0.20) +
      (marketScore * 0.15) +
      (growthScore * 0.15) +
      (presentationScore * 0.15) +
      (sellerScore * 0.10)
    );

    const estimatedValue = this.calculateEstimatedValue(projectData, overallScore);

    return {
      overall_score: overallScore,
      confidence_level: 85,
      estimated_value: estimatedValue,
      factor_scores: {
        revenue: revenueScore,
        technical: techScore,
        market: marketScore,
        growth: growthScore,
        presentation: presentationScore,
        seller: sellerScore
      },
      insights: this.generateInsights(projectData, overallScore),
      recommendations: this.generateRecommendations(projectData, {
        revenue: revenueScore,
        technical: techScore,
        market: marketScore,
        growth: growthScore,
        presentation: presentationScore,
        seller: sellerScore
      }),
      risks: this.generateRisks(projectData),
      market_comparison: this.generateMarketComparison(projectData),
      reasoning: this.generateReasoning(projectData, overallScore),
      analysis_type: 'enhanced_mock',
      timestamp: new Date().toISOString()
    };
  }

  calculateRevenueScore(project) {
    const revenue = parseFloat(project.monthly_revenue) || 0;
    if (revenue === 0) return 30;
    if (revenue < 100) return 40;
    if (revenue < 500) return 55;
    if (revenue < 1000) return 70;
    if (revenue < 5000) return 85;
    return 95;
  }

  calculateTechScore(project) {
    let score = 50;
    
    // Tech stack bonus
    if (project.tech_stack && Array.isArray(project.tech_stack)) {
      const modernTech = ['React', 'Vue', 'Angular', 'Node.js', 'Python', 'TypeScript', 'Next.js'];
      const hasModernTech = project.tech_stack.some(tech => 
        modernTech.some(modern => tech.toLowerCase().includes(modern.toLowerCase()))
      );
      if (hasModernTech) score += 15;
    }
    
    // GitHub bonus
    if (project.github_url) score += 10;
    
    // Domain bonus
    if (project.domain) score += 10;
    
    // Stage bonus
    if (project.stage === 'launched') score += 15;
    else if (project.stage === 'mvp') score += 10;
    
    return Math.min(95, score);
  }

  calculateMarketScore(project) {
    const categoryScores = {
      'saas': 85,
      'ecommerce': 75,
      'mobile-app': 70,
      'ai': 90,
      'fintech': 80,
      'productivity': 75,
      'social': 65,
      'gaming': 60
    };
    
    const category = project.category?.toLowerCase() || 'other';
    return categoryScores[category] || 55;
  }

  calculateGrowthScore(project) {
    let score = 45;
    
    // Revenue growth indicator
    const revenue = parseFloat(project.monthly_revenue) || 0;
    if (revenue > 1000) score += 20;
    else if (revenue > 500) score += 15;
    else if (revenue > 100) score += 10;
    
    // Market category growth
    const growthCategories = ['ai', 'fintech', 'saas'];
    if (growthCategories.includes(project.category?.toLowerCase())) {
      score += 15;
    }
    
    // Stage indicator
    if (project.stage === 'launched') score += 10;
    
    return Math.min(90, score);
  }

  calculatePresentationScore(project) {
    let score = 40;
    
    if (project.description && project.description.length > 100) score += 15;
    if (project.domain) score += 10;
    if (project.github_url) score += 10;
    if (project.tech_stack && project.tech_stack.length > 0) score += 10;
    if (project.name && project.name.length > 5) score += 10;
    
    return Math.min(95, score);
  }

  calculateSellerScore(project) {
    // Base seller credibility score
    let score = 70;
    
    // Bonus for complete information
    if (project.contact_email) score += 5;
    if (project.github_url) score += 10;
    if (project.domain) score += 10;
    
    return Math.min(95, score);
  }

  calculateEstimatedValue(project, overallScore) {
    const currentPrice = parseFloat(project.sale_price) || 10000;
    const revenue = parseFloat(project.monthly_revenue) || 0;
    
    // Revenue multiple approach
    let revenueMultiple = 0;
    if (revenue > 0) {
      if (overallScore > 80) revenueMultiple = 36; // 3 years
      else if (overallScore > 60) revenueMultiple = 24; // 2 years
      else revenueMultiple = 12; // 1 year
    }
    
    const revenueBasedValue = revenue * revenueMultiple;
    
    // Score-based adjustment
    const scoreMultiplier = overallScore / 100;
    const adjustedCurrentPrice = currentPrice * (0.8 + scoreMultiplier * 0.4);
    
    // Take the higher of the two approaches
    const estimatedValue = Math.max(revenueBasedValue, adjustedCurrentPrice);
    
    // Ensure reasonable bounds
    return Math.max(5000, Math.min(500000, estimatedValue));
  }

  generateInsights(project, score) {
    const insights = [];
    
    if (score > 80) {
      insights.push('High-quality project with strong market potential');
    } else if (score > 60) {
      insights.push('Solid project with room for improvement');
    } else {
      insights.push('Project needs significant enhancement before sale');
    }
    
    const revenue = parseFloat(project.monthly_revenue) || 0;
    if (revenue > 1000) {
      insights.push('Strong revenue generation indicates market validation');
    } else if (revenue > 0) {
      insights.push('Early revenue shows promise but needs scaling');
    } else {
      insights.push('No current revenue - focus on monetization strategy');
    }
    
    if (project.tech_stack && project.tech_stack.length > 0) {
      insights.push('Modern tech stack supports scalability');
    }
    
    return insights.slice(0, 4);
  }

  generateRecommendations(project, scores) {
    const recommendations = [];
    
    if (scores.revenue < 60) {
      recommendations.push('Implement or improve monetization strategies');
    }
    
    if (scores.technical < 70) {
      recommendations.push('Enhance technical documentation and code quality');
    }
    
    if (scores.presentation < 70) {
      recommendations.push('Improve project presentation and marketing materials');
    }
    
    if (scores.growth < 60) {
      recommendations.push('Develop clear growth and scaling strategies');
    }
    
    if (!project.domain) {
      recommendations.push('Secure a professional domain name');
    }
    
    return recommendations.slice(0, 4);
  }

  generateRisks(project) {
    const risks = [];
    
    const revenue = parseFloat(project.monthly_revenue) || 0;
    if (revenue === 0) {
      risks.push('No current revenue stream - monetization risk');
    }
    
    if (!project.github_url) {
      risks.push('No code repository - technical due diligence risk');
    }
    
    risks.push('Market competition and changing trends');
    
    return risks.slice(0, 3);
  }

  generateMarketComparison(project) {
    const category = project.category?.toLowerCase() || 'general';
    const comparisons = {
      'saas': 'SaaS projects typically sell for 2-4x annual revenue',
      'ecommerce': 'E-commerce projects average 1.5-3x annual revenue',
      'mobile-app': 'Mobile apps vary widely, 1-5x annual revenue based on user base',
      'ai': 'AI projects command premium valuations, 3-6x annual revenue',
      'fintech': 'FinTech projects average 2-4x annual revenue with regulatory considerations'
    };
    
    return comparisons[category] || 'Market comparisons vary by category and execution quality';
  }

  generateReasoning(project, score) {
    return `Analysis based on revenue potential (${project.monthly_revenue || 0}/month), ` +
           `technical quality, market demand for ${project.category || 'general'} projects, ` +
           `and overall presentation. Score of ${score}/100 reflects current market positioning.`;
  }

  async getMarketIntelligence() {
    try {
      // Get real market data from database
      const marketData = await this.getMarketDataFromDB();
      
      if (this.isAIEnabled) {
        return await this.enhanceMarketDataWithAI(marketData);
      } else {
        return this.generateMockMarketIntelligence(marketData);
      }
    } catch (error) {
      console.error('[AI Service] Market intelligence failed:', error);
      return this.generateMockMarketIntelligence();
    }
  }

  async getMarketDataFromDB() {
    // PostgreSQL-compatible query only
    const query = `
      SELECT 
        category,
        COUNT(*) as project_count,
        AVG(sale_price) as avg_price,
        AVG(monthly_revenue) as avg_revenue,
        MAX(created_at) as latest_listing
      FROM projects 
      WHERE is_for_sale = true 
        AND created_at > NOW() - INTERVAL '90 days'
      GROUP BY category
      ORDER BY project_count DESC
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  generateMockMarketIntelligence() {
    const categories = [
      { name: 'AI/ML', growth: '+156%', avgPrice: 45000, demand: 'Very High', projects: 89 },
      { name: 'SaaS', growth: '+67%', avgPrice: 28000, demand: 'High', projects: 234 },
      { name: 'E-commerce', growth: '+34%', avgPrice: 22000, demand: 'High', projects: 156 },
      { name: 'FinTech', growth: '+89%', avgPrice: 32000, demand: 'High', projects: 78 },
      { name: 'Mobile Apps', growth: '+23%', avgPrice: 18000, demand: 'Medium', projects: 123 }
    ];

    return {
      trending_categories: categories.slice(0, 3),
      market_overview: {
        total_projects: 1247,
        avg_sale_price: 28500,
        total_volume: 2850000,
        active_buyers: 892
      },
      insights: [
        'AI/ML projects showing exceptional growth and premium valuations',
        'SaaS remains the most popular category with steady demand',
        'Mobile-first projects gaining traction in emerging markets'
      ],
      predictions: [
        'AI integration will become standard across all categories',
        'Revenue-generating projects will command higher multiples',
        'Technical documentation quality increasingly important'
      ]
    };
  }

  async storeAnalysis(projectId, analysis) {
    try {
      const query = `
        INSERT INTO project_ai_analyses (
          project_id, 
          overall_score, 
          confidence_level, 
          estimated_value,
          factor_scores,
          insights,
          recommendations,
          risks,
          analysis_type,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (project_id) 
        DO UPDATE SET
          overall_score = EXCLUDED.overall_score,
          confidence_level = EXCLUDED.confidence_level,
          estimated_value = EXCLUDED.estimated_value,
          factor_scores = EXCLUDED.factor_scores,
          insights = EXCLUDED.insights,
          recommendations = EXCLUDED.recommendations,
          risks = EXCLUDED.risks,
          analysis_type = EXCLUDED.analysis_type,
          updated_at = CURRENT_TIMESTAMP
      `;

      await db.query(query, [
        projectId,
        analysis.overall_score,
        analysis.confidence_level,
        analysis.estimated_value,
        JSON.stringify(analysis.factor_scores),
        JSON.stringify(analysis.insights),
        JSON.stringify(analysis.recommendations),
        JSON.stringify(analysis.risks),
        analysis.analysis_type,
        new Date()
      ]);

      console.log(`[AI Service] Analysis stored for project ${projectId}`);
    } catch (error) {
      console.error('[AI Service] Failed to store analysis:', error);
    }
  }

  async getStoredAnalysis(projectId) {
    try {
      const query = `
        SELECT * FROM project_ai_analyses 
        WHERE project_id = $1 
        ORDER BY updated_at DESC 
        LIMIT 1
      `;
      
      const result = await db.query(query, [projectId]);
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          overall_score: row.overall_score,
          confidence_level: row.confidence_level,
          estimated_value: row.estimated_value,
          factor_scores: row.factor_scores,
          insights: row.insights,
          recommendations: row.recommendations,
          risks: row.risks,
          analysis_type: row.analysis_type,
          timestamp: row.updated_at
        };
      }
      
      return null;
    } catch (error) {
      console.error('[AI Service] Failed to get stored analysis:', error);
      return null;
    }
  }
}

module.exports = new EnhancedAIService();