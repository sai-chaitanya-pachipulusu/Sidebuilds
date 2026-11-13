const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db'); // DB wrapper (PostgreSQL in prod, SQLite in dev)
const authMiddleware = require('../middleware/authMiddleware');
const { createNotification } = require('../services/notificationService');
const emailService = require('../services/emailService');
const { purchaseRequestLimiter } = require('../middleware/rateLimiting');
const crypto = require('crypto');
const { directToReceiptReview } = require('../utils/receiptReview');
router.use('/:requestId/agreement', require('./purchaseAgreements'));
router.use('/:requestId', (req,res,next) => {
    if (req.method !== 'PUT' || !/^\/transfer(?:-status|\/code|\/domain|\/assets)$/.test(req.path)) return next();
    authMiddleware(req,res,async () => {
        try {
            const paid = await db.query(`SELECT t.transaction_id FROM project_transactions t JOIN purchase_requests pr ON pr.id=t.purchase_request_id
                JOIN projects p ON p.project_id=pr.project_id WHERE pr.id=$1 AND pr.seller_id=$2 AND p.owner_id=pr.seller_id
                AND t.status='payment_completed' AND t.escrow_status='held' AND t.escrow_released=false`, [req.params.requestId,req.user.user_id]);
            if (!paid.rows.length) return res.status(409).json({error:'A verified, undisputed payment is required before marking handover progress.'});
            if (req.path !== '/transfer-status' && typeof req.body.transferred !== 'boolean') return res.status(400).json({error:'Transferred must be true or false.'});
            next();
        } catch (_) { res.status(503).json({error:'Payment verification is temporarily unavailable.'}); }
    });
});

// DB-backed idempotency keys (survive restarts and multiple instances)
const { checkKey: checkIdempotencyKey, storeKey: storeIdempotencyKey } = require('../services/idempotencyService');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// Validation rules for interest expression
const expressInterestValidation = [
    param('projectId')
        .isUUID(4)
        .withMessage('Invalid project ID format'),
    body('buyerCommitments')
        .optional()
        .isArray()
        .withMessage('Buyer commitments must be an array'),
    body('buyerIntroMessage')
        .optional()
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Message must be between 10 and 2000 characters')
        .escape()
];

// Validation rules for checkout initiation
const initiateCheckoutValidation = [
    param('projectId')
        .isUUID(4)
        .withMessage('Invalid project ID format'),
    body('terms_agreed_version')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Terms version is too long')
        .escape(),
    body('idempotencyKey')
        .optional()
        .isUUID(4)
        .withMessage('Invalid idempotency key format')
];

// --- Create a new Purchase Request (Buyer Action) ---
// POST /api/purchase-requests/projects/:projectId/request
router.post('/projects/:projectId/request', 
    authMiddleware, 
    purchaseRequestLimiter, 
    expressInterestValidation,
    handleValidationErrors,
    async (req, res) => {
        const { projectId } = req.params;
        const { buyerCommitments, buyerIntroMessage } = req.body;
        const buyerId = req.user.user_id;
        const idempotencyKey = req.headers['idempotency-key'];

        console.log(`[PURCHASE REQUESTS] Expressing interest for project ${projectId} by buyer ${buyerId}`);

        try {
            // Check idempotency key
            const cachedResponse = await checkIdempotencyKey(idempotencyKey, `interest_${projectId}_${buyerId}`);
            if (cachedResponse) {
                console.log(`[PURCHASE REQUESTS] Returning cached response for idempotency key ${idempotencyKey}`);
                return res.status(201).json(cachedResponse);
            }

            // Use database transaction for atomicity
            const result = await db.withTransaction(async (client) => {
                // Check if project exists and is for sale with row locking
                const projectResult = await client.query(
                    'SELECT project_id, owner_id, name, is_for_sale FROM projects WHERE project_id = $1 FOR UPDATE',
                    [projectId]
                );

                if (projectResult.rows.length === 0) {
                    throw new Error('Project not found.');
                }

                const project = projectResult.rows[0];

                // Check if project is for sale
                if (!project.is_for_sale) {
                    throw new Error('This project is not currently for sale.');
                }

                // Check owner_id
                if (project.owner_id === buyerId) {
                    throw new Error('You cannot express interest in your own project.');
                }

                // Check for existing active requests with row locking
                const existingRequestResult = await client.query(
                    `SELECT id, status FROM purchase_requests
                     WHERE project_id = $1 AND buyer_id = $2
                     AND status NOT IN ('seller_rejected', 'buyer_withdrew_interest', 'transfer_completed_buyer_confirmed', 'payment_failed', 'aborted_project_unavailable', 'expired')
                     FOR UPDATE`,
                    [projectId, buyerId]
                );

                if (existingRequestResult.rows.length > 0) {
                    const existingRequest = existingRequestResult.rows[0];
                    throw new Error(`You already have an active request for this project with status: ${existingRequest.status}`);
                }

                // Create new purchase request
                const insertResult = await client.query(
                    `INSERT INTO purchase_requests
                        (project_id, buyer_id, seller_id, status, message, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                     RETURNING id`,
                    [projectId, buyerId, project.owner_id, 'interest_expressed', buyerIntroMessage || null]
                );

                const requestId = insertResult.rows[0].id;
                console.log(`[PURCHASE REQUESTS] Created new interest request ${requestId} for project ${projectId}`);

                // Get the created request
                const createdRequest = await client.query(
                    'SELECT * FROM purchase_requests WHERE id = $1',
                    [requestId]
                );

                return {
                    request: createdRequest.rows[0],
                    project: project
                };
            });

            const newPurchaseRequest = result.request;
            const project = result.project;

            // Create notification for seller (outside transaction for better performance)
            try {
                await createNotification(
                    project.owner_id,
                    'new_interest',
                    `You have received a new purchase request for your project "${project.name}".`,
                    `/purchase-agreement/${newPurchaseRequest.id}`
                );
            } catch (notificationError) {
                console.error('Error creating notification:', notificationError);
                // Don't fail the request if notification fails
            }

            const response = {
                ...newPurchaseRequest,
                message: 'Interest expressed successfully!'
            };

            // Store idempotency key
            if (idempotencyKey) {
                storeIdempotencyKey(idempotencyKey, `interest_${projectId}_${buyerId}`, response);
            }

            res.status(201).json(response);

        } catch (error) {
            console.error('Error expressing interest:', error);
            
            // Handle specific error types
            if (error.message === 'Project not found.') {
                return res.status(404).json({ error: error.message });
            }
            if (error.message.includes('not currently for sale')) {
                return res.status(400).json({ error: error.message });
            }
            if (error.message.includes('own project')) {
                return res.status(400).json({ error: error.message });
            }
            if (error.message.includes('already have an active request')) {
                return res.status(409).json({ error: error.message });
            }
            
            res.status(500).json({ error: 'Server error while processing your request.' });
        }
    }
);

// --- Initiate Checkout for a Project (Buy Now action) ---
// POST /api/purchase-requests/projects/:projectId/initiate-checkout
router.post('/projects/:projectId/initiate-checkout', 
    authMiddleware,
    initiateCheckoutValidation,
    handleValidationErrors,
    async (req, res) => {
        const { projectId } = req.params;
        const buyerId = req.user.user_id;
        const buyerUsername = req.user.username;
        const terms_agreed_version = req.body.terms_agreed_version || 'v_direct_buy_1.0';
        const idempotencyKey = req.headers['idempotency-key'];

        console.log(`[PURCHASE REQUESTS] Initiating direct checkout for project ${projectId} by buyer ${buyerId}`);

        try {
            // Check idempotency key
            const cachedResponse = await checkIdempotencyKey(idempotencyKey, `checkout_${projectId}_${buyerId}`);
            if (cachedResponse) {
                console.log(`[PURCHASE REQUESTS] Returning cached response for idempotency key ${idempotencyKey}`);
                return res.status(200).json(cachedResponse);
            }

            // Use database transaction for atomicity
            const result = await db.withTransaction(async (client) => {
                // Check project availability with row locking
                const projectResult = await client.query(
                    'SELECT owner_id as seller_id, sale_price, name, is_for_sale, is_on_hold FROM projects WHERE project_id = $1 FOR UPDATE',
                    [projectId]
                );

                if (projectResult.rows.length === 0) {
                    throw new Error('Project not found.');
                }

                const project = projectResult.rows[0];

                if (!project.is_for_sale) {
                    throw new Error('Project not available for sale.');
                }

                if (project.is_on_hold) {
                    throw new Error('Project is currently on hold.');
                }

                const sellerId = project.seller_id;

                if (sellerId === buyerId) {
                    throw new Error('Cannot purchase own project.');
                }

                // Check for existing requests with row locking to prevent race conditions
                const existingRequestQuery = await client.query(
                    `SELECT id as request_id, status FROM purchase_requests 
                     WHERE project_id = $1 AND buyer_id = $2 
                     AND status NOT IN ('transfer_completed_buyer_confirmed','seller_rejected','buyer_withdrew_interest','payment_failed','aborted_project_unavailable','expired')
                     FOR UPDATE`,
                    [projectId, buyerId]
                );

                if (existingRequestQuery.rows.length > 0) {
                    const existingRequest = existingRequestQuery.rows[0];
                    if (['interest_expressed', 'seller_terms_proposed', 'seller_accepted_pending_payment', 'payment_processing', 'agreement_reached_pending_payment'].includes(existingRequest.status)) {
                        console.log(`[PURCHASE REQUESTS] Found existing request ${existingRequest.request_id} for project ${projectId} by buyer ${buyerId} with status ${existingRequest.status}. Reusing.`);
                        return {
                            existing: true,
                            data: existingRequest
                        };
                    }
                    throw new Error(`Active purchase process exists with status: ${existingRequest.status}`);
                }

                // Create new purchase request
                const insert = await client.query(
                    `INSERT INTO purchase_requests (project_id, buyer_id, seller_id, status, message, price, terms_agreed_version, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                     RETURNING id`,
                    [projectId, buyerId, sellerId, 'interest_expressed', null, project.sale_price, terms_agreed_version]
                );

                const newId = insert.rows[0].id;
                const fetched = await client.query(
                    'SELECT id as purchase_request_id, project_id, buyer_id, seller_id, status, price as offer_amount, terms_agreed_version, created_at, updated_at FROM purchase_requests WHERE id = $1',
                    [newId]
                );

                console.log(`[PURCHASE REQUESTS] Created new purchase request ${fetched.rows[0].purchase_request_id} for project ${projectId}`);

                return {
                    existing: false,
                    data: fetched.rows[0],
                    project: project
                };
            });

            // Handle existing request case
            if (result.existing) {
                const response = {
                    ...result.data,
                    message: 'Existing purchase request found'
                };
                
                if (idempotencyKey) {
                    storeIdempotencyKey(idempotencyKey, `checkout_${projectId}_${buyerId}`, response);
                }
                
                return res.status(200).json(response);
            }

            const newPurchaseRequest = result.data;
            const project = result.project;

            // Send notifications (outside transaction)
            try {
                await createNotification(
                    buyerId,
                    'BUY_NOW_READY_FOR_PAYMENT',
                    `Your purchase of "${project.name}" needs an agreed scope before payment.`,
                    `/purchase-agreement/${newPurchaseRequest.purchase_request_id}`
                );
                await createNotification(
                    newPurchaseRequest.seller_id,
                    'PROJECT_SALE_PENDING_PAYMENT',
                    `Buyer ${buyerUsername || buyerId} wants to agree a purchase scope for "${project.name}".`,
                    `/purchase-agreement/${newPurchaseRequest.purchase_request_id}`
                );
            } catch (notificationError) {
                console.error('Failed to create notifications for buy now initiation:', notificationError);
            }

            const response = {
                ...newPurchaseRequest,
                message: 'Checkout initiated successfully'
            };

            // Store idempotency key
            if (idempotencyKey) {
                storeIdempotencyKey(idempotencyKey, `checkout_${projectId}_${buyerId}`, response);
            }

            res.status(201).json(response);

        } catch (error) {
            console.error(`[PURCHASE REQUESTS] Error initiating checkout for project ${projectId}:`, error);
            
            // Handle specific error types
            if (error.message === 'Project not found.') {
                return res.status(404).json({ error: 'Project not found or is not currently for sale.' });
            }
            if (error.message === 'Project not available for sale.') {
                return res.status(400).json({ error: 'This project is not currently for sale.' });
            }
            if (error.message === 'Project is currently on hold.') {
                return res.status(400).json({ error: 'This project is currently on hold.' });
            }
            if (error.message === 'Cannot purchase own project.') {
                return res.status(400).json({ error: 'You cannot purchase your own project.' });
            }
            if (error.message.includes('Active purchase process exists')) {
                return res.status(409).json({ 
                    error: 'You already have an active purchase process for this project. Please check your dashboard.',
                    details: error.message
                });
            }
            
            if (error.constraint === 'chk_buyer_seller_different') { 
                return res.status(400).json({ error: 'System error: Buyer and seller cannot be the same.' });
            }
            
            res.status(500).json({ error: 'Failed to initiate checkout process.' });
        }
    }
);

// --- Get Purchase Requests for Seller ---
// GET /api/purchase-requests/seller
router.get('/seller', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        
        const query = `
            SELECT 
                pr.id AS request_id,
                pr.project_id,
                p.name AS project_name,
                pr.buyer_id,
                u_buyer.username AS buyer_username,
                pr.status,
                pr.price AS accepted_price,
                pr.created_at AS request_date,
                pr.updated_at
            FROM purchase_requests pr
            JOIN projects p ON pr.project_id = p.project_id
            JOIN users u_buyer ON pr.buyer_id = u_buyer.user_id
            WHERE pr.seller_id = $1
            ORDER BY pr.created_at DESC`;
        const { rows } = await db.query(query, [userId]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching seller purchase requests:', error);
        res.status(500).json({ message: 'Failed to fetch seller purchase requests' });
    }
});

// --- Get Purchase Requests for Buyer ---
// GET /api/purchase-requests/buyer
router.get('/buyer', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        console.log(`[PURCHASE REQUESTS] Fetching buyer purchase requests for user ${userId}`);
        
        const query = `
            SELECT 
                pr.id AS purchase_request_id,
                pr.project_id,
                p.name AS project_name,
                pr.seller_id,
                u_seller.username AS seller_username,
                pr.status,
                pr.price AS offer_amount,
                pr.created_at AS request_date,
                pr.updated_at,
                t.transaction_id,
                t.amount AS paid_amount,
                t.transfer_completed,
                CASE
                    WHEN t.status IN ('payment_completed', 'completed')
                    THEN COALESCE(t.escrow_status, CASE WHEN t.escrow_released THEN 'released' ELSE 'held' END)
                    ELSE NULL
                END AS escrow_status,
                t.status as transaction_status
            FROM purchase_requests pr
            JOIN projects p ON pr.project_id = p.project_id
            JOIN users u_seller ON pr.seller_id = u_seller.user_id
            LEFT JOIN project_transactions t ON (t.stripe_session_id = pr.stripe_session_id
                AND t.project_id = pr.project_id AND t.buyer_id = pr.buyer_id AND t.seller_id = pr.seller_id)
            WHERE pr.buyer_id = $1
            ORDER BY pr.created_at DESC`;

        const { rows } = await db.query(query, [userId]);
        console.log(`[PURCHASE REQUESTS] Found ${rows.length} purchase requests for buyer ${userId}`);
        
        const mappedRows = rows.map(row => ({
            ...row,
            request_id: row.purchase_request_id,
            accepted_price: row.offer_amount     
        }));
        
        res.json(mappedRows);
    } catch (error) {
        console.error('[PURCHASE REQUESTS] Error fetching buyer purchase requests:', error);
        res.status(500).json({
            message: 'Failed to fetch buyer purchase requests'
        });
    }
});

// --- Get Specific Purchase Request Details ---
// GET /api/purchase-requests/:requestId
router.get('/:requestId', 
    authMiddleware,
    [param('requestId').isInt({ min: 1 }).withMessage('Invalid request ID')],
    handleValidationErrors,
    async (req, res) => {
        const { requestId } = req.params; 
        const userId = req.user.user_id;

        try {
            const result = await db.query(
                `SELECT
                    pr.*,
                    p.name AS project_name,
                    p.owner_id AS project_owner_id,
                    u_seller.username AS seller_username,
                    u_buyer.username AS buyer_username
                FROM purchase_requests pr
                JOIN projects p ON pr.project_id = p.project_id
                JOIN users u_seller ON pr.seller_id = u_seller.user_id
                JOIN users u_buyer ON pr.buyer_id = u_buyer.user_id
                WHERE pr.id = $1 AND (pr.buyer_id = $2 OR pr.seller_id = $3)`,
                [requestId, userId, userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Purchase request not found or you do not have permission to view it.' });
            }
            
            const purchaseRequest = result.rows[0];
            const responseData = {
                ...purchaseRequest,
                request_id: purchaseRequest.id,
                accepted_price: purchaseRequest.price,
                request_date: purchaseRequest.created_at
            };
            res.json(responseData);
        } catch (err) {
            console.error("Error fetching purchase request details for ID:", requestId, err);
            res.status(500).json({ error: 'Failed to fetch purchase request details' });
        }
    }
);

// --- Accept a Purchase Request (Seller Action) ---
router.post('/:requestId/accept', 
    authMiddleware,
    [param('requestId').isInt({ min: 1 }).withMessage('Invalid request ID')],
    handleValidationErrors,
    async (req, res) => {
        const { requestId } = req.params; 
        const sellerId = req.user.user_id;
        const sellerUsername = req.user.username;
        const { terms_agreed_version } = req.body;

        if (!terms_agreed_version) {
            return res.status(400).json({ error: 'Terms agreement is required from seller.' });
        }

        try {
            const result = await db.withTransaction(async (client) => {
                const requestResult = await client.query(
                    'SELECT pr.*, p.name as project_name, p.sale_price as project_sale_price FROM purchase_requests pr JOIN projects p ON pr.project_id = p.project_id WHERE pr.id = $1 AND pr.seller_id = $2 FOR UPDATE',
                    [requestId, sellerId]
                );

                if (requestResult.rows.length === 0) {
                    throw new Error('Request not found');
                }

                const request = requestResult.rows[0];
                if (request.status !== 'interest_expressed') {
                    throw new Error(`Invalid status: ${request.status}`);
                }

                // Lock in the price at acceptance time. Interest-expressed requests
                // are created without a price, so fall back to the project's sale
                // price; without this, checkout later computes NaN and Stripe rejects.
                const effectivePrice = parseFloat(request.price ?? request.project_sale_price);
                if (!Number.isFinite(effectivePrice) || effectivePrice <= 0) {
                    throw new Error('No valid price');
                }

                await client.query(
                    "UPDATE purchase_requests SET status = 'seller_accepted_pending_payment', price = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                    [requestId, effectivePrice]
                );

                const updated = await client.query('SELECT *, id as request_id, price as accepted_price FROM purchase_requests WHERE id = $1', [requestId]);
                
                return {
                    request: updated.rows[0],
                    originalRequest: request
                };
            });

            const updatedRequest = result.request;
            const originalRequest = result.originalRequest;

            const responseData = {
                ...updatedRequest,
                request_id: updatedRequest.request_id,
                accepted_price: updatedRequest.accepted_price
            };

            try {
                await createNotification(
                    originalRequest.buyer_id,
                    'SELLER_ACCEPTED_REQUEST',
                    `Seller ${sellerUsername || sellerId} accepted your request for "${originalRequest.project_name}". Agree the itemized scope before payment.`,
                    `/purchase-agreement/${responseData.request_id}`
                );
            } catch (notificationError) {
                console.error('Failed to create notification for request acceptance:', notificationError);
            }

            res.json(responseData);
        } catch (error) {
            console.error('Error accepting purchase request:', error);
            
            if (error.message === 'Request not found') {
                return res.status(404).json({ error: 'Purchase request not found or you are not the seller.' });
            }
            if (error.message.includes('Invalid status')) {
                return res.status(400).json({ error: `Request cannot be accepted. ${error.message}` });
            }
            if (error.message === 'No valid price') {
                return res.status(400).json({ error: 'Set a sale price on the project before accepting this request.' });
            }

            res.status(500).json({ error: 'Failed to accept purchase request.' });
        }
    }
);

// --- Reject a Purchase Request (Seller Action) ---
router.post('/:requestId/reject', 
    authMiddleware,
    [param('requestId').isInt({ min: 1 }).withMessage('Invalid request ID')],
    handleValidationErrors,
    async (req, res) => {
        const { requestId } = req.params; 
        const sellerId = req.user.user_id;
        const sellerUsername = req.user.username;
        const { rejection_reason } = req.body; 

        try {
            const result = await db.withTransaction(async (client) => {
                const requestResult = await client.query(
                    'SELECT pr.buyer_id, pr.status, p.name as project_name FROM purchase_requests pr JOIN projects p ON pr.project_id = p.project_id WHERE pr.id = $1 AND pr.seller_id = $2 FOR UPDATE',
                    [requestId, sellerId]
                );

                if (requestResult.rows.length === 0) {
                    throw new Error('Request not found');
                }

                const request = requestResult.rows[0];

                if (request.status !== 'interest_expressed') { 
                    throw new Error(`Invalid status: ${request.status}`);
                }

                await client.query(
                    "UPDATE purchase_requests SET status = 'seller_rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                    [requestId]
                );

                const updated = await client.query('SELECT *, id as request_id, price as accepted_price FROM purchase_requests WHERE id = $1', [requestId]);
                
                return {
                    request: updated.rows[0],
                    originalRequest: request
                };
            });

            const updatedRequest = result.request;
            const originalRequest = result.originalRequest;

            const responseData = {
                ...updatedRequest,
                request_id: updatedRequest.request_id,
                accepted_price: updatedRequest.accepted_price
            };
            
            try {
                await createNotification(
                    originalRequest.buyer_id,
                    'SELLER_REJECTED_REQUEST',
                    `Seller ${sellerUsername || sellerId} rejected your request for "${originalRequest.project_name}". Reason: ${rejection_reason || 'Not provided'}`,
                    `/dashboard?tab=buyerRequests&requestId=${responseData.request_id}`
                );
            } catch (notificationError) {
                console.error('Failed to create notification for request rejection:', notificationError);
            }

            res.json(responseData);
        } catch (error) {
            console.error('Error rejecting purchase request:', error);
            
            if (error.message === 'Request not found') {
                return res.status(404).json({ error: 'Purchase request not found or you are not the seller.' });
            }
            if (error.message.includes('Invalid status')) {
                return res.status(400).json({ error: `Request cannot be rejected. ${error.message}` });
            }
            
            res.status(500).json({ error: 'Failed to reject purchase request.' });
        }
    }
);

// --- Seller proposes negotiated terms ---
router.put('/:requestId/seller-propose-terms',
    authMiddleware,
    [param('requestId').isInt({ min: 1 }).withMessage('Invalid request ID')],
    handleValidationErrors,
    async (req, res) => {
        const { requestId } = req.params;
        const sellerId = req.user.user_id;
        const { seller_proposal_message } = req.body;

        try {
            const result = await db.withTransaction(async (client) => {
                const requestResult = await client.query(
                    'SELECT * FROM purchase_requests WHERE id = $1 AND seller_id = $2 FOR UPDATE',
                    [requestId, sellerId]
                );

                if (requestResult.rows.length === 0) {
                    throw new Error('Request not found');
                }

                const request = requestResult.rows[0];
                if (!['interest_expressed', 'seller_terms_proposed'].includes(request.status)) {
                    throw new Error(`Invalid status: ${request.status}`);
                }

                await client.query(
                    "UPDATE purchase_requests SET status = 'seller_terms_proposed', message = COALESCE($1, message), updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                    [seller_proposal_message || null, requestId]
                );

                const updated = await client.query('SELECT *, id as request_id, price as accepted_price FROM purchase_requests WHERE id = $1', [requestId]);
                return updated.rows[0];
            });

            res.json(result);
        } catch (error) {
            console.error('Error proposing seller terms:', error);
            if (error.message === 'Request not found') {
                return res.status(404).json({ error: 'Purchase request not found or you are not the seller.' });
            }
            if (error.message.includes('Invalid status')) {
                return res.status(400).json({ error: `Terms cannot be proposed. ${error.message}` });
            }
            res.status(500).json({ error: 'Failed to propose terms.' });
        }
    }
);

// --- Buyer accepts seller proposed terms ---
router.put('/:requestId/buyer-accepts-terms',
    authMiddleware,
    [param('requestId').isInt({ min: 1 }).withMessage('Invalid request ID')],
    handleValidationErrors,
    async (req, res) => {
        const { requestId } = req.params;
        const buyerId = req.user.user_id;

        try {
            const result = await db.withTransaction(async (client) => {
                const requestResult = await client.query(
                    `SELECT pr.*, p.sale_price as project_sale_price
                     FROM purchase_requests pr
                     JOIN projects p ON pr.project_id = p.project_id
                     WHERE pr.id = $1 AND pr.buyer_id = $2 FOR UPDATE`,
                    [requestId, buyerId]
                );

                if (requestResult.rows.length === 0) {
                    throw new Error('Request not found');
                }

                const request = requestResult.rows[0];
                // Buyer can only accept terms the seller has actually proposed —
                // never skip the seller's side of the negotiation.
                if (request.status !== 'seller_terms_proposed') {
                    throw new Error(`Invalid status: ${request.status}`);
                }

                const effectivePrice = parseFloat(request.price ?? request.project_sale_price);
                if (!Number.isFinite(effectivePrice) || effectivePrice <= 0) {
                    throw new Error('No valid price');
                }

                await client.query(
                    "UPDATE purchase_requests SET status = 'agreement_reached_pending_payment', price = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                    [requestId, effectivePrice]
                );

                const updated = await client.query('SELECT *, id as request_id, price as accepted_price FROM purchase_requests WHERE id = $1', [requestId]);
                return updated.rows[0];
            });

            res.json(result);
        } catch (error) {
            console.error('Error accepting buyer terms:', error);
            if (error.message === 'Request not found') {
                return res.status(404).json({ error: 'Purchase request not found or you are not the buyer.' });
            }
            if (error.message.includes('Invalid status')) {
                return res.status(400).json({ error: `Terms cannot be accepted. ${error.message}` });
            }
            if (error.message === 'No valid price') {
                return res.status(400).json({ error: 'This request has no agreed price yet. Ask the seller to set one.' });
            }
            res.status(500).json({ error: 'Failed to accept terms.' });
        }
    }
);

// --- Buyer withdraws interest ---
router.put('/:requestId/withdraw-interest',
    authMiddleware,
    [param('requestId').isInt({ min: 1 }).withMessage('Invalid request ID')],
    handleValidationErrors,
    async (req, res) => {
        const { requestId } = req.params;
        const buyerId = req.user.user_id;
        const { withdrawal_reason } = req.body;

        try {
            const result = await db.withTransaction(async (client) => {
                const requestResult = await client.query(
                    'SELECT * FROM purchase_requests WHERE id = $1 AND buyer_id = $2 FOR UPDATE',
                    [requestId, buyerId]
                );

                if (requestResult.rows.length === 0) {
                    throw new Error('Request not found');
                }

                const request = requestResult.rows[0];
                if (!['interest_expressed','seller_terms_proposed','seller_accepted_pending_payment','agreement_reached_pending_payment'].includes(request.status) || request.agreement_id || request.stripe_session_id) {
                    throw new Error(`Invalid status: ${request.status}`);
                }

                await client.query(
                    "UPDATE purchase_requests SET status = 'buyer_withdrew_interest', message = COALESCE($1, message), updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                    [withdrawal_reason || null, requestId]
                );

                const updated = await client.query('SELECT *, id as request_id, price as accepted_price FROM purchase_requests WHERE id = $1', [requestId]);
                return updated.rows[0];
            });

            res.json(result);
        } catch (error) {
            console.error('Error withdrawing buyer interest:', error);
            if (error.message === 'Request not found') {
                return res.status(404).json({ error: 'Purchase request not found or you are not the buyer.' });
            }
            if (error.message.includes('Invalid status')) {
                return res.status(400).json({ error: `Interest cannot be withdrawn. ${error.message}` });
            }
            res.status(500).json({ error: 'Failed to withdraw interest.' });
        }
    }
);

// --- Seller decline interest alias for newer client workflow ---
router.put('/:requestId/decline-interest',
    authMiddleware,
    [param('requestId').isInt({ min: 1 }).withMessage('Invalid request ID')],
    handleValidationErrors,
    async (req, res) => {
        req.body.rejection_reason = req.body.decline_reason || req.body.rejection_reason;
        const { requestId } = req.params;
        const sellerId = req.user.user_id;

        try {
            const result = await db.withTransaction(async (client) => {
                const requestResult = await client.query(
                    'SELECT * FROM purchase_requests WHERE id = $1 AND seller_id = $2 FOR UPDATE',
                    [requestId, sellerId]
                );

                if (requestResult.rows.length === 0) {
                    throw new Error('Request not found');
                }

                const request = requestResult.rows[0];
                if (!['interest_expressed', 'seller_terms_proposed'].includes(request.status)) {
                    throw new Error(`Invalid status: ${request.status}`);
                }

                await client.query(
                    "UPDATE purchase_requests SET status = 'seller_rejected', message = COALESCE($1, message), updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                    [req.body.rejection_reason || null, requestId]
                );

                const updated = await client.query('SELECT *, id as request_id, price as accepted_price FROM purchase_requests WHERE id = $1', [requestId]);
                return updated.rows[0];
            });

            res.json(result);
        } catch (error) {
            console.error('Error declining seller interest:', error);
            if (error.message === 'Request not found') {
                return res.status(404).json({ error: 'Purchase request not found or you are not the seller.' });
            }
            if (error.message.includes('Invalid status')) {
                return res.status(400).json({ error: `Interest cannot be declined. ${error.message}` });
            }
            res.status(500).json({ error: 'Failed to decline interest.' });
        }
    }
);

// --- Buyer confirms asset transfer ---
router.post('/:requestId/confirm-transfer', authMiddleware,
    [param('requestId').isInt({ min: 1 }).withMessage('Invalid request ID')],
    handleValidationErrors, directToReceiptReview);

router.put('/:requestId/transfer-status', 
    authMiddleware,
    [param('requestId').isInt({ min: 1 }).withMessage('Invalid request ID')],
    handleValidationErrors,
    async (req, res) => {
        const { requestId } = req.params; 
        const sellerId = req.user.user_id;
        const sellerUsername = req.user.username;
        const { status, message } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'New status is required.' });
        }

        const allowedSellerStatuses = [
            'transfer_in_progress', 
            'assets_transferred_pending_buyer_confirmation',
        ];

        if (!allowedSellerStatuses.includes(status)) {
            return res.status(400).json({ error: `Invalid status update: '${status}'.` });
        }

        try {
            const result = await db.withTransaction(async (client) => {
                const requestCheck = await client.query(
                    'SELECT pr.project_id, pr.buyer_id, pr.status, p.name as project_name FROM purchase_requests pr JOIN projects p ON pr.project_id = p.project_id WHERE pr.id = $1 AND pr.seller_id = $2 FOR UPDATE', 
                    [requestId, sellerId]
                );

                if (requestCheck.rows.length === 0) {
                    throw new Error('Request not found');
                }
                
                const currentRequest = requestCheck.rows[0];

                await client.query(
                    "UPDATE purchase_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND seller_id = $3", 
                    [status, requestId, sellerId]
                );
                
                const result = await client.query('SELECT *, id as request_id, price as accepted_price FROM purchase_requests WHERE id = $1', [requestId]);

                return {
                    request: result.rows[0],
                    currentRequest
                };
            });

            const updatedRequest = result.request;
            const currentRequest = result.currentRequest;

            try {
                let notifMessage = `Seller ${sellerUsername || sellerId} updated the transfer status for "${currentRequest.project_name}" to: ${status.replace(/_/g, ' ')}.`;
                if (message) notifMessage += ` Note: "${message}"`;
                
                await createNotification(
                    currentRequest.buyer_id,
                    'TRANSFER_STATUS_UPDATED',
                    notifMessage,
                    `/dashboard?tab=buyerRequests&requestId=${requestId}`
                );
            } catch (notificationError) {
                console.error('Failed to create notification for transfer status update:', notificationError);
            }

            res.json({
                ...updatedRequest,
                request_id: updatedRequest.id,
                accepted_price: updatedRequest.price
            });
        } catch (error) {
            console.error("Error updating transfer status:", error);
            
            if (error.message === 'Request not found') {
                return res.status(404).json({ error: 'Purchase request not found or you are not the seller.' });
            }
            
            res.status(500).json({ error: 'Failed to update transfer status.' });
        }
    }
);

// --- Asset Transfer Field Updates ---
router.put('/:requestId/transfer/code', 
    authMiddleware,
    [param('requestId').isInt({ min: 1 }).withMessage('Invalid request ID')],
    handleValidationErrors,
    async (req, res) => {
        const { requestId } = req.params;
        const sellerId = req.user.user_id;
        const { transferred } = req.body;

        try {
            const result = await db.withTransaction(async (client) => {
                const requestResult = await client.query(
                    'SELECT * FROM purchase_requests WHERE id = $1 AND seller_id = $2 FOR UPDATE',
                    [requestId, sellerId]
                );
                
                if (requestResult.rows.length === 0) {
                    throw new Error('Not found');
                }

                const request = requestResult.rows[0];
                await client.query(
                    'UPDATE projects SET code_transferred = $1, updated_at = CURRENT_TIMESTAMP WHERE project_id = $2',
                    [!!transferred, request.project_id]
                );

                const projectResult = await client.query('SELECT * FROM projects WHERE project_id = $1', [request.project_id]);
                return projectResult.rows[0];
            });

            res.json({ success: true, project: result });
        } catch (error) {
            console.error('Error updating code transfer status:', error);
            
            if (error.message === 'Not found') {
                return res.status(404).json({ error: 'Not found.' });
            }
            
            res.status(500).json({ error: 'Failed to update code transfer status.' });
        }
    }
);

router.put('/:requestId/transfer/domain', 
    authMiddleware,
    [param('requestId').isInt({ min: 1 }).withMessage('Invalid request ID')],
    handleValidationErrors,
    async (req, res) => {
        const { requestId } = req.params;
        const sellerId = req.user.user_id;
        const { transferred } = req.body;

        try {
            const result = await db.withTransaction(async (client) => {
                const requestResult = await client.query(
                    'SELECT * FROM purchase_requests WHERE id = $1 AND seller_id = $2 FOR UPDATE',
                    [requestId, sellerId]
                );
                
                if (requestResult.rows.length === 0) {
                    throw new Error('Not found');
                }

                const request = requestResult.rows[0];
                await client.query(
                    'UPDATE projects SET domain_transferred = $1, updated_at = CURRENT_TIMESTAMP WHERE project_id = $2',
                    [!!transferred, request.project_id]
                );

                const projectResult = await client.query('SELECT * FROM projects WHERE project_id = $1', [request.project_id]);
                return projectResult.rows[0];
            });

            res.json({ success: true, project: result });
        } catch (error) {
            console.error('Error updating domain transfer status:', error);
            
            if (error.message === 'Not found') {
                return res.status(404).json({ error: 'Not found.' });
            }
            
            res.status(500).json({ error: 'Failed to update domain transfer status.' });
        }
    }
);

router.put('/:requestId/transfer/assets', 
    authMiddleware,
    [param('requestId').isInt({ min: 1 }).withMessage('Invalid request ID')],
    handleValidationErrors,
    async (req, res) => {
        const { requestId } = req.params;
        const sellerId = req.user.user_id;
        const { transferred } = req.body;

        try {
            const result = await db.withTransaction(async (client) => {
                const requestResult = await client.query(
                    'SELECT * FROM purchase_requests WHERE id = $1 AND seller_id = $2 FOR UPDATE',
                    [requestId, sellerId]
                );
                
                if (requestResult.rows.length === 0) {
                    throw new Error('Not found');
                }

                const request = requestResult.rows[0];
                await client.query(
                    'UPDATE projects SET assets_transferred = $1, updated_at = CURRENT_TIMESTAMP WHERE project_id = $2',
                    [!!transferred, request.project_id]
                );

                const projectResult = await client.query('SELECT * FROM projects WHERE project_id = $1', [request.project_id]);
                return projectResult.rows[0];
            });

            res.json({ success: true, project: result });
        } catch (error) {
            console.error('Error updating assets transfer status:', error);
            
            if (error.message === 'Not found') {
                return res.status(404).json({ error: 'Not found.' });
            }
            
            res.status(500).json({ error: 'Failed to update assets transfer status.' });
        }
    }
);

router.get('/:requestId/transfer-status', 
    authMiddleware,
    [param('requestId').isInt({ min: 1 }).withMessage('Invalid request ID')],
    handleValidationErrors,
    async (req, res) => {
        const { requestId } = req.params;
        const userId = req.user.user_id;

        try {
            const requestResult = await db.query(
                'SELECT * FROM purchase_requests WHERE id = $1 AND (buyer_id = $2 OR seller_id = $3)',
                [requestId, userId, userId]
            );
            
            if (requestResult.rows.length === 0) {
                return res.status(404).json({ error: 'Not found.' });
            }

            const request = requestResult.rows[0];
            const projectResult = await db.query(
                'SELECT code_transferred, domain_transferred, assets_transferred, status FROM projects WHERE project_id = $1',
                [request.project_id]
            );
            const project = projectResult.rows[0];

            res.json({
                request_id: requestId,
                project_id: request.project_id,
                status: request.status,
                transfer_status: {
                    code_transferred: !!project.code_transferred,
                    domain_transferred: !!project.domain_transferred,
                    assets_transferred: !!project.assets_transferred,
                    all_transferred: !!(project.code_transferred && project.domain_transferred && project.assets_transferred)
                },
                project_status: project.status
            });
        } catch (error) {
            console.error('Error fetching transfer status:', error);
            res.status(500).json({ error: 'Failed to fetch transfer status.' });
        }
    }
);

router.put('/:requestId/confirm-receipt', authMiddleware,
    [param('requestId').isInt({ min: 1 }).withMessage('Invalid request ID')],
    handleValidationErrors, directToReceiptReview);

module.exports = router;
