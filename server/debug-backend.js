#!/usr/bin/env node

/**
 * Debug Backend Server
 * Test the exact API endpoints to identify SQL issues
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = 5002; // Use different port to avoid conflicts

// Middleware
app.use(cors());
app.use(express.json());

// Import database connection
const db = require('./db');

// Test route to verify database connection
app.get('/test/db', async (req, res) => {
    try {
        console.log('🔍 Testing database connection...');
        const result = await db.query('SELECT COUNT(*) as count FROM users');
        console.log('✅ Database query successful:', result.rows[0]);
        res.json({ success: true, userCount: result.rows[0].count });
    } catch (error) {
        console.error('❌ Database query failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Test profile update endpoint
app.put('/test/profile/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { bio, location, first_name, last_name } = req.body;
        
        console.log('🔍 Testing profile update...');
        console.log('👤 User ID:', userId);
        console.log('📝 Update data:', { bio, location, first_name, last_name });
        
        // Build dynamic update query (same as in users.js)
        const updateFields = [];
        const updateValues = [];

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

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No fields to update.' });
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(userId);

        const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`;
        
        console.log('🔍 SQL Query:', updateQuery);
        console.log('🔍 SQL Values:', updateValues);

        await db.query(updateQuery, updateValues);

        // Get updated profile
        const result = await db.query(
            `SELECT user_id, username, email, first_name, last_name, bio, location, updated_at FROM users WHERE user_id = ?`,
            [userId]
        );

        console.log('✅ Profile update successful');
        res.json({ success: true, profile: result.rows[0] });
        
    } catch (error) {
        console.error('❌ Profile update failed:', error);
        res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
});

// Test project creation endpoint
app.post('/test/project/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { name, description, stage, category, is_public, is_for_sale } = req.body;
        
        console.log('🔍 Testing project creation...');
        console.log('👤 User ID:', userId);
        console.log('📦 Project data:', { name, description, stage, category, is_public, is_for_sale });
        
        // Get username for owner_username field
        const userResult = await db.query('SELECT username FROM users WHERE user_id = ?', [userId]);
        const username = userResult.rows[0]?.username || 'unknown';
        
        console.log('👤 Found username:', username);
        
        const projectQuery = `INSERT INTO projects (owner_id, owner_username, name, description, stage, category, is_public, is_for_sale) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const projectValues = [userId, username, name, description, stage, category, is_public ? 1 : 0, is_for_sale ? 1 : 0];
        
        console.log('🔍 SQL Query:', projectQuery);
        console.log('🔍 SQL Values:', projectValues);

        await db.query(projectQuery, projectValues);
        
        // Get created project
        const createdProject = await db.query(
            'SELECT * FROM projects WHERE owner_id = ? ORDER BY created_at DESC LIMIT 1',
            [userId]
        );
        
        console.log('✅ Project creation successful');
        res.json({ success: true, project: createdProject.rows[0] });
        
    } catch (error) {
        console.error('❌ Project creation failed:', error);
        res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Debug server running on http://localhost:${PORT}`);
    console.log('\n📋 Test Endpoints:');
    console.log(`   GET  http://localhost:${PORT}/test/db`);
    console.log(`   PUT  http://localhost:${PORT}/test/profile/550e8400-e29b-41d4-a716-446655440001`);
    console.log(`   POST http://localhost:${PORT}/test/project/550e8400-e29b-41d4-a716-446655440001`);
    console.log('\n💡 Use these to test the exact SQL queries without authentication');
});