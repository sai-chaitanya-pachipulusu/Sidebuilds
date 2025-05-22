const express = require('express');
const db = require('../db');
require('dotenv').config();
const crypto = require('crypto');

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
                ppr.*, 
                p.name AS project_name, 
                p.description AS project_description, 
                p.is_for_sale AS project_is_for_sale,
                s_user.user_id AS seller_id,
                s_user.email AS seller_email, 
                s_user.stripe_account_id AS seller_stripe_account_id,
                s_user.username AS seller_username
             FROM project_purchase_requests ppr
             JOIN projects p ON ppr.project_id = p.project_id
             JOIN users s_user ON ppr.seller_id = s_user.user_id
             WHERE ppr.purchase_request_id = $1 AND ppr.buyer_id = $2`,
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
            await db.query("UPDATE project_purchase_requests SET status = 'aborted_project_unavailable' WHERE purchase_request_id = $1", [purchase_request_id]);
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
            "UPDATE project_purchase_requests SET stripe_checkout_session_id = $1, status = 'payment_processing', updated_at = current_timestamp WHERE purchase_request_id = $2",
            [session.id, purchase_request_id]
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

// --- Stripe Webhook Handler ---
// POST /api/payments/webhook
const webhookHandler = async (req, res) => {
    // Check if webhook secret is configured
    if (!STRIPE_WEBHOOK_SECRET) { // Corrected variable name
        console.warn('[STRIPE WEBHOOK DEV MODE] No webhook secret configured. Processing event without signature verification.');
        const event = req.body;
        console.log(`[STRIPE WEBHOOK DEV MODE] Event type: ${event.type}`);
        
        if (event.type === 'checkout.session.completed') {
            try {
                await processCheckoutCompleted(event.data.object);
                console.log('[STRIPE WEBHOOK DEV MODE] Processed checkout.session.completed successfully.');
            } catch (error) {
                console.error('[STRIPE WEBHOOK DEV MODE] Error processing checkout.session.completed:', error);
                return res.status(500).json({ error: 'Webhook processing error in dev mode.' });
            }
        } else if (event.type === 'account.updated') {
            try {
                await processAccountUpdated(event.data.object);
                console.log('[STRIPE WEBHOOK DEV MODE] Processed account.updated successfully.');
            } catch (error) {
                console.error('[STRIPE WEBHOOK DEV MODE] Error processing account.updated:', error);
                return res.status(500).json({ error: 'Webhook processing error in dev mode for account.updated.' });
            }
        } else {
            console.log(`[STRIPE WEBHOOK DEV MODE] Unhandled event type: ${event.type}`);
        }
        return res.json({ received: true });
    }

    const sig = req.headers['stripe-signature'];
    if (!sig) {
        console.error('[STRIPE WEBHOOK] ERROR: No Stripe signature in request headers');
        return res.status(400).send('No Stripe signature provided');
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET); // Corrected variable name
        console.log(`[STRIPE WEBHOOK] ✅ Successfully verified webhook. Event ID: ${event.id}, Type: ${event.type}`);
    } catch (err) {
        console.error(`[STRIPE WEBHOOK] ❌ Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle different event types
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log(`[STRIPE WEBHOOK] Processing checkout.session.completed for session ID: ${session.id}`);
            try {
                await processCheckoutCompleted(session);
                console.log(`[STRIPE WEBHOOK] Successfully processed checkout.session.completed for session ID: ${session.id}`);
            } catch (error) {
                console.error(`[STRIPE WEBHOOK] Error processing checkout.session.completed for session ID: ${session.id}:`, error);
                // Return 500 to signal Stripe to retry if appropriate, or handle specific errors
                return res.status(500).json({ error: 'Webhook processing error for checkout.session.completed.' });
            }
            break;
        case 'account.updated':
            const account = event.data.object;
            console.log(`[STRIPE WEBHOOK] Processing account.updated for account ID: ${account.id}`);
            try {
                await processAccountUpdated(account);
                console.log(`[STRIPE WEBHOOK] Successfully processed account.updated for account ID: ${account.id}`);
            } catch (error) {
                console.error(`[STRIPE WEBHOOK] Error processing account.updated for account ID: ${account.id}:`, error);
                return res.status(500).json({ error: 'Webhook processing error for account.updated.' });
            }
            break;
        // TODO: Handle other event types as needed (e.g., payment_failed, disputes, etc.)
        default:
            console.log(`[STRIPE WEBHOOK] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
};

async function processCheckoutCompleted(session) {
    const client = await db.connect(); // Use a client for transaction
    try {
        await client.query('BEGIN');
        console.log('[STRIPE WEBHOOK] processCheckoutCompleted: BEGIN transaction');

        const purchaseRequestId = session.metadata.purchase_request_id || session.client_reference_id;
        const paymentIntentId = session.payment_intent;

        if (!purchaseRequestId) {
            console.error('[STRIPE WEBHOOK] ERROR: purchase_request_id missing from session metadata or client_reference_id. Session:', JSON.stringify(session, null, 2));
            // If we can't identify the purchase request, we can't proceed. 
            // This might require manual investigation if it happens.
            await client.query('ROLLBACK');
            throw new Error('Critical: Purchase Request ID missing in webhook session data.');
        }

        console.log(`[STRIPE WEBHOOK] processCheckoutCompleted: Processing for Purchase Request ID: ${purchaseRequestId}, Payment Intent ID: ${paymentIntentId}`);

        // 1. Fetch the payment intent to get detailed charge information and precise amounts
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['latest_charge'] // Expand to get charge details including application_fee_amount
        });
        
        if (!paymentIntent || !paymentIntent.latest_charge) {
            console.error(`[STRIPE WEBHOOK] ERROR: Could not retrieve paymentIntent or latest_charge for PI ID: ${paymentIntentId}. Purchase Request ID: ${purchaseRequestId}`);
            await client.query('ROLLBACK');
            throw new Error('Failed to retrieve payment intent details from Stripe.');
        }

        const charge = paymentIntent.latest_charge;
        const totalAmountGross = charge.amount / 100; // Amount in dollars
        const applicationFeeAmount = (charge.application_fee_amount || 0) / 100; // Fee in dollars
        const netAmountToSeller = (charge.amount - (charge.application_fee_amount || 0)) / 100;       
        const currency = charge.currency;

        // 2. Fetch current purchase request details to get buyer_id, seller_id, project_id
        const prQuery = await client.query(
            'SELECT * FROM project_purchase_requests WHERE purchase_request_id = $1',
            [purchaseRequestId]
        );
        if (prQuery.rows.length === 0) {
            console.error(`[STRIPE WEBHOOK] ERROR: Purchase request ${purchaseRequestId} not found in database.`);
            await client.query('ROLLBACK');
            throw new Error(`Purchase request ${purchaseRequestId} not found.`);
        }
        const purchaseRequest = prQuery.rows[0];

        // Idempotency check: If already processed, skip.
        if (purchaseRequest.status === 'payment_completed_pending_transfer' || purchaseRequest.status === 'completed') {
            console.log(`[STRIPE WEBHOOK] Purchase request ${purchaseRequestId} already processed (status: ${purchaseRequest.status}). Skipping.`);
            await client.query('COMMIT');
            return;
        }

        // 3. Update project_purchase_requests status
        const updatePrStatusQuery = await client.query(
            `UPDATE project_purchase_requests 
             SET status = 'payment_completed_pending_transfer', 
                 stripe_payment_intent_id = $1, 
                 payment_date = CURRENT_TIMESTAMP, 
                 status_last_updated = CURRENT_TIMESTAMP 
             WHERE purchase_request_id = $2 AND status != 'payment_completed_pending_transfer' RETURNING *`,
            [paymentIntentId, purchaseRequestId]
        );
        if (updatePrStatusQuery.rowCount === 0) {
             console.warn(`[STRIPE WEBHOOK] Purchase request ${purchaseRequestId} status was not updated, possibly already processed or race condition.`);
             // Decide if to rollback or commit if no rows updated but not an error - for now, assume it might have been processed by a concurrent webhook.
        }
        console.log(`[STRIPE WEBHOOK] Updated purchase_request ${purchaseRequestId} status to payment_completed_pending_transfer.`);

        // 4. Log the transaction in the transactions table
        const transactionInsertQuery = await client.query(
            `INSERT INTO transactions (project_id, buyer_id, seller_id, purchase_request_id, stripe_payment_intent_id, 
                                    stripe_charge_id, amount_total, amount_platform_fee, amount_seller_received, currency, 
                                    payment_method, status, transaction_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP) RETURNING transaction_id`,
            [
                purchaseRequest.project_id,
                purchaseRequest.buyer_id,
                purchaseRequest.seller_id,
                purchaseRequestId,
                paymentIntentId,
                charge.id, // Stripe Charge ID from paymentIntent.latest_charge
                totalAmountGross, 
                applicationFeeAmount, 
                netAmountToSeller,
                currency.toUpperCase(),
                charge.payment_method_details?.type || 'card', // e.g., 'card'
                'completed' // Transaction status
            ]
        );
        const newTransactionId = transactionInsertQuery.rows[0].transaction_id;
        console.log(`[STRIPE WEBHOOK] Logged transaction ${newTransactionId} for purchase request ${purchaseRequestId}.`);

        // 5. Create seller certificate (adapt to your existing logic if different)
        // Ensure this logic aligns with your `seller_certificates` table schema
        const verificationCode = crypto.randomBytes(16).toString('hex').toUpperCase();
        try {
            await client.query(
                `INSERT INTO seller_certificates (seller_id, project_id, transaction_id, buyer_id, sale_amount, verification_code, purchase_request_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING certificate_id`,
                [
                    purchaseRequest.seller_id, 
                    purchaseRequest.project_id, 
                    newTransactionId, 
                    purchaseRequest.buyer_id, 
                    totalAmountGross, // Or netAmountToSeller, depending on what 'sale_amount' represents
                    verificationCode,
                    purchaseRequestId
                ]
            );
            console.log(`[STRIPE WEBHOOK] Seller certificate created for transaction ${newTransactionId}, purchase request ${purchaseRequestId}.`);
        } catch (certError) {
            console.error(`[STRIPE WEBHOOK] Error creating seller certificate for PR ${purchaseRequestId}:`, certError);
            // Decide if this is a critical error that should rollback the transaction.
            // For now, we'll log it and continue, as the payment itself is processed.
        }

        // IMPORTANT: No project ownership transfer here. That's a separate platform-managed step.

        // TODO: Send notifications to buyer and seller about successful payment.

        await client.query('COMMIT');
        console.log('[STRIPE WEBHOOK] processCheckoutCompleted: COMMIT transaction');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[STRIPE WEBHOOK] processCheckoutCompleted: ROLLBACK transaction due to error:', error);
        // Re-throw the error so the webhookHandler can return a 500 to Stripe, prompting a retry if applicable.
        throw error; 
    } finally {
        client.release();
        console.log('[STRIPE WEBHOOK] processCheckoutCompleted: DB client released');
    }
}

async function processAccountUpdated(account) {
    console.log(`[STRIPE WEBHOOK] account.updated event for account: ${account.id}`);
    console.log(`[STRIPE WEBHOOK] Details: charges_enabled: ${account.charges_enabled}, payouts_enabled: ${account.payouts_enabled}, details_submitted: ${account.details_submitted}`);

    // Find user by stripe_account_id
    try {
        const userQuery = await db.query('SELECT user_id, username, email FROM users WHERE stripe_account_id = $1', [account.id]);
        if (userQuery.rows.length > 0) {
            const user = userQuery.rows[0];
            console.log(`[STRIPE WEBHOOK] Found user ${user.username} (ID: ${user.user_id}) for Stripe account ${account.id}.`);

            // Update user's Stripe onboarding status in your database if needed
            // This is useful for enabling/disabling features based on Stripe Connect status
            const onboardingComplete = account.charges_enabled && account.payouts_enabled && account.details_submitted;
            await db.query(
                'UPDATE users SET stripe_onboarding_complete = $1, stripe_charges_enabled = $2, stripe_payouts_enabled = $3 WHERE user_id = $4',
                [onboardingComplete, account.charges_enabled, account.payouts_enabled, user.user_id]
            );
            console.log(`[STRIPE WEBHOOK] Updated Stripe onboarding status for user ${user.username}. Onboarding complete: ${onboardingComplete}`);
            
            // TODO: Send notification to user about their account status change if relevant.
        } else {
            console.warn(`[STRIPE WEBHOOK] No user found with Stripe account ID ${account.id}. This might be an old or unlinked account.`);
        }
    } catch (error) {
        console.error(`[STRIPE WEBHOOK] Error processing account.updated for account ${account.id}:`, error);
        // Do not re-throw here, as this is an info update, not critical to payment flow usually.
    }
}

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
             WHERE t.stripe_session_id = $1 
               AND (t.buyer_id = $2 OR t.seller_id = $2) -- Check permission against buyer or seller from transaction
             LIMIT 1`, // Added LIMIT 1 for safety, though session ID should be unique
            [sessionId, userId]
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
             WHERE t.buyer_id = $1 OR t.seller_id = $1
             ORDER BY t.created_at DESC`,
            [userId]
        );

        res.json(transactionsResult.rows);
    } catch (error) {
        console.error('Error getting user transactions:', error);
        res.status(500).json({ error: 'Failed to get transactions' });
    }
});

// --- Create Stripe Connect Account Link (for Seller Onboarding) ---
// POST /api/payments/connect/create-account
router.post('/connect/create-account', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Check if user already has a Stripe account
        const userResult = await db.query(
            'SELECT stripe_account_id, onboarding_complete FROM users WHERE user_id = $1',
            [userId]
        );
        
        const user = userResult.rows[0];
        
        // If the user already has a completed account, return that
        if (user.stripe_account_id && user.onboarding_complete) {
            return res.json({ success: true, onboarding_complete: true, message: 'Your Stripe account is already set up' });
        }
        
        let stripeAccountId = user.stripe_account_id;
        
        // If the user doesn't have a Stripe account yet, create one
        if (!stripeAccountId) {
            // Get user details
            const userDetailsResult = await db.query(
                'SELECT email, username, first_name, last_name FROM users WHERE user_id = $1',
                [userId]
            );
            
            if (userDetailsResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const userDetails = userDetailsResult.rows[0];
            
            // Create a Stripe Connect Express account
            const account = await stripe.accounts.create({
                type: 'express',
                email: userDetails.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_type: 'individual',
                business_profile: {
                    name: userDetails.username || `${userDetails.first_name} ${userDetails.last_name}`,
                    url: process.env.CLIENT_URL,
                },
                metadata: {
                    user_id: userId
                }
            });
            
            stripeAccountId = account.id;
            
            // Save the Stripe account ID in our database
            await db.query(
                'UPDATE users SET stripe_account_id = $1 WHERE user_id = $2',
                [stripeAccountId, userId]
            );
        }
        
        // Create an account link for the Express onboarding
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${process.env.CLIENT_URL}/dashboard/connect/refresh`,
            return_url: `${process.env.CLIENT_URL}/dashboard/connect/complete`,
            type: 'account_onboarding',
        });
        
        // Return the URL where to redirect the user
        res.json({ success: true, url: accountLink.url });
        
    } catch (error) {
        console.error('Error creating Stripe account:', error);
        res.status(500).json({ error: 'Failed to create Stripe Connect account' });
    }
});

// --- Check Stripe Connect Account Status ---
// GET /api/payments/connect/status
router.get('/connect/status', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get the user's Stripe account ID
        const userResult = await db.query(
            'SELECT stripe_account_id FROM users WHERE user_id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const { stripe_account_id } = userResult.rows[0];
        
        if (!stripe_account_id) {
            return res.json({ has_account: false });
        }
        
        // Retrieve the account details from Stripe
        const account = await stripe.accounts.retrieve(stripe_account_id);
        
        // Check if the account has completed onboarding
        const onboardingComplete = account.details_submitted;
        const payoutEnabled = account.payouts_enabled;
        
        // Update our database with the latest status
        await db.query(
            'UPDATE users SET onboarding_complete = $1, payout_enabled = $2 WHERE user_id = $3',
            [onboardingComplete, payoutEnabled, userId]
        );
        
        res.json({
            has_account: true,
            account_id: stripe_account_id,
            onboarding_complete: onboardingComplete,
            payout_enabled: payoutEnabled,
            account_details: {
                charges_enabled: account.charges_enabled,
                payouts_enabled: account.payouts_enabled,
                requirements: account.requirements,
                capabilities: account.capabilities
            }
        });
        
    } catch (error) {
        console.error('Error checking Stripe account status:', error);
        res.status(500).json({ error: 'Failed to check Stripe Connect account status' });
    }
});

// --- Refresh Stripe Connect Onboarding Link ---
// POST /api/payments/connect/refresh-link
router.post('/connect/refresh-link', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get the user's Stripe account ID
        const userResult = await db.query(
            'SELECT stripe_account_id FROM users WHERE user_id = $1',
            [userId]
        );
        
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
        
        // Get transaction and transfer details
        const transferResult = await db.query(
            `SELECT t.*, pt.*, p.name as project_name, 
             s.username as seller_username, b.username as buyer_username
             FROM project_transactions t
             JOIN project_transfers pt ON t.transaction_id = pt.transaction_id
             JOIN projects p ON t.project_id = p.project_id
             JOIN users s ON t.seller_id = s.user_id
             JOIN users b ON t.buyer_id = b.user_id
             WHERE t.project_id = $1 AND (t.buyer_id = $2 OR t.seller_id = $2)
             ORDER BY t.created_at DESC
             LIMIT 1`,
            [projectId, userId]
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
        
        // Get the transfer record
        const transferResult = await db.query(
            `SELECT pt.*, t.seller_id 
             FROM project_transfers pt
             JOIN project_transactions t ON pt.transaction_id = t.transaction_id
             WHERE pt.project_id = $1`,
            [projectId]
        );
        
        if (transferResult.rows.length === 0) {
            return res.status(404).json({ error: 'Transfer record not found' });
        }
        
        const transfer = transferResult.rows[0];
        
        // Check if the user is the seller
        if (transfer.seller_id !== userId) {
            return res.status(403).json({ error: 'Only the seller can update transfer status' });
        }
        
        // Update the transfer status
        const allTransferred = code_transferred && domain_transferred && assets_transferred;
        const status = allTransferred ? 'completed' : 'in_progress';
        const completedAt = allTransferred ? 'NOW()' : 'NULL';
        
        await db.query(
            `UPDATE project_transfers 
             SET code_transferred = $1, 
                 domain_transferred = $2, 
                 assets_transferred = $3, 
                 status = $4, 
                 transfer_notes = $5,
                 transfer_completed_at = ${completedAt}
             WHERE transfer_id = $6`,
            [code_transferred, domain_transferred, assets_transferred, status, notes, transfer.transfer_id]
        );
        
        res.json({ success: true, status });
        
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
            'SELECT * FROM projects WHERE project_id = $1 AND is_for_sale = TRUE',
            [projectId]
        );
        
        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or not for sale' });
        }
        
        const project = projectResult.rows[0];
        console.log('DEBUG: Found project for transfer:', project.name);
        
        // Prevent buying your own project
        if (project.owner_id === buyerId) {
            return res.status(400).json({ error: 'You cannot purchase your own project' });
        }
        
        // Create a mock transaction
        console.log('DEBUG: Creating mock transaction...');
        const transactionResult = await db.query(
            `INSERT INTO project_transactions 
            (project_id, seller_id, buyer_id, amount, seller_amount, commission_amount, status, stripe_session_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING transaction_id`,
            [
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
        
        const transactionId = transactionResult.rows[0].transaction_id;
        console.log(`DEBUG: Created transaction ID: ${transactionId}`);
        
        // Update the project ownership
        console.log('DEBUG: Updating project ownership...');
        const updateResult = await db.query(
            `UPDATE projects 
            SET is_for_sale = FALSE, 
                is_public = FALSE,
                owner_id = $1, 
                previous_owner_id = $2, 
                transfer_date = NOW(),
                purchased_at = NOW(),
                source = 'purchased'
            WHERE project_id = $3
            RETURNING project_id, name, owner_id, source, purchased_at`,
            [buyerId, sellerId, projectId]
        );
        
        if (updateResult.rows.length === 0) {
            throw new Error('Failed to update project ownership');
        }
        
        const updatedProject = updateResult.rows[0];
        console.log('DEBUG: Project ownership updated:', updatedProject);
        
        // Create a transfer record
        console.log('DEBUG: Creating transfer record...');
        const transferResult = await db.query(
            `INSERT INTO project_transfers 
            (project_id, transaction_id, status, transfer_type, assets_transferred)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING transfer_id`,
            [projectId, transactionId, 'completed', 'full_ownership', true]
        );
        
        const transferId = transferResult.rows[0].transfer_id;
        console.log(`DEBUG: Created transfer record ID: ${transferId}`);
        
        // Create a certificate
        console.log('DEBUG: Creating seller certificate...');
        const verificationCode = require('crypto').randomBytes(16).toString('hex').toUpperCase();
        const certificateResult = await db.query(
            `INSERT INTO seller_certificates
            (seller_id, project_id, transaction_id, buyer_id, sale_amount, verification_code)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING certificate_id`,
            [sellerId, projectId, transactionId, buyerId, project.sale_price || 99.99, verificationCode]
        );
        
        const certificateId = certificateResult.rows[0].certificate_id;
        console.log(`DEBUG: Created certificate ID: ${certificateId}`);
        
        // Verify the changes are properly applied
        console.log('DEBUG: Verifying project transfer...');
        const verifyResult = await db.query(
            'SELECT owner_id, source, purchased_at FROM projects WHERE project_id = $1',
            [projectId]
        );
        
        if (verifyResult.rows.length > 0) {
            const verifiedProject = verifyResult.rows[0];
            console.log('DEBUG: Verification result:', verifiedProject);
            
            if (verifiedProject.owner_id !== buyerId) {
                console.warn('WARNING: Project ownership transfer might have failed');
            }
            
            if (verifiedProject.source !== 'purchased') {
                console.warn('WARNING: Project source was not set to "purchased"');
            }
            
            if (!verifiedProject.purchased_at) {
                console.warn('WARNING: Project purchased_at was not set');
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
            transfer_id: transferId,
            certificate_id: certificateId,
            redirect_url: '/dashboard?purchased=true'
        });
        
    } catch (error) {
        console.error('ERROR in debug transfer route:', error);
        return res.status(500).json({ error: 'Server error during manual transfer: ' + error.message });
    }
});

// Export both the router and the webhook handler
module.exports = { router, webhookHandler }; 