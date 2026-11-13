require('dotenv').config();
const { inspectStripeEnvironment, guardStripeClient } = require('../utils/stripeSafety');

const stripeEnvironment = inspectStripeEnvironment(process.env);
// The SDK requires a key at construction. A disabled placeholder cannot pass the method guard.
const stripe = guardStripeClient(require('stripe')(stripeEnvironment.valid ? process.env.STRIPE_SECRET_KEY : 'sk_test_disabled'), stripeEnvironment);
const COMMISSION_RATE = parseFloat(process.env.COMMISSION_RATE) || 5;
const CONNECT_ACCOUNT_TYPE = process.env.STRIPE_CONNECT_ACCOUNT_TYPE || process.env.CONNECT_ACCOUNT_TYPE || 'express';
const PAYMENT_METHODS = ['card', 'us_bank_account'];

if (stripeEnvironment.valid && process.env.STRIPE_STARTUP_CHECK !== 'false') {
    stripe.balance.retrieve().then(() => console.log('Stripe connection check successful.'))
        .catch(error => console.error('Stripe connection check failed:', error.type || 'provider_error'));
}
console.log('Stripe configuration:', { mode: stripeEnvironment.mode, valid: stripeEnvironment.valid, errors: stripeEnvironment.errors });

module.exports = { stripe, COMMISSION_RATE, CONNECT_ACCOUNT_TYPE, PAYMENT_METHODS, stripeEnvironment,
    stripeConfigValid: stripeEnvironment.valid, configErrors: stripeEnvironment.errors,
    stripeConfig: { publishableKey: process.env.STRIPE_PUBLISHABLE_KEY, webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        mode: stripeEnvironment.mode, connectAccountType: CONNECT_ACCOUNT_TYPE, paymentMethods: PAYMENT_METHODS } };
