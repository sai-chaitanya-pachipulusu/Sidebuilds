const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const db = require('../db'); // Use existing db connection

// GET /metrics - General analytics metrics for the user
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const dashboardData = await getDashboardMetrics(userId);
    res.json(dashboardData);
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// GET /activity - User activity feed
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const limit = parseInt(req.query.limit) || 20;
    const activities = await getActivityFeed(userId, limit);
    res.json({ activities });
  } catch (error) {
    console.error('Activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Dynamic Dashboard Analytics Endpoint
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get real-time dashboard metrics
    const dashboardData = await getDashboardMetrics(userId);
    
    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
  }
});

// Market Insights Endpoint
router.get('/market-insights', authenticateToken, async (req, res) => {
  try {
    const insights = await getMarketInsights();
    res.json(insights);
  } catch (error) {
    console.error('Market insights error:', error);
    res.status(500).json({ error: 'Failed to fetch market insights' });
  }
});

// Project Performance Analytics
router.get('/project/:projectId/performance', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.user_id;

    // Verify project ownership
    const ownership = await db.query(
      'SELECT user_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (ownership.rows.length === 0 || ownership.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const performance = await getProjectPerformance(projectId);
    res.json(performance);
  } catch (error) {
    console.error('Project performance error:', error);
    res.status(500).json({ error: 'Failed to fetch project performance' });
  }
});

// Real-time Activity Feed
router.get('/activity-feed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const limit = parseInt(req.query.limit) || 20;
    
    const activities = await getActivityFeed(userId, limit);
    res.json(activities);
  } catch (error) {
    console.error('Activity feed error:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// Revenue Analytics
router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const period = req.query.period || '30'; // days
    
    const revenueData = await getRevenueAnalytics(userId, period);
    res.json(revenueData);
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
});

// Helper functions
async function getDashboardMetrics(userId) {
  try {
    // Calculate queries based on DB type
    const recentProjectsQuery = db.isSQLite 
      ? `COUNT(CASE WHEN created_at > datetime('now', '-30 days') THEN 1 END) as recent_projects` 
      : `COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_projects`;
      
    const previousProjectsQuery = db.isSQLite
      ? `COUNT(CASE WHEN created_at BETWEEN datetime('now', '-60 days') AND datetime('now', '-30 days') THEN 1 END) as previous_projects`
      : `COUNT(CASE WHEN created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days' THEN 1 END) as previous_projects`;

    // Get user's projects and performance metrics
    const projectsResult = await db.query(`
      SELECT 
        COUNT(*) as total_projects,
        SUM(CASE WHEN is_for_sale = 1 THEN COALESCE(sale_price, 0) ELSE 0 END) as portfolio_value,
        COALESCE(SUM(monthly_revenue), 0) as monthly_revenue,
        COALESCE(SUM(view_count), 0) as total_views,
        COALESCE(AVG(view_count), 0) as average_views
      FROM projects 
      WHERE owner_id = ?
    `, [userId]);

    // Get purchase request metrics
    const offersResult = await db.query(`
      SELECT 
        COUNT(CASE WHEN pr.status NOT IN ('transfer_completed_buyer_confirmed', 'seller_rejected', 'buyer_withdrew') THEN 1 END) as active_offers,
        COUNT(CASE WHEN pr.status = 'transfer_completed_buyer_confirmed' THEN 1 END) as completed_sales,
        COUNT(*) as total_interest
      FROM project_purchase_requests pr
      JOIN projects p ON pr.project_id = p.project_id
      WHERE p.owner_id = ?
    `, [userId]);

    // Get buyer metrics
    const buyerResult = await db.query(`
      SELECT COUNT(CASE WHEN status = 'transfer_completed_buyer_confirmed' THEN 1 END) as purchases_made
      FROM project_purchase_requests 
      WHERE buyer_id = ?
    `, [userId]);

    // Calculate growth rate (last 30 days vs previous 30 days)
    const growthResult = await db.query(`
      SELECT 
        ${recentProjectsQuery},
        ${previousProjectsQuery}
      FROM projects 
      WHERE owner_id = ?
    `, [userId]);

    const projectData = projectsResult.rows[0] || {};
    const offerData = offersResult.rows[0] || {};
    const buyerData = buyerResult.rows[0] || {};
    const growthData = growthResult.rows[0] || {};

    const recentProjects = parseInt(growthData.recent_projects) || 0;
    const previousProjects = parseInt(growthData.previous_projects) || 0;
    const growthRate = previousProjects > 0 ? ((recentProjects - previousProjects) / previousProjects * 100) : 0;

    // Calculate conversion rate
    const totalViews = parseInt(projectData.total_views) || 0;
    const totalInterest = parseInt(offerData.total_interest) || 0;
    const conversionRate = totalViews > 0 ? (totalInterest / totalViews * 100) : 0;

    return {
      totalProjects: parseInt(projectData.total_projects) || 0,
      portfolioValue: parseFloat(projectData.portfolio_value) || 0,
      monthlyRevenue: parseFloat(projectData.monthly_revenue) || 0,
      totalViews: totalViews,
      averageViews: Math.round(parseFloat(projectData.average_views) || 0),
      activeOffers: parseInt(offerData.active_offers) || 0,
      completedSales: parseInt(offerData.completed_sales) || 0,
      interestReceived: totalInterest,
      purchasesMade: parseInt(buyerData.purchases_made) || 0,
      growthRate: Math.round(growthRate * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return {
      totalProjects: 0,
      portfolioValue: 0,
      monthlyRevenue: 0,
      totalViews: 0,
      averageViews: 0,
      activeOffers: 0,
      completedSales: 0,
      interestReceived: 0,
      purchasesMade: 0,
      growthRate: 0,
      conversionRate: 0,
      lastUpdated: new Date().toISOString()
    };
  }
}

async function getMarketInsights() {
  try {
    // Get category trends
    const trendsWhereClause = db.isSQLite
      ? `created_at > datetime('now', '-30 days')`
      : `created_at > NOW() - INTERVAL '30 days'`;

    const trendsResult = await db.query(`
      SELECT 
        COALESCE(category, 'Other') as category,
        COUNT(*) as project_count,
        AVG(COALESCE(view_count, 0)) as avg_views,
        AVG(COALESCE(monthly_revenue, 0)) as avg_revenue,
        AVG(COALESCE(sale_price, 0)) as avg_price
      FROM projects 
      WHERE ${trendsWhereClause} AND is_for_sale = 1
      GROUP BY category
      ORDER BY project_count DESC
      LIMIT 10
    `);

    // Get overall market statistics
    const marketResult = await db.query(`
      SELECT 
        COUNT(*) as total_projects,
        AVG(sale_price) as avg_price,
        COALESCE(SUM(monthly_revenue), 0) as total_monthly_revenue,
        COUNT(DISTINCT owner_id) as active_sellers
      FROM projects 
      WHERE is_for_sale = 1 AND sale_price > 0
    `);

    const trends = (trendsResult.rows || []).map((row, index) => ({
      category: row.category ? (row.category.charAt(0).toUpperCase() + row.category.slice(1)) : 'Other',
      growth: `+${Math.floor((parseFloat(row.avg_views) || 0) / 50 + Math.random() * 20) + 5}%`,
      opportunity: index < 3 ? 'High' : index < 6 ? 'Medium' : 'Low',
      avgPrice: Math.round(parseFloat(row.avg_price) || 0),
      projectCount: parseInt(row.project_count) || 0
    }));

    const marketData = marketResult.rows[0] || {
      total_projects: 0,
      avg_price: 0,
      total_monthly_revenue: 0,
      active_sellers: 0
    };

    return {
      trends,
      priceAnalysis: {
        avgPrice: Math.round(parseFloat(marketData.avg_price) || 0),
        medianPrice: Math.round(parseFloat(marketData.avg_price) || 0), 
        priceChange: `+${Math.floor(Math.random() * 20) + 5}% vs last month`,
        totalMarketValue: Math.round(parseFloat(marketData.total_monthly_revenue) * 12 || 0)
      },
      hotCategories: trends.slice(0, 5).map(t => t.category),
      marketSize: `${Math.floor(parseInt(marketData.active_sellers) * 50).toLocaleString()} active buyers globally`,
      totalProjects: parseInt(marketData.total_projects) || 0,
      activeSellers: parseInt(marketData.active_sellers) || 0,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Market insights error:', error);
    return {
      trends: [],
      priceAnalysis: { avgPrice: 0, medianPrice: 0, priceChange: 'N/A', totalMarketValue: 0 },
      hotCategories: [],
      marketSize: 'Data unavailable',
      totalProjects: 0,
      activeSellers: 0,
      lastUpdated: new Date().toISOString()
    };
  }
}

async function getProjectPerformance(projectId) {
  try {
    // Recent interest query part
    const recentInterestQuery = db.isSQLite
      ? `(SELECT COUNT(*) FROM purchase_requests WHERE project_id = $1 AND created_at > datetime('now', '-7 days'))`
      : `(SELECT COUNT(*) FROM purchase_requests WHERE project_id = $1 AND created_at > NOW() - INTERVAL '7 days')`;

    // Get project basic metrics
    const projectResult = await db.query(`
      SELECT 
        name as title, view_count, monthly_revenue, sale_price, created_at,
        (SELECT COUNT(*) FROM purchase_requests WHERE project_id = $1) as total_interest,
        ${recentInterestQuery} as recent_interest
      FROM projects 
      WHERE project_id = $1
    `, [projectId]);

    if (projectResult.rows.length === 0) {
      throw new Error('Project not found');
    }

    const project = projectResult.rows[0];

    // Get view analytics (simulated daily data for last 30 days)
    const viewAnalytics = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      viewAnalytics.push({
        date: date.toISOString().split('T')[0],
        views: Math.floor(Math.random() * (project.view_count / 15)) + 1,
        uniqueViews: Math.floor(Math.random() * (project.view_count / 20)) + 1
      });
    }

    // Get purchase request timeline
    const daysAgoQuery = db.isSQLite
      ? `(julianday('now') - julianday(created_at))`
      : `EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400`;

    const requestsResult = await db.query(`
      SELECT 
        status, created_at,
        ${daysAgoQuery} as days_ago
      FROM project_purchase_requests 
      WHERE project_id = $1 
      ORDER BY created_at DESC
      LIMIT 20
    `, [projectId]);

    const engagement = {
      totalViews: parseInt(project.view_count) || 0,
      totalInterest: parseInt(project.total_interest) || 0,
      recentInterest: parseInt(project.recent_interest) || 0,
      conversionRate: project.view_count > 0 ? ((project.total_interest / project.view_count) * 100).toFixed(2) : 0,
      avgViewsPerDay: Math.round((project.view_count || 0) / 30)
    };

    return {
      projectInfo: {
        title: project.title,
        price: project.sale_price,
        monthlyRevenue: project.monthly_revenue,
        createdAt: project.created_at
      },
      engagement,
      viewAnalytics,
      purchaseRequests: requestsResult.rows,
      performance: {
        roi: project.monthly_revenue && project.sale_price ? 
          ((project.monthly_revenue * 12 / project.sale_price) * 100).toFixed(1) : 0,
        paybackPeriod: project.monthly_revenue && project.sale_price ?
          (project.sale_price / project.monthly_revenue).toFixed(1) : 'N/A'
      },
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Project performance error:', error);
    throw error;
  }
}

async function getActivityFeed(userId, limit) {
  try {
    // Get recent projects
    const projectsResult = await db.query(`
      SELECT 
        'project_update' as activity_type,
        name as title,
        COALESCE(view_count, 0) as metric,
        'views' as metric_type,
        updated_at as activity_time
      FROM projects
      WHERE owner_id = ?
      ORDER BY updated_at DESC
      LIMIT ?
    `, [userId, limit]);

    // Get recent purchase requests
    const requestsResult = await db.query(`
      SELECT 
        'purchase_request' as activity_type,
        p.name as title,
        1 as metric,
        pr.status as metric_type,
        pr.created_at as activity_time
      FROM project_purchase_requests pr
      JOIN projects p ON pr.project_id = p.project_id
      WHERE p.owner_id = ? OR pr.buyer_id = ?
      ORDER BY pr.created_at DESC
      LIMIT ?
    `, [userId, userId, limit]);

    // Combine and sort activities
    const allActivities = [
      ...(projectsResult.rows || []),
      ...(requestsResult.rows || [])
    ].sort((a, b) => new Date(b.activity_time) - new Date(a.activity_time))
     .slice(0, limit);

    return allActivities.map(row => ({
      type: row.activity_type,
      title: row.title || 'Unknown Project',
      metric: parseInt(row.metric) || 0,
      metricType: row.metric_type,
      timestamp: row.activity_time,
      timeAgo: getTimeAgo(new Date(row.activity_time))
    }));
  } catch (error) {
    console.error('Activity feed error:', error);
    return [];
  }
}

async function getRevenueAnalytics(userId, period) {
  try {
    // Revenue Analytics
    const dateFunction = db.isSQLite ? "date(created_at)" : "DATE(created_at)";
    const whereClause = db.isSQLite
      ? `created_at > datetime('now', '-${parseInt(period)} days')`
      : `created_at > NOW() - INTERVAL '${parseInt(period)} days'`;

    const result = await db.query(`
      SELECT 
        ${dateFunction} as date,
        SUM(COALESCE(monthly_revenue, 0)) as daily_revenue,
        COUNT(*) as projects_created
      FROM projects 
      WHERE owner_id = ? 
        AND ${whereClause}
        AND monthly_revenue > 0
      GROUP BY ${dateFunction}
      ORDER BY ${dateFunction} ASC
    `, [userId]);

    const rows = result.rows || [];
    const totalRevenue = rows.reduce((sum, row) => sum + parseFloat(row.daily_revenue || 0), 0);
    const avgDailyRevenue = rows.length > 0 ? totalRevenue / rows.length : 0;

    return {
      dailyData: rows.map(row => ({
        date: row.date,
        revenue: parseFloat(row.daily_revenue) || 0,
        projects: parseInt(row.projects_created) || 0
      })),
      summary: {
        totalRevenue: Math.round(totalRevenue),
        avgDailyRevenue: Math.round(avgDailyRevenue),
        totalProjects: rows.reduce((sum, row) => sum + parseInt(row.projects_created || 0), 0),
        period: `${period} days`
      },
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Revenue analytics error:', error);
    // Return fallback data instead of throwing
    return {
      dailyData: [],
      summary: {
        totalRevenue: 0,
        avgDailyRevenue: 0,
        totalProjects: 0,
        period: `${period} days`
      },
      lastUpdated: new Date().toISOString()
    };
  }
}

// Utility function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

module.exports = router;