const express = require('express');
const router = express.Router();
// Use the pre-configured Stripe instance from config
const { stripe, stripeConfigValid } = require('../config/stripe.config');
const authMiddleware = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');
const db = require('../db');
router.use((req, res, next) => {
    if (req.method === 'POST' && !stripeConfigValid) return res.status(503).json({ message: 'Stripe setup is unavailable or its key modes do not match.', code: 'STRIPE_CONFIGURATION_INVALID' });
    next();
});

// Status reads never create or detach provider accounts.
const connection = require('../services/sellerConnectionService');
router.post('/create-account-link', authMiddleware, connection.onboardingHandler);
router.get('/check-onboarding-status', authMiddleware, connection.statusHandler);
// Retire the destructive legacy reset. Reconnection verifies the original account
// and pending purchases before changing a seller's payment destination.
router.post('/reset-account', authMiddleware, (_req, res) => res.status(409).json({
    message: 'Use Reconnect Stripe in payout settings. Existing payment connections cannot be cleared manually.'
}));

// GET /api/stripe/debug
// A simple endpoint to test the Stripe configuration
router.get('/debug', authMiddleware, requireAdmin, async (req, res) => {
    try {
        // Retrieve Stripe account info (requires account ID)
        const { stripe } = require('../config/stripe.config');
        const accountId = req.user?.stripe_account_id;
        if (!accountId) {
            return res.json({
                message: 'Stripe connection successful (no account linked)',
                configured: true
            });
        }
        const account = await stripe.accounts.retrieve(accountId);
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
// Legacy diagnostic URL retained for compatibility, but restricted to admins.
router.get('/public-debug', authMiddleware, requireAdmin, async (req, res) => {
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
// Legacy diagnostic URL retained for compatibility, but restricted to admins.
router.get('/test-status', authMiddleware, requireAdmin, async (req, res) => {
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
