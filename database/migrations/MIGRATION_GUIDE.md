# SQLite to PostgreSQL Schema Migration Reference

## 🚀 QUICK ACTION - Run This Now!

Copy the contents of **`final_sync.sql`** and run it in your Supabase SQL Editor.

This adds everything that's still missing after your previous migrations.

---

## ✅ Already Applied (from your SQL Editor history)

| Migration                                                                             | Status  |
| ------------------------------------------------------------------------------------- | ------- |
| User profile columns (first_name, last_name, bio, etc.)                               | ✅ Done |
| Account status columns (is_verified, verification_level)                              | ✅ Done |
| Stripe columns (stripe_customer_id, stripe_account_id)                                | ✅ Done |
| **Payout columns** (payout_enabled, stripe_charges_enabled, stripe_details_submitted) | ✅ Done |
| Projects table columns (detailed_description, status, etc.)                           | ✅ Done |
| owner_id / owner_username on projects                                                 | ✅ Done |
| tech_stack changed from TEXT[] to TEXT                                                | ✅ Done |
| tags, gallery_images changed to TEXT                                                  | ✅ Done |
| project_transactions table                                                            | ✅ Done |
| purchase_requests table                                                               | ✅ Done |
| notifications table                                                                   | ✅ Done |
| ai_project_analysis table                                                             | ✅ Done |
| project_transfers table                                                               | ✅ Done |
| purchase_request_messages table                                                       | ✅ Done |

## ⚠️ Still Missing (in final_sync.sql)

| Item                                      | Criticality |
| ----------------------------------------- | ----------- |
| **`is_admin` column on users**            | 🔴 CRITICAL |
| `project_valuations` table                | 🟡 Medium   |
| `payment_methods` table                   | 🟡 Medium   |
| `payout_preferences` table                | 🟡 Medium   |
| `payment_disputes` table                  | 🟢 Low      |
| `payment_schedules` table                 | 🟢 Low      |
| Extra columns on ai_project_analysis      | 🟡 Medium   |
| Extra columns on notifications            | 🟢 Low      |
| Credentials tracking on project_transfers | 🟢 Low      |
| Triggers for auto-updating timestamps     | 🟡 Medium   |
| Performance indexes                       | 🟢 Low      |

---

## Migration Files

| File                             | Purpose                                     | When to Use               |
| -------------------------------- | ------------------------------------------- | ------------------------- |
| `final_sync.sql`                 | **Run this now** - adds only what's missing | After previous migrations |
| `complete_production_sync.sql`   | Complete schema from scratch                | Fresh database setup      |
| `production_schema_sync.sql`     | Original partial sync                       | Already run               |
| `fix_projects_owner_columns.sql` | Fix owner_id/tech_stack                     | Already run               |

---

## Column-by-Column Differences

### USERS Table - Missing in Production

```sql
-- CRITICAL: Admin flag was missing!
is_admin BOOLEAN DEFAULT FALSE

-- All profile fields were added (already done)
first_name, last_name, bio, avatar_url, location
website_url, twitter_handle, github_username, linkedin_url

-- Metrics (already done)
total_projects_sold, total_projects_bought, total_revenue, reputation_score

-- Security (already done)
last_login_at, login_count, failed_login_attempts, account_locked_until
```

### PROJECTS Table - Missing in Production

```sql
-- Media (already done)
thumbnail_url, gallery_images, video_demo_url

-- Marketplace (already done)
price_negotiable, is_on_hold, featured, verified

-- Transfer assets (already done)
transferable_assets (JSONB), code_repository_included, domain_included
database_included, documentation_included, support_period_days

-- Transfer status (already done)
code_transferred, domain_transferred, assets_transferred, documentation_transferred

-- Analytics (already done)
view_count, interest_count
```

### PROJECT_TRANSACTIONS - Missing in Production

```sql
commission_amount DECIMAL(12, 2)  -- in final_sync.sql
seller_amount DECIMAL(12, 2)      -- in final_sync.sql
transaction_notes TEXT            -- in final_sync.sql
escrow_released BOOLEAN           -- already done
escrow_released_at TIMESTAMP      -- already done
transfer_completed BOOLEAN        -- already done
transfer_completed_at TIMESTAMP   -- already done
```

### PROJECT_TRANSFERS - Missing in Production

```sql
database_transferred BOOLEAN        -- already done
credentials_shared JSONB            -- in final_sync.sql (NEW: Asset Transfer Dashboard)
credentials_last_updated TIMESTAMP  -- in final_sync.sql
seller_instructions TEXT            -- already done
buyer_confirmation TEXT             -- already done
```

---

## Key Differences: SQLite vs PostgreSQL

| Feature        | SQLite        | PostgreSQL                    |
| -------------- | ------------- | ----------------------------- |
| UUID           | TEXT          | UUID type                     |
| Boolean        | INTEGER (0/1) | BOOLEAN                       |
| Arrays         | JSON strings  | TEXT (we use TEXT for compat) |
| JSONB          | TEXT          | JSONB                         |
| Timestamps     | DATETIME      | TIMESTAMP WITH TIME ZONE      |
| Auto-increment | AUTOINCREMENT | SERIAL / gen_random_uuid()    |

---

## Functions and Triggers Added

### `update_timestamp()` Function

Automatically updates `updated_at` column on any row update.

Applied to tables:

- users
- projects
- purchase_requests
- project_transfers

### `manually_update_project_transfer_status(UUID)` Function

Updates transfer status based on asset transfer flags:

- All transferred → `completed`
- Some transferred → `in_progress`
- None transferred → `pending`

---

## Indexes Added for Performance

```sql
-- User lookups
idx_users_email, idx_users_username, idx_users_stripe_customer

-- Project discovery
idx_projects_owner, idx_projects_user, idx_projects_stage, idx_projects_category

-- Transaction tracking
idx_transactions_buyer, idx_transactions_seller, idx_transactions_project

-- Purchase requests
idx_pr_project, idx_pr_buyer, idx_pr_seller

-- Notifications
idx_notifications_user

-- Transfers
idx_transfers_project
```

---

## Migration Steps

### Step 1: Run Final Sync

Copy and paste `final_sync.sql` into Supabase SQL Editor and run it.

### Step 2: Verify is_admin Column

```sql
-- CRITICAL: Verify is_admin exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'is_admin';
```

### Step 3: Verify All Tables

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Step 4: Test Project Creation

```sql
-- Test insert to confirm everything works
INSERT INTO projects (name, description, owner_id, owner_username, is_public, is_for_sale)
VALUES ('Test Project', 'Test description', (SELECT user_id FROM users LIMIT 1), 'testuser', true, true)
RETURNING project_id, name;

-- Clean up
DELETE FROM projects WHERE name = 'Test Project';
```

---

## Troubleshooting

### Error: Column already exists

This is safe to ignore - the `ADD COLUMN IF NOT EXISTS` handles this.

### Error: Table already exists

This is safe to ignore - the `CREATE TABLE IF NOT EXISTS` handles this.

### Error: Cannot alter type of a column used by a view

Drop the view first, run migration, then recreate the view.

```sql
DROP VIEW IF EXISTS marketplace_projects;
-- Run your migration
-- Then recreate view if needed
```

### Data type mismatch (TEXT[] vs TEXT)

Your server code should parse JSON strings:

```javascript
// Parse tech_stack as JSON string
const techStack = JSON.parse(project.tech_stack || "[]");

// Parse tags as JSON string
const tags = JSON.parse(project.tags || "[]");
```

---

## New Tables Added (in final_sync.sql)

### project_valuations

Tracks project valuations separately from AI analysis.

### payment_methods

Stores user payment methods (cards, bank accounts).

### payout_preferences

User payout settings and schedule preferences.

### payment_disputes

Track and resolve payment disputes.

### payment_schedules

Milestone/installment payment tracking.

---

## Last Updated

2025-12-23 (after reviewing your SQL Editor history)
