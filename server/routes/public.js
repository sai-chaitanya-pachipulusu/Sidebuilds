const express = require('express');
const db = require('../db');

const router = express.Router();

// Helper to handle Database differences (SQLite vs Postgres)
const isPostgres = process.env.USE_SQLITE !== 'true';

// Field references based on DB type
const DB = {
    techStack: isPostgres ? "CAST(p.tech_stack AS TEXT)" : "p.tech_stack",
    tags: isPostgres ? "CAST(p.tags AS TEXT)" : "p.tags",
    // Helper for boolean checks (safely handles INT or BOOL columns in Postgres)
    checkBool: (col) => isPostgres ? `CAST(${col} AS BOOLEAN) IS TRUE` : `${col} = 1`
};

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
                p.view_count, p.is_on_hold,
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
                COALESCE(p.is_on_hold, 0) as is_on_hold,
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
            LEFT JOIN ai_project_analysis ai ON p.project_id = ai.project_id AND ${DB.checkBool('ai.is_current')}
            WHERE ${DB.checkBool('p.is_for_sale')} AND ${DB.checkBool('p.is_public')}
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
                p.domain, p.demo_url, p.github_url, p.tech_stack, p.tags, p.monthly_revenue,
                p.view_count, p.is_on_hold,
                p.is_for_sale, p.sale_price, 
                CASE WHEN ${DB.checkBool('p.is_for_sale')} THEN p.contact_email ELSE NULL END AS contact_email,
                CASE WHEN ${DB.checkBool('p.is_for_sale')} THEN p.contact_phone ELSE NULL END AS contact_phone,
                CASE WHEN ${DB.checkBool('p.is_for_sale')} THEN p.payment_method ELSE NULL END AS payment_method,
                p.updated_at, p.created_at, u.username AS owner_username, p.owner_id
             FROM projects p
             JOIN users u ON p.owner_id = u.user_id
             WHERE p.project_id = ? AND (${DB.checkBool('p.is_public')} OR ${DB.checkBool('p.is_for_sale')})`,
            [projectId]
        );

        if (projectDetails.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found or not publicly accessible.' });
        }

        let project = projectDetails.rows[0];

        // Normalize array fields for consistency across DBs
        const normalizeArray = (val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') {
                let clean = val.replace(/^\{|\}$/g, ''); // Remove Postgres array braces if stringified
                if (!clean) return [];
                return clean.split(',').map(s => s.trim());
            }
            return [];
        };

        project.tech_stack = normalizeArray(project.tech_stack);
        project.tags = normalizeArray(project.tags);

        res.json(project);
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
            totalProjects: parseInt(projectsCountResult.rows[0]?.count || 0),
            activeListings: parseInt(activeListingsResult.rows[0]?.count || 0),
            activeUsers: parseInt(activeUsersResult.rows[0]?.count || 0),
            successfulSales: parseInt(completedSalesResult.rows[0]?.count || 0),
            totalValue: Math.round(parseFloat(totalValueResult.rows[0]?.total_value || 0)),
            
            // For backward compatibility
            projectsCount: parseInt(projectsCountResult.rows[0]?.count || 0),
            developerCount: parseInt(activeUsersResult.rows[0]?.count || 0),
            completedSales: parseInt(completedSalesResult.rows[0]?.count || 0),
            avgValue: parseInt(completedSalesResult.rows[0]?.count || 0) > 0 
                ? Math.round(parseFloat(totalValueResult.rows[0]?.total_value || 0) / parseInt(completedSalesResult.rows[0]?.count || 1)) 
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

// --- ADVANCED SEARCH Projects ---
// POST /api/public/marketplace/search
router.post('/marketplace/search', async (req, res) => {
    try {
        const {
            query = '',
            filters = {},
            sort = 'relevance',
            limit = 50,
            offset = 0,
            fuzzyMatch = true
        } = req.body;

        console.log('Advanced search request:', { query, filters, sort, limit, offset });

        let searchQuery = `
            SELECT 
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
                COALESCE(p.is_on_hold, 0) as is_on_hold,
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
                p.featured,
                p.verified,
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
                ai.confidence_score as ai_confidence`;

        // Add search ranking if query exists
        if (query && query.trim()) {
            if (fuzzyMatch) {
                // Use fuzzy text search with ranking
                searchQuery += `,
                -- Search relevance scoring
                CASE
                    WHEN LOWER(p.name) LIKE LOWER($1) THEN 100
                    WHEN LOWER(p.name) LIKE LOWER($2) THEN 80
                    WHEN LOWER(p.description) LIKE LOWER($2) THEN 60
                    WHEN LOWER(${DB.techStack}) LIKE LOWER($2) THEN 40
                    WHEN LOWER(p.category) LIKE LOWER($2) THEN 30
                    WHEN LOWER(${DB.tags}) LIKE LOWER($2) THEN 20
                    WHEN LOWER(u.username) LIKE LOWER($2) THEN 10
                    ELSE 0
                END as search_rank`;
            } else {
                // Exact match search
                searchQuery += `,
                CASE
                    WHEN LOWER(p.name) = LOWER($1) THEN 100
                    WHEN LOWER(p.name) LIKE LOWER($2) THEN 90
                    WHEN LOWER(p.description) LIKE LOWER($2) THEN 70
                    ELSE 0
                END as search_rank`;
            }
        }

        searchQuery += `
            FROM projects p 
            JOIN users u ON p.owner_id = u.user_id 
            LEFT JOIN ai_project_analysis ai ON p.project_id = ai.project_id AND ai.is_current = 1
            WHERE p.is_for_sale = 1 AND p.is_public = 1`;

        const queryParams = [];
        let paramIndex = 1;

        // Add text search conditions
        if (query && query.trim()) {
            const exactMatch = query.trim();
            const fuzzyPattern = `%${query.trim().toLowerCase()}%`;
            
            queryParams.push(exactMatch, fuzzyPattern);
            
            if (fuzzyMatch) {
                searchQuery += ` AND (
                    LOWER(p.name) LIKE LOWER($2) OR
                    LOWER(p.description) LIKE LOWER($2) OR
                    LOWER(${DB.techStack}) LIKE LOWER($2) OR
                    LOWER(p.category) LIKE LOWER($2) OR
                    LOWER(${DB.tags}) LIKE LOWER($2) OR
                    LOWER(u.username) LIKE LOWER($2)
                )`;
            } else {
                searchQuery += ` AND (
                    LOWER(p.name) LIKE LOWER($2) OR
                    LOWER(p.description) LIKE LOWER($2)
                )`;
            }
            paramIndex = 3;
        }

        // Apply filters
        if (filters.category && filters.category !== 'all') {
            queryParams.push(filters.category);
            searchQuery += ` AND LOWER(p.category) = LOWER($${paramIndex})`;
            paramIndex++;
        }

        if (filters.stage && filters.stage !== 'all') {
            queryParams.push(filters.stage);
            searchQuery += ` AND LOWER(p.stage) = LOWER($${paramIndex})`;
            paramIndex++;
        }

        if (filters.verified) {
            searchQuery += ` AND (p.verified = true OR u.is_verified = true)`;
        }

        if (filters.featured) {
            searchQuery += ` AND p.featured = true`;
        }

        if (filters.hasDemo) {
            searchQuery += ` AND (p.demo_url IS NOT NULL AND p.demo_url != '')`;
        }

        // Price range filter
        if (filters.priceRange && Array.isArray(filters.priceRange)) {
            queryParams.push(filters.priceRange[0], filters.priceRange[1]);
            searchQuery += ` AND p.sale_price BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            paramIndex += 2;
        }

        // Revenue range filter
        if (filters.revenueRange && Array.isArray(filters.revenueRange)) {
            queryParams.push(filters.revenueRange[0], filters.revenueRange[1]);
            searchQuery += ` AND COALESCE(p.monthly_revenue, 0) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            paramIndex += 2;
        }

        // Tech stack filter
        if (filters.techStack && Array.isArray(filters.techStack) && filters.techStack.length > 0) {
            const techConditions = filters.techStack.map(() => {
                queryParams.push(`%${filters.techStack[queryParams.length - (paramIndex - 1)]}%`);
                return `LOWER(${DB.techStack}) LIKE LOWER($${paramIndex++})`;
            });
            searchQuery += ` AND (${techConditions.join(' OR ')})`;
        }

        // Date range filter
        if (filters.dateRange && filters.dateRange !== 'all') {
            let dateFilter = '';
            const now = new Date();
            
            switch (filters.dateRange) {
                case 'week':
                    dateFilter = `AND p.created_at >= $${paramIndex}`;
                    queryParams.push(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
                    paramIndex++;
                    break;
                case 'month':
                    dateFilter = `AND p.created_at >= $${paramIndex}`;
                    queryParams.push(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
                    paramIndex++;
                    break;
                case 'year':
                    dateFilter = `AND p.created_at >= $${paramIndex}`;
                    queryParams.push(new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000));
                    paramIndex++;
                    break;
            }
            searchQuery += ' ' + dateFilter;
        }

        // Add sorting
        let orderByClause = '';
        switch (sort) {
            case 'relevance':
                if (query && query.trim()) {
                    orderByClause = 'ORDER BY search_rank DESC, p.featured DESC, p.view_count DESC';
                } else {
                    orderByClause = 'ORDER BY p.featured DESC, p.view_count DESC, p.created_at DESC';
                }
                break;
            case 'newest':
                orderByClause = 'ORDER BY p.created_at DESC';
                break;
            case 'oldest':
                orderByClause = 'ORDER BY p.created_at ASC';
                break;
            case 'price_high':
                orderByClause = 'ORDER BY p.sale_price DESC NULLS LAST';
                break;
            case 'price_low':
                orderByClause = 'ORDER BY p.sale_price ASC NULLS LAST';
                break;
            case 'revenue_high':
                orderByClause = 'ORDER BY p.monthly_revenue DESC NULLS LAST';
                break;
            case 'most_viewed':
                orderByClause = 'ORDER BY p.view_count DESC';
                break;
            case 'trending':
                // Custom trending algorithm
                orderByClause = `ORDER BY (
                    COALESCE(p.view_count, 0) * 0.1 + 
                    COALESCE(p.monthly_revenue, 0) * 0.001 +
                    EXTRACT(EPOCH FROM (NOW() - p.created_at)) / -86400 * 0.5
                ) DESC`;
                break;
            case 'featured':
                orderByClause = 'ORDER BY p.featured DESC, p.view_count DESC';
                break;
            default:
                orderByClause = 'ORDER BY p.created_at DESC';
        }

        searchQuery += ' ' + orderByClause;

        // Add pagination
        if (limit) {
            queryParams.push(limit, offset || 0);
            searchQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        }

        console.log('Executing search query with params:', queryParams.length);
        
        const startTime = Date.now();
        const searchResults = await db.query(searchQuery, queryParams);
        const searchTime = Date.now() - startTime;

        // Get total count for pagination (without limit/offset)
        let countQuery = `
            SELECT COUNT(*) as total_count
            FROM projects p 
            JOIN users u ON p.owner_id = u.user_id 
            WHERE p.is_for_sale = 1 AND p.is_public = 1`;

        const countParams = [];
        let countParamIndex = 1;

        // Add the same filters to count query
        if (query && query.trim()) {
            const fuzzyPattern = `%${query.trim().toLowerCase()}%`;
            countParams.push(query.trim(), fuzzyPattern);
            
            if (fuzzyMatch) {
                countQuery += ` AND (
                    LOWER(p.name) LIKE LOWER($2) OR
                    LOWER(p.description) LIKE LOWER($2) OR
                    LOWER(${DB.techStack}) LIKE LOWER($2) OR
                    LOWER(p.category) LIKE LOWER($2) OR
                    LOWER(${DB.tags}) LIKE LOWER($2) OR
                    LOWER(u.username) LIKE LOWER($2)
                )`;
            } else {
                countQuery += ` AND (
                    LOWER(p.name) LIKE LOWER($2) OR
                    LOWER(p.description) LIKE LOWER($2)
                )`;
            }
            countParamIndex = 3;
        }

        // Apply same filters for count
        if (filters.category && filters.category !== 'all') {
            countParams.push(filters.category);
            countQuery += ` AND LOWER(p.category) = LOWER($${countParamIndex})`;
            countParamIndex++;
        }

        if (filters.stage && filters.stage !== 'all') {
            countParams.push(filters.stage);
            countQuery += ` AND LOWER(p.stage) = LOWER($${countParamIndex})`;
            countParamIndex++;
        }

        if (filters.verified) {
            countQuery += ` AND (p.verified = true OR u.is_verified = true)`;
        }

        if (filters.featured) {
            countQuery += ` AND p.featured = true`;
        }

        if (filters.hasDemo) {
            countQuery += ` AND (p.demo_url IS NOT NULL AND p.demo_url != '')`;
        }

        if (filters.priceRange && Array.isArray(filters.priceRange)) {
            countParams.push(filters.priceRange[0], filters.priceRange[1]);
            countQuery += ` AND p.sale_price BETWEEN $${countParamIndex} AND $${countParamIndex + 1}`;
            countParamIndex += 2;
        }

        if (filters.revenueRange && Array.isArray(filters.revenueRange)) {
            countParams.push(filters.revenueRange[0], filters.revenueRange[1]);
            countQuery += ` AND COALESCE(p.monthly_revenue, 0) BETWEEN $${countParamIndex} AND $${countParamIndex + 1}`;
            countParamIndex += 2;
        }

        if (filters.techStack && Array.isArray(filters.techStack) && filters.techStack.length > 0) {
            const techConditions = filters.techStack.map(() => {
                countParams.push(`%${filters.techStack[countParams.length - (countParamIndex - 1)]}%`);
                return `LOWER(${DB.techStack}) LIKE LOWER($${countParamIndex++})`;
            });
            countQuery += ` AND (${techConditions.join(' OR ')})`;
        }

        if (filters.dateRange && filters.dateRange !== 'all') {
            const now = new Date();
            switch (filters.dateRange) {
                case 'week':
                    countQuery += ` AND p.created_at >= $${countParamIndex}`;
                    countParams.push(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
                    break;
                case 'month':
                    countQuery += ` AND p.created_at >= $${countParamIndex}`;
                    countParams.push(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
                    break;
                case 'year':
                    countQuery += ` AND p.created_at >= $${countParamIndex}`;
                    countParams.push(new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000));
                    break;
            }
        }

        const countResult = await db.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0]?.total_count || 0);

        // Log search analytics
        console.log(`Search completed: ${searchResults.rows.length} results in ${searchTime}ms`);
        
        // Return enhanced results
        res.json({
            results: searchResults.rows,
            pagination: {
                total: totalCount,
                limit: limit || 50,
                offset: offset || 0,
                hasMore: (offset || 0) + (limit || 50) < totalCount
            },
            metadata: {
                searchTime,
                query: query || null,
                filtersApplied: Object.keys(filters).length,
                fuzzyMatch,
                sort
            }
        });

    } catch (err) {
        console.error("Advanced search error:", err.message, err.stack);
        res.status(500).json({ 
            error: 'Server error during search',
            message: err.message 
        });
    }
});

// --- GET Search Suggestions ---
// GET /api/public/marketplace/suggestions?q=searchterm
router.get('/marketplace/suggestions', async (req, res) => {
    try {
        const { q: query, limit = 10 } = req.query;
        
        if (!query || query.length < 2) {
            return res.json({ suggestions: [] });
        }

        const suggestions = [];
        const queryLower = query.toLowerCase();
        const fuzzyPattern = `%${queryLower}%`;

        // Get project name suggestions
        const projectSuggestions = await db.query(`
            SELECT DISTINCT p.name, p.category, COUNT(*) as frequency
            FROM projects p
            WHERE ${DB.checkBool('p.is_for_sale')} AND ${DB.checkBool('p.is_public')}
                AND LOWER(p.name) LIKE $1
            GROUP BY p.name, p.category
            ORDER BY frequency DESC, p.name ASC
            LIMIT $2
        `, [fuzzyPattern, Math.ceil(limit / 2)]);

        projectSuggestions.rows.forEach(row => {
            suggestions.push({
                type: 'project',
                value: row.name,
                category: row.category,
                frequency: row.frequency
            });
        });

        // Get technology suggestions
        const techSuggestions = await db.query(`
            SELECT DISTINCT 
                ${isPostgres ? "regexp_split_to_table(LOWER(CAST(p.tech_stack AS TEXT)), '[,\\s]+')" : "LOWER(p.tech_stack)"} as tech,
                COUNT(*) as frequency
            FROM projects p
            WHERE ${DB.checkBool('p.is_for_sale')} AND ${DB.checkBool('p.is_public')}
                AND LOWER(${DB.techStack}) LIKE $1
                AND p.tech_stack IS NOT NULL
                AND ${isPostgres ? "CAST(p.tech_stack AS TEXT)" : "p.tech_stack"} != ''
            GROUP BY tech
            HAVING tech LIKE $1 AND LENGTH(tech) > 2
            ORDER BY frequency DESC
            LIMIT $2
        `, [fuzzyPattern, Math.floor(limit / 2)]);

        techSuggestions.rows.forEach(row => {
            if (row.tech && row.tech.trim().length > 2) {
                suggestions.push({
                    type: 'technology',
                    value: row.tech.trim(),
                    frequency: row.frequency
                });
            }
        });

        res.json({
            suggestions: suggestions.slice(0, limit)
        });

    } catch (err) {
        console.error("Search suggestions error:", err);
        res.status(500).json({ error: 'Server error getting suggestions' });
    }
});

// --- GET Search Analytics ---
// GET /api/public/marketplace/analytics
router.get('/marketplace/analytics', async (req, res) => {
    try {
        // Get popular search terms (would need search logging)
        const analytics = {
            totalProjects: 0,
            projectsForSale: 0,
            totalUsers: 0,
            successfulSales: 0,
            totalVolume: 0,
            categories: {},
            technologies: {},
            priceRanges: {
                'under5k': 0,
                '5k-15k': 0,
                '15k-50k': 0,
                'over50k': 0
            },
            trends: {
                newThisWeek: 0,
                newThisMonth: 0,
                avgPrice: 0,
                avgRevenue: 0
            }
        };

        // Get basic project statistics - count ALL public projects
        try {
            // Use simple boolean comparison that works for both PostgreSQL and SQLite
            const statsResult = await db.query(`
                SELECT 
                    COUNT(*) as total_projects,
                    COUNT(CASE WHEN ${DB.checkBool('is_for_sale')} THEN 1 END) as projects_for_sale,
                    AVG(COALESCE(sale_price, 0)) as avg_price,
                    AVG(COALESCE(monthly_revenue, 0)) as avg_revenue
                FROM projects
                WHERE ${DB.checkBool('is_public')}
            `);
            const stats = statsResult.rows[0];
            analytics.totalProjects = parseInt(stats.total_projects) || 0;
            analytics.projectsForSale = parseInt(stats.projects_for_sale) || 0;
            analytics.trends.avgPrice = Math.round(parseFloat(stats.avg_price || 0));
            analytics.trends.avgRevenue = Math.round(parseFloat(stats.avg_revenue || 0));
        } catch (e) {
            console.log('Stats query error:', e.message);
        }

        // Get total users
        try {
            const usersResult = await db.query(`SELECT COUNT(*) as total_users FROM users`);
            analytics.totalUsers = parseInt(usersResult.rows[0]?.total_users) || 0;
        } catch (e) {
            console.log('Users query error:', e.message);
        }
        
        // Get successful sales and total volume from transactions
        try {
            const salesResult = await db.query(`
                SELECT 
                    COUNT(*) as successful_sales,
                    COALESCE(SUM(amount), 0) as total_volume
                FROM project_transactions
                WHERE status = 'completed'
            `);
            analytics.successfulSales = parseInt(salesResult.rows[0]?.successful_sales) || 0;
            analytics.totalVolume = parseFloat(salesResult.rows[0]?.total_volume) || 0;
        } catch (e) {
            // Transactions table might not exist - that's okay
            console.log('Sales query error (transactions table may not exist):', e.message);
        }

        // Get category distribution
        try {
            const categoryResult = await db.query(`
                SELECT 
                    COALESCE(category, 'uncategorized') as category,
                    COUNT(*) as count
                FROM projects
                WHERE ${DB.checkBool('is_for_sale')} AND ${DB.checkBool('is_public')}
                GROUP BY category
                ORDER BY count DESC
            `);
            categoryResult.rows.forEach(row => {
                analytics.categories[row.category] = parseInt(row.count);
            });
        } catch (e) {
            console.log('Category query error:', e.message);
        }

        // Get price range distribution
        try {
            const priceResult = await db.query(`
                SELECT 
                    CASE 
                        WHEN sale_price < 5000 THEN 'under5k'
                        WHEN sale_price < 15000 THEN '5k-15k'
                        WHEN sale_price < 50000 THEN '15k-50k'
                        ELSE 'over50k'
                    END as price_range,
                    COUNT(*) as count
                FROM projects
                WHERE ${DB.checkBool('is_for_sale')} AND ${DB.checkBool('is_public')}
                    AND sale_price > 0
                GROUP BY price_range
            `);
            priceResult.rows.forEach(row => {
                analytics.priceRanges[row.price_range] = parseInt(row.count);
            });
        } catch (e) {
            console.log('Price query error:', e.message);
        }

        res.json(analytics);

    } catch (err) {
        console.error("Analytics error:", err);
        res.status(500).json({ error: 'Server error getting analytics' });
    }
});

// Add other public routes here if needed (e.g., view single public project?)

module.exports = router; 