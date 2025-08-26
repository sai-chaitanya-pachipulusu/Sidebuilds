const express = require('express');
const db = require('../db');

const router = express.Router();

// --- READ Publicly Shared Projects ---
// GET /api/public/projects
router.get('/projects', async (req, res) => {
    try {
        console.log('[PUBLIC API] Request received for /projects');
        
        // Select public projects and join with users table to get username
        // Only select fields safe for public display
        const publicProjects = await db.query(
            `SELECT 
                p.project_id, p.name, p.description, p.stage,
                p.domain, p.demo_url, p.github_url, p.tech_stack, p.monthly_revenue,
                p.view_count,
                p.updated_at, u.username AS owner_username 
             FROM projects p 
             JOIN users u ON p.owner_id = u.user_id 
             WHERE p.is_public = 1 
             ORDER BY p.updated_at DESC`
        );
        
        console.log('[PUBLIC API] Query successful, returning', publicProjects.rows.length, 'projects');
        res.json(publicProjects.rows);

    } catch (err) {
        console.error("[PUBLIC API] Get public projects error:", err.message);
        console.error("[PUBLIC API] Full error:", err);
        console.error("[PUBLIC API] Stack trace:", err.stack);
        res.status(500).json({ error: 'Server error fetching public projects', details: err.message });
    }
});

// --- READ Projects Listed for Sale (Marketplace) ---
// GET /api/public/marketplace
router.get('/marketplace', async (req, res) => {
    try {
        console.log("Fetching marketplace projects");
        // Query directly instead of using the view that has errors
        const marketplaceProjects = await db.query(
            `SELECT 
                p.project_id, 
                p.name, 
                COALESCE(p.description, '') as description, 
                COALESCE(p.detailed_description, '') as detailed_description,
                COALESCE(p.stage, '') as stage, 
                COALESCE(p.category, '') as category,
                COALESCE(p.subcategory, '') as subcategory,
                COALESCE(p.domain, '') as domain, 
                COALESCE(p.demo_url, '') as demo_url,
                COALESCE(p.github_url, '') as github_url,
                COALESCE(p.tech_stack, '[]') as tech_stack,
                COALESCE(p.tags, '[]') as tags,
                COALESCE(p.monthly_revenue, 0) as monthly_revenue,
                COALESCE(p.monthly_users, 0) as monthly_users,
                COALESCE(p.growth_rate, 0) as growth_rate,
                COALESCE(p.view_count, 0) as view_count,
                p.sale_price, 
                p.price_negotiable,
                COALESCE(p.contact_email, '') as contact_email, 
                COALESCE(p.contact_phone, '') as contact_phone, 
                COALESCE(p.payment_method, '') as payment_method,
                p.thumbnail_url,
                p.launch_date,
                p.updated_at,
                p.created_at,
                p.owner_id as owner_id, 
                COALESCE(u.username, 'Anonymous') AS owner_username,
                COALESCE(u.username, 'Anonymous') AS username,
                u.is_verified,
                u.verification_level,
                u.first_name,
                u.last_name,
                u.avatar_url,
                -- AI analysis data
                ai.overall_score,
                ai.estimated_value as ai_estimated_value,
                ai.confidence_score as ai_confidence
            FROM projects p 
            JOIN users u ON p.owner_id = u.user_id 
            LEFT JOIN ai_project_analysis ai ON p.project_id = ai.project_id AND ai.is_current = 1
            WHERE p.is_for_sale = 1 AND p.is_public = 1
            ORDER BY p.created_at DESC`
        );
        
        console.log(`Found ${marketplaceProjects.rows.length} projects for marketplace`);
        res.json(marketplaceProjects.rows);

    } catch (err) {
        console.error("Get marketplace projects error:", err.message, err.stack);
        res.status(500).json({ error: 'Server error fetching marketplace projects' });
    }
});

// --- Get Single Public Project Details ---
// GET /api/public/projects/:id
router.get('/projects/:id', async (req, res) => {
    const projectId = req.params.id;

    try {
        const projectDetails = await db.query(
            `SELECT 
                p.project_id, p.name, p.description, p.stage,
                p.domain, p.demo_url, p.github_url, p.tech_stack, p.monthly_revenue,
                p.view_count,
                p.is_for_sale, p.sale_price, 
                CASE WHEN p.is_for_sale = 1 THEN p.contact_email ELSE NULL END AS contact_email,
                CASE WHEN p.is_for_sale = 1 THEN p.contact_phone ELSE NULL END AS contact_phone,
                CASE WHEN p.is_for_sale = 1 THEN p.payment_method ELSE NULL END AS payment_method,
                p.updated_at, p.created_at, u.username AS owner_username
             FROM projects p
             JOIN users u ON p.owner_id = u.user_id
             WHERE p.project_id = ? AND (p.is_public = 1 OR p.is_for_sale = 1)`,
            [projectId]
        );

        if (projectDetails.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found or not publicly accessible.' });
        }

        res.json(projectDetails.rows[0]);
    } catch (err) {
        console.error("Get public project details error:", err.message);
        if (err.code === '22P02') {
            return res.status(400).json({ message: 'Invalid project ID format.' });
        }
        res.status(500).send('Server error fetching project details.');
    }
});

// Add a health check endpoint
router.get('/health', async (req, res) => {
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {}
  };

  // Check database
  try {
    const dbStart = Date.now();
    const result = await db.query('SELECT 1 AS health_check');
    const dbDuration = Date.now() - dbStart;
    
    healthData.services.database = {
      status: 'up',
      responseTime: `${dbDuration}ms`
    };
  } catch (error) {
    healthData.services.database = {
      status: 'down',
      error: error.message
    };
    healthData.status = 'degraded';
  }

  // Check Stripe availability
  try {
    const { stripe, stripeConfigValid, configErrors } = require('../config/stripe.config');
    
    if (!stripeConfigValid) {
      healthData.services.stripe = {
        status: 'misconfigured',
        errors: configErrors
      };
      healthData.status = 'degraded';
    } else {
      try {
        const stripeStart = Date.now();
        // Simple check without actually making API call to avoid rate limits
        healthData.services.stripe = {
          status: 'configured',
          keyType: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'live',
          webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET
        };
      } catch (stripeError) {
        healthData.services.stripe = {
          status: 'error',
          error: stripeError.message
        };
        healthData.status = 'degraded';
      }
    }
  } catch (error) {
    healthData.services.stripe = {
      status: 'unknown',
      error: error.message
    };
    healthData.status = 'degraded';
  }

  // Return health information
  res.json(healthData);
});

// Add a Stripe-specific health check for public diagnostics
router.get('/stripe-status', async (req, res) => {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const data = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  };

  try {
    // Import Stripe config
    const { stripe, stripeConfigValid, configErrors } = require('../config/stripe.config');
    
    if (!stripeConfigValid) {
      data.status = 'misconfigured';
      data.errors = configErrors;
    } else {
      // Try a simple Stripe API call
      try {
        const balance = await stripe.balance.retrieve();
        data.status = 'connected';
        data.keyType = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'live';
        data.hasBalance = balance.available.length > 0;
      } catch (stripeErr) {
        data.status = 'error';
        data.errorType = stripeErr.type;
        data.errorCode = stripeErr.code;
        data.message = stripeErr.message;
      }
    }
  } catch (error) {
    data.status = 'failed';
    data.error = error.message;
  }

  res.json(data);
});

// GET /api/public/stats/marketplace - Get marketplace statistics
router.get('/stats/marketplace', async (req, res) => {
    try {
        // Get projects count (filter to only public ones)
        const projectsCountResult = await db.query(`
            SELECT COUNT(*) FROM projects 
            WHERE is_public = true
        `);
        
        // Get active listings count
        const activeListingsResult = await db.query(`
            SELECT COUNT(*) FROM projects 
            WHERE is_for_sale = true AND sale_price > 0
        `);
        
        // Get users count
        const activeUsersResult = await db.query(`
            SELECT COUNT(*) FROM users
        `);
        
        // Get completed sales count
        const completedSalesResult = await db.query(`
            SELECT COUNT(*) FROM purchase_requests
            WHERE status = 'transfer_completed_buyer_confirmed'
        `);
        
        // Get total value of completed sales
        const totalValueResult = await db.query(`
            SELECT COALESCE(SUM(price), 0) as total_value 
            FROM purchase_requests
            WHERE price IS NOT NULL AND status = 'transfer_completed_buyer_confirmed'
        `);
        
        // Format the response
        const stats = {
            totalProjects: parseInt(projectsCountResult.rows[0].count),
            activeListings: parseInt(activeListingsResult.rows[0].count),
            activeUsers: parseInt(activeUsersResult.rows[0].count),
            successfulSales: parseInt(completedSalesResult.rows[0].count),
            totalValue: Math.round(parseFloat(totalValueResult.rows[0].total_value)),
            
            // For backward compatibility
            projectsCount: parseInt(projectsCountResult.rows[0].count),
            developerCount: parseInt(activeUsersResult.rows[0].count),
            completedSales: parseInt(completedSalesResult.rows[0].count),
            avgValue: parseInt(completedSalesResult.rows[0].count) > 0 
                ? Math.round(parseFloat(totalValueResult.rows[0].total_value) / parseInt(completedSalesResult.rows[0].count)) 
                : 0
        };
        
        res.json(stats);
    } catch (err) {
        console.error('Error fetching marketplace stats:', err);
        res.status(500).json({ message: 'Server error fetching stats' });
    }
});

// GET /api/public/projects/featured - Get featured projects with enhanced data
router.get('/projects/featured', async (req, res) => {
    try {
        const featuredProjects = await db.query(`
            SELECT 
                p.project_id,
                p.name,
                p.description,
                p.stage,
                p.domain,
                p.sale_price,
                p.is_for_sale,
                p.is_verified,
                p.tech_stack,
                p.monthly_revenue,
                p.featured_image_url,
                p.view_count,
                p.created_at,
                p.updated_at,
                u.username AS owner_username,
                u.user_id AS owner_id,
                u.is_verified AS owner_verified,
                u.avatar_url AS owner_avatar,
                -- Add aggregated counts
                COUNT(DISTINCT pl.like_id) AS like_count,
                COUNT(DISTINCT ps.save_id) AS save_count,
                COUNT(DISTINCT pr.id) AS interest_count
            FROM projects p
            LEFT JOIN users u ON p.owner_id = u.user_id
            LEFT JOIN project_likes pl ON p.project_id = pl.project_id
            LEFT JOIN project_saves ps ON p.project_id = ps.project_id
            LEFT JOIN purchase_requests pr ON p.project_id = pr.project_id
            WHERE p.is_public = true 
                AND p.is_for_sale = true
                AND p.sale_price > 0
                AND p.stage = 'launched'
            GROUP BY p.project_id, u.user_id
            ORDER BY 
                p.is_featured DESC,
                p.monthly_revenue DESC NULLS LAST,
                p.view_count DESC,
                p.created_at DESC
            LIMIT 6
        `);
        
        // Format the response to match frontend expectations
        const formattedProjects = featuredProjects.rows.map(project => ({
            ...project,
            owner: {
                username: project.owner_username,
                user_id: project.owner_id,
                is_verified: project.owner_verified,
                avatar_url: project.owner_avatar
            }
        }));
        
        res.json(formattedProjects);
    } catch (err) {
        console.error('Error fetching featured projects:', err);
        res.status(500).json({ message: 'Server error fetching featured projects' });
    }
});

// GET /api/public/projects/trending - Get trending projects
router.get('/projects/trending', async (req, res) => {
    try {
        const trendingProjects = await db.query(`
            SELECT 
                p.*,
                u.username AS owner_username,
                -- Calculate trending score
                (
                    COALESCE(p.view_count, 0) * 0.1 +
                    COALESCE(p.monthly_revenue, 0) * 0.001 +
                    COUNT(DISTINCT pl.like_id) * 10 +
                    COUNT(DISTINCT ps.save_id) * 15 +
                    EXTRACT(EPOCH FROM (NOW() - p.created_at)) / -86400 * 0.5
                ) AS trending_score
            FROM projects p
            LEFT JOIN users u ON p.owner_id = u.user_id
            LEFT JOIN project_likes pl ON p.project_id = pl.project_id
            LEFT JOIN project_saves ps ON p.project_id = ps.project_id
            WHERE p.is_public = true 
            GROUP BY p.project_id, u.user_id
            ORDER BY trending_score DESC
            LIMIT 20
        `);
        
        res.json(trendingProjects.rows);
    } catch (err) {
        console.error('Error fetching trending projects:', err);
        res.status(500).json({ message: 'Server error fetching trending projects' });
    }
});

// Add other public routes here if needed (e.g., view single public project?)

module.exports = router; 