BEGIN;
CREATE TABLE IF NOT EXISTS stripe_connection_attempts (
  user_id UUID PRIMARY KEY REFERENCES users(user_id),
  previous_account_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('test','live')),
  generation TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  account_type TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  account_id TEXT
);
ALTER TABLE stripe_connection_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON stripe_connection_attempts FROM PUBLIC, anon, authenticated;
COMMIT;
