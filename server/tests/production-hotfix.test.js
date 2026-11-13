const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const sqlite3 = require('sqlite3');
const express = require('express');
const { signToken } = require('../utils/jwt');

// The route modules use a disposable, real SQL database. No saved settings,
// production database, filesystem uploads or payment provider are loaded.
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: 'hotfix-regression-only-secret-with-32-characters', DATABASE_URL: '' });
const database = new sqlite3.Database(':memory:');
const query = (sql, values = []) => new Promise((resolve, reject) => {
  database.all(sql, values, (error, rows) => error ? reject(error) : resolve({ rows }));
});
const execute = sql => new Promise((resolve, reject) => database.exec(sql, error => error ? reject(error) : resolve()));
const replace = (filename, exports) => {
  const id = require.resolve(filename);
  require.cache[id] = { id, filename: id, loaded: true, exports };
};
const notifications = [];
replace('../db', { query, trueExpr: column => `${column} = true`, dialect:'sqlite' });
replace('../services/notificationService', { createNotification: async (...args) => notifications.push(args) });
replace('../config/multer', { uploadsDir: require('node:os').tmpdir(), uploadMultiple: () => (_req, _res, next) => next(),
  handleMulterError: (_req, _res, next) => next() });
const app = express();
app.use(express.json());
app.use('/projects', require('../routes/projects'));
app.use('/follows', require('../routes/follows'));
app.use('/questions', require('../routes/questions'));
const seller = '11111111-1111-4111-8111-111111111111';
const buyer = '22222222-2222-4222-8222-222222222222';
const project = '33333333-3333-4333-8333-333333333333';
const question = '44444444-4444-4444-8444-444444444444';
let server, base;
async function request(method, route, userId) {
  const token = userId && signToken({ user: { user_id: userId, username: 'qa' } });
  const response = await fetch(base + route, { method,
    headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(5000) });
  return { status: response.status, body: await response.json() };
}
before(async () => {
  await execute(`CREATE TABLE users (user_id TEXT PRIMARY KEY, username TEXT,
    stripe_account_id TEXT, onboarding_complete INTEGER, stripe_onboarding_complete INTEGER,
    payout_enabled INTEGER, stripe_charges_enabled INTEGER, stripe_details_submitted INTEGER);
    CREATE TABLE projects (project_id TEXT PRIMARY KEY, owner_id TEXT, is_public INTEGER);
    CREATE TABLE checkout_reservations (project_id TEXT PRIMARY KEY);
    CREATE TABLE user_follows (follower_id TEXT, following_id TEXT, PRIMARY KEY(follower_id, following_id));
    CREATE TABLE project_questions (question_id TEXT PRIMARY KEY, project_id TEXT, asker_id TEXT,
    answered_by TEXT, question TEXT, answer TEXT, answered_at TEXT, created_at TEXT, is_public INTEGER);`);
  await query('INSERT INTO users (user_id,username) VALUES ($1,$2),($3,$4)', [seller,'seller',buyer,'buyer']);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => {
  notifications.length = 0;
  await execute('DELETE FROM user_follows; DELETE FROM project_questions; DELETE FROM projects;');
  await query('INSERT INTO projects VALUES ($1,$2,true)', [project,seller]);
  await query('INSERT INTO project_questions (question_id,project_id,asker_id,question,is_public) VALUES ($1,$2,$3,$4,true)',
    [question,project,buyer,'Can you clarify the included assets?']);
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await new Promise((resolve, reject) => database.close(error => error ? reject(error) : resolve()));
});

test('seller payment-status route resolves before the project-ID route and remains authenticated', async () => {
  assert.equal((await request('GET','/projects/check-stripe-account')).status, 401);
  const response = await request('GET','/projects/check-stripe-account', seller);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { hasStripeAccount: false, isOnboardingComplete: false });
});
test('ordinary project IDs still resolve after the route reorder', async () => {
  const response = await request('GET',`/projects/${project}`, seller);
  assert.equal(response.status, 200);
  assert.equal(response.body.project_id, project);
});
test('retrying a follow persists one relationship and emits one notification', async () => {
  for (let i=0; i<3; i++) assert.equal((await request('POST',`/follows/${seller}`, buyer)).status, 201);
  assert.equal((await query('SELECT * FROM user_follows')).rows.length, 1);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0][0], seller);
});
test('concurrent follow retries emit one notification and unfollow/refollow can notify again', async () => {
  const results = await Promise.all([request('POST',`/follows/${seller}`,buyer), request('POST',`/follows/${seller}`,buyer)]);
  assert.ok(results.every(result => result.status===201));
  assert.equal(notifications.length, 1);
  assert.equal((await request('DELETE',`/follows/${seller}`,buyer)).status, 200);
  assert.equal((await request('POST',`/follows/${seller}`,buyer)).status, 201);
  assert.equal(notifications.length, 2);
});
test('public Q&A disappears immediately on privacy changes and returns when republished', async () => {
  assert.equal((await request('GET',`/questions/project/${project}`)).body.length, 1);
  await query('UPDATE projects SET is_public=false WHERE project_id=$1', [project]);
  assert.deepEqual((await request('GET',`/questions/project/${project}`)).body, []);
  await query('UPDATE projects SET is_public=true WHERE project_id=$1', [project]);
  assert.equal((await request('GET',`/questions/project/${project}`)).body.length, 1);
});
test('Q&A for deleted projects and individually private questions is not public', async () => {
  await query('UPDATE project_questions SET is_public=false WHERE question_id=$1', [question]);
  assert.deepEqual((await request('GET',`/questions/project/${project}`)).body, []);
  await query('UPDATE project_questions SET is_public=true WHERE question_id=$1', [question]);
  await query('DELETE FROM projects WHERE project_id=$1', [project]);
  assert.deepEqual((await request('GET',`/questions/project/${project}`)).body, []);
});
