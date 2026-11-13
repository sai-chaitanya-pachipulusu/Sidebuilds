const express = require('express');
const db = require('../db');
const { body, param, validationResult } = require('express-validator');
require('dotenv').config();
const crypto = require('crypto');
const emailService = require('../services/emailService');
const { receiptState } = require('../utils/receiptReview');
const { approvedAgreement, serialize: serializeAgreement } = require('../utils/purchaseAgreement');
const { stripe, stripeConfigValid, stripeEnvironment } = require('../config/stripe.config');
const { assertStripeEventMode } = require('../utils/stripeSafety');

// Get Stripe keys from environment variables
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const CLIENT_URL = process.env.CLIENT_URL;

// Initialize Stripe
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const { requireCommerceEnabled } = require('../utils/commercePolicy');
router.use((req,res,next)=>{
 if (!stripeConfigValid) return next();
 if(req.method==='POST' && ['/create-checkout-session','/confirm-receipt'].includes(req.path)) return authMiddleware(req,res,()=>requireCommerceEnabled(req,res,next));
 next();
});
const providerMutations = new Set(['/connect/create-account', '/connect/refresh-link', '/create-checkout-session', '/confirm-receipt']);
router.use((req, res, next) => {
    if (req.method === 'POST' && providerMutations.has(req.path) && !stripeConfigValid) return res.status(503).json({ error: 'Payments are temporarily unavailable. Please try again after the payment setup is corrected.', code: 'STRIPE_CONFIGURATION_INVALID' });
    next();
});
const COMMISSION_RATE = process.env.COMMISSION_RATE || 5;

// DB-backed idempotency keys (survive restarts and multiple instances)
const { storeKey: storeIdempotencyKey } = require('../services/idempotencyService');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// POST /api/payments/connect/create-account
router.post('/connect/create-account', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const email = req.user.email;

        // Get user's existing Stripe account ID
        const userResult = await db.query(`
            SELECT email, stripe_account_id 
            FROM users 
            WHERE user_id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        let { stripe_account_id: stripeAccountId } = userResult.rows[0];
        const userEmail = userResult.rows[0].email || email;

        // Create Stripe account if doesn't exist
        if (!stripeAccountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'US',
                email: userEmail,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            });

            stripeAccountId = account.id;
            
            // Update user record with Stripe account ID
            await db.query(
                'UPDATE users SET stripe_account_id = $1 WHERE user_id = $2',
                [stripeAccountId, userId]
            );
        }

        // Create account link
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${process.env.CLIENT_URL}/profile-settings?stripe_refresh=true`,
            return_url: `${process.env.CLIENT_URL}/profile-settings?stripe_return=true`,
            type: 'account_onboarding',
        });

        res.json({ 
            url: accountLink.url,
            account_id: stripeAccountId 
        });

    } catch (error) {
        console.error('Stripe Connect account creation error:', error);
        res.status(500).json({ 
            error: 'Failed to create Stripe Connect account',
            message: error.message 
        });
    }
});

// GET /api/payments/connect/status  
router.get('/connect/status', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        
        // Get user's Stripe account info
        const result = await db.query(`
            SELECT stripe_account_id, onboarding_complete, 
                   payout_enabled, stripe_charges_enabled, stripe_details_submitted
            FROM users 
            WHERE user_id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { 
            stripe_account_id: stripeAccountId,
            onboarding_complete: onboardingComplete,
            payout_enabled: payoutEnabled,
            stripe_charges_enabled: stripeChargesEnabled,
            stripe_details_submitted: stripeDetailsSubmitted
        } = result.rows[0];

        // If no Stripe account, return early
        if (!stripeAccountId) {
            return res.json({
                hasAccount: false,
                isOnboardingComplete: false,
                needsAttention: false,
                accountId: null,
                arePayoutsEnabled: false
            });
        }

        // Check live status from Stripe
        let stripeStatus = null;
        let needsAttention = false;
        
        try {
            const account = await stripe.accounts.retrieve(stripeAccountId);
            stripeStatus = {
                charges_enabled: account.charges_enabled,
                payouts_enabled: account.payouts_enabled,
                details_submitted: account.details_submitted,
                requirements: account.requirements
            };
            
            // Determine if attention is needed
            needsAttention = !account.charges_enabled || !account.payouts_enabled;
            
            // Update local database if status changed
            if (stripeChargesEnabled !== account.charges_enabled ||
                payoutEnabled !== account.payouts_enabled ||
                stripeDetailsSubmitted !== account.details_submitted) {
                
                await db.query(`
                    UPDATE users 
                    SET stripe_charges_enabled = $1,
                        payout_enabled = $2,
                        stripe_details_submitted = $3,
                        onboarding_complete = $4
                    WHERE user_id = $5
                `, [
                    account.charges_enabled,
                    account.payouts_enabled,
                    account.details_submitted,
                    account.charges_enabled && account.payouts_enabled && account.details_submitted,
                    userId
                ]);
            }
        } catch (stripeError) {
            console.error('Error fetching Stripe account status:', stripeError);
            // Return cached status if Stripe API fails
        }

        res.json({
            hasAccount: true,
            isOnboardingComplete: onboardingComplete || (stripeStatus?.charges_enabled && stripeStatus?.payouts_enabled),
            needsAttention: needsAttention,
            accountId: stripeAccountId,
            arePayoutsEnabled: stripeStatus?.payouts_enabled || payoutEnabled || false,
            stripeStatus: stripeStatus
        });

    } catch (error) {
        console.error('Connect status error:', error);
        res.status(500).json({ 
            error: 'Failed to get Stripe Connect status'
        });
    }
});

// POST /api/payments/create-checkout-session
router.post('/create-checkout-session', 
    authMiddleware,
    [
        body('purchase_request_id')
            .isInt({ min: 1 })
            .withMessage('Invalid purchase request ID'),
        body('agreement_id').isUUID().withMessage('Review and approve a purchase agreement before payment'),
        body('idempotencyKey')
            .optional()
            .isUUID(4)
            .withMessage('Invalid idempotency key format')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const result = await require('../services/checkoutService').createCheckout({ db, stripe,
                requestId: req.body.purchase_request_id, agreementId: req.body.agreement_id,
                buyerId: req.user.user_id, clientUrl: CLIENT_URL, commissionRate: COMMISSION_RATE,liveMode:stripeEnvironment.mode==='live' });
            res.json(result);
        } catch (error) {
            console.error('Checkout failed:', error.code || error.message);
            res.status(error.status || 503).json({ error: error.status ? error.message : 'Checkout could not be confirmed. Retry this purchase; do not start a different payment.' });
        }
    }
);

// GET /api/payments/status/:sessionId
router.get('/status/:sessionId', 
    authMiddleware,
    [param('sessionId').notEmpty().withMessage('Session ID is required')],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { sessionId } = req.params;
            const userId = req.user.user_id;

            const transactionResult = await db.query(
                `SELECT t.*, p.name as project_name, 
                 s.username as seller_username,
                 b.username as buyer_username
                 FROM project_transactions t
                 JOIN projects p ON t.project_id = p.project_id
                 JOIN users s ON t.seller_id = s.user_id
                 JOIN users b ON t.buyer_id = b.user_id
                 WHERE t.stripe_session_id = $1 
                   AND (t.buyer_id = $2 OR t.seller_id = $3)`,
                [sessionId, userId, userId]
            );

            if (transactionResult.rows.length === 0) {
                return res.status(404).json({ error: 'Transaction not found or access denied' });
            }

            res.json(transactionResult.rows[0]);
        } catch (error) {
            console.error('Error getting transaction status:', error);
            res.status(500).json({ error: 'Failed to get transaction status' });
        }
    }
);

// GET /api/payments/transactions
router.get('/transactions', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const transactionsResult = await db.query(
            `SELECT t.*, p.name as project_name, 
             s.username as seller_username, 
             b.username as buyer_username
             FROM project_transactions t
             JOIN projects p ON t.project_id = p.project_id
             JOIN users s ON t.seller_id = s.user_id
             JOIN users b ON t.buyer_id = b.user_id
             WHERE t.buyer_id = $1 OR t.seller_id = $2
             ORDER BY t.created_at DESC`,
            [userId, userId]
        );

        res.json(transactionsResult.rows);
    } catch (error) {
        console.error('Error getting user transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Buyer-only receipt context. Use the exact Checkout session to identify terms;
// a project/buyer pair can have multiple negotiation attempts.
router.get('/transactions/:transactionId/receipt-review', authMiddleware,
    [param('transactionId').isUUID().withMessage('Invalid transaction ID')], handleValidationErrors,
    async (req, res) => {
        res.set('Cache-Control', 'no-store');
        try {
            const result = await db.query(`SELECT t.transaction_id, t.project_id, t.buyer_id, t.seller_id,
                t.amount, t.seller_amount, t.status, t.payment_id, t.stripe_payment_intent_id,
                t.stripe_session_id, t.escrow_status, t.escrow_released, t.transfer_completed,t.purchase_request_id,
                (SELECT status FROM purchase_requests WHERE id=t.purchase_request_id) AS delivery_status,
                p.name AS project_name, p.owner_id AS project_owner_id, u.username AS seller_username
                FROM project_transactions t JOIN projects p ON p.project_id=t.project_id
                JOIN users u ON u.user_id=t.seller_id
                WHERE t.transaction_id=$1 AND t.buyer_id=$2`, [req.params.transactionId, req.user.user_id]);
            if (!result.rows.length) return res.status(404).json({ error: 'Transaction not found or access denied.' });
            const transaction = result.rows[0];
            const requests = transaction.stripe_session_id ? await db.query(`SELECT id, message, agreement_id FROM purchase_requests
                WHERE stripe_session_id=$1 AND project_id=$2 AND buyer_id=$3 AND seller_id=$4 LIMIT 2`,
                [transaction.stripe_session_id, transaction.project_id, transaction.buyer_id, transaction.seller_id]) : { rows: [] };
            const agreement = requests.rows.length === 1 ? requests.rows[0] : null;
            const savedScope = agreement?.agreement_id ? await db.query('SELECT * FROM purchase_agreements WHERE id=$1 AND purchase_request_id=$2', [agreement.agreement_id, agreement.id]) : { rows: [] };
            res.json({ transaction_id: transaction.transaction_id, project_id: transaction.project_id,
                project_name: transaction.project_name, seller_username: transaction.seller_username,
                amount: transaction.amount, status: transaction.status, escrow_status: transaction.escrow_status,
                ...receiptState(transaction), purchase_request_id: agreement?.id || null,
                agreement_message: agreement?.message || null, purchase_agreement: serializeAgreement(savedScope.rows[0]) });
        } catch (error) {
            console.error('Receipt review failed:', error.message);
            res.status(500).json({ error: 'Receipt review could not be loaded. Please retry.' });
        }
    });

// POST /api/payments/connect/refresh-link
router.post('/connect/refresh-link', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        
        const userResult = await db.query(`
            SELECT stripe_account_id 
            FROM users 
            WHERE user_id = $1
        `, [userId]);
        
        if (userResult.rows.length === 0 || !userResult.rows[0].stripe_account_id) {
            return res.status(404).json({ error: 'No Stripe account found' });
        }
        
        const stripeAccountId = userResult.rows[0].stripe_account_id;
        
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${process.env.CLIENT_URL}/dashboard/connect/refresh`,
            return_url: `${process.env.CLIENT_URL}/dashboard/connect/complete`,
            type: 'account_onboarding',
        });
        
        res.json({ success: true, url: accountLink.url });
        
    } catch (error) {
        console.error('Error refreshing link:', error);
        res.status(500).json({ error: 'Failed to refresh account link' });
    }
});

// POST /api/payments/confirm-receipt (Escrow Release)
router.post('/confirm-receipt', 
    authMiddleware,
    [
        body('transactionId').isUUID().withMessage('A valid transaction ID is required'),
        body('receiptAcknowledged').custom(value => value === true).withMessage('Explicit receipt confirmation is required')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { transactionId } = req.body;
            const buyerId = req.user.user_id;

            await require('../services/payoutAttempt').preparePayoutAttempt(db,transactionId,buyerId);

            const result = await db.withTransaction(async (client) => {
                const txnResult = await client.query(`
                    SELECT t.*, u.stripe_account_id as seller_stripe_id, p.owner_id AS project_owner_id
                    FROM project_transactions t
                    JOIN users u ON t.seller_id = u.user_id
                    JOIN projects p ON p.project_id = t.project_id
                    WHERE t.transaction_id = $1 AND t.buyer_id = $2 FOR UPDATE`,
                    [transactionId, buyerId]
                );

                if (txnResult.rows.length === 0) {
                    throw new Error('Transaction not found');
                }

                const transaction = txnResult.rows[0];

                const linked = (await client.query('SELECT status FROM purchase_requests WHERE id=$1 AND stripe_session_id=$2 AND buyer_id=$3 AND seller_id=$4',
                    [transaction.purchase_request_id,transaction.stripe_session_id,buyerId,transaction.seller_id])).rows[0];
                transaction.delivery_status = linked?.status;

                const state = receiptState(transaction);
                if (state.completed) return { ...transaction, alreadyConfirmed: true };
                if (!state.can_confirm) {
                    const blocked = new Error(state.message);
                    blocked.status = 409;
                    throw blocked;
                }

                // Release funds via Stripe Transfer
                const transferAmount = Math.round(parseFloat(transaction.seller_amount) * 100);
                
                if (!transaction.seller_stripe_account_id || transaction.seller_stripe_account_id !== transaction.seller_stripe_id) {
                    throw new Error('Seller has no connected Stripe account');
                }

                const charge = await stripe.charges.retrieve(transaction.payment_id);
                if (!charge.paid || charge.refunded || charge.amount_refunded > 0 || charge.disputed ||
                    charge.amount !== Math.round(Number(transaction.amount)*100) || charge.currency !== transaction.currency ||
                    (typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id) !== transaction.stripe_payment_intent_id) {
                    throw Object.assign(new Error('The payment needs review before funds can be released.'), {status:409});
                }

                // Create transfer to seller
                const transfer = await stripe.transfers.create(
                    {
                        amount: transferAmount,
                        currency: transaction.currency,
                        destination: transaction.seller_stripe_account_id,
                        source_transaction: transaction.payment_id,
                        transfer_group: `txn_${transaction.purchase_request_id}`,
                        metadata: {
                            transaction_id: transaction.transaction_id.toString(),
                            project_id: transaction.project_id.toString()
                        }
                    },
                    {
                        // A successful Stripe call followed by a database error can
                        // safely be retried without paying the seller twice.
                        idempotencyKey: `escrow_release_${transaction.transaction_id}`
                    }
                );

                // Update transaction status
                await client.query(`
                    UPDATE project_transactions
                    SET status = 'completed', 
                        transfer_completed = true, 
                        transfer_completed_at = CURRENT_TIMESTAMP,
                        escrow_status = 'released',
                        escrow_released = true,
                        escrow_released_at = CURRENT_TIMESTAMP,
                        stripe_transfer_id = $2
                    WHERE transaction_id = $1
                `, [transactionId, transfer.id]);

                // Update purchase request status
                await client.query(`
                    UPDATE purchase_requests
                    SET status = 'transfer_completed_buyer_confirmed',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id=$1 AND stripe_session_id=$2 AND buyer_id=$3 AND seller_id=$4
                `, [transaction.purchase_request_id, transaction.stripe_session_id, buyerId, transaction.seller_id]);

                await client.query('DELETE FROM checkout_reservations WHERE project_id=$1 AND purchase_request_id=$2', [transaction.project_id,transaction.purchase_request_id]);

                // Update project ownership
                await client.query(`
                    UPDATE projects
                    SET owner_id = $1,
                        owner_username = $3,
                        is_for_sale = false,
                        is_on_hold = false,
                        status = 'sold',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE project_id = $2
                `, [buyerId, transaction.project_id, req.user.username]);

                return transaction;
            });

            // Send notification to seller (outside transaction)
            try {
                if (!result.alreadyConfirmed) {
                    await require('../services/notificationService').createNotification(
                        result.seller_id,
                        'FUNDS_RELEASED',
                        `Funds have been released for project sale. Transaction: ${transactionId}`,
                        `/dashboard?tab=sales`
                    );
                }
            } catch (notifError) {
                console.error('Failed to send notification:', notifError);
            }

            res.json({ 
                success: true, 
                message: 'Funds released successfully.',
                transactionId: transactionId,
                alreadyConfirmed: Boolean(result.alreadyConfirmed)
            });

        } catch (error) {
            console.error('Error confirming receipt:', error);
            if (error.status) return res.status(error.status).json({ error: error.message });
            
            if (error.message === 'Transaction not found') {
                return res.status(404).json({ error: error.message });
            }
            if (error.message === 'Funds already released') {
                return res.status(400).json({ error: error.message });
            }
            if (error.message.includes('Cannot release funds')) {
                return res.status(400).json({ error: error.message });
            }
            if (error.message === 'Seller has no connected Stripe account') {
                return res.status(500).json({ error: error.message });
            }
            
            res.status(500).json({ error: 'Failed to release funds.' });
        }
    }
);

// POST /api/payments/report-issue (Dispute/Problem Report)
router.post('/report-issue',
    authMiddleware,
    [
        body('transactionId').notEmpty().withMessage('Transaction ID is required'),
        body('issueDescription')
            .trim()
            .isLength({ min: 10, max: 2000 })
            .withMessage('Issue description must be between 10 and 2000 characters')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { transactionId, issueDescription } = req.body;
            const userId = req.user.user_id;

            const result = await db.withTransaction(async (client) => {
                const txnResult = await client.query(`
                    SELECT t.*, p.name as project_name
                    FROM project_transactions t
                    JOIN projects p ON t.project_id = p.project_id
                    WHERE t.transaction_id = $1 AND (t.buyer_id = $2 OR t.seller_id = $3) FOR UPDATE`,
                    [transactionId, userId, userId]
                );

                if (txnResult.rows.length === 0) {
                    throw new Error('Transaction not found');
                }

                const transaction = txnResult.rows[0];

                if (transaction.escrow_status !== 'held') {
                    throw new Error('Cannot report issue. Funds are not in escrow.');
                }

                // Update transaction status
                await client.query(`
                    UPDATE project_transactions
                    SET escrow_status = 'disputed',
                        dispute_reason = $2,
                        dispute_reported_at = CURRENT_TIMESTAMP,
                        dispute_reported_by = $3
                    WHERE transaction_id = $1
                `, [transactionId, issueDescription, userId]);

                return transaction;
            });

            // Notify both parties
            try {
                const notify = require('../services/notificationService').createNotification;
                await notify(
                    result.seller_id,
                    'DISPUTE_REPORTED',
                    `A dispute has been reported for project "${result.project_name}". Funds are frozen pending review.`,
                    `/dashboard?tab=disputes`
                );
                await notify(
                    result.buyer_id,
                    'DISPUTE_ACKNOWLEDGED',
                    `Your dispute for project "${result.project_name}" has been recorded. Our team will review it shortly.`,
                    `/dashboard?tab=purchases`
                );
            } catch (notifError) {
                console.error('Failed to send dispute notifications:', notifError);
            }

            res.json({
                success: true,
                message: 'Issue reported. Funds are frozen pending review.',
                transactionId: transactionId
            });

        } catch (error) {
            console.error('Error reporting issue:', error);
            
            if (error.message === 'Transaction not found') {
                return res.status(404).json({ error: error.message });
            }
            if (error.message === 'Cannot report issue. Funds are not in escrow.') {
                return res.status(400).json({ error: error.message });
            }
            
            res.status(500).json({ error: 'Failed to report issue.' });
        }
    }
);

// GET /api/payments/health - Health check endpoint
router.get('/health', async (req, res) => {
    try {
        // Check database connection
        const dbHealth = await db.checkConnection();
        
        // Check Stripe connection
        let stripeHealth = { healthy: false, message: 'Not configured' };
        if (stripeConfigValid) {
            try {
                await stripe.balance.retrieve();
                stripeHealth = { healthy: true, message: 'Connected' };
            } catch (stripeError) {
                stripeHealth = { healthy: false, message: stripeError.message };
            }
        }

        res.json({
            status: dbHealth.ok && stripeHealth.healthy ? 'healthy' : 'degraded',
            database: dbHealth.ok ? 'connected' : 'disconnected',
            stripe: stripeHealth.healthy ? 'connected' : 'disconnected',
            mode: stripeConfigValid ? stripeEnvironment.mode : 'unconfigured',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Webhook handler for Stripe events
const webhookHandler = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    if (!stripeConfigValid) {
        return res.status(503).send('Stripe webhook environment is not configured');
    }

    let event;

    try {
        // Stripe requires the raw body for signature verification
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('[STRIPE WEBHOOK] Signature verification failed.');
        return res.status(400).send('Webhook signature verification failed');
    }

    try { assertStripeEventMode(event, stripeEnvironment); }
    catch (_) { return res.status(400).send('Stripe event mode does not match this environment'); }

    try {
        const webhookService = require('../services/webhookService');
        const requestId = req.headers['x-request-id'] || `wh_${Date.now()}`;
        
        console.log(`[STRIPE WEBHOOK] 🔔 Received event: ${event.type} (${event.id})`);
        
        const result = await webhookService.processWebhook(event, requestId);
        res.json({ received: true, ...result });
    } catch (error) {
        console.error(`[STRIPE WEBHOOK] ❌ Error processing event ${event.id}:`, error.message);
        // Return 200 to Stripe but log the error to avoid constant retries if it's a processing issue
        // or return 500 if you want Stripe to retry
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

module.exports = {
    router,
    webhookHandler
};
