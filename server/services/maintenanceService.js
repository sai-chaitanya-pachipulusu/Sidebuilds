const db = require('../db');

// Periodic marketplace hygiene tasks.

const STALE_REQUEST_DAYS = 7;

// Abort pre-payment purchase requests that have had no activity for
// STALE_REQUEST_DAYS so projects don't stay soft-locked by abandoned
// negotiations. Paid/completed requests are never touched.
const expireStaleRequests = async () => {
    try {
        const result = await db.query(
            `UPDATE purchase_requests
             SET status = 'expired', updated_at = CURRENT_TIMESTAMP
             WHERE status IN ('interest_expressed', 'seller_terms_proposed',
                              'seller_accepted_pending_payment', 'agreement_reached_pending_payment')
               AND updated_at < NOW() - INTERVAL '${STALE_REQUEST_DAYS} days'
             RETURNING id, buyer_id, seller_id, project_id`,
            []
        );

        const expired = result.rows || [];
        if (expired.length === 0) return 0;

        console.log(`[Maintenance] Expired ${expired.length} stale purchase request(s)`);

        // Notify both parties (best-effort)
        const { createNotification } = require('./notificationService');
        for (const row of expired) {
            try {
                await createNotification(
                    row.buyer_id,
                    'request_expired',
                    `Your purchase request expired after ${STALE_REQUEST_DAYS} days of inactivity. You can express interest again any time.`,
                    `/dashboard?tab=buyerRequests&requestId=${row.id}`
                );
                await createNotification(
                    row.seller_id,
                    'request_expired',
                    `A purchase request for your project expired after ${STALE_REQUEST_DAYS} days of inactivity.`,
                    `/dashboard?tab=sellerRequests&requestId=${row.id}`
                );
            } catch (notifyErr) {
                console.error('[Maintenance] Failed to notify about expired request:', notifyErr.message);
            }
        }

        return expired.length;
    } catch (err) {
        console.error('[Maintenance] expireStaleRequests failed:', err.message);
        return 0;
    }
};

// Run all maintenance tasks once
const runMaintenance = async () => {
    await expireStaleRequests();
};

// Schedule: once shortly after boot, then every 12 hours
const start = () => {
    setTimeout(() => {
        runMaintenance();
    }, 30 * 1000).unref();

    setInterval(() => {
        runMaintenance();
    }, 12 * 60 * 60 * 1000).unref();
};

module.exports = { start, runMaintenance, expireStaleRequests };
