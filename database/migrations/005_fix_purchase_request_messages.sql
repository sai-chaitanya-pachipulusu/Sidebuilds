-- 005: Rebuild purchase_request_messages with types that match the rest of the schema.
--
-- The original table was created with purchase_request_id UUID, but
-- purchase_requests.id is INTEGER, so every insert failed and the table has
-- always been empty. It was also missing recipient_id / updated_at, which the
-- messages API uses, and message was NOT NULL while the API only writes content.
--
-- Safe to run on production: the old table is verified empty (0 rows).

DROP TABLE IF EXISTS purchase_request_messages;

CREATE TABLE purchase_request_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_request_id INTEGER NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message TEXT, -- legacy mirror of content, kept for older readers
    message_type VARCHAR(50) DEFAULT 'general',
    is_read BOOLEAN DEFAULT false,
    is_system_message BOOLEAN DEFAULT false,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_request ON purchase_request_messages(purchase_request_id);
CREATE INDEX idx_messages_sender ON purchase_request_messages(sender_id);
CREATE INDEX idx_messages_recipient_unread ON purchase_request_messages(recipient_id, is_read);
CREATE INDEX idx_messages_created ON purchase_request_messages(created_at);

-- Login/registration look up users with LOWER(TRIM(email)); this expression
-- index keeps those lookups on an index instead of a sequential scan.
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(TRIM(email)));
