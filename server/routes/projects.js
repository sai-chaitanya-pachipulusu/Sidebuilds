const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const requireProjectOwner = require('../middleware/requireProjectOwner');
const xss = require('xss');
const { upload, uploadMultiple, handleMulterError, getFileType, getFileCategory } = require('../config/multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { resolveStoredUploadPath } = require('../utils/uploadSecurity');
const { normalizeListingFields, deserializeListing } = require('../utils/listingFields');

const router = express.Router();

// XSS sanitization helper
const sanitizeInput = (input) => {
    if (typeof input === 'string') {
        return xss(input);
    }
    return input;
};

// Sanitize all string fields in an object
const sanitizeObject = (obj, fields) => {
    const sanitized = { ...obj };
    fields.forEach(field => {
        if (sanitized[field] !== undefined) {
            sanitized[field] = sanitizeInput(sanitized[field]);
        }
    });
    return sanitized;
};

// === Protect all routes in this file with authMiddleware ===
router.use(authMiddleware);

// Helper function to check if user has a Stripe account
async function checkUserStripeAccount(userId) {
    const { stripe } = require('../config/stripe.config');
    const status = await require('../services/sellerConnectionService').userStatus(db, stripe, userId);
    return { hasStripeAccount: status.hasAccount, isOnboardingComplete: status.isOnboardingComplete, stripeAccountId: status.accountId };
}

// --- CREATE Project --- 
// POST /api/projects
router.post('/', async (req, res) => {
    // Extract project data from request body
    // Basic validation - ensure required fields are present
    let { 
        name, description, stage, domain,
        demo_url, github_url, tech_stack,
        monthly_revenue,
        is_public, is_for_sale, sale_price,
        contact_email, contact_phone, payment_method 
    } = req.body;
    
    // Sanitize all string inputs to prevent XSS
    name = sanitizeInput(name);
    description = sanitizeInput(description);
    domain = sanitizeInput(domain);
    demo_url = sanitizeInput(demo_url);
    github_url = sanitizeInput(github_url);
    
    // Log metadata only — never dump the full body (contact phone/email)
    console.log('Project creation request received:', JSON.stringify({
        name, stage, is_public, is_for_sale,
        hasContactEmail: !!req.body.contact_email,
        hasContactPhone: !!req.body.contact_phone
    }));
    
    // Check auth token
    console.log('Auth user:', req.user ? `ID: ${req.user.user_id}` : 'No auth user found');
    
    const userId = req.user.user_id; // Get user ID from authenticated user (added by middleware)

    if (!name) {
        console.log('Validation error: Project name is required');
        return res.status(400).json({ message: 'Project name is required.' });
    }

    try {
        // Stage-specific validation
        const listing = normalizeListingFields(req.body);
        const normalizedStage = listing.stage;
        if (!normalizedStage) {
            return res.status(400).json({ message: 'Project stage is required.' });
        }

        // Stage describes progress; it must not forbid evidence a seller already has.

        // Handle projects for sale validation
        if (is_for_sale) {
            // Validate sale price
            if (!sale_price || !Number.isFinite(Number(sale_price)) || Number(sale_price) <= 0) {
                console.log('Validation error: Invalid sale price for project listed for sale');
                return res.status(400).json({ message: 'A valid sale price is required for projects listed for sale.' });
            }
            
            // Validate contact information
            if (!contact_email && !contact_phone) {
                console.log('Validation error: Missing contact information for project listed for sale');
                return res.status(400).json({ message: 'At least one contact method (email or phone) is required for projects listed for sale.' });
            }
            
            // Check if user has connected their Stripe account
            const stripeAccountStatus = await checkUserStripeAccount(userId);
            if (!stripeAccountStatus.hasStripeAccount || !stripeAccountStatus.isOnboardingComplete) {
                return res.status(403).json({ 
                    message: 'You must connect your Stripe account before listing projects for sale.',
                    error_code: 'stripe_account_required'
                });
            }
        }

        // Build SQL query dynamically based on provided fields (using correct SQLite column names)
        let fields = ['project_id', 'owner_id', 'owner_username', 'name', 'description', 'stage', 'domain', 'demo_url', 'github_url', 'tech_stack', 'monthly_revenue', 'is_public', 'is_for_sale', 'is_on_hold'];
        
        // Get username for owner_username field
        const userResult = await db.query('SELECT username FROM users WHERE user_id = $1', [userId]);
        const username = userResult.rows[0]?.username || 'unknown';
        
        // Generate UUID for project_id
        const projectId = require('uuid').v4();

        let values = [
            projectId,
            userId,
            username,
            name,
            description,
            normalizedStage,
            domain,
            demo_url,
            github_url,
            listing.tech_stack ?? null,
            monthly_revenue || 0,
            !!is_public,
            !!is_for_sale,
            false // Default for is_on_hold
        ];
        for (const field of ['category', 'subcategory', 'tags', 'stage_details']) {
            if (listing[field] !== undefined) {
                fields.push(field);
                values.push(listing[field]);
            }
        }
        // Add sale-related fields if project is for sale
        if (is_for_sale) {
            fields.push('sale_price');
            values.push(Number(sale_price));
            
            if (contact_email) {
                fields.push('contact_email');
                values.push(contact_email);
            }
            
            if (contact_phone) {
                fields.push('contact_phone');
                values.push(contact_phone);
            }
            
            if (payment_method) {
                fields.push('payment_method');
                values.push(payment_method);
            }
        }

        // Create the SQL query using PostgreSQL placeholders $1, $2, etc.
        const pgPlaceholders = fields.map((_, i) => `$${i + 1}`).join(', ');
        const query = `
            INSERT INTO projects (${fields.join(', ')})
            VALUES (${pgPlaceholders})
        `;
        
        console.log('Executing project insert with', values.length, 'parameters');

        await db.query(query, values);
        
        // Get the created project
        const createdProject = await db.query(
            'SELECT * FROM projects WHERE project_id = $1',
            [projectId]
        );
        
        console.log('Project created successfully:', createdProject.rows[0]?.project_id);

        // Tell the seller's followers about new public listings (best-effort, async)
        const created = createdProject.rows[0];
        if (created && created.is_public) {
            const { notifyFollowersOfNewListing } = require('./follows');
            notifyFollowersOfNewListing(req.user.user_id, req.user.username, created)
                .catch(() => {});
        }

        res.status(201).json(deserializeListing(createdProject.rows[0]));
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
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
    const userId = req.user.user_id;

    try {
        console.log(`Fetching projects for user ${userId}`);
        const projects = await db.query(
            `SELECT 
                project_id, 
                name, 
                COALESCE(description, '') as description, 
                COALESCE(detailed_description, '') as detailed_description,
                COALESCE(stage, '') as stage, 
                COALESCE(status, '') as status,
                COALESCE(category, '') as category,
                COALESCE(subcategory, '') as subcategory,
                COALESCE(domain, '') as domain, 
                COALESCE(demo_url, '') as demo_url,
                COALESCE(github_url, '') as github_url,
                COALESCE(tech_stack, '[]') as tech_stack,
                COALESCE(tags, '[]') as tags,
                COALESCE(monthly_revenue, 0) as monthly_revenue,
                COALESCE(monthly_users, 0) as monthly_users,
                COALESCE(growth_rate, 0) as growth_rate,
                is_public, 
                is_for_sale, 
                sale_price, 
                price_negotiable,
                COALESCE(contact_email, '') as contact_email, 
                COALESCE(contact_phone, '') as contact_phone, 
                thumbnail_url,
                launch_date,
                created_at, 
                updated_at,
                COALESCE(view_count, 0) as view_count,
                COALESCE(interest_count, 0) as interest_count,
                COALESCE(is_on_hold, false) as is_on_hold
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

// --- Check if user has Stripe Connect account ---
// This static route must be declared before /:id.
router.get('/check-stripe-account', async (req, res) => {
    try {
        const stripeStatus = await checkUserStripeAccount(req.user.user_id);
        res.json({
            hasStripeAccount: stripeStatus.hasStripeAccount,
            isOnboardingComplete: stripeStatus.isOnboardingComplete
        });
    } catch (err) {
        console.error("Check Stripe account error:", err.message);
        res.status(500).json({ message: 'Failed to check Stripe account status.' });
    }
});

// --- READ Single Project --- 
// GET /api/projects/:id
router.get('/:id', async (req, res) => {
    const userId = req.user.user_id;
    const projectId = req.params.id;

    try {
        // Updated query to allow access if the project is public OR the user is the owner
        const projectResult = await db.query(
            `SELECT p.*,EXISTS(SELECT 1 FROM checkout_reservations cr WHERE cr.project_id=p.project_id) AS checkout_reserved FROM projects p
             WHERE project_id = $1 AND (owner_id = $2 OR CAST(is_public AS BOOLEAN) IS TRUE)`,
            [projectId, userId]
        );

        if (projectResult.rows.length === 0) {
            // If no project is found, it's either non-existent or private and not owned by the user
            return res.status(404).json({ message: 'Project not found or it is private.' });
        }

        const row=projectResult.rows[0];
        res.json(deserializeListing(row.owner_id===userId ? row : require('../utils/publicProject').publicProjectRecord(row)));
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
    const userId = req.user.user_id;
    const projectId = req.params.id;
    
    // Extract fields allowed to be updated, including new transfer flags
    const { 
        name, description, stage, domain,
        demo_url, github_url, tech_stack, monthly_revenue,
        is_public, is_for_sale, sale_price,
        contact_email, contact_phone, payment_method,
        code_transferred, domain_transferred, assets_transferred, // Added transfer flags
        is_on_hold // Added is_on_hold
    } = req.body;

    try {
        // First check if project exists and belongs to user
        const existingProject = await db.query(
            'SELECT * FROM projects WHERE project_id = $1',
            [projectId]
        );
        
        if (existingProject.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        
        if (existingProject.rows[0].owner_id !== userId) {
            return res.status(403).json({ message: 'You do not have permission to update this project.' });
        }

        // Sanitize string inputs (parity with the create route)
        const listing = normalizeListingFields(req.body);
        const sanitizedName = sanitizeInput(name);
        const sanitizedDescription = sanitizeInput(description);
        const sanitizedDomain = sanitizeInput(domain);
        const sanitizedDemoUrl = sanitizeInput(demo_url);
        const sanitizedGithubUrl = sanitizeInput(github_url);

        // Validate stage against the known lifecycle values
        if (stage !== undefined && stage !== null) {
            const validStages = ['idea', 'planning', 'mvp', 'development', 'launched', 'on_hold'];
            if (!validStages.includes(String(stage).toLowerCase())) {
                return res.status(400).json({ message: `Invalid project stage. Must be one of: ${validStages.join(', ')}` });
            }
        }

        // Numeric fields must actually be numbers when provided
        const numericFields = [
            ['monthly_revenue', monthly_revenue],
            ['sale_price', sale_price],
        ];
        for (const [fieldName, value] of numericFields) {
            if (value !== undefined && value !== null && value !== '' && !Number.isFinite(Number(value))) {
                return res.status(400).json({ message: `${fieldName} must be a valid number.` });
            }
        }

        // Handle projects for sale validation
        if (is_for_sale) {
            // Use existing sale_price if not provided in update
            const effectiveSalePrice = sale_price || existingProject.rows[0].sale_price;
            if (!effectiveSalePrice || Number(effectiveSalePrice) <= 0) {
                return res.status(400).json({ message: 'A valid sale price is required for projects listed for sale.' });
            }
            // Use existing contact info if not provided in update
            const effectiveContactEmail = contact_email || existingProject.rows[0].contact_email;
            const effectiveContactPhone = contact_phone || existingProject.rows[0].contact_phone;
            if (!effectiveContactEmail && !effectiveContactPhone) {
                return res.status(400).json({ message: 'At least one contact method (email or phone) is required for projects listed for sale.' });
            }
            const stripeAccountStatus = await checkUserStripeAccount(userId);
            if (!stripeAccountStatus.hasStripeAccount || !stripeAccountStatus.isOnboardingComplete) {
                return res.status(403).json({ 
                    message: 'You must connect your Stripe account before listing projects for sale.',
                    error_code: 'stripe_account_required'
                });
            }
        }

        // Build SQL SET clause and values array dynamically
        let setParts = [];
        let queryValues = [];
        let currentParamIndex = 1;

        // Helper to add field to update query
        const addUpdateField = (field, value) => {
            if (value !== undefined) {
                setParts.push(`${field} = $${currentParamIndex}`);
                queryValues.push(value);
                currentParamIndex++;
            }
        };
        
        addUpdateField('name', sanitizedName);
        addUpdateField('description', sanitizedDescription);
        addUpdateField('stage', listing.stage);
        addUpdateField('domain', sanitizedDomain);
        addUpdateField('demo_url', sanitizedDemoUrl);
        addUpdateField('github_url', sanitizedGithubUrl);
        addUpdateField('tech_stack', listing.tech_stack);
        for (const field of ['category', 'subcategory', 'tags', 'stage_details']) addUpdateField(field, listing[field]);
        addUpdateField('monthly_revenue', monthly_revenue !== undefined && monthly_revenue !== '' ? Number(monthly_revenue) : monthly_revenue);
        addUpdateField('is_public', is_public);
        addUpdateField('is_for_sale', is_for_sale);

        // Check if project is/will be for sale (either from request or existing state)
        const projectIsForSale = is_for_sale === true || (is_for_sale === undefined && existingProject.rows[0].is_for_sale);
        
        if (projectIsForSale) {
            // Use provided values or keep existing
            if (sale_price !== undefined && sale_price !== '') {
                addUpdateField('sale_price', Number(sale_price));
            }
            addUpdateField('contact_email', contact_email || existingProject.rows[0].contact_email);
            addUpdateField('contact_phone', contact_phone || existingProject.rows[0].contact_phone);
            addUpdateField('payment_method', payment_method || existingProject.rows[0].payment_method);
        } else if (req.body.is_for_sale === false) {
            // Only clear if explicitly set to false (not undefined)
            // Keep sale_price for potential re-listing
            // addUpdateField('sale_price', 0); // Don't clear - preserve for re-listing
        }

        // Add transfer flags if they are provided in the request body
        addUpdateField('code_transferred', code_transferred);
        addUpdateField('domain_transferred', domain_transferred);
        addUpdateField('assets_transferred', assets_transferred);
        addUpdateField('is_on_hold', is_on_hold);
        
        if (setParts.length === 0) {
            // If no fields are to be updated, we could return early or fetch and return current project data.
            // For now, let's assume at least 'name' is always required, so setParts won't be empty.
            // If other updatable fields could be added, this might need a check.
            // However, 'updated_at' will always be set.
        }
        
        setParts.push(`updated_at = CURRENT_TIMESTAMP`);
        
        queryValues.push(projectId, userId); // Add projectId and userId for WHERE clause
        
        const updateQuery = `
            UPDATE projects 
            SET ${setParts.join(', ')} 
            WHERE project_id = $${currentParamIndex} AND owner_id = $${currentParamIndex + 1} 
        `;
        
        const projectData = await db.withTransaction(async client => {
            const current = (await client.query('SELECT owner_id FROM projects WHERE project_id=$1 FOR UPDATE',[projectId])).rows[0];
            if (current?.owner_id !== userId) throw Object.assign(new Error('Project ownership changed. Refresh before editing.'),{status:409});
            if ((await client.query('SELECT project_id FROM checkout_reservations WHERE project_id=$1',[projectId])).rows.length) throw Object.assign(new Error('This project has an active checkout or handover. Finish that purchase before changing the listing.'),{status:409});
            await client.query(updateQuery, queryValues);
            return (await client.query('SELECT * FROM projects WHERE project_id=$1',[projectId])).rows[0];
        });
        res.json(deserializeListing(projectData));
    } catch (err) {
        if (err.status === 400) return res.status(400).json({ message: err.message });
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
    const userId = req.user.user_id;
    const projectId = req.params.id;

    try {
        // First check if project exists
        const existingProject = await db.query(
            'SELECT project_id, owner_id FROM projects WHERE project_id = $1',
            [projectId]
        );
        
        if (existingProject.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        
        // Check ownership
        if (existingProject.rows[0].owner_id !== userId) {
            return res.status(403).json({ message: 'You do not have permission to delete this project.' });
        }
        
        await db.withTransaction(async client => {
            const current = (await client.query('SELECT owner_id FROM projects WHERE project_id=$1 FOR UPDATE',[projectId])).rows[0];
            if(current?.owner_id!==userId) throw Object.assign(new Error('Project ownership changed.'),{status:409});
            if((await client.query('SELECT project_id FROM checkout_reservations WHERE project_id=$1',[projectId])).rows.length) throw Object.assign(new Error('Finish the active checkout or handover before deleting this project.'),{status:409});
            await client.query('DELETE FROM projects WHERE project_id=$1',[projectId]);
        });

        res.json({ message: 'Project deleted successfully.', projectId: projectId });

    } catch (err) {
        if(err.status) return res.status(err.status).json({message:err.message});
        console.error('Delete project error:',err.message);
         // Check for invalid input format (e.g., non-integer ID)
        if (err.code === '22P02') { 
            return res.status(400).json({ message: 'Invalid project ID format.' });
        }
        res.status(500).send('Server error deleting project.');
    }
});

// --- TOGGLE Project Hold Status ---
// PATCH /api/projects/:id/toggle-hold
router.patch('/:id/toggle-hold', async (req, res) => {
    const userId = req.user.user_id;
    const projectId = req.params.id;

    try {
        // Check ownership
        const projectResult = await db.query(
            'SELECT owner_id, is_on_hold FROM projects WHERE project_id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        if (projectResult.rows[0].owner_id !== userId) {
            return res.status(403).json({ message: 'Permission denied.' });
        }

        const newStatus = await db.withTransaction(async client => {
            const current = (await client.query('SELECT owner_id,is_on_hold FROM projects WHERE project_id=$1 FOR UPDATE',[projectId])).rows[0];
            if(current?.owner_id!==userId) throw Object.assign(new Error('Project ownership changed.'),{status:409});
            if((await client.query('SELECT project_id FROM checkout_reservations WHERE project_id=$1',[projectId])).rows.length) throw Object.assign(new Error('Checkout or handover is active. Availability cannot be changed.'),{status:409});
            const value=!current.is_on_hold;
            await client.query('UPDATE projects SET is_on_hold=$1,updated_at=CURRENT_TIMESTAMP WHERE project_id=$2',[value,projectId]);
            return value;
        });

        res.json({ 
            message: `Project is now ${newStatus ? 'on hold' : 'active'}.`,
            is_on_hold: newStatus 
        });
    } catch (err) {
        if(err.status) return res.status(err.status).json({message:err.message});
        console.error('Toggle hold error:',err.message);
        res.status(500).json({ message: 'Server error toggling hold status.' });
    }
});

// --- UPLOAD Project Files ---
// POST /api/projects/:id/files
router.post('/:id/files', requireProjectOwner('id'), require('../middleware/rateLimiter').uploadLimiter, uploadMultiple('files', 10), handleMulterError, async (req, res) => {
    try {
        const projectId = req.params.id;
        const userId = req.user.user_id;
        const { description, is_public } = req.body;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        const uploadedFiles = await require('../services/fileStorage').persistUploads(req.files, projectId, userId, req.body);

        res.status(201).json({
            success: true,
            message: `${uploadedFiles.length} file(s) uploaded successfully`,
            files: uploadedFiles
        });

    } catch (error) {
        console.error('Upload failed:', error.code || error.message);
        res.status(error.status || 500).json({ success:false,message:error.status ? error.message : 'Upload could not be saved. Please retry.' });
    }
});

// --- GET Project Files ---
// GET /api/projects/:id/files
router.get('/:id/files', async (req, res) => {
    try {
        const projectId = req.params.id;
        const userId = req.user?.user_id;

        // Check project access
        const projectResult = await db.query(
            'SELECT * FROM projects WHERE project_id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        const project = projectResult.rows[0];
        const isOwner = (project.owner_id || project.user_id) === userId;
        const isPublic = project.is_public === true || project.is_public === 1;

        // Build query based on access level
        let query = `
            SELECT file_id, file_name, original_name, file_type, file_category, 
                   file_size, mime_type, is_public, description, download_count, created_at
            FROM project_files 
            WHERE project_id = $1
        `;
        let params = [projectId];

        // If not owner, only show public files or files from public projects
        if (!isOwner && !await require('../services/fileStorage').isPaidBuyer(projectId,userId)) {
            if (isPublic) {
                query += ` AND ${db.trueExpr('is_public')}`;
            } else {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        query += ' ORDER BY created_at DESC';

        const filesResult = await db.query(query, params);

        // Add download URLs
        const files = filesResult.rows.map(file => ({
            ...file,
            download_url: `/api/files/download/${file.file_id}`,
            preview_url: file.file_type?.startsWith('image') ? `/api/files/preview/${file.file_id}` : null,
            is_owner: isOwner
        }));

        res.json({
            success: true,
            files: files,
            is_owner: isOwner
        });

    } catch (error) {
        console.error('Get project files error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching files'
        });
    }
});

// --- DELETE Project File ---
// DELETE /api/projects/:id/files/:fileId
router.delete('/:id/files/:fileId', async (req, res) => {
    try {
        const projectId = req.params.id;
        const fileId = req.params.fileId;
        const userId = req.user.user_id;

        // Check project ownership
        const projectResult = await db.query(
            'SELECT * FROM projects WHERE project_id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        const project = projectResult.rows[0];
        const ownerId = project.owner_id || project.user_id;

        if (ownerId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete files from this project'
            });
        }

        // Get file metadata
        const fileResult = await db.query(
            'SELECT * FROM project_files WHERE file_id = $1 AND project_id = $2',
            [fileId, projectId]
        );

        if (fileResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        const file = fileResult.rows[0];

        await require('../services/fileStorage').deleteStoredFile(fileId,userId);
        // Remove any legacy disk copy only after the database commit.
        const filePath = resolveStoredUploadPath(file.storage_path);
        if (filePath) {
            fs.unlinkSync(filePath);
        }


        res.json({
            success: true,
            message: 'File deleted successfully'
        });

    } catch (error) {
        console.error('Delete project file error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting file'
        });
    }
});

// --- GET Project File Statistics ---
// GET /api/projects/:id/files/stats
router.get('/:id/files/stats', async (req, res) => {
    try {
        const projectId = req.params.id;
        const userId = req.user.user_id;

        // Check project ownership
        const projectResult = await db.query(
            'SELECT * FROM projects WHERE project_id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        const project = projectResult.rows[0];
        if ((project.owner_id || project.user_id) !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get file statistics
        const statsResult = await db.query(
            `SELECT 
                COUNT(*) as total_files,
                COALESCE(SUM(file_size), 0) as total_size,
                COALESCE(SUM(download_count), 0) as total_downloads,
                COUNT(CASE WHEN file_category = 'images' THEN 1 END) as image_count,
                COUNT(CASE WHEN file_category = 'documents' THEN 1 END) as document_count,
                COUNT(CASE WHEN file_category = 'code' THEN 1 END) as code_count
             FROM project_files 
             WHERE project_id = $1`,
            [projectId]
        );

        res.json({
            success: true,
            stats: statsResult.rows[0]
        });

    } catch (error) {
        console.error('Get project file stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching file statistics'
        });
    }
});

module.exports = router;
