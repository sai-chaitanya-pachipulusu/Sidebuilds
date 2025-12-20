const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db'); // Adjust path as needed
const { authLimiter } = require('../middleware/rateLimiting');

console.log('AUTH_ROUTES: File loaded and router being configured.');

const router = express.Router();
const SALT_ROUNDS = 10; // Cost factor for bcrypt hashing

// Helper function to generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email
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
        console.log('Registration attempt for:', email, 'username:', finalUsername);
        
        // Check if user already exists (by email or username)
        const userExists = await db.query(
            'SELECT user_id, email, username FROM users WHERE email = ? OR username = ?',
            [email, finalUsername]
        );

        if (userExists.rows && userExists.rows.length > 0) {
            const existingUser = userExists.rows[0];
            const conflictField = existingUser.email === email ? 'email' : 'username';
            console.log('Registration blocked - user exists:', conflictField);
            return res.status(409).json({ 
                message: `An account with this ${conflictField} already exists.`,
                field: conflictField 
            });
        }

        // Hash the password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Generate UUID for new user
        const userId = uuidv4();
        console.log('Creating user with ID:', userId);

        // Insert new user into the database
        await db.query(
            'INSERT INTO users (user_id, username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, finalUsername, email, passwordHash, first_name || null, last_name || null]
        );

        // Fetch the inserted user
        const newUser = await db.query(
            'SELECT user_id, username, email, created_at FROM users WHERE user_id = ?',
            [userId]
        );

        if (!newUser.rows || newUser.rows.length === 0) {
            console.error('User insert succeeded but fetch failed for ID:', userId);
            throw new Error('Failed to verify user account creation');
        }

        const userData = newUser.rows[0];
        console.log('User created successfully:', userData.email);

        // Generate JWT token
        const token = generateToken(userData);

        // Respond with the token and user info (excluding password hash)
        res.status(201).json({ token, user: userData });

    } catch (err) {
        console.error("Registration error:", err.message);
        console.error("Error stack:", err.stack);
        
        // Check for specific database errors
        if (err.code === '23505' || err.message?.includes('UNIQUE constraint')) {
            // Duplicate key violation
            return res.status(409).json({ 
                message: 'An account with this email or username already exists.',
                error: 'duplicate_entry'
            });
        }
        
        res.status(500).json({ 
            message: 'Server error during registration. Please try again.',
            error: process.env.NODE_ENV !== 'production' ? err.message : undefined
        });
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
            'SELECT user_id, username, email, password_hash FROM users WHERE email = ?',
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
            'SELECT user_id, username, email FROM users WHERE user_id = ?',
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
                email: user.email
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
            'SELECT user_id, username, email FROM users WHERE user_id = ?',
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
                email: user.email
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

// --- Get Current User Route ---
// GET /api/auth/me
const authMiddleware = require('../middleware/authMiddleware');
router.get('/me', authMiddleware, async (req, res) => {
    try {
        // The user is already attached to req by authMiddleware
        const user = req.user;
        
        res.json({
            user_id: user.user_id,
            username: user.username,
            email: user.email
        });
    } catch (error) {
        console.error('Error getting current user:', error.message);
        res.status(500).json({ message: 'Server error.' });
    }
});

module.exports = router; 