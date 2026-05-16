const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db'); // Adjust path as needed
const { authLimiter } = require('../middleware/rateLimiting');
const emailService = require('../services/emailService');

console.log('AUTH_ROUTES: File loaded and router being configured.');

const router = express.Router();
const SALT_ROUNDS = 10; // Cost factor for bcrypt hashing
const PASSWORD_RESET_TOKEN_TTL_MINUTES = 60;

const getClientUrl = () => {
    return (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://sidebuilds.online').replace(/\/$/, '');
};

const hashResetToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

const ensurePasswordResetTable = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            used_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
};

// Helper function to generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                is_admin: Boolean(user.is_admin)
            }
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' } // Token expires in 24 hours
    );
};

// Helper function to verify JWT token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
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
router.post('/register', async (req, res) => {
    console.log('AUTH_ROUTES: Reached /register handler');
    const { username, email, password, first_name, last_name } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Auto-generate username from email if not provided
    const finalUsername = username || email.split('@')[0];

    try {
        // Check if user already exists (by email or username)
        const userExists = await db.query(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [email, finalUsername]
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
            [userId, finalUsername, email, passwordHash, first_name || null, last_name || null]
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
        console.error("Full error:", err);
        res.status(500).json({ message: 'Server error during registration.', error: err.message });
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
        // Find user by email
        const userResult = await db.query(
            'SELECT user_id, username, email, password_hash, is_admin FROM users WHERE email = ?',
            [email]
        );

        if (!userResult.rows || userResult.rows.length === 0) {
            if (process.env.NODE_ENV !== 'production') {
                console.log('[AUTH] Login failed - user not found');
            }
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
        res.status(500).json({ message: 'Server error during login.', error: err.message });
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
        await ensurePasswordResetTable();

        const userResult = await db.query(
            'SELECT user_id, email, username, first_name FROM users WHERE LOWER(email) = ?',
            [normalizedEmail]
        );

        if (!userResult.rows || userResult.rows.length === 0) {
            return res.json({ message: genericMessage });
        }

        const user = userResult.rows[0];
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashResetToken(rawToken);
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);

        await db.query(
            'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL',
            [user.user_id]
        );

        await db.query(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
            [user.user_id, tokenHash, expiresAt.toISOString()]
        );

        const resetUrl = `${getClientUrl()}/reset-password?token=${rawToken}`;
        const displayName = user.first_name || user.username || 'there';

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

        return res.json({ message: genericMessage });
    } catch (err) {
        console.error('Forgot password error:', err.message);
        return res.status(500).json({ message: 'Server error while requesting password reset.' });
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
            await client.query(
                'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?',
                [resetToken.id]
            );
        });

        return res.json({ message: 'Password reset successful. You can now log in.' });
    } catch (err) {
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

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get the user from database to ensure they still exist
        const userResult = await db.query(
            'SELECT user_id, username, email, is_admin FROM users WHERE user_id = ?',
            [decoded.user.user_id]
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
router.post('/verify', async (req, res) => {
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

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