# Database Migration Guide for SideProject Tracker

This directory contains the database migration scripts for the SideProject Tracker application. The scripts are designed to be run in sequence to properly set up the database schema.

## File Structure

The migration files are organized in a sequential, numerical order (e.g., `00_drop_all_tables.sql`, `01_base_schema.sql`, `02_payment_integration.sql`, etc.). **It is crucial to run these scripts in their numerical order to ensure the database schema is set up correctly.**

As of the last update, the key migration scripts include:
*   `00_drop_all_tables.sql` - (Optional, for clean installs) Drops all known tables, views, and functions.
*   `01_base_schema.sql` - Basic schema with core tables.
*   `02_payment_integration.sql` - Adds payment integration and marketplace views.
*   `03_stripe_connect.sql` - Adds Stripe Connect integration and project transfer management.
*   `04_seed_data.sql` - Sample data for testing (optional, and its execution is conditional in `run-migrations.ps1`).
*   `05_asset_transfer_completion.sql` - Enhances asset transfer functionality.
*   `06_payment_feature_completion.sql` - Completes payment features with saved methods and analytics.
*   `07_add_purchase_requests.sql` - Adds the `project_purchase_requests` table and related logic.

Always check the `database` directory for the complete and current list of migration files to be run. The `run-migrations.ps1` script is designed to execute them in the correct order.

## Migration Instructions

### Prerequisites
*   CockroachDB (or a compatible PostgreSQL version) installed and running.
*   Database connection string/parameters.
*   The CockroachDB CLI (`cockroach`) accessible in your PATH if running SQL files manually.

### Running the Migrations

The recommended method is to use the provided PowerShell script `run-migrations.ps1`, as it handles the execution order and provides options like clean installs.

**Using the PowerShell Script (Recommended for Windows):**
```powershell
# Navigate to the database directory
cd database

# Execute the script with your connection string
.\run-migrations.ps1 "your_connection_string_here"

# For a clean install (drops all tables first):
.\run-migrations.ps1 "your_connection_string_here" -CleanInstall
```
The script will execute all necessary `.sql` migration files from the `database` directory in their correct numerical order.

**Manual Execution (General - All Platforms):**

If you cannot use the PowerShell script, you must run each `.sql` file in the `database` directory in **strict numerical order**.

Example for CockroachDB CLI:
```powershell
# Ensure you are in the 'database' directory or provide full paths
cockroach sql --url="your_connection_string" -f 00_drop_all_tables.sql # If doing a clean install
cockroach sql --url="your_connection_string" -f 01_base_schema.sql
cockroach sql --url="your_connection_string" -f 02_payment_integration.sql
# ... continue for ALL .sql files in numerical order ...
cockroach sql --url="your_connection_string" -f XX_your_latest_script.sql
```

Example for `psql` (PostgreSQL):
```bash
# Ensure you are in the 'database' directory or provide full paths
psql "your_connection_string" -f 00_drop_all_tables.sql # If doing a clean install
psql "your_connection_string" -f 01_base_schema.sql
psql "your_connection_string" -f 02_payment_integration.sql
# ... continue for ALL .sql files in numerical order ...
psql "your_connection_string" -f XX_your_latest_script.sql
```

**Important:** Always ensure all numerically prefixed `.sql` files are executed in ascending order. The `04_seed_data.sql` is generally optional for development/testing and its execution is handled conditionally by the `run-migrations.ps1` script.

## Schema Overview

### Core Tables

- **users** - User accounts and authentication
- **projects** - Project details, including marketplace information
- **project_transactions** - Records of project sales and payments

### Additional Tables

- **project_transfers** - Tracks the transfer of project assets from seller to buyer
- **payment_methods** - Stores saved payment methods for users
- **payout_preferences** - Configures how sellers receive funds
- **payment_schedules** - Manages automatic payout schedules
- **payment_disputes** - Handles disputes and refund requests

### Views

- **marketplace_projects** - A view showing projects that are for sale
- **payment_transfers_view** - An admin view for monitoring payments and transfers
- **buyer_pending_transfers** - Shows pending transfers for buyers
- **seller_payment_analytics** - Provides sales and payment stats for sellers

## Key Database Logic and Procedures

### Project Transfer Status Updates (`project_transfers` table)

The logic for updating the `status` and `transfer_completed_at` fields of records in the `project_transfers` table is handled by a stored procedure, **not** an automatic database trigger on this table.

*   **Stored Procedure:** `manually_update_project_transfer_status(p_transfer_id UUID)`
*   **Defined In:** `05_asset_transfer_completion.sql`

**How it Works:**
This procedure is designed to be called explicitly by the application's backend (server-side code).
1.  The application backend updates the boolean flags (`code_transferred`, `domain_transferred`, `assets_transferred`) in the `project_transfers` table.
2.  Immediately after a successful update of these flags, the application backend **must** execute this stored procedure, passing the relevant `transfer_id`.
    ```sql
    SELECT manually_update_project_transfer_status('your-project-transfer-uuid');
    ```
3.  The stored procedure then reads the current state of the boolean flags for the given transfer and updates the `status` field to 'pending', 'in_progress', or 'completed', and sets the `transfer_completed_at` timestamp accordingly.

**Reasoning for this approach:**
Direct `BEFORE UPDATE` triggers on the `project_transfers` table for this logic encountered persistent errors (`ERROR: no data source matches prefix: new in this context` or `column "found" does not exist`) with the CockroachDB version used during development. Moving this logic into an application-invoked stored procedure bypasses these specific trigger/function issues while still allowing the core status update rules to be defined within the database.

**Failure by the application to call this procedure after updating transfer flags will result in incorrect transfer statuses in the `project_transfers` table.**

### Project Status Updates (`projects` table - Asset Transfer Related)

The `projects` table includes boolean flags (`code_transferred`, `domain_transferred`, `assets_transferred`) and a `status` column (e.g., 'listed', 'assets_transferred') to track the overall state of asset transfer for a project itself.

The logic to update `projects.status` based on these flags (e.g., setting to 'assets_transferred' when all flags are true) is **handled by the server-side application code.**

*   **Location of Logic:** Application backend (e.g., in services that manage project updates).
*   **Database Component:** The `05_asset_transfer_completion.sql` migration file adds the necessary columns (`status`, `code_transferred`, etc.) to the `projects` table. A database trigger for this logic was attempted (and is currently commented out in `05_asset_transfer_completion.sql`) but was removed due to persistent compatibility issues with CockroachDB triggers in this specific scenario.

**How it Should Work (Application Backend):**
1.  When the application backend updates any of the `code_transferred`, `domain_transferred`, or `assets_transferred` boolean flags on a `projects` record:
2.  The backend should immediately re-evaluate these flags.
3.  If all three are `TRUE`, the backend should update `projects.status` to `'assets_transferred'`.
4.  If not all are `TRUE` (e.g., some are true, some are false, or all are false), the backend should set `projects.status` to an appropriate state like `'listed'` or `'transfer_in_progress'` based on business rules.

**Reasoning for this approach:**
Attempts to implement this as an automatic database trigger on the `projects` table encountered persistent and difficult-to-diagnose errors with CockroachDB's trigger execution context (often `ERROR: no data source matches prefix: new in this context`). Moving this logic to the application layer provides more control and avoids these database-specific trigger complexities for this case.

**Failure by the application to implement this logic will result in the `projects.status` field not automatically reflecting the state of its asset transfer flags.**

Other triggers, such as the one on the `projects` table for `updated_at` timestamp (`update_projects_timestamp` from `01_base_schema.sql`), operate as standard database triggers because they did not exhibit the same issues.

## Payment Feature Capabilities

The completed payment system now offers:

1. **Secure Payments** - All transactions processed through Stripe
2. **Automated Transfers** - Funds automatically moved to seller accounts
3. **Dispute Resolution** - Process for handling refunds and disputes
4. **Saved Payment Methods** - Users can save and reuse payment methods
5. **Payout Preferences** - Sellers can configure how they receive payments
6. **Scheduled Payouts** - Regular automated payment transfers
7. **Transfer Tracking** - Complete history of asset transfers
8. **Seller Analytics** - Dashboard with sales and revenue insights

## Troubleshooting

### Trigger Function Error

If you encounter this error:
```
ERROR: unimplemented: cannot replace a trigger function with an active trigger
SQLSTATE: 0A000
HINT: You have attempted to use a feature that is not yet implemented.
```

This is a limitation in CockroachDB where you cannot replace a trigger function while it has active triggers. The `01_base_schema.sql` script (and others like `07_add_purchase_requests.sql` for `project_purchase_requests`) have been updated to first drop the existing triggers and function before recreating them, which should resolve this issue.

### Other Common Issues

If you encounter other errors during migration, check the following:

1. Ensure the database user has sufficient privileges
2. Verify that the scripts are run in the correct order
3. Check for any type mismatches in existing data
4. For UUID errors, ensure you're using a compatible version of CockroachDB/PostgreSQL

For assistance, refer to the error messages which typically provide clear information about the issue. 