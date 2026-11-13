const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// --- GET current user's profile ---
// GET /api/users/profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const userProfile = await db.query(
            `SELECT
                user_id, username, email, first_name, last_name,
                bio, location, website_url as portfolio_link,
                linkedin_url as linkedin_profile_url,
                github_username as github_profile_url,
                twitter_handle as twitter_profile_url,
                avatar_url, is_verified, verification_level,
                is_admin,
                (SELECT COUNT(*) FROM project_transactions t WHERE t.seller_id=users.user_id AND t.status='completed' AND t.escrow_status='released' AND t.escrow_released=true AND t.transfer_completed=true) AS total_projects_sold, (SELECT COUNT(*) FROM project_transactions t WHERE t.buyer_id=users.user_id AND t.status='completed' AND t.escrow_status='released' AND t.escrow_released=true AND t.transfer_completed=true) AS total_projects_bought, (SELECT COALESCE(SUM(t.seller_amount),0) FROM project_transactions t WHERE t.seller_id=users.user_id AND t.status='completed' AND t.escrow_status='released' AND t.escrow_released=true AND t.transfer_completed=true) AS total_revenue,
                reputation_score, created_at, updated_at,
                stripe_account_id, onboarding_complete, stripe_onboarding_complete
             FROM users
             WHERE user_id = $1`,
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
    try {
        const userId = req.user.user_id;
        const {
            username,
            first_name,
            last_name,
            bio,
            location,
            portfolio_link,
            linkedin_profile_url,
            github_profile_url,
            twitter_profile_url,
            website_url,
            avatar_url,
            phone_number
        } = req.body;

        // Basic validation
        if (username !== undefined && !username.trim()) {
            return res.status(400).json({ message: 'Username cannot be empty.' });
        }

        // Build dynamic update query
        const updateFields = [];
        const updateValues = [];

        if (username !== undefined) {
            updateFields.push(`username = ?`);
            updateValues.push(username.trim());
        }
        if (first_name !== undefined) {
            updateFields.push(`first_name = ?`);
            updateValues.push(first_name);
        }
        if (last_name !== undefined) {
            updateFields.push(`last_name = ?`);
            updateValues.push(last_name);
        }
        if (bio !== undefined) {
            updateFields.push(`bio = ?`);
            updateValues.push(bio);
        }
        if (location !== undefined) {
            updateFields.push(`location = ?`);
            updateValues.push(location);
        }
        if (portfolio_link !== undefined || website_url !== undefined) {
            updateFields.push(`website_url = ?`);
            updateValues.push(portfolio_link || website_url);
        }
        if (linkedin_profile_url !== undefined) {
            updateFields.push(`linkedin_url = ?`);
            updateValues.push(linkedin_profile_url);
        }
        if (github_profile_url !== undefined) {
            updateFields.push(`github_username = ?`);
            updateValues.push(github_profile_url);
        }
        if (twitter_profile_url !== undefined) {
            updateFields.push(`twitter_handle = ?`);
            updateValues.push(twitter_profile_url);
        }
        if (avatar_url !== undefined) {
            updateFields.push(`avatar_url = ?`);
            updateValues.push(avatar_url);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No fields to update.' });
        }

        // Process fields to use PostgreSQL placeholders ($1, $2, etc.)
        const parameterizedFields = updateFields.map((field, index) => {
            if (field.includes('=')) {
                return field.replace('?', `$${index + 1}`);
            }
            return field;
        });

        const updateQuery = `UPDATE users SET ${parameterizedFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = $${updateValues.length + 1}`;
        updateValues.push(userId); // Add userId for WHERE clause

        // Executing update query

        await db.query(updateQuery, updateValues);

        // Note: phone_number is stored in the projects table (contact_phone field) for project listings
        // User profile phone number can be added to users table via migration if business requirements change

        // Return updated profile
        const result = await db.query(
            `SELECT
                user_id, username, email, first_name, last_name,
                bio, location, website_url as portfolio_link,
                linkedin_url as linkedin_profile_url,
                github_username as github_profile_url,
                twitter_handle as twitter_profile_url,
                avatar_url, is_verified, verification_level,
                (SELECT COUNT(*) FROM project_transactions t WHERE t.seller_id=users.user_id AND t.status='completed' AND t.escrow_status='released' AND t.escrow_released=true AND t.transfer_completed=true) AS total_projects_sold, (SELECT COUNT(*) FROM project_transactions t WHERE t.buyer_id=users.user_id AND t.status='completed' AND t.escrow_status='released' AND t.escrow_released=true AND t.transfer_completed=true) AS total_projects_bought, (SELECT COALESCE(SUM(t.seller_amount),0) FROM project_transactions t WHERE t.seller_id=users.user_id AND t.status='completed' AND t.escrow_status='released' AND t.escrow_released=true AND t.transfer_completed=true) AS total_revenue,
                reputation_score, created_at, updated_at,
                stripe_account_id, onboarding_complete, stripe_onboarding_complete
             FROM users
             WHERE user_id = $1`,
            [userId]
        );

        console.log('✅ Profile updated successfully');
        res.json(result.rows[0]);
    } catch (err) {
        console.error("❌ Update profile error:", err.message, err.stack);
        
        // Handle different types of database errors
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
            if (err.message.includes('username')) {
                return res.status(409).json({ message: 'Username already taken.' });
            } else if (err.message.includes('email')) {
                return res.status(409).json({ message: 'Email already in use.' });
            } else {
                return res.status(409).json({ message: 'A unique constraint was violated.' });
            }
        }
        
        // Handle validation errors
        if (err.message && err.message.includes('constraint')) {
            return res.status(400).json({ message: 'Invalid data provided.' });
        }
        
        // Handle database connection errors
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
            return res.status(503).json({ message: 'Database temporarily unavailable. Please try again later.' });
        }
        
        // Generic server error
        res.status(500).json({ 
            message: 'Server error updating profile.',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// --- GET current user's Stripe Connect status ---
// GET /api/users/stripe-status
router.get('/stripe-status', authMiddleware, require('../services/sellerConnectionService').statusHandler);

// --- GET user's projects ---
// GET /api/users/projects
router.get('/projects', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        console.log('🔍 Fetching projects for user ID:', userId);

        const projects = await db.query(
            `SELECT 
                project_id, name, description, stage, status,
                category, subcategory, tech_stack, tags,
                monthly_revenue, monthly_users, growth_rate,
                is_public, is_for_sale, sale_price, price_negotiable,
                github_url, demo_url, domain, thumbnail_url,
                view_count, interest_count, launch_date,
                created_at, updated_at
             FROM projects 
             WHERE owner_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );

        res.json(projects.rows);
    } catch (err) {
        console.error("Get user projects error:", err.message);
        res.status(500).json({ message: 'Server error fetching projects.' });
    }
});

// --- GET user's dashboard stats ---
// GET /api/users/dashboard-stats
router.get('/dashboard-stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Get project counts
        const projectStats = await db.query(
            `SELECT 
                COUNT(*) as total_projects,
                COUNT(CASE WHEN is_for_sale = true THEN 1 END) as projects_for_sale,
                COUNT(CASE WHEN stage = 'launched' THEN 1 END) as launched_projects,
                SUM(CASE WHEN is_for_sale = true THEN sale_price ELSE 0 END) as total_listing_value,
                SUM(view_count) as total_views,
                SUM(interest_count) as total_interest
             FROM projects 
             WHERE owner_id = $1`,
            [userId]
        );

        // Get transaction stats
        const transactionStats = await db.query(
            `SELECT 
                COUNT(*) as total_sales,
                SUM(CASE WHEN status = 'completed' THEN seller_amount ELSE 0 END) as total_revenue,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_sales
             FROM project_transactions 
             WHERE seller_id = $1`,
            [userId]
        );

        // Get purchase request stats
        const requestStats = await db.query(
            `SELECT 
                COUNT(*) as total_requests,
                COUNT(CASE WHEN status = 'interest_expressed' THEN 1 END) as pending_requests,
                COUNT(CASE WHEN status = 'seller_accepted_pending_payment' THEN 1 END) as accepted_requests
             FROM purchase_requests 
             WHERE seller_id = $1`,
            [userId]
        );

        const stats = {
            projects: projectStats.rows[0] || {},
            transactions: transactionStats.rows[0] || {},
            requests: requestStats.rows[0] || {}
        };

        res.json(stats);
    } catch (err) {
        console.error("Get dashboard stats error:", err.message);
        res.status(500).json({ message: 'Server error fetching dashboard stats.' });
    }
});

// Public seller profile used by /profile/:userId and the signed-in user's
// /profile page. Private fields such as email and Stripe IDs are excluded.
router.get('/:userId/profile', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT user_id, username, first_name, last_name, bio, location,
                    website_url, linkedin_url, github_username, twitter_handle,
                    avatar_url, is_verified, verification_level,
                    (SELECT COUNT(*) FROM project_transactions t WHERE t.seller_id=users.user_id AND t.status='completed' AND t.escrow_status='released' AND t.escrow_released=true AND t.transfer_completed=true) AS total_projects_sold, reputation_score, created_at
             FROM users WHERE user_id = $1`,
            [req.params.userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found.' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Get public user profile error:', err.message);
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
});

router.get('/:userId/projects', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT project_id, name, description, stage, status, category,
                    monthly_revenue, is_for_sale, sale_price, thumbnail_url,
                    view_count, created_at, updated_at
             FROM projects
             WHERE owner_id = $1 AND is_public = true
             ORDER BY created_at DESC`,
            [req.params.userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Get public user projects error:', err.message);
        res.status(500).json({ message: 'Server error fetching projects.' });
    }
});

module.exports = router;
