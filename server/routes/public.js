const express = require('express');
const db = require('../db');
const { cache, presets } = require('../middleware/cache');
const { publicLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Apply rate limiting to all public routes
router.use(publicLimiter);

// --- READ Publicly Shared Projects ---
// GET /api/public/projects
router.get('/projects', 
    cache(presets.public),
    async (req, res) => {
        try {
            console.log('[PUBLIC API] Request received for /projects');
            
            // Pagination parameters
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 items
            const offset = (page - 1) * limit;
            
            // Select public projects with pagination
            const publicProjects = await db.query(
                `SELECT 
                    p.project_id, p.name, p.description, p.stage,
                    p.domain, p.demo_url, p.github_url, p.tech_stack, p.monthly_revenue,
                    p.view_count, p.is_on_hold,
                    p.updated_at, u.username AS owner_username 
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
    cache(presets.marketplace),
    async (req, res) => {
        try {
            console.log("[PUBLIC API] Fetching marketplace projects");
            
            // Pagination parameters
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const offset = (page - 1) * limit;
            
            // Sorting parameters
            const allowedSortFields = ['created_at', 'sale_price', 'monthly_revenue', 'view_count', 'overall_score'];
            const sortBy = allowedSortFields.includes(req.query.sortBy) ? req.query.sortBy : 'created_at';
            const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';
            
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
                    p.is_on_hold,
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
                    ai.overall_score,
                    ai.estimated_value as ai_estimated_value,
                    ai.confidence_score as ai_confidence
                FROM projects p 
                JOIN users u ON p.owner_id = u.user_id 
                LEFT JOIN ai_project_analysis ai ON p.project_id = ai.project_id
                WHERE p.is_for_sale = true AND p.is_public = true
                ORDER BY ${sortBy} ${sortOrder}
                LIMIT $1 OFFSET $2`,
                [limit, offset]
            );
            
            // Get total count
            const countResult = await db.query(
                `SELECT COUNT(*) as total 
                 FROM projects 
                 WHERE is_for_sale = true AND is_public = true`
            );
            const total = parseInt(countResult.rows[0].total);
            
            res.json({
                data: marketplaceProjects.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasMore: page * limit < total
                }
            });
        } catch (err) {
            console.error("[PUBLIC API] Get marketplace projects error:", err.message);
            res.status(500).json({ error: 'Server error fetching marketplace projects' });
        }
    }
);

// --- Get Single Public Project Details ---
router.get('/projects/:id',
    cache({ ...presets.medium, keyGenerator: (req) => `project:${req.params.id}` }),
    async (req, res) => {
        const projectId = req.params.id;

        try {
            const projectDetails = await db.query(
                `SELECT 
                    p.project_id, p.name, p.description, p.stage,
                    p.domain, p.demo_url, p.github_url, p.tech_stack, p.tags, p.monthly_revenue,
                    p.view_count, p.is_on_hold,
                    p.is_for_sale, p.sale_price, 
                    CASE WHEN p.is_for_sale = true THEN p.contact_email ELSE NULL END AS contact_email,
                    CASE WHEN p.is_for_sale = true THEN p.contact_phone ELSE NULL END AS contact_phone,
                    CASE WHEN p.is_for_sale = true THEN p.payment_method ELSE NULL END AS contact_payment_method,
                    p.updated_at, p.created_at, u.username AS owner_username, p.owner_id
                 FROM projects p
                 JOIN users u ON p.owner_id = u.user_id
                 WHERE p.project_id = $1 AND (p.is_public = true OR p.is_for_sale = true)`,
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

            res.json(project);
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
                        COUNT(*) FILTER (WHERE is_for_sale = true AND sale_price > 0) as active_listings
                    FROM projects
                ),
                user_stats AS (
                    SELECT COUNT(*) as users_count FROM users
                ),
                sales_stats AS (
                    SELECT COUNT(*) as completed_sales 
                    FROM purchase_requests 
                    WHERE status = 'transfer_completed_buyer_confirmed'
                )
                SELECT 
                    s.projects_count,
                    s.active_listings,
                    u.users_count,
                    ss.completed_sales
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
                    SELECT COUNT(*) as total_users FROM users
                ),
                sales_stats AS (
                    SELECT 
                        COUNT(*) as successful_sales,
                        COALESCE(SUM(p.sale_price), 0) as total_volume
                    FROM purchase_requests pr 
                    JOIN projects p ON pr.project_id = p.project_id 
                    WHERE pr.status IN ('transfer_completed_buyer_confirmed', 'completed')
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

module.exports = router;
