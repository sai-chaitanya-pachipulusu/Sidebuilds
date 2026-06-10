const db = require('../db');

// DB-backed idempotency keys so retried requests stay idempotent across
// server restarts and multiple instances (the old in-memory Map lost all
// keys on every Render restart).

const KEY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let tableReady = false;

const ensureTable = async () => {
    if (tableReady) return;
    await db.query(`
        CREATE TABLE IF NOT EXISTS idempotency_keys (
            key TEXT PRIMARY KEY,
            operation TEXT NOT NULL,
            response TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    `);
    tableReady = true;
};

// Returns the cached response for (key, operation), or null.
const checkKey = async (key, operation) => {
    if (!key) return null;

    try {
        await ensureTable();
        const result = await db.query(
            'SELECT operation, response, created_at FROM idempotency_keys WHERE key = ?',
            [key]
        );

        const row = result.rows?.[0];
        if (!row) return null;
        if (row.operation !== operation) return null;
        if (Date.now() - new Date(row.created_at).getTime() > KEY_TTL_MS) return null;

        return JSON.parse(row.response);
    } catch (err) {
        // Idempotency is best-effort: never block the actual operation on it
        console.error('[Idempotency] check failed:', err.message);
        return null;
    }
};

const storeKey = async (key, operation, response) => {
    if (!key) return;

    try {
        await ensureTable();
        await db.query(
            `INSERT INTO idempotency_keys (key, operation, response)
             VALUES (?, ?, ?)
             ON CONFLICT (key) DO NOTHING`,
            [key, operation, JSON.stringify(response)]
        );
    } catch (err) {
        console.error('[Idempotency] store failed:', err.message);
    }
};

// Periodic cleanup of expired keys (every 6 hours)
const cleanupExpired = async () => {
    try {
        await ensureTable();
        await db.query(
            "DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL '24 hours'"
        );
    } catch (err) {
        console.error('[Idempotency] cleanup failed:', err.message);
    }
};
setInterval(cleanupExpired, 6 * 60 * 60 * 1000).unref();

module.exports = { checkKey, storeKey, cleanupExpired };
