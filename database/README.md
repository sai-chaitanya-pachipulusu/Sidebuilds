# Database Migration Guide for SideProject Tracker

This directory contains the database migration scripts for the SideProject Tracker application. The scripts are designed to be run in sequence to properly set up the database schema.

## File Structure

The migration files are organized in a sequential order:

1. `01_base_schema.sql` - Basic schema with core tables (users, projects, project_transactions)
2. `02_payment_integration.sql` - Adds payment integration and marketplace view
3. `03_stripe_connect.sql` - Adds Stripe Connect integration and project transfer management
4. `04_seed_data.sql` - Sample data for testing (optional)
5. `05_asset_transfer_completion.sql` - Enhances asset transfer functionality with dispute resolution
6. `06_payment_feature_completion.sql` - Completes payment features with saved methods and analytics

## Migration Instructions

### Prerequisites

- CockroachDB (or PostgreSQL) installed and running
- Database connection parameters (username, password, host, port, database name)

### Running the Migrations

#### In PowerShell (Windows)

Option 1: Use the `-f` flag with the CockroachDB CLI:
```powershell
cockroach sql --url="your_connection_string" -f database/01_base_schema.sql
cockroach sql --url="your_connection_string" -f database/02_payment_integration.sql
cockroach sql --url="your_connection_string" -f database/03_stripe_connect.sql
cockroach sql --url="your_connection_string" -f database/04_seed_data.sql  # Optional
cockroach sql --url="your_connection_string" -f database/05_asset_transfer_completion.sql
cockroach sql --url="your_connection_string" -f database/06_payment_feature_completion.sql
```

Option 2: Use the provided PowerShell script:
```powershell
cd database
.\run-migrations.ps1 "your_connection_string"
```

#### In Bash/Unix Shell

Execute the scripts in order using the CockroachDB SQL shell or PostgreSQL client:

```bash
# For CockroachDB
cockroach sql --url="your_connection_string" < 01_base_schema.sql
cockroach sql --url="your_connection_string" < 02_payment_integration.sql
cockroach sql --url="your_connection_string" < 03_stripe_connect.sql
cockroach sql --url="your_connection_string" < 04_seed_data.sql  # Optional, for testing only
cockroach sql --url="your_connection_string" < 05_asset_transfer_completion.sql
cockroach sql --url="your_connection_string" < 06_payment_feature_completion.sql
```

#### In CockroachDB SQL Shell

From within the CockroachDB SQL shell:

```sql
\i 01_base_schema.sql
\i 02_payment_integration.sql
\i 03_stripe_connect.sql
\i 04_seed_data.sql  -- Optional, for testing only
\i 05_asset_transfer_completion.sql
\i 06_payment_feature_completion.sql
```

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

This is a limitation in CockroachDB where you cannot replace a trigger function while it has active triggers. The `01_base_schema.sql` script has been updated to first drop the existing triggers and function before recreating them, which should resolve this issue.

### Other Common Issues

If you encounter other errors during migration, check the following:

1. Ensure the database user has sufficient privileges
2. Verify that the scripts are run in the correct order
3. Check for any type mismatches in existing data
4. For UUID errors, ensure you're using a compatible version of CockroachDB/PostgreSQL

For assistance, refer to the error messages which typically provide clear information about the issue. 