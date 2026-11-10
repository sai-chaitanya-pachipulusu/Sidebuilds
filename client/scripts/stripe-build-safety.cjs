function validateStripeBrowserEnvironment(env) {
    const errors = [];
    for (const [name, value] of Object.entries(env)) {
        if (name.startsWith('REACT_APP_') && /\b(?:(?:sk|rk)_(?:test|live)_[A-Za-z0-9_]+|whsec_[A-Za-z0-9_]+)/.test(value || '')) {
            errors.push(`${name} contains a server-only Stripe credential. Browser builds must never include secret or webhook keys.`);
        }
    }
    const key = env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
    const mode = env.REACT_APP_STRIPE_MODE;
    if (key && !/^pk_(test|live)_[A-Za-z0-9_]+$/.test(key)) errors.push('REACT_APP_STRIPE_PUBLISHABLE_KEY must be a publishable key.');
    if (mode && !['test', 'live'].includes(mode)) errors.push('REACT_APP_STRIPE_MODE must be test or live.');
    if (key && mode && !key.startsWith(`pk_${mode}_`)) errors.push('Browser Stripe key and REACT_APP_STRIPE_MODE must match.');
    let apiHost;
    try { apiHost = new URL(env.REACT_APP_API_URL).hostname; } catch (_) { /* Missing API URLs use the existing app defaults. */ }
    if ((mode === 'test' || key?.startsWith('pk_test_')) && ['sidebuilds.onrender.com', 'api.sidebuilds.online'].includes(apiHost)) errors.push('Test Stripe browser settings cannot target the production API. Use an isolated test API and database.');
    return errors;
}
module.exports = { validateStripeBrowserEnvironment };
