const express = require('express');
const bcrypt = require('bcryptjs');
const { signToken, verifyToken: verifyJwtToken } = require('../utils/jwt');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db'); // Adjust path as needed
const { authLimiter } = require('../middleware/rateLimiting');
const emailService = require('../services/emailService');

console.log('AUTH_ROUTES: File loaded and router being configured.');

const router = express.Router();
const SALT_ROUNDS = 10; // Cost factor for bcrypt hashing
const PASSWORD_RESET_TOKEN_TTL_MINUTES = 60;
// Precomputed hash of random bytes: used to equalize login timing for
// unknown emails (never matches a real password).
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS);

const getClientUrl = () => {
    return (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://sidebuilds.online').replace(/\/$/, '');
};

const hashResetToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

const isSqliteBackend = () => Boolean(db.db);

const ensurePasswordResetTable = async () => {
    if (isSqliteBackend()) {
        await db.query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                token_hash TEXT NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                used_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        `);
        return;
    }
    await db.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    `);
};

// Helper function to generate JWT token
const generateToken = (user) => {
    return signToken(
        {
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                is_admin: Boolean(user.is_admin)
            }
        },
        { expiresIn: '24h' } // Token expires in 24 hours
    );
};

// Helper function to verify JWT token
const verifyToken = (token) => {
    try {
        return verifyJwtToken(token);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        } else {
            throw new Error('Token verification failed');
        }
    }
};

// --- Registration Route --- 
// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
    console.log('AUTH_ROUTES: Reached /register handler');
    const { username, email, password, first_name, last_name } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
        return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    if (String(password).length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Auto-generate username from email if not provided
    const finalUsername = username || normalizedEmail.split('@')[0];

    try {
        // Check if user already exists (by email or username)
        const userExists = await db.query(
            'SELECT user_id FROM users WHERE LOWER(TRIM(email)) = ? OR username = ?',
            [normalizedEmail, finalUsername]
        );

        if (userExists.rows.length > 0) {
            return res.status(409).json({ message: 'Email or username already exists.' });
        }

        // Hash the password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Generate UUID for new user
        const userId = uuidv4();

        // Insert new user into the database
        const insertResult = await db.query(
            'INSERT INTO users (user_id, username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, finalUsername, normalizedEmail, passwordHash, first_name || null, last_name || null]
        );

        // For SQLite, get the inserted user by user_id
        const newUser = await db.query(
            'SELECT user_id, username, email, is_admin, created_at FROM users WHERE user_id = ?',
            [userId]
        );

        if (!newUser.rows || newUser.rows.length === 0) {
            throw new Error('Failed to create user account');
        }

        const userData = newUser.rows[0];

        // Generate JWT token
        const tokenPayload = {
            user: {
                id: userData.user_id,
                username: userData.username,
                email: userData.email
            }
        };

        const token = generateToken(userData);

        // Respond with the token and user info (excluding password hash)
        res.status(201).json({ token, user: userData });

    } catch (err) {
        console.error("Registration error:", err.message);
        // Unique-constraint violations (concurrent duplicate signups that
        // slipped past the check-then-insert window) are conflicts, not 500s.
        if (err.code === '23505' || /UNIQUE constraint failed/i.test(err.message || '')) {
            return res.status(409).json({ message: 'Email or username already exists.' });
        }
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// --- Login Route --- 
// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log('[AUTH] Login attempt');
    }
    
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // Find user by email (case-insensitive so legacy mixed-case emails still work)
        const userResult = await db.query(
            'SELECT user_id, username, email, password_hash, is_admin FROM users WHERE LOWER(TRIM(email)) = ?',
            [String(email).trim().toLowerCase()]
        );

        if (!userResult.rows || userResult.rows.length === 0) {
            if (process.env.NODE_ENV !== 'production') {
                console.log('[AUTH] Login failed - user not found');
            }
            // Burn a bcrypt comparison so response time doesn't reveal
            // whether the email exists (account-enumeration defense).
            await bcrypt.compare(password, DUMMY_HASH);
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const user = userResult.rows[0];

        // Compare submitted password with stored hash
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            if (process.env.NODE_ENV !== 'production') {
                console.log('[AUTH] Login failed - invalid password');
            }
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Generate JWT token
        const tokenPayload = {
            user: {
                id: user.user_id,
                username: user.username,
                email: user.email
            }
        };

        const token = generateToken(user);
        await db.query('UPDATE users SET last_login_at=CURRENT_TIMESTAMP,login_count=COALESCE(login_count,0)+1 WHERE user_id=$1', [user.user_id]);

        // Respond with the token and user info (excluding password hash)
        // Important: Do not send the password_hash back to the client
        const { password_hash, ...userWithoutPassword } = user;
        res.json({ token, user: userWithoutPassword });

    } catch (err) {
        console.error("Login error:", err.message);
        console.error("Login error stack:", err.stack);
        console.error("Login error details:", {
            name: err.name,
            code: err.code,
            detail: err.detail,
            hint: err.hint
        });
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// --- Forgot Password Route ---
// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const genericMessage = 'If an account exists for that email, a password reset link has been sent.';

    try {
        const emailStatus = emailService.getEmailStatus();
        if (emailService.isDeployedBackend() && !emailStatus.configured) {
            console.error(
                '[AUTH] Forgot password blocked: SMTP not configured. Missing:',
                emailStatus.missing.join(', ')
            );
            return res.status(503).json({
                message:
                    'Password recovery emails are currently unavailable. Please try again once email delivery has been restored.',
                code: 'EMAIL_NOT_CONFIGURED'
            });
        }

        await ensurePasswordResetTable();

        const userResult = await db.query(
            'SELECT user_id, email, username, first_name FROM users WHERE LOWER(TRIM(email)) = ?',
            [normalizedEmail]
        );

        if (!userResult.rows || userResult.rows.length === 0) {
            return res.json({ message: genericMessage });
        }

        const user = userResult.rows[0];
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashResetToken(rawToken);
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);

        const resetUrl = `${getClientUrl()}/reset-password?token=${rawToken}`;
        const displayName = user.first_name || user.username || 'there';

        await db.query(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
            [user.user_id, tokenHash, expiresAt.toISOString()]
        );

        try {
            await emailService.sendCustomEmail(
                user.email,
                'Reset your SideBuilds password',
                `Hi ${displayName},\n\nUse this link to reset your SideBuilds password. This link expires in ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.\n\nSideBuilds Team`,
                `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #6366f1;">Reset your password</h2>
                    <p>Hi ${displayName},</p>
                    <p>Use the button below to reset your SideBuilds password. This link expires in ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes.</p>
                    <p>
                        <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a>
                    </p>
                    <p style="color: #6b7280; font-size: 14px;">If the button does not work, copy and paste this URL into your browser:<br>${resetUrl}</p>
                    <p style="color: #6b7280; font-size: 14px;">If you did not request this, you can ignore this email.</p>
                </div>
            `
            );

            await db.query(
                'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL AND token_hash <> ?',
                [user.user_id, tokenHash]
            );
        } catch (emailErr) {
            console.error('Forgot password email error:', emailErr.message);
            await db.query('DELETE FROM password_reset_tokens WHERE token_hash = ?', [tokenHash]);
            const smtpConfigured = emailService.getEmailStatus().configured;
            if (emailService.isDeployedBackend() && smtpConfigured) {
                return res.status(503).json({
                    message:
                        'We could not send the reset email right now (mail server rejected the message). Try again shortly or contact support.',
                    code: 'EMAIL_SEND_FAILED'
                });
            }
            throw emailErr;
        }

        return res.json({ message: genericMessage });
    } catch (err) {
        console.error('Forgot password error:', err.message);
        return res.status(500).json({ message: 'Server error while requesting password reset.' });
    }
});

// Validate a bearer link before asking for a password. Never consumes it or
// reveals an account identity. Reads have their own bucket, separate from login.
const resetLinkLimiter = require('express-rate-limit')({
    windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
    message: { message: 'Too many link checks. Please try again later.' }
});
router.post('/reset-password/validate', resetLinkLimiter, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const token = req.body.token;
    const invalid = () => res.status(400).json({ valid: false, code: 'RESET_LINK_INVALID', message: 'Invalid or expired reset link.' });
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return invalid();
    try {
        await ensurePasswordResetTable();
        const result = await db.query('SELECT expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?', [hashResetToken(token)]);
        const row = result.rows?.[0];
        if (!row || row.used_at || !(new Date(row.expires_at) > new Date())) return invalid();
        return res.json({ valid: true });
    } catch (_) {
        return res.status(503).json({ message: 'The reset link could not be checked. Please try again.' });
    }
});

// --- Reset Password Route ---
// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ message: 'Reset token and new password are required.' });
    }

    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    try {
        await ensurePasswordResetTable();

        const tokenHash = hashResetToken(String(token));
        const resetResult = await db.query(
            `SELECT id, user_id, expires_at, used_at
             FROM password_reset_tokens
             WHERE token_hash = ?`,
            [tokenHash]
        );

        if (!resetResult.rows || resetResult.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired reset link.' });
        }

        const resetToken = resetResult.rows[0];
        const expiresAt = new Date(resetToken.expires_at);

        if (resetToken.used_at || Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
            return res.status(400).json({ message: 'Invalid or expired reset link.' });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        await db.withTransaction(async (client) => {
            await client.query(
                'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                [passwordHash, resetToken.user_id]
            );
            // Consume the token atomically: the conditional update means two
            // concurrent submissions of the same link cannot both succeed.
            const consumeResult = await client.query(
                'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ? AND used_at IS NULL',
                [resetToken.id]
            );
            if (!consumeResult.rowCount || consumeResult.rowCount === 0) {
                throw new Error('RESET_TOKEN_ALREADY_USED');
            }
        });

        return res.json({ message: 'Password reset successful. You can now log in.' });
    } catch (err) {
        if (err.message === 'RESET_TOKEN_ALREADY_USED') {
            return res.status(400).json({ message: 'Invalid or expired reset link.' });
        }
        console.error('Reset password error:', err.message);
        return res.status(500).json({ message: 'Server error while resetting password.' });
    }
});

// --- Token Refresh Route ---
// POST /api/auth/refresh
router.post('/refresh', authLimiter, async (req, res) => {
    console.log('AUTH_ROUTES: Reached /refresh handler');

    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided.' });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        if (!token) {
            return res.status(401).json({ message: 'No token provided.' });
        }

        // Verify the token. Tokens expired within the grace window may still be
        // refreshed so active users aren't forced to log in again every 24h;
        // the signature is always verified either way.
        const REFRESH_GRACE_MS = 15 * 60 * 1000;
        let decoded;
        try {
            decoded = verifyJwtToken(token);
        } catch (verifyErr) {
            if (verifyErr.name !== 'TokenExpiredError') {
                throw verifyErr;
            }
            decoded = verifyJwtToken(token, { ignoreExpiration: true });
            const expiredAt = (decoded.exp || 0) * 1000;
            if (!expiredAt || Date.now() - expiredAt > REFRESH_GRACE_MS) {
                return res.status(401).json({ message: 'Token expired. Please log in again.' });
            }
        }

        const tokenUserId = decoded.user?.user_id || decoded.user?.id;
        if (!tokenUserId) {
            return res.status(401).json({ message: 'Invalid token payload.' });
        }

        // Get the user from database to ensure they still exist
        const userResult = await db.query(
            'SELECT user_id, username, email, is_admin FROM users WHERE user_id = ?',
            [tokenUserId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'User not found.' });
        }

        const user = userResult.rows[0];

        // Generate a new token
        const newToken = generateToken(user);

        // Respond with the new token and updated user info
        res.json({
            token: newToken,
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                is_admin: Boolean(user.is_admin)
            }
        });

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired. Please log in again.' });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token. Please log in again.' });
        } else {
            console.error('Token refresh error:', error.message);
            return res.status(500).json({ message: 'Server error during token refresh.' });
        }
    }
});

// --- Token Verification Route ---
// POST /api/auth/verify
router.post('/verify', authLimiter, async (req, res) => {
    console.log('AUTH_ROUTES: Reached /verify handler');

    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided.' });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        if (!token) {
            return res.status(401).json({ message: 'No token provided.' });
        }

        // Verify the token
        const decoded = verifyJwtToken(token);

        // Get the user from database to ensure they still exist
        const userResult = await db.query(
            'SELECT user_id, username, email, is_admin FROM users WHERE user_id = ?',
            [decoded.user.user_id]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'User not found.' });
        }

        const user = userResult.rows[0];

        // Respond with user info (token is still valid)
        res.json({
            valid: true,
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                is_admin: Boolean(user.is_admin)
            }
        });

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ valid: false, message: 'Token expired. Please log in again.' });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ valid: false, message: 'Invalid token. Please log in again.' });
        } else {
            console.error('Token verification error:', error.message);
            return res.status(500).json({ valid: false, message: 'Server error during token verification.' });
        }
    }
});

module.exports = router;
