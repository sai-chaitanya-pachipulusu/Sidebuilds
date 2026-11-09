const express = require('express');
const router = express.Router();
const { param, validationResult } = require('express-validator');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const { createNotification } = require('../services/notificationService');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({ field: err.path, message: err.msg }))
        });
    }
    next();
};

// GET /api/follows/following — users the current user follows
router.get('/following', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT u.user_id, u.username, u.avatar_url, u.bio, f.created_at AS followed_at
             FROM user_follows f
             JOIN users u ON f.following_id = u.user_id
             WHERE f.follower_id = $1
             ORDER BY f.created_at DESC`,
            [req.user.user_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching following list:', err.message);
        res.status(500).json({ error: 'Failed to fetch following list' });
    }
});

// GET /api/follows/status/:userId — follower count + whether current user follows them
router.get('/status/:userId',
    authMiddleware,
    [param('userId').isUUID().withMessage('Invalid user ID')],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { userId } = req.params;
            const counts = await db.query(
                `SELECT
                    (SELECT COUNT(*)::int FROM user_follows WHERE following_id = $1) AS follower_count,
                    EXISTS(SELECT 1 FROM user_follows WHERE following_id = $1 AND follower_id = $2) AS is_following`,
                [userId, req.user.user_id]
            );
            res.json(counts.rows[0]);
        } catch (err) {
            console.error('Error fetching follow status:', err.message);
            res.status(500).json({ error: 'Failed to fetch follow status' });
        }
    }
);

// POST /api/follows/:userId — follow a user
router.post('/:userId',
    authMiddleware,
    [param('userId').isUUID().withMessage('Invalid user ID')],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { userId } = req.params;
            const followerId = req.user.user_id;

            if (userId === followerId) {
                return res.status(400).json({ error: 'You cannot follow yourself.' });
            }

            const target = await db.query('SELECT user_id FROM users WHERE user_id = $1', [userId]);
            if (target.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const inserted = await db.query(
                `INSERT INTO user_follows (follower_id, following_id)
                 VALUES ($1, $2)
                 ON CONFLICT DO NOTHING RETURNING following_id`,
                [followerId, userId]
            );

            try {
                if (inserted.rows.length > 0) await createNotification(
                    userId,
                    'new_follower',
                    `${req.user.username || 'Someone'} started following you.`,
                    `/profile/${followerId}`
                );
            } catch (notifyErr) {
                console.error('Follow notification failed:', notifyErr.message);
            }

            res.status(201).json({ following: true, user_id: userId });
        } catch (err) {
            console.error('Error following user:', err.message);
            res.status(500).json({ error: 'Failed to follow user' });
        }
    }
);

// DELETE /api/follows/:userId — unfollow
router.delete('/:userId',
    authMiddleware,
    [param('userId').isUUID().withMessage('Invalid user ID')],
    handleValidationErrors,
    async (req, res) => {
        try {
            await db.query(
                'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2',
                [req.user.user_id, req.params.userId]
            );
            res.json({ following: false, user_id: req.params.userId });
        } catch (err) {
            console.error('Error unfollowing user:', err.message);
            res.status(500).json({ error: 'Failed to unfollow user' });
        }
    }
);

// Notify a seller's followers about a new public listing.
// Called from the projects route after creation (best-effort).
const notifyFollowersOfNewListing = async (sellerId, sellerUsername, project) => {
    try {
        const followers = await db.query(
            'SELECT follower_id FROM user_follows WHERE following_id = $1',
            [sellerId]
        );
        for (const row of followers.rows) {
            try {
                await createNotification(
                    row.follower_id,
                    'followed_seller_new_project',
                    `${sellerUsername || 'A seller you follow'} listed a new project: "${project.name}".`,
                    `/projects/${project.project_id}`
                );
            } catch (e) {
                // best-effort per follower
            }
        }
    } catch (err) {
        console.error('Failed to notify followers of new listing:', err.message);
    }
};

module.exports = router;
module.exports.notifyFollowersOfNewListing = notifyFollowersOfNewListing;
