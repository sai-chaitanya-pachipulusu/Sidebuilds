const express = require('express');
const db = require('../db');

const router = express.Router();

// --- READ Publicly Shared Projects ---
// GET /api/public/projects
router.get('/projects', async (req, res) => {
    try {
        // Select public projects and join with users table to get username
        // Only select fields safe for public display
        const publicProjects = await db.query(
            `SELECT 
                p.project_id, p.name, p.description, p.stage, p.domain, 
                p.updated_at, u.username AS owner_username 
             FROM projects p 
             JOIN users u ON p.owner_id = u.user_id 
             WHERE p.is_public = TRUE 
             ORDER BY p.updated_at DESC` // Show recently updated ones first
        );
        
        res.json(publicProjects.rows);

    } catch (err) {
        console.error("Get public projects error:", err.message);
        res.status(500).send('Server error fetching public projects.');
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
                COALESCE(p.stage, '') as stage, 
                COALESCE(p.domain, '') as domain, 
                p.sale_price, 
                COALESCE(p.contact_email, '') as contact_email, 
                COALESCE(p.contact_phone, '') as contact_phone, 
                COALESCE(p.payment_method, '') as payment_method,
                p.updated_at, 
                p.owner_id, 
                COALESCE(u.username, 'Anonymous') AS owner_username 
            FROM projects p 
            JOIN users u ON p.owner_id = u.user_id 
            WHERE p.is_for_sale = TRUE AND p.sale_price IS NOT NULL AND p.sale_price > 0
            ORDER BY p.updated_at DESC`
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
                p.project_id, p.name, p.description, p.stage, p.domain,
                p.is_for_sale, p.sale_price, 
                CASE WHEN p.is_for_sale = TRUE THEN p.contact_email ELSE NULL END AS contact_email,
                CASE WHEN p.is_for_sale = TRUE THEN p.contact_phone ELSE NULL END AS contact_phone,
                CASE WHEN p.is_for_sale = TRUE THEN p.payment_method ELSE NULL END AS payment_method,
                p.updated_at, p.created_at, u.username AS owner_username
             FROM projects p
             JOIN users u ON p.owner_id = u.user_id
             WHERE p.project_id = $1 AND (p.is_public = TRUE OR p.is_for_sale = TRUE)`,
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

// Add other public routes here if needed (e.g., view single public project?)

module.exports = router; 