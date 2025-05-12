# Stripe Connect Integration Guide & FAQ's

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
GET /api/stripe/check-onboarding-status
```

Response (example):
```json
{
  "accountId": "acct_xxxxxxxxxxxxxx",
  "isOnboardingComplete": true,
  "arePayoutsEnabled": true,
  "areChargesEnabled": true,
  "areDetailsSubmitted": true,
  "needsAttention": false
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

### Summary: Stripe Connect & Payments:

Updated the user profile settings page to include a Stripe Connect section, allowing users to connect or manage their Stripe accounts.
Added backend API endpoints to create Stripe Account Links and check onboarding status.
Modified the project creation/edit page to require a fully onboarded Stripe account with payouts enabled before a project can be listed for sale, prompting users to complete setup if necessary.
Updated the payment processing logic in server/routes/payments.js to correctly transfer project ownership upon successful sale. This includes setting is_for_sale and is_public to FALSE, updating owner_id, owner_username, previous_owner_id, source, purchased_at, and transfer_date.


#### Documentation & Legal:

Created a new FAQ page (client/src/pages/FAQPage.js and FAQPage.css) and included information about the 5% platform commission.
Added a route for the FAQ page and a link in the navigation bar.
Created a basic Terms and Conditions page (client/src/pages/TermsPage.js and TermsPage.css) with placeholder content and sections relevant to a marketplace, including commission and Stripe Connect.
Added a route for the Terms page and a link in the mobile navigation menu.
Advisory:

#### Provided suggestions for additional features for a robust product launch.

Offered ideas for a Product Hunt launch strategy and gaining traction.
Listed potential competitors in the side project marketplace space.
Suggested niche positioning strategies and unique "crazy" add-on features to differentiate the platform.