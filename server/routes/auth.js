const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db'); // Adjust path as needed

console.log('AUTH_ROUTES: File loaded and router being configured.');

const router = express.Router();
const SALT_ROUNDS = 10; // Cost factor for bcrypt hashing

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
            'SELECT * FROM users WHERE email = $1 OR username = $2',
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
            'SELECT user_id, username, email, created_at FROM users WHERE user_id = ?',
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

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' } // Token expires in 24 hours
        );

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
router.post('/login', async (req, res) => {
    console.log('AUTH_ROUTES: Reached /login handler');
    console.log('AUTH_ROUTES: Request body:', req.body);
    console.log('AUTH_ROUTES: Request headers:', req.headers);
    
    const { email, password } = req.body;
    console.log('AUTH_ROUTES: Extracted email:', email, 'password length:', password?.length);

    // Basic validation
    if (!email || !password) {
        console.log('AUTH_ROUTES: Missing email or password');
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // Find user by email
        const userResult = await db.query(
            'SELECT user_id, username, email, password_hash FROM users WHERE email = ?',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' }); // User not found
        }

        const user = userResult.rows[0];

        // Compare submitted password with stored hash
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' }); // Password doesn't match
        }

        // Generate JWT token
        const tokenPayload = {
            user: {
                id: user.user_id,
                username: user.username,
                email: user.email
            }
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' } // Token expires in 24 hours
        );

        // Respond with the token and user info (excluding password hash)
        // Important: Do not send the password_hash back to the client
        const { password_hash, ...userWithoutPassword } = user;
        res.json({ token, user: userWithoutPassword });

    } catch (err) {
        console.error("Login error:", err.message);
        res.status(500).send('Server error during login.');
    }
});

module.exports = router; 