const { execSync } = require('child_process');

console.log('Restarting servers...');

try {
  execSync('node cleanup-ports.js', { stdio: 'inherit', shell: true });
} catch (e) {
  console.log('Port cleanup completed (or no ports to clean).');
}

try {
  execSync('node dev-start.js', { stdio: 'inherit', shell: true });
} catch (e) {
  console.error('Failed to start dev servers:', e.message);
  process.exit(1);
}
