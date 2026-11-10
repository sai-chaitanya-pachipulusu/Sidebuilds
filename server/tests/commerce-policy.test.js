const { test } = require('node:test');
const assert = require('node:assert/strict');
const { commerceEnabled, requireCommerceEnabled } = require('../utils/commercePolicy');
test('live financial actions require explicit commercial approval; isolated test flows remain testable', () => {
    assert.equal(commerceEnabled({STRIPE_SECRET_KEY:'sk_live_synthetic'}), false);
    assert.equal(commerceEnabled({STRIPE_SECRET_KEY:'rk_live_synthetic',LIVE_COMMERCE_ENABLED:'false'}), false);
    assert.equal(commerceEnabled({STRIPE_MODE:'live'}), false);
    assert.equal(commerceEnabled({STRIPE_SECRET_KEY:'sk_live_synthetic',LIVE_COMMERCE_ENABLED:'true'}), true);
    assert.equal(commerceEnabled({STRIPE_SECRET_KEY:'sk_test_synthetic',STRIPE_MODE:'test'}), true);
});
test('paused live actions return an actionable error before invoking the operation', () => {
    const oldKey=process.env.STRIPE_SECRET_KEY, oldFlag=process.env.LIVE_COMMERCE_ENABLED;
    process.env.STRIPE_SECRET_KEY='sk_live_synthetic'; delete process.env.LIVE_COMMERCE_ENABLED;
    try {
        let status, body, invoked=false;
        const response={status(value){status=value;return this;},json(value){body=value;return this;}};
        requireCommerceEnabled({},response,()=>{invoked=true;});
        assert.equal(status,503);assert.equal(body.code,'LIVE_COMMERCE_PAUSED');assert.equal(invoked,false);
    } finally {
        if(oldKey===undefined)delete process.env.STRIPE_SECRET_KEY;else process.env.STRIPE_SECRET_KEY=oldKey;
        if(oldFlag===undefined)delete process.env.LIVE_COMMERCE_ENABLED;else process.env.LIVE_COMMERCE_ENABLED=oldFlag;
    }
});
