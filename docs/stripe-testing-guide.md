# Stripe Testing Guide

This document provides specific instructions for testing the Stripe payment integration in your SideProject Tracker application.

## Test Cards

Use these test card numbers in the Stripe checkout form:

| Scenario | Card Number | Expiry | CVC | Postal Code |
|----------|------------|--------|-----|-------------|
| Successful payment | 4242 4242 4242 4242 | Any future date | Any 3 digits | Any 5 digits |
| Card declined | 4000 0000 0000 0002 | Any future date | Any 3 digits | Any 5 digits |
| Requires authentication | 4000 0025 0000 3155 | Any future date | Any 3 digits | Any 5 digits |

## Test Procedures

### 1. Basic Payment Flow Test

1. Ensure your server is running
2. Ensure the Stripe CLI is listening with: `stripe listen --forward-to http://localhost:5001/api/payments/webhook`
3. Log in to your application
4. Navigate to the marketplace
5. Select a project (any example seed)
6. Click "Buy Now"
7. Complete the checkout form with the successful payment card
8. Verify the transaction completes and you're redirected to the success page
9. Check your server logs for webhook processing events
10. Verify the project ownership has transferred in the database

### 2. Error Handling Test

1. Repeat steps 1-6 above
2. Use the declined card (4000 0000 0000 0002)
3. Verify appropriate error messages are displayed
4. Check server logs for error handling
5. Verify no database changes occurred

### 3. Stripe Connect Test (For Sellers)

1. Log in as a seller account
2. Go to dashboard → payment settings
3. Click "Connect with Stripe"
4. Complete the Stripe Connect onboarding flow
5. Verify the account is properly linked
6. List a project for sale
7. Log in as a buyer account
8. Purchase the project
9. Verify the funds are properly transferred to the seller's Stripe account

### 4. Webhook Event Test

Use the Stripe CLI to trigger specific webhook events:

```powershell
# Test a successful checkout completion
stripe trigger checkout.session.completed

# Test a failed payment
stripe trigger payment_intent.payment_failed
```

Verify your application correctly handles these events.

### 5. Dispute Test

1. Complete a successful purchase
2. File a test dispute:
   ```powershell
   stripe trigger charge.dispute.created
   ```
3. Verify the dispute appears in your admin dashboard
4. Test the dispute resolution process

## Common Testing Issues

1. **Payment redirects but nothing happens**
   - Check the console for errors
   - Verify the CLIENT_URL in your server/.env
   - Ensure the webhook secret is correctly configured

2. **Webhooks not received**
   - Check the Stripe CLI is running and connected
   - Verify the correct endpoint is specified
   - Check server logs for any webhook validation errors

3. **Database not updating**
   - Check transaction IDs are being correctly passed
   - Verify your webhook handler's database operations
   - Look for SQL errors in server logs

## Testing in a Production-Like Environment

For thorough testing before going live:

1. Deploy to a staging environment
2. Set up webhooks pointing to your staging server
3. Test the entire payment flow end-to-end
4. Test all edge cases (cancellations, refunds, etc.)
5. Verify email notifications are sent correctly

Remember that the test cards only work in Stripe test mode. When you switch to live mode, you'll need to use real cards for testing.

---

For more detailed instructions, refer to the [complete Stripe integration guide](./stripe-integration-guide.md). 