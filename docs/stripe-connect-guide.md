# Stripe Connect Integration Guide

## Overview

SideProject Tracker now requires all sellers to connect their Stripe accounts before listing projects for sale. This integration enables:

1. Direct fund transfers to sellers from buyers
2. Automated marketplace commissions
3. Secure payment processing
4. Compliance with financial regulations

## How It Works

### For Sellers

1. **Connect Your Account**: Before listing a project for sale, you'll be prompted to connect your Stripe account.
2. **Onboarding Process**: Complete Stripe's onboarding to verify your identity and set up payouts.
3. **Receive Payments**: Once connected, payments for your sold projects will be automatically transferred to your bank account.

### For Buyers

1. The buying experience remains the same - buyers pay through the platform's secure checkout.
2. Payments are processed immediately and securely.

## Setting Up Stripe Connect

### From the Dashboard

1. Navigate to your Dashboard.
2. Look for the "Stripe Connect Status" section at the top.
3. Click "Connect Stripe" (or "Complete Setup" if you've already started).
4. Follow Stripe's onboarding steps.

### When Listing a Project

When marking a project for sale:

1. If you haven't connected your Stripe account, you'll see a "Requires Stripe Connect" warning.
2. Click "Connect Now" to complete the setup without losing your project changes.
3. Once connected, you can continue listing your project for sale.

## Technical Implementation

### Backend Validation

The server enforces Stripe account connection in two places:

1. When creating new projects marked for sale
2. When updating projects to be listed for sale

Attempts to list a project without a connected Stripe account will return a `403 Forbidden` error with the code `stripe_account_required`.

### Checking Connection Status

You can check your Stripe Connect status at any time:

```
GET /api/projects/check-stripe-account
```

Response:
```json
{
  "hasStripeAccount": true,
  "isOnboardingComplete": true
}
```

## Commission Structure

When a project is sold:

1. The platform charges a commission fee (currently 5%).
2. The remaining amount is transferred directly to the seller's Stripe account.
3. Transfers typically process within 2 business days.

## FAQ

### What if I don't have a Stripe account?

You'll need to create one through our Connect flow. The process is simple and guided.

### Is my banking information secure?

Yes. We never store your banking information. All sensitive financial data is handled directly by Stripe, which maintains the highest security standards (PCI Level 1 certified).

### What countries are supported?

Stripe Connect supports sellers from [40+ countries](https://stripe.com/global). The exact requirements may vary by country.

### Are there any fees for connecting my Stripe account?

No, connecting your Stripe account is free. Standard marketplace commission fees apply only when you successfully sell a project.

### What if my connection is rejected?

Stripe may request additional information to verify your identity or business. Follow their guidance to complete the verification process. 