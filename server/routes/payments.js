const express = require('express');
const db = require('../db');
require('dotenv').config();

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
        const { projectId } = req.body;
        const buyerId = req.user.id;

        console.log(`[STRIPE DEBUG] Creating checkout session for project ${projectId}, buyer ${buyerId}`);
        console.log(`[STRIPE DEBUG] User auth info:`, JSON.stringify(req.user));
        
        console.log(`[STRIPE DEBUG] Stripe config:`, {
            secretKeyExists: !!STRIPE_SECRET_KEY,
            publishableKeyExists: !!STRIPE_PUBLISHABLE_KEY,
            webhookSecretExists: !!STRIPE_WEBHOOK_SECRET
        });

        // Get project details and seller info
        const projectResult = await db.query(
            'SELECT p.*, u.email as seller_email, u.user_id as seller_id, u.username as seller_username FROM projects p JOIN users u ON p.owner_id = u.user_id WHERE p.project_id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            console.log(`[STRIPE DEBUG] Project ${projectId} not found`);
            return res.status(404).json({ error: 'Project not found' });
        }

        const project = projectResult.rows[0];
        console.log(`[STRIPE DEBUG] Project details:`, JSON.stringify(project));

        // Check if project is for sale
        if (!project.is_for_sale) {
            console.log(`[STRIPE DEBUG] Project ${projectId} is not for sale`);
            return res.status(400).json({ error: 'This project is not for sale' });
        }

        // Prevent buying your own project
        if (project.owner_id === buyerId) {
            console.log(`[STRIPE DEBUG] User ${buyerId} attempted to buy their own project ${projectId}`);
            return res.status(400).json({ error: "You cannot purchase your own project" });
        }

        // Validate sale price
        if (!project.sale_price || project.sale_price <= 0) {
            console.log(`[STRIPE DEBUG] Project ${projectId} has an invalid sale price: ${project.sale_price}`);
            return res.status(400).json({ error: 'Project has an invalid sale price' });
        }

        // Always ensure contact information is available
        // This is important for seeded projects which might not have contact info
        if (!project.contact_email && !project.contact_phone) {
            console.log(`[STRIPE DEBUG] Project ${projectId} is missing contact information - attempting to auto-fill`);
            
            // Auto-fill contact email for projects using the owner's email
            if (project.seller_email) {
                console.log(`[STRIPE DEBUG] Using seller's email (${project.seller_email}) as contact for project ${projectId}`);
                
                try {
                    // Update the project with the owner's email
                    await db.query(
                        'UPDATE projects SET contact_email = $1 WHERE project_id = $2',
                        [project.seller_email, projectId]
                    );
                    
                    // Use the updated value
                    project.contact_email = project.seller_email;
                    console.log(`[STRIPE DEBUG] Successfully updated project ${projectId} with contact email ${project.contact_email}`);
                } catch (dbError) {
                    console.error(`[STRIPE ERROR] Failed to update project contact info:`, dbError);
                    // Continue anyway, we'll use the seller_email directly even if DB update fails
                }
            } else {
                // For seeded projects with no seller_email, use a default value rather than failing
                console.log(`[STRIPE DEBUG] No seller email available for project ${projectId}, using default contact`);
                project.contact_email = 'support@sideprojecttracker.com';
            }
        }

        // Calculate commission amount and seller amount
        const totalAmount = parseFloat(project.sale_price);
        const commissionAmount = (totalAmount * COMMISSION_RATE) / 100;
        const sellerAmount = totalAmount - commissionAmount;

        // Log URLs being used for Stripe redirection
        const successUrl = `${CLIENT_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${CLIENT_URL}/marketplace`;
        
        console.log(`[STRIPE DEBUG] URLs for redirection:`, {
            CLIENT_URL,
            successUrl, 
            cancelUrl
        });

        console.log(`[STRIPE DEBUG] Creating Stripe checkout session for project ${projectId}, amount: ${totalAmount}, commission: ${commissionAmount}, seller: ${sellerAmount}`);

        // Create a better product description
        const productDescription = project.description 
            ? `${project.description.substring(0, 250)}${project.description.length > 250 ? '...' : ''}`
            : `Side project: ${project.name} by ${project.seller_username || 'seller'}`;

        // Extra validation for seeded projects (IDs with repeating characters)
        const isSeededProject = projectId.includes('aaaaaaaa') || 
                               projectId.includes('bbbbbbbb') || 
                               projectId.includes('cccccccc') || 
                               projectId.includes('dddddddd') || 
                               projectId.includes('eeeeeeee') || 
                               projectId.includes('ffffffff') || 
                               projectId.includes('99999999') || 
                               projectId.includes('88888888') || 
                               projectId.includes('77777777');
        
        console.log(`[STRIPE DEBUG] Is seeded project: ${isSeededProject}`);
        
        // For seeded projects, ensure all required fields are properly formatted
        if (isSeededProject) {
            console.log(`[STRIPE DEBUG] Extra validation for seeded project`);
            // Ensure the price is a valid number
            if (isNaN(totalAmount) || totalAmount <= 0) {
                totalAmount = 499.99; // Default price for seeded projects
                console.log(`[STRIPE DEBUG] Using default price ${totalAmount} for seeded project`);
            }
            
            // Ensure description is not too long (Stripe has limits)
            if (productDescription.length > 500) {
                productDescription = productDescription.substring(0, 497) + '...';
                console.log(`[STRIPE DEBUG] Trimmed description length to ${productDescription.length}`);
            }
        }
        
        try {
            // For seeded projects, use a simplified checkout session configuration
            // This is more reliable and avoids potential issues with complex metadata
            if (isSeededProject) {
                console.log(`[STRIPE DEBUG] Using simplified checkout for seeded project`);
                
                // Ensure the amount is a valid number (at least 50 cents, as required by Stripe)
                const safeAmount = Math.max(Math.round(totalAmount * 100), 50);
                
                const sessionConfig = {
                    payment_method_types: ['card'],
                    line_items: [
                        {
                            price_data: {
                                currency: 'usd',
                                product_data: {
                                    name: project.name.substring(0, 50),
                                    description: productDescription.substring(0, 250)
                                },
                                unit_amount: safeAmount,
                            },
                            quantity: 1,
                        },
                    ],
                    mode: 'payment',
                    success_url: successUrl,
                    cancel_url: cancelUrl,
                    // Use minimal metadata for seeded projects
                    metadata: {
                        project_id: projectId,
                        is_seeded: 'true'
                    }
                };
                
                console.log(`[STRIPE DEBUG] Session config:`, JSON.stringify(sessionConfig, null, 2));
                
                const session = await stripe.checkout.sessions.create(sessionConfig);
                
                // Log the created session details
                console.log(`[STRIPE DEBUG] Checkout URL: https://checkout.stripe.com/pay/${session.id}`);
                
                // Create a pending transaction in the database
                await db.query(
                    `INSERT INTO project_transactions 
                    (project_id, buyer_id, seller_id, amount, status, payment_method, stripe_session_id, commission_amount, seller_amount) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [projectId, buyerId, project.owner_id, totalAmount, 'pending', 'stripe', session.id, commissionAmount, sellerAmount]
                );
                
                console.log(`[STRIPE DEBUG] Transaction record created for seeded project session ${session.id}`);
                
                // Return the session ID to the client
                return res.json({ id: session.id });
            }
            
            // Standard checkout for regular projects
            const standardSessionConfig = {
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: project.name.substring(0, 50), // Ensure name isn't too long
                                description: productDescription
                            },
                            unit_amount: Math.max(Math.round(totalAmount * 100), 50), // Convert to cents, minimum 50 cents
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    project_id: projectId,
                    buyer_id: buyerId,
                    seller_id: project.owner_id,
                    commission_amount: commissionAmount.toFixed(2),
                    seller_amount: sellerAmount.toFixed(2),
                    is_seeded: isSeededProject ? 'true' : 'false'
                }
            };
            
            console.log(`[STRIPE DEBUG] Standard session config:`, JSON.stringify(standardSessionConfig, null, 2));
            
            const session = await stripe.checkout.sessions.create(standardSessionConfig);
            
            console.log(`[STRIPE DEBUG] Checkout session created successfully: ${session.id}`);
            console.log(`[STRIPE DEBUG] Checkout URL: https://checkout.stripe.com/pay/${session.id}`);
            
            // Create a pending transaction in the database
            await db.query(
                `INSERT INTO project_transactions 
                (project_id, buyer_id, seller_id, amount, status, payment_method, stripe_session_id, commission_amount, seller_amount) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [projectId, buyerId, project.owner_id, totalAmount, 'pending', 'stripe', session.id, commissionAmount, sellerAmount]
            );
            
            console.log(`[STRIPE DEBUG] Transaction record created in database for session ${session.id}`);
            
            // Return the session ID to the client
            res.json({ id: session.id });
        } catch (stripeError) {
            console.error('[STRIPE ERROR] Stripe session creation error:', stripeError);
            
            if (stripeError.type) {
                console.error(`[STRIPE ERROR] Stripe error type: ${stripeError.type}`);
            }
            
            if (stripeError.raw) {
                console.error(`[STRIPE ERROR] Raw Stripe error:`, stripeError.raw);
            }
            
            if (stripeError.stack) {
                console.error(`[STRIPE ERROR] Error stack:`, stripeError.stack);
            }
            
            // Check for specific Stripe errors
            if (stripeError.type === 'StripeCardError') {
                return res.status(400).json({ error: `Payment error: ${stripeError.message}` });
            } else if (stripeError.type === 'StripeInvalidRequestError') {
                return res.status(400).json({ error: `Invalid request: ${stripeError.message}` });
            }
            
            res.status(500).json({ error: 'Failed to create checkout session. Please try again.' });
        }
    } catch (error) {
        console.error('[STRIPE ERROR] Stripe session creation error:', error);
        
        if (error.type) {
            console.error(`[STRIPE ERROR] Stripe error type: ${error.type}`);
        }
        
        if (error.raw) {
            console.error(`[STRIPE ERROR] Raw Stripe error:`, error.raw);
        }
        
        if (error.stack) {
            console.error(`[STRIPE ERROR] Error stack:`, error.stack);
        }
        
        // Check for specific Stripe errors
        if (error.type === 'StripeCardError') {
            return res.status(400).json({ error: `Payment error: ${error.message}` });
        } else if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({ error: `Invalid request: ${error.message}` });
        }
        
        res.status(500).json({ error: 'Failed to create checkout session. Please try again.' });
    }
});

// --- Stripe Webhook Handler ---
// POST /api/payments/webhook
const webhookHandler = async (req, res) => {
    // Check if webhook secret is configured
    if (!endpointSecret) {
        console.error('ERROR: No webhook secret configured - check your STRIPE_WEBHOOK_SECRET env variable');
        return res.status(500).send('Webhook secret is not configured');
    }

    const sig = req.headers['stripe-signature'];
    if (!sig) {
        console.error('ERROR: No Stripe signature in request headers');
        return res.status(400).send('No Stripe signature provided');
    }

    console.log(`Received webhook with signature: ${sig.substring(0, 20)}...`);
    console.log(`Body type: ${typeof req.body}, is Buffer: ${Buffer.isBuffer(req.body)}`);

    let event;

    try {
        // Construct the event from the raw body and signature
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        console.log(`✅ Successfully verified webhook. Event type: ${event.type}`);
    } catch (err) {
        console.error(`❌ Webhook signature verification failed: ${err.message}`);
        if (err.message.includes('No signatures found')) {
            console.error('This typically means the body was parsed before verification');
        }
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle different event types
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log(`Processing checkout.session.completed. Session ID: ${session.id}`);
            try {
                // Get transaction details from database
                const transactionResult = await db.query(
                    'SELECT * FROM project_transactions WHERE stripe_session_id = $1',
                    [session.id]
                );
                
                if (transactionResult.rows.length === 0) {
                    console.error(`No transaction found for session ID: ${session.id}`);
                    return res.status(200).json({ received: true });
                }
                
                const transaction = transactionResult.rows[0];
                
                // Get seller info from database
                const sellerResult = await db.query(
                    'SELECT * FROM users WHERE user_id = $1',
                    [transaction.seller_id]
                );
                
                if (sellerResult.rows.length === 0) {
                    throw new Error('Seller not found');
                }
                
                const seller = sellerResult.rows[0];
                
                // Check if seller has a Stripe Connect account
                if (seller.stripe_account_id) {
                    // Transfer funds to the seller's Stripe account
                    const transfer = await stripe.transfers.create({
                        amount: Math.round(transaction.seller_amount * 100), // Convert to cents
                        currency: 'usd',
                        destination: seller.stripe_account_id,
                        transfer_group: `project-${transaction.project_id}`,
                        source_transaction: session.payment_intent,
                        metadata: {
                            transaction_id: transaction.transaction_id,
                            project_id: transaction.project_id,
                            buyer_id: transaction.buyer_id,
                            seller_id: transaction.seller_id
                        }
                    });
                    
                    // Record the transfer in the database
                    await db.query(
                        'UPDATE project_transactions SET transfer_id = $1, transfer_status = $2 WHERE transaction_id = $3',
                        [transfer.id, 'completed', transaction.transaction_id]
                    );
                    
                    console.log(`Transfer ${transfer.id} created successfully for seller ${seller.user_id}`);
                } else {
                    // Record that a manual payout is needed
                    await db.query(
                        'UPDATE project_transactions SET transfer_status = $1, notes = $2 WHERE transaction_id = $3',
                        ['pending_manual', 'Seller has no Stripe Connect account. Manual payout required.', transaction.transaction_id]
                    );
                    
                    console.log(`Manual payout needed for seller ${seller.user_id} - no Stripe Connect account`);
                    
                    // Send email notification to admin about manual payout requirement
                    // Implementation depends on your email service
                    // sendAdminNotification('manual_payout_required', { transaction, seller });
                }
                
                // Get project details
                const projectResult = await db.query(
                    'SELECT * FROM projects WHERE project_id = $1',
                    [transaction.project_id]
                );
                
                if (projectResult.rows.length === 0) {
                    throw new Error('Project not found');
                }
                
                const project = projectResult.rows[0];
                
                // Get buyer details for notifications
                const buyerResult = await db.query(
                    'SELECT * FROM users WHERE user_id = $1',
                    [transaction.buyer_id]
                );
                
                if (buyerResult.rows.length === 0) {
                    throw new Error('Buyer not found');
                }
                
                const buyer = buyerResult.rows[0];
                
                // Create a transfer record in the project_transfers table
                await db.query(
                    `INSERT INTO project_transfers 
                    (project_id, transaction_id, status, transfer_type, assets_transferred)
                    VALUES ($1, $2, $3, $4, $5)`,
                    [transaction.project_id, transaction.transaction_id, 'pending', 'full_ownership', false]
                );

                // Update transaction status
                await db.query(
                    'UPDATE project_transactions SET status = $1, payment_id = $2 WHERE stripe_session_id = $3',
                    ['completed', session.payment_intent, session.id]
                );

                // Mark the project as sold and transfer ownership
                await db.query(
                    'UPDATE projects SET is_for_sale = FALSE, owner_id = $1, previous_owner_id = $2, transfer_date = NOW() WHERE project_id = $3',
                    [transaction.buyer_id, transaction.seller_id, transaction.project_id]
                );
                
                // Send notifications to buyer and seller
                // Implementation depends on your email/notification service
                /* 
                sendEmail(buyer.email, 'Purchase Successful', {
                    project_name: project.name,
                    amount: transaction.amount,
                    next_steps: 'You will receive transfer details within 24 hours.'
                });
                
                sendEmail(seller.email, 'Your Project Was Sold', {
                    project_name: project.name,
                    amount: transaction.seller_amount,
                    fee: transaction.commission_amount,
                    payout_status: seller.stripe_account_id ? 'automatic' : 'manual',
                    next_steps: 'Please transfer project assets within 24 hours.'
                });
                */
                
                console.log(`Project ${transaction.project_id} sold successfully`);
                
            } catch (error) {
                console.error('Error processing checkout completion:', error);
            }
            break;
        default:
            // Handle other event types
            console.log(`Unhandled event type: ${event.type}`);
            break;
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
};

// --- Get Transaction Status ---
// GET /api/payments/status/:sessionId
router.get('/status/:sessionId', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        // Get transaction details
        const transactionResult = await db.query(
            `SELECT t.*, p.name as project_name, p.owner_id as seller_id, s.username as seller_username, 
             s.email as seller_email, b.username as buyer_username, b.email as buyer_email
             FROM project_transactions t
             JOIN projects p ON t.project_id = p.project_id
             JOIN users s ON p.owner_id = s.user_id
             JOIN users b ON t.buyer_id = b.user_id
             WHERE t.stripe_session_id = $1 AND (t.buyer_id = $2 OR p.owner_id = $2)`,
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

// Export both the router and the webhook handler
module.exports = { router, webhookHandler }; 