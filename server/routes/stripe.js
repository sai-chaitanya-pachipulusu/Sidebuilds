const express = require('express');
const router = express.Router();
// Use the pre-configured Stripe instance from config
const { stripe } = require('../config/stripe.config');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../db');

// POST /api/stripe/create-account-link
// Creates a Stripe account link for onboarding or account updates
router.post('/create-account-link', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        let { type } = req.body;
        type = type || 'account_onboarding'; // Default to onboarding

        // Get user's Stripe account ID from DB
        const userResult = await db.query('SELECT stripe_account_id FROM users WHERE user_id = $1', [userId]);
        let stripeAccountId = userResult.rows.length > 0 ? userResult.rows[0].stripe_account_id : null;

        if (!stripeAccountId) {
            // Create a new Stripe Express account if one doesn't exist
            const account = await stripe.accounts.create({
                type: process.env.STRIPE_CONNECT_ACCOUNT_TYPE || 'express', // 'express' or 'standard'
                country: 'US', // Or dynamically determine based on user
                email: req.user.email, // Pre-fill email
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            });
            stripeAccountId = account.id;
            // Save the new Stripe account ID to the user's record
            await db.query('UPDATE users SET stripe_account_id = $1 WHERE user_id = $2', [stripeAccountId, userId]);
        }

        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${process.env.CLIENT_URL}/profile-settings?stripe_refresh=true`, // User is redirected here if link expires
            return_url: `${process.env.CLIENT_URL}/profile-settings?stripe_return=true`,   // User is redirected here after completing flow
            type: type, // 'account_onboarding' or 'account_update'
        });

        res.json({ url: accountLink.url });
    } catch (error) {
        console.error('Error creating Stripe account link:', error);
        res.status(500).json({ message: 'Failed to create Stripe account link', error: error.message });
    }
});

// GET /api/stripe/check-onboarding-status
// Checks the user's Stripe account status and updates the database
router.get('/check-onboarding-status', authMiddleware, async (req, res) => {
    console.log('==== STRIPE STATUS CHECK START ====');
    console.log('User:', req.user.id);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Client URL:', process.env.CLIENT_URL);
    
    // Allow CORS for this specific endpoint too (belt and suspenders)
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // First, verify Stripe is properly configured
    const { stripe, stripeConfigValid, configErrors } = require('../config/stripe.config');
    if (!stripeConfigValid) {
        console.error('Stripe config invalid:', configErrors);
        return res.status(500).json({ 
            message: 'Stripe is not properly configured on the server',
            errors: configErrors,
            action: 'Please contact support to resolve this issue'
        });
    }
    
    try {
        console.log('Step 1: Getting user ID from request');
        const userId = req.user.id;
        
        // Validate userId format to catch obvious issues early
        if (!userId || typeof userId !== 'string') {
            console.error('Invalid user ID:', userId);
            return res.status(400).json({ message: 'Invalid user ID in request' });
        }
        
        console.log('Step 2: Querying database for user Stripe info');
        try {
            const userResult = await db.query(
                'SELECT stripe_account_id, email FROM users WHERE user_id = $1',
                [userId]
            );
            console.log('Query complete, rows returned:', userResult.rows.length);

            if (userResult.rows.length === 0) {
                console.log('No user found in database');
                return res.status(404).json({ message: 'User not found' });
            }

            let { stripe_account_id: stripeAccountId, email } = userResult.rows[0];
            console.log('Stripe account ID from DB:', stripeAccountId ? 'Found (masked)' : 'Not found');

            if (!stripeAccountId) {
                console.log('Step 3A: No Stripe account ID, creating new account');
                try {
                    console.log('Creating new Stripe account for email:', email);
                    const account = await stripe.accounts.create({
                        type: process.env.STRIPE_CONNECT_ACCOUNT_TYPE || 'express',
                        country: 'US',
                        email: email,
                        capabilities: {
                            card_payments: { requested: true },
                            transfers: { requested: true },
                        },
                    });
                    stripeAccountId = account.id;
                    console.log('New Stripe account created with ID (masked)');
                    
                    console.log('Updating user record with new Stripe account ID');
                    await db.query('UPDATE users SET stripe_account_id = $1 WHERE user_id = $2', [stripeAccountId, userId]);
                    console.log('User record updated');
                    
                    return res.json({ 
                        accountId: stripeAccountId, 
                        isOnboardingComplete: false, 
                        arePayoutsEnabled: false,
                        areChargesEnabled: false,
                        areDetailsSubmitted: false,
                        needsAttention: true 
                    });
                } catch (createError) {
                    console.error('Error creating Stripe account:', createError);
                    return res.status(500).json({ 
                        message: 'Failed to initialize Stripe account', 
                        error: createError.message,
                        type: createError.type || 'unknown',
                        solution: 'Please try again or contact support'
                    });
                }
            }
            
            console.log('Step 3B: Retrieving Stripe account details');
            try {
                console.log('Calling stripe.accounts.retrieve with ID (masked)');
                const account = await stripe.accounts.retrieve(stripeAccountId);
                console.log('Stripe account retrieved successfully');
                
                console.log('Checking account status flags');
                const onboardingComplete = account.details_submitted && account.charges_enabled && account.payouts_enabled;
                const payoutsEnabled = account.payouts_enabled;
                const chargesEnabled = account.charges_enabled;
                const detailsSubmitted = account.details_submitted;
                
                console.log('Account status:', { 
                    onboardingComplete, 
                    payoutsEnabled, 
                    chargesEnabled, 
                    detailsSubmitted 
                });
                
                // Determine if account needs attention
                console.log('Checking if account needs attention');
                let needsAttention = false;
                if (account.requirements) {
                    if (account.requirements.disabled_reason) {
                        console.log('Account has disabled reason:', account.requirements.disabled_reason);
                        needsAttention = true; // Account is disabled for some reason
                    } else if (account.requirements.currently_due && account.requirements.currently_due.length > 0) {
                        console.log('Account has currently due requirements:', account.requirements.currently_due.length);
                        needsAttention = true; // There are current requirements
                    } else if (account.requirements.past_due && account.requirements.past_due.length > 0) {
                        console.log('Account has past due requirements:', account.requirements.past_due.length);
                        needsAttention = true; // There are past_due requirements
                    }
                }
                if (!onboardingComplete && detailsSubmitted) {
                    console.log('Details submitted but onboarding not complete');
                    needsAttention = true;
                }

                console.log('Step 4: Updating user record with Stripe status');
                try {
                    await db.query(
                        'UPDATE users SET onboarding_complete = $1, payout_enabled = $2, stripe_charges_enabled = $3, stripe_details_submitted = $4, updated_at = NOW() WHERE user_id = $5',
                        [onboardingComplete, payoutsEnabled, chargesEnabled, detailsSubmitted, userId]
                    );
                    console.log('User record updated with Stripe status');
                } catch (dbUpdateError) {
                    console.error('Error updating user record:', dbUpdateError);
                    // Continue and return data even if DB update fails
                }

                console.log('Step 5: Sending success response');
                console.log('==== STRIPE STATUS CHECK COMPLETE ====');
                return res.json({ 
                    accountId: stripeAccountId, 
                    isOnboardingComplete: onboardingComplete,
                    arePayoutsEnabled: payoutsEnabled,
                    areChargesEnabled: chargesEnabled,
                    areDetailsSubmitted: detailsSubmitted,
                    needsAttention: needsAttention
                });
            } catch (retrieveError) {
                console.error('Error retrieving Stripe account:', retrieveError);
                throw retrieveError; // Let the outer catch block handle this
            }
        } catch (dbError) {
            console.error('Database error during Stripe status check:', dbError);
            return res.status(500).json({ 
                message: 'Database error while checking Stripe status', 
                error: dbError.message 
            });
        }
    } catch (error) {
        console.error('==== STRIPE STATUS CHECK FAILED ====');
        console.error('Error checking Stripe onboarding status:', error);

        // Handle cases where the Stripe account might not exist or other API errors
        if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
            // If account doesn't exist on Stripe's side, clear it from our DB
            try {
              console.log('Clearing invalid Stripe account ID from DB');
              await db.query('UPDATE users SET stripe_account_id = NULL, onboarding_complete = FALSE, payout_enabled = FALSE, stripe_charges_enabled = FALSE, stripe_details_submitted = FALSE WHERE user_id = $1', [req.user.id]);
              return res.status(404).json({ 
                message: 'Your Stripe account was not found. We have reset your account. Please try connecting with Stripe again.',
                accountId: null,
                isOnboardingComplete: false,
                arePayoutsEnabled: false,
                areChargesEnabled: false,
                areDetailsSubmitted: false,
                needsAttention: true
              });
            } catch (dbError) {
              console.error('Error clearing stale Stripe account ID from DB:', dbError);
              // Still return an error to the client, but indicate DB update failed
              return res.status(500).json({ 
                message: 'Stripe account not found, but failed to update your record. Please contact support.',
                error: error.message
              });
            }
        } else if (error.type === 'StripeAuthenticationError') {
            // Handle authentication errors (e.g., invalid API key)
             console.log('Stripe authentication error - API key issue');
             return res.status(500).json({ 
                message: 'We are experiencing a configuration issue with our payment provider. Please try again later or contact support.',
                error: 'Stripe authentication error'
             });
        } else if (error.type) {
            // Handle other specific Stripe errors
            console.log('Other Stripe API error:', error.type, error.code);
            return res.status(500).json({ 
                message: 'There was an issue with our payment provider. Please try again or contact support.', 
                type: error.type,
                code: error.code
            });
        } else {
            // Handle generic server errors
            console.log('Generic server error');
            res.status(500).json({ 
                message: 'We encountered an issue while checking your payment account status. Please try again later.', 
                error: 'Server error'
            });
        }
    }
});

// GET /api/stripe/debug
// A simple endpoint to test the Stripe configuration
router.get('/debug', authMiddleware, async (req, res) => {
    try {
        // Just try to retrieve basic info from Stripe to test the connection
        const account = await stripe.accounts.retrieve();
        res.json({ 
            message: 'Stripe connection successful',
            accountType: account.type,
            isEnabled: account.charges_enabled
        });
    } catch (error) {
        console.error('Stripe debug error:', error);
        res.status(500).json({ 
            message: 'Stripe connection failed', 
            error: error.message,
            errorType: error.type,
            // Don't include the key itself in the response
            keyProvided: !!process.env.STRIPE_SECRET_KEY
        });
    }
});

// GET /api/stripe/public-debug
// A simple endpoint to test the Stripe configuration WITHOUT authentication
router.get('/public-debug', async (req, res) => {
    try {
        // Verify Stripe secret key is present
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ 
                message: 'Stripe configuration issue: Missing STRIPE_SECRET_KEY',
                error: 'No API key provided'
            });
        }
        
        // Verify the first few characters of the key to check if it's a secret key
        const key = process.env.STRIPE_SECRET_KEY;
        const isTestKey = key.startsWith('sk_test_');
        const isLiveKey = key.startsWith('sk_live_');
        
        if (!isTestKey && !isLiveKey) {
            return res.status(500).json({ 
                message: 'Stripe configuration issue: STRIPE_SECRET_KEY is not valid',
                error: 'Invalid secret key format - should start with sk_test_ or sk_live_'
            });
        }
        
        // Try a simple Stripe API call
        try {
            const balance = await stripe.balance.retrieve();
            return res.json({ 
                message: 'Stripe connection successful',
                keyType: isTestKey ? 'test' : 'live',
                balanceAvailable: balance.available.length > 0
            });
        } catch (stripeError) {
            return res.status(500).json({ 
                message: 'Stripe API call failed',
                error: stripeError.message,
                type: stripeError.type
            });
        }
    } catch (error) {
        console.error('Stripe public debug error:', error);
        res.status(500).json({ 
            message: 'Stripe connection test failed', 
            error: error.message
        });
    }
});

// GET /api/stripe/test-status
// A public route to check if Stripe is configured correctly
router.get('/test-status', async (req, res) => {
    // Explicitly set CORS headers for this endpoint since it's critical for debugging
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    console.log('==== STRIPE TEST STATUS CHECK ====');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Client URL:', process.env.CLIENT_URL);
    
    try {
        // Make sure we have config data
        const { stripe, stripeConfigValid, configErrors } = require('../config/stripe.config');
        
        if (!stripeConfigValid) {
            return res.status(500).json({ 
                message: 'Stripe configuration issue', 
                errors: configErrors 
            });
        }
        
        // Test basic Stripe access
        try {
            const balance = await stripe.balance.retrieve();
            console.log('Stripe balance check successful');
            
            // Return success with basic Stripe info but not account details
            return res.json({
                message: 'Stripe API connection working',
                balanceAvailable: balance.available.length > 0,
                stripeKeyType: process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'test' : 'live',
                apiVersion: stripe.VERSION,
                environment: process.env.NODE_ENV
            });
        } catch (stripeError) {
            console.error('Stripe balance check failed:', stripeError);
            return res.status(500).json({
                message: 'Failed to connect to Stripe API',
                error: stripeError.message,
                type: stripeError.type || 'unknown'
            });
        }
    } catch (error) {
        console.error('Unexpected error in test-status endpoint:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;