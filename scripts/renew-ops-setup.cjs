// Renew only an expired, unclaimed invitation for the exact bootstrapped operator.
// An activated account must use normal recovery; this never changes a password.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function verifyUnclaimedSetup(state, user, token, latestId, now = new Date()) {
    if (!user || user.user_id !== state.userId || user.username !== state.username || user.email !== state.email || user.is_admin !== true || user.is_test === true) throw new Error('The recorded operations identity no longer matches.');
    const fingerprint = crypto.createHash('sha256').update(user.password_hash).digest('hex');
    if (fingerprint !== state.passwordFingerprint) throw new Error('This account already has a chosen password. Its setup cannot be renewed.');
    if (!token || String(token.id) !== String(state.resetTokenId) || token.used_at || String(latestId) !== String(state.resetTokenId)) throw new Error('The recorded setup link was used or replaced.');
    if (!(new Date(token.expires_at) <= now)) throw new Error('The existing setup invitation has not expired.');
}

async function renew({ connectionString, ca, privateDir, apply = false }) {
    const { Client } = require('../server/node_modules/pg');
    const statePath = path.join(privateDir, 'state.json');
    const setupPath = path.join(privateDir, 'ADMIN_SETUP.md');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const db = new Client({ connectionString, ssl: { rejectUnauthorized: true, ca }, connectionTimeoutMillis: 12000 });
    let committed = false;
    try {
        await db.connect(); await db.query('BEGIN'); await db.query("SET LOCAL lock_timeout='5s'");
        const user = (await db.query('SELECT user_id,username,email,password_hash,is_admin,is_test FROM users WHERE user_id=$1 FOR UPDATE', [state.userId])).rows[0];
        const token = (await db.query('SELECT id,expires_at,used_at FROM password_reset_tokens WHERE id=$1 AND user_id::text=$2::text FOR UPDATE', [state.resetTokenId, state.userId])).rows[0];
        const latest = (await db.query('SELECT id FROM password_reset_tokens WHERE user_id::text=$1::text ORDER BY created_at DESC,id DESC LIMIT 1', [state.userId])).rows[0];
        verifyUnclaimedSetup(state, user, token, latest?.id);
        if (!apply) { await db.query('ROLLBACK'); return { rehearsal: true, success: true, username: state.username, expired: true, passwordUnchanged: true, linkUnused: true }; }
        const rawToken = crypto.randomBytes(32).toString('hex');
        const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000);
        await db.query('UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE user_id::text=$1::text AND used_at IS NULL', [state.userId]);
        const replacement = (await db.query('INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,$3) RETURNING id', [state.userId, hash, expires])).rows[0];
        const nextState = { ...state, resetTokenId: replacement.id, expiresAt: expires.toISOString() };
        const localExpiry = expires.toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' });
        const content = `# Private SideBuilds operations setup\n\nUse this renewed invitation. Earlier setup links no longer work. Keep this file private.\n\nUsername: ${state.username}\n\nLogin email: ${state.email}\n\n[Choose your administrator password](https://www.sidebuilds.online/reset-password?token=${rawToken})\n\nExpires: ${localExpiry} Eastern (${expires.toISOString()}). The link works once and expires in one hour.\n\nChoose your password yourself, then sign in with the login email above and open [Payment operations](https://www.sidebuilds.online/admin). No password was changed, saved or sent by email.\n`;
        fs.writeFileSync(setupPath + '.next', content);
        fs.writeFileSync(statePath + '.next', JSON.stringify(nextState, null, 2));
        await db.query('COMMIT'); committed = true;
        fs.renameSync(setupPath + '.next', setupPath); fs.renameSync(statePath + '.next', statePath);
        return { success: true, username: state.username, renewed: true, passwordUnchanged: true, expiresAt: expires.toISOString(), setupFile: setupPath };
    } catch (error) { if (!committed) await db.query('ROLLBACK').catch(() => {}); throw error; }
    finally { await db.end(); }
}
module.exports = { verifyUnclaimedSetup, renew };
