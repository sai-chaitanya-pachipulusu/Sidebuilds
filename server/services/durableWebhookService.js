const db = require('../db');
const { randomUUID } = require('node:crypto');
const { assertStripeEventMode } = require('../utils/stripeSafety');
const { stripeEnvironment, stripe } = require('../config/stripe.config');
const handled = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'account.updated',
  'payment_intent.payment_failed', 'charge.refunded', 'charge.dispute.created', 'charge.dispute.updated', 'charge.dispute.closed']);
const id = object => typeof object === 'string' ? object : object?.id;

class WebhookService {
  async processWebhook(event) {
    assertStripeEventMode(event, stripeEnvironment);
    if (!handled.has(event.type)) return { success: true, message: 'Event type not handled' };
    // Claims and business writes commit together. Failure rolls back the claim;
    // HTTP 500 asks Stripe to retry. A crashed worker cannot suppress that retry.
    try { return await db.withTransaction(async client => {
      await client.query("INSERT INTO payment_event_claims(event_id,event_type) VALUES ($1,$2) ON CONFLICT(event_id) DO NOTHING", [event.id, event.type]);
      const claim = (await client.query('SELECT status FROM payment_event_claims WHERE event_id=$1 FOR UPDATE', [event.id])).rows[0];
      if (claim.status === 'completed') {
        await client.query('DELETE FROM payment_event_failures WHERE event_id=$1',[event.id]);
        return { success: true, duplicate: true };
      }
      const object = event.data.object;
      if (event.type.startsWith('checkout.session.')) await this.processCheckoutCompleted(object, client);
      else if (event.type === 'account.updated') await this.processAccountUpdated(object, client);
      else if (event.type === 'payment_intent.payment_failed') {
        // A failed attempt can later succeed. Keep the reservation and allow
        // retries through the same open Checkout session.
      } else await this.processPaymentBlock(object, event.type, client);
      await client.query("UPDATE payment_event_claims SET status='completed',completed_at=CURRENT_TIMESTAMP WHERE event_id=$1", [event.id]);
      await client.query('DELETE FROM payment_event_failures WHERE event_id=$1',[event.id]);
      return { success: true };
    }); } catch (error) {
      // Preserve an operational signal outside the rolled-back business write.
      // Store a code rather than provider payloads or private error contents.
      await db.query(`INSERT INTO payment_event_failures(event_id,event_type,error_code)
        SELECT $1,$2,$3 WHERE NOT EXISTS(SELECT 1 FROM payment_event_claims WHERE event_id=$1 AND status='completed')
        ON CONFLICT(event_id) DO UPDATE SET attempts=payment_event_failures.attempts+1,error_code=$3,updated_at=CURRENT_TIMESTAMP`,
        [event.id,event.type,error.code || 'PROCESSING_FAILED']).catch(()=>{});
      throw error;
    }
  }

  async processCheckoutCompleted(session, client) {
    if (session.payment_status !== 'paid') return;
    const requestId = session.metadata?.purchase_request_id || session.client_reference_id;
    const pointer = (await client.query('SELECT project_id FROM purchase_requests WHERE id=$1', [requestId])).rows[0];
    if (!pointer) throw new Error('Payment has no known purchase request');
    const project = (await client.query('SELECT * FROM projects WHERE project_id=$1 FOR UPDATE', [pointer.project_id])).rows[0];
    const request = (await client.query('SELECT * FROM purchase_requests WHERE id=$1 FOR UPDATE', [requestId])).rows[0];
    const prior = (await client.query('SELECT * FROM project_transactions WHERE stripe_session_id=$1', [session.id])).rows[0];
    if (prior) {
      if (prior.stripe_payment_intent_id !== id(session.payment_intent)) throw new Error('Payment identity mismatch');
      return;
    }
    const reservation = (await client.query('SELECT * FROM checkout_reservations WHERE project_id=$1', [project.project_id])).rows[0];
    if (!reservation || reservation.purchase_request_id !== request.id || reservation.generation !== session.metadata?.checkout_token ||
      reservation.agreement_id !== session.metadata?.agreement_id || (reservation.session_id && reservation.session_id !== session.id) ||
      project.owner_id !== request.seller_id || project.is_on_hold || !project.is_for_sale) throw new Error('Paid checkout requires reconciliation: reservation or ownership mismatch');
    const intent = await stripe.paymentIntents.retrieve(id(session.payment_intent), { expand: ['latest_charge'] });
    const charge = intent.latest_charge;
    if (!charge || typeof charge !== 'object' || intent.status !== 'succeeded' || !charge.paid || charge.amount !== reservation.price_cents ||
      session.amount_total !== reservation.price_cents || session.currency !== reservation.currency || charge.currency !== reservation.currency ||
      intent.amount_received !== reservation.price_cents || intent.metadata?.checkout_token !== reservation.generation) throw new Error('Paid checkout amount, currency or provider identity mismatch');
    const blocked = (await client.query('SELECT payment_id FROM payment_blocks WHERE payment_id=$1', [charge.id])).rows.length > 0 || charge.refunded || charge.amount_refunded > 0 || charge.disputed;
    const fullyRefunded=charge.refunded || charge.amount_refunded>=charge.amount;
    await client.query(`INSERT INTO project_transactions (transaction_id,project_id,buyer_id,seller_id,purchase_request_id,amount,commission_amount,seller_amount,
      currency,seller_stripe_account_id,status,escrow_released,escrow_status,payment_method,payment_id,stripe_payment_intent_id,stripe_session_id,refunded_amount)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,$12,'card',$13,$14,$15,$16)`,
      [randomUUID(), project.project_id, request.buyer_id, request.seller_id, request.id, reservation.price_cents/100,
        reservation.fee_cents/100, (reservation.price_cents-reservation.fee_cents)/100, reservation.currency, reservation.seller_account_id,
        fullyRefunded?'refunded':'payment_completed', fullyRefunded?'refunded':blocked ? 'disputed' : 'held', charge.id, intent.id, session.id,Number(charge.amount_refunded||0)/100]);
    await client.query("UPDATE checkout_reservations SET state='paid',session_id=$2 WHERE project_id=$1", [project.project_id, session.id]);
    await client.query("UPDATE purchase_requests SET status='payment_completed_pending_transfer',stripe_session_id=$2,stripe_payment_intent_id=$3,updated_at=CURRENT_TIMESTAMP WHERE id=$1", [request.id, session.id, intent.id]);
    await client.query('UPDATE projects SET is_on_hold=true,updated_at=CURRENT_TIMESTAMP WHERE project_id=$1', [project.project_id]);
    if(fullyRefunded){
      await client.query("UPDATE purchase_requests SET status='payment_refunded' WHERE id=$1",[request.id]);
      await client.query('DELETE FROM checkout_reservations WHERE project_id=$1',[project.project_id]);
    }
    await client.query(`UPDATE purchase_requests SET status='aborted_project_unavailable',updated_at=CURRENT_TIMESTAMP
      WHERE project_id=$1 AND id!=$2 AND status IN ('interest_expressed','seller_terms_proposed','seller_accepted_pending_payment','agreement_reached_pending_payment')`, [project.project_id, request.id]);
    // Durable in-app notifications commit with the payment. Email cannot send a
    // confirmation before commit, or roll back an otherwise verified charge.
    for (const user of [request.buyer_id, request.seller_id]) {
      const message = fullyRefunded ? 'Stripe recorded a full refund. Receipt confirmation is unavailable.' : blocked ? 'Payment received; this purchase needs issue review before release.' : 'Payment confirmed. Continue the agreed handover before confirming receipt.';
      await client.query(`INSERT INTO notifications (${db.dialect === 'sqlite' ? '' : 'notification_id,'}user_id,type,title,message,action_url,is_read)
        VALUES (${db.dialect === 'sqlite' ? '' : '$4,'}$1,'${fullyRefunded?'PAYMENT_REFUNDED':'PAYMENT_CONFIRMED'}','${fullyRefunded?'Payment refunded':'Payment confirmed'}',$2,$3,false)`,
        db.dialect === 'sqlite' ? [user,message,`/purchase-agreement/${request.id}`] : [user,message,`/purchase-agreement/${request.id}`,randomUUID()]);
    }
  }

  async processAccountUpdated(account, client) {
    await client.query(`UPDATE users SET onboarding_complete=$1,stripe_onboarding_complete=$1,payout_enabled=$2,
      stripe_charges_enabled=$3,stripe_details_submitted=$4 WHERE stripe_account_id=$5`,
      [Boolean(account.charges_enabled && account.payouts_enabled && account.details_submitted), Boolean(account.payouts_enabled),
        Boolean(account.charges_enabled), Boolean(account.details_submitted), account.id]);
  }

  async processPaymentBlock(object, type, client) {
    // Read current provider state, so an older partial-refund event cannot undo
    // a full refund already recorded by a newer event.
    const charge = await stripe.charges.retrieve(type === 'charge.refunded' ? object.id : id(object.charge));
    const intent = await stripe.paymentIntents.retrieve(id(charge.payment_intent));
    const requestId = intent.metadata?.purchase_request_id;
    if (!requestId) return;
    const pointer = (await client.query('SELECT project_id FROM purchase_requests WHERE id=$1', [requestId])).rows[0];
    if (!pointer) throw new Error('Provider issue references an unknown purchase');
    await client.query('SELECT project_id FROM projects WHERE project_id=$1 FOR UPDATE', [pointer.project_id]);
    await client.query('INSERT INTO payment_blocks(payment_id,reason) VALUES ($1,$2) ON CONFLICT(payment_id) DO NOTHING', [charge.id, type]);
    if(type==='charge.refunded'){
      const totalRefund=Number(charge.amount_refunded||0)/100;
      const full=charge.refunded || charge.amount_refunded>=charge.amount;
      await client.query(`UPDATE project_transactions SET refunded_amount=$2,
        status=CASE WHEN $3 THEN CASE WHEN transfer_completed=true THEN 'refund_review' ELSE 'refunded' END ELSE status END,
        escrow_status=CASE WHEN $3 THEN 'refunded' ELSE 'disputed' END,dispute_reason=$4,dispute_reported_at=CURRENT_TIMESTAMP WHERE payment_id=$1`,[charge.id,totalRefund,Boolean(full),type]);
      if(full){
        const transaction=(await client.query('SELECT purchase_request_id FROM project_transactions WHERE payment_id=$1',[charge.id])).rows[0];
        if(transaction){
          await client.query("UPDATE purchase_requests SET status='payment_refunded',updated_at=CURRENT_TIMESTAMP WHERE id=$1",[transaction.purchase_request_id]);
          await client.query('DELETE FROM checkout_reservations WHERE purchase_request_id=$1',[transaction.purchase_request_id]);
        }
      }
      return;
    }
    // Closed disputes still need reconciliation. Never reopen payouts
    // automatically following a refund, chargeback or prior transfer.
    await client.query(`UPDATE project_transactions SET escrow_status=CASE WHEN refunded_amount>=amount THEN 'refunded' ELSE 'disputed' END,dispute_reason=$2,
      dispute_reported_at=CURRENT_TIMESTAMP,provider_dispute_id=$3 WHERE payment_id=$1`, [charge.id, type, type === 'charge.refunded' ? null : object.id]);
  }

  async ensureEventsTableExists() { /* Schema is migrated before deployment. */ }
  async getHealthStatus() {
    const { rows } = await db.query('SELECT COUNT(*) AS count FROM payment_event_failures');
    return { healthy: Number(rows[0].count) === 0, failed_events: Number(rows[0].count), retries: 'Stripe redelivery on HTTP 500' };
  }
}
module.exports = new WebhookService();
