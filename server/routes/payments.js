const express = require('express');
const db = require('../db');
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
            stripe_account_id,
        } = result.rows[0];

        if (!stripe_account_id) {
            return res.json({
                connected: false,
                accountId: null,
                isOnboardingComplete: false,
                arePayoutsEnabled: false,
                areChargesEnabled: false
            });
        }

        // Get detailed status from Stripe
        try {
            const account = await stripe.accounts.retrieve(stripe_account_id);
            
            const isComplete = account.details_submitted && account.charges_enabled && account.payouts_enabled;
            const needsAttention = account.requirements.currently_due.length > 0 || 
                                   account.requirements.past_due.length > 0;

            // Update database with latest Stripe status
            await db.query(
                `UPDATE users SET 
                 onboarding_complete = $1,
                 payout_enabled = $2,
                 stripe_charges_enabled = $3,
                 stripe_details_submitted = $4,
                 updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $5`,
                [isComplete, account.payouts_enabled, account.charges_enabled, account.details_submitted, userId]
            );

            res.json({
                connected: true,
                accountId: stripe_account_id,
                isOnboardingComplete: isComplete,
                arePayoutsEnabled: account.payouts_enabled,
                areChargesEnabled: account.charges_enabled,
                areDetailsSubmitted: account.details_submitted,
                needsAttention: needsAttention,
                requirements: {
                    currently_due: account.requirements.currently_due,
                    past_due: account.requirements.past_due
                }
            });

        } catch (stripeError) {
            console.error('Stripe account retrieval error:', stripeError);
            
            // If account doesn't exist, clear it from database
            if (stripeError.code === 'resource_missing') {
                await db.query(
                    'UPDATE users SET stripe_account_id = NULL WHERE user_id = $1',
                    [userId]
                );
                
                return res.json({
                    connected: false,
                    accountId: null,
                    isOnboardingComplete: false,
                    arePayoutsEnabled: false,
                    areChargesEnabled: false
                });
            }
            
            throw stripeError;
        }

    } catch (error) {
        console.error('Connect status error:', error);
        res.status(500).json({ 
            error: 'Failed to get Stripe Connect status'
        });
    }
});

// POST /api/payments/create-checkout-session
router.post('/create-checkout-session', authMiddleware, async (req, res) => {
    try {
        const { purchase_request_id } = req.body;
        const buyerId = req.user.user_id;

        if (!purchase_request_id) {
            return res.status(400).json({ error: 'Purchase Request ID is required.' });
        }

        // Get purchase request details and joined project/seller info
        const requestQuery = await db.query(
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
                s_user.user_id AS seller_id,
                s_user.email AS seller_email, 
                s_user.stripe_account_id AS seller_stripe_account_id
             FROM purchase_requests pr
             JOIN projects p ON pr.project_id = p.project_id
             JOIN users s_user ON pr.seller_id = s_user.user_id
             WHERE pr.id = $1 AND pr.buyer_id = $2`,
            [purchase_request_id, buyerId]
        );

        if (requestQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase request not found or you are not the buyer.' });
        }

        const purchaseRequest = requestQuery.rows[0];
        const projectId = purchaseRequest.project_id;

        if (purchaseRequest.status !== 'seller_accepted_pending_payment') {
            return res.status(400).json({ error: `Payment cannot be processed. Status is: ${purchaseRequest.status}` });
        }

        if (!purchaseRequest.project_is_for_sale) {
            await db.query("UPDATE purchase_requests SET status = 'aborted_project_unavailable' WHERE id = $1", [purchase_request_id]);
            return res.status(400).json({ error: 'This project is no longer available for sale.' });
        }

        const sellerStripeAccountId = purchaseRequest.seller_stripe_account_id;
        if (!sellerStripeAccountId) {
            return res.status(500).json({ error: 'Seller Stripe account not configured.' });
        }

        const totalAmount = parseFloat(purchaseRequest.accepted_price);
        const commissionAmount = parseFloat(((totalAmount * COMMISSION_RATE) / 100).toFixed(2));
        
        const successUrl = `${CLIENT_URL}/purchase/success?purchase_request_id=${purchase_request_id}&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${CLIENT_URL}/projects/${projectId}?purchase_request_id=${purchase_request_id}&status=cancelled`;
        
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
            client_reference_id: purchase_request_id,
            metadata: {
                purchase_request_id: purchase_request_id.toString(),
                project_id: projectId.toString(),
                buyer_id: buyerId.toString(),
                seller_id: purchaseRequest.seller_id.toString()
            },
            payment_intent_data: {
                transfer_group: `txn_${purchase_request_id}`,
                metadata: {
                    purchase_request_id: purchase_request_id.toString(),
                    project_id: projectId.toString(),
                    buyer_id: buyerId.toString(),
                    seller_id: purchaseRequest.seller_id.toString(),
                    escrow_status: 'held'
                },
            },
        });

        await db.query(
            "UPDATE purchase_requests SET status = 'payment_processing', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [purchase_request_id]
        );

        res.json({ url: session.url, sessionId: session.id });

    } catch (error) {
        console.error('Failed to create checkout session:', error);
        res.status(500).json({ error: 'Failed to create payment session.' });
    }
});

// GET /api/payments/status/:sessionId
router.get('/status/:sessionId', authMiddleware, async (req, res) => {
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
});

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
        res.status(500).json({ error: 'Failed' });
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
        res.status(500).json({ error: 'Failed' });
    }
});

// POST /api/payments/confirm-receipt (Escrow Release)
router.post('/confirm-receipt', authMiddleware, async (req, res) => {
    try {
        const { transactionId } = req.body;
        const buyerId = req.user.user_id;

        const txnResult = await db.query(`
            SELECT t.*, u.stripe_account_id as seller_stripe_id
            FROM project_transactions t
            JOIN users u ON t.seller_id = u.user_id
            WHERE t.transaction_id = $1 AND t.buyer_id = $2
        `, [transactionId, buyerId]);

        if (txnResult.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }

        const transaction = txnResult.rows[0];

        if (transaction.status === 'completed') {
            return res.status(400).json({ error: 'Funds already released.' });
        }

        // Release funds via Stripe Transfer
        const transferAmount = Math.round(parseFloat(transaction.seller_amount) * 100);
        
        if (!transaction.seller_stripe_id) {
             return res.status(500).json({ error: 'Seller has no connected Stripe account.' });
        }

        try {
            await stripe.transfers.create({
                amount: transferAmount,
                currency: 'usd',
                destination: transaction.seller_stripe_id,
                transfer_group: `txn_${transaction.payment_id}`,
                metadata: {
                    transaction_id: transaction.transaction_id.toString(),
                    project_id: transaction.project_id.toString()
                }
            });
        } catch (stripeError) {
            console.error('[ESCROW] Stripe Transfer Error:', stripeError);
            return res.status(500).json({ error: 'Stripe transfer failed.' });
        }

        await db.query(`
            UPDATE project_transactions
            SET status = 'completed', 
                transfer_completed = true, 
                transfer_completed_at = CURRENT_TIMESTAMP,
                escrow_status = 'released'
            WHERE transaction_id = $1
        `, [transactionId]);

        res.json({ success: true, message: 'Funds released.' });

    } catch (error) {
        console.error('Error confirming receipt:', error);
        res.status(500).json({ error: 'Failed.' });
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
