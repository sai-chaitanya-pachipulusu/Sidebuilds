// All supported build entrypoints validate browser-bound values before compilation.
process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';
require('react-scripts/config/env');
const { validateStripeBrowserEnvironment } = require('./stripe-build-safety.cjs');
const errors = validateStripeBrowserEnvironment(process.env);
if (errors.length) {
    console.error('Browser payment configuration rejected:\n' + errors.join('\n'));
    process.exit(1);
}
require('react-scripts/scripts/build');
