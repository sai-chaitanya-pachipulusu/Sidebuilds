-- Apply before deploying the coordinated agreement API/client. Existing paid requests remain legacy receipts.
BEGIN;
CREATE TABLE IF NOT EXISTS purchase_agreements (
    id TEXT PRIMARY KEY,
    purchase_request_id INTEGER NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    version INTEGER NOT NULL CHECK (version > 0),
    price_cents INTEGER NOT NULL CHECK (price_cents BETWEEN 50 AND 100000000),
    included_items TEXT NOT NULL,
    exclusions TEXT NOT NULL,
    running_costs TEXT NOT NULL,
    handover_steps TEXT NOT NULL,
    support_terms TEXT NOT NULL,
    seller_approved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    buyer_approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (purchase_request_id, version)
);
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS agreement_id TEXT REFERENCES purchase_agreements(id);
COMMIT;
