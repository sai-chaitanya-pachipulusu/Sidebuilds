// Stripe configuration
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Ensure Stripe keys are loaded
let stripeConfigValid = true;
let configErrors = [];

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("FATAL ERROR: Stripe secret key is missing from .env file.");
  stripeConfigValid = false;
  configErrors.push("Missing STRIPE_SECRET_KEY");
}

if (!process.env.STRIPE_PUBLISHABLE_KEY) {
  console.error("FATAL ERROR: Stripe publishable key is missing from .env file.");
  stripeConfigValid = false;
  configErrors.push("Missing STRIPE_PUBLISHABLE_KEY");
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn("WARNING: Stripe webhook secret is missing from .env file. Webhook verification will be skipped.");
  configErrors.push("Missing STRIPE_WEBHOOK_SECRET (non-fatal)");
}

// Validate Stripe key format before proceeding
if (process.env.STRIPE_SECRET_KEY) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
    console.error("FATAL ERROR: Invalid Stripe secret key format. Must start with sk_test_ or sk_live_");
    stripeConfigValid = false;
    configErrors.push("Invalid STRIPE_SECRET_KEY format");
  }
}

// Test Stripe connection on startup if we have a key
const testStripeConnection = async () => {
  if (!process.env.STRIPE_SECRET_KEY) return;
  
  try {
    const balance = await stripe.balance.retrieve();
    console.log("Stripe connection test successful: Balance retrieved");
  } catch (error) {
    console.error("Stripe connection test failed:", error.message);
    configErrors.push(`Stripe connection failed: ${error.message}`);
  }
};

// Don't block startup, but run the test
testStripeConnection();

// Commission rate as a percentage (5% by default)
const COMMISSION_RATE = process.env.COMMISSION_RATE || 5;

// Stripe Connect account type
const CONNECT_ACCOUNT_TYPE = process.env.CONNECT_ACCOUNT_TYPE || 'express';

// Supported payment methods
const PAYMENT_METHODS = [
  'card',
  'us_bank_account'
];

// Log configuration for debugging
console.log("Stripe configuration:", {
  secretKeyAvailable: !!process.env.STRIPE_SECRET_KEY,
  publishableKeyAvailable: !!process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecretAvailable: !!process.env.STRIPE_WEBHOOK_SECRET,
  valid: stripeConfigValid,
  errors: configErrors,
  mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'live'
});

// Export Stripe configuration
module.exports = {
  stripe,
  COMMISSION_RATE,
  CONNECT_ACCOUNT_TYPE,
  PAYMENT_METHODS,
  stripeConfigValid,
  configErrors,
  stripeConfig: {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    connectAccountType: CONNECT_ACCOUNT_TYPE,
    paymentMethods: PAYMENT_METHODS
  }
}; 