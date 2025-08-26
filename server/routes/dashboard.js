const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/dashboard - Get dashboard data for authenticated user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user's projects count
        const projectsCount = await db.query(
            'SELECT COUNT(*) as count FROM projects WHERE user_id = $1',
            [userId]
        );
        
        // Get user's total revenue from projects
        const revenueQuery = await db.query(
            'SELECT COALESCE(SUM(price), 0) as total_revenue FROM projects WHERE user_id = $1 AND status = $2',
            [userId, 'sold']
        );
        
        // Get recent notifications count
        const notificationsCount = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = 0',
            [userId]
        );
        
        // Get recent projects
        const recentProjects = await db.query(
            'SELECT id, title, description, price, status, created_at FROM projects WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
            [userId]
        );
        
        // Get purchase requests for user's projects
        const purchaseRequests = await db.query(
            'SELECT COUNT(*) as count FROM project_purchase_requests ppr JOIN projects p ON ppr.project_id = p.id WHERE p.user_id = $1 AND ppr.status = $2',
            [userId, 'pending']
        );

        const dashboardData = {
            stats: {
                totalProjects: parseInt(projectsCount.rows[0].count),
                totalRevenue: parseFloat(revenueQuery.rows[0].total_revenue || 0),
                unreadNotifications: parseInt(notificationsCount.rows[0].count),
                pendingRequests: parseInt(purchaseRequests.rows[0].count)
            },
            recentProjects: recentProjects.rows,
            user: {
                id: userId,
                name: req.user.username || req.user.email
            }
        };
        
        res.json(dashboardData);
    } catch (err) {
        console.error('Dashboard error:', err.message);
        res.status(500).json({ error: 'Failed to fetch dashboard data.' });
    }
});

module.exports = router;