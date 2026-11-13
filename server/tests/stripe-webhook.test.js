const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const express = require('express');

// Real SDK signature verification, synthetic keys, stubbed database. No provider requests.
Object.assign(process.env, { NODE_ENV: 'test', STRIPE_MODE: 'test', STRIPE_SECRET_KEY: 'sk_test_webhook_synthetic',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_webhook_synthetic', STRIPE_WEBHOOK_SECRET: 'whsec_webhook_synthetic',
    STRIPE_STARTUP_CHECK: 'false', FEATURE_STRIPE_PAYMENTS: 'true', CLIENT_URL: 'http://localhost:3009', JWT_SECRET: 'stripe-webhook-tests-only-secret-32-characters' });
let databaseCalls = 0;
const dbFile = require.resolve('../db');
require.cache[dbFile] = { id: dbFile, filename: dbFile, loaded: true, exports: {
    query: async () => { databaseCalls++; return { rows: [] }; },
    withTransaction: async () => { databaseCalls++; throw new Error('Financial processing must not run in signature tests'); },
    checkConnection: async () => ({ ok: true })
} };
const emailFile = require.resolve('../services/emailService');
require.cache[emailFile] = { id: emailFile, filename: emailFile, loaded: true, exports: {} };
const { stripe, stripeEnvironment } = require('../config/stripe.config');
const { webhookHandler } = require('../routes/payments');
const webhookService = require('../services/webhookService');
const app = express();
app.post('/hook', express.raw({ type: 'application/json' }), webhookHandler);
app.post('/parsed-hook', express.json(), webhookHandler);

// A separately mounted route instance proves invalid config is blocked before purchase state changes.
const configFile = require.resolve('../config/stripe.config');
const paymentFile = require.resolve('../routes/payments');
const originalConfiguration = require.cache[configFile].exports;
require.cache[configFile].exports = { ...originalConfiguration, stripeConfigValid: false };
delete require.cache[paymentFile];
const disabledPayments = require('../routes/payments');
const disabledStripe = require('../routes/stripe');
require.cache[configFile].exports = originalConfiguration;
app.post('/disabled-hook', express.raw({ type: 'application/json' }), disabledPayments.webhookHandler);
app.use('/disabled', express.json(), disabledPayments.router);
app.use('/disabled-stripe', express.json(), disabledStripe);
let server, base;
before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
const event = (overrides = {}) => ({ id: `evt_synthetic_${randomUUID()}`, object: 'event', type: 'test.ignored', livemode: false, data: { object: { livemode: false } }, ...overrides });
const signed = (payload, options = {}) => stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET, ...options });
async function deliver(payload, signature, route = '/hook') {
    return fetch(`${base}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(signature ? { 'stripe-signature': signature } : {}) }, body: payload, signal: AbortSignal.timeout(5000) });
}

test('a valid signature and matching test mode reach the processor', async () => {
    const payload = JSON.stringify(event());
    const result = await deliver(payload, signed(payload));
    assert.equal(result.status, 200);
    assert.equal((await result.json()).received, true);
});

for (const scenario of ['missing signature', 'wrong signing secret', 'changed body', 'stale timestamp', 'parsed JSON body']) {
    test(`webhook rejects ${scenario} before database processing`, async () => {
        const original = JSON.stringify(event());
        let payload = original;
        let signature = signed(original);
        let route = '/hook';
        if (scenario === 'missing signature') signature = undefined;
        if (scenario === 'wrong signing secret') signature = signed(original, { secret: 'whsec_other_synthetic' });
        if (scenario === 'changed body') payload = original + ' ';
        if (scenario === 'stale timestamp') signature = signed(original, { timestamp: Math.floor(Date.now() / 1000) - 600 });
        if (scenario === 'parsed JSON body') route = '/parsed-hook';
        const calls = databaseCalls;
        assert.equal((await deliver(payload, signature, route)).status, 400);
        assert.equal(databaseCalls, calls);
    });
}

test('even correctly signed live, missing-mode or inconsistent events cannot enter the test database', async () => {
    const calls = databaseCalls;
    for (const value of [event({ livemode: true }), event({ livemode: undefined }), event({ livemode: 'false' }), event({ data: { object: { livemode: true } } })]) {
        const payload = JSON.stringify(value);
        assert.equal((await deliver(payload, signed(payload))).status, 400);
    }
    assert.equal(databaseCalls, calls);
});

test('queued and internal events also check mode before any storage or enqueue', async () => {
    const calls = databaseCalls;
    await assert.rejects(webhookService.processWebhook(event({ livemode: true }), 'synthetic', true), { code: 'STRIPE_EVENT_MODE_MISMATCH' });
    await assert.rejects(webhookService.processWebhook(event({ livemode: undefined }), 'synthetic'), { code: 'STRIPE_EVENT_MODE_MISMATCH' });
    assert.equal(databaseCalls, calls);
    assert.equal(stripeEnvironment.mode, 'test');
});

test('disabled or inconsistent setup blocks checkout, release and webhooks before database changes', async () => {
    const calls = databaseCalls;
    for (const route of ['/disabled/create-checkout-session', '/disabled/confirm-receipt', '/disabled/connect/create-account', '/disabled/connect/refresh-link', '/disabled-stripe/reset-account', '/disabled-stripe/create-account-link', '/disabled-hook']) {
        assert.equal((await deliver('{}', undefined, route)).status, 503, route);
    }
    assert.equal(databaseCalls, calls);
    // Dispute reporting remains available through normal authentication during a provider outage.
    assert.equal((await deliver('{}', undefined, '/disabled/report-issue')).status, 401);
    const health = await fetch(`${base}/disabled/health`);
    assert.equal((await health.json()).stripe, 'disconnected');
});
