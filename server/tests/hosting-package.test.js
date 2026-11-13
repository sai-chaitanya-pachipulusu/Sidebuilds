const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { packageHosting } = require('../../client/scripts/package-hosting.cjs');

test('hosting rejects a browser manifest referencing missing assets before publishing output', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sidebuilds-hosting-'));
    try {
        fs.mkdirSync(path.join(root, 'client/build'), { recursive: true });
        fs.writeFileSync(path.join(root, 'client/build/asset-manifest.json'), JSON.stringify({ files: { main: '/static/js/missing.js' } }));
        assert.throws(() => packageHosting(root), /Browser build is incomplete/);
        assert.equal(fs.existsSync(path.join(root, '.vercel/output/config.json')), false);
    } finally {
        assert.equal(path.dirname(root), fs.realpathSync(os.tmpdir()));
        fs.rmSync(root, { recursive: true, force: true });
    }
});
