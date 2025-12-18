const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// --- GET current user's profile ---
// GET /api/users/profile
router.get('/profile', authMiddleware, async (req, res) => {
    console.log('GET /profile - req.user:', JSON.stringify(req.user, null, 2));
    try {
        const userId = req.user.user_id;
        console.log('🔍 Fetching profile for user ID:', userId);

        const userProfile = await db.query(
            `SELECT
                u.user_id, u.username, u.email, u.first_name, u.last_name,
                COALESCE(u.bio, up.bio) as bio,
                COALESCE(u.location, up.location) as location,
                COALESCE(u.website_url, up.website) as portfolio_link,
                COALESCE(u.linkedin_url, up.linkedin) as linkedin_profile_url,
                COALESCE(u.github_username, up.github) as github_profile_url,
                COALESCE(u.twitter_handle, up.twitter) as twitter_profile_url,
                u.avatar_url, u.is_verified, u.verification_level,
                u.total_projects_sold, u.total_projects_bought, u.total_revenue,
                u.reputation_score, u.created_at, u.updated_at,
                up.phone_number
             FROM users u
             LEFT JOIN user_profiles up ON u.user_id = up.user_id
             WHERE u.user_id = ?`,
            [userId]
        );

        console.log('🔍 Query result rows:', userProfile.rows.length);
        if (userProfile.rows.length > 0) {
            console.log('🔍 Found user profile:', Object.keys(userProfile.rows[0]));
        }

        if (userProfile.rows.length === 0) {
            console.log('❌ User profile not found for ID:', userId);
            return res.status(404).json({ message: 'User profile not found.' });
        }

        console.log('✅ Returning user profile successfully');
        res.json(userProfile.rows[0]);
    } catch (err) {
        console.error("❌ Get profile error:", err.message);
        console.error("❌ Full error:", err);
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
});

// --- UPDATE current user's profile ---
// PUT /api/users/profile
router.put('/profile', authMiddleware, async (req, res) => {
    console.log('PUT /profile - req.user:', JSON.stringify(req.user, null, 2));
    console.log('PUT /profile - req.body:', JSON.stringify(req.body, null, 2));
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

        // Add updated_at
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        
        // Add user_id for WHERE clause
        updateValues.push(userId);

        const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`;
        
        console.log('🔄 Executing update query:', updateQuery);
        console.log('🔄 With values:', updateValues);

        await db.query(updateQuery, updateValues);

        // Update user_profiles table if phone_number is provided
        if (phone_number !== undefined) {
            // Check if user profile exists
            const existingProfile = await db.query('SELECT user_id FROM user_profiles WHERE user_id = ?', [userId]);

            if (existingProfile.rows.length > 0) {
                // Update existing profile
                await db.query(
                    'UPDATE user_profiles SET phone_number = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                    [phone_number, userId]
                );
            } else {
                // Insert new profile
                await db.query(
                    'INSERT INTO user_profiles (user_id, phone_number, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
                    [userId, phone_number]
                );
            }
        }

        // Return updated profile
        const result = await db.query(
            `SELECT
                u.user_id, u.username, u.email, u.first_name, u.last_name,
                COALESCE(u.bio, up.bio) as bio,
                COALESCE(u.location, up.location) as location,
                COALESCE(u.website_url, up.website) as portfolio_link,
                COALESCE(u.linkedin_url, up.linkedin) as linkedin_profile_url,
                COALESCE(u.github_username, up.github) as github_profile_url,
                COALESCE(u.twitter_handle, up.twitter) as twitter_profile_url,
                u.avatar_url, u.is_verified, u.verification_level,
                u.total_projects_sold, u.total_projects_bought, u.total_revenue,
                u.reputation_score, u.created_at, u.updated_at,
                up.phone_number
             FROM users u
             LEFT JOIN user_profiles up ON u.user_id = up.user_id
             WHERE u.user_id = ?`,
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
            console.error("❌ Database connection error");
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
router.get('/stripe-status', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        
        // Check user's Stripe account info from users table
        const result = await db.query(
            `SELECT 
                stripe_account_id, 
                stripe_customer_id, 
                onboarding_complete
             FROM users 
             WHERE user_id = ?`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const {
            stripe_account_id,
            stripe_customer_id,
            onboarding_complete
        } = result.rows[0];

        const isComplete = onboarding_complete === 1 || onboarding_complete === true;

        res.json({
            accountId: stripe_account_id,
            customerId: stripe_customer_id,
            isOnboardingComplete: isComplete,
            arePayoutsEnabled: isComplete,
            areChargesEnabled: isComplete,
            areDetailsSubmitted: isComplete,
            needsAttention: !isComplete
        });
    } catch (err) {
        console.error("Get Stripe status error:", err.message);
        res.status(500).json({ message: 'Server error fetching Stripe status.' });
    }
});

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
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [userId]
        );

        console.log(`✅ Found ${projects.rows.length} projects for user`);
        res.json(projects.rows);
    } catch (err) {
        console.error("❌ Get user projects error:", err.message);
        res.status(500).json({ message: 'Server error fetching projects.' });
    }
});

// --- GET user's dashboard stats ---
// GET /api/users/dashboard-stats
router.get('/dashboard-stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        console.log('🔍 Fetching dashboard stats for user ID:', userId);

        // Get project counts
        const projectStats = await db.query(
            `SELECT 
                COUNT(*) as total_projects,
                COUNT(CASE WHEN is_for_sale = 1 THEN 1 END) as projects_for_sale,
                COUNT(CASE WHEN stage = 'launched' THEN 1 END) as launched_projects,
                SUM(CASE WHEN is_for_sale = 1 THEN sale_price ELSE 0 END) as total_listing_value,
                SUM(view_count) as total_views,
                SUM(interest_count) as total_interest
             FROM projects 
             WHERE user_id = ?`,
            [userId]
        );

        // Get transaction stats
        const transactionStats = await db.query(
            `SELECT 
                COUNT(*) as total_sales,
                SUM(CASE WHEN status = 'completed' THEN seller_amount ELSE 0 END) as total_revenue,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_sales
             FROM project_transactions 
             WHERE seller_id = ?`,
            [userId]
        );

        // Get purchase request stats
        const requestStats = await db.query(
            `SELECT 
                COUNT(*) as total_requests,
                COUNT(CASE WHEN status = 'interest_expressed' THEN 1 END) as pending_requests,
                COUNT(CASE WHEN status = 'seller_accepted_pending_payment' THEN 1 END) as accepted_requests
             FROM purchase_requests 
             WHERE seller_id = ?`,
            [userId]
        );

        const stats = {
            projects: projectStats.rows[0] || {},
            transactions: transactionStats.rows[0] || {},
            requests: requestStats.rows[0] || {}
        };

        console.log('✅ Dashboard stats fetched successfully');
        res.json(stats);
    } catch (err) {
        console.error("❌ Get dashboard stats error:", err.message);
        res.status(500).json({ message: 'Server error fetching dashboard stats.' });
    }
});

module.exports = router;