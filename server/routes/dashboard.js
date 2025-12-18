const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/dashboard/demo - Get demo dashboard data (no auth required)
router.get('/demo', async (req, res) => {
    try {
        // Return demo data for testing purposes
        const dashboardData = {
            stats: {
                totalProjects: 3, // 3 projects
                portfolioValue: 40000, // $40k portfolio value
                activeOffers: 2, // 2 active offers
                completedSales: 2, // 2 completed sales
                totalViews: 306, // 306 total views
                averageViews: 102, // 102 average views per project
                interestReceived: 4, // 4 interests received
                purchasesMade: 1, // 1 purchase made
                totalRevenue: 50000, // $50k total revenue
                unreadNotifications: 2 // 2 unread notifications
            },
            recentProjects: [
                {
                    id: 'demo-proj-1',
                    name: 'AI Task Manager',
                    description: 'Smart task management with AI prioritization',
                    price: 15000,
                    status: 'mvp',
                    created_at: '2025-09-15T10:00:00Z'
                },
                {
                    id: 'demo-proj-2',
                    name: 'E-commerce Analytics',
                    description: 'Real-time analytics dashboard for online stores',
                    price: 25000,
                    status: 'launched',
                    created_at: '2025-08-10T14:30:00Z'
                },
                {
                    id: 'demo-proj-3',
                    name: 'Code Review Bot',
                    description: 'Automated code review assistant using AI',
                    price: 0,
                    status: 'development',
                    created_at: '2025-09-01T09:15:00Z'
                }
            ],
            user: {
                id: 'demo-user-1',
                name: 'John Maker'
            }
        };

        res.json(dashboardData);
    } catch (err) {
        console.error('Demo dashboard error:', err.message);
        res.status(500).json({ error: 'Failed to fetch demo dashboard data.' });
    }
});

// GET /api/dashboard - Get dashboard data for authenticated user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Get real dashboard statistics from database
        const stats = await getUserDashboardStats(userId);
        const recentProjects = await getUserRecentProjects(userId);
        const recentActivity = await getUserRecentActivity(userId);

        const dashboardData = {
            stats,
            recentProjects,
            recentActivity,
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

// Helper function to get user dashboard statistics
async function getUserDashboardStats(userId) {
    try {
        // Get total projects count
        const projectsResult = await db.query(
            'SELECT COUNT(*) as count FROM projects WHERE owner_id = ?',
            [userId]
        );

        // Get portfolio value (sum of sale prices for projects for sale)
        const portfolioResult = await db.query(
            'SELECT COALESCE(SUM(sale_price), 0) as total FROM projects WHERE owner_id = ? AND is_for_sale = 1',
            [userId]
        );

        // Get active offers (pending purchase requests where user is seller)
        const offersResult = await db.query(
            `SELECT COUNT(*) as count FROM purchase_requests WHERE seller_id = ? AND status NOT IN ('completed', 'seller_rejected', 'buyer_withdrew_interest', 'transfer_completed_buyer_confirmed')`,
            [userId]
        );

        // Get completed sales (completed purchase requests where user is seller)
        const salesResult = await db.query(
            `SELECT COUNT(*) as count FROM purchase_requests WHERE seller_id = ? AND status = 'completed'`,
            [userId]
        );

        // Get total views across all user projects
        const viewsResult = await db.query(
            'SELECT COALESCE(SUM(view_count), 0) as total FROM projects WHERE owner_id = ?',
            [userId]
        );

        // Get average views per project
        const totalProjects = projectsResult.rows[0]?.count || 0;
        const totalViews = viewsResult.rows[0]?.total || 0;
        const averageViews = totalProjects > 0 ? Math.round(totalViews / totalProjects) : 0;

        // Get interest received (purchase requests where user is seller)
        const interestResult = await db.query(
            'SELECT COUNT(*) as count FROM purchase_requests WHERE seller_id = ?',
            [userId]
        );

        // Get purchases made (purchase requests where user is buyer)
        const purchasesResult = await db.query(
            `SELECT COUNT(*) as count FROM purchase_requests WHERE buyer_id = ? AND status = 'completed'`,
            [userId]
        );

        // Get total revenue (sum of completed sales)
        const revenueResult = await db.query(
            `SELECT COALESCE(SUM(price), 0) as total FROM purchase_requests WHERE seller_id = ? AND status = 'completed'`,
            [userId]
        );

        // Get unread notifications count
        const notificationsResult = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
            [userId]
        );

        return {
            totalProjects: totalProjects,
            portfolioValue: portfolioResult.rows[0]?.total || 0,
            activeOffers: offersResult.rows[0]?.count || 0,
            completedSales: salesResult.rows[0]?.count || 0,
            totalViews: totalViews,
            averageViews: averageViews,
            interestReceived: interestResult.rows[0]?.count || 0,
            purchasesMade: purchasesResult.rows[0]?.count || 0,
            totalRevenue: revenueResult.rows[0]?.total || 0,
            unreadNotifications: notificationsResult.rows[0]?.count || 0
        };
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        // Return default values on error to prevent dashboard breaking
        return {
            totalProjects: 0,
            portfolioValue: 0,
            activeOffers: 0,
            completedSales: 0,
            totalViews: 0,
            averageViews: 0,
            interestReceived: 0,
            purchasesMade: 0,
            totalRevenue: 0,
            unreadNotifications: 0
        };
    }
}

// Helper function to get user's recent projects
async function getUserRecentProjects(userId) {
    try {
        const result = await db.query(
            `SELECT project_id as id, name, description, sale_price as price, stage as status, created_at
             FROM projects
             WHERE owner_id = ?
             ORDER BY created_at DESC
             LIMIT 3`,
            [userId]
        );

        return result.rows.map(project => ({
            id: project.id,
            name: project.name,
            description: project.description || '',
            price: project.price || 0,
            status: project.status || 'draft',
            created_at: project.created_at
        }));
    } catch (error) {
        console.error('Error fetching recent projects:', error);
        return [];
    }
}

// Helper function to get user's recent activity
async function getUserRecentActivity(userId) {
    try {
        // Get recent notifications as activity
        const notificationsResult = await db.query(
            `SELECT notification_id, type, title, message, created_at, is_read, related_project_id
             FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 5`,
            [userId]
        );

        return notificationsResult.rows.map(notification => ({
            id: notification.notification_id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            time: notification.created_at,
            status: notification.is_read ? 'read' : 'unread',
            project_id: notification.related_project_id
        }));
    } catch (error) {
        console.error('Error fetching recent activity:', error);
        return [];
    }
}

module.exports = router;