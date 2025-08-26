const OpenAI = require('openai');
const db = require('../db');

class ValuationService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async calculateProjectValue(projectId) {
    try {
      // Fetch project data
      const projectData = await this.getProjectData(projectId);
      const marketData = await this.getMarketComparables(projectData);
      const metrics = await this.calculateMetrics(projectData);

      // AI-powered analysis
      const aiAnalysis = await this.getAIValuation(projectData, marketData, metrics);

      // Calculate final valuation
      const valuation = {
        estimated_value: this.calculateEstimatedValue(metrics, aiAnalysis),
        confidence_score: aiAnalysis.confidence,
        factors: {
          revenue_multiple: metrics.revenueMultiple,
          market_comparables: marketData.avgPrice,
          growth_rate: metrics.growthRate,
          tech_stack_demand: metrics.techStackScore,
          ai_insights: aiAnalysis.insights
        }
      };

      // Store valuation
      await db.query(
        `INSERT INTO project_valuations (project_id, estimated_value, confidence_score, factors)
         VALUES ($1, $2, $3, $4)`,
        [projectId, valuation.estimated_value, valuation.confidence_score, JSON.stringify(valuation.factors)]
      );

      return valuation;
    } catch (error) {
      console.error('Valuation error:', error);
      throw error;
    }
  }

  async getAIValuation(projectData, marketData, metrics) {
    const prompt = `
      Analyze this SaaS project for valuation:
      - Monthly Revenue: $${projectData.monthly_revenue}
      - Users: ${projectData.monthly_users}
      - Tech Stack: ${projectData.tech_stack.join(', ')}
      - Market Average: $${marketData.avgPrice}
      - Growth Rate: ${metrics.growthRate}%
      
      Provide valuation insights and confidence score (0-1).
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content);
  }

  calculateEstimatedValue(metrics, aiAnalysis) {
    const baseValue = metrics.monthlyRevenue * metrics.revenueMultiple;
    const adjustedValue = baseValue * (1 + aiAnalysis.adjustmentFactor);
    return Math.round(adjustedValue);
  }
}

module.exports = new ValuationService(); 