/**
 * keepAlive.js
 * Pings the server every 9 minutes to prevent Render from spinning down.
 * Render free tier spins down after ~15 minutes of inactivity.
 * This runs silently in the background — no UI effect.
 */

const PING_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5002/api').replace('/api', '') + '/api/ping';
const PING_INTERVAL_MS = 9 * 60 * 1000; // 9 minutes

let pingTimer = null;

async function pingServer() {
    try {
        const res = await fetch(PING_URL, { method: 'GET', cache: 'no-store' });
        if (res.ok) {
            console.debug('[KeepAlive] Server pinged ✓');
        }
    } catch {
        // Silent fail — server may just be waking up from the ping
    }
}

export function startKeepAlive() {
    if (pingTimer) return; // Already running
    pingServer(); // Immediate first ping
    pingTimer = setInterval(pingServer, PING_INTERVAL_MS);
    console.debug('[KeepAlive] Started — pinging every 9 minutes');
}

export function stopKeepAlive() {
    if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
        console.debug('[KeepAlive] Stopped');
    }
}
