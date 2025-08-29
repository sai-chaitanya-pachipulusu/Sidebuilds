const express = require('express');
const db = require('../db');
require('dotenv').config();
const crypto = require('crypto');
const emailService = require('../services/emailService'); // Import email service

// Get Stripe keys from environment variables only (no hardcoded fallbacks)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const CLIENT_URL = process.env.CLIENT_URL;

// Log environment values for debugging
console.log("Environment configuration:", {
  CLIENT_URL,
  NODE_ENV: process.env.NODE_ENV
});

// Check if required environment variables are set
if (!STRIPE_SECRET_KEY) {
  console.error("ERROR: STRIPE_SECRET_KEY is missing from .env file. Stripe payments will not work.");
}

if (!STRIPE_PUBLISHABLE_KEY) {
  console.error("WARNING: STRIPE_PUBLISHABLE_KEY is missing from .env file.");
}

if (!STRIPE_WEBHOOK_SECRET) {
  console.error("WARNING: STRIPE_WEBHOOK_SECRET is missing from .env file. Webhook verification will be skipped.");
}

// Initialize Stripe with the key from env
const stripe = require('stripe')(STRIPE_SECRET_KEY);
const authMiddleware = require('../middleware/authMiddleware');

// Check if keys are loaded (using fallback or env)
console.log("Stripe configuration:", {
    secretKeyAvailable: !!STRIPE_SECRET_KEY,
    publishableKeyAvailable: !!STRIPE_PUBLISHABLE_KEY,
    webhookSecretAvailable: !!STRIPE_WEBHOOK_SECRET
});

const router = express.Router();

// Define your Stripe webhook signing secret
const endpointSecret = STRIPE_WEBHOOK_SECRET;

// Commission rate as a percentage (5% by default)
const COMMISSION_RATE = process.env.COMMISSION_RATE || 5;

// === STRIPE CONNECT ENDPOINTS (Missing - needed by client) ===

// POST /api/payments/connect/create-account
router.post('/connect/create-account', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const email = req.user.email;

        // Get user's existing Stripe account ID
        const userResult = await db.query(`
            SELECT email, stripe_account_id 
            FROM users 
            WHERE user_id = ?
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
                'UPDATE users SET stripe_account_id = ? WHERE user_id = ?',
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
        const userId = req.user.id;
        
        // Get user's Stripe account info
        const result = await db.query(`
            SELECT stripe_account_id, onboarding_complete, 
                   stripe_account_id as account_status, 
                   onboarding_complete as payouts_enabled, 
                   onboarding_complete as charges_enabled 
            FROM users 
            WHERE user_id = ?
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const {
            stripe_account_id,
            account_status,
            payouts_enabled,
            charges_enabled
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
                 onboarding_complete = ?
                 WHERE user_id = ?`,
                [isComplete ? 1 : 0, userId]
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
                    'UPDATE users SET stripe_account_id = NULL WHERE user_id = ?',
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
            error: 'Failed to get Stripe Connect status',
            message: error.message 
        });
    }
});

// --- Create Checkout Session ---
// POST /api/payments/create-checkout-session
router.post('/create-checkout-session', authMiddleware, async (req, res) => {
    try {
        const { purchase_request_id } = req.body; // CHANGED: Expect purchase_request_id
        const buyerId = req.user.id; // Assuming req.user is populated by authMiddleware

        if (!purchase_request_id) {
            return res.status(400).json({ error: 'Purchase Request ID is required.' });
        }

        console.log(`[STRIPE DEBUG] Creating checkout session for purchase request ${purchase_request_id}, buyer ${buyerId}`);
        console.log(`[STRIPE DEBUG] User auth info:`, JSON.stringify(req.user));
        console.log(`[STRIPE DEBUG] Stripe config check: Secret Key Exists: ${!!STRIPE_SECRET_KEY}, Publishable Key Exists: ${!!STRIPE_PUBLISHABLE_KEY}`);

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
                s_user.stripe_account_id AS seller_stripe_account_id,
                s_user.username AS seller_username
             FROM purchase_requests pr
             JOIN projects p ON pr.project_id = p.project_id
             JOIN users s_user ON pr.seller_id = s_user.user_id
             WHERE pr.id = ? AND pr.buyer_id = ?`,
            [purchase_request_id, buyerId]
        );

        if (requestQuery.rows.length === 0) {
            console.log(`[STRIPE DEBUG] Purchase Request ${purchase_request_id} not found for buyer ${buyerId}`);
            return res.status(404).json({ error: 'Purchase request not found or you are not the buyer.' });
        }

        const purchaseRequest = requestQuery.rows[0];
        const projectId = purchaseRequest.project_id; // Extracted for clarity

        console.log(`[STRIPE DEBUG] Purchase Request details:`, JSON.stringify(purchaseRequest));

        if (purchaseRequest.status !== 'seller_accepted_pending_payment') {
            console.log(`[STRIPE DEBUG] Purchase Request ${purchase_request_id} status is ${purchaseRequest.status}, not 'seller_accepted_pending_payment'.`);
            return res.status(400).json({ error: `Payment cannot be processed. Request status is: ${purchaseRequest.status}` });
        }

        if (!purchaseRequest.project_is_for_sale) {
            console.log(`[STRIPE DEBUG] Project ${projectId} (from purchase request) is no longer for sale.`);
            // Optionally update purchase_request status here
            await db.query("UPDATE purchase_requests SET status = 'aborted_project_unavailable' WHERE id = ?", [purchase_request_id]);
            return res.status(400).json({ error: 'This project is no longer available for sale.' });
        }

        const sellerStripeAccountId = purchaseRequest.seller_stripe_account_id;
        if (!sellerStripeAccountId) {
            console.log(`[STRIPE DEBUG] Seller ${purchaseRequest.seller_id} for project ${projectId} has no Stripe account ID connected.`);
            return res.status(500).json({ error: 'Seller Stripe account not configured for payouts. Cannot process payment.' });
        }

        let productDescription = purchaseRequest.project_description || purchaseRequest.project_name;
        if (productDescription && productDescription.length > 1000) { // Stripe limit for product description
            productDescription = productDescription.substring(0, 997) + '...';
        } else if (!productDescription) {
            productDescription = `Purchase of project: ${purchaseRequest.project_name}`;
        }
        
        const totalAmount = parseFloat(purchaseRequest.accepted_price);
        if (isNaN(totalAmount) || totalAmount <= 0.50) { // Stripe minimum is typically $0.50
            console.error(`[STRIPE ERROR] Invalid accepted_price: ${purchaseRequest.accepted_price} for purchase request ${purchase_request_id}`);
            return res.status(500).json({ error: 'Invalid project price for payment processing.' });
        }

        const commissionAmount = parseFloat(((totalAmount * COMMISSION_RATE) / 100).toFixed(2));
        const applicationFeeAmount = Math.round(commissionAmount * 100); // Stripe wants fee in cents

        const successUrl = `${CLIENT_URL}/purchase/success?purchase_request_id=${purchase_request_id}&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${CLIENT_URL}/projects/${projectId}?purchase_request_id=${purchase_request_id}&status=cancelled`;
        
        console.log(`[STRIPE DEBUG] URLs for redirection: success_url=${successUrl}, cancel_url=${cancelUrl}`);

        const lineItems = [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: purchaseRequest.project_name.substring(0, 100),
                    description: productDescription,
                },
                unit_amount: Math.round(totalAmount * 100), // Price in cents
            },
            quantity: 1,
        }];

        const sessionParams = {
            payment_method_types: process.env.STRIPE_PAYMENT_METHODS ? process.env.STRIPE_PAYMENT_METHODS.split(',') : ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer_email: req.user.email, // Pre-fill customer email from authenticated user
            client_reference_id: purchase_request_id, 
            metadata: { // Top-level metadata for the session object
                purchase_request_id: purchase_request_id, // CRUCIAL for webhook
                project_id: projectId,
                buyer_id: buyerId,
                seller_id: purchaseRequest.seller_id
            },
            payment_intent_data: {
                application_fee_amount: applicationFeeAmount,
                transfer_data: {
                    destination: sellerStripeAccountId,
                },
                metadata: { // Metadata for the Payment Intent
                    purchase_request_id: purchase_request_id, // CRUCIAL for webhook
                    project_id: projectId,
                    buyer_id: buyerId,
                    seller_id: purchaseRequest.seller_id,
                    commission_rate_at_purchase: COMMISSION_RATE.toString(),
                    total_amount_decimal: totalAmount.toFixed(2),
                    commission_amount_decimal: commissionAmount.toFixed(2),
                    seller_receives_decimal: (totalAmount - commissionAmount).toFixed(2)
                },
            },
        };

        console.log('[STRIPE DEBUG] Session parameters being sent to Stripe:', JSON.stringify(sessionParams, null, 2));

        const session = await stripe.checkout.sessions.create(sessionParams);

        // Update purchase request status to 'payment_processing' and store session ID
        await db.query(
            "UPDATE purchase_requests SET status = 'payment_processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [purchase_request_id]
        );

        console.log(`[STRIPE DEBUG] Checkout session ${session.id} created for purchase request ${purchase_request_id}. Redirecting to Stripe. URL: ${session.url}`);
        res.json({ url: session.url, sessionId: session.id });

    } catch (error) {
        console.error('[STRIPE ERROR] Failed to create checkout session:', error);
        // Log more detailed Stripe error if available
        if (error.raw) {
            console.error('[STRIPE RAW ERROR]', JSON.stringify(error.raw, null, 2));
        }
        res.status(500).json({ 
            error: 'Failed to create payment session.', 
            details: error.message,
            type: error.type,
            code: error.code,
            stripe_error: error.raw // Send raw Stripe error if available (consider for dev only)
        });
    }
});

// --- Enhanced Stripe Webhook Handler ---
// POST /api/payments/webhook
const webhookService = require('../services/webhookService');

// Load balancing: Decide whether to use queue based on system metrics
async function shouldUseQueue() {
    try {
        // Simple load check based on memory usage and active connections
        const memUsage = process.memoryUsage();
        const memThreshold = 0.8; // 80% memory usage
        const memUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
        
        // Check database connection pool if available
        let dbLoad = false;
        if (db.pool && db.pool.totalCount && db.pool.idleCount) {
            const activeConnections = db.pool.totalCount - db.pool.idleCount;
            const connectionThreshold = 0.7; // 70% of max connections
            const connectionUsagePercent = activeConnections / (db.pool.options?.max || 20);
            dbLoad = connectionUsagePercent > connectionThreshold;
        }
        
        // Use queue if system is under high load
        const highLoad = memUsagePercent > memThreshold || dbLoad;
        
        if (highLoad) {
            console.log('[WEBHOOK] High system load detected, using queue processing');
        }
        
        return highLoad;
        
    } catch (error) {
        console.error('[WEBHOOK] Error checking system load:', error);
        return false; // Default to direct processing
    }
}

const webhookHandler = async (req, res) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    // Log webhook request
    console.log(`[STRIPE WEBHOOK] ${requestId} - Incoming webhook request`);
    
    // Require webhook secret for security
    if (!STRIPE_WEBHOOK_SECRET) {
        console.error(`[STRIPE WEBHOOK] ${requestId} - ERROR: STRIPE_WEBHOOK_SECRET is required`);
        return res.status(500).json({ 
            error: 'Webhook secret configuration error',
            requestId 
        });
    }

    const sig = req.headers['stripe-signature'];
    if (!sig) {
        console.error(`[STRIPE WEBHOOK] ${requestId} - ERROR: No Stripe signature in request headers`);
        return res.status(400).json({ 
            error: 'No Stripe signature provided',
            requestId 
        });
    }

    let event;
    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
        console.log(`[STRIPE WEBHOOK] ${requestId} - ✅ Verified webhook. Event ID: ${event.id}, Type: ${event.type}`);
    } catch (err) {
        console.error(`[STRIPE WEBHOOK] ${requestId} - ❌ Webhook signature verification failed: ${err.message}`);
        return res.status(400).json({ 
            error: `Webhook signature verification failed: ${err.message}`,
            requestId 
        });
    }

    try {
        // Check system load and decide whether to use queue
        const useQueue = await shouldUseQueue();
        
        // Process webhook with comprehensive error handling and retry logic
        const result = await webhookService.processWebhook(event, requestId, useQueue);
        
        const processingTime = Date.now() - startTime;
        console.log(`[STRIPE WEBHOOK] ${requestId} - Successfully processed in ${processingTime}ms`);
        
        return res.json({ 
            received: true, 
            eventId: event.id,
            requestId,
            processingTime,
            result 
        });
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`[STRIPE WEBHOOK] ${requestId} - Processing failed after ${processingTime}ms:`, error);
        
        // Return appropriate error status
        const status = error.message.includes('timeout') ? 408 : 500;
        return res.status(status).json({ 
            error: 'Webhook processing failed',
            message: error.message,
            eventId: event.id,
            requestId,
            processingTime
        });
    }
};

// Legacy webhook processing functions removed - now handled by webhookService
// This keeps the codebase clean and maintainable

// --- Get Transaction Status ---
// GET /api/payments/status/:sessionId
router.get('/status/:sessionId', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        // Get transaction details - Modified query to use seller_id from transaction for permission check
        const transactionResult = await db.query(
            `SELECT t.*, p.name as project_name, 
             t.seller_id, -- Select seller_id from transaction record
             s.username as seller_username, s.email as seller_email, 
             b.username as buyer_username, b.email as buyer_email
             FROM project_transactions t
             JOIN projects p ON t.project_id = p.project_id
             JOIN users s ON t.seller_id = s.user_id -- Join seller based on transaction seller_id
             JOIN users b ON t.buyer_id = b.user_id
             WHERE t.stripe_session_id = ? 
               AND (t.buyer_id = ? OR t.seller_id = ?) -- Check permission against buyer or seller from transaction
             LIMIT 1`, // Added LIMIT 1 for safety, though session ID should be unique
            [sessionId, userId, userId]
        );

        if (transactionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found or you do not have permission to view it' });
        }

        res.json(transactionResult.rows[0]);
    } catch (error) {
        console.error('Error getting transaction status:', error);
        res.status(500).json({ error: 'Failed to get transaction status' });
    }
});

// --- Get User Transactions ---
// GET /api/payments/transactions
router.get('/transactions', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all transactions where user is either buyer or seller
        const transactionsResult = await db.query(
            `SELECT t.*, p.name as project_name, 
             s.username as seller_username, 
             b.username as buyer_username
             FROM project_transactions t
             JOIN projects p ON t.project_id = p.project_id
             JOIN users s ON t.seller_id = s.user_id
             JOIN users b ON t.buyer_id = b.user_id
             WHERE t.buyer_id = ? OR t.seller_id = ?
             ORDER BY t.created_at DESC`,
            [userId, userId]
        );

        res.json(transactionsResult.rows);
    } catch (error) {
        console.error('Error getting user transactions:', error);
        res.status(500).json({ error: 'Failed to get transactions' });
    }
});

// --- Refresh Stripe Connect Onboarding Link ---
// POST /api/payments/connect/refresh-link
router.post('/connect/refresh-link', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get the user's Stripe account ID
        const userResult = await db.query(`
            SELECT stripe_account_id 
            FROM users 
            WHERE user_id = ?
        `, [userId]);
        
        if (userResult.rows.length === 0 || !userResult.rows[0].stripe_account_id) {
            return res.status(404).json({ error: 'No Stripe account found for this user' });
        }
        
        const stripeAccountId = userResult.rows[0].stripe_account_id;
        
        // Create a new account link
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${process.env.CLIENT_URL}/dashboard/connect/refresh`,
            return_url: `${process.env.CLIENT_URL}/dashboard/connect/complete`,
            type: 'account_onboarding',
        });
        
        res.json({ success: true, url: accountLink.url });
        
    } catch (error) {
        console.error('Error refreshing Stripe onboarding link:', error);
        res.status(500).json({ error: 'Failed to refresh Stripe Connect onboarding link' });
    }
});

// --- Get Project Transfer Status ---
// GET /api/payments/transfers/:projectId
router.get('/transfers/:projectId', authMiddleware, async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;
        
        // Get transaction details (no transfers table in SQLite schema)
        const transferResult = await db.query(
            `SELECT t.*, p.name as project_name, 
             s.username as seller_username, b.username as buyer_username
             FROM project_transactions t
             JOIN projects p ON t.project_id = p.project_id
             JOIN users s ON t.seller_id = s.user_id
             JOIN users b ON t.buyer_id = b.user_id
             WHERE t.project_id = ? AND (t.buyer_id = ? OR t.seller_id = ?)
             ORDER BY t.created_at DESC
             LIMIT 1`,
            [projectId, userId, userId]
        );
        
        if (transferResult.rows.length === 0) {
            return res.status(404).json({ error: 'No transfer found for this project' });
        }
        
        res.json(transferResult.rows[0]);
        
    } catch (error) {
        console.error('Error getting transfer status:', error);
        res.status(500).json({ error: 'Failed to get transfer status' });
    }
});

// --- Update Project Transfer Status (for Sellers) ---
// POST /api/payments/transfers/:projectId/update
router.post('/transfers/:projectId/update', authMiddleware, async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;
        const { code_transferred, domain_transferred, assets_transferred, notes } = req.body;
        
        // Get the transaction record (no transfers table)
        const transferResult = await db.query(
            `SELECT t.*, t.seller_id 
             FROM project_transactions t
             WHERE t.project_id = ?`,
            [projectId]
        );
        
        if (transferResult.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction record not found' });
        }
        
        const transaction = transferResult.rows[0];
        
        // Check if the user is the seller
        if (transaction.seller_id !== userId) {
            return res.status(403).json({ error: 'Only the seller can update transfer status' });
        }
        
        // Update the transaction status (simplified without transfer tracking)
        const allTransferred = code_transferred && domain_transferred && assets_transferred;
        const status = allTransferred ? 'completed' : 'in_progress';
        const completedAt = allTransferred ? 'CURRENT_TIMESTAMP' : null;
        
        await db.query(
            `UPDATE project_transactions 
             SET transfer_completed = ?, 
                 transfer_completed_at = ?,
                 transaction_notes = ?
             WHERE transaction_id = ?`,
            [allTransferred ? 1 : 0, completedAt, notes, transaction.transaction_id]
        );
        
        res.json({ success: true, status, transfer_completed: allTransferred });
        
    } catch (error) {
        console.error('Error updating transfer status:', error);
        res.status(500).json({ error: 'Failed to update transfer status' });
    }
});

// --- Debug route for testing Stripe checkout directly ---
// GET /api/payments/debug/checkout
if (process.env.NODE_ENV !== 'production') {
    router.get('/debug/checkout', async (req, res) => {
        try {
            console.log('[DEBUG] Creating test checkout session');
            
            // Create a simple test product
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'Test Product',
                                description: 'This is a test product for debugging Stripe integration',
                            },
                            unit_amount: 1000, // $10.00
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${CLIENT_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${CLIENT_URL}/marketplace`,
            });
            
            console.log('[DEBUG] Test checkout session created:', session.id);
            
            // Return both the session ID and a direct URL for testing
            res.json({
                session_id: session.id,
                checkout_url: `https://checkout.stripe.com/pay/${session.id}`,
                alternate_url: `https://checkout.stripe.com/c/pay/${session.id}`,
                success_url: `${CLIENT_URL}/purchase/success?session_id=${session.id}`,
                cancel_url: `${CLIENT_URL}/marketplace`
            });
        } catch (error) {
            console.error('[DEBUG] Error creating test checkout session:', error);
            res.status(500).json({ error: error.message });
        }
    });
}

// --- DEBUG ONLY: Manual Transfer Route (FOR DEVELOPMENT ONLY) ---
// POST /api/payments/debug/transfer-project
router.post('/debug/transfer-project', authMiddleware, async (req, res) => {
    // Only enable in development environment
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'This endpoint is not available in production' });
    }
    
    try {
        const { projectId, sellerId } = req.body;
        const buyerId = req.user.id;
        
        if (!projectId || !sellerId) {
            return res.status(400).json({ error: 'projectId and sellerId are required' });
        }
        
        console.log(`DEBUG: Manual project transfer requested. Project: ${projectId}, Seller: ${sellerId}, Buyer: ${buyerId}`);
        
        // Verify the project exists and is for sale
        const projectResult = await db.query(
            'SELECT * FROM projects WHERE project_id = ? AND is_for_sale = 1',
            [projectId]
        );
        
        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or not for sale' });
        }
        
        const project = projectResult.rows[0];
        console.log('DEBUG: Found project for transfer:', project.name);
        
        // Prevent buying your own project
        if (project.user_id === buyerId) {
            return res.status(400).json({ error: 'You cannot purchase your own project' });
        }
        
        // Create a mock transaction
        console.log('DEBUG: Creating mock transaction...');
        const transactionId = `txn_debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const transactionResult = await db.query(
            `INSERT INTO project_transactions 
            (transaction_id, project_id, seller_id, buyer_id, amount, seller_amount, commission_amount, status, payment_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                transactionId,
                projectId, 
                sellerId, 
                buyerId, 
                project.sale_price || 99.99, 
                (project.sale_price || 99.99) * 0.95, // 95% to seller
                (project.sale_price || 99.99) * 0.05, // 5% commission
                'completed',
                'debug_session_' + Date.now()
            ]
        );
        
        console.log(`DEBUG: Created transaction ID: ${transactionId}`);
        
        // Update the project ownership
        console.log('DEBUG: Updating project ownership...');
        const updateResult = await db.query(
            `UPDATE projects 
            SET is_for_sale = 0, 
                is_public = 0,
                user_id = ?, 
                updated_at = CURRENT_TIMESTAMP
            WHERE project_id = ?`,
            [buyerId, projectId]
        );
        
        if (updateResult.changes === 0) {
            throw new Error('Failed to update project ownership');
        }
        
        console.log('DEBUG: Project ownership updated successfully');
        
        // Update transaction to mark transfer as completed
        console.log('DEBUG: Updating transaction transfer status...');
        await db.query(
            `UPDATE project_transactions 
            SET transfer_completed = 1, transfer_completed_at = CURRENT_TIMESTAMP
            WHERE transaction_id = ?`,
            [transactionId]
        );
        console.log(`DEBUG: Transaction ${transactionId} marked as transfer completed`);
        
        // Skip certificate creation for debug (table may not exist)
        console.log('DEBUG: Skipping certificate creation for debug transfer');
        
        // Verify the changes are properly applied
        console.log('DEBUG: Verifying project transfer...');
        const verifyResult = await db.query(
            'SELECT user_id, updated_at FROM projects WHERE project_id = ?',
            [projectId]
        );
        
        if (verifyResult.rows.length > 0) {
            const verifiedProject = verifyResult.rows[0];
            console.log('DEBUG: Verification result:', verifiedProject);
            
            if (verifiedProject.user_id !== buyerId) {
                console.warn('WARNING: Project ownership transfer might have failed');
            }
        } else {
            console.warn('WARNING: Could not verify project transfer');
        }
        
        console.log(`DEBUG: Manual project transfer completed. Project ${projectId} transferred to user ${buyerId}.`);
        
        return res.json({
            success: true,
            message: 'Project transferred successfully',
            transaction_id: transactionId,
            project_id: projectId,
            redirect_url: '/dashboard?purchased=true'
        });
        
    } catch (error) {
        console.error('ERROR in debug transfer route:', error);
        return res.status(500).json({ error: 'Server error during manual transfer: ' + error.message });
    }
});

// Export both the router and the webhook handler
module.exports = { router, webhookHandler }; 