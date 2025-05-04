const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const { stripe, COMMISSION_RATE } = require('../config/stripe.config');

const router = express.Router();

// --- Get User's Saved Payment Methods ---
// GET /api/payments/methods
router.get('/methods', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get saved payment methods from database
        const methodsResult = await db.query(
            'SELECT * FROM payment_methods WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
            [userId]
        );
        
        res.json(methodsResult.rows);
    } catch (error) {
        console.error('Error getting payment methods:', error);
        res.status(500).json({ error: 'Failed to get payment methods' });
    }
});

// --- Save Payment Method ---
// POST /api/payments/methods
router.post('/methods', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { paymentMethodId } = req.body;
        
        if (!paymentMethodId) {
            return res.status(400).json({ error: 'Payment method ID is required' });
        }
        
        // Get payment method details from Stripe
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        
        if (!paymentMethod) {
            return res.status(404).json({ error: 'Payment method not found' });
        }
        
        // Check if this is the first payment method (make it default)
        const existingMethodsResult = await db.query(
            'SELECT COUNT(*) as count FROM payment_methods WHERE user_id = $1',
            [userId]
        );
        
        const isDefault = existingMethodsResult.rows[0].count === '0';
        
        // Save payment method to database
        const result = await db.query(
            `INSERT INTO payment_methods 
            (user_id, payment_type, payment_provider, provider_payment_id, last_four, expiry_month, expiry_year, is_default) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *`,
            [
                userId, 
                paymentMethod.type,
                'stripe',
                paymentMethodId,
                paymentMethod.card ? paymentMethod.card.last4 : null,
                paymentMethod.card ? paymentMethod.card.exp_month : null,
                paymentMethod.card ? paymentMethod.card.exp_year : null,
                isDefault
            ]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error saving payment method:', error);
        res.status(500).json({ error: 'Failed to save payment method' });
    }
});

// --- Delete Payment Method ---
// DELETE /api/payments/methods/:methodId
router.delete('/methods/:methodId', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { methodId } = req.params;
        
        // Get the payment method
        const methodResult = await db.query(
            'SELECT * FROM payment_methods WHERE payment_method_id = $1 AND user_id = $2',
            [methodId, userId]
        );
        
        if (methodResult.rows.length === 0) {
            return res.status(404).json({ error: 'Payment method not found' });
        }
        
        const method = methodResult.rows[0];
        
        // Delete from Stripe if needed
        if (method.provider_payment_id && method.payment_provider === 'stripe') {
            try {
                await stripe.paymentMethods.detach(method.provider_payment_id);
            } catch (stripeError) {
                console.error('Error detaching payment method from Stripe:', stripeError);
                // Continue with deletion from our database even if Stripe detachment fails
            }
        }
        
        // Delete from our database
        await db.query(
            'DELETE FROM payment_methods WHERE payment_method_id = $1',
            [methodId]
        );
        
        // If this was the default method, set a new default
        if (method.is_default) {
            const newDefaultResult = await db.query(
                'SELECT payment_method_id FROM payment_methods WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
                [userId]
            );
            
            if (newDefaultResult.rows.length > 0) {
                await db.query(
                    'UPDATE payment_methods SET is_default = TRUE WHERE payment_method_id = $1',
                    [newDefaultResult.rows[0].payment_method_id]
                );
            }
        }
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error deleting payment method:', error);
        res.status(500).json({ error: 'Failed to delete payment method' });
    }
});

// --- Get Payout Preferences ---
// GET /api/payments/payout-preferences
router.get('/payout-preferences', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get payout preferences from database
        const preferencesResult = await db.query(
            'SELECT * FROM payout_preferences WHERE user_id = $1 AND is_active = TRUE',
            [userId]
        );
        
        res.json(preferencesResult.rows);
    } catch (error) {
        console.error('Error getting payout preferences:', error);
        res.status(500).json({ error: 'Failed to get payout preferences' });
    }
});

// --- Update Payout Preferences ---
// PUT /api/payments/payout-preferences
router.put('/payout-preferences', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { payoutMethod, bankName, bankLastFour } = req.body;
        
        if (!payoutMethod) {
            return res.status(400).json({ error: 'Payout method is required' });
        }
        
        // Check if preference already exists
        const existingResult = await db.query(
            'SELECT * FROM payout_preferences WHERE user_id = $1 AND payout_method = $2',
            [userId, payoutMethod]
        );
        
        let result;
        
        if (existingResult.rows.length > 0) {
            // Update existing preference
            result = await db.query(
                `UPDATE payout_preferences 
                SET bank_name = $1, bank_last_four = $2, is_active = TRUE 
                WHERE user_id = $3 AND payout_method = $4 
                RETURNING *`,
                [bankName, bankLastFour, userId, payoutMethod]
            );
        } else {
            // Create new preference
            result = await db.query(
                `INSERT INTO payout_preferences 
                (user_id, payout_method, bank_name, bank_last_four) 
                VALUES ($1, $2, $3, $4) 
                RETURNING *`,
                [userId, payoutMethod, bankName, bankLastFour]
            );
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating payout preferences:', error);
        res.status(500).json({ error: 'Failed to update payout preferences' });
    }
});

// --- Get Payment Analytics ---
// GET /api/payments/analytics
router.get('/analytics', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get analytics from view
        const analyticsResult = await db.query(
            'SELECT * FROM seller_payment_analytics WHERE user_id = $1',
            [userId]
        );
        
        if (analyticsResult.rows.length === 0) {
            // Return empty analytics if no data
            return res.json({
                user_id: userId,
                total_sales: 0,
                total_revenue: 0,
                total_commission_paid: 0,
                total_earnings: 0,
                completed_sales: 0,
                pending_sales: 0,
                completed_transfers: 0,
                pending_transfers: 0
            });
        }
        
        res.json(analyticsResult.rows[0]);
    } catch (error) {
        console.error('Error getting payment analytics:', error);
        res.status(500).json({ error: 'Failed to get payment analytics' });
    }
});

// --- File a Dispute ---
// POST /api/payments/disputes
router.post('/disputes', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { transactionId, disputeReason } = req.body;
        
        if (!transactionId || !disputeReason) {
            return res.status(400).json({ error: 'Transaction ID and dispute reason are required' });
        }
        
        // Check if transaction exists and user is buyer or seller
        const transactionResult = await db.query(
            'SELECT * FROM project_transactions WHERE transaction_id = $1 AND (buyer_id = $2 OR seller_id = $2)',
            [transactionId, userId]
        );
        
        if (transactionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found or you do not have permission' });
        }
        
        // Check if a dispute already exists
        const existingDisputeResult = await db.query(
            'SELECT * FROM payment_disputes WHERE transaction_id = $1',
            [transactionId]
        );
        
        if (existingDisputeResult.rows.length > 0) {
            return res.status(400).json({ error: 'A dispute already exists for this transaction' });
        }
        
        // Create dispute
        const result = await db.query(
            `INSERT INTO payment_disputes 
            (transaction_id, initiated_by, dispute_reason, dispute_status) 
            VALUES ($1, $2, $3, 'open') 
            RETURNING *`,
            [transactionId, userId, disputeReason]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error filing dispute:', error);
        res.status(500).json({ error: 'Failed to file dispute' });
    }
});

// --- Get Disputes ---
// GET /api/payments/disputes
router.get('/disputes', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get disputes where user is buyer, seller, or initiator
        const disputesResult = await db.query(
            `SELECT d.*, t.buyer_id, t.seller_id, p.name as project_name 
            FROM payment_disputes d
            JOIN project_transactions t ON d.transaction_id = t.transaction_id
            JOIN projects p ON t.project_id = p.project_id
            WHERE t.buyer_id = $1 OR t.seller_id = $1 OR d.initiated_by = $1
            ORDER BY d.created_at DESC`,
            [userId]
        );
        
        res.json(disputesResult.rows);
    } catch (error) {
        console.error('Error getting disputes:', error);
        res.status(500).json({ error: 'Failed to get disputes' });
    }
});

module.exports = router; 