const { randomUUID } = require('node:crypto');
const { approvedAgreement, fail } = require('../utils/purchaseAgreement');

// A reservation is committed before contacting Stripe. Unknown provider outcomes
// keep the reservation; retries use exactly the same persisted parameters and key.
async function createCheckout({ db, stripe, requestId, agreementId, buyerId, clientUrl, commissionRate = 5,liveMode=false }) {
  const pointer = (await db.query('SELECT project_id FROM purchase_requests WHERE id=$1 AND buyer_id=$2', [requestId, buyerId])).rows[0];
  if (!pointer) fail(404, 'Purchase request not found or access denied.');
  const context = await db.withTransaction(async client => {
    const project = (await client.query('SELECT * FROM projects WHERE project_id=$1 FOR UPDATE', [pointer.project_id])).rows[0];
    const request = (await client.query('SELECT * FROM purchase_requests WHERE id=$1 AND buyer_id=$2 FOR UPDATE', [requestId, buyerId])).rows[0];
    if (!project || !request || project.owner_id !== request.seller_id || !project.is_for_sale || project.is_on_hold) fail(409, 'This project is unavailable for checkout.');
    if (!['seller_accepted_pending_payment', 'agreement_reached_pending_payment', 'payment_processing'].includes(request.status)) fail(409, 'Payment cannot be processed in the current purchase state.');
    if (!Number.isFinite(Number(request.price)) || Number(request.price) < 0.5) fail(400,'This purchase has no valid agreed price.');
    const agreement = await approvedAgreement(client, { ...request, purchase_request_id: request.id, accepted_price: request.price }, agreementId);
    const seller = (await client.query('SELECT stripe_account_id,is_test FROM users WHERE user_id=$1', [request.seller_id])).rows[0];
    const buyer = (await client.query('SELECT is_test FROM users WHERE user_id=$1',[buyerId])).rows[0];
    if(liveMode && [buyer,seller].some(user=>user?.is_test===true || user?.is_test===1))fail(403,'Testing accounts cannot start live payments. Use the isolated Stripe test environment.');
    if (!seller?.stripe_account_id) fail(409, 'The seller must complete payment setup first.');
    let reservation = (await client.query('SELECT * FROM checkout_reservations WHERE project_id=$1', [project.project_id])).rows[0];
    if (reservation) {
      if (reservation.state === 'paid') fail(409, 'This project has already been paid for.');
      if (reservation.session_id) {
        // A local clock alone cannot prove a payment link is no longer payable.
        const session = await stripe.checkout.sessions.retrieve(reservation.session_id);
        if (session.payment_status === 'paid' || session.status === 'complete') fail(409, 'Payment is being reconciled. Check purchases shortly.');
        if (session.status === 'open') {
          if (reservation.purchase_request_id !== request.id) fail(409, 'Another buyer has an active checkout. Please try again after it closes.');
          if (reservation.agreement_id !== agreement.id) fail(409, 'The checkout agreement has changed.');
          return { session, reused: true };
        }
        if (session.status !== 'expired') fail(409, 'The previous checkout needs payment review.');
        await client.query('DELETE FROM checkout_reservations WHERE project_id=$1', [project.project_id]);
        reservation = null;
      } else if (reservation.purchase_request_id !== request.id) {
        fail(409, 'Another checkout is being prepared. Please try again later.');
      }
    }
    if (!reservation) {
      const rate = Number(commissionRate);
      if (!Number.isFinite(rate) || rate < 0 || rate >= 100) fail(503, 'The marketplace fee needs configuration review.');
      // Check the connected account freshly; cached onboarding flags can be stale.
      const account = await stripe.accounts.retrieve(seller.stripe_account_id);
      if (!account.charges_enabled || !account.payouts_enabled || !account.details_submitted || account.capabilities?.transfers === 'inactive') fail(409, 'The seller must finish or update payment setup before checkout.');
      reservation = { project_id: project.project_id, purchase_request_id: request.id, generation: randomUUID(), agreement_id: agreement.id,
        price_cents: agreement.price_cents, fee_cents: Math.round(agreement.price_cents * rate / 100), currency: 'usd',
        seller_account_id: seller.stripe_account_id, expires_at: Math.floor(Date.now() / 1000) + 2100 };
      await client.query(`INSERT INTO checkout_reservations (project_id,purchase_request_id,generation,agreement_id,price_cents,fee_cents,currency,seller_account_id,expires_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [reservation.project_id, request.id, reservation.generation, agreement.id,
        reservation.price_cents, reservation.fee_cents, 'usd', reservation.seller_account_id, reservation.expires_at]);
    }
    if (reservation.agreement_id !== agreement.id) fail(409, 'This checkout is locked to its approved agreement.');
    if (Number(reservation.expires_at) < Math.floor(Date.now() / 1000) - 20 * 3600) fail(409, 'This checkout needs support review before retrying. No new payment has been started.');
    await client.query("UPDATE purchase_requests SET status='payment_processing',agreement_id=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$1", [request.id, agreement.id]);
    return { reservation };
  });
  if (context.session) return { url: context.session.url, sessionId: context.session.id, reused: true };
  const r = context.reservation;
  // All provider parameters are derived from the immutable reservation. A title,
  // email or deployment change cannot break idempotency after a timeout.
  const metadata = { purchase_request_id: String(r.purchase_request_id), project_id: String(r.project_id), agreement_id: r.agreement_id, checkout_token: r.generation };
  const session = await stripe.checkout.sessions.create({ mode: 'payment', payment_method_types: ['card'],
    line_items: [{ price_data: { currency: r.currency, product_data: { name: 'SideBuilds project purchase' }, unit_amount: r.price_cents }, quantity: 1 }],
    client_reference_id: String(r.purchase_request_id), metadata,
    expires_at: Number(r.expires_at),
    success_url: `${clientUrl}/purchase/success?purchase_request_id=${r.purchase_request_id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl}/purchase-agreement/${r.purchase_request_id}`,
    payment_intent_data: { transfer_group: `txn_${r.purchase_request_id}`, metadata }
  }, { idempotencyKey: `checkout_${r.generation}` });
  await db.withTransaction(async client => {
    await client.query("UPDATE checkout_reservations SET session_id=$2,state='open' WHERE generation=$1 AND state='creating'", [r.generation, session.id]);
    await client.query('UPDATE purchase_requests SET stripe_session_id=$2 WHERE id=$1 AND agreement_id=$3', [r.purchase_request_id, session.id, r.agreement_id]);
  });
  return { url: session.url, sessionId: session.id };
}

module.exports = { createCheckout };
