const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware'); // Assuming this is the correct path

const router = express.Router();

// Fields to select for user profile (excluding sensitive info like password_hash)
const PROFILE_FIELDS = [
    'user_id', 'username', 'email', 'created_at', 'updated_at',
    /*'profile_picture_url',*/ 'bio', 'location', /*'skills',*/ 'phone_number',
    'portfolio_link', 'linkedin_profile_url', 'github_profile_url', 'twitter_profile_url',
    // Stripe fields - ensure these match actual column names and what client might expect for general profile context
    'stripe_account_id', 
    'onboarding_complete AS stripe_onboarding_complete', 
    'stripe_payouts_enabled AS stripe_payouts_enabled', 
    'stripe_charges_enabled AS stripe_charges_enabled', 
    'stripe_details_submitted AS stripe_details_submitted'
].join(', ');

// --- GET current user's profile ---
// GET /api/users/profile
router.get('/profile', authMiddleware, async (req, res) => {
    console.log('GET /profile - req.user:', JSON.stringify(req.user, null, 2));
    try {
        const userId = req.user.id;
        const userProfile = await db.query(
            `SELECT ${PROFILE_FIELDS} FROM users WHERE user_id = $1`,
            [userId]
        );

        if (userProfile.rows.length === 0) {
            return res.status(404).json({ message: 'User profile not found.' });
        }

        res.json(userProfile.rows[0]);
    } catch (err) {
        console.error("Get profile error:", err.message);
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
});

// --- UPDATE current user's profile ---
// PUT /api/users/profile
router.put('/profile', authMiddleware, async (req, res) => {
    console.log('PUT /profile - req.user:', JSON.stringify(req.user, null, 2));
    console.log('PUT /profile - req.body:', JSON.stringify(req.body, null, 2));
    try {
        const userId = req.user.id;
        const {
            username, // Allow username update if desired, or remove
            // profile_picture_url, // Removed
            bio,
            location,
            // skills, // Removed
            phone_number,
            portfolio_link,
            linkedin_profile_url,
            github_profile_url,
            twitter_profile_url
        } = req.body;

        // Basic validation (example: ensure username is not empty if updatable)
        // Add more validation as needed
        if (username !== undefined && !username.trim()) {
            return res.status(400).json({ message: 'Username cannot be empty.' });
        }

        // Dynamically build the SET clause for the SQL query
        const fieldsToUpdate = [];
        const values = [];
        let paramIndex = 1;

        if (username !== undefined) { fieldsToUpdate.push(`username = $${paramIndex++}`); values.push(username); }
        // if (profile_picture_url !== undefined) { fieldsToUpdate.push(`profile_picture_url = $${paramIndex++}`); values.push(profile_picture_url); } // Removed
        if (bio !== undefined) { fieldsToUpdate.push(`bio = $${paramIndex++}`); values.push(bio); }
        if (location !== undefined) { fieldsToUpdate.push(`location = $${paramIndex++}`); values.push(location); }
        /*if (skills !== undefined) { // Removed
            // Ensure skills is an array, or convert if it's a string
            const skillsArray = Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : null);
            fieldsToUpdate.push(`skills = $${paramIndex++}`); 
            values.push(skillsArray);
        }*/
        if (phone_number !== undefined) { fieldsToUpdate.push(`phone_number = $${paramIndex++}`); values.push(phone_number); }
        if (portfolio_link !== undefined) { fieldsToUpdate.push(`portfolio_link = $${paramIndex++}`); values.push(portfolio_link); }
        if (linkedin_profile_url !== undefined) { fieldsToUpdate.push(`linkedin_profile_url = $${paramIndex++}`); values.push(linkedin_profile_url); }
        if (github_profile_url !== undefined) { fieldsToUpdate.push(`github_profile_url = $${paramIndex++}`); values.push(github_profile_url); }
        if (twitter_profile_url !== undefined) { fieldsToUpdate.push(`twitter_profile_url = $${paramIndex++}`); values.push(twitter_profile_url); }

        if (fieldsToUpdate.length === 0) {
            return res.status(400).json({ message: 'No fields to update.' });
        }

        fieldsToUpdate.push(`updated_at = NOW()`); // Always update the updated_at timestamp
        values.push(userId); // For the WHERE clause

        const setClause = fieldsToUpdate.join(', ');
        const query = `UPDATE users SET ${setClause} WHERE user_id = $${paramIndex} RETURNING ${PROFILE_FIELDS}`;
        
        const updatedProfile = await db.query(query, values);

        if (updatedProfile.rows.length === 0) {
            return res.status(404).json({ message: 'User profile not found or update failed.' });
        }

        res.json(updatedProfile.rows[0]);
    } catch (err) {
        console.error("Update profile error:", err.message, err.stack);
        // Specific error handling (e.g., unique constraint for username)
        if (err.code === '23505' && err.constraint === 'users_username_key') {
            return res.status(409).json({ message: 'Username already taken.' });
        }
        res.status(500).json({ message: 'Server error updating profile.' });
    }
});

// --- GET current user's Stripe Connect status ---
// GET /api/users/stripe-status
router.get('/stripe-status', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.query(
            'SELECT stripe_account_id, onboarding_complete, stripe_payouts_enabled, stripe_charges_enabled, stripe_details_submitted FROM users WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const {
            stripe_account_id,
            onboarding_complete,
            stripe_payouts_enabled,
            stripe_charges_enabled,
            stripe_details_submitted
        } = result.rows[0];

        res.json({
            accountId: stripe_account_id,
            isOnboardingComplete: onboarding_complete,
            arePayoutsEnabled: stripe_payouts_enabled,
            areChargesEnabled: stripe_charges_enabled,
            areDetailsSubmitted: stripe_details_submitted,
            needsAttention: onboarding_complete && (!stripe_payouts_enabled || !stripe_charges_enabled)
        });
    } catch (err) {
        console.error("Get Stripe status error:", err.message);
        res.status(500).json({ message: 'Server error fetching Stripe status.' });
    }
});

module.exports = router;