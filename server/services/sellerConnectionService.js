const { randomUUID } = require('node:crypto');
const { fail } = require('../utils/purchaseAgreement');

function accountStatus(accountId, account, verificationStatus = 'verified') {
  const verified = verificationStatus === 'verified';
  const ready = Boolean(verified && account?.charges_enabled && account?.payouts_enabled &&
    account?.details_submitted && account?.capabilities?.transfers === 'active' && !account?.deleted);
  return { accountId: accountId || null, hasAccount: Boolean(accountId), verificationStatus, accountType: verified ? account?.type || null : null,
    requiresReconnect: verificationStatus === 'reconnect_required', isOnboardingComplete: ready,
    areChargesEnabled: Boolean(verified && account?.charges_enabled),
    arePayoutsEnabled: Boolean(verified && account?.payouts_enabled),
    areDetailsSubmitted: Boolean(verified && account?.details_submitted),
    areTransfersEnabled: Boolean(verified && account?.capabilities?.transfers === 'active'),
    needsAttention: Boolean(accountId && !ready) };
}

async function readAccount(stripe, accountId) {
  if (!accountId) return accountStatus(null, null, 'not_connected');
  try {
    const account = await stripe.accounts.retrieve(accountId, {}, { timeout: 8000, maxNetworkRetries: 0 });
    return accountStatus(accountId, account, account.deleted ? 'reconnect_required' : 'verified');
  } catch (error) {
    // An unavailable provider is not evidence that an account can be replaced.
    const missing = ['account_invalid', 'resource_missing'].includes(error.code);
    return accountStatus(accountId, null, missing ? 'reconnect_required' : 'unavailable');
  }
}

async function userStatus(db, stripe, userId) {
  const user = (await db.query('SELECT stripe_account_id FROM users WHERE user_id=$1', [userId])).rows[0];
  if (!user) fail(404, 'User not found.');
  const status = await readAccount(stripe, user.stripe_account_id);
  if (['verified', 'reconnect_required'].includes(status.verificationStatus)) {
    await db.query(`UPDATE users SET onboarding_complete=$1,stripe_onboarding_complete=$1,payout_enabled=$2,
      stripe_charges_enabled=$3,stripe_details_submitted=$4 WHERE user_id=$5 AND stripe_account_id=$6`,
    [status.isOnboardingComplete, status.arePayoutsEnabled, status.areChargesEnabled, status.areDetailsSubmitted, userId, user.stripe_account_id]);
  }
  return status;
}

async function assertNoUnsettledSales(client, userId) {
  const unsettled = await client.query(`SELECT transaction_id FROM project_transactions WHERE seller_id=$1 AND NOT
    (COALESCE(status,'')='completed' AND COALESCE(escrow_status,'')='released' AND COALESCE(transfer_completed,false)=true OR
     COALESCE(status,'')='refunded' AND COALESCE(escrow_status,'')='refunded' AND
       (COALESCE(transfer_completed,false)=false OR reconciled_at IS NOT NULL)) LIMIT 1`, [userId]);
  const reservations = await client.query(`SELECT r.project_id FROM checkout_reservations r
    JOIN purchase_requests pr ON pr.id=r.purchase_request_id WHERE pr.seller_id=$1 AND
    (r.state<>'paid' OR NOT EXISTS (SELECT 1 FROM project_transactions t WHERE t.purchase_request_id=pr.id AND
      (t.status='completed' AND t.escrow_status='released' AND t.transfer_completed=true OR t.status='refunded' AND t.escrow_status='refunded'))) LIMIT 1`, [userId]);
  if (unsettled.rows.length || reservations.rows.length) fail(409, 'An unfinished purchase needs review before your Stripe connection can change. Contact support.');
}

async function createOnboardingLink({ db, stripe, userId, mode, clientUrl, type = 'account_onboarding' }) {
  if (!['account_onboarding', 'account_update'].includes(type)) fail(400, 'Invalid Stripe link type.');
  if (!clientUrl) fail(503, 'Stripe connection setup is temporarily unavailable.');
  const context = await db.withTransaction(async client => {
    const user = (await client.query('SELECT email,stripe_account_id FROM users WHERE user_id=$1 FOR UPDATE', [userId])).rows[0];
    if (!user) fail(404, 'User not found.');
    const status = await readAccount(stripe, user.stripe_account_id);
    if (status.verificationStatus === 'unavailable') fail(503, 'Stripe could not verify your connection. Try again shortly; your existing account has been kept.');
    if (status.verificationStatus === 'verified') return { accountId: user.stripe_account_id, ready: status.isOnboardingComplete, accountType: status.accountType };
    await assertNoUnsettledSales(client, userId);
    let attempt = (await client.query('SELECT * FROM stripe_connection_attempts WHERE user_id=$1', [userId])).rows[0];
    const previous = user.stripe_account_id || '';
    if (attempt && (attempt.previous_account_id !== previous || attempt.mode !== mode)) {
      // Never discard an unresolved provider outcome, even when the environment changed.
      if (!attempt.account_id) fail(409, 'A previous Stripe setup attempt needs support review before reconnecting.');
      attempt = null;
    }
    if (attempt && !attempt.account_id && Date.now() - new Date(attempt.started_at).getTime() >= 23 * 3600000)
      fail(409, 'An earlier Stripe setup has an unconfirmed result. Contact support before retrying.');
    if (!attempt) {
      attempt = { user_id: userId, previous_account_id: previous, mode, generation: randomUUID(), email: user.email,
        account_type: process.env.STRIPE_CONNECT_ACCOUNT_TYPE || 'express', started_at: new Date().toISOString() };
      await client.query(`INSERT INTO stripe_connection_attempts(user_id,previous_account_id,mode,generation,email,account_type,started_at)
        VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(user_id) DO UPDATE SET previous_account_id=$2,mode=$3,generation=$4,
        email=$5,account_type=$6,started_at=$7,account_id=NULL`,
      [userId, previous, mode, attempt.generation, attempt.email, attempt.account_type, attempt.started_at]);
    }
    return { attempt };
  });
  let accountId = context.accountId;
  if (!accountId) {
    const a = context.attempt;
    // Persist the attempt before contacting Stripe. Retries use identical parameters
    // across timeouts/restarts; old uncertain attempts never create another account.
    const account = a.account_id ? { id: a.account_id } : await stripe.accounts.create({
      type: a.account_type, country: 'US', email: a.email,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } }
    }, { idempotencyKey: `seller_connect_${a.generation}` });
    accountId = account.id;
    await db.withTransaction(async client => {
      const user = (await client.query('SELECT stripe_account_id FROM users WHERE user_id=$1 FOR UPDATE', [userId])).rows[0];
      if (!user || ![a.previous_account_id, accountId].includes(user.stripe_account_id || '')) fail(409, 'Your Stripe connection changed. Refresh settings before continuing.');
      await assertNoUnsettledSales(client, userId);
      await client.query(`UPDATE stripe_connection_attempts SET account_id=$2 WHERE user_id=$1 AND generation=$3`, [userId, accountId, a.generation]);
      await client.query(`UPDATE users SET stripe_account_id=$2,onboarding_complete=false,stripe_onboarding_complete=false,
        payout_enabled=false,stripe_charges_enabled=false,stripe_details_submitted=false WHERE user_id=$1`, [userId, accountId]);
    });
  }
  const origin = clientUrl.replace(/\/$/, '');
  const links = { account: accountId, refresh_url: `${origin}/profile-settings?stripe_refresh=true`,
    return_url: `${origin}/profile-settings?stripe_return=true`, type };
  // Express accounts manage an existing connection through their hosted dashboard.
  const link = context.accountType === 'standard' ? { url: 'https://dashboard.stripe.com/' } :
    context.ready && context.accountType === 'express' ? await stripe.accounts.createLoginLink(accountId) : await stripe.accountLinks.create(links);
  return { url: link.url, account_id: accountId };
}

function statusHandler(req, res) {
  const db = require('../db');
  const { stripe } = require('../config/stripe.config');
  res.set('Cache-Control', 'no-store');
  return userStatus(db, stripe, req.user.user_id).then(status => res.json(status))
    .catch(error => res.status(error.status || 503).json({ message: error.status ? error.message : 'Payment connection status is temporarily unavailable.' }));
}

async function onboardingHandler(req, res) {
  const { stripe, stripeEnvironment } = require('../config/stripe.config');
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await createOnboardingLink({ db: require('../db'), stripe, mode: stripeEnvironment.mode,
      userId: req.user.user_id, clientUrl: process.env.CLIENT_URL, type: req.body?.type }));
  } catch (error) {
    res.status(error.status || 503).json({ error: error.status ? error.message : 'Stripe setup could not be completed. Retry shortly; an unconfirmed attempt is kept for a safe retry.' });
  }
}

module.exports = { accountStatus, readAccount, userStatus, assertNoUnsettledSales, createOnboardingLink, statusHandler, onboardingHandler };
