const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// --- Saved projects (watchlist) ---

// GET /api/saves — current user's saved projects with listing info
router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT p.project_id, p.name, p.description, p.stage, p.category,
                    p.sale_price, p.price_negotiable, p.is_for_sale, p.is_on_hold,
                    p.monthly_revenue, p.monthly_users, p.view_count, p.thumbnail_url,
                    p.owner_id, u.username AS owner_username,
                    s.created_at AS saved_at
             FROM project_saves s
             JOIN projects p ON s.project_id = p.project_id
             JOIN users u ON p.owner_id = u.user_id
             WHERE s.user_id = $1 AND p.is_public = true
             ORDER BY s.created_at DESC`,
            [req.user.user_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching saved projects:', err.message);
        res.status(500).json({ error: 'Failed to fetch saved projects' });
    }
});

// GET /api/saves/ids — just the project ids (cheap check for card UIs)
router.get('/ids', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT project_id FROM project_saves WHERE user_id = $1',
            [req.user.user_id]
        );
        res.json(result.rows.map(r => r.project_id));
    } catch (err) {
        console.error('Error fetching saved ids:', err.message);
        res.status(500).json({ error: 'Failed to fetch saved project ids' });
    }
});

// POST /api/saves/:projectId — save a project
router.post('/:projectId', authMiddleware, async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await db.query(
            'SELECT project_id FROM projects WHERE project_id = $1 AND is_public = true',
            [projectId]
        );
        if (project.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        await db.query(
            `INSERT INTO project_saves (user_id, project_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [req.user.user_id, projectId]
        );
        res.status(201).json({ saved: true, project_id: projectId });
    } catch (err) {
        console.error('Error saving project:', err.message);
        res.status(500).json({ error: 'Failed to save project' });
    }
});

// DELETE /api/saves/:projectId — unsave
router.delete('/:projectId', authMiddleware, async (req, res) => {
    try {
        await db.query(
            'DELETE FROM project_saves WHERE user_id = $1 AND project_id = $2',
            [req.user.user_id, req.params.projectId]
        );
        res.json({ saved: false, project_id: req.params.projectId });
    } catch (err) {
        console.error('Error unsaving project:', err.message);
        res.status(500).json({ error: 'Failed to remove saved project' });
    }
});

module.exports = router;
