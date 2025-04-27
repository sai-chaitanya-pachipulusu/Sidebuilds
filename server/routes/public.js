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
             JOIN users u ON p.user_id = u.user_id 
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
        // Select projects for sale and join with users table to get username
        // Only select fields relevant for marketplace view
        const marketplaceProjects = await db.query(
            `SELECT 
                p.project_id, p.name, p.description, p.stage, p.domain, 
                p.sale_price, p.updated_at, u.username AS owner_username 
             FROM projects p 
             JOIN users u ON p.user_id = u.user_id 
             WHERE p.is_for_sale = TRUE AND p.sale_price IS NOT NULL
             ORDER BY p.updated_at DESC`
        );
        
        res.json(marketplaceProjects.rows);

    } catch (err) {
        console.error("Get marketplace projects error:", err.message);
        res.status(500).send('Server error fetching marketplace projects.');
    }
});

// Add other public routes here if needed (e.g., view single public project?)

module.exports = router; 