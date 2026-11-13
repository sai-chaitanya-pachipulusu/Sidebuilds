const db = require('../db');

const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.user_id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const result = await db.query(
      'SELECT is_admin FROM users WHERE user_id = $1',
      [userId]
    );

    const user = result.rows?.[0];
    const isAdmin = user?.is_admin === true || user?.is_admin === 1 || user?.is_admin === '1';

    if (!isAdmin) {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    req.user.is_admin = true;
    next();
  } catch (error) {
    console.error('Admin authorization error:', error.message);
    res.status(500).json({ message: 'Failed to verify admin access.' });
  }
};

module.exports = requireAdmin;
