const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// === Protect all routes in this file with authMiddleware ===
router.use(authMiddleware);

// --- CREATE Project --- 
// POST /api/projects
router.post('/', async (req, res) => {
    // Extract project data from request body
    // Basic validation - ensure required fields are present
    const { 
        name, description, stage, domain, 
        is_public, is_for_sale, sale_price,
        contact_email, contact_phone, payment_method 
    } = req.body;
    
    console.log('Project creation request received:', JSON.stringify(req.body, null, 2));
    
    // Check auth token
    console.log('Auth user:', req.user ? `ID: ${req.user.id}, Username: ${req.user.username}` : 'No auth user found');
    
    const userId = req.user.id; // Get user ID from authenticated user (added by middleware)

    if (!name) {
        console.log('Validation error: Project name is required');
        return res.status(400).json({ message: 'Project name is required.' });
    }

    try {
        // Get the user's username to store with the project
        console.log('Fetching username for user ID:', userId);
        const userResult = await db.query(
            'SELECT username FROM users WHERE user_id = $1',
            [userId]
        );
        
        console.log('User query result:', JSON.stringify(userResult.rows, null, 2));
        const username = userResult.rows[0]?.username || null;

        // Handle projects for sale validation
        if (is_for_sale) {
            // Validate sale price
            if (!sale_price || sale_price <= 0) {
                console.log('Validation error: Invalid sale price for project listed for sale');
                return res.status(400).json({ message: 'A valid sale price is required for projects listed for sale.' });
            }
            
            // Validate contact information
            if (!contact_email && !contact_phone) {
                console.log('Validation error: Missing contact information for project listed for sale');
                return res.status(400).json({ message: 'At least one contact method (email or phone) is required for projects listed for sale.' });
            }
        }

        // Build SQL query dynamically based on provided fields
        let fields = ['owner_id', 'name', 'description', 'stage', 'domain', 'is_public', 'is_for_sale', 'owner_username'];
        let values = [userId, name, description, stage, domain, is_public || false, is_for_sale || false, username];
        let placeholders = ['$1', '$2', '$3', '$4', '$5', '$6', '$7', '$8'];
        let paramIndex = 9;
        
        // Add sale-related fields if project is for sale
        if (is_for_sale) {
            fields.push('sale_price');
            values.push(sale_price);
            placeholders.push(`$${paramIndex++}`);
            
            if (contact_email) {
                fields.push('contact_email');
                values.push(contact_email);
                placeholders.push(`$${paramIndex++}`);
            }
            
            if (contact_phone) {
                fields.push('contact_phone');
                values.push(contact_phone);
                placeholders.push(`$${paramIndex++}`);
            }
            
            if (payment_method) {
                fields.push('payment_method');
                values.push(payment_method);
                placeholders.push(`$${paramIndex++}`);
            }
        }

        // Create the SQL query
        const query = `
            INSERT INTO projects (${fields.join(', ')})
            VALUES (${placeholders.join(', ')})
            RETURNING *
        `;
        
        console.log('Executing SQL query:', query);
        console.log('Query parameters:', JSON.stringify(values, null, 2));

        const newProject = await db.query(query, values);
        console.log('Project created successfully:', JSON.stringify(newProject.rows[0], null, 2));
        res.status(201).json(newProject.rows[0]);
    } catch (err) {
        console.error("Create project error:", err.message);
        console.error("Error details:", err);
        console.error("Error stack:", err.stack);
        
        // Check for specific error codes
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ message: 'A project with this name already exists.' });
        } else if (err.code === '23503') { // Foreign key violation
            return res.status(400).json({ message: 'Invalid reference to a related record.' });
        } else if (err.code === '42P01') { // Undefined table
            return res.status(500).json({ message: 'Database schema error: Table does not exist.' });
        } else if (err.code === '42703') { // Undefined column
            return res.status(500).json({ message: 'Database schema error: Column does not exist.' });
        }
        
        res.status(500).json({ message: 'Server error creating project.' });
    }
});

// --- READ All Projects (for logged-in user) ---
// GET /api/projects
router.get('/', async (req, res) => {
    const userId = req.user.id;

    try {
        console.log(`Fetching projects for user ${userId}`);
        const projects = await db.query(
            `SELECT 
                project_id, 
                name, 
                COALESCE(description, '') as description, 
                COALESCE(stage, '') as stage, 
                COALESCE(domain, '') as domain, 
                is_public, 
                is_for_sale, 
                sale_price, 
                COALESCE(contact_email, '') as contact_email, 
                COALESCE(contact_phone, '') as contact_phone, 
                created_at, 
                updated_at,
                COALESCE(source, 'created') as source,
                purchased_at
            FROM projects 
            WHERE owner_id = $1 
            ORDER BY created_at DESC`,
            [userId]
        );
        console.log(`Found ${projects.rows.length} projects for user ${userId}`);
        res.json(projects.rows);
    } catch (err) {
        console.error("Get projects error:", err.message, err.stack);
        res.status(500).json({ error: 'Server error fetching projects' });
    }
});

// --- READ Single Project --- 
// GET /api/projects/:id
router.get('/:id', async (req, res) => {
    const userId = req.user.id;
    const projectId = req.params.id;

    try {
        const project = await db.query(
            'SELECT * FROM projects WHERE project_id = $1 AND owner_id = $2',
            [projectId, userId]
        );

        if (project.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found or you do not have permission.' });
        }

        res.json(project.rows[0]);
    } catch (err) {
        console.error("Get single project error:", err.message);
         // Check for invalid input format (e.g., non-integer ID)
        if (err.code === '22P02') { 
            return res.status(400).json({ message: 'Invalid project ID format.' });
        }
        res.status(500).send('Server error fetching project.');
    }
});

// --- UPDATE Project --- 
// PUT /api/projects/:id
router.put('/:id', async (req, res) => {
    const userId = req.user.id;
    const projectId = req.params.id;
    
    // Extract only the fields allowed to be updated
    const { 
        name, description, stage, domain, 
        is_public, is_for_sale, sale_price,
        contact_email, contact_phone, payment_method 
    } = req.body;

    if (!name) { // Example validation: Ensure name is still present
        return res.status(400).json({ message: 'Project name is required.' });
    }

    try {
        // Handle projects for sale validation
        if (is_for_sale) {
            // Validate sale price
            if (!sale_price || sale_price <= 0) {
                return res.status(400).json({ message: 'A valid sale price is required for projects listed for sale.' });
            }
            
            // Validate contact information
            if (!contact_email && !contact_phone) {
                return res.status(400).json({ message: 'At least one contact method (email or phone) is required for projects listed for sale.' });
            }
        }

        // Build SQL SET clause and values array dynamically
        let setClause = [];
        let values = [name, description, stage, domain, is_public, is_for_sale];
        let paramIndex = 7; // Starting from $7 after the initial 6 parameters
        
        setClause.push('name = $1');
        setClause.push('description = $2');
        setClause.push('stage = $3');
        setClause.push('domain = $4');
        setClause.push('is_public = $5');
        setClause.push('is_for_sale = $6');
        
        // Handle sale-related fields
        if (is_for_sale) {
            setClause.push(`sale_price = $${paramIndex}`);
            values.push(sale_price);
            paramIndex++;
            
            if (contact_email !== undefined) {
                setClause.push(`contact_email = $${paramIndex}`);
                values.push(contact_email);
                paramIndex++;
            }
            
            if (contact_phone !== undefined) {
                setClause.push(`contact_phone = $${paramIndex}`);
                values.push(contact_phone);
                paramIndex++;
            }
            
            if (payment_method !== undefined) {
                setClause.push(`payment_method = $${paramIndex}`);
                values.push(payment_method);
                paramIndex++;
            }
        } else {
            // If not for sale, set sale-related fields to null/default
            setClause.push('sale_price = 0');
            setClause.push('contact_email = NULL');
            setClause.push('contact_phone = NULL');
            setClause.push('payment_method = \'direct\'');
        }
        
        // Add updated_at and required WHERE clause parameters
        setClause.push('updated_at = NOW()');
        values.push(projectId, userId); // Add projectId and userId to values array
        
        const query = `
            UPDATE projects 
            SET ${setClause.join(', ')} 
            WHERE project_id = $${paramIndex++} AND owner_id = $${paramIndex} 
            RETURNING *
        `;
        
        const updatedProject = await db.query(query, values);

        if (updatedProject.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found or you do not have permission to update.' });
        }

        res.json(updatedProject.rows[0]);
    } catch (err) {
        console.error("Update project error:", err.message);
        // Check for invalid input format (e.g., non-integer ID)
        if (err.code === '22P02') { 
            return res.status(400).json({ message: 'Invalid project ID format.' });
        }
        res.status(500).send('Server error updating project.');
    }
});

// --- DELETE Project --- 
// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
    const userId = req.user.id;
    const projectId = req.params.id;

    try {
        const deleteResult = await db.query(
            'DELETE FROM projects WHERE project_id = $1 AND owner_id = $2 RETURNING project_id',
            [projectId, userId]
        );

        if (deleteResult.rowCount === 0) {
            // No project found with that ID for this user, or it was already deleted.
            return res.status(404).json({ message: 'Project not found or you do not have permission to delete.' });
        }

        res.json({ message: 'Project deleted successfully.', projectId: deleteResult.rows[0].project_id });

    } catch (err) {
        console.error("Delete project error:", err.message);
         // Check for invalid input format (e.g., non-integer ID)
        if (err.code === '22P02') { 
            return res.status(400).json({ message: 'Invalid project ID format.' });
        }
        res.status(500).send('Server error deleting project.');
    }
});

module.exports = router; 