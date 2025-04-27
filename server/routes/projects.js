const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// === Protect all routes in this file with authMiddleware ===
router.use(authMiddleware);

// --- CREATE Project --- 
// POST /api/projects
router.post('/', async (req, res) => {
    // Extract project data from request body
    // Basic validation - ensure required fields are present
    const { name, description, stage, domain, revenue, user_growth, is_public, is_for_sale, sale_price } = req.body;
    const userId = req.user.id; // Get user ID from authenticated user (added by middleware)

    if (!name) {
        return res.status(400).json({ message: 'Project name is required.' });
    }

    try {
        const newProject = await db.query(
            `INSERT INTO projects 
             (user_id, name, description, stage, domain, revenue, user_growth, is_public, is_for_sale, sale_price, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) 
             RETURNING *`, // Return the newly created project
            [userId, name, description, stage, domain, revenue, user_growth, is_public, is_for_sale, sale_price]
        );

        res.status(201).json(newProject.rows[0]);
    } catch (err) {
        console.error("Create project error:", err.message);
        res.status(500).send('Server error creating project.');
    }
});

// --- READ All Projects (for logged-in user) ---
// GET /api/projects
router.get('/', async (req, res) => {
    const userId = req.user.id;

    try {
        const projects = await db.query(
            'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json(projects.rows);
    } catch (err) {
        console.error("Get projects error:", err.message);
        res.status(500).send('Server error fetching projects.');
    }
});

// --- READ Single Project --- 
// GET /api/projects/:id
router.get('/:id', async (req, res) => {
    const userId = req.user.id;
    const projectId = req.params.id;

    try {
        const project = await db.query(
            'SELECT * FROM projects WHERE project_id = $1 AND user_id = $2',
            [projectId, userId]
        );

        if (project.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found or you do not have permission.' });
        }

        res.json(project.rows[0]);
    } catch (err) {
        console.error("Get single project error:", err.message);
         // Check for invalid input format (e.g., non-integer ID)
        if (err.code === '22P02') { 
            return res.status(400).json({ message: 'Invalid project ID format.' });
        }
        res.status(500).send('Server error fetching project.');
    }
});

// --- UPDATE Project --- 
// PUT /api/projects/:id
router.put('/:id', async (req, res) => {
    const userId = req.user.id;
    const projectId = req.params.id;
    // Extract only the fields allowed to be updated
    const { name, description, stage, domain, revenue, user_growth, is_public, is_for_sale, sale_price } = req.body;

    if (!name) { // Example validation: Ensure name is still present
        return res.status(400).json({ message: 'Project name is required.' });
    }

    try {
        const updatedProject = await db.query(
            `UPDATE projects 
             SET name = $1, description = $2, stage = $3, domain = $4, revenue = $5, user_growth = $6, 
                 is_public = $7, is_for_sale = $8, sale_price = $9, updated_at = NOW() 
             WHERE project_id = $10 AND user_id = $11 
             RETURNING *`, // Return the updated project
            [name, description, stage, domain, revenue, user_growth, is_public, is_for_sale, sale_price, projectId, userId]
        );

        if (updatedProject.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found or you do not have permission to update.' });
        }

        res.json(updatedProject.rows[0]);
    } catch (err) {
        console.error("Update project error:", err.message);
        // Check for invalid input format (e.g., non-integer ID)
        if (err.code === '22P02') { 
            return res.status(400).json({ message: 'Invalid project ID format.' });
        }
        res.status(500).send('Server error updating project.');
    }
});

// --- DELETE Project --- 
// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
    const userId = req.user.id;
    const projectId = req.params.id;

    try {
        const deleteResult = await db.query(
            'DELETE FROM projects WHERE project_id = $1 AND user_id = $2 RETURNING project_id',
            [projectId, userId]
        );

        if (deleteResult.rowCount === 0) {
            // No project found with that ID for this user, or it was already deleted.
            return res.status(404).json({ message: 'Project not found or you do not have permission to delete.' });
        }

        res.json({ message: 'Project deleted successfully.', projectId: deleteResult.rows[0].project_id });

    } catch (err) {
        console.error("Delete project error:", err.message);
         // Check for invalid input format (e.g., non-integer ID)
        if (err.code === '22P02') { 
            return res.status(400).json({ message: 'Invalid project ID format.' });
        }
        res.status(500).send('Server error deleting project.');
    }
});

module.exports = router; 