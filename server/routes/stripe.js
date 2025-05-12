const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
    try {
        const userId = req.user.id;
        const userResult = await db.query(
            'SELECT stripe_account_id, email FROM users WHERE user_id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        let { stripe_account_id: stripeAccountId, email } = userResult.rows[0];

        if (!stripeAccountId) {
            // Attempt to create an account if one doesn't exist - this might happen if user navigates away during initial link creation
            try {
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
                await db.query('UPDATE users SET stripe_account_id = $1 WHERE user_id = $2', [stripeAccountId, userId]);
                 return res.json({ 
                    accountId: stripeAccountId, 
                    isOnboardingComplete: false, 
                    arePayoutsEnabled: false,
                    areChargesEnabled: false,
                    areDetailsSubmitted: false,
                    needsAttention: true 
                });
            } catch (createError) {
                 console.error('Error creating Stripe account during status check:', createError);
                 return res.status(500).json({ message: 'Failed to initialize Stripe account.' });
            }
        }
        
        const account = await stripe.accounts.retrieve(stripeAccountId);

        const onboardingComplete = account.details_submitted && account.charges_enabled && account.payouts_enabled;
        const payoutsEnabled = account.payouts_enabled;
        const chargesEnabled = account.charges_enabled;
        const detailsSubmitted = account.details_submitted;
        
        // Determine if account needs attention
        // This is a basic check. Stripe's `requirements.currently_due` and `requirements.eventually_due` provide more detail.
        let needsAttention = false;
        if (account.requirements) {
            if (account.requirements.disabled_reason) {
                needsAttention = true; // Account is disabled for some reason
            } else if (account.requirements.currently_due && account.requirements.currently_due.length > 0) {
                needsAttention = true; // There are current requirements
            } else if (account.requirements.past_due && account.requirements.past_due.length > 0) {
                needsAttention = true; // There are past_due requirements
            }
        }
        if (!onboardingComplete && detailsSubmitted) { // If details are submitted but not fully onboarded (e.g. payouts/charges not enabled)
            needsAttention = true;
        }


        // Update user's Stripe status in DB
        await db.query(
            'UPDATE users SET onboarding_complete = $1, payout_enabled = $2, stripe_charges_enabled = $3, stripe_details_submitted = $4, updated_at = NOW() WHERE user_id = $5',
            [onboardingComplete, payoutsEnabled, chargesEnabled, detailsSubmitted, userId]
        );

        res.json({ 
            accountId: stripeAccountId, 
            isOnboardingComplete: onboardingComplete,
            arePayoutsEnabled: payoutsEnabled,
            areChargesEnabled: chargesEnabled,
            areDetailsSubmitted: detailsSubmitted,
            needsAttention: needsAttention,
            // Optionally return more details from the account object if needed by the frontend
            // requirements: account.requirements 
        });

    } catch (error) {
        console.error('Error checking Stripe onboarding status:', error);
        // Handle cases where the Stripe account might not exist or other API errors
        if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
            // If account doesn't exist on Stripe's side, clear it from our DB
            await db.query('UPDATE users SET stripe_account_id = NULL, onboarding_complete = FALSE, payout_enabled = FALSE, stripe_charges_enabled = FALSE, stripe_details_submitted = FALSE WHERE user_id = $1', [req.user.id]);
            return res.status(404).json({ message: 'Stripe account not found. Please try connecting again.', accountId: null, isOnboardingComplete: false, arePayoutsEnabled: false, areChargesEnabled: false, areDetailsSubmitted: false, needsAttention: true });
        }
        res.status(500).json({ message: 'Failed to check Stripe onboarding status', error: error.message });
    }
});


module.exports = router;