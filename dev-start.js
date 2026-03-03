#!/usr/bin/env node
/**
 * dev-start.js
 * Starts both the backend (port 5002) and frontend (port 3002) dev servers.
 * Handles port conflicts gracefully.
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const net = require('net');

const BACKEND_PORT = 5002;
const FRONTEND_PORT = 3002;

const serverDir = path.join(__dirname, 'server');
const clientDir = path.join(__dirname, 'client');

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

function log(prefix, msg) {
    process.stdout.write(`${prefix} ${msg}\n`);
}

/** Check if a port is already in use */
function isPortInUse(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(true));
        server.once('listening', () => { server.close(); resolve(false); });
        server.listen(port, '127.0.0.1');
    });
}

/** Kill whatever is listening on a port (Windows-safe, no shell string) */
function killPort(port) {
    return new Promise((resolve) => {
        if (process.platform !== 'win32') {
            exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, resolve);
            return;
        }
        // Windows: use netstat to find PID, then taskkill
        exec(`netstat -aon`, (err, stdout) => {
            if (err || !stdout) return resolve();
            const lines = stdout.split('\n');
            const pids = new Set();
            for (const line of lines) {
                // Match lines like:  TCP    0.0.0.0:5002    ...    LISTENING    1234
                if (line.includes(`:${port}`) && line.includes('LISTENING')) {
                    const parts = line.trim().split(/\s+/);
                    const pid = parts[parts.length - 1];
                    if (pid && !isNaN(pid) && pid !== '0') pids.add(pid);
                }
            }
            if (pids.size === 0) return resolve();
            let done = 0;
            for (const pid of pids) {
                // taskkill args as array — no shell string, no space issues
                const tk = spawn('taskkill', ['/F', '/PID', pid], { stdio: 'ignore' });
                tk.on('close', () => { if (++done === pids.size) resolve(); });
                tk.on('error', () => { if (++done === pids.size) resolve(); });
            }
        });
    });
}

// ─────────────────────────────────────────────
// Step 1: Free ports
// ─────────────────────────────────────────────

async function freePorts() {
    log('🧹', 'Checking ports...');
    const [backendBusy, frontendBusy] = await Promise.all([
        isPortInUse(BACKEND_PORT),
        isPortInUse(FRONTEND_PORT),
    ]);

    const promises = [];
    if (backendBusy)  { log('  ⚡', `Port ${BACKEND_PORT} in use — killing...`);  promises.push(killPort(BACKEND_PORT)); }
    if (frontendBusy) { log('  ⚡', `Port ${FRONTEND_PORT} in use — killing...`); promises.push(killPort(FRONTEND_PORT)); }
    await Promise.all(promises);

    if (backendBusy || frontendBusy) {
        // Brief pause after kill before binding
        await new Promise(r => setTimeout(r, 800));
    }
    log('  ✅', 'Ports ready');
}

// ─────────────────────────────────────────────
// Step 2: Start backend
// ─────────────────────────────────────────────

function startBackend() {
    log('\n🔧', `Starting backend on port ${BACKEND_PORT}...`);

    return new Promise((resolve, reject) => {
        // Use array args — never a shell string
        const proc = spawn('npm', ['run', 'dev'], {
            cwd: serverDir,
            stdio: 'pipe',
            shell: false,   // avoid shell=true with spaces in paths
            // On Windows, npm is npm.cmd — handle gracefully
            ...(process.platform === 'win32' && { shell: true }),
        });

        let resolved = false;
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                log('  ⏰', 'Backend timeout — assuming it started');
                resolve(proc);
            }
        }, 20000);

        proc.stdout.on('data', (d) => {
            const s = d.toString();
            process.stdout.write(`[SERVER] ${s}`);
            if (!resolved && (s.includes(`port ${BACKEND_PORT}`) || s.includes('listening'))) {
                resolved = true;
                clearTimeout(timeout);
                log('  ✅', `Backend running on http://localhost:${BACKEND_PORT}`);
                resolve(proc);
            }
        });

        proc.stderr.on('data', (d) => process.stderr.write(`[SERVER ERR] ${d}`));
        proc.on('error', (e) => { clearTimeout(timeout); if (!resolved) { resolved = true; reject(e); } });
        proc.on('close', (code) => log('🔴', `Backend exited (${code})`));
    });
}

// ─────────────────────────────────────────────
// Step 3: Start frontend
// ─────────────────────────────────────────────

function startFrontend() {
    log('\n⚛️ ', `Starting frontend on port ${FRONTEND_PORT}...`);

    return new Promise((resolve, reject) => {
        const proc = spawn('npm', ['start'], {
            cwd: clientDir,
            stdio: 'pipe',
            shell: process.platform === 'win32',
            env: {
                ...process.env,
                PORT: String(FRONTEND_PORT),
                BROWSER: 'none',
                CI: 'false',
                FORCE_COLOR: '1',
            },
        });

        let resolved = false;
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                log('  ⏰', 'Frontend timeout — assuming it started');
                resolve(proc);
            }
        }, 60000);

        proc.stdout.on('data', (d) => {
            const s = d.toString();
            process.stdout.write(`[CLIENT] ${s}`);
            if (!resolved && (
                s.includes('webpack compiled') ||
                s.includes('compiled successfully') ||
                s.includes(`localhost:${FRONTEND_PORT}`)
            )) {
                resolved = true;
                clearTimeout(timeout);
                log('  ✅', `Frontend running on http://localhost:${FRONTEND_PORT}`);
                resolve(proc);
            }
            // CRA asks "Something is running on port X, use Y?" — answer no and handle
            if (s.includes('Something is already running')) {
                resolved = true;
                clearTimeout(timeout);
                log('  ⚠️ ', `Port ${FRONTEND_PORT} still busy after cleanup. Kill it manually then retry.`);
                proc.kill();
                reject(new Error(`Port ${FRONTEND_PORT} busy`));
            }
        });

        proc.stderr.on('data', (d) => process.stderr.write(`[CLIENT ERR] ${d}`));
        proc.on('error', (e) => { clearTimeout(timeout); if (!resolved) { resolved = true; reject(e); } });
        proc.on('close', (code) => {
            log('🔴', `Frontend exited (${code})`);
        });
    });
}

// ─────────────────────────────────────────────
// Graceful shutdown
// ─────────────────────────────────────────────

let backend = null;
let frontend = null;

function shutdown() {
    log('\n🛑', 'Shutting down...');
    if (backend) try { backend.kill('SIGTERM'); } catch (_) {}
    if (frontend) try { frontend.kill('SIGTERM'); } catch (_) {}
    setTimeout(() => process.exit(0), 1500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
    log('🚀', 'SideBuilds Dev Startup');
    log('═══════════════════════', '');

    try {
        await freePorts();

        backend  = await startBackend();

        // Give backend a moment to fully init before starting webpack
        await new Promise(r => setTimeout(r, 2000));

        frontend = await startFrontend();

        log('\n🎉', 'Both servers running!');
        log('   Backend : ', `http://localhost:${BACKEND_PORT}/api`);
        log('   Frontend: ', `http://localhost:${FRONTEND_PORT}`);
        log('\n   Press Ctrl+C to stop.\n', '');

    } catch (err) {
        log('\n💥', `Startup failed: ${err.message}`);
        log('   Try:', 'npm run dev:server  (backend only)');
        log('   Try:', 'npm run dev:client  (frontend only)');
        shutdown();
    }
}

main();