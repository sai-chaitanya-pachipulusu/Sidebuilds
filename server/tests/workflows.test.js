const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

// Never connect to production or reuse a developer database from a test.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sidebuilds-workflows-'));
Object.assign(process.env, { NODE_ENV: 'development', USE_SQLITE: 'true',
  SQLITE_DB_PATH: path.join(directory, 'test.db'), SEED_DEMO_DATA: 'false',
  JWT_SECRET: 'workflow-tests-only-secret-with-32-characters', DB_LOG_QUERIES: 'false',
  UPLOAD_DIR: path.join(directory, 'uploads'), OPENAI_API_KEY: '', DATABASE_URL: '', CLIENT_URL: 'http://localhost:3009',
  STRIPE_SECRET_KEY: 'sk_test_workflow_fixture', STRIPE_PUBLISHABLE_KEY: 'pk_test_workflow_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_workflow_fixture',
  STRIPE_MODE: 'test', FEATURE_STRIPE_PAYMENTS: 'true', STRIPE_STARTUP_CHECK: 'false' });
const db = require('../db');
const express = require('express');
const { signToken } = require('../utils/jwt');
const stripeCalls = [];
const fakeStripe = { checkout: { sessions: {
  create: async (data, options) => { stripeCalls.push({ data, options }); return { id: 'cs_test_fixture_'+randomUUID(), url: 'https://checkout.stripe.com/test-fixture' }; },
  retrieve: async () => ({ id: 'cs_test_fixture', url: 'https://checkout.stripe.com/test-fixture', status: 'open' })
} } };
fakeStripe.accounts = { retrieve: async () => ({charges_enabled:true,payouts_enabled:true,details_submitted:true,capabilities:{transfers:'active'}}) };
const fixtureCharges = new Map();
fakeStripe.charges = { retrieve: async id => fixtureCharges.get(id) };
// Replace the provider only inside this isolated test process. No financial network calls.
const transferCalls = [];
const providerTransfers = new Map();
fakeStripe.transfers = { create: async (data, options) => {
  transferCalls.push({ data, options });
  if (!providerTransfers.has(options.idempotencyKey)) providerTransfers.set(options.idempotencyKey, { id: `tr_test_${providerTransfers.size}` });
  return providerTransfers.get(options.idempotencyKey);
} };
require.cache[require.resolve('stripe')] = { id: require.resolve('stripe'), filename: require.resolve('stripe'), loaded: true, exports: () => fakeStripe };
const app = express();
app.use(express.json());
for (const [prefix, moduleName] of Object.entries({ auth: 'auth', users: 'users', projects: 'projects',
  public: 'public', saves: 'saves', follows: 'follows', questions: 'questions', reviews: 'reviews',
  dashboard: 'dashboard', notifications: 'notifications', 'purchase-requests': 'purchaseRequests' })) {
  app.use(`/api/${prefix}`, require(`../routes/${moduleName}`));
}
app.use('/api/purchase-requests/:requestId/messages', require('../routes/purchaseRequestMessages'));
app.use('/api/payments', require('../routes/payments').router);
app.use('/api/files', require('../routes/files'));
app.use('/api/ai', require('../routes/ai'));
beforeEach(() => require('../middleware/rateLimiting').authLimiter.resetKey('127.0.0.1'));
let server, base, seller, buyer, outsider;
const password = 'Synthetic-test-password-2026!';
async function request(method, route, token, body) {
  const response = await fetch(`${base}/api${route}`, { method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(5000) });
  return { status: response.status, body: await response.json() };
}
const expectStatus = (result, status) => assert.equal(result.status, status, JSON.stringify(result.body));
async function createProject(overrides = {}) {
  const result = await request('POST', '/projects', seller.token, {
    name: 'QA private project', description: 'Synthetic workflow fixture', stage: 'mvp',
    is_public: false, is_for_sale: false, ...overrides
  });
  expectStatus(result, 201);
  return result.body;
}
async function saleProject() {
  const project = await createProject({ is_public: true });
  // Simulate an onboarded seller in the disposable DB; never call Stripe.
  await db.query("UPDATE projects SET is_for_sale=true, sale_price=500,contact_email='seller@example.invalid' WHERE project_id=$1", [project.project_id]);
  await db.query("UPDATE users SET stripe_account_id='acct_test_fixture' WHERE user_id=$1", [seller.user.user_id]);
  return project;
}
const agreementScope = (overrides = {}) => ({ price_cents: 50000, included_items: ['Source code', 'Deployment guide'],
  exclusions: 'Domain and customer data are excluded.', running_costs: 'Buyer pays $12/month hosting.',
  handover_steps: 'Repository access and guide within two days.', support_terms: 'Seven days of setup help.', ...overrides });
async function approveScope(requestId, overrides = {}) {
  const published = await request('POST', `/purchase-requests/${requestId}/agreement`, seller.token, agreementScope({ base_version: 0, ...overrides }));
  expectStatus(published, 201);
  const approved = await request('POST', `/purchase-requests/${requestId}/agreement/approve`, buyer.token,
    { agreement_id: published.body.agreement.id, acknowledged: true });
  expectStatus(approved, 200);
  return approved.body.agreement;
}
before(async () => {
  await db.ready;
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  for (const role of ['seller', 'buyer']) {
    const result = await request('POST', '/auth/register', null, { username: `qa_${role}`, email: `${role}@example.com`, password });
    expectStatus(result, 201);
    assert.equal(result.body.user.password_hash, undefined);
    if (role === 'seller') seller = result.body;
    else buyer = result.body;
  }
  const outsiderId = randomUUID();
  await db.query('INSERT INTO users (user_id,username,email,password_hash) VALUES ($1,$2,$3,$4)',
    [outsiderId, 'outsider', 'outsider@example.com', 'unusable-fixture-hash']);
  outsider = { token: signToken({ user: { user_id: outsiderId } }) };
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await new Promise((resolve, reject) => db.db.close(error => error ? reject(error) : resolve()));
  assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
  assert.ok(path.basename(directory).startsWith('sidebuilds-workflows-'));
  fs.rmSync(directory, { recursive: true, force: true });
});

test('registration normalizes email and login returns no password hash', async () => {
  const result = await request('POST', '/auth/login', null, { email: ' SELLER@EXAMPLE.COM ', password });
  expectStatus(result, 200);
  assert.equal(result.body.user.user_id, seller.user.user_id);
  assert.equal(result.body.user.password_hash, undefined);
  expectStatus(await request('POST', '/auth/register', null, { email: ' SELLER@EXAMPLE.COM ', password }), 409);
});
test('profile edits persist and cannot elevate the user to admin', async () => {
  expectStatus(await request('PUT', '/users/profile', buyer.token, { bio: 'QA buyer', is_admin: true }), 200);
  const profile = await request('GET', '/users/profile', buyer.token);
  expectStatus(profile, 200);
  assert.equal(profile.body.bio, 'QA buyer');
  assert.equal(Boolean(profile.body.is_admin), false);
  assert.equal(profile.body.password_hash, undefined);
});
test('all signed-in landing APIs and trending load against a fresh database', async () => {
  for (const route of ['/projects', '/users/projects', '/users/dashboard-stats', '/users/stripe-status',
    '/purchase-requests/buyer', '/purchase-requests/seller', '/follows/following', '/saves/ids',
    '/projects/check-stripe-account', '/public/trending']) {
    const result = await request('GET', route, buyer.token);
    assert.equal(result.status, 200, `${route}: ${JSON.stringify(result.body)}`);
  }
});
test('private projects stay private and only the owner can edit or delete', async () => {
  const p = await createProject();
  expectStatus(await request('GET', `/projects/${p.project_id}`, buyer.token), 404);
  expectStatus(await request('GET', `/public/projects/${p.project_id}`), 404);
  expectStatus(await request('PUT', `/projects/${p.project_id}`, buyer.token, { name: 'stolen' }), 403);
  expectStatus(await request('DELETE', `/projects/${p.project_id}`, buyer.token), 403);
  expectStatus(await request('PUT', `/projects/${p.project_id}`, seller.token, { name: 'Updated QA project' }), 200);
  const current = await request('GET', `/projects/${p.project_id}`, seller.token);
  assert.equal(current.body.name, 'Updated QA project');
  expectStatus(await request('DELETE', `/projects/${p.project_id}`, seller.token), 200);
});

test('an early-stage private draft can keep repository evidence without payment onboarding', async () => {
  const p = await createProject({ stage: 'idea', github_url: 'https://github.com/example/prototype', demo_url: 'https://example.com', monthly_revenue: 0 });
  assert.equal(p.github_url, 'https://github.com/example/prototype');
  assert.equal(Boolean(p.is_public), false);
  assert.equal(Boolean(p.is_for_sale), false);
  expectStatus(await request('GET', `/public/projects/${p.project_id}`), 404);
});

test('listing metadata survives creation, public reads, partial edits and explicit clearing', async () => {
  const p = await createProject({ is_public: true, category: 'productivity', subcategory: 'planning',
    tags: 'react, saas, React', tech_stack: ['React', 'Node.js'], stage_details: { must_have_features: ['Search', 'Export'] } });
  assert.deepEqual(p.tags, ['react', 'saas']);
  const read = await request('GET', `/public/projects/${p.project_id}`);
  assert.equal(Boolean(read.body.is_public), true, 'Public details must include visibility for editing and report eligibility');
  assert.equal(read.body.category, 'productivity');
  assert.equal(read.body.subcategory, 'planning');
  assert.deepEqual(read.body.stage_details, { must_have_features: ['Search', 'Export'] });
  assert.deepEqual(read.body.tech_stack, ['React', 'Node.js']);
  expectStatus(await request('PUT', `/projects/${p.project_id}`, seller.token, { description: 'Only the description changes' }), 200);
  assert.deepEqual((await request('GET', `/projects/${p.project_id}`, seller.token)).body.tags, ['react', 'saas']);
  expectStatus(await request('PUT', `/projects/${p.project_id}`, seller.token, { category: 'analytics', tags: [], stage_details: {} }), 200);
  const cleared = await request('GET', `/projects/${p.project_id}`, seller.token);
  assert.equal(cleared.body.category, 'analytics');
  assert.deepEqual(cleared.body.tags, []);
  assert.deepEqual(cleared.body.stage_details, {});
});

test('buyer brief persists for public listings and becomes inaccessible with project privacy', async () => {
  const brief = { included_assets: 'Code and documentation', running_costs: '$12/month hosting', setup_handoff: 'Create hosting account, deploy, one week of support.' };
  const p = await createProject({ is_public: true, stage_details: brief });
  assert.deepEqual((await request('GET', `/public/projects/${p.project_id}`)).body.stage_details, brief);
  expectStatus(await request('PUT', `/projects/${p.project_id}`, seller.token, { is_public: false }), 200);
  expectStatus(await request('GET', `/public/projects/${p.project_id}`), 404);
  assert.deepEqual((await request('GET', `/projects/${p.project_id}`, seller.token)).body.stage_details, brief);
});

test('invalid listing metadata is rejected without overwriting the stored project', async () => {
  const p = await createProject({ category: 'education', stage_details: { problem: 'Learning' } });
  for (const invalid of [{ category: [] }, { tags: [4] }, { stage: 'unknown' },
    { stage_details: [] }, { stage_details: { problem: 'x'.repeat(2001) } }]) {
    expectStatus(await request('PUT', `/projects/${p.project_id}`, seller.token, invalid), 400);
    expectStatus(await request('POST', '/projects', seller.token, { name: 'Rejected', stage: 'mvp', ...invalid }), 400);
  }
  const stored = await request('GET', `/projects/${p.project_id}`, seller.token);
  assert.equal(stored.body.category, 'education');
  assert.deepEqual(stored.body.stage_details, { problem: 'Learning' });
});
test('marketplace pagination accepts hostile bounds without database errors', async () => {
  for (const route of ['/public/projects', '/public/marketplace']) {
    const result = await request('GET', `${route}?page=-2&limit=-3`);
    expectStatus(result, 200);
    assert.equal(result.body.pagination.page, 1);
    assert.ok(result.body.pagination.limit > 0);
  }
});

test('marketplace filters match the full inventory and return consistent totals and pages', async () => {
  const ids = [];
  for (let index = 0; index < 24; index++) {
    const id = randomUUID();
    ids.push(id);
    await db.query(`INSERT INTO projects (project_id,owner_id,name,stage,is_public,is_for_sale,sale_price,category,tech_stack,tags,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [id, seller.user.user_id,
      index < 2 ? `Atlasneedle ${index}` : `Unrelated fixture ${index}`, 'mvp', true, true,
      index === 0 ? 10.25 : 20.50, index < 2 ? 'analytics' : 'education',
      JSON.stringify(index < 2 ? ['React', 'Node.js'] : ['Vue']), '[]', `2024-01-${String(index + 1).padStart(2, '0')} 12:00:00`]);
  }
  const firstPage = await request('GET', '/public/marketplace?limit=20');
  assert.ok(!firstPage.body.data.some(p => p.project_id === ids[0]));
  const filter = '/public/marketplace?q=Atlasneedle&category=analytics&stage=mvp&techStack=react,node.js&minPrice=10.25&maxPrice=20.50&limit=1';
  const first = await request('GET', filter);
  const second = await request('GET', `${filter}&page=2`);
  expectStatus(first, 200);
  assert.deepEqual(first.body.pagination, { page: 1, limit: 1, total: 2, totalPages: 2, hasMore: true });
  assert.equal(first.body.data[0].project_id, ids[1]);
  assert.equal(Boolean(first.body.data[0].is_for_sale), true);
  assert.deepEqual(first.body.data[0].tech_stack, ['React', 'Node.js']);
  assert.equal(second.body.data[0].project_id, ids[0]);
  assert.equal(second.body.pagination.hasMore, false);
  const exact = await request('GET', '/public/marketplace?q=Atlasneedle&minPrice=10.25&maxPrice=10.25');
  assert.equal(exact.body.pagination.total, 1);
  assert.equal(exact.body.data[0].project_id, ids[0]);
  const ascending = await request('GET', '/public/marketplace?q=Atlasneedle&sortBy=sale_price&sortOrder=asc');
  assert.deepEqual(ascending.body.data.map(p => p.project_id), [ids[0], ids[1]]);
  await db.query('UPDATE projects SET is_public=false WHERE project_id=$1', [ids[0]]);
  assert.equal((await request('GET', filter)).body.pagination.total, 1);
  for (const id of ids) await db.query('DELETE FROM projects WHERE project_id=$1', [id]);
});

test('marketplace search treats SQL wildcards literally and rejects invalid filters', async () => {
  const p = await saleProject();
  await db.query('UPDATE projects SET name=$1 WHERE project_id=$2', ['100%_Coverage', p.project_id]);
  const literal = await request('GET', '/public/marketplace?q=%25_');
  assert.equal(literal.body.pagination.total, 1);
  assert.equal(literal.body.data[0].project_id, p.project_id);
  const injection = await request('GET', `/public/marketplace?q=${encodeURIComponent("' OR 1=1 --")}`);
  assert.equal(injection.body.pagination.total, 0);
  for (const query of ['minPrice=10&maxPrice=2', 'minPrice=NaN', 'maxPrice=-1', 'stage=unknown', 'q[]=bad']) {
    expectStatus(await request('GET', `/public/marketplace?${query}`), 400);
  }
});
test('saved projects are idempotent and scoped to the signed-in buyer', async () => {
  const p = await createProject({ is_public: true });
  expectStatus(await request('POST', `/saves/${p.project_id}`, buyer.token), 201);
  expectStatus(await request('POST', `/saves/${p.project_id}`, buyer.token), 201);
  const own = await request('GET', '/saves', buyer.token);
  assert.equal(own.body.filter(row => row.project_id === p.project_id).length, 1);
  assert.equal((await request('GET', '/saves', outsider.token)).body.length, 0);
  expectStatus(await request('DELETE', `/saves/${p.project_id}`, buyer.token), 200);
});
test('following persists, rejects self-follow, and creates one notification on retry', async () => {
  const id = seller.user.user_id;
  expectStatus(await request('POST', `/follows/${id}`, seller.token), 400);
  expectStatus(await request('POST', `/follows/${id}`, buyer.token), 201);
  expectStatus(await request('POST', `/follows/${id}`, buyer.token), 201);
  const result = await request('GET', `/follows/status/${id}`, buyer.token);
  expectStatus(result, 200);
  assert.equal(result.body.follower_count, 1);
  const notifications = await db.query("SELECT COUNT(*) AS total FROM notifications WHERE user_id=$1 AND type='new_follower'", [id]);
  assert.equal(notifications.rows[0].total, 1);
  expectStatus(await request('DELETE', `/follows/${id}`, buyer.token), 200);
});
test('public questions support seller answers and reject answers from other buyers', async () => {
  const p = await createProject({ is_public: true });
  const question = await request('POST', `/questions/project/${p.project_id}`, buyer.token, { question: 'Does this include the source code?' });
  expectStatus(question, 201);
  expectStatus(await request('POST', `/questions/${question.body.question_id}/answer`, outsider.token, { answer: 'No' }), 403);
  expectStatus(await request('POST', `/questions/${question.body.question_id}/answer`, seller.token, { answer: 'Yes, with deployment instructions.' }), 200);
  const result = await request('GET', `/questions/project/${p.project_id}`);
  expectStatus(result, 200);
  assert.equal(result.body[0].answer, 'Yes, with deployment instructions.');
});
test('purchase interest rejects duplicates and hides conversations from outsiders', async () => {
  const p = await saleProject();
  const route = `/purchase-requests/projects/${p.project_id}/request`;
  const result = await request('POST', route, buyer.token, { buyer_intro_message: 'QA synthetic purchase interest.' });
  expectStatus(result, 201);
  expectStatus(await request('POST', route, buyer.token, {}), 409);
  const messages = `/purchase-requests/${result.body.id}/messages`;
  expectStatus(await request('GET', messages, outsider.token), 403);
  expectStatus(await request('POST', messages, buyer.token, { content: 'Can you share deployment instructions?' }), 201);
  const conversation = await request('GET', messages, seller.token);
  expectStatus(conversation, 200);
  assert.ok(conversation.body.messages.some(m => m.content === 'Can you share deployment instructions?'));
  expectStatus(await request('PUT', `/purchase-requests/${result.body.id}/buyer-accepts-terms`, buyer.token, {}), 400);
  expectStatus(await request('PUT', `/purchase-requests/${result.body.id}/seller-propose-terms`, seller.token,
    { seller_proposal_message: 'Source code and documentation included.' }), 200);
  expectStatus(await request('PUT', `/purchase-requests/${result.body.id}/buyer-accepts-terms`, buyer.token, {}), 200);
  const agreed = await db.query('SELECT price,status FROM purchase_requests WHERE id=$1', [result.body.id]);
  assert.equal(agreed.rows[0].price, 500);
  assert.equal(agreed.rows[0].status, 'agreement_reached_pending_payment');
});

test('public questions disappear when a project becomes private', async () => {
  const project = await createProject({ is_public: true });
  const route = `/questions/project/${project.project_id}`;
  expectStatus(await request('POST', route, buyer.token, { question: 'Is the source included?' }), 201);
  assert.equal((await request('GET', route)).body.length, 1);
  expectStatus(await request('PUT', `/projects/${project.project_id}`, seller.token, { is_public: false }), 200);
  assert.deepEqual((await request('GET', route)).body, []);
  expectStatus(await request('POST', route, buyer.token, { question: 'Can anyone still see this?' }), 404);
});

test('hiding a sale listing revokes previously read public details and lists immediately', async () => {
  const project = await saleProject();
  const detail = `/public/projects/${project.project_id}`;
  const lists = ['/public/projects?limit=100', '/public/marketplace?limit=100', '/public/trending?limit=100'];
  expectStatus(await request('GET', detail), 200);
  for (const route of lists) {
    const result = await request('GET', route);
    expectStatus(result, 200);
    assert.ok(result.body.data.some(row => row.project_id === project.project_id), route);
  }
  expectStatus(await request('PUT', `/projects/${project.project_id}`, seller.token, { is_public: false }), 200);
  expectStatus(await request('GET', detail), 404);
  expectStatus(await request('GET', `/projects/${project.project_id}`, buyer.token), 404);
  for (const route of lists) {
    const result = await request('GET', route);
    expectStatus(result, 200);
    const rows = Array.isArray(result.body) ? result.body : result.body.data || result.body.projects;
    assert.ok(Array.isArray(rows), route);
    assert.ok(!rows.some(row => row.project_id === project.project_id), route);
  }
  expectStatus(await request('PUT', `/projects/${project.project_id}`, seller.token, { is_public: true }), 200);
  expectStatus(await request('GET', detail), 200);
  expectStatus(await request('DELETE', `/projects/${project.project_id}`, seller.token), 200);
  expectStatus(await request('GET', detail), 404);
});
test('non-buyers cannot create verified reviews', async () => {
  const p = await createProject({ is_public: true });
  expectStatus(await request('POST', '/reviews', buyer.token, { project_id: p.project_id, rating: 5, comment: 'Unverified' }), 403);
  expectStatus(await request('GET', `/reviews/seller/${seller.user.user_id}`), 200);
  await db.query('INSERT INTO purchase_requests (project_id,buyer_id,seller_id,status,price) VALUES ($1,$2,$3,$4,$5)',
    [p.project_id, buyer.user.user_id, seller.user.user_id, 'transfer_completed_buyer_confirmed', 125]);
  expectStatus(await request('POST', '/reviews', buyer.token, { project_id:p.project_id,rating:4,comment:'A request status alone is insufficient.' }),403);
  await db.query("INSERT INTO project_transactions(transaction_id,project_id,buyer_id,seller_id,amount,status,escrow_released,transfer_completed,escrow_status) VALUES ($1,$2,$3,$4,125,'completed',true,true,'released')", [randomUUID(),p.project_id,buyer.user.user_id,seller.user.user_id]);
  const review = await request('POST', '/reviews', buyer.token, { project_id: p.project_id, rating: 4, comment: 'QA completed purchase.' });
  expectStatus(review, 201);
  assert.equal(Boolean(review.body.is_verified_purchase), true);
  expectStatus(await request('POST', '/reviews', buyer.token, { project_id: p.project_id, rating: 5 }), 409);
});
test('dashboard counts come from stored projects and notifications', async () => {
  const result = await request('GET', '/dashboard', seller.token);
  expectStatus(result, 200);
  const count = await db.query('SELECT COUNT(*) AS total FROM projects WHERE owner_id=$1', [seller.user.user_id]);
  assert.equal(result.body.stats.totalProjects, count.rows[0].total);
  expectStatus(await request('GET', '/notifications', seller.token), 200);
});
test('marketplace statistics and public profiles load without private account fields', async () => {
  const stats = await request('GET', '/public/stats/marketplace');
  expectStatus(stats, 200);
  assert.equal(Number(stats.body.total_value), 125);
  const analytics = await request('GET', '/public/marketplace/analytics');
  expectStatus(analytics, 200);
  assert.equal(analytics.body.totalVolume, 125);
  const profile = await request('GET', `/users/${seller.user.user_id}/profile`);
  expectStatus(profile, 200);
  assert.equal(profile.body.email, undefined);
  assert.equal(profile.body.password_hash, undefined);
});

test('password reset tokens are single use and update the stored credential', async (t) => {
  let resetToken;
  const emailService = require('../services/emailService');
  t.mock.method(emailService, 'sendCustomEmail', async (_to, _subject, text) => {
    resetToken = text.match(/token=([a-f0-9]+)/)[1];
  });
  expectStatus(await request('POST', '/auth/forgot-password', null, { email: 'buyer@example.com' }), 200);
  assert.ok(resetToken);
  const checked = await request('POST', '/auth/reset-password/validate', null, { token: resetToken });
  expectStatus(checked, 200); assert.deepEqual(checked.body, { valid: true });
  expectStatus(await request('POST', '/auth/reset-password/validate', null, { token: resetToken }), 200);
  const changed = 'New-isolated-QA-password!';
  expectStatus(await request('POST', '/auth/reset-password', null, { token: resetToken, password: changed }), 200);
  expectStatus(await request('POST', '/auth/reset-password', null, { token: resetToken, password: changed }), 400);
  expectStatus(await request('POST', '/auth/reset-password/validate', null, { token: resetToken }), 400);
  expectStatus(await request('POST', '/auth/login', null, { email: 'buyer@example.com', password: changed }), 200);
});
test('reset preflight rejects unknown, malformed and expired links without consuming them', async () => {
  const token = require('crypto').randomBytes(32).toString('hex');
  expectStatus(await request('POST', '/auth/reset-password/validate', null, { token }), 400);
  expectStatus(await request('POST', '/auth/reset-password/validate', null, { token: ['invalid'] }), 400);
  const hash = require('crypto').createHash('sha256').update(token).digest('hex');
  await db.query('INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,$3)', [buyer.user.user_id, hash, new Date(Date.now() - 60000).toISOString()]);
  const result = await request('POST', '/auth/reset-password/validate', null, { token });
  expectStatus(result, 400); assert.equal(result.body.code, 'RESET_LINK_INVALID');
  assert.equal((await db.query('SELECT used_at FROM password_reset_tokens WHERE token_hash=$1', [hash])).rows[0].used_at, null);
});

test('private file upload, download and delete respect project ownership', async () => {
  const p = await createProject();
  const form = new FormData();
  form.set('files', new Blob(['QA synthetic document'], { type: 'text/plain' }), 'qa.txt');
  const response = await fetch(`${base}/api/files/upload/${p.project_id}`, { method: 'POST', headers: { Authorization: `Bearer ${seller.token}` }, body: form });
  const data = await response.json();
  assert.equal(response.status, 201, JSON.stringify(data));
  const file = data.files[0];
  assert.equal((await db.query('SELECT storage_type FROM project_files WHERE file_id=$1',[file.file_id])).rows[0].storage_type,'database');
  assert.equal(Buffer.from((await db.query('SELECT content FROM project_file_blobs WHERE file_id=$1',[file.file_id])).rows[0].content).toString(),'QA synthetic document');
  expectStatus(await request('GET', `/files/download/${file.file_id}`, buyer.token), 403);
  const download = await fetch(`${base}/api/files/download/${file.file_id}`, { headers: { Authorization: `Bearer ${seller.token}` } });
  assert.equal(download.status, 200);
  assert.equal(await download.text(), 'QA synthetic document');
  await db.query('UPDATE project_files SET file_size=52428800 WHERE file_id=$1',[file.file_id]);
  const extra=new FormData();extra.set('files',new Blob(['over quota'],{type:'text/plain'}),'extra.txt');
  const over=await fetch(`${base}/api/files/upload/${p.project_id}`,{method:'POST',headers:{Authorization:`Bearer ${seller.token}`},body:extra});
  assert.equal(over.status,413);assert.equal((await db.query('SELECT file_id FROM project_files WHERE project_id=$1',[p.project_id])).rows.length,1);
  expectStatus(await request('DELETE', `/files/${file.file_id}`, buyer.token), 403);
  expectStatus(await request('DELETE', `/files/${file.file_id}`, seller.token), 200);
  assert.equal((await db.query('SELECT file_id FROM project_file_blobs WHERE file_id=$1',[file.file_id])).rows.length,0);
});
test('checkout ignores client prices, enforces the buyer and reuses an open session', async () => {
  const p = await saleProject();
  await db.query('UPDATE users SET stripe_account_id=$1 WHERE user_id=$2', ['acct_test_fixture', seller.user.user_id]);
  const inserted = await db.query('INSERT INTO purchase_requests (project_id,buyer_id,seller_id,status,price) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [p.project_id, buyer.user.user_id, seller.user.user_id, 'agreement_reached_pending_payment', 500]);
  const agreement = await approveScope(inserted.rows[0].id);
  const payload = { purchase_request_id: inserted.rows[0].id, agreement_id: agreement.id, amount: 1, price: 1 };
  expectStatus(await request('POST', '/payments/create-checkout-session', outsider.token, payload), 404);
  expectStatus(await request('POST', '/payments/create-checkout-session', buyer.token, payload), 200);
  assert.equal(stripeCalls.at(-1).data.line_items[0].price_data.unit_amount, 50000);
  assert.ok(stripeCalls.at(-1).options?.idempotencyKey);
  const count = stripeCalls.length;
  expectStatus(await request('POST', '/payments/create-checkout-session', buyer.token, payload), 200);
  assert.equal(stripeCalls.length, count);
});
test('invalid agreed prices cannot strand a request in payment processing', async () => {
  const p = await saleProject();
  const inserted = await db.query('INSERT INTO purchase_requests (project_id,buyer_id,seller_id,status,price) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [p.project_id, buyer.user.user_id, seller.user.user_id, 'agreement_reached_pending_payment', 0]);
  const id = inserted.rows[0].id;
  expectStatus(await request('POST', '/payments/create-checkout-session', buyer.token, { purchase_request_id: id, agreement_id: randomUUID() }), 400);
  assert.equal((await db.query('SELECT status FROM purchase_requests WHERE id=$1', [id])).rows[0].status, 'agreement_reached_pending_payment');
});
test('due diligence does not expose private projects when AI is unavailable', async () => {
  const p = await createProject();
  expectStatus(await request('GET', `/ai/due-diligence/${p.project_id}`), 404);
  const publicProject = await createProject({ is_public: true });
  expectStatus(await request('GET', `/ai/due-diligence/${publicProject.project_id}`), 200);
});
test('development SQLite starts without PostgreSQL credentials but PostgreSQL still requires them', () => {
  const config = require('../config/environment');
  assert.equal(config.validate(), true);
  process.env.USE_SQLITE = 'false';
  try { assert.throws(() => config.validate(), /DATABASE_URL/); }
  finally { process.env.USE_SQLITE = 'true'; }
});

async function receiptFixture() {
  const project = await createProject({ name: 'QA source-only handover' });
  const session = `cs_test_receipt_${randomUUID()}`;
  const result = await db.query('INSERT INTO purchase_requests (project_id,buyer_id,seller_id,status,price,message,stripe_session_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
    [project.project_id, buyer.user.user_id, seller.user.user_id, 'assets_transferred_pending_buyer_confirmation', 10.25, 'Source code and documentation only. Domain, social accounts and customer data are excluded.', session]);
  const transactionId = randomUUID();
  await db.query('UPDATE users SET stripe_account_id=$1 WHERE user_id=$2', ['acct_test_receipt', seller.user.user_id]);
  await db.query(`INSERT INTO project_transactions (transaction_id,project_id,buyer_id,seller_id,amount,seller_amount,status,payment_id,stripe_session_id,escrow_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [transactionId, project.project_id, buyer.user.user_id, seller.user.user_id, 10.25, 9.74, 'payment_completed', 'ch_test_receipt', session, 'held']);
  const chargeId='ch_test_'+transactionId, intentId='pi_test_'+transactionId;
  await db.query('UPDATE project_transactions SET purchase_request_id=$2,stripe_payment_intent_id=$3,seller_stripe_account_id=$4,payment_id=$5 WHERE transaction_id=$1', [transactionId,result.rows[0].id,intentId,'acct_test_receipt',chargeId]);
  fixtureCharges.set(chargeId,{id:chargeId,paid:true,refunded:false,amount_refunded:0,disputed:false,amount:1025,currency:'usd',payment_intent:intentId});
  return { project, transactionId, requestId: result.rows[0].id, session };
}

test('receipt review is buyer-only, reads the linked agreement and excludes private payment fields', async () => {
  const fixture = await receiptFixture();
  const route = `/payments/transactions/${fixture.transactionId}/receipt-review`;
  expectStatus(await request('GET', route), 401);
  expectStatus(await request('GET', route, seller.token), 404);
  expectStatus(await request('GET', route, outsider.token), 404);
  const read = await request('GET', route, buyer.token);
  expectStatus(read, 200);
  assert.equal(read.body.can_confirm, true);
  assert.equal(read.body.project_id, fixture.project.project_id);
  assert.equal(read.body.purchase_request_id, fixture.requestId);
  assert.match(read.body.agreement_message, /Domain, social accounts and customer data are excluded/);
  assert.equal(read.body.amount, 10.25);
  for (const field of ['stripe_session_id', 'payment_id', 'buyer_id', 'seller_amount', 'stripe_account_id']) assert.equal(read.body[field], undefined);
  expectStatus(await request('GET', '/payments/transactions/invalid/receipt-review', buyer.token), 400);
});

test('receipt confirmation requires explicit acknowledgement and the actual buyer', async () => {
  const fixture = await receiptFixture();
  const count = transferCalls.length;
  const payload = { transactionId: fixture.transactionId, receiptAcknowledged: true };
  expectStatus(await request('POST', '/payments/confirm-receipt', buyer.token, { transactionId: fixture.transactionId }), 400);
  expectStatus(await request('POST', '/payments/confirm-receipt', buyer.token, { ...payload, receiptAcknowledged: 'true' }), 400);
  expectStatus(await request('POST', '/payments/confirm-receipt', outsider.token, payload), 404);
  expectStatus(await request('POST', '/payments/confirm-receipt', seller.token, payload), 404);
  assert.equal(transferCalls.length, count);
  assert.equal((await db.query('SELECT owner_id FROM projects WHERE project_id=$1', [fixture.project.project_id])).rows[0].owner_id, seller.user.user_id);
});

test('receipt confirmation blocks unpaid, disputed, inconsistent and changed-owner transactions', async () => {
  const fixture = await receiptFixture();
  const payload = { transactionId: fixture.transactionId, receiptAcknowledged: true };
  const count = transferCalls.length;
  for (const [status, escrow, paymentId, sellerAmount] of [
    ['pending', 'held', 'ch_test_receipt', 9.74],
    ['payment_completed', 'held', null, 9.74],
    ['payment_completed', 'disputed', 'ch_test_receipt', 9.74],
    ['payment_completed', 'released', 'ch_test_receipt', 9.74],
    ['payment_completed', 'held', 'ch_test_receipt', 20],
    ['payment_completed', 'held', 'ch_test_receipt', 0.001]
  ]) {
    await db.query('UPDATE project_transactions SET status=$1, escrow_status=$2, payment_id=$3, seller_amount=$4 WHERE transaction_id=$5', [status, escrow, paymentId, sellerAmount, fixture.transactionId]);
    const review = await request('GET', `/payments/transactions/${fixture.transactionId}/receipt-review`, buyer.token);
    assert.equal(review.body.can_confirm, false);
    expectStatus(await request('POST', '/payments/confirm-receipt', buyer.token, payload), 409);
  }
  await db.query('UPDATE project_transactions SET status=$1, escrow_status=$2, payment_id=$3, seller_amount=$4 WHERE transaction_id=$5', ['payment_completed', 'held', 'ch_test_receipt', 9.74, fixture.transactionId]);
  const outsiderUser = (await db.query('SELECT user_id FROM users WHERE username=$1', ['outsider'])).rows[0].user_id;
  await db.query('UPDATE projects SET owner_id=$1 WHERE project_id=$2', [outsiderUser, fixture.project.project_id]);
  expectStatus(await request('POST', '/payments/confirm-receipt', buyer.token, payload), 409);
  assert.equal(transferCalls.length, count);
});

test('verified receipt completes once, pays the recorded amount and updates only the linked request', async () => {
  const fixture = await receiptFixture();
  const other = await db.query('INSERT INTO purchase_requests (project_id,buyer_id,seller_id,status,price,stripe_session_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [fixture.project.project_id, buyer.user.user_id, seller.user.user_id, 'seller_accepted_pending_payment', 20, 'cs_test_other_attempt']);
  const before = transferCalls.length;
  const payload = { transactionId: fixture.transactionId, receiptAcknowledged: true };
  const released = await request('POST', '/payments/confirm-receipt', buyer.token, payload);
  expectStatus(released, 200);
  assert.equal(released.body.alreadyConfirmed, false);
  assert.equal(transferCalls.length, before + 1);
  assert.equal(transferCalls.at(-1).data.amount, 974);
  assert.equal(transferCalls.at(-1).options.idempotencyKey, `escrow_release_${fixture.transactionId}`);
  const stored = (await db.query('SELECT * FROM project_transactions WHERE transaction_id=$1', [fixture.transactionId])).rows[0];
  assert.equal(stored.status, 'completed'); assert.equal(stored.escrow_status, 'released'); assert.equal(Boolean(stored.escrow_released), true);
  assert.equal((await db.query('SELECT owner_id FROM projects WHERE project_id=$1', [fixture.project.project_id])).rows[0].owner_id, buyer.user.user_id);
  assert.equal((await db.query('SELECT owner_username FROM projects WHERE project_id=$1', [fixture.project.project_id])).rows[0].owner_username, buyer.user.username);
  assert.equal((await db.query('SELECT status FROM purchase_requests WHERE id=$1', [fixture.requestId])).rows[0].status, 'transfer_completed_buyer_confirmed');
  assert.equal((await db.query('SELECT status FROM purchase_requests WHERE id=$1', [other.rows[0].id])).rows[0].status, 'seller_accepted_pending_payment');
  const purchaseRows = (await request('GET', '/purchase-requests/buyer', buyer.token)).body.filter(row => row.project_id === fixture.project.project_id);
  assert.equal(purchaseRows.length, 2);
  assert.equal(purchaseRows.find(row => row.purchase_request_id === fixture.requestId).escrow_status, 'released');
  assert.equal(purchaseRows.find(row => row.purchase_request_id === fixture.requestId).paid_amount, 10.25);
  assert.equal(purchaseRows.find(row => row.purchase_request_id === other.rows[0].id).transaction_id, null);
  const repeated = await request('POST', '/payments/confirm-receipt', buyer.token, payload);
  expectStatus(repeated, 200); assert.equal(repeated.body.alreadyConfirmed, true); assert.equal(transferCalls.length, before + 1);
  assert.equal((await request('GET', `/payments/transactions/${fixture.transactionId}/receipt-review`, buyer.token)).body.completed, true);
});

test('legacy request-only receipt routes cannot change ownership or release funds', async () => {
  const fixture = await receiptFixture();
  const count = transferCalls.length;
  for (const [method, suffix] of [['POST', 'confirm-transfer'], ['PUT', 'confirm-receipt']]) {
    expectStatus(await request(method, `/purchase-requests/${fixture.requestId}/${suffix}`, outsider.token, { confirmed: true }), 404);
    const result = await request(method, `/purchase-requests/${fixture.requestId}/${suffix}`, buyer.token, { confirmed: true });
    expectStatus(result, 409);
    assert.equal(result.body.review_url, `/project-transfer?transactionId=${fixture.transactionId}`);
  }
  assert.equal(transferCalls.length, count);
  assert.equal((await db.query('SELECT owner_id FROM projects WHERE project_id=$1', [fixture.project.project_id])).rows[0].owner_id, seller.user.user_id);
});

test('receipt review never guesses agreement text from another or ambiguous checkout attempt', async () => {
  const fixture = await receiptFixture();
  await db.query('INSERT INTO purchase_requests (project_id,buyer_id,seller_id,status,message,stripe_session_id) VALUES ($1,$2,$3,$4,$5,$6)',
    [fixture.project.project_id, buyer.user.user_id, seller.user.user_id, 'seller_terms_proposed', 'Different terms', fixture.session]);
  const review = await request('GET', `/payments/transactions/${fixture.transactionId}/receipt-review`, buyer.token);
  assert.equal(review.body.agreement_message, null); assert.equal(review.body.purchase_request_id, null);
});

async function agreementFixture() {
  const project = await saleProject();
  const initiated = await request('POST', `/purchase-requests/projects/${project.project_id}/initiate-checkout`, buyer.token, {});
  expectStatus(initiated, 201);
  return { project, id: initiated.body.purchase_request_id, route: `/purchase-requests/${initiated.body.purchase_request_id}/agreement` };
}

test('purchase scope is participant-only and direct purchase waits for seller scope', async () => {
  const fixture = await agreementFixture();
  expectStatus(await request('GET', fixture.route), 401);
  expectStatus(await request('GET', fixture.route, outsider.token), 404);
  const read = await request('GET', fixture.route, buyer.token);
  expectStatus(read, 200);
  assert.equal(read.body.status, 'interest_expressed');
  assert.equal(read.body.role, 'buyer'); assert.equal(read.body.agreement, null); assert.equal(read.body.can_checkout, false);
  assert.equal(read.body.buyer_id, undefined); assert.equal(read.body.stripe_session_id, undefined);
  const repeated = await request('POST', `/purchase-requests/projects/${fixture.project.project_id}/initiate-checkout`, buyer.token, {});
  expectStatus(repeated, 200); assert.equal(repeated.body.request_id, fixture.id);
  expectStatus(await request('GET', '/purchase-requests/invalid/agreement', buyer.token), 400);
  expectStatus(await request('GET', '/purchase-requests/9007199254740991/agreement', buyer.token), 400);
});

test('seller publishes complete itemized scope and malformed scopes leave the purchase untouched', async () => {
  const fixture = await agreementFixture();
  const payload = agreementScope({ base_version: 0, price_cents: 1025 });
  expectStatus(await request('POST', fixture.route, buyer.token, payload), 403);
  expectStatus(await request('POST', fixture.route, outsider.token, payload), 404);
  for (const patch of [{ included_items: [] }, { included_items: ['x'.repeat(301)] }, { support_terms: '' }, { exclusions: [] },
    { price_cents: 10.25 }, { price_cents: -2 }, { base_version: '0' }]) {
    expectStatus(await request('POST', fixture.route, seller.token, { ...payload, ...patch }), 400);
  }
  assert.equal((await request('GET', fixture.route, buyer.token)).body.agreement, null);
  const published = await request('POST', fixture.route, seller.token, payload);
  expectStatus(published, 201);
  assert.deepEqual(published.body.agreement.included_items, ['Source code', 'Deployment guide']);
  assert.ok(published.body.agreement.seller_approved_at); assert.equal(published.body.agreement.buyer_approved_at, null);
  assert.equal((await db.query('SELECT price FROM purchase_requests WHERE id=$1', [fixture.id])).rows[0].price, 10.25);
});

test('revisions preserve history, invalidate previous approval and reject stale editors and buyers', async () => {
  const fixture = await agreementFixture();
  const first = await approveScope(fixture.id);
  const revision = await request('POST', fixture.route, seller.token, agreementScope({ base_version: 1, included_items: ['Source only'], support_terms: 'None' }));
  expectStatus(revision, 201);
  const second = revision.body.agreement;
  assert.equal(second.version, 2); assert.equal(second.buyer_approved_at, null);
  expectStatus(await request('POST', `${fixture.route}/approve`, buyer.token, { agreement_id: first.id, acknowledged: true }), 409);
  expectStatus(await request('POST', fixture.route, seller.token, agreementScope({ base_version: 1 })), 409);
  const read = await request('GET', fixture.route, buyer.token);
  assert.equal(read.body.can_checkout, false); assert.equal(read.body.versions.length, 2);
  assert.ok(read.body.versions[1].buyer_approved_at);
  assert.deepEqual(read.body.versions[1].included_items, first.included_items);
  expectStatus(await request('POST', `${fixture.route}/approve`, buyer.token, { agreement_id: second.id, acknowledged: true }), 200);
  const calls = stripeCalls.length;
  expectStatus(await request('POST', '/payments/create-checkout-session', buyer.token, { purchase_request_id: fixture.id, agreement_id: first.id }), 409);
  assert.equal(stripeCalls.length, calls, 'Even a previously approved version cannot bypass the latest approved scope');
});

test('buyer approval requires an explicit acknowledgement and retries do not send duplicate notifications', async () => {
  const fixture = await agreementFixture();
  const published = await request('POST', fixture.route, seller.token, agreementScope({ base_version: 0 }));
  const payload = { agreement_id: published.body.agreement.id, acknowledged: true };
  expectStatus(await request('POST', `${fixture.route}/approve`, seller.token, payload), 403);
  expectStatus(await request('POST', `${fixture.route}/approve`, outsider.token, payload), 404);
  for (const acknowledged of [undefined, false, 'true']) expectStatus(await request('POST', `${fixture.route}/approve`, buyer.token, { ...payload, acknowledged }), 400);
  expectStatus(await request('POST', `${fixture.route}/approve`, buyer.token, payload), 200);
  const count = (await db.query("SELECT COUNT(*) AS total FROM notifications WHERE user_id=$1 AND type='purchase_agreement'", [seller.user.user_id])).rows[0].total;
  expectStatus(await request('POST', `${fixture.route}/approve`, buyer.token, payload), 200);
  assert.equal((await db.query("SELECT COUNT(*) AS total FROM notifications WHERE user_id=$1 AND type='purchase_agreement'", [seller.user.user_id])).rows[0].total, count);
});

test('checkout cannot bypass the latest scope, locks its version and uses its exact server price', async () => {
  const fixture = await agreementFixture();
  await db.query('UPDATE users SET stripe_account_id=$1 WHERE user_id=$2', ['acct_test_agreement', seller.user.user_id]);
  await db.query("UPDATE purchase_requests SET status='seller_accepted_pending_payment' WHERE id=$1", [fixture.id]);
  const start = stripeCalls.length;
  const payload = { purchase_request_id: fixture.id, agreement_id: randomUUID() };
  expectStatus(await request('POST', '/payments/create-checkout-session', buyer.token, payload), 409);
  expectStatus(await request('POST', '/payments/create-checkout-session', buyer.token, { purchase_request_id: fixture.id }), 400);
  const published = await request('POST', fixture.route, seller.token, agreementScope({ base_version: 0, price_cents: 1025 }));
  payload.agreement_id = published.body.agreement.id;
  expectStatus(await request('POST', '/payments/create-checkout-session', buyer.token, payload), 409);
  assert.equal(stripeCalls.length, start);
  expectStatus(await request('POST', `${fixture.route}/approve`, buyer.token, { agreement_id: payload.agreement_id, acknowledged: true }), 200);
  await db.query('UPDATE projects SET sale_price=999, description=$1 WHERE project_id=$2', ['Changed listing after approval', fixture.project.project_id]);
  expectStatus(await request('POST', '/payments/create-checkout-session', buyer.token, { ...payload, amount: 1 }), 200);
  assert.equal(stripeCalls.at(-1).data.line_items[0].price_data.unit_amount, 1025);
  assert.equal(stripeCalls.at(-1).data.metadata.agreement_id, payload.agreement_id);
  assert.equal((await db.query('SELECT agreement_id FROM purchase_requests WHERE id=$1', [fixture.id])).rows[0].agreement_id, payload.agreement_id);
  expectStatus(await request('POST', fixture.route, seller.token, agreementScope({ base_version: 1 })), 409);
  const read = await request('GET', fixture.route, buyer.token);
  assert.equal(read.body.checkout_started, true); assert.equal(read.body.can_edit, false);
  expectStatus(await request('POST', '/payments/create-checkout-session', buyer.token, payload), 200);
  assert.equal(stripeCalls.length, start + 1);
});

test('agreement approval is blocked after ownership or sale availability changes', async () => {
  for (const update of ['owner_id=$2', 'is_for_sale=false', 'is_on_hold=true']) {
    const fixture = await agreementFixture();
    const published = await request('POST', fixture.route, seller.token, agreementScope({ base_version: 0 }));
    const values = update.includes('$2') ? [fixture.project.project_id, outsider.user?.user_id || buyer.user.user_id] : [fixture.project.project_id];
    await db.query(`UPDATE projects SET ${update} WHERE project_id=$1`, values);
    expectStatus(await request('POST', `${fixture.route}/approve`, buyer.token, { agreement_id: published.body.agreement.id, acknowledged: true }), 409);
    assert.equal((await request('GET', fixture.route, buyer.token)).body.can_checkout, false);
  }
});

test('paid receipt reads the frozen itemized scope instead of mutable listing details', async () => {
  const fixture = await agreementFixture();
  const approved = await approveScope(fixture.id, { price_cents: 1025 });
  const session = `cs_test_scope_${randomUUID()}`;
  await db.query("UPDATE purchase_requests SET agreement_id=$2, stripe_session_id=$3, status='payment_completed_pending_transfer' WHERE id=$1", [fixture.id, approved.id, session]);
  const transactionId = randomUUID();
  await db.query(`INSERT INTO project_transactions (transaction_id,project_id,buyer_id,seller_id,amount,seller_amount,status,payment_id,stripe_session_id,escrow_status)
    VALUES ($1,$2,$3,$4,10.25,9.74,'payment_completed','ch_test_scope',$5,'held')`, [transactionId, fixture.project.project_id, buyer.user.user_id, seller.user.user_id, session]);
  await db.query('UPDATE projects SET stage_details=$2 WHERE project_id=$1', [fixture.project.project_id, JSON.stringify({ included_assets: 'Changed public listing' })]);
  const read = await request('GET', `/payments/transactions/${transactionId}/receipt-review`, buyer.token);
  expectStatus(read, 200);
  assert.equal(read.body.purchase_agreement.id, approved.id);
  assert.deepEqual(read.body.purchase_agreement.included_items, ['Source code', 'Deployment guide']);
  assert.equal(read.body.purchase_agreement.price_cents, 1025);
});

test('checkout rejects pending or missing seller transfers before reserving or contacting checkout', async t => {
  for (const transfers of ['pending', undefined]) {
    const p = await saleProject();
    await db.query("UPDATE users SET stripe_account_id='acct_test_fixture',onboarding_complete=true,stripe_onboarding_complete=true WHERE user_id=$1", [seller.user.user_id]);
    const inserted = await db.query('INSERT INTO purchase_requests(project_id,buyer_id,seller_id,status,price) VALUES($1,$2,$3,$4,$5) RETURNING id',
      [p.project_id, buyer.user.user_id, seller.user.user_id, 'agreement_reached_pending_payment', 500]);
    const requestId = inserted.rows[0].id;
    const agreement = await approveScope(requestId);
    const mocked = t.mock.method(fakeStripe.accounts, 'retrieve', async () => ({charges_enabled:true,payouts_enabled:true,details_submitted:true,capabilities:{transfers}}));
    const count = stripeCalls.length;
    const result = await request('POST', '/payments/create-checkout-session', buyer.token, { purchase_request_id: requestId, agreement_id: agreement.id });
    expectStatus(result, 409); assert.equal(stripeCalls.length, count);
    assert.equal((await db.query('SELECT * FROM checkout_reservations WHERE project_id=$1', [p.project_id])).rows.length, 0);
    mocked.mock.restore();
  }
});

test('existing sale details can be improved during a Stripe outage and owner lists include the saved buyer brief', async t => {
  const p = await saleProject();
  await db.query("UPDATE projects SET contact_email='seller@example.invalid' WHERE project_id=$1", [p.project_id]);
  const retrieve = t.mock.method(fakeStripe.accounts, 'retrieve', async () => { throw new Error('Synthetic outage'); });
  const details = { included_assets: 'Code and documentation', running_costs: '$12/month hosting', setup_handoff: 'Repository transfer and setup guide' };
  expectStatus(await request('PUT', `/projects/${p.project_id}`, seller.token, { is_public: true, is_for_sale: true, category: 'productivity', tech_stack: ['React'], stage_details: details }), 200);
  assert.equal(retrieve.mock.callCount(), 0);
  const own = await request('GET', '/projects', seller.token);
  const updated = own.body.find(project => project.project_id === p.project_id);
  assert.deepEqual(updated.stage_details, details); assert.deepEqual(updated.tech_stack, ['React']);
  assert.equal((await request('GET', '/projects', buyer.token)).body.some(project => project.project_id === p.project_id), false);
});

test('publishing a hidden sale cannot bypass Stripe readiness by omitting the sale flag', async t => {
  const p = await saleProject();
  await db.query("UPDATE projects SET is_public=false,contact_email='seller@example.invalid' WHERE project_id=$1", [p.project_id]);
  t.mock.method(fakeStripe.accounts, 'retrieve', async () => ({ charges_enabled: false }));
  expectStatus(await request('PUT', `/projects/${p.project_id}`, seller.token, { is_public: true }), 403);
  assert.equal((await db.query('SELECT is_public FROM projects WHERE project_id=$1', [p.project_id])).rows[0].is_public, 0);
  expectStatus(await request('PUT', `/projects/${p.project_id}`, seller.token, { is_public: 'false' }), 400);
});
