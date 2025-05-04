# Stripe Integration Guide for SideBuilds.space

This guide provides instructions for setting up Stripe integration to enable payments for project sales on SideBuilds.space.

## Prerequisites

1. Stripe account (sign up at [stripe.com](https://stripe.com) if you don't have one)
2. CockroachDB database (with schema updates applied)
3. Node.js backend and React frontend running

## Step 1: Obtain Stripe API Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to Developers > API keys
3. Make note of your:
   - Publishable key (starts with `pk_test_` for test mode)
   - Secret key (starts with `sk_test_` for test mode)

## Step 2: Set Up Stripe Webhook

1. In your Stripe Dashboard, go to Developers > Webhooks
2. Click "Add endpoint"
3. Configure the endpoint:
   - URL: `https://your-api-domain.com/api/payments/webhook` (replace with your actual backend URL)
   - Events to listen for: `checkout.session.completed`
4. After creating the webhook, reveal the "Signing secret" and copy it

## Step 3: Configure Environment Variables

Add the following variables to your server's `.env` file:

```
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
COMMISSION_RATE=5
```

Add this variable to your client's `.env` file:

```
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
```

## Step 4: Install Stripe Libraries

### Backend (Server)

```bash
cd server
npm install stripe
```

### Frontend (Client)

```bash
cd client
npm install @stripe/react-stripe-js @stripe/stripe-js
```

## Step 5: Apply Database Migration

Run the migration script to add Stripe-related fields to your database:

```bash
cd cockroach/cockroach-v25.1.5.windows-6.2-amd64/bin
./cockroach.exe sql --url="your_connection_string" < ../../database/migration_20250502.sql
```

## Step 6: Commission and Payout Model

SideBuilds uses a marketplace model with a commission structure:

1. When a project is sold, the platform collects the full payment
2. A commission fee (default 5%, configurable via COMMISSION_RATE env variable) is retained by the platform
3. The remaining amount (95% by default) is earmarked for the seller
4. Payment to sellers is currently manual; future implementations will use Stripe Connect for automated payouts

## Step 7: Testing Payment Flow

Follow these steps to test the payment flow:

1. List a project for sale with a price and contact information
2. Log in with a different account and go to the marketplace
3. Click "Buy Now" on your listed project
4. You should be redirected to Stripe Checkout
5. Use Stripe test card numbers:
   - Card number: `4242 4242 4242 4242`
   - Expiration date: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
6. Complete the purchase
7. You should be redirected to the success page showing the total amount, platform fee, and seller payout
8. Check your dashboard to verify the project's status has changed

## Step 8: Implementing Stripe Connect (For Automated Seller Payouts)

To fully automate seller payouts:

1. Set up [Stripe Connect](https://stripe.com/connect)
2. Create an onboarding flow for sellers to connect their Stripe accounts
3. Modify the payment flow to create transfers to connected accounts
4. Update the database to track transfer statuses

Example Connect implementation:

```javascript
// After successful payment, transfer funds to the seller's connected account
const transfer = await stripe.transfers.create({
  amount: Math.round(sellerAmount * 100), // Amount in cents
  currency: 'usd',
  destination: seller.stripe_account_id, // Seller's connected account ID
  transfer_group: `project-${projectId}`,
  source_transaction: paymentIntentId // Link to the original payment
});
```

## Step 9: Going to Production

When you're ready to go to production:

1. Activate your Stripe account (complete verification if required)
2. Switch to live mode keys (starts with `pk_live_` and `sk_live_`)
3. Update webhook endpoints to production URLs
4. Update your environment variables with live keys

## Troubleshooting

If you encounter issues:

1. Check webhook logs in Stripe Dashboard > Developers > Webhooks
2. Verify Stripe API key and webhook secret in your environment variables
3. Check server logs for Stripe-related errors
4. Use Stripe CLI for local webhook testing

For more information, refer to [Stripe Documentation](https://stripe.com/docs). 