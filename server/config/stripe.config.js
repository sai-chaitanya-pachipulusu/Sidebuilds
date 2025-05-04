// Stripe configuration
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Ensure Stripe keys are loaded
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("FATAL ERROR: Stripe secret key is missing from .env file.");
  process.exit(1);
}

if (!process.env.STRIPE_PUBLISHABLE_KEY) {
  console.error("FATAL ERROR: Stripe publishable key is missing from .env file.");
  process.exit(1);
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn("WARNING: Stripe webhook secret is missing from .env file. Webhook verification will be skipped.");
}

// Commission rate as a percentage (5% by default)
const COMMISSION_RATE = process.env.COMMISSION_RATE || 5;

// Stripe Connect account type
const CONNECT_ACCOUNT_TYPE = process.env.CONNECT_ACCOUNT_TYPE || 'express';

// Supported payment methods
const PAYMENT_METHODS = [
  'card',
  'us_bank_account'
];

// Export Stripe configuration
module.exports = {
  stripe,
  COMMISSION_RATE,
  CONNECT_ACCOUNT_TYPE,
  PAYMENT_METHODS,
  stripeConfig: {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    connectAccountType: CONNECT_ACCOUNT_TYPE,
    paymentMethods: PAYMENT_METHODS
  }
}; 