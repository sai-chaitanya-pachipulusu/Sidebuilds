const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/certificates/:certificateId
// Get certificate by ID (protected, must be the seller)
router.get('/:certificateId', authMiddleware, async (req, res) => {
  try {
    const { certificateId } = req.params;
    const userId = req.user.id;
    
    // Query certificate data with related project and transaction details
    const result = await db.query(
      `SELECT 
        c.certificate_id, c.verification_code, c.sale_amount, c.sale_date,
        p.name as project_name,
        s.username as seller_username,
        b.username as buyer_username
      FROM seller_certificates c
      JOIN projects p ON c.project_id = p.project_id
      JOIN users s ON c.seller_id = s.user_id
      JOIN users b ON c.buyer_id = b.user_id
      WHERE c.certificate_id = $1 AND c.seller_id = $2`,
      [certificateId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({ error: 'Failed to fetch certificate' });
  }
});

// GET /api/certificates/verify/:verificationCode
// Verify a certificate by verification code (public)
router.get('/verify/:verificationCode', async (req, res) => {
  try {
    const { verificationCode } = req.params;
    
    // Query certificate data with related project and transaction details
    const result = await db.query(
      `SELECT 
        c.certificate_id, c.sale_amount, c.sale_date,
        p.name as project_name,
        s.username as seller_username,
        b.username as buyer_username
      FROM seller_certificates c
      JOIN projects p ON c.project_id = p.project_id
      JOIN users s ON c.seller_id = s.user_id
      JOIN users b ON c.buyer_id = b.user_id
      WHERE c.verification_code = $1`,
      [verificationCode]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid verification code' });
    }
    
    // Record that this certificate was verified
    await db.query(
      'UPDATE seller_certificates SET verified_at = NOW() WHERE verification_code = $1',
      [verificationCode]
    );
    
    res.json({
      verified: true,
      certificate: result.rows[0]
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({ error: 'Failed to verify certificate' });
  }
});

// GET /api/certificates/seller/:userId
// Get all certificates for a seller (protected, must be the seller)
router.get('/seller/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.id;
    
    // Only allow sellers to view their own certificates
    if (userId !== requesterId) {
      return res.status(403).json({ error: 'You can only view your own certificates' });
    }
    
    // Query all certificates for this seller
    const result = await db.query(
      `SELECT 
        c.certificate_id, c.verification_code, c.sale_amount, c.sale_date,
        p.name as project_name,
        s.username as seller_username,
        b.username as buyer_username
      FROM seller_certificates c
      JOIN projects p ON c.project_id = p.project_id
      JOIN users s ON c.seller_id = s.user_id
      JOIN users b ON c.buyer_id = b.user_id
      WHERE c.seller_id = $1
      ORDER BY c.sale_date DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching seller certificates:', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

module.exports = router; 