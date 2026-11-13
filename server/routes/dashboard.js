const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/dashboard - Get dashboard data for authenticated user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Get real dashboard statistics from database
        console.log(`[Dashboard] Fetching data for user: ${userId}`);
        const stats = await getUserDashboardStats(userId);
        const recentProjects = await getUserRecentProjects(userId);
        const recentActivity = await getUserRecentActivity(userId);
        
        console.log(`[Dashboard] Stats:`, stats);
        console.log(`[Dashboard] Found ${recentProjects.length} recent projects`);

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
    // Single consolidated query — fewer DB round-trips, no user_id column bug
    const statsResult = await db.query(
        `SELECT
            COUNT(p.project_id)                                      AS total_projects,
            COALESCE(SUM(CASE WHEN p.is_for_sale THEN p.sale_price ELSE 0 END), 0) AS portfolio_value,
            COALESCE(SUM(p.view_count), 0)                           AS total_views,
            COALESCE(SUM(p.interest_count), 0)                       AS total_interest
         FROM projects p
         WHERE p.owner_id = $1`,
        [userId]
    );

    const requestResult = await db.query(
        `SELECT
            COUNT(*) FILTER (WHERE seller_id = $1 AND status NOT IN (
                'completed','seller_rejected','buyer_withdrew_interest','transfer_completed_buyer_confirmed'
            ))                                                        AS active_offers,
            COUNT(*) FILTER (WHERE seller_id = $1 AND status IN (
                'completed','transfer_completed_buyer_confirmed'
            ))                                                        AS completed_sales,
            COUNT(*) FILTER (WHERE seller_id = $1)                   AS interest_received,
            COUNT(*) FILTER (WHERE buyer_id = $1 AND status IN (
                'completed','transfer_completed_buyer_confirmed'
            ))                                                        AS purchases_made,
            COALESCE(SUM(CASE WHEN seller_id = $1 AND status IN (
                'completed','transfer_completed_buyer_confirmed'
            ) THEN price ELSE 0 END), 0)                              AS total_revenue
         FROM purchase_requests
         WHERE seller_id = $1 OR buyer_id = $1`,
        [userId]
    );

    const notifResult = await db.query(
        `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = $1 AND is_read = false`,
        [userId]
    );

    const s = statsResult.rows[0] || {};
    const r = requestResult.rows[0] || {};
    const totalProjects = Number(s.total_projects || 0);
    const totalViews    = Number(s.total_views || 0);

    return {
        totalProjects,
        portfolioValue:       Number(s.portfolio_value || 0),
        activeOffers:         Number(r.active_offers || 0),
        completedSales:       Number(r.completed_sales || 0),
        totalViews,
        averageViews:         totalProjects > 0 ? Math.round(totalViews / totalProjects) : 0,
        interestReceived:     Number(r.interest_received || 0),
        purchasesMade:        Number(r.purchases_made || 0),
        totalRevenue:         Number(r.total_revenue || 0),
        unreadNotifications:  Number(notifResult.rows[0]?.unread || 0)
    };
}

// Helper function to get user's recent projects
async function getUserRecentProjects(userId) {
    try {
        const result = await db.query(
            `SELECT project_id AS id, name, description, sale_price AS price, stage AS status, created_at
             FROM projects
             WHERE owner_id = $1
             ORDER BY created_at DESC
             LIMIT 5`,
            [userId]
        );
        return result.rows.map(p => ({
            id: p.id,
            project_id: p.id,
            name: p.name,
            description: p.description || '',
            price: p.price || 0,
            status: p.status || 'draft',
            created_at: p.created_at
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
             WHERE user_id = $1
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
