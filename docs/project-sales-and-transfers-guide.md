# Project Sales, Transfers, and Seller Certificates Guide

This document describes how the SideBuilds platform handles the sale of projects, the subsequent asset transfer process, and the generation of seller certificates.

## Overview of the Sales and Transfer Process

The platform employs a multi-step process to ensure clarity, security, and satisfaction for both buyers and sellers:

1.  **Marketplace Listing**: Sellers list their completed side projects on the marketplace.
2.  **Buyer Initiates Purchase Request**: Interested buyers can request to purchase a project, agreeing to initial terms.
3.  **Seller Review & Approval**: Sellers review requests and can accept or reject them via their dashboard.
4.  **Payment**: If a request is accepted, the buyer proceeds to make the payment through Stripe. The platform's commission fee is automatically deducted.
5.  **Managed Asset Transfer**: After successful payment, a dedicated Project Transfer Page facilitates communication and status updates as the seller transfers project assets (code, domain, etc.).
6.  **Buyer Confirmation & Ownership Change**: The buyer confirms receipt of all assets on the Project Transfer Page. Only then is project ownership officially transferred in the database.
7.  **Seller Certificate**: Upon successful completion of the sale and transfer, a seller certificate is generated for the seller.

## Seller Certificates

When a project is successfully sold and the transfer is completed by the buyer, a digital certificate is generated for the seller as a record of the transaction.

### Features of Seller Certificates

- **Proof of Sale**: Acts as a verifiable record of a successful project sale.
- **Unique Verification**: Each certificate has a unique verification code.
- **Public Verification**: Anyone can verify the authenticity of a certificate via a public link on the platform (`/verify`).
- **Details Displayed**: Certificates typically show project name, seller/buyer usernames (or anonymized versions if preferred by privacy settings), sale amount, sale date, and the verification code.

### Database Schema for Seller Certificates

A dedicated table, `seller_certificates`, stores and manages this information:

- `certificate_id`: UUID (PK) - Unique certificate identifier
- `seller_id`: UUID - Reference to the seller
- `project_id`: UUID - Reference to the project that was sold
- `transaction_id`: UUID - Reference to the transaction record
- `buyer_id`: UUID - Reference to the buyer
- `purchase_request_id`: UUID - Reference to the specific purchase request
- `sale_amount`: DECIMAL - Amount the project sold for
- `verification_code`: VARCHAR(50) - Unique code for certificate verification
- `created_at`: TIMESTAMP - When the certificate was created

*(Other fields like `sale_date` might be derived from the transaction or purchase request record).*

### Accessing and Verifying Certificates

- **Sellers**: Can typically access their certificates from their Dashboard or transaction history.
- **Verification**: To verify a certificate:
    1.  Go to `https://sidebuilds.space/verify` (or the platform's equivalent path).
    2.  Enter the verification code found on the certificate.
    3.  View the certificate details and its validity.

### Security
- Verification codes are cryptographically generated.
- Certificates are immutable once created.

## The New Project Purchase & Transfer Workflow in Detail

This workflow is designed to be transparent and give both parties control at key stages.

### 1. Listing a Project (Seller)
- Sellers list their projects on the marketplace, providing details, price, and agreeing to platform terms.
- Seller must have a connected Stripe account.

### 2. Request to Purchase (Buyer)
- A buyer browses the marketplace and finds a project they wish to purchase.
- They click "Request to Purchase" on the project's detail page.
- They may need to agree to a summary of terms or acknowledge understanding of the process.

### 3. Seller Review and Action (Seller Dashboard)
- The seller receives a notification (in-app, potentially email in the future) of the purchase request.
- In their Dashboard, under "Incoming Purchase Requests," the seller sees the request.
- The seller can:
    - **Accept Request**: If they agree to sell to this buyer.
    - **Reject Request**: If they do not wish to proceed.
- The buyer is notified of the seller's decision.

### 4. Proceed to Payment (Buyer Dashboard)
- If the seller accepts the request, the buyer sees the updated status in their Dashboard under "My Purchase Requests."
- A "Proceed to Payment" button becomes active.
- Clicking this button redirects the buyer to Stripe Checkout to complete the payment.
- The platform's commission fee is automatically calculated and set up as an `application_fee_amount` in the Stripe session.

### 5. Payment Confirmation & Webhook Processing
- Upon successful payment, Stripe sends a `checkout.session.completed` webhook to the platform.
- The backend `webhookHandler`:
    - Verifies the event.
    - Updates the `project_purchase_requests` table:
        - Sets status to `payment_completed_pending_transfer`.
        - Stores `stripe_payment_intent_id` and `payment_date`.
    - Creates a record in the `transactions` table with all financial details.
    - Generates a `seller_certificates` record (though it might be considered "pending" until full transfer completion, or generated fully here).
    - **Important**: Project ownership (`projects.owner_id`) is NOT yet changed.

### 6. Asset Transfer via Project Transfer Page
- After payment, both buyer and seller can access a dedicated `ProjectTransferPage` for this specific sale (links available in their dashboards).
- **Seller's Role**:
    - The seller is responsible for transferring all agreed-upon assets (code, domain, documentation, etc.).
    - On the `ProjectTransferPage`, the seller updates the transfer status (e.g., "Code Sent," "Domain Transfer Initiated," "All Assets Transferred - Awaiting Buyer Confirmation").
    - The seller can add notes, links, or instructions for the buyer in a dedicated section on this page.
- **Buyer's Role**:
    - The buyer monitors the `ProjectTransferPage` for updates from the seller.
    - They receive/access the assets as per the seller's instructions.
    - They verify all assets and ensure the project matches the description.

### 7. Buyer Confirms Receipt & Completes Purchase
- Once the buyer has received and verified all assets, they click a button like "Confirm Assets Received and Complete Purchase" on the `ProjectTransferPage`.
- This action triggers a backend update:
    - The `project_purchase_requests` status is changed to `completed`.
    - The `transfer_completion_date` is recorded.
    - **Crucially, the `projects` table is now updated**:
        - `owner_id` is set to the `buyer_id`.
        - `is_for_sale` is set to `false`.
        - `source` is set to `purchased`.
        - `previous_owner_id` is set to the original seller's ID.
        - `purchased_at` and `transfer_date` (final) are recorded.
    - Any finalization for the seller certificate occurs if it was pending.

### 8. Post-Transfer
- The project now appears in the buyer's dashboard as owned, with a "Purchased" badge.
- The seller sees the sale as completed in their history.
- A 7-day verification/support period (as defined in platform T&Cs) might begin, where the seller provides limited support for immediate issues.

### UI Elements Involved:
- **Project Detail Page**: "Request to Purchase" button.
- **Dashboard (Seller)**: "Incoming Purchase Requests" (Accept/Reject), list of sales with links to `ProjectTransferPage`.
- **Dashboard (Buyer)**: "My Purchase Requests" (Proceed to Payment), list of purchases with links to `ProjectTransferPage`.
- **ProjectTransferPage**:
    - View purchase details (project, price, buyer/seller).
    - Seller: Dropdown/input to update transfer status, text area for transfer notes.
    - Buyer: View seller notes/status, button to "Confirm Assets Received".
    - Both: Log/history of status changes (optional enhancement).
- **Certificate Pages**: `/verify` and seller's view of their certificates.

## Handling Disputes and Issues
- The platform should have clear Terms & Conditions regarding the sale process, asset delivery expectations, and dispute resolution.
- The 7-day verification period is intended for the buyer to flag critical issues.
- Communication between buyer and seller is key, facilitated by contact information or (in the future) an in-app messaging system.
- Stripe disputes for the payment itself would follow Stripe's standard procedures.

## Future Enhancements
- In-app messaging system between buyer and seller during the transfer.
- More granular checklist for asset transfer on the `ProjectTransferPage`.
- Automated notifications at each step of the process.

## Related Documentation
- [Stripe Testing Guide](./stripe-testing-guide.md)
- [Stripe Connect Guide](./stripe-connect-guide.md)
- [Stripe Integration Guide](./stripe-integration-guide.md)
- [Deployment Guide](./deployment-guide.md) 