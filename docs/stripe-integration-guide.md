# Stripe Integration Guide for SideProject Tracker

This document provides detailed instructions for setting up and maintaining the Stripe integration for the SideProject Tracker application.

## Table of Contents
1. [Setup Environment Variables](#setup-environment-variables)
2. [Stripe Account Configuration](#stripe-account-configuration)
3. [Local Development with Stripe CLI](#local-development-with-stripe-cli)
4. [Webhook Events](#webhook-events)
5. [Testing Payments](#testing-payments)
6. [Troubleshooting](#troubleshooting)
7. [Production Deployment Checklist](#production-deployment-checklist)

## Setup Environment Variables

### Server Configuration (server/.env)

Create or update your `server/.env` file with the following Stripe-related variables:

```
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Commission Rate (%)
COMMISSION_RATE=5

# Stripe Connect Configuration
STRIPE_CONNECT_ACCOUNT_TYPE=express

# Client URL (for redirect)
CLIENT_URL=http://localhost:3000
```

### Client Configuration (client/.env)

Create or update your `client/.env` file with the following:

```
# API Configuration
REACT_APP_API_URL=http://localhost:5001/api

# Stripe Configuration
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

## Stripe Account Configuration

1. Create a Stripe account at [https://stripe.com](https://stripe.com)
2. Navigate to the Stripe Dashboard
3. Ensure you're in "Test Mode" (toggle in the top-right corner)
4. Go to Developers → API keys
   - Copy the "Publishable key" (pk_test_...)
   - Copy the "Secret key" (sk_test_...)
5. Add these keys to your environment files

## Local Development with Stripe CLI

### Installation on Windows

#### Method 1: Using Scoop (Recommended)

```powershell
# Install Scoop if not already installed
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Add Stripe bucket
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git

# Install Stripe CLI
scoop install stripe

# Let's first check if the Stripe CLI was installed correctly by Scoop
scoop list

# If Scoop itself is not properly installed or not in your PATH. Let's complete the Scoop installation first
$env:PATH += ";$env:USERPROFILE\scoop\shims"; scoop --version

# Installing the Stripe CLI directly using Scoop now
$env:PATH += ";$env:USERPROFILE\scoop\shims"; scoop install stripe

# Logging in
$env:PATH += ";$env:USERPROFILE\scoop\shims"; stripe login

# Set up the webhook forwarding
$env:PATH += ";$env:USERPROFILE\scoop\shims"; stripe listen --forward-to http://localhost:5001/api/payments/webhook

```

#### Method 2: Direct Download

1. Download from [GitHub Releases](https://github.com/stripe/stripe-cli/releases/latest)
2. Extract to a folder (e.g., C:\stripe-cli)
3. Add to PATH:
   - Search for "Environment Variables" in Windows
   - Edit the system environment variables
   - Click "Environment Variables"
   - Under "System variables", find "Path" and click "Edit"
   - Add the path to the folder containing stripe.exe

### Login to Stripe

```powershell
stripe login
```

Follow the prompts to authorize the CLI.

### Set Up Webhook Forwarding

Run the following command to forward webhooks to your local server:

```powershell
stripe listen --forward-to http://localhost:5001/api/payments/webhook
```

**IMPORTANT**: Copy the webhook signing secret displayed after running this command. It looks like:
```
whsec_8b9711fcd3b9a0dacf9136982dd05ed5ad5646bc97e24abf29870ad4af04d6c7
```

Add this secret to your `server/.env` file as `STRIPE_WEBHOOK_SECRET`.

## Webhook Events

When setting up webhooks in the Stripe Dashboard for production, subscribe to these events:

1. **Checkout Session events:**
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `checkout.session.async_payment_failed`
   - `checkout.session.async_payment_succeeded`

2. **Payment Intent events:**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`

3. **Transfer events (for marketplace payouts):**
   - `transfer.created`
   - `transfer.failed`
   - `transfer.updated`

4. **Account events (for Stripe Connect):**
   - `account.updated`
   - `account.application.authorized`
   - `account.application.deauthorized`

5. **Dispute handling events:**
   - `charge.dispute.created`
   - `charge.dispute.updated`
   - `charge.dispute.closed`

## Testing Payments

Use these test card numbers with any future expiration date and any 3-digit CVC:

| Card Type | Number | Description |
|-----------|--------|-------------|
| Visa (success) | 4242 4242 4242 4242 | Successful payment |
| Visa (decline) | 4000 0000 0000 0002 | Generic decline |
| Visa (insufficient funds) | 4000 0000 0000 9995 | Insufficient funds decline |
| Visa (requires authentication) | 4000 0002 0000 0000 | Requires authentication |

For more test cards, visit [Stripe's Testing documentation](https://stripe.com/docs/testing).

## Troubleshooting

### Common Issues and Solutions

1. **"Something went wrong" in Stripe Checkout**
   - Check that your Stripe keys are correct and match test/live mode
   - Verify the `CLIENT_URL` in your server/.env points to the correct client address
   - Ensure your Stripe account is active and in good standing

2. **Buy Button Not Working**
   - Verify the project's `is_for_sale` flag is set to true
   - Check that the project has a valid `sale_price`
   - Ensure required contact information is provided

3. **Webhook Events Not Received**
   - Check that the Stripe CLI is running with the correct endpoint
   - Verify the webhook secret is correctly set in your server/.env
   - Check server logs for any webhook validation errors

4. **Payment Succeeded but No Database Update**
   - Verify that your webhook handler correctly processes checkout.session.completed events
   - Check that your transaction IDs and project IDs are correctly stored in Stripe metadata
   - Check for database errors in your server logs

### Debugging Tips

1. Use the Stripe CLI to trigger test events:
   ```
   stripe trigger checkout.session.completed
   ```

2. Check Stripe webhook logs:
   ```
   stripe logs tail
   ```

3. Monitor your server logs for webhook processing issues

## Production Deployment Checklist

Before going live:

1. Create a production Stripe account or switch to live mode
2. Update all environment variables with live keys
3. Set up a production webhook endpoint in the Stripe Dashboard:
   - Use your production server URL: `https://your-domain.com/api/payments/webhook`
   - Select all required events
   - Save the webhook signing secret to your production environment

4. Test the entire payment flow in live mode with a real card
5. Set up Stripe monitoring alerts for failed payments
6. Consider implementing additional security measures like:
   - Rate limiting
   - IP filtering 
   - Additional fraud detection

7. Document your production Stripe credentials securely

## Important Notes

- Stripe API keys are sensitive information and should never be committed to version control
- Webhook secrets should be regenerated periodically for security
- The Stripe CLI webhook secret is temporary and will change each time you restart the CLI
- In production, use a proper secrets management solution

---

Last updated: May 2025 