// Live charges/releases stay closed until the commercial acceptance gate is approved.
// This is separate from key validity: status reads and signed webhooks still work.
function commerceEnabled(env = process.env) {
    const isLive = /^(?:sk|rk)_live_/.test(env.STRIPE_SECRET_KEY || '') || env.STRIPE_MODE === 'live';
    return !isLive || env.LIVE_COMMERCE_ENABLED === 'true';
}
function requireCommerceEnabled(req, res, next) {
    if (!commerceEnabled()) return res.status(503).json({
        code: 'LIVE_COMMERCE_PAUSED',
        error: 'Purchases and payment release are paused while we complete payment verification. You can still browse and discuss projects.'
    });
    next();
}
module.exports = { commerceEnabled, requireCommerceEnabled };
