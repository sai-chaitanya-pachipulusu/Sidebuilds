BEGIN;
-- Restored legacy tables used a timezone-less expiry. Existing server-written
-- values represent UTC; preserve those instants and make future writes explicit.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'password_reset_tokens'
          AND column_name = 'expires_at' AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE password_reset_tokens ALTER COLUMN expires_at TYPE TIMESTAMPTZ
            USING expires_at AT TIME ZONE 'UTC';
    END IF;
END $$;
COMMIT;
