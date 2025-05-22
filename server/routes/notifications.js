const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/notifications - Fetch all (or unread) notifications for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        // Fetch unread notifications first, then read ones, ordered by creation date
        const query = `
            SELECT * FROM notifications 
            WHERE user_id = $1 
            ORDER BY is_read ASC, created_at DESC;
        `;
        const { rows } = await db.query(query, [userId]);
        res.json(rows);
    } catch (error) {
        console.error(`Error fetching notifications for user ${userId}:`, error);
        res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
});

// POST /api/notifications/:notificationId/mark-read - Mark a specific notification as read
router.post('/:notificationId/mark-read', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { notificationId } = req.params;
    try {
        const query = `
            UPDATE notifications 
            SET is_read = TRUE, updated_at = NOW()
            WHERE notification_id = $1 AND user_id = $2
            RETURNING *;
        `;
        const { rows } = await db.query(query, [notificationId, userId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found or you do not have permission to update it.' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(`Error marking notification ${notificationId} as read for user ${userId}:`, error);
        res.status(500).json({ error: 'Failed to mark notification as read.' });
    }
});

// POST /api/notifications/mark-all-read - Mark all notifications for the user as read
router.post('/mark-all-read', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        const query = `
            UPDATE notifications 
            SET is_read = TRUE, updated_at = NOW()
            WHERE user_id = $1 AND is_read = FALSE
            RETURNING *; 
        `; // Only update those that are unread
        const { rows } = await db.query(query, [userId]);
        // It's okay if rows is empty, means no unread notifications were there to mark.
        res.json({ message: `${rows.length} notifications marked as read.`, updated_count: rows.length, items: rows });
    } catch (error) {
        console.error(`Error marking all notifications as read for user ${userId}:`, error);
        res.status(500).json({ error: 'Failed to mark all notifications as read.' });
    }
});

module.exports = router; 