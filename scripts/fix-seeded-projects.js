/**
 * Fix Seeded Projects Script
 * 
 * This script fixes issues with seeded projects by:
 * 1. Ensuring all seeded projects have contact_email set
 * 2. Validating sale prices and other required fields
 */

const { Pool } = require('pg');
require('dotenv').config();

// Database connection URL
const databaseUrl = process.env.DATABASE_URL || 'postgresql://root@localhost:26257/defaultdb?sslmode=disable';

// Known seeded project IDs
const SEEDED_PROJECT_IDS = [
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Recipe App
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', // Fitness Tracker
    'cccccccc-cccc-cccc-cccc-cccccccccccc', // Blog Platform
    'dddddddd-dddd-dddd-dddd-dddddddddddd', // Weather Dashboard
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', // Task Manager API
    'ffffffff-ffff-ffff-ffff-ffffffffffff', // Expense Tracker
    '99999999-9999-9999-9999-999999999999', // Job Board
    '88888888-8888-8888-8888-888888888888', // Invoice Generator
    '77777777-7777-7777-7777-777777777777'  // E-commerce Platform
];

async function fixSeededProjects() {
    // Create a database connection pool
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.DATABASE_SSL === 'true' ? 
            { rejectUnauthorized: false } : 
            false
    });

    try {
        console.log('Starting to fix seeded projects...');
        
        // Get all seeded projects
        const projectsResult = await pool.query(`
            SELECT p.*, u.email as owner_email, u.username 
            FROM projects p 
            JOIN users u ON p.owner_id = u.user_id 
            WHERE p.project_id = ANY($1)
        `, [SEEDED_PROJECT_IDS]);
        
        console.log(`Found ${projectsResult.rows.length} seeded projects to check.`);
        
        // Iterate through each project and fix issues
        for (const project of projectsResult.rows) {
            console.log(`Processing project: ${project.name} (${project.project_id})`);
            
            const updates = [];
            const params = [];
            let paramIndex = 1;
            
            // Fix 1: Ensure contact_email is set
            if (!project.contact_email) {
                updates.push(`contact_email = $${paramIndex}`);
                params.push(project.owner_email || 'support@sideprojecttracker.com');
                paramIndex++;
                console.log(`- Setting contact_email to ${params[params.length - 1]}`);
            }
            
            // Fix 2: Ensure owner_username is set
            if (!project.owner_username) {
                updates.push(`owner_username = $${paramIndex}`);
                params.push(project.username);
                paramIndex++;
                console.log(`- Setting owner_username to ${project.username}`);
            }
            
            // Fix 3: Validate sale_price for projects marked as for_sale
            if (project.is_for_sale && (!project.sale_price || project.sale_price <= 0)) {
                updates.push(`sale_price = $${paramIndex}`);
                params.push(project.project_id.includes('cccccccc') ? 499.99 :
                           project.project_id.includes('ffffffff') ? 349.99 :
                           project.project_id.includes('77777777') ? 1299.99 : 
                           299.99); // Default fallback price
                paramIndex++;
                console.log(`- Setting sale_price to ${params[params.length - 1]}`);
            }
            
            // Apply updates if needed
            if (updates.length > 0) {
                params.push(project.project_id);
                const updateQuery = `
                    UPDATE projects 
                    SET ${updates.join(', ')} 
                    WHERE project_id = $${paramIndex}
                `;
                
                await pool.query(updateQuery, params);
                console.log(`✅ Updated project ${project.name}`);
            } else {
                console.log(`✓ No updates needed for project ${project.name}`);
            }
        }
        
        console.log('All seeded projects have been fixed.');
    } catch (err) {
        console.error('Error fixing seeded projects:', err);
    } finally {
        await pool.end();
    }
}

// Run the fix function
fixSeededProjects()
    .then(() => console.log('Script completed successfully.'))
    .catch(err => console.error('Script failed:', err));