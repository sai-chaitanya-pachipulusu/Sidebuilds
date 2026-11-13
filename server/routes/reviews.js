const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
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

// Statuses that prove the reviewer actually paid for the project
const PURCHASED_STATUSES = ['payment_completed_pending_transfer', 'transfer_completed_buyer_confirmed'];

// GET /api/reviews/seller/:sellerId — seller's reviews + aggregate rating
router.get('/seller/:sellerId',
    [param('sellerId').isUUID().withMessage('Invalid seller ID')],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { sellerId } = req.params;
            const reviews = await db.query(
                `SELECT r.review_id, r.project_id, r.rating, r.title, r.comment,
                        r.is_verified_purchase, r.created_at,
                        u.username AS reviewer_username, u.avatar_url AS reviewer_avatar,
                        p.name AS project_name
                 FROM project_reviews r
                 JOIN users u ON r.reviewer_id = u.user_id
                 LEFT JOIN projects p ON r.project_id = p.project_id
                 WHERE r.seller_id = $1
                 ORDER BY r.created_at DESC
                 LIMIT 50`,
                [sellerId]
            );
            const aggregate = await db.query(
                `SELECT COUNT(*)::int AS review_count, COALESCE(ROUND(AVG(rating), 1), 0)::float AS average_rating
                 FROM project_reviews WHERE seller_id = $1`,
                [sellerId]
            );
            res.json({
                reviews: reviews.rows,
                summary: aggregate.rows[0]
            });
        } catch (err) {
            console.error('Error fetching seller reviews:', err.message);
            res.status(500).json({ error: 'Failed to fetch reviews' });
        }
    }
);

// GET /api/reviews/project/:projectId — reviews for one project
router.get('/project/:projectId',
    [param('projectId').isUUID().withMessage('Invalid project ID')],
    handleValidationErrors,
    async (req, res) => {
        try {
            const reviews = await db.query(
                `SELECT r.review_id, r.rating, r.title, r.comment,
                        r.is_verified_purchase, r.created_at,
                        u.username AS reviewer_username, u.avatar_url AS reviewer_avatar
                 FROM project_reviews r
                 JOIN users u ON r.reviewer_id = u.user_id
                 WHERE r.project_id = $1
                 ORDER BY r.created_at DESC
                 LIMIT 50`,
                [req.params.projectId]
            );
            res.json(reviews.rows);
        } catch (err) {
            console.error('Error fetching project reviews:', err.message);
            res.status(500).json({ error: 'Failed to fetch reviews' });
        }
    }
);

// POST /api/reviews — leave a review (verified buyers only)
router.post('/',
    authMiddleware,
    [
        body('project_id').isUUID().withMessage('Invalid project ID'),
        body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
        body('title').optional().trim().isLength({ max: 150 }).withMessage('Title too long').escape(),
        body('comment').optional().trim().isLength({ max: 3000 }).withMessage('Comment too long')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { project_id, rating, title, comment } = req.body;
            const reviewerId = req.user.user_id;

            // Guardrail: only buyers who actually paid can review
            const purchase = await db.query(
                `SELECT t.seller_id FROM project_transactions t
                 WHERE t.project_id = $1 AND t.buyer_id = $2
                   AND t.status='completed' AND t.transfer_completed=true AND t.escrow_released=true AND t.escrow_status='released'
                 LIMIT 1`,
                [project_id, reviewerId]
            );

            if (purchase.rows.length === 0) {
                return res.status(403).json({
                    error: 'Only verified buyers can review a project after completing a purchase.'
                });
            }

            const sellerId = purchase.rows[0].seller_id;

            // One review per buyer per project
            const existing = await db.query(
                'SELECT review_id FROM project_reviews WHERE project_id = $1 AND reviewer_id = $2',
                [project_id, reviewerId]
            );
            if (existing.rows.length > 0) {
                return res.status(409).json({ error: 'You have already reviewed this project.' });
            }

            const inserted = await db.query(
                `INSERT INTO project_reviews
                    (project_id, reviewer_id, seller_id, rating, title, comment, is_verified_purchase)
                 VALUES ($1, $2, $3, $4, $5, $6, true)
                 RETURNING review_id, rating, title, comment, is_verified_purchase, created_at`,
                [project_id, reviewerId, sellerId, rating, title || null, comment || null]
            );

            try {
                await createNotification(
                    sellerId,
                    'new_review',
                    `You received a ${rating}-star review from a verified buyer.`,
                    `/profile/${sellerId}`
                );
            } catch (notifyErr) {
                console.error('Review notification failed:', notifyErr.message);
            }

            res.status(201).json(inserted.rows[0]);
        } catch (err) {
            console.error('Error creating review:', err.message);
            res.status(500).json({ error: 'Failed to create review' });
        }
    }
);

module.exports = router;
