/**
 * Script to start the client on port 3001
 * This ensures consistency with the server-side redirects
 */
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting client on port 3001...');

// Set environment variables
process.env.PORT = '3001';
process.env.REACT_APP_API_URL = 'http://localhost:5001/api';

// Start the React development server
const clientProcess = spawn('npm', ['run', 'start'], {
  stdio: 'inherit',
  shell: true,
  env: { 
    ...process.env,
    PORT: '3001'
  }
});

clientProcess.on('error', (error) => {
  console.error('Failed to start client:', error);
});

// Handle process exit
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down client...');
  clientProcess.kill('SIGINT');
  process.exit(0);
}); 