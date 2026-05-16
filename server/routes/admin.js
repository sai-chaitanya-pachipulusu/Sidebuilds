const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');
const db = require('../db');

const router = express.Router();

router.use(authMiddleware, requireAdmin);

const toNumber = (value) => Number(value || 0);

router.get('/stats', async (req, res) => {
  try {
    const [users, projects, activeListings, purchaseRequests, failedPayments] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM users'),
      db.query('SELECT COUNT(*) as count FROM projects'),
      db.query('SELECT COUNT(*) as count FROM projects WHERE is_for_sale = true AND is_public = true'),
      db.query('SELECT COUNT(*) as count FROM purchase_requests'),
      db.query("SELECT COUNT(*) as count FROM purchase_requests WHERE status = 'payment_failed'")
    ]);

    res.json({
      users: toNumber(users.rows?.[0]?.count),
      projects: toNumber(projects.rows?.[0]?.count),
      activeListings: toNumber(activeListings.rows?.[0]?.count),
      purchaseRequests: toNumber(purchaseRequests.rows?.[0]?.count),
      failedPayments: toNumber(failedPayments.rows?.[0]?.count)
    });
  } catch (error) {
    console.error('Admin stats error:', error.message);
    res.status(500).json({ message: 'Failed to load admin stats.' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT user_id, username, email, first_name, last_name, is_admin, is_verified,
              verification_level, created_at, updated_at
       FROM users
       ORDER BY created_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Admin users error:', error.message);
    res.status(500).json({ message: 'Failed to load users.' });
  }
});

router.get('/projects', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.project_id, p.name, p.stage, p.is_public, p.is_for_sale, p.sale_price,
              p.monthly_revenue, p.created_at, p.updated_at, u.username AS owner_username
       FROM projects p
       LEFT JOIN users u ON p.owner_id = u.user_id
       ORDER BY p.updated_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Admin projects error:', error.message);
    res.status(500).json({ message: 'Failed to load projects.' });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT pr.id, pr.project_id, p.name AS project_name, pr.buyer_id, pr.seller_id,
              pr.status, pr.price, pr.stripe_session_id, pr.created_at, pr.updated_at
       FROM purchase_requests pr
       LEFT JOIN projects p ON pr.project_id = p.project_id
       ORDER BY pr.updated_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Admin transactions error:', error.message);
    res.status(500).json({ message: 'Failed to load transactions.' });
  }
});

module.exports = router;
