// Emit one explicit deployment containing both the browser assets and HTML renderer.
const fs = require('node:fs');
const path = require('node:path');

function packageHosting(root = path.resolve(__dirname, '../..')) {
    const build = path.join(root, 'client/build');
    const manifest = JSON.parse(fs.readFileSync(path.join(build, 'asset-manifest.json'), 'utf8'));
    for (const asset of Object.values(manifest.files)) {
        const relative = asset.replace(/^\//, '');
        const file = path.resolve(build, relative);
        if (!file.startsWith(build + path.sep) || !fs.existsSync(file)) {
            throw new Error('Browser build is incomplete: ' + relative);
        }
    }
    const output = path.resolve(root, '.vercel/output');
    if (path.relative(root, output).replace(/\\/g, '/') !== '.vercel/output') {
        throw new Error('Unexpected hosting output directory');
    }
    // This is exclusively generated deployment output under the checked project root.
    console.log('Packaging generated hosting output at ' + output);
    if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink()) throw new Error('Hosting output cannot be a link');
    fs.rmSync(output, { recursive: true, force: true });
    fs.cpSync(build, path.join(output, 'static'), {
        recursive: true,
        filter: source => !['index.html', 'robots.txt', 'sitemap.xml'].includes(path.basename(source))
    });
    const fn = path.join(output, 'functions/__site.func');
    fs.mkdirSync(path.join(fn, 'api'), { recursive: true });
    fs.mkdirSync(path.join(fn, 'client/build'), { recursive: true });
    fs.copyFileSync(path.join(root, 'client/scripts/site-renderer.cjs'), path.join(fn, 'api/site.js'));
    fs.copyFileSync(path.join(build, 'index.html'), path.join(fn, 'client/build/index.html'));
    fs.writeFileSync(path.join(fn, '.vc-config.json'), JSON.stringify({
        runtime: 'nodejs22.x', handler: 'api/site.js', launcherType: 'Nodejs', maxDuration: 60
    }, null, 2));
    const routes = [
        { src: '/api/(.*)', dest: 'https://sidebuilds.onrender.com/api/$1' },
        { src: '/socket.io/(.*)', dest: 'https://sidebuilds.onrender.com/socket.io/$1' },
        { src: '/static/(.*)', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
        { handle: 'filesystem' },
        { src: '/(.*)', dest: '/__site?__route=$1' }
    ];
    fs.writeFileSync(path.join(output, 'config.json'), JSON.stringify({ version: 3, routes }, null, 2));
    console.log('Packaged ' + Object.keys(manifest.files).length + ' checked browser assets and the HTML renderer.');
    return output;
}

if (require.main === module) packageHosting();
module.exports = { packageHosting };
