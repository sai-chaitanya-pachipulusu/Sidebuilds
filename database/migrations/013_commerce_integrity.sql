-- Additive repair. No paid records or user content are rewritten.
BEGIN;
ALTER TABLE project_transactions ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT 'held';
ALTER TABLE project_transactions ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;
ALTER TABLE project_transactions ADD COLUMN IF NOT EXISTS purchase_request_id INTEGER REFERENCES purchase_requests(id);
ALTER TABLE project_transactions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd';
ALTER TABLE project_transactions ADD COLUMN IF NOT EXISTS seller_stripe_account_id TEXT;
ALTER TABLE project_transactions ADD COLUMN IF NOT EXISTS dispute_reason TEXT;
ALTER TABLE project_transactions ADD COLUMN IF NOT EXISTS dispute_reported_at TIMESTAMPTZ;
ALTER TABLE project_transactions ADD COLUMN IF NOT EXISTS dispute_reported_by UUID REFERENCES users(user_id);
ALTER TABLE project_transactions ADD COLUMN IF NOT EXISTS provider_dispute_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_checkout_unique ON project_transactions(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_payment_unique ON project_transactions(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_request_unique ON project_transactions(purchase_request_id) WHERE purchase_request_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS checkout_reservations (
  project_id UUID PRIMARY KEY REFERENCES projects(project_id),
  purchase_request_id INTEGER NOT NULL REFERENCES purchase_requests(id),
  generation TEXT NOT NULL UNIQUE,
  agreement_id TEXT NOT NULL REFERENCES purchase_agreements(id),
  price_cents INTEGER NOT NULL CHECK(price_cents >= 50),
  fee_cents INTEGER NOT NULL CHECK(fee_cents >= 0 AND fee_cents < price_cents),
  currency TEXT NOT NULL DEFAULT 'usd',
  seller_account_id TEXT NOT NULL,
  session_id TEXT UNIQUE,
  state TEXT NOT NULL DEFAULT 'creating' CHECK(state IN ('creating','open','paid')),
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS payment_event_claims (
  event_id TEXT PRIMARY KEY, event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS payout_attempts (transaction_id UUID PRIMARY KEY REFERENCES project_transactions(transaction_id),created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS project_file_blobs (
  file_id UUID PRIMARY KEY REFERENCES project_files(file_id) ON DELETE CASCADE,
  content BYTEA NOT NULL CHECK(octet_length(content) <= 10485760)
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS payment_blocks (payment_id TEXT PRIMARY KEY,reason TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS payment_event_failures (event_id TEXT PRIMARY KEY,event_type TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 1,error_code TEXT,
  received_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0;
-- Backend-only data API: preserve the security model of migration 012.
ALTER TABLE checkout_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_event_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_file_blobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_event_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON checkout_reservations, payment_event_claims, project_file_blobs, payment_blocks, payment_event_failures, payout_attempts FROM PUBLIC, anon, authenticated;
COMMIT;
