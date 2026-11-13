const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sidebuilds-connect-'));
Object.assign(process.env, { NODE_ENV: 'development', USE_SQLITE: 'true', SQLITE_DB_PATH: path.join(directory, 'test.db'),
  SEED_DEMO_DATA: 'false', DATABASE_URL: '', DB_LOG_QUERIES: 'false', CLIENT_URL: 'http://localhost:3009',
  JWT_SECRET: 'isolated-connect-only-test-secret-with-32-characters' });
const db = require('../db');
const connection = require('../services/sellerConnectionService');
const { launchReadiness } = require('../services/launchReadinessService');
const accounts = new Map(), creations = new Map();
let creates = 0, links = 0, timeout = false;
const ready = { charges_enabled: true, payouts_enabled: true, details_submitted: true, capabilities: { transfers: 'active' } };
const stripe = { accounts: {
  retrieve: async id => { if (id === 'acct_unavailable') throw new Error('Provider outage');
    if (!accounts.has(id)) throw Object.assign(new Error('Not in this environment'), { code: 'account_invalid' }); return accounts.get(id); },
  create: async (params, options) => { creates++; assert.ok(options.idempotencyKey.startsWith('seller_connect_'));
    const previous = creations.get(options.idempotencyKey);
    if (previous) { assert.deepEqual(params, previous.params); return { id: previous.id }; }
    const id = 'acct_fixture_' + randomUUID(); creations.set(options.idempotencyKey, { params, id }); accounts.set(id, {});
    if (timeout) { timeout = false; throw new Error('Timeout after account creation'); } return { id }; }
}, accountLinks: { create: async params => { links++; assert.ok(accounts.has(params.account)); return { url: 'https://connect.stripe.com/synthetic' }; } } };
const configPath = require.resolve('../config/stripe.config');
require.cache[configPath] = { id: configPath, filename: configPath, loaded: true,
  exports: { stripe, stripeConfigValid: true, stripeEnvironment: { valid: true, mode: 'test' } } };
const express = require('express'), app = express(); app.use(express.json());
app.use('/stripe', require('../routes/stripe'));
app.use('/webhooks', require('../routes/paymentOperations'));
const { signToken } = require('../utils/jwt');
let server, base;
before(async () => { await db.ready; server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${server.address().port}`; });
after(async () => { await new Promise(resolve => server.close(resolve)); await new Promise(resolve => db.db.close(resolve));
  assert.equal(path.dirname(directory), path.resolve(os.tmpdir())); assert.ok(path.basename(directory).startsWith('sidebuilds-connect-')); fs.rmSync(directory, { recursive: true, force: true }); });
async function user(account = null, admin = false) { const id = randomUUID(); await db.query(`INSERT INTO users(user_id,username,email,password_hash,stripe_account_id,is_admin,
  onboarding_complete,stripe_onboarding_complete,payout_enabled,stripe_charges_enabled,stripe_details_submitted) VALUES($1,$2,$3,'unusable-fixture',$4,$5,true,true,true,true,true)`,
  [id, 'qa_' + id, id + '@example.invalid', account, admin]); return id; }
const connect = userId => connection.createOnboardingLink({ db, stripe, userId, mode: 'test', clientUrl: process.env.CLIENT_URL });
async function request(route, userId, method = 'GET') { const res = await fetch(base + route, { method, headers: { Authorization: 'Bearer ' + signToken({ user: { user_id: userId } }), 'Content-Type': 'application/json' }, ...(method === 'POST' ? { body: '{}' } : {}) }); return { status: res.status, body: await res.json() }; }

test('pending, missing and inactive transfers never qualify as payment ready', () => {
  for (const transfers of ['pending', 'inactive', undefined]) assert.equal(connection.accountStatus('acct_x', { ...ready, capabilities: { transfers } }).isOnboardingComplete, false);
  assert.equal(connection.accountStatus('acct_x', ready).isOnboardingComplete, true);
});
test('fresh negative status replaces stale true flags in both onboarding columns', async () => {
  accounts.set('acct_pending', { ...ready, capabilities: { transfers: 'pending' } }); const id = await user('acct_pending');
  const status = await connection.userStatus(db, stripe, id); assert.equal(status.isOnboardingComplete, false);
  const row = (await db.query('SELECT * FROM users WHERE user_id=$1', [id])).rows[0]; assert.equal(row.onboarding_complete, 0); assert.equal(row.stripe_onboarding_complete, 0);
});
test('provider outage returns unverified without cached readiness or account replacement', async () => {
  const id = await user('acct_unavailable'), count = creates;
  const status = await connection.userStatus(db, stripe, id); assert.equal(status.verificationStatus, 'unavailable'); assert.equal(status.isOnboardingComplete, false);
  await assert.rejects(connect(id), { status: 503 }); assert.equal(creates, count);
  assert.equal((await db.query('SELECT onboarding_complete FROM users WHERE user_id=$1', [id])).rows[0].onboarding_complete, 1);
});
test('status GET never creates an account and the destructive reset stays retired', async () => {
  const id = await user(), count = creates; const status = await request('/stripe/check-onboarding-status', id);
  assert.equal(status.status, 200); assert.equal(status.body.verificationStatus, 'not_connected'); assert.equal(creates, count);
  assert.equal((await request('/stripe/reset-account', id, 'POST')).status, 409);
});
test('confirmed missing connection is replaced only by an explicit onboarding request', async () => {
  const id = await user('acct_old_test'), count = creates;
  assert.equal((await connection.userStatus(db, stripe, id)).requiresReconnect, true); assert.equal(creates, count);
  const response = await request('/stripe/create-account-link', id, 'POST'); assert.equal(response.status, 200); assert.match(response.body.url, /^https:\/\/connect.stripe.com\//);
  const row = (await db.query('SELECT * FROM users WHERE user_id=$1', [id])).rows[0]; assert.match(row.stripe_account_id, /^acct_fixture_/); assert.equal(row.onboarding_complete, 0);
  await connect(id); assert.equal(creates, count + 1);
});
test('a ready Express seller opens the hosted dashboard without creating another account', async () => {
  accounts.set('acct_express_ready', { ...ready, type: 'express' }); const id = await user('acct_express_ready'), count = creates, linkCount = links;
  stripe.accounts.createLoginLink = async accountId => { assert.equal(accountId, 'acct_express_ready'); return { url: 'https://connect.stripe.com/express/synthetic' }; };
  assert.equal((await connect(id)).url, 'https://connect.stripe.com/express/synthetic'); assert.equal(creates, count); assert.equal(links, linkCount);
});
test('a Standard seller manages the existing Stripe dashboard without an unsupported account link', async () => {
  accounts.set('acct_standard_ready', { ...ready, type: 'standard' }); const id = await user('acct_standard_ready'), count = creates, linkCount = links;
  assert.equal((await connect(id)).url, 'https://dashboard.stripe.com/'); assert.equal(creates, count); assert.equal(links, linkCount);
});
test('unfinished purchases block replacement and preserve the original payment destination', async () => {
  const id = await user('acct_bad_with_funds'), buyer = await user(), project = randomUUID(), count = creates;
  await db.query("INSERT INTO projects(project_id,owner_id,name) VALUES($1,$2,'Funds fixture')", [project, id]);
  await db.query("INSERT INTO project_transactions(transaction_id,project_id,seller_id,buyer_id,amount,seller_amount,commission_amount,status,escrow_status) VALUES($1,$2,$3,$4,10,9.5,0.5,'payment_completed','held')", [randomUUID(), project, id, buyer]);
  await assert.rejects(connect(id), { status: 409 }); assert.equal(creates, count); assert.equal((await db.query('SELECT stripe_account_id FROM users WHERE user_id=$1', [id])).rows[0].stripe_account_id, 'acct_bad_with_funds');
});
test('timeout retry uses the same durable attempt and identical provider parameters', async () => {
  const id = await user('acct_timeout'), count = creations.size; timeout = true; await assert.rejects(connect(id));
  assert.equal((await db.query('SELECT stripe_account_id FROM users WHERE user_id=$1', [id])).rows[0].stripe_account_id, 'acct_timeout');
  await connect(id); assert.equal(creations.size, count + 1);
});
test('an old unknown creation cannot retry past the provider idempotency window', async () => {
  const id = await user('acct_old_timeout'); timeout = true; await assert.rejects(connect(id)); const count = creates;
  await db.query('UPDATE stripe_connection_attempts SET started_at=$2 WHERE user_id=$1', [id, new Date(Date.now() - 24 * 3600000).toISOString()]);
  await assert.rejects(connect(id), { status: 409 }); assert.equal(creates, count);
});
test('launch checks are administrator-only and omit provider IDs, private emails and keys', async () => {
  assert.equal((await request('/webhooks/readiness', await user())).status, 403);
  const seller = await user('acct_pending'), project = randomUUID();
  await db.query("INSERT INTO projects(project_id,owner_id,name,is_public,is_for_sale,status) VALUES($1,$2,'Public readiness fixture',true,true,'active')", [project, seller]);
  const count = creates, linkCount = links;
  const result = await request('/webhooks/readiness', await user(null, true)); assert.equal(result.status, 200);
  assert.equal(result.body.listings[0].paymentStatus, 'onboarding_required'); assert.ok(result.body.listings[0].missingInformation.includes('Included assets'));
  assert.doesNotMatch(JSON.stringify(result.body), /acct_|@example|sk_test_|whsec_/); assert.equal(creates, count); assert.equal(links, linkCount);
});
test('a disabled provider cannot be reported ready by launch checks', async () => {
  const result = await launchReadiness({ db, stripe, configuration: { valid: false, mode: 'live' }, env: { STRIPE_MODE: 'live', LIVE_COMMERCE_ENABLED: 'true' }, emailConfigured: false });
  assert.equal(result.checkoutEnabled, false); assert.equal(result.listings[0].paymentStatus, 'unavailable');
});
