BEGIN;
ALTER TABLE project_transactions ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE project_transactions ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;
ALTER TABLE project_transactions ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES users(user_id);
COMMIT;
