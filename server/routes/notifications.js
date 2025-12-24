const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/notifications - Fetch all (or unread) notifications for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
    const userId = req.user.user_id;
    try {
        const { limit = 50, unread_only = false } = req.query;

        let query = `
            SELECT notification_id, type, title, message, is_read, priority, action_url, related_project_id, related_transaction_id, created_at
            FROM notifications
            WHERE user_id = ?
        `;

        const params = [userId];

        if (unread_only === 'true') {
            query += ' AND is_read = false';
        }

        query += ' ORDER BY is_read ASC, created_at DESC';

        if (limit) {
            query += ' LIMIT ?';
            params.push(parseInt(limit));
        }

        const result = await db.query(query, params);

        // Enhance notifications with project/transaction details
        const notifications = await Promise.all(
            result.rows.map(async (notification) => {
                const enhancedNotification = { ...notification };

                // Add project details if related_project_id exists
                if (notification.related_project_id) {
                    try {
                        const projectResult = await db.query(
                            'SELECT name, owner_username FROM projects WHERE project_id = ?',
                            [notification.related_project_id]
                        );
                        if (projectResult.rows.length > 0) {
                            enhancedNotification.project_name = projectResult.rows[0].name;
                            enhancedNotification.project_owner = projectResult.rows[0].owner_username;
                        }
                    } catch (error) {
                        console.error('Error fetching project details for notification:', error);
                    }
                }

                // Add transaction details if related_transaction_id exists
                if (notification.related_transaction_id) {
                    try {
                        const transactionResult = await db.query(
                            'SELECT status, price FROM purchase_requests WHERE id = ?',
                            [notification.related_transaction_id]
                        );
                        if (transactionResult.rows.length > 0) {
                            enhancedNotification.transaction_status = transactionResult.rows[0].status;
                            enhancedNotification.transaction_price = transactionResult.rows[0].price;
                        }
                    } catch (error) {
                        console.error('Error fetching transaction details for notification:', error);
                    }
                }

                return enhancedNotification;
            })
        );

        res.json(notifications);
    } catch (error) {
        console.error(`Error fetching notifications for user ${userId}:`, error);
        res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
});

// POST /api/notifications/:notificationId/mark-read - Mark a specific notification as read
router.post('/:notificationId/mark-read', authMiddleware, async (req, res) => {
    const userId = req.user.user_id;
    const { notificationId } = req.params;
    try {
        const query = `
            UPDATE notifications
            SET is_read = true
            WHERE notification_id = ? AND user_id = ?;
        `;
        const result = await db.query(query, [notificationId, userId]);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Notification not found or you do not have permission to update it.' });
        }
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error(`Error marking notification ${notificationId} as read for user ${userId}:`, error);
        res.status(500).json({ error: 'Failed to mark notification as read.' });
    }
});

// POST /api/notifications/mark-all-read - Mark all notifications for the user as read
router.post('/mark-all-read', authMiddleware, async (req, res) => {
    const userId = req.user.user_id;
    try {
        const query = `
            UPDATE notifications 
            SET is_read = true
            WHERE user_id = ? AND is_read = false
        `; // Only update those that are unread
        const { changes } = await db.query(query, [userId]);
        
        res.json({ 
            message: `${changes} notifications marked as read.`, 
            updated_count: changes 
        });
    } catch (error) {
        console.error(`Error marking all notifications as read for user ${userId}:`, error);
        res.status(500).json({ error: 'Failed to mark all notifications as read.' });
    }
});

module.exports = router; 