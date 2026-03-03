#!/usr/bin/env node
/**
 * cleanup-ports.js
 * Kills any processes using the ports needed for development.
 * Backend: 5002, Frontend: 3002
 */

const { exec } = require('child_process');

const PORTS = [5002, 3002];

function killPort(port) {
    return new Promise((resolve) => {
        // Use cmd.exe directly with proper quoting to avoid path-with-spaces issues
        if (process.platform === 'win32') {
            exec(`netstat -aon | findstr :${port} | findstr LISTENING`, { shell: 'cmd.exe' }, (err, stdout) => {
                if (!stdout || !stdout.trim()) {
                    console.log(`  ✅ Port ${port}: already free`);
                    return resolve();
                }
                // Extract PID from last column
                const pids = stdout.trim().split('\n')
                    .map(line => line.trim().split(/\s+/).pop())
                    .filter(pid => pid && !isNaN(pid));
                
                if (pids.length === 0) return resolve();
                
                Promise.all(pids.map(pid => new Promise(r => {
                    exec(`taskkill /F /PID ${pid}`, { shell: 'cmd.exe' }, () => r());
                }))).then(() => {
                    console.log(`  ✅ Port ${port} cleared`);
                    resolve();
                });
            });
        } else {
            exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, (err) => {
                console.log(`  ✅ Port ${port} cleared`);
                resolve();
            });
        }
    });
}

async function main() {
    console.log('🧹 Cleaning up development ports...');
    await Promise.all(PORTS.map(killPort));
    console.log('✅ Port cleanup complete');
    process.exit(0);
}

main();
