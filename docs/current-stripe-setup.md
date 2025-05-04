# Current Stripe Integration Setup

This document contains the specific steps you need to take now to complete your Stripe integration setup.

## 1. Update Your Environment Files

### For Server (.env)

Create a file named `.env` in your server directory with the following content:

```
# Database Connection (add your existing database connection)
DATABASE_URL=your_cockroachdb_connection_string
DB_SSL=true

# JWT Authentication (keep your existing JWT secret)
JWT_SECRET=your_jwt_secret_key_here

# Server Configuration
PORT=5001
NODE_ENV=development

# Client URL (update if different)
CLIENT_URL=http://localhost:3000

# Stripe Configuration - IMPORTANT: Update these values with your actual keys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# This is your current webhook secret from the Stripe CLI:
STRIPE_WEBHOOK_SECRET=whsec_8b9711fcd3b9a0dacf9136982dd05ed5ad5646bc97e24abf29870ad4af04d6c7

# Commission Rate (%)
COMMISSION_RATE=5

# Stripe Connect Configuration
STRIPE_CONNECT_ACCOUNT_TYPE=express
```

### For Client (.env)

Create a file named `.env` in your client directory with the following content:

```
# API Configuration
REACT_APP_API_URL=http://localhost:5001/api

# Stripe Configuration - IMPORTANT: Update with your actual publishable key
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

## 2. Maintain Stripe CLI Connection

Keep the Stripe CLI running in a dedicated terminal window with this command:

```powershell
stripe listen --forward-to http://localhost:5001/api/payments/webhook
```

**Note**: Each time you restart the Stripe CLI, you'll get a new webhook secret. Update your `server/.env` file with the new secret when this happens.

## 3. Restart Your Server

After updating the `.env` files, restart your server:

```powershell
cd server
npm start
```

## 4. Test the Payment Flow

1. Navigate to the marketplace
2. Select a project to purchase
3. Click the "Buy Now" button
4. Complete the Stripe Checkout form using test card 4242 4242 4242 4242
5. The Stripe CLI should display the received webhook events
6. Verify that the purchase completes successfully in your application

## Important Reminders

- The webhook secret (`whsec_8b9711fcd3b9a0dacf9136982dd05ed5ad5646bc97e24abf29870ad4af04d6c7`) is specific to your current Stripe CLI session
- For permanent paths, add `%USERPROFILE%\scoop\shims` to your system PATH
- For production setup, refer to the full Stripe integration guide

## Current Issues Fixed

- The payments-extensions.js routes have been mounted in server/index.js
- Stripe CLI is now properly installed and configured
- Webhook forwarding is set up for local development

For complete documentation, see [stripe-integration-guide.md](./stripe-integration-guide.md). 