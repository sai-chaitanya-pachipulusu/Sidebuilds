const express = require('express');
const db = require('../db');

const router = express.Router();

// --- READ Publicly Shared Projects ---
// GET /api/public/projects
router.get('/projects', async (req, res) => {
    try {
        console.log('[PUBLIC API] Request received for /projects');
        
        // Select public projects and join with users table to get username
        const publicProjects = await db.query(
            `SELECT 
                p.project_id, p.name, p.description, p.stage,
                p.domain, p.demo_url, p.github_url, p.tech_stack, p.monthly_revenue,
                p.view_count, p.is_on_hold,
                p.updated_at, u.username AS owner_username 
             FROM projects p 
             JOIN users u ON p.owner_id = u.user_id 
             WHERE p.is_public = true
             ORDER BY p.updated_at DESC`
        );
        
        res.json(publicProjects.rows);

    } catch (err) {
        console.error("[PUBLIC API] Get public projects error:", err.message);
        res.status(500).json({ error: 'Server error fetching public projects' });
    }
});

// --- READ Projects Listed for Sale (Marketplace) ---
// GET /api/public/marketplace
router.get('/marketplace', async (req, res) => {
    try {
        console.log("Fetching marketplace projects");
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
                COALESCE(p.is_on_hold, false) as is_on_hold,
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
            ORDER BY p.created_at DESC`
        );
        
        res.json(marketplaceProjects.rows);
    } catch (err) {
        console.error("Get marketplace projects error:", err.message);
        res.status(500).json({ error: 'Server error fetching marketplace projects' });
    }
});

// --- Get Single Public Project Details ---
router.get('/projects/:id', async (req, res) => {
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
                CASE WHEN p.is_for_sale = true THEN p.payment_method ELSE NULL END AS payment_method,
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
        console.error("Get public project details error:", err.message);
        res.status(500).json({ error: 'Server error fetching project details.' });
    }
});

// GET /api/public/stats/marketplace
router.get('/stats/marketplace', async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM projects WHERE is_public = true) as projects_count,
                (SELECT COUNT(*) FROM projects WHERE is_for_sale = true AND sale_price > 0) as active_listings,
                (SELECT COUNT(*) FROM users) as users_count,
                (SELECT COUNT(*) FROM purchase_requests WHERE status = 'transfer_completed_buyer_confirmed') as completed_sales
        `;
        const { rows } = await db.query(statsQuery);
        res.json(rows[0]);
    } catch (err) {
        console.error("Get marketplace stats error:", err.message);
        res.status(500).json({ error: 'Server error fetching stats.' });
    }
});

// GET /api/public/marketplace/analytics
router.get('/marketplace/analytics', async (req, res) => {
    try {
        console.log("Fetching marketplace analytics");
        
        // Parallel queries for performance
        const results = await Promise.all([
            // Total Active Projects (Public)
            db.query('SELECT COUNT(*) FROM projects WHERE is_public = true'),
            
            // Projects For Sale
            db.query('SELECT COUNT(*) FROM projects WHERE is_for_sale = true AND is_public = true'),
            
            // Total Active Users
            db.query('SELECT COUNT(*) FROM users'),
            
            // Successful Sales (transfer_completed_buyer_confirmed or completed)
            db.query("SELECT COUNT(*) FROM purchase_requests WHERE status IN ('transfer_completed_buyer_confirmed', 'completed')"),
            
            // Total Volume (Sum of sale prices for completed transactions)
            db.query(`
                SELECT COALESCE(SUM(p.sale_price), 0) as total_volume 
                FROM purchase_requests pr 
                JOIN projects p ON pr.project_id = p.project_id 
                WHERE pr.status IN ('transfer_completed_buyer_confirmed', 'completed')
            `)
        ]);

        const totalProjects = parseInt(results[0].rows[0].count) || 0;
        const projectsForSale = parseInt(results[1].rows[0].count) || 0;
        const totalUsers = parseInt(results[2].rows[0].count) || 0;
        const successfulSales = parseInt(results[3].rows[0].count) || 0;
        const totalVolume = parseFloat(results[4].rows[0].total_volume) || 0;

        res.json({
            totalProjects,
            projectsForSale,
            totalUsers,
            successfulSales,
            totalVolume
        });
    } catch (err) {
        console.error("Get marketplace analytics error:", err.message);
        res.status(500).json({ error: 'Server error fetching marketplace analytics' });
    }
});

module.exports = router;