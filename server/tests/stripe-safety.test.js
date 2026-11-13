const test = require('node:test');
const assert = require('node:assert/strict');
const { inspectStripeEnvironment, guardStripeClient, assertStripeEventMode } = require('../utils/stripeSafety');
const { validateStripeBrowserEnvironment } = require('../../client/scripts/stripe-build-safety.cjs');
const configuration = (overrides = {}) => ({ NODE_ENV: 'development', STRIPE_MODE: 'test', STRIPE_SECRET_KEY: 'sk_test_synthetic',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_synthetic', STRIPE_WEBHOOK_SECRET: 'whsec_synthetic', ...overrides });

test('Stripe modes are explicit in production and matched across secret and publishable keys', () => {
    assert.equal(inspectStripeEnvironment(configuration()).valid, true);
    assert.equal(inspectStripeEnvironment(configuration({ STRIPE_SECRET_KEY: 'rk_test_synthetic' })).valid, true);
    assert.equal(inspectStripeEnvironment(configuration({ STRIPE_MODE: undefined })).valid, true);
    assert.equal(inspectStripeEnvironment(configuration({ NODE_ENV: 'production', STRIPE_MODE: undefined })).valid, false);
    assert.equal(inspectStripeEnvironment(configuration({ NODE_ENV: 'production' })).valid, true, 'A separate staging runtime may explicitly select test mode');
    assert.equal(inspectStripeEnvironment(configuration({ NODE_ENV: 'production', STRIPE_MODE: 'live', STRIPE_SECRET_KEY: 'sk_live_synthetic', STRIPE_PUBLISHABLE_KEY: 'pk_live_synthetic' })).valid, true);
});

test('live keys cannot enter development and mixed, missing or malformed credentials fail closed', () => {
    for (const change of [{ STRIPE_PUBLISHABLE_KEY: 'pk_live_synthetic' }, { STRIPE_MODE: 'live' }, { STRIPE_MODE: 'typo' },
        { STRIPE_SECRET_KEY: '' }, { STRIPE_SECRET_KEY: 'pk_test_synthetic' }, { STRIPE_WEBHOOK_SECRET: '' },
        { STRIPE_PUBLISHABLE_KEY: '' }, { STRIPE_WEBHOOK_SECRET: 'sk_test_wrong_type' }, { FEATURE_STRIPE_PAYMENTS: 'false' },
        { STRIPE_SECRET_KEY: 'sk_live_synthetic', STRIPE_PUBLISHABLE_KEY: 'pk_live_synthetic', STRIPE_MODE: 'live' },
        { CLIENT_URL: 'https://www.sidebuilds.online' }]) {
        const result = inspectStripeEnvironment(configuration(change));
        assert.equal(result.valid, false); assert.ok(result.errors.length);
        assert.ok(!JSON.stringify(result.errors).includes('synthetic'), 'Diagnostics never echo key values');
    }
});

test('invalid configuration blocks all SDK reads and writes before the provider and preserves method context', async () => {
    let calls = 0;
    const raw = { balance: { retrieve: async () => { calls++; } }, checkout: { sessions: { create: async () => { calls++; } } },
        accounts: { value: 7, retrieve() { calls++; return this.value; } } };
    const blocked = guardStripeClient(raw, { valid: false });
    assert.throws(() => blocked.balance.retrieve(), { code: 'STRIPE_CONFIGURATION_INVALID' });
    assert.throws(() => blocked.checkout.sessions.create({}), { code: 'STRIPE_CONFIGURATION_INVALID' });
    assert.equal(calls, 0);
    const allowed = guardStripeClient(raw, { valid: true });
    assert.equal(allowed.accounts.retrieve(), 7);
});

test('webhook mode must match in the event envelope and any object mode', () => {
    for (const mode of ['test', 'live']) {
        const live = mode === 'live';
        const settings = { valid: true, mode };
        assert.doesNotThrow(() => assertStripeEventMode({ livemode: live, data: { object: { livemode: live } } }, settings));
        for (const event of [{ livemode: !live }, {}, { livemode: String(live) }, { livemode: live, data: { object: { livemode: !live } } }]) {
            assert.throws(() => assertStripeEventMode(event, settings), { code: 'STRIPE_EVENT_MODE_MISMATCH' });
        }
    }
});

test('browser builds accept public keys, reject server credentials and enforce a selected mode', () => {
    assert.deepEqual(validateStripeBrowserEnvironment({ REACT_APP_STRIPE_PUBLISHABLE_KEY: 'pk_test_synthetic', REACT_APP_STRIPE_MODE: 'test' }), []);
    assert.deepEqual(validateStripeBrowserEnvironment({}), [], 'Hosted Checkout may not need a browser SDK key');
    for (const env of [{ REACT_APP_STRIPE_PUBLISHABLE_KEY: 'sk_live_synthetic' }, { REACT_APP_OTHER: 'rk_test_synthetic' },
        { REACT_APP_WEBHOOK: 'whsec_synthetic' }, { REACT_APP_STRIPE_PUBLISHABLE_KEY: 'pk_live_synthetic', REACT_APP_STRIPE_MODE: 'test' },
        { REACT_APP_API_URL: 'https://sidebuilds.onrender.com/api', REACT_APP_STRIPE_MODE: 'test' },
        { REACT_APP_CONFIG: JSON.stringify({ secret: 'sk_live_synthetic' }) }, { REACT_APP_OTHER: ' whsec_synthetic ' }]) {
        const errors = validateStripeBrowserEnvironment(env);
        assert.ok(errors.length); assert.ok(!JSON.stringify(errors).includes('synthetic'));
    }
});
