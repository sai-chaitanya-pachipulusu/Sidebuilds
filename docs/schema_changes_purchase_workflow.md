# Database Schema Changes for Enhanced Purchase Workflow

This document outlines the likely schema changes made to the `project_purchase_requests` table (and potentially related tables like `projects`) to support the new detailed negotiation and purchase workflow. These changes are inferred from the API route implementations and frontend component interactions.

## `project_purchase_requests` Table Modifications

The following fields were likely added or modified in the `project_purchase_requests` table:

| Column Name                    | Data Type     | Nullable | Description                                                                                                | Notes                                                                 |
|--------------------------------|---------------|----------|------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|
| `purchase_request_id`          | UUID          | NOT NULL | Primary Key.                                                                                               | Likely existing.                                                      |
| `project_id`                   | UUID          | NOT NULL | Foreign key to `projects` table.                                                                           | Likely existing.                                                      |
| `buyer_id`                     | UUID          | NOT NULL | Foreign key to `users` table (buyer).                                                                      | Likely existing.                                                      |
| `seller_id`                    | UUID          | NOT NULL | Foreign key to `users` table (seller).                                                                     | Likely existing.                                                      |
| `status`                       | VARCHAR(255)  | NOT NULL | Current status of the request (e.g., `buyer_interest_expressed`, `seller_terms_proposed`, `agreement_reached_pending_payment`, `transfer_completed_buyer_confirmed`, `seller_rejected`, `buyer_withdrew_interest`, `seller_declined_interest`, `assets_transferred_pending_buyer_confirmation`, etc.). | Likely existing, but with an expanded set of possible enum values. |
| `offer_amount`                 | DECIMAL(10,2) | NOT NULL | The price of the project at the time of interest or agreement.                                             | Likely existing.                                                      |
| `message`                      | TEXT          | NULL     | General message field, potentially used for buyer's intro, seller's proposal, or withdrawal/rejection reasons. | Might be repurposed or supplemented by more specific fields.         |
| `created_at`                   | TIMESTAMP     | NOT NULL | Timestamp of creation.                                                                                     | Likely existing.                                                      |
| `updated_at`                   | TIMESTAMP     | NOT NULL | Timestamp of last update.                                                                                  | Likely existing.                                                      |
| **`buyer_initial_commitments`**| JSONB         | NULL     | Stores buyer's initial confirmations (e.g., read description, agreed to ToS, understands non-binding nature).| New field.                                                            |
| **`buyer_intro_message`**      | TEXT          | NULL     | Initial introductory message from the buyer to the seller when expressing interest.                          | New field. Could also be part of `buyer_initial_commitments` JSON.    |
| **`seller_commitments`**       | JSONB         | NULL     | Stores seller's confirmations when proposing terms (e.g., legitimate owner, good faith negotiation).         | New field.                                                            |
| **`agreed_transferable_assets`**| JSONB         | NULL     | Detailed list of assets the seller agrees to transfer as part of the deal (e.g., source code, domain).    | New field.                                                            |
| **`seller_proposal_message`**  | TEXT          | NULL     | Message from the seller accompanying their proposed terms.                                                   | New field.                                                            |
| **`buyer_final_agreement`**    | JSONB         | NULL     | Stores buyer's final confirmations upon accepting seller's terms (e.g., agrees to asset list, price).       | New field.                                                            |
| **`buyer_digital_signature`**  | TEXT          | NULL     | Buyer's typed full name or similar, acting as a digital signature when accepting terms.                      | New field.                                                            |
| `seller_rejection_reason`      | TEXT          | NULL     | Reason provided by the seller if they reject a request (old flow) or decline interest (new flow).        | Might be pre-existing, possibly repurposed for `seller_declined_interest`. |
| `buyer_agreed_terms_version`   | VARCHAR(50)   | NULL     | Version of terms buyer agreed to (e.g., platform ToS).                                                     | Potentially existing or enhanced for new flow.                      |
| `seller_agreed_terms_version`  | VARCHAR(50)   | NULL     | Version of terms seller agreed to (e.g., seller agreement).                                                | Potentially existing or enhanced for new flow.                      |
| `payment_date`                 | TIMESTAMP     | NULL     | Date of successful payment.                                                                                | Likely existing.                                                      |
| `stripe_payment_intent_id`     | VARCHAR(255)  | NULL     | Stripe Payment Intent ID.                                                                                  | Likely existing.                                                      |
| **`transfer_notes`**           | TEXT          | NULL     | Notes or messages from the seller regarding the asset transfer process.                                      | New field, used in `/:requestId/transfer-status` route.             |
| **`status_last_updated`**      | TIMESTAMP     | NULL     | Timestamp when the seller last updated the transfer status or notes.                                         | New field, used in `/:requestId/transfer-status` route.             |
| `terms_agreed_version`         | VARCHAR(255)  | NULL     | General terms version agreed upon, potentially for "Buy Now" or simpler acceptance scenarios.              | May have been used by older "accept" routes.                          |

**Note:** Some existing fields like `message` or `seller_rejection_reason` might have been adapted or used in conjunction with new, more specific fields. The exact implementation would require inspecting the database migration files (if they exist and are accessible) or the table definition directly.

## `projects` Table Modifications

To support the "purchased" status and tracking:

| Column Name      | Data Type | Nullable | Description                                      | Notes      |
|------------------|-----------|----------|--------------------------------------------------|------------|
| `owner_id`       | UUID      | NOT NULL | ID of the user who owns the project.             | Existing.  |
| `owner_username` | VARCHAR   | NULL     | Username of the project owner.                   | Existing.  |
| `is_for_sale`    | BOOLEAN   | DEFAULT FALSE | Whether the project is currently listed for sale. | Existing. Modified by purchase. |
| **`purchased_at`**| TIMESTAMP | NULL     | Timestamp when the project was purchased.        | New field. |
| **`source`**     | VARCHAR(50)| NULL     | How the project was acquired (e.g., 'created', 'purchased'). | New field. |

This documentation provides a good overview of the structural changes necessary for the current features.

## `notifications` Table (New)

To support real-time user notifications:

| Column Name       | Data Type    | Nullable      | Description                                                                                                |
|-------------------|--------------|---------------|------------------------------------------------------------------------------------------------------------|
| `notification_id` | UUID         | NOT NULL (PK) | Primary Key.                                                                                               |
| `user_id`         | UUID         | NOT NULL (FK) | Foreign key to `users` table (the recipient of the notification).                                          |
| `type`            | VARCHAR(100) | NOT NULL      | Type of notification (e.g., 'NEW_INTEREST', 'TERMS_PROPOSED', 'PAYMENT_SUCCESS', 'TRANSFER_UPDATE', 'NEW_MESSAGE'). |
| `message`         | TEXT         | NOT NULL      | Human-readable notification message.                                                                       |
| `link`            | VARCHAR(255) | NULL          | Optional URL to navigate to (e.g., `/dashboard/requests/:requestId` or `/dashboard/messages/:requestId`).    |
| `is_read`         | BOOLEAN      | NOT NULL      | Default `FALSE`. True if the user has read the notification.                                               |
| `created_at`      | TIMESTAMP    | NOT NULL      | Default `CURRENT_TIMESTAMP`. When the notification was created.                                            |

## `purchase_request_messages` Table (New)

To support direct messaging between buyer and seller within a purchase request:

| Column Name             | Data Type | Nullable      | Description                                                                                    |
|-------------------------|-----------|---------------|------------------------------------------------------------------------------------------------|
| `message_id`            | UUID      | NOT NULL (PK) | Primary Key.                                                                                   |
| `purchase_request_id`   | UUID      | NOT NULL (FK) | Foreign key to `project_purchase_requests` table.                                              |
| `sender_id`             | UUID      | NOT NULL (FK) | Foreign key to `users` table (the user who sent the message).                                  |
| `receiver_id`           | UUID      | NOT NULL (FK) | Foreign key to `users` table (the user who should receive the message).                        |
| `content`               | TEXT      | NOT NULL      | The actual message content.                                                                    |
| `created_at`            | TIMESTAMP | NOT NULL      | Default `CURRENT_TIMESTAMP`. When the message was sent.                                          |
| `is_read`               | BOOLEAN   | NOT NULL      | Default `FALSE`. True if the recipient has read the message.                                   |

This concludes the schema changes anticipated for the enhanced purchase workflow and initial messaging features. 