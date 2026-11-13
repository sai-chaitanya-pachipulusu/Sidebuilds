const router = require('express').Router({ mergeParams: true });
const db = require('../db');
const auth = require('../middleware/authMiddleware');
const { createNotification } = require('../services/notificationService');
const { randomUUID, fail, validateScope, serialize, latestAgreement, assertEditable } = require('../utils/purchaseAgreement');

router.use(auth, (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!/^[1-9]\d*$/.test(req.params.requestId) || !Number.isSafeInteger(Number(req.params.requestId)) || Number(req.params.requestId) > 2147483647) return res.status(400).json({ error: 'Invalid purchase request.' });
    next();
});

async function findRequest(client, req, lock = false) {
    const { rows } = await client.query(`SELECT pr.*, p.name AS project_name, p.owner_id AS project_owner_id,
        p.is_for_sale AS project_is_for_sale, p.is_on_hold AS project_is_on_hold, p.sale_price AS listing_price,
        s.username AS seller_username, b.username AS buyer_username
        FROM purchase_requests pr JOIN projects p ON p.project_id=pr.project_id
        JOIN users s ON s.user_id=pr.seller_id JOIN users b ON b.user_id=pr.buyer_id
        WHERE pr.id=$1 AND (pr.buyer_id=$2 OR pr.seller_id=$2)${lock ? ' FOR UPDATE' : ''}`, [req.params.requestId, req.user.user_id]);
    if (!rows.length) fail(404, 'This purchase could not be found for your account.');
    return rows[0];
}
function sendError(res, error) {
    if (!error.status) console.error('Purchase agreement failed:', error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'The agreement could not be loaded or saved. Please retry.' });
}
async function notify(userId, message, requestId) {
    try { await createNotification(userId, 'purchase_agreement', message, `/purchase-agreement/${requestId}`); }
    catch (error) { console.error('Agreement notification failed:', error.message); }
}

router.get('/', async (req, res) => {
    try {
        const request = await findRequest(db, req);
        const { rows } = await db.query('SELECT * FROM purchase_agreements WHERE purchase_request_id=$1 ORDER BY version DESC', [request.id]);
        let canEdit = true;
        let lockedReason = '';
        try { assertEditable(request); } catch (error) { canEdit = false; lockedReason = error.message; }
        const current = serialize(rows[0]);
        const payment = (await db.query('SELECT transaction_id,status,escrow_status FROM project_transactions WHERE purchase_request_id=$1',[request.id])).rows[0] || null;
        res.json({ request_id: request.id, project_id: request.project_id, project_name: request.project_name,
            seller_username: request.seller_username, buyer_username: request.buyer_username,
            role: request.seller_id === req.user.user_id ? 'seller' : 'buyer', status: request.status,
            suggested_price: request.price ?? request.listing_price, can_edit: canEdit, locked_reason: lockedReason,
            checkout_started: Boolean(request.agreement_id || request.stripe_session_id),
            checkout_available: require('../utils/commercePolicy').commerceEnabled(process.env),
            checkout_message: require('../utils/commercePolicy').commerceEnabled(process.env) ? '' : 'Payments are paused while we validate the purchase service. You can still ask questions and agree the scope. No payment will be taken.',
            can_checkout: Boolean(current?.buyer_approved_at && current?.seller_approved_at &&
                ['seller_accepted_pending_payment', 'agreement_reached_pending_payment', 'payment_processing'].includes(request.status) &&
                request.project_owner_id === request.seller_id && request.project_is_for_sale && !request.project_is_on_hold),
            payment, agreement: current, versions: rows.map(serialize) });
    } catch (error) { sendError(res, error); }
});

// Publishing is the seller's explicit approval. Terms are append-only; revisions need a fresh buyer approval.
router.post('/', async (req, res) => {
    try {
        const scope = validateScope(req.body);
        if (!Number.isSafeInteger(req.body.base_version) || req.body.base_version < 0) fail(400, 'Refresh the agreement version before saving.');
        const result = await db.withTransaction(async client => {
            const request = await findRequest(client, req, true);
            if (request.seller_id !== req.user.user_id) fail(403, 'Only the seller can publish a purchase scope.');
            assertEditable(request);
            const latest = await latestAgreement(client, request.id);
            if ((latest?.version || 0) !== req.body.base_version) fail(409, 'A newer agreement is available. Refresh before publishing your changes.');
            const id = randomUUID();
            const { rows } = await client.query(`INSERT INTO purchase_agreements
                (id,purchase_request_id,version,price_cents,included_items,exclusions,running_costs,handover_steps,support_terms,seller_approved_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP) RETURNING *`,
            [id, request.id, (latest?.version || 0) + 1, scope.price_cents, JSON.stringify(scope.included_items),
                scope.exclusions, scope.running_costs, scope.handover_steps, scope.support_terms]);
            await client.query("UPDATE purchase_requests SET price=$2, status='seller_accepted_pending_payment', updated_at=CURRENT_TIMESTAMP WHERE id=$1", [request.id, scope.price_cents / 100]);
            return { agreement: serialize(rows[0]), buyer: request.buyer_id, project: request.project_name };
        });
        await notify(result.buyer, `Review the purchase scope for “${result.project}” before payment.`, req.params.requestId);
        res.status(201).json({ agreement: result.agreement });
    } catch (error) { sendError(res, error); }
});

router.post('/approve', async (req, res) => {
    try {
        if (req.body.acknowledged !== true || typeof req.body.agreement_id !== 'string') fail(400, 'Review the scope and explicitly approve this version.');
        const result = await db.withTransaction(async client => {
            const request = await findRequest(client, req, true);
            if (request.buyer_id !== req.user.user_id) fail(403, 'Only the buyer can approve the seller’s scope.');
            const latest = await latestAgreement(client, request.id);
            if (!latest || latest.id !== req.body.agreement_id) fail(409, 'The agreement changed. Read the latest version before approving.');
            // Retrying a successful approval is read-only, even after checkout starts.
            if (latest.buyer_approved_at) return { agreement: serialize(latest), repeated: true };
            assertEditable(request);
            await client.query('UPDATE purchase_agreements SET buyer_approved_at=CURRENT_TIMESTAMP WHERE id=$1', [latest.id]);
            await client.query("UPDATE purchase_requests SET status='agreement_reached_pending_payment', updated_at=CURRENT_TIMESTAMP WHERE id=$1", [request.id]);
            return { agreement: serialize(await latestAgreement(client, request.id)), seller: request.seller_id, project: request.project_name };
        });
        if (!result.repeated) await notify(result.seller, `The buyer approved the purchase scope for “${result.project}”.`, req.params.requestId);
        res.json({ agreement: result.agreement });
    } catch (error) { sendError(res, error); }
});

module.exports = router;
