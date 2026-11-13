const express = require('express');
const db = require('../db');
const { cache, presets } = require('../middleware/cache');
const { publicLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
const { getPagination } = require('../utils/pagination');
const { deserializeListing } = require('../utils/listingFields');
const { getMarketplaceQuery } = require('../utils/marketplaceQuery');

// Apply rate limiting to all public routes
router.use(publicLimiter);
router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});

router.get('/commerce-status', (_req,res) => res.json({
    checkout_available: require('../config/stripe.config').stripeConfigValid && require('../utils/commercePolicy').commerceEnabled(process.env),
    platform_fee_percent: Number(process.env.COMMISSION_RATE || 5),
    email_available: require('../services/emailService').getEmailStatus().configured
}));

// --- READ Publicly Shared Projects ---
// GET /api/public/projects
router.get('/projects', 
    // Visibility can change at any time; don't serve cached listing contents.
    async (req, res) => {
        try {
            console.log('[PUBLIC API] Request received for /projects');
            
            // Pagination parameters
            const { page, limit, offset } = getPagination(req.query);
            
            // Select public projects with pagination
            const publicProjects = await db.query(
                `SELECT 
                    p.project_id, p.name, p.description, p.stage,
                    p.domain, p.demo_url, p.github_url, p.tech_stack, p.category, p.sale_price, p.monthly_revenue,
                    p.view_count, (p.is_on_hold OR EXISTS(SELECT 1 FROM checkout_reservations cr WHERE cr.project_id=p.project_id)) AS is_on_hold,
                    p.created_at, p.updated_at, u.username AS owner_username
                 FROM projects p 
                 JOIN users u ON p.owner_id = u.user_id 
                 WHERE p.is_public = true
                 ORDER BY p.updated_at DESC
                 LIMIT $1 OFFSET $2`,
                [limit, offset]
            );
            
            // Get total count for pagination metadata
            const countResult = await db.query(
                `SELECT COUNT(*) as total FROM projects WHERE is_public = true`
            );
            const total = parseInt(countResult.rows[0].total);
            
            res.json({
                data: publicProjects.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasMore: page * limit < total
                }
            });

        } catch (err) {
            console.error("[PUBLIC API] Get public projects error:", err.message);
            res.status(500).json({ error: 'Server error fetching public projects' });
        }
    }
);

// --- READ Projects Listed for Sale (Marketplace) ---
// GET /api/public/marketplace
router.get('/marketplace',
    async (req, res) => {
        try {
            console.log("[PUBLIC API] Fetching marketplace projects");
            
            // Pagination parameters
            const { page, limit, offset } = getPagination(req.query);

            const { where, parameters, orderBy } = getMarketplaceQuery(req.query);

            // Build optimized query with pagination
            const marketplaceProjects = await db.query(
                `SELECT
                    p.project_id, 
                    p.name, 
                    p.description,
                    p.stage, 
                    p.category,
                    p.domain, 
                    p.demo_url,
                    p.github_url,
                    p.tech_stack,
                    p.tags,
                    p.monthly_revenue,
                    p.monthly_users,
                    p.growth_rate,
                    p.view_count,
                    (p.is_on_hold OR EXISTS(SELECT 1 FROM checkout_reservations cr WHERE cr.project_id=p.project_id)) AS is_on_hold,
                    p.is_for_sale,
                    p.is_public,
                    p.sale_price, 
                    p.price_negotiable,
                    p.thumbnail_url,
                    p.launch_date,
                    p.updated_at,
                    p.created_at,
                    p.owner_id, 
                    u.username AS owner_username,
                    u.is_verified,
                    u.verification_level,
                    u.avatar_url,
                    false AS revenue_verified,
                    false AS code_quality_verified,
                    ai.overall_score,
                    ai.estimated_value as ai_estimated_value,
                    ai.confidence_score as ai_confidence,
                    ai.overall_score as project_health_score
                FROM projects p 
                JOIN users u ON p.owner_id = u.user_id 
                LEFT JOIN ai_project_analysis ai ON p.project_id = ai.project_id
                WHERE ${where}
                ORDER BY ${orderBy}
                LIMIT $${parameters.length + 1} OFFSET $${parameters.length + 2}`,
                [...parameters, limit, offset]
            );
            
            // Get total count
            const countResult = await db.query(
                `SELECT COUNT(*) as total
                 FROM projects p JOIN users u ON p.owner_id = u.user_id
                 WHERE ${where}`, parameters
            );
            const total = parseInt(countResult.rows[0].total);
            
            res.json({
                data: marketplaceProjects.rows.map(deserializeListing),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasMore: page * limit < total
                }
            });
        } catch (err) {
            if (err.status === 400) return res.status(400).json({ message: err.message });
            console.error("[PUBLIC API] Get marketplace projects error:", err.message);
            res.status(500).json({ error: 'Server error fetching marketplace projects' });
        }
    }
);

// --- Get Single Public Project Details ---
router.get('/projects/:id',
    async (req, res) => {
        const projectId = req.params.id;

        try {
            const projectDetails = await db.query(
                `SELECT 
                    p.project_id, p.name, p.description, p.stage,
                    p.category, p.subcategory, p.stage_details,
                    p.domain, p.demo_url, p.github_url, p.tech_stack, p.tags, p.monthly_revenue,
                    p.view_count, (p.is_on_hold OR EXISTS(SELECT 1 FROM checkout_reservations cr WHERE cr.project_id=p.project_id)) AS is_on_hold,
                    p.is_public, p.is_for_sale, p.sale_price,
                    CASE WHEN p.is_for_sale = true THEN p.contact_email ELSE NULL END AS contact_email,
                    CASE WHEN p.is_for_sale = true THEN p.contact_phone ELSE NULL END AS contact_phone,
                    CASE WHEN p.is_for_sale = true THEN p.payment_method ELSE NULL END AS contact_payment_method,
                    p.updated_at, p.created_at, u.username AS owner_username, p.owner_id,
                    u.is_verified, u.verification_level, u.avatar_url,
                    false AS revenue_verified,
                    false AS code_quality_verified,
                    false AS verified,
                    ai.overall_score,
                    ai.estimated_value AS ai_estimated_value,
                    ai.confidence_score AS ai_confidence,
                    ai.confidence_level,
                    ai.insights,
                    ai.recommendations,
                    ai.risks
                 FROM projects p
                 JOIN users u ON p.owner_id = u.user_id
                 LEFT JOIN ai_project_analysis ai ON p.project_id = ai.project_id
                 WHERE p.project_id = $1 AND p.is_public = true`,
                [projectId]
            );

            if (projectDetails.rows.length === 0) {
                return res.status(404).json({ message: 'Project not found or not publicly accessible.' });
            }

            let project = projectDetails.rows[0];

            // Normalize array fields
            const normalizeArray = (val) => {
                if (!val) return [];
                if (Array.isArray(val)) return val;
                if (typeof val === 'string') {
                    try {
                        return JSON.parse(val);
                    } catch (e) {
                        let clean = val.replace(/^\{|\}$/g, ''); 
                        if (!clean) return [];
                        return clean.split(',').map(s => s.trim());
                    }
                }
                return [];
            };

            project.tech_stack = normalizeArray(project.tech_stack);
            project.tags = normalizeArray(project.tags);
            project.project_health_score = project.overall_score || null;
            project.ai_analysis = project.overall_score ? {
                overall_score: project.overall_score,
                estimated_value: project.ai_estimated_value,
                confidence_score: project.ai_confidence,
                confidence_level: project.confidence_level || 'medium',
                insights: project.insights,
                recommendations: project.recommendations,
                risks: project.risks
            } : null;

            res.json(deserializeListing(project));
        } catch (err) {
            console.error("[PUBLIC API] Get public project details error:", err.message);
            res.status(500).json({ error: 'Server error fetching project details.' });
        }
    }
);

// GET /api/public/stats/marketplace
router.get('/stats/marketplace',
    cache(presets.stats),
    async (req, res) => {
        try {
            // Optimized single query with CTEs
            const statsQuery = `
                WITH stats AS (
                    SELECT 
                        COUNT(*) FILTER (WHERE is_public = true) as projects_count,
                        COUNT(*) FILTER (WHERE is_for_sale = true AND is_public = true AND sale_price > 0) as active_listings
                    FROM projects
                ),
                user_stats AS (
                    SELECT COUNT(*) as users_count FROM users WHERE is_test=false AND COALESCE(is_admin,false)=false
                ),
                sales_stats AS (
                    SELECT COUNT(*) as completed_sales, COALESCE(SUM(amount), 0) AS total_value
                    FROM project_transactions
                    WHERE status = 'completed' AND escrow_released=true AND transfer_completed=true AND escrow_status='released'
                    AND NOT EXISTS (SELECT 1 FROM users WHERE is_test=true AND user_id IN (buyer_id,seller_id))
                )
                SELECT 
                    s.projects_count,
                    s.active_listings,
                    u.users_count,
                    ss.completed_sales, ss.total_value
                FROM stats s
                CROSS JOIN user_stats u
                CROSS JOIN sales_stats ss
            `;
            const { rows } = await db.query(statsQuery);
            res.json(rows[0]);
        } catch (err) {
            console.error("[PUBLIC API] Get marketplace stats error:", err.message);
            res.status(500).json({ error: 'Server error fetching stats.' });
        }
    }
);

// GET /api/public/marketplace/analytics
router.get('/marketplace/analytics',
    cache(presets.stats),
    async (req, res) => {
        try {
            console.log("[PUBLIC API] Fetching marketplace analytics");
            
            // Optimized single query with CTEs instead of multiple queries
            const analyticsQuery = `
                WITH project_stats AS (
                    SELECT 
                        COUNT(*) FILTER (WHERE is_public = true) as total_projects,
                        COUNT(*) FILTER (WHERE is_for_sale = true AND is_public = true) as projects_for_sale
                    FROM projects
                ),
                user_stats AS (
                    SELECT COUNT(*) as total_users FROM users WHERE is_test=false AND COALESCE(is_admin,false)=false
                ),
                sales_stats AS (
                    SELECT 
                        COUNT(*) as successful_sales,
                        COALESCE(SUM(t.amount), 0) as total_volume
                    FROM project_transactions t
                    WHERE t.status='completed' AND t.escrow_released=true AND t.transfer_completed=true AND t.escrow_status='released'
                    AND NOT EXISTS (SELECT 1 FROM users WHERE is_test=true AND user_id IN (t.buyer_id,t.seller_id))
                )
                SELECT 
                    ps.total_projects,
                    ps.projects_for_sale,
                    us.total_users,
                    ss.successful_sales,
                    ss.total_volume
                FROM project_stats ps
                CROSS JOIN user_stats us
                CROSS JOIN sales_stats ss
            `;
            
            const { rows } = await db.query(analyticsQuery);
            
            res.json({
                totalProjects: parseInt(rows[0].total_projects) || 0,
                projectsForSale: parseInt(rows[0].projects_for_sale) || 0,
                totalUsers: parseInt(rows[0].total_users) || 0,
                successfulSales: parseInt(rows[0].successful_sales) || 0,
                totalVolume: parseFloat(rows[0].total_volume) || 0
            });
        } catch (err) {
            console.error("[PUBLIC API] Get marketplace analytics error:", err.message);
            res.status(500).json({ error: 'Server error fetching marketplace analytics' });
        }
    }
);

// --- Trending Projects (computed from real engagement) ---
// GET /api/public/trending
// Score = engagement (views + 5x interest) decayed by listing age, so new
// projects with momentum outrank stale high-view ones.
router.get('/trending',
    async (req, res) => {
        try {
            const { limit } = getPagination({ limit: req.query.limit ?? 12 });

            const ageInDays = db.dialect === 'sqlite'
                ? "MAX(julianday('now') - julianday(p.created_at), 0)"
                : 'GREATEST(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400, 0)';

            const result = await db.query(
                `SELECT
                    p.project_id, p.name, p.description, p.stage, p.category,
                    p.sale_price, p.is_for_sale, p.is_on_hold, p.thumbnail_url,
                    p.monthly_revenue, p.monthly_users, p.view_count, p.interest_count,
                    p.created_at, p.owner_id, u.username AS owner_username,
                    ROUND(
                        (COALESCE(p.view_count, 0) + COALESCE(p.interest_count, 0) * 5)::numeric
                        / POWER(${ageInDays} + 2, 1.2),
                        2
                    ) AS trending_score
                 FROM projects p
                 JOIN users u ON p.owner_id = u.user_id
                 WHERE p.is_public = true
                 ORDER BY trending_score DESC, p.created_at DESC
                 LIMIT $1`,
                [limit]
            );

            res.json({ data: result.rows });
        } catch (err) {
            console.error('[PUBLIC API] Get trending error:', err.message);
            res.status(500).json({ error: 'Server error fetching trending projects' });
        }
    }
);

// --- Get User Count for Signup Page ---
// GET /api/public/user-count
router.get('/user-count',
    async (req, res) => {
        try {
            console.log('[PUBLIC API] Fetching user count');
            
            const result = await db.query(
                `SELECT COUNT(*) as count FROM users WHERE is_test=false AND COALESCE(is_admin,false)=false`
            );
            
            const count = parseInt(result.rows[0].count);
            
            res.json({
                count: count
            });
        } catch (err) {
            console.error('[PUBLIC API] Get user count error:', err.message);
            res.status(500).json({ error: 'Server error fetching user count' });
        }
    }
);

module.exports = router;
