const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db'); // Adjust path as needed

const router = express.Router();
const SALT_ROUNDS = 10; // Cost factor for bcrypt hashing

// --- Registration Route --- 
// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required.' });
    }

    try {
        // Check if user already exists (by email or username)
        const userExists = await db.query(
            'SELECT * FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );

        if (userExists.rows.length > 0) {
            return res.status(409).json({ message: 'Email or username already exists.' });
        }

        // Hash the password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Insert new user into the database
        const newUser = await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id, username, email, created_at',
            [username, email, passwordHash]
        );

        // Generate JWT token
        const tokenPayload = {
            user: {
                id: newUser.rows[0].user_id,
                username: newUser.rows[0].username,
                email: newUser.rows[0].email
            }
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour (adjust as needed)
        );

        // Respond with the token and user info (excluding password hash)
        res.status(201).json({ token, user: newUser.rows[0] });

    } catch (err) {
        console.error("Registration error:", err.message);
        res.status(500).send('Server error during registration.');
    }
});

// --- Login Route --- 
// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // Find user by email
        const userResult = await db.query(
            'SELECT user_id, username, email, password_hash FROM users WHERE email = $1',
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
            { expiresIn: '1h' } // Token expires in 1 hour
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