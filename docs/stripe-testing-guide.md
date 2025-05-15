# Stripe Testing Guide

This document provides specific instructions for testing the Stripe payment integration and the new purchase request workflow in your SideBuilds platform.

## Test Cards

Use these test card numbers in the Stripe checkout form:

| Scenario | Card Number | Expiry | CVC | Postal Code |
|----------|------------|--------|-----|-------------|
| Successful payment | 4242 4242 4242 4242 | Any future date | Any 3 digits | Any 5 digits |
| Card declined | 4000 0000 0000 0002 | Any future date | Any 3 digits | Any 5 digits |
| Requires authentication | 4000 0025 0000 3155 | Any future date | Any 3 digits | Any 5 digits |

## Test Procedures

### 1. Full Purchase Request and Payment Flow Test

This tests the end-to-end flow from a buyer requesting a project to successful payment.

1.  **Prerequisites**:
    *   Ensure your server (`server`) and client (`client`) are running.
    *   Ensure the Stripe CLI is listening and forwarding webhooks to your local server: `stripe listen --forward-to http://localhost:5001/api/payments/webhook` (or your configured port/endpoint).
    *   Have at least two registered users: one as a Seller, one as a Buyer.
2.  **Seller Actions (Setup)**:
    *   Log in as the Seller.
    *   Ensure the Seller has connected their Stripe account (via Dashboard -> Payment Settings or similar).
    *   List a project for sale from the Seller's Dashboard.
3.  **Buyer Actions (Request)**:
    *   Log out as Seller, log in as the Buyer.
    *   Navigate to the Marketplace or the specific project listing page.
    *   Find the project listed by the Seller.
    *   Click the "Request to Purchase" button (or similar).
    *   Agree to any terms presented.
4.  **Seller Actions (Accept Request)**:
    *   Log out as Buyer, log in as the Seller.
    *   Navigate to the Seller's Dashboard.
    *   Find the "Incoming Purchase Requests" section.
    *   Locate the request from the Buyer and click "Accept". Confirm the action.
5.  **Buyer Actions (Proceed to Payment)**:
    *   Log out as Seller, log in as the Buyer.
    *   Navigate to the Buyer's Dashboard.
    *   Find the "My Purchase Requests" section.
    *   Locate the accepted request (status should indicate it's ready for payment).
    *   Click "Proceed to Payment".
    *   You should be redirected to Stripe Checkout.
    *   Complete the checkout form using a **successful payment** test card.
6.  **Verification (Post-Payment)**:
    *   Verify you are redirected to a success page/indicator or back to the Buyer's Dashboard.
    *   Check the Buyer's Dashboard; the status of the purchase request should now be `Payment Completed - Pending Transfer` (or similar).
    *   **Check Server Logs**: Look for Stripe webhook processing events, specifically `checkout.session.completed` being handled successfully.
    *   **Verify Database Changes** (use a DB client like `psql` or a GUI):
        *   `project_purchase_requests` table: The corresponding request record should have its status updated (e.g., to `payment_completed_pending_transfer`), `stripe_payment_intent_id` populated, and `payment_date` set.
        *   `transactions` table: A new row should exist for this transaction, linked to the purchase request, project, buyer, and seller, with correct amounts (total, fee, seller payout).
        *   `seller_certificates` table: A new certificate should be created, linked to the transaction and purchase request.
        *   `projects` table: **Crucially, the `owner_id` of the project should NOT have changed yet.** The project should still belong to the Seller, and `is_for_sale` might still be true or as per your logic pre-transfer.

### 2. Asset Transfer and Completion Flow Test

This tests the flow after successful payment, where assets are transferred and confirmed.

1.  **Prerequisites**: A project has been successfully paid for as per Test Procedure 1.
2.  **Seller Actions (Initiate Transfer Info)**:
    *   Log in as the Seller.
    *   Navigate to the Dashboard.
    *   Find the relevant purchase (status: `Payment Completed - Pending Transfer`).
    *   Click a button like "Manage Transfer" or navigate to the `ProjectTransferPage` for this sale.
    *   Update the transfer status (e.g., select "Assets Transferred, Awaiting Buyer Confirmation").
    *   Add notes or instructions for the buyer regarding asset access (e.g., "Code shared via GitHub invite to your_email@example.com. Domain transfer initiated.").
    *   Save the changes.
3.  **Buyer Actions (Verify and Confirm Transfer)**:
    *   Log in as the Buyer.
    *   Navigate to the Dashboard.
    *   Find the relevant purchase (status should reflect Seller's update).
    *   Click a button like "Track Transfer" or navigate to the `ProjectTransferPage`.
    *   Review the Seller's notes and (conceptually) verify receipt of assets.
    *   Click the "Confirm Transfer Received & Complete Purchase" button (or similar).
4.  **Verification (Post-Transfer Confirmation)**:
    *   **Check UI**: The status of the purchase request on both Buyer and Seller dashboards, and on the `ProjectTransferPage`, should now be `Completed` (or similar).
    *   **Verify Database Changes**:
        *   `project_purchase_requests` table: Status updated to `completed`, `transfer_completion_date` set.
        *   `projects` table: The `owner_id` should now be the Buyer's ID. `is_for_sale` should be `false`. `previous_owner_id` might be set.
        *   (Optional) `project_transfers` table (if you have one for detailed logging of transfer steps) should reflect completion.

### 3. Error Handling Test (During Payment)

1.  Follow steps 1-5 from "Full Purchase Request and Payment Flow Test", but in step 5.e, use a **declined card** (e.g., 4000 0000 0000 0002) in Stripe Checkout.
2.  Verify appropriate error messages are displayed by Stripe and/or your application upon returning from Checkout.
3.  Check server logs for error handling related to failed payment if any webhooks are involved (`payment_intent.payment_failed`).
4.  Verify no unintended database changes occurred (e.g., `project_purchase_requests` status should not have changed to paid, no new transaction record for the failed attempt beyond what Stripe logs internally).

### 4. Stripe Connect Test (For Sellers)

This verifies sellers can connect their Stripe accounts and that funds (conceptually) flow to them.

1.  Log in as a user who has **not yet** connected Stripe (Seller B).
2.  Navigate to Dashboard -> Payment Settings (or equivalent).
3.  Click "Connect with Stripe".
4.  Complete the Stripe Connect onboarding flow successfully (using test data if Stripe prompts).
5.  Verify the Seller B's dashboard indicates their Stripe account is properly linked and active (`charges_enabled`, `payouts_enabled`).
6.  (Seller B) List a project for sale.
7.  Log in as a Buyer.
8.  Follow the **Full Purchase Request and Payment Flow Test** (Procedure 1) to purchase the project from Seller B.
9.  **Verification (Conceptual for Payouts)**:
    *   After successful payment and webhook processing, check the `transactions` table. The `amount_seller_received` should be correct (total - platform fee).
    *   In a real scenario with live Stripe keys, these funds would be routed to Seller B's connected Stripe account. In test mode, you can verify the `transfer_data[destination]` on the PaymentIntent if using direct charges, or the `destination` on a Transfer object if creating separate charges and transfers (though the implemented flow uses `application_fee_amount`, implying direct charges to the seller's connected account).

### 5. Webhook Event Test (Manual Triggering)

Use the Stripe CLI to trigger specific webhook events to test resilience and specific handlers beyond `checkout.session.completed`.

```powershell
# Test an account update (e.g., if a seller's Stripe account status changes)
# Ensure you have a user in your DB with a known test stripe_account_id (acct_xxxxxxxxxxxx)
stripe trigger account.updated --override account.updated.id=acct_YOUR_TEST_SELLER_STRIPE_ID

# Test a failed payment intent after it was created but before completion
stripe trigger payment_intent.payment_failed
```

Verify your application correctly handles these events in `server/routes/payments.js` (e.g., `processAccountUpdated` for `account.updated`).

### 6. Dispute Test (Advanced)

This is an advanced test and typically involves more setup.

1.  Complete a successful purchase (Procedures 1 & 2).
2.  Manually trigger a dispute for the charge associated with the transaction using the Stripe CLI or Dashboard (if possible in test mode for connected accounts).
    ```powershell
    # You'll need the charge ID (ch_xxxx) from the transaction record or PaymentIntent
    stripe trigger charge.dispute.created --override charge.dispute.created.charge=ch_YOUR_CHARGE_ID
    ```
3.  Verify how your system flags or handles disputed transactions (this might involve manual checks or future admin UI features).

## Common Testing Issues

1.  **Redirects from Stripe Checkout fail or go to the wrong place**:
    *   Check the `CLIENT_URL` in your `server/.env` is correct (e.g., `http://localhost:3001`).
    *   Ensure `success_url` and `cancel_url` in `create-checkout-session` are correctly formatted.
2.  **Webhooks not received or failing signature verification**:
    *   Stripe CLI: Is it running with `stripe listen --forward-to ...`?
    *   Endpoint: Is the URL in `stripe listen` correct and matches your webhook route?
    *   Secret: Is `STRIPE_WEBHOOK_SECRET` in `server/.env` IDENTICAL to the one provided by `stripe listen`?
    *   Middleware: Ensure `express.raw({type: 'application/json'})` is used for the webhook route *before* `express.json()`.
3.  **Database not updating as expected after webhook**: 
    *   Check server logs for errors during `processCheckoutCompleted` or other webhook functions.
    *   Verify `purchase_request_id` is correctly passed in metadata and retrieved in the webhook.
    *   Look for SQL errors or transaction rollback messages.
4.  **Incorrect amounts or fee calculations**: 
    *   Double-check `COMMISSION_RATE` in `server/.env`.
    *   Verify the logic for `application_fee_amount` in `create-checkout-session`.
    *   Ensure amounts are handled in cents for Stripe API calls and converted correctly for database storage if needed.

## Testing in a Production-Like Environment

For thorough testing before going live:

1.  Deploy to a staging environment (e.g., using Render for backend, Vercel for frontend).
2.  Configure live (but restricted, if possible) Stripe API keys for the staging environment.
3.  Set up Stripe webhooks in your Stripe Dashboard (Test mode) pointing to your staging server's webhook endpoint.
4.  Test the entire payment and transfer flow end-to-end using real (or specific test) scenarios.
5.  Test all edge cases (request rejection, payment cancellation, delays in transfer, etc.).
6.  Verify any email notifications (if implemented) are sent correctly.

Remember that the test cards only work in Stripe test mode. When you switch to live mode, you'll need to use real cards for testing, or Stripe might offer specific live mode test card numbers for certain regions/conditions.

---

For more detailed instructions on general Stripe integration concepts, refer to the [Stripe Integration Guide](./stripe-integration-guide.md) (though this testing guide is more up-to-date for the current flow). 