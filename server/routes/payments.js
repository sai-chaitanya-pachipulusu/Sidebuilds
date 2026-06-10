const express = require('express');
const db = require('../db');
const { body, param, validationResult } = require('express-validator');
require('dotenv').config();
const crypto = require('crypto');
const emailService = require('../services/emailService');

// Get Stripe keys from environment variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const CLIENT_URL = process.env.CLIENT_URL;

// Initialize Stripe
const stripe = require('stripe')(STRIPE_SECRET_KEY);
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const COMMISSION_RATE = process.env.COMMISSION_RATE || 5;

// DB-backed idempotency keys (survive restarts and multiple instances)
const { checkKey: checkIdempotencyKey, storeKey: storeIdempotencyKey } = require('../services/idempotencyService');

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
        body('idempotencyKey')
            .optional()
            .isUUID(4)
            .withMessage('Invalid idempotency key format')
    ],
    handleValidationErrors,
    async (req, res) => {
        const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;
        
        try {
            const { purchase_request_id } = req.body;
            const buyerId = req.user.user_id;

            // Check idempotency key
            const cachedResponse = await checkIdempotencyKey(idempotencyKey, `checkout_session_${purchase_request_id}_${buyerId}`);
            if (cachedResponse) {
                console.log(`[PAYMENTS] Returning cached checkout session for idempotency key ${idempotencyKey}`);
                return res.json(cachedResponse);
            }

            // Use transaction for atomic operations
            const result = await db.withTransaction(async (client) => {
                // Get purchase request details and joined project/seller info with row locking
                const requestQuery = await client.query(
                    `SELECT 
                        pr.id as purchase_request_id,
                        pr.project_id,
                        pr.buyer_id,
                        pr.seller_id,
                        pr.status,
                        pr.price as accepted_price,
                        p.name AS project_name,
                        p.description AS project_description,
                        p.is_for_sale AS project_is_for_sale,
                        p.is_on_hold AS project_is_on_hold,
                        s_user.user_id AS seller_id,
                        s_user.email AS seller_email, 
                        s_user.stripe_account_id AS seller_stripe_account_id
                     FROM purchase_requests pr
                     JOIN projects p ON pr.project_id = p.project_id
                     JOIN users s_user ON pr.seller_id = s_user.user_id
                     WHERE pr.id = $1 AND pr.buyer_id = $2 FOR UPDATE`,
                    [purchase_request_id, buyerId]
                );

                if (requestQuery.rows.length === 0) {
                    throw new Error('Purchase request not found or you are not the buyer.');
                }

                const purchaseRequest = requestQuery.rows[0];
                const projectId = purchaseRequest.project_id;

                const payableStatuses = ['seller_accepted_pending_payment', 'agreement_reached_pending_payment'];
                if (!payableStatuses.includes(purchaseRequest.status)) {
                    throw new Error(`Payment cannot be processed. Status is: ${purchaseRequest.status}`);
                }

                if (!purchaseRequest.project_is_for_sale || purchaseRequest.project_is_on_hold) {
                    await client.query(
                        "UPDATE purchase_requests SET status = 'aborted_project_unavailable' WHERE id = $1",
                        [purchase_request_id]
                    );
                    throw new Error('This project is no longer available for sale.');
                }

                const sellerStripeAccountId = purchaseRequest.seller_stripe_account_id;
                if (!sellerStripeAccountId) {
                    throw new Error('Seller Stripe account not configured.');
                }

                return purchaseRequest;
            });

            const purchaseRequest = result;
            const totalAmount = parseFloat(purchaseRequest.accepted_price);

            // Never hand Stripe a NaN/zero/sub-minimum amount
            if (!Number.isFinite(totalAmount) || totalAmount < 0.5) {
                console.error(`[PAYMENTS] Invalid amount ${purchaseRequest.accepted_price} for purchase request ${purchase_request_id}`);
                return res.status(400).json({
                    error: 'This purchase request has no valid agreed price. Please contact the seller.'
                });
            }

            const commissionAmount = parseFloat(((totalAmount * COMMISSION_RATE) / 100).toFixed(2));
            
            const successUrl = `${CLIENT_URL}/purchase/success?purchase_request_id=${purchase_request_id}&session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = `${CLIENT_URL}/projects/${purchaseRequest.project_id}?purchase_request_id=${purchase_request_id}&status=cancelled`;
            
            // Create Stripe checkout session with idempotency key
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: purchaseRequest.project_name,
                            description: purchaseRequest.project_description?.substring(0, 500) || '',
                        },
                        unit_amount: Math.round(totalAmount * 100),
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                success_url: successUrl,
                cancel_url: cancelUrl,
                customer_email: req.user.email,
                client_reference_id: purchase_request_id.toString(),
                metadata: {
                    purchase_request_id: purchase_request_id.toString(),
                    project_id: purchaseRequest.project_id.toString(),
                    buyer_id: buyerId.toString(),
                    seller_id: purchaseRequest.seller_id.toString()
                },
                payment_intent_data: {
                    transfer_group: `txn_${purchase_request_id}`,
                    metadata: {
                        purchase_request_id: purchase_request_id.toString(),
                        project_id: purchaseRequest.project_id.toString(),
                        buyer_id: buyerId.toString(),
                        seller_id: purchaseRequest.seller_id.toString(),
                        escrow_status: 'held'
                    },
                },
            }, {
                idempotencyKey: idempotencyKey || `checkout_${purchase_request_id}_${Date.now()}`
            });

            // Update purchase request status
            await db.query(
                "UPDATE purchase_requests SET status = 'payment_processing', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                [purchase_request_id]
            );

            const response = { url: session.url, sessionId: session.id };

            // Store idempotency key
            if (idempotencyKey) {
                storeIdempotencyKey(idempotencyKey, `checkout_session_${purchase_request_id}_${buyerId}`, response);
            }

            res.json(response);

        } catch (error) {
            console.error('Failed to create checkout session:', error);
            
            if (error.message === 'Purchase request not found or you are not the buyer.') {
                return res.status(404).json({ error: error.message });
            }
            if (error.message.includes('Payment cannot be processed')) {
                return res.status(400).json({ error: error.message });
            }
            if (error.message === 'This project is no longer available for sale.') {
                return res.status(400).json({ error: error.message });
            }
            if (error.message === 'Seller Stripe account not configured.') {
                return res.status(500).json({ error: error.message });
            }
            
            res.status(500).json({ error: 'Failed to create payment session.' });
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
        body('transactionId').notEmpty().withMessage('Transaction ID is required')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { transactionId } = req.body;
            const buyerId = req.user.user_id;

            const result = await db.withTransaction(async (client) => {
                const txnResult = await client.query(`
                    SELECT t.*, u.stripe_account_id as seller_stripe_id
                    FROM project_transactions t
                    JOIN users u ON t.seller_id = u.user_id
                    WHERE t.transaction_id = $1 AND t.buyer_id = $2 FOR UPDATE`,
                    [transactionId, buyerId]
                );

                if (txnResult.rows.length === 0) {
                    throw new Error('Transaction not found');
                }

                const transaction = txnResult.rows[0];

                if (transaction.status === 'completed') {
                    throw new Error('Funds already released');
                }

                if (transaction.escrow_status !== 'held') {
                    throw new Error(`Cannot release funds. Current escrow status: ${transaction.escrow_status}`);
                }

                // Release funds via Stripe Transfer
                const transferAmount = Math.round(parseFloat(transaction.seller_amount) * 100);
                
                if (!transaction.seller_stripe_id) {
                    throw new Error('Seller has no connected Stripe account');
                }

                // Create transfer to seller
                const transfer = await stripe.transfers.create({
                    amount: transferAmount,
                    currency: 'usd',
                    destination: transaction.seller_stripe_id,
                    transfer_group: `txn_${transaction.payment_id}`,
                    metadata: {
                        transaction_id: transaction.transaction_id.toString(),
                        project_id: transaction.project_id.toString()
                    }
                });

                // Update transaction status
                await client.query(`
                    UPDATE project_transactions
                    SET status = 'completed', 
                        transfer_completed = true, 
                        transfer_completed_at = CURRENT_TIMESTAMP,
                        escrow_status = 'released',
                        stripe_transfer_id = $2
                    WHERE transaction_id = $1
                `, [transactionId, transfer.id]);

                // Update purchase request status
                await client.query(`
                    UPDATE purchase_requests
                    SET status = 'transfer_completed_buyer_confirmed',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE project_id = $1 AND buyer_id = $2
                `, [transaction.project_id, buyerId]);

                // Update project ownership
                await client.query(`
                    UPDATE projects
                    SET owner_id = $1,
                        is_for_sale = false,
                        status = 'sold',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE project_id = $2
                `, [buyerId, transaction.project_id]);

                return transaction;
            });

            // Send notification to seller (outside transaction)
            try {
                await require('../services/notificationService').createNotification(
                    result.seller_id,
                    'FUNDS_RELEASED',
                    `Funds have been released for project sale. Transaction: ${transactionId}`,
                    `/dashboard?tab=sales`
                );
            } catch (notifError) {
                console.error('Failed to send notification:', notifError);
            }

            res.json({ 
                success: true, 
                message: 'Funds released successfully.',
                transactionId: transactionId
            });

        } catch (error) {
            console.error('Error confirming receipt:', error);
            
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
        if (STRIPE_SECRET_KEY) {
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
    
    if (!STRIPE_WEBHOOK_SECRET) {
        console.error('[STRIPE WEBHOOK] FATAL: STRIPE_WEBHOOK_SECRET is not configured.');
        return res.status(500).send('Webhook secret not configured');
    }

    let event;

    try {
        // Stripe requires the raw body for signature verification
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`[STRIPE WEBHOOK] ❌ Signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

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
        res.status(500).json({ error: 'Webhook processing failed', message: error.message });
    }
};

module.exports = {
    router,
    webhookHandler
};
