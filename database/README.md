# SideBuilds Database Schema

## Quick Start

### For Fresh Production Setup (Supabase/PostgreSQL)

Run `unified_schema.sql` in Supabase SQL Editor - this creates all tables from scratch.

### For Existing Production Database (Add Missing Columns)

Run `migrations/production_schema_sync.sql` - this safely adds missing columns.

### For Local Development (SQLite)

The server automatically uses `sqlite_schema.sql` when `USE_SQLITE=true` in `.env`.

---

## File Structure (Streamlined)

```
database/
├── README.md                          # This file
├── unified_schema.sql                 # Complete PostgreSQL schema (fresh install)
├── sqlite_schema.sql                  # SQLite schema for local dev
└── migrations/
    └── production_schema_sync.sql     # Safe migration for existing databases
```

---

## Schema Overview

### Core Tables

| Table                  | Purpose                                     |
| ---------------------- | ------------------------------------------- |
| `users`                | User accounts, profiles, Stripe integration |
| `projects`             | Project listings with marketplace info      |
| `purchase_requests`    | Buyer interest and negotiation workflow     |
| `project_transactions` | Payment records                             |
| `project_transfers`    | Asset transfer tracking                     |
| `notifications`        | In-app notifications                        |
| `ai_project_analysis`  | AI scoring and valuation                    |

### Users Table - Key Columns

- `user_id` (UUID) - Primary key
- `username`, `email`, `password_hash` - Auth
- `first_name`, `last_name`, `bio`, `avatar_url` - Profile
- `stripe_account_id`, `onboarding_complete` - Stripe Connect
- `reputation_score`, `total_projects_sold` - Metrics

### Projects Table - Key Columns

- `project_id` (UUID) - Primary key
- `name`, `description`, `detailed_description` - Info
- `stage` - idea, planning, mvp, development, launched
- `is_public`, `is_for_sale`, `sale_price` - Marketplace
- `tech_stack`, `category`, `tags` - Discoverability
- `monthly_revenue`, `monthly_users` - Metrics
- `code_transferred`, `domain_transferred` - Transfer status

### Purchase Requests - Workflow Statuses

1. `interest_expressed` - Buyer sends interest
2. `seller_reviewing` - Seller is reviewing
3. `terms_proposed` - Seller proposes terms
4. `terms_accepted` - Buyer accepts terms
5. `payment_pending` - Awaiting payment
6. `payment_completed` - Payment received
7. `transfer_in_progress` - Transferring assets
8. `transfer_completed_seller_confirmed` - Seller done
9. `transfer_completed_buyer_confirmed` - Complete!

---

## How to Run Migrations

### Option 1: Supabase SQL Editor (Recommended)

1. Go to Supabase Dashboard → SQL Editor
2. Copy content from appropriate file
3. Run

### Option 2: psql Command Line

```bash
psql "postgresql://..." -f unified_schema.sql
```

---

## Environment Configuration

### Production (Render)

```env
DATABASE_URL=postgresql://...@supabase.co:5432/postgres
DB_SSL=true
NODE_ENV=production
```

### Local Development

```env
USE_SQLITE=true
NODE_ENV=development
```

---

## Troubleshooting

### Registration Fails (500 Error)

Missing columns in users table. Run:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(50);
```

### User Count Returns 0

The users table is empty. Run the migration to ensure schema is correct.

### Connection Issues

1. Check DATABASE_URL in .env
2. Ensure DB_SSL=true for Supabase
3. Verify IP allowlist in Supabase settings
