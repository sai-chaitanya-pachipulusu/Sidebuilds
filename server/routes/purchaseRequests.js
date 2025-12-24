const express = require('express');
const router = express.Router();
const db = require('../db'); // DB wrapper (PostgreSQL in prod, SQLite in dev)
const authMiddleware = require('../middleware/authMiddleware');
const { createNotification } = require('../services/notificationService');
const emailService = require('../services/emailService');
const { purchaseRequestLimiter } = require('../middleware/rateLimiting');

// --- Create a new Purchase Request (Buyer Action) ---
// POST /api/purchase-requests/projects/:projectId/request
router.post('/projects/:projectId/request', authMiddleware, purchaseRequestLimiter, async (req, res) => {
    const { projectId } = req.params;
    const { buyerCommitments, buyerIntroMessage } = req.body;
    const buyerId = req.user.user_id;

    // projectId is a UUID string in the new schema
    if (!projectId || typeof projectId !== 'string') {
        return res.status(400).json({ error: 'Invalid project ID.' });
    }

    console.log(`[PURCHASE REQUESTS] Expressing interest for project ${projectId} by buyer ${buyerId}`);

    try {
        // Check if project exists and is for sale (using project_id column name and owner_id)
        const projectResult = await db.query(
            'SELECT project_id, owner_id, name, is_for_sale FROM projects WHERE project_id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found.' });
        }

        const project = projectResult.rows[0];

        // Check owner_id
        if (project.owner_id === buyerId) {
            return res.status(400).json({ error: 'You cannot express interest in your own project.' });
        }

        // Check for existing active requests
        const existingRequestResult = await db.query(
            `SELECT id FROM purchase_requests
             WHERE project_id = $1 AND buyer_id = $2
             AND status NOT IN ('seller_rejected', 'buyer_withdrew_interest', 'transfer_completed_buyer_confirmed', 'payment_failed', 'aborted_project_unavailable')`,
            [projectId, buyerId]
        );

        if (existingRequestResult.rows.length > 0) {
            return res.status(400).json({ error: 'You already have an active request for this project.' });
        }

        // Create new purchase request
        const insertResult = await db.query(
            `INSERT INTO purchase_requests
                (project_id, buyer_id, seller_id, status, message, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING id`,
            [projectId, buyerId, project.owner_id, 'interest_expressed', buyerIntroMessage || null]
        );

        const requestId = insertResult.rows[0].id;
        console.log(`[PURCHASE REQUESTS] Created new interest request ${requestId} for project ${projectId}`);

        // Get the created request
        const createdRequest = await db.query(
            'SELECT * FROM purchase_requests WHERE id = $1',
            [requestId]
        );
        const newPurchaseRequest = createdRequest.rows[0];

        // Create notification for seller
        try {
            await createNotification(
                project.owner_id,
                'new_interest',
                `You have received a new purchase request for your project "${project.name}".`,
                `/dashboard?tab=sellerRequests&requestId=${newPurchaseRequest.id}`
            );
        } catch (notificationError) {
            console.error('Error creating notification:', notificationError);
        }

        res.status(201).json({
            ...newPurchaseRequest,
            message: 'Interest expressed successfully!'
        });

    } catch (error) {
        console.error('Error expressing interest:', error);
        res.status(500).json({ error: 'Server error while processing your request.' });
    }
});

// --- Initiate Checkout for a Project (Buy Now action) ---
// POST /api/purchase-requests/projects/:projectId/initiate-checkout
router.post('/projects/:projectId/initiate-checkout', authMiddleware, async (req, res) => {
    const { projectId } = req.params;
    const buyerId = req.user.user_id;
    const buyerUsername = req.user.username;
    const terms_agreed_version = req.body.terms_agreed_version || 'v_direct_buy_1.0';

    // projectId is a UUID string in the new schema
    console.log(`[PURCHASE REQUESTS] Initiating direct checkout for project ${projectId} by buyer ${buyerId}`);

    try {
        const projectResult = await db.query(
            'SELECT owner_id as seller_id, sale_price, name FROM projects WHERE project_id = $1 AND is_for_sale = true',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            console.warn(`[PURCHASE REQUESTS] Project ${projectId} not found or not for sale during initiate-checkout.`);
            return res.status(404).json({ error: 'Project not found or is not currently for sale.' });
        }
        const project = projectResult.rows[0];
        const sellerId = project.seller_id;

        if (sellerId === buyerId) {
            console.warn(`[PURCHASE REQUESTS] Buyer ${buyerId} attempted to buy their own project ${projectId}.`);
            return res.status(400).json({ error: 'You cannot purchase your own project.' });
        }

        const existingRequestQuery = await db.query(
            `SELECT id as request_id, status FROM purchase_requests WHERE project_id = $1 AND buyer_id = $2 AND status NOT IN ('transfer_completed_buyer_confirmed','seller_rejected','buyer_withdrew_interest','payment_failed','aborted_project_unavailable')`,
            [projectId, buyerId]
        );

        if (existingRequestQuery.rows.length > 0) {
            const existingRequest = existingRequestQuery.rows[0];
            if (['seller_accepted_pending_payment', 'payment_processing', 'agreement_reached_pending_payment'].includes(existingRequest.status)) {
                console.log(`[PURCHASE REQUESTS] Found existing request ${existingRequest.request_id} for project ${projectId} by buyer ${buyerId} with status ${existingRequest.status}. Reusing.`);
                return res.status(200).json(existingRequest);
            }
            console.warn(`[PURCHASE REQUESTS] Buyer ${buyerId} already has an active request ${existingRequest.request_id} (status: ${existingRequest.status}) for project ${projectId}.`);
            return res.status(409).json({ error: 'You already have an active purchase process for this project. Please check your dashboard.', purchase_request_id: existingRequest.request_id });
        }

        const insert = await db.query(
            `INSERT INTO purchase_requests (project_id, buyer_id, seller_id, status, message, price, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING id`,
            [projectId, buyerId, sellerId, 'seller_accepted_pending_payment', null, project.sale_price]
        );
        const newId = insert.rows[0].id;
        const fetched = await db.query('SELECT id as purchase_request_id, project_id, buyer_id, seller_id, status, price as offer_amount, created_at, updated_at FROM purchase_requests WHERE id = $1', [newId]);
        const newPurchaseRequest = fetched.rows[0];
        console.log(`[PURCHASE REQUESTS] Created new purchase request ${newPurchaseRequest.purchase_request_id} for project ${projectId} (Buyer: ${buyerId}, Seller: ${sellerId}, Status: 'seller_accepted_pending_payment')`);

        // For a direct buy, notify both buyer and seller that it's ready for payment.
        try {
            await createNotification(
                buyerId,
                'BUY_NOW_READY_FOR_PAYMENT',
                `Your purchase of "${project.name}" is ready for payment.`,
                `/dashboard?tab=buyerRequests&requestId=${newPurchaseRequest.purchase_request_id}`
            );
            await createNotification(
                sellerId,
                'PROJECT_SALE_PENDING_PAYMENT',
                `"${project.name}" is pending payment from buyer ${buyerUsername || buyerId}.`,
                `/dashboard?tab=sellerRequests&requestId=${newPurchaseRequest.purchase_request_id}`
            );
        } catch (notificationError) {
            console.error('Failed to create notifications for buy now initiation:', notificationError);
        }

        res.status(201).json(newPurchaseRequest);
    } catch (error) {
        console.error(`[PURCHASE REQUESTS] Error initiating checkout for project ${projectId}:`, error);
        if (error.constraint === 'chk_buyer_seller_different') { 
            return res.status(400).json({ error: 'System error: Buyer and seller cannot be the same.' });
        }
        res.status(500).json({ error: 'Failed to initiate checkout process.', details: error.message });
    }
});

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
        res.status(500).json({ message: 'Failed to fetch seller purchase requests', details: error.message });
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
                t.transfer_completed,
                t.escrow_status,
                t.status as transaction_status
            FROM purchase_requests pr
            JOIN projects p ON pr.project_id = p.project_id
            JOIN users u_seller ON pr.seller_id = u_seller.user_id
            LEFT JOIN project_transactions t ON (t.project_id = pr.project_id AND t.buyer_id = pr.buyer_id)
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
            message: 'Failed to fetch buyer purchase requests', 
            details: error.message,
            error_code: error.code || 'unknown'
        });
    }
});

// --- Get Specific Purchase Request Details ---
// GET /api/purchase-requests/:requestId
router.get('/:requestId', authMiddleware, async (req, res) => {
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
        res.status(500).json({ error: 'Failed to fetch purchase request details', details: err.message });
    }
});

// --- Accept a Purchase Request (Seller Action) ---
router.post('/:requestId/accept', authMiddleware, async (req, res) => {
    const { requestId } = req.params; 
    const sellerId = req.user.user_id;
    const sellerUsername = req.user.username;
    const { terms_agreed_version } = req.body;

    if (!terms_agreed_version) {
        return res.status(400).json({ error: 'Terms agreement is required from seller.' });
    }

    try {
        const requestResult = await db.query(
            'SELECT pr.*, p.name as project_name FROM purchase_requests pr JOIN projects p ON pr.project_id = p.project_id WHERE pr.id = $1 AND pr.seller_id = $2',
            [requestId, sellerId]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase request not found or you are not the seller.' });
        }

        const request = requestResult.rows[0];
        if (request.status !== 'interest_expressed') {
            return res.status(400).json({ error: `Request cannot be accepted. Current status: ${request.status}` });
        }

        await db.query(
            "UPDATE purchase_requests SET status = 'seller_accepted_pending_payment', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [requestId]
        );
        const updated = await db.query('SELECT *, id as request_id, price as accepted_price FROM purchase_requests WHERE id = $1', [requestId]);
        const updatedRequest = updated.rows[0];
        const responseData = {
            ...updatedRequest,
            request_id: updatedRequest.request_id,
            accepted_price: updatedRequest.accepted_price
        };

        try {
            await createNotification(
                request.buyer_id,
                'SELLER_ACCEPTED_REQUEST',
                `Seller ${sellerUsername || sellerId} accepted your request for "${request.project_name}". You can now proceed to payment.`,
                `/dashboard?tab=buyerRequests&requestId=${responseData.request_id}`
            );
        } catch (notificationError) {
            console.error('Failed to create notification for request acceptance:', notificationError);
        }
        res.json(responseData);
    } catch (error) {
        console.error('Error accepting purchase request:', error);
        res.status(500).json({ error: 'Failed to accept purchase request.' });
    }
});

// --- Reject a Purchase Request (Seller Action) ---
router.post('/:requestId/reject', authMiddleware, async (req, res) => {
    const { requestId } = req.params; 
    const sellerId = req.user.user_id;
    const sellerUsername = req.user.username;
    const { rejection_reason } = req.body; 

    try {
        const requestResult = await db.query(
            'SELECT pr.buyer_id, pr.status, p.name as project_name FROM purchase_requests pr JOIN projects p ON pr.project_id = p.project_id WHERE pr.id = $1 AND pr.seller_id = $2',
            [requestId, sellerId]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase request not found or you are not the seller.' });
        }
        const request = requestResult.rows[0];

        if (request.status !== 'interest_expressed') { 
            return res.status(400).json({ error: `Request cannot be rejected. Current status: ${request.status}` });
        }

        await db.query(
            "UPDATE purchase_requests SET status = 'seller_rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [requestId]
        );
        const updated = await db.query('SELECT *, id as request_id, price as accepted_price FROM purchase_requests WHERE id = $1', [requestId]);
        const updatedRequest = updated.rows[0];
        const responseData = {
            ...updatedRequest,
            request_id: updatedRequest.request_id,
            accepted_price: updatedRequest.accepted_price
        };
        
        try {
            await createNotification(
                request.buyer_id,
                'SELLER_REJECTED_REQUEST',
                `Seller ${sellerUsername || sellerId} rejected your request for "${request.project_name}". Reason: ${rejection_reason || 'Not provided'}`,
                `/dashboard?tab=buyerRequests&requestId=${responseData.request_id}`
            );
        } catch (notificationError) {
            console.error('Failed to create notification for request rejection:', notificationError);
        }
        res.json(responseData);
    } catch (error) {
        console.error('Error rejecting purchase request:', error);
        res.status(500).json({ error: 'Failed to reject purchase request.' });
    }
});

// --- Buyer confirms asset transfer ---
router.post('/:requestId/confirm-transfer', authMiddleware, async (req, res) => {
    const { requestId } = req.params; 
    const buyerId = req.user.user_id;
    const buyerUsername = req.user.username;
    
    try {
        const requestResult = await db.query(
            `SELECT pr.*, p.name as project_name, u_seller.username as seller_username 
             FROM purchase_requests pr 
             JOIN projects p ON pr.project_id = p.project_id 
             JOIN users u_seller ON pr.seller_id = u_seller.user_id 
             WHERE pr.id = $1 AND pr.buyer_id = $2`,
            [requestId, buyerId]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase request not found or you are not the buyer.' });
        }

        const request = requestResult.rows[0];
        const projectId = request.project_id;

        const allowedPreviousStatuses = ['assets_transferred_pending_buyer_confirmation', 'payment_completed_pending_transfer', 'seller_accepted_pending_payment', 'transfer_completed_buyer_confirmed'];
        if (!allowedPreviousStatuses.includes(request.status)) {
            return res.status(400).json({ error: `Cannot confirm transfer at this stage. Current status: ${request.status}` });
        }

        // Use transaction for critical updates
        await db.query('BEGIN');
        
        try {
            // Update project ownership and status
            await db.query(
                `UPDATE projects 
                 SET owner_id = $1, 
                     is_for_sale = false, 
                     status = 'sold',
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE project_id = $2`,
                [buyerId, projectId]
            );

            // Update purchase request status
            await db.query(
                "UPDATE purchase_requests SET status = 'transfer_completed_buyer_confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                [requestId]
            );

            await db.query('COMMIT');
        } catch (txError) {
            await db.query('ROLLBACK');
            throw txError;
        }

        const updatedSel = await db.query('SELECT * FROM purchase_requests WHERE id = $1', [requestId]);
        const updatedRequest = updatedSel.rows[0];
        
        // Send notifications
        try {
            await createNotification(
                request.seller_id,
                'TRANSFER_CONFIRMED_BY_BUYER',
                `Buyer ${buyerUsername || buyerId} confirmed transfer for project "${request.project_name}". The sale is complete.`,
                `/dashboard?tab=sellerRequests&requestId=${requestId}`
            );
             await createNotification(
                buyerId,
                'TRANSFER_COMPLETED_SELF',
                `You have successfully confirmed the transfer of project "${request.project_name}". It is now yours.`,
                `/projects/${projectId}`
            );
        } catch (notificationError) {
            console.error('Failed to create notification for transfer confirmation:', notificationError);
        }

        res.json({
            ...updatedRequest,
            request_id: updatedRequest.id,
            accepted_price: updatedRequest.price
        });

    } catch (error) {
        console.error(`[CONFIRM TRANSFER] Error confirming transfer for request ${requestId}:`, error);
        res.status(500).json({ error: 'Failed to confirm asset transfer.', details: error.message });
    }
});

// --- Seller Updates Transfer Status ---
router.put('/:requestId/transfer-status', authMiddleware, async (req, res) => {
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
        const requestCheck = await db.query(
            'SELECT pr.project_id, pr.buyer_id, pr.status, p.name as project_name FROM purchase_requests pr JOIN projects p ON pr.project_id = p.project_id WHERE pr.id = $1 AND pr.seller_id = $2', 
            [requestId, sellerId]
        );

        if (requestCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase request not found or you are not the seller.' });
        }
        
        const currentRequest = requestCheck.rows[0];

        await db.query(
            "UPDATE purchase_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND seller_id = $3", 
            [status, requestId, sellerId]
        );
        
        const result = await db.query('SELECT *, id as request_id, price as accepted_price FROM purchase_requests WHERE id = $1', [requestId]);
        const updatedRequest = result.rows[0];

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
    } catch (err) { 
        console.error("Error updating transfer status:", err);
        res.status(500).json({ error: 'Failed to update transfer status.' });
    }
});

// --- Asset Transfer Field Updates ---
router.put('/:requestId/transfer/code', authMiddleware, async (req, res) => {
    const { requestId } = req.params;
    const sellerId = req.user.user_id;
    const { transferred } = req.body;

    try {
        const requestResult = await db.query('SELECT * FROM purchase_requests WHERE id = $1 AND seller_id = $2', [requestId, sellerId]);
        if (requestResult.rows.length === 0) return res.status(404).json({ error: 'Not found.' });

        const request = requestResult.rows[0];
        await db.query('UPDATE projects SET code_transferred = $1, updated_at = CURRENT_TIMESTAMP WHERE project_id = $2', [!!transferred, request.project_id]);

        const projectResult = await db.query('SELECT * FROM projects WHERE project_id = $1', [request.project_id]);
        res.json({ success: true, project: projectResult.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed.' });
    }
});

router.put('/:requestId/transfer/domain', authMiddleware, async (req, res) => {
    const { requestId } = req.params;
    const sellerId = req.user.user_id;
    const { transferred } = req.body;

    try {
        const requestResult = await db.query('SELECT * FROM purchase_requests WHERE id = $1 AND seller_id = $2', [requestId, sellerId]);
        if (requestResult.rows.length === 0) return res.status(404).json({ error: 'Not found.' });

        const request = requestResult.rows[0];
        await db.query('UPDATE projects SET domain_transferred = $1, updated_at = CURRENT_TIMESTAMP WHERE project_id = $2', [!!transferred, request.project_id]);

        const projectResult = await db.query('SELECT * FROM projects WHERE project_id = $1', [request.project_id]);
        res.json({ success: true, project: projectResult.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed.' });
    }
});

router.put('/:requestId/transfer/assets', authMiddleware, async (req, res) => {
    const { requestId } = req.params;
    const sellerId = req.user.user_id;
    const { transferred } = req.body;

    try {
        const requestResult = await db.query('SELECT * FROM purchase_requests WHERE id = $1 AND seller_id = $2', [requestId, sellerId]);
        if (requestResult.rows.length === 0) return res.status(404).json({ error: 'Not found.' });

        const request = requestResult.rows[0];
        await db.query('UPDATE projects SET assets_transferred = $1, updated_at = CURRENT_TIMESTAMP WHERE project_id = $2', [!!transferred, request.project_id]);

        const projectResult = await db.query('SELECT * FROM projects WHERE project_id = $1', [request.project_id]);
        res.json({ success: true, project: projectResult.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed.' });
    }
});

router.get('/:requestId/transfer-status', authMiddleware, async (req, res) => {
    const { requestId } = req.params;
    const userId = req.user.user_id;

    try {
        const requestResult = await db.query('SELECT * FROM purchase_requests WHERE id = $1 AND (buyer_id = $2 OR seller_id = $3)', [requestId, userId, userId]);
        if (requestResult.rows.length === 0) return res.status(404).json({ error: 'Not found.' });

        const request = requestResult.rows[0];
        const projectResult = await db.query('SELECT code_transferred, domain_transferred, assets_transferred, status FROM projects WHERE project_id = $1', [request.project_id]);
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
        res.status(500).json({ error: 'Failed.' });
    }
});

router.put('/:requestId/confirm-receipt', authMiddleware, async (req, res) => {
    const { requestId } = req.params;
    const buyerId = req.user.user_id;
    const { confirmed } = req.body;

    try {
        const requestResult = await db.query('SELECT * FROM purchase_requests WHERE id = $1 AND buyer_id = $2', [requestId, buyerId]);
        if (requestResult.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
        const request = requestResult.rows[0];

        if (confirmed) {
            await db.query("BEGIN");
            try {
                await db.query("UPDATE purchase_requests SET status = 'transfer_completed_buyer_confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [requestId]);
                await db.query("UPDATE projects SET status = 'sold', owner_id = $1, is_for_sale = false, updated_at = CURRENT_TIMESTAMP WHERE project_id = $2", [buyerId, request.project_id]);
                await db.query("COMMIT");
            } catch (e) {
                await db.query("ROLLBACK");
                throw e;
            }
            try {
                await createNotification(request.seller_id, 'TRANSFER_CONFIRMED', `Buyer confirmed receipt for request #${requestId}.`, `/dashboard?tab=sellerRequests&requestId=${requestId}`);
            } catch (nE) {}
        }

        const updatedRequest = await db.query('SELECT * FROM purchase_requests WHERE id = $1', [requestId]);
        res.json({ success: true, request: updatedRequest.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed.' });
    }
});

module.exports = router;