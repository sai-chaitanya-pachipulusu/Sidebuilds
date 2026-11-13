const test = require('node:test');
const assert = require('node:assert/strict');
const { createReadinessHandler } = require('../utils/readiness');
const response = () => ({ setHeader(name, value) { this[name] = value; },
  status(value) { this.code = value; return this; }, json(value) { this.body = value; return this; } });
test('readiness proves database connectivity instead of process liveness', async () => {
  for (const ok of [true, false]) {
    const res = response();
    await createReadinessHandler(async () => ({ ok, message: 'private database host' }))({}, res);
    assert.equal(res.code, ok ? 200 : 503);
    assert.equal(res.body.database.connected, ok);
    assert.equal(res['Cache-Control'], 'no-store');
    assert.equal(JSON.stringify(res.body).includes('private'), false);
  }
});
test('unexpected database failures return unavailable without leaking credentials', async () => {
  const res = response();
  await createReadinessHandler(async () => { throw new Error('private database credential'); })({}, res);
  assert.equal(res.code, 503);
  assert.equal(JSON.stringify(res.body).includes('private'), false);
});
