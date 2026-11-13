function keyMode(value, type) {
    if (typeof value !== 'string') return null;
    const pattern = type === 'public' ? /^pk_(test|live)_[A-Za-z0-9_]+$/ : /^(?:sk|rk)_(test|live)_[A-Za-z0-9_]+$/;
    return value.match(pattern)?.[1] || null;
}

function inspectStripeEnvironment(env) {
    const errors = [];
    const secretMode = keyMode(env.STRIPE_SECRET_KEY, 'secret');
    const publicMode = keyMode(env.STRIPE_PUBLISHABLE_KEY, 'public');
    const mode = env.STRIPE_MODE || (env.NODE_ENV !== 'production' && secretMode === 'test' ? 'test' : null);
    if (!secretMode) errors.push('STRIPE_SECRET_KEY must be a secret or restricted Stripe API key.');
    if (!publicMode) errors.push('STRIPE_PUBLISHABLE_KEY must be a publishable Stripe API key.');
    if (secretMode && publicMode && secretMode !== publicMode) errors.push('Stripe secret and publishable keys must use the same mode.');
    if (!['test', 'live'].includes(mode)) errors.push('Set STRIPE_MODE explicitly to test or live (required for production runtimes).');
    if (mode && secretMode && mode !== secretMode) errors.push('STRIPE_MODE must match the API key mode.');
    if (secretMode === 'live' && env.NODE_ENV !== 'production') errors.push('Live Stripe keys are blocked outside a production runtime.');
    let clientHost;
    try { clientHost = new URL(env.CLIENT_URL).hostname; } catch (_) { /* Other config validates the application URL. */ }
    if (secretMode === 'test' && ['sidebuilds.online', 'www.sidebuilds.online'].includes(clientHost)) errors.push('Test Stripe keys cannot serve the production SideBuilds website. Use an isolated test app and database.');
    if (!/^whsec_[A-Za-z0-9_]+$/.test(env.STRIPE_WEBHOOK_SECRET || '')) errors.push('STRIPE_WEBHOOK_SECRET is required; unsigned webhooks are never accepted.');
    if (env.FEATURE_STRIPE_PAYMENTS === 'false') errors.push('Stripe provider access is disabled in this environment.');
    return { valid: errors.length === 0, mode: mode || 'unconfigured', secretMode, publicMode, errors };
}

function unavailableError() {
    return Object.assign(new Error('Payments are unavailable because Stripe is disabled or its environment settings do not match.'), { code: 'STRIPE_CONFIGURATION_INVALID', status: 503 });
}

// Guard every SDK method, including callers outside payment routes. Never expose an unguarded client.
function guardStripeClient(client, configuration) {
    const cache = new WeakMap();
    function protect(target) {
        if (cache.has(target)) return cache.get(target);
        const proxy = new Proxy(target, { get(object, property) {
            const value = Reflect.get(object, property);
            if (typeof value === 'function') return (...args) => {
                if (!configuration.valid) throw unavailableError();
                return Reflect.apply(value, object, args);
            };
            return value && typeof value === 'object' ? protect(value) : value;
        } });
        cache.set(target, proxy);
        return proxy;
    }
    return protect(client);
}

function assertStripeEventMode(event, configuration) {
    if (!configuration.valid) throw unavailableError();
    const expectedLive = configuration.mode === 'live';
    if (!event || typeof event.livemode !== 'boolean' || event.livemode !== expectedLive ||
        (event.data?.object?.livemode !== undefined && event.data.object.livemode !== expectedLive)) {
        throw Object.assign(new Error('Stripe event mode does not match this environment.'), { status: 400, code: 'STRIPE_EVENT_MODE_MISMATCH' });
    }
}

module.exports = { keyMode, inspectStripeEnvironment, guardStripeClient, assertStripeEventMode, unavailableError };
