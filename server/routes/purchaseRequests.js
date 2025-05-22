const express = require('express');
const router = express.Router();
const db = require('../db'); // Corrected path to db.js
const authMiddleware = require('../middleware/authMiddleware'); // Assuming auth middleware
const { createNotification } = require('../services/notificationService');
// const PurchaseRequest = require('../models/PurchaseRequest'); // Your PurchaseRequest model

// --- Create a new Purchase Request (Buyer Action) ---
// POST /api/purchase-requests/projects/:projectId/request
router.post('/projects/:projectId/request', authMiddleware, async (req, res) => {
    const { projectId } = req.params;
    const buyerId = req.user.id;
    const buyerUsername = req.user.username; // Assuming username is available in req.user
    const { buyer_initial_commitments, buyer_intro_message } = req.body;

    if (!buyer_initial_commitments || typeof buyer_initial_commitments !== 'object') {
        return res.status(400).json({ error: 'Buyer\'s initial commitments are required and must be an object.' });
    }

    try {
        // Fetch project details to get seller_id and current price
        const projectResult = await db.query(
            'SELECT owner_id, sale_price, name FROM projects WHERE project_id = $1 AND is_for_sale = TRUE',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or not for sale.' });
        }
        const project = projectResult.rows[0];
        const sellerId = project.owner_id;

        if (sellerId === buyerId) {
            return res.status(400).json({ error: 'You cannot express interest in your own project.' });
        }

        // Check for existing non-terminal requests for the same project by the same buyer
        const existingRequest = await db.query(
            "SELECT purchase_request_id FROM project_purchase_requests WHERE project_id = $1 AND buyer_id = $2 AND status NOT IN ('transfer_completed_buyer_confirmed', 'seller_rejected', 'buyer_withdrew_interest', 'payment_failed', 'aborted_project_unavailable', 'seller_declined_interest')",
            [projectId, buyerId]
        );

        if (existingRequest.rows.length > 0) {
            return res.status(400).json({ error: 'You already have an active interest or purchase process for this project.' });
        }

        const result = await db.query(
            `INSERT INTO project_purchase_requests 
                (project_id, buyer_id, seller_id, status, offer_amount, 
                 buyer_initial_commitments, buyer_intro_message, 
                 created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
             RETURNING *`,
            [projectId, buyerId, sellerId, 'buyer_interest_expressed', project.sale_price, 
             buyer_initial_commitments, buyer_intro_message]
        );

        const newRequest = result.rows[0];
        // console.log(`Notification: New interest expressed by buyer ${buyerId} for project ${projectId} (seller: ${sellerId}). Request ID: ${newRequest.purchase_request_id}`);
        try {
            await createNotification(
                sellerId, // Notify the seller
                'NEW_INTEREST',
                `Buyer ${buyerUsername || buyerId} expressed interest in your project "${project.name}".`,
                `/dashboard?tab=sellerRequests&requestId=${newRequest.purchase_request_id}`
            );
        } catch (notificationError) {
            console.error('Failed to create notification for new interest:', notificationError);
        }

        res.status(201).json(newRequest);
    } catch (error) {
        console.error('Error creating purchase interest request:', error);
        if (error.code === '22P02' && error.message.includes('invalid input syntax for type json')) {
            return res.status(400).json({ error: 'Invalid format for buyer commitments data.' });
        }
        res.status(500).json({ error: 'Failed to express interest in project.' });
    }
});

// --- Initiate Checkout for a Project (Buy Now action) ---
// POST /api/purchase-requests/projects/:projectId/initiate-checkout
router.post('/projects/:projectId/initiate-checkout', authMiddleware, async (req, res) => {
    const { projectId } = req.params;
    const buyerId = req.user.id;
    const buyerUsername = req.user.username;
    const terms_agreed_version = req.body.terms_agreed_version || 'v_direct_buy_1.0';

    console.log(`[PURCHASE REQUESTS] Initiating direct checkout for project ${projectId} by buyer ${buyerId}`);

    try {
        const projectResult = await db.query(
            'SELECT owner_id, sale_price, name FROM projects WHERE project_id = $1 AND is_for_sale = TRUE',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            console.warn(`[PURCHASE REQUESTS] Project ${projectId} not found or not for sale during initiate-checkout.`);
            return res.status(404).json({ error: 'Project not found or is not currently for sale.' });
        }
        const project = projectResult.rows[0];
        const sellerId = project.owner_id;

        if (sellerId === buyerId) {
            console.warn(`[PURCHASE REQUESTS] Buyer ${buyerId} attempted to buy their own project ${projectId}.`);
            return res.status(400).json({ error: 'You cannot purchase your own project.' });
        }

        const existingRequestQuery = await db.query(
            "SELECT purchase_request_id, status FROM project_purchase_requests WHERE project_id = $1 AND buyer_id = $2 AND status NOT IN ($3, $4, $5, $6, $7)",
            [projectId, buyerId, 'transfer_completed_buyer_confirmed', 'seller_rejected', 'buyer_withdrew', 'payment_failed', 'aborted_project_unavailable']
        );

        if (existingRequestQuery.rows.length > 0) {
            const existingRequest = existingRequestQuery.rows[0];
            if (['seller_accepted_pending_payment', 'payment_processing', 'agreement_reached_pending_payment'].includes(existingRequest.status)) {
                 console.log(`[PURCHASE REQUESTS] Found existing request ${existingRequest.purchase_request_id} for project ${projectId} by buyer ${buyerId} with status ${existingRequest.status}. Reusing.`);
                 return res.status(200).json(existingRequest); 
            }
            console.warn(`[PURCHASE REQUESTS] Buyer ${buyerId} already has an active request ${existingRequest.purchase_request_id} (status: ${existingRequest.status}) for project ${projectId}.`);
            return res.status(409).json({ error: 'You already have an active purchase process for this project. Please check your dashboard.', purchase_request_id: existingRequest.purchase_request_id });
        }

        const result = await db.query(
            `INSERT INTO project_purchase_requests 
                (project_id, buyer_id, seller_id, status, buyer_agreed_terms_version, seller_agreed_terms_version, offer_amount, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
             RETURNING purchase_request_id, project_id, buyer_id, seller_id, status, offer_amount, created_at, updated_at`,
            [projectId, buyerId, sellerId, 'seller_accepted_pending_payment', terms_agreed_version, terms_agreed_version, project.sale_price]
        );
        
        const newPurchaseRequest = result.rows[0];
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

// --- Get Purchase Requests for Seller (Seller Action) ---
// GET /api/purchase-requests/seller - Get purchase requests where the logged-in user is the seller
router.get('/seller', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        // console.log(`Fetching seller purchase requests for user ${userId}`);
        
        const query = `
            SELECT 
                ppr.purchase_request_id AS request_id, 
                ppr.project_id, 
                p.name AS project_name, 
                ppr.buyer_id, 
                u_buyer.username AS buyer_username, 
                ppr.status, 
                ppr.offer_amount AS accepted_price, -- Using offer_amount as accepted_price for display
                ppr.created_at AS request_date, 
                ppr.updated_at,
                ppr.buyer_intro_message, -- For seller to see initial message
                ppr.seller_proposal_message -- For seller to review their own proposal message
            FROM project_purchase_requests ppr
            JOIN projects p ON ppr.project_id = p.project_id
            JOIN users u_buyer ON ppr.buyer_id = u_buyer.user_id
            WHERE ppr.seller_id = $1
            ORDER BY ppr.created_at DESC;
        `;
        const { rows } = await db.query(query, [userId]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching seller purchase requests:', error);
        res.status(500).json({ message: 'Failed to fetch seller purchase requests', details: error.message });
    }
});

// --- Get Purchase Requests for Buyer (Buyer Action) ---
// GET /api/purchase-requests/buyer - Get purchase requests where the logged-in user is the buyer
router.get('/buyer', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        // console.log(`Fetching buyer purchase requests for user ${userId}`);
        
        const query = `
            SELECT 
                ppr.purchase_request_id, 
                ppr.project_id, 
                p.name AS project_name, 
                ppr.seller_id, 
                u_seller.username AS seller_username, 
                ppr.status, 
                ppr.offer_amount, 
                ppr.created_at AS request_date, 
                ppr.updated_at,
                ppr.agreed_transferable_assets, -- For buyer to review
                ppr.seller_proposal_message, -- For buyer to review
                ppr.buyer_intro_message -- For buyer to review their own initial message
            FROM project_purchase_requests ppr
            JOIN projects p ON ppr.project_id = p.project_id
            JOIN users u_seller ON ppr.seller_id = u_seller.user_id
            WHERE ppr.buyer_id = $1
            ORDER BY ppr.created_at DESC;
        `;
        const { rows } = await db.query(query, [userId]);
        const mappedRows = rows.map(row => ({
            ...row,
            request_id: row.purchase_request_id, 
            accepted_price: row.offer_amount     
        }));
        res.json(mappedRows);
    } catch (error) {
        console.error('Error fetching buyer purchase requests:', error);
        res.status(500).json({ message: 'Failed to fetch buyer purchase requests', details: error.message });
    }
});


// --- Get Specific Purchase Request Details ---
// GET /api/purchase-requests/:requestId - NOTE: frontend uses requestId, so param is :requestId
router.get('/:requestId', authMiddleware, async (req, res) => {
    const { requestId } = req.params; 
    const userId = req.user.id;

    try {
        const result = await db.query(
            `SELECT 
                ppr.*, 
                p.name AS project_name, 
                p.owner_id AS project_owner_id, 
                u_seller.username AS seller_username, 
                u_buyer.username AS buyer_username
            FROM project_purchase_requests ppr
            JOIN projects p ON ppr.project_id = p.project_id
            JOIN users u_seller ON ppr.seller_id = u_seller.user_id
            JOIN users u_buyer ON ppr.buyer_id = u_buyer.user_id
            WHERE ppr.purchase_request_id = $1 AND (ppr.buyer_id = $2 OR ppr.seller_id = $3)`,
            [requestId, userId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase request not found or you do not have permission to view it.' });
        }
        
        const purchaseRequest = result.rows[0];
        const responseData = {
            ...purchaseRequest,
            request_id: purchaseRequest.purchase_request_id,
            accepted_price: purchaseRequest.offer_amount,
            request_date: purchaseRequest.created_at
        };
        res.json(responseData);
    } catch (err) {
        console.error("Error fetching purchase request details for ID:", requestId, err);
        res.status(500).json({ error: 'Failed to fetch purchase request details', details: err.message });
    }
});

// --- Accept a Purchase Request (Seller Action) ---
// POST /api/purchase-requests/:requestId/accept - Frontend sends :requestId
router.post('/:requestId/accept', authMiddleware, async (req, res) => {
    const { requestId } = req.params; 
    const sellerId = req.user.id;
    const sellerUsername = req.user.username;
    const { terms_agreed_version } = req.body;

    if (!terms_agreed_version) {
        return res.status(400).json({ error: 'Terms agreement is required from seller.' });
    }

    try {
        const requestResult = await db.query(
            'SELECT ppr.*, p.name as project_name FROM project_purchase_requests ppr JOIN projects p ON ppr.project_id = p.project_id WHERE ppr.purchase_request_id = $1 AND ppr.seller_id = $2',
            [requestId, sellerId]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase request not found or you are not the seller.' });
        }

        const request = requestResult.rows[0];
        if (request.status !== 'pending_seller_approval') { // This status might be from an older flow
            return res.status(400).json({ error: `Request cannot be accepted. Current status: ${request.status}` });
        }

        const updateResult = await db.query(
            "UPDATE project_purchase_requests SET status = 'seller_accepted_pending_payment', seller_agreed_terms_version = $1, updated_at = current_timestamp WHERE purchase_request_id = $2 RETURNING *", 
            [terms_agreed_version, requestId]
        );
        
        const updatedRequest = updateResult.rows[0];
        const responseData = {
            ...updatedRequest,
            request_id: updatedRequest.purchase_request_id,
            accepted_price: updatedRequest.offer_amount 
        };

        // console.log(`Notification: Purchase request ${responseData.request_id} accepted by seller ${sellerId}. Buyer ${request.buyer_id} can now proceed to payment.`);
        try {
            await createNotification(
                request.buyer_id,
                'SELLER_ACCEPTED_REQUEST', // Generic acceptance, might be part of old flow
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
// POST /api/purchase-requests/:requestId/reject - Frontend sends :requestId
router.post('/:requestId/reject', authMiddleware, async (req, res) => {
    const { requestId } = req.params; 
    const sellerId = req.user.id;
    const sellerUsername = req.user.username;
    const { rejection_reason } = req.body; 

    try {
        const requestResult = await db.query(
            'SELECT ppr.buyer_id, ppr.status, p.name as project_name FROM project_purchase_requests ppr JOIN projects p ON ppr.project_id = p.project_id WHERE ppr.purchase_request_id = $1 AND ppr.seller_id = $2',
            [requestId, sellerId]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase request not found or you are not the seller.' });
        }
        const request = requestResult.rows[0];

        if (request.status !== 'pending_seller_approval') { 
            return res.status(400).json({ error: `Request cannot be rejected. Current status: ${request.status}` });
        }

        const updateResult = await db.query(
            "UPDATE project_purchase_requests SET status = 'seller_rejected', seller_rejection_reason = $1, updated_at = current_timestamp WHERE purchase_request_id = $2 RETURNING *", 
            [rejection_reason, requestId]
        );

        const updatedRequest = updateResult.rows[0];
        const responseData = {
            ...updatedRequest,
            request_id: updatedRequest.purchase_request_id,
            accepted_price: updatedRequest.offer_amount
        };
        
        // console.log(`Notification: Purchase request ${responseData.request_id} rejected by seller ${sellerId}. Buyer ${request.buyer_id} notified.`);
        try {
            await createNotification(
                request.buyer_id,
                'SELLER_REJECTED_REQUEST', // Generic rejection
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
// POST /api/purchase-requests/:requestId/confirm-transfer - Frontend sends :requestId
router.post('/:requestId/confirm-transfer', authMiddleware, async (req, res) => {
    const { requestId } = req.params; 
    const buyerId = req.user.id;
    const buyerUsername = req.user.username;
    const client = await db.getClient(); 

    try {
        await client.query('BEGIN');
        console.log(`[CONFIRM TRANSFER] BEGIN transaction for request: ${requestId}, buyer: ${buyerId}`);

        const requestResult = await client.query(
            'SELECT ppr.*, p.name as project_name, u_seller.username as seller_username, u_buyer.username as current_buyer_username \n' +
            'FROM project_purchase_requests ppr \n' +
            'JOIN projects p ON ppr.project_id = p.project_id \n' +
            'JOIN users u_seller ON ppr.seller_id = u_seller.user_id \n' + 
            'JOIN users u_buyer ON ppr.buyer_id = u_buyer.user_id \n' +
            'WHERE ppr.purchase_request_id = $1 AND ppr.buyer_id = $2',
            [requestId, buyerId]
        );

        if (requestResult.rows.length === 0) {
            await client.query('ROLLBACK');
            console.warn(`[CONFIRM TRANSFER] Purchase request ${requestId} not found for buyer ${buyerId} or buyer is not authorized.`);
            return res.status(404).json({ error: 'Purchase request not found or you are not the buyer.' });
        }

        const request = requestResult.rows[0];
        const projectId = request.project_id;
        // const newOwnerUsername = request.current_buyer_username; // Already have buyerUsername from req.user

        const allowedPreviousStatuses = ['assets_transferred_pending_buyer_confirmation', 'payment_completed_pending_transfer'];
        if (!allowedPreviousStatuses.includes(request.status)) {
            await client.query('ROLLBACK');
            console.warn(`[CONFIRM TRANSFER] Request ${requestId} status is ${request.status}. Cannot confirm transfer at this stage.`);
            return res.status(400).json({ error: `Cannot confirm transfer at this stage. Current status: ${request.status}` });
        }

        const projectUpdateResult = await client.query(
            `UPDATE projects 
             SET owner_id = $1, 
                 owner_username = $2, 
                 is_for_sale = FALSE, 
                 purchased_at = CURRENT_TIMESTAMP, 
                 source = 'purchased', 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE project_id = $3 RETURNING *`,
            [buyerId, buyerUsername, projectId]
        );

        if (projectUpdateResult.rowCount === 0) {
            await client.query('ROLLBACK');
            console.error(`[CONFIRM TRANSFER] CRITICAL: Failed to update project ${projectId} ownership during confirm transfer for request ${requestId}.`);
            throw new Error('Failed to update project ownership.');
        }
        console.log(`[CONFIRM TRANSFER] Project ${projectId} ownership transferred to user ${buyerId} (${buyerUsername}). Marked as not for sale.`);

        const updatePrStatusResult = await client.query(
            "UPDATE project_purchase_requests SET status = 'transfer_completed_buyer_confirmed', updated_at = current_timestamp WHERE purchase_request_id = $1 RETURNING *",
            [requestId]
        );

        if (updatePrStatusResult.rowCount === 0) {
            await client.query('ROLLBACK');
            console.error(`[CONFIRM TRANSFER] CRITICAL: Failed to update purchase request ${requestId} status after project ownership transfer.`);
            throw new Error('Failed to update purchase request status post-transfer.');
        }
        console.log(`[CONFIRM TRANSFER] Purchase request ${requestId} status updated to transfer_completed_buyer_confirmed.`);

        const updatedRequest = updatePrStatusResult.rows[0];
        const responseData = {
            ...updatedRequest,
            request_id: updatedRequest.purchase_request_id,
            accepted_price: updatedRequest.offer_amount,
            project_details: projectUpdateResult.rows[0] 
        };

        // console.log(`[CONFIRM TRANSFER] Notification: Buyer ${buyerId} (${buyerUsername}) confirmed asset transfer for request ${requestId}. Project ${request.project_name} successfully transferred.`);
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
                `/projects/${projectId}` // Link to the project page itself
            );
        } catch (notificationError) {
            console.error('Failed to create notification for transfer confirmation:', notificationError);
        }

        await client.query('COMMIT');
        console.log(`[CONFIRM TRANSFER] COMMIT transaction for request: ${requestId}`);
        res.json(responseData);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[CONFIRM TRANSFER] ROLLBACK transaction for request ${requestId} due to error:`, error.message, error.stack);
        res.status(500).json({ error: 'Failed to confirm asset transfer and update project ownership.', details: error.message });
    } finally {
        client.release();
        console.log(`[CONFIRM TRANSFER] DB client released for request: ${requestId}`);
    }
});

// --- Seller Updates Transfer Status/Notes ---
// PUT /api/purchase-requests/:requestId/transfer-status - Frontend sends :requestId
router.put('/:requestId/transfer-status', authMiddleware, async (req, res) => {
    const { requestId } = req.params; 
    const sellerId = req.user.id;
    const sellerUsername = req.user.username;
    const { status, message } = req.body; // message here is transfer_notes

    if (!status) {
        return res.status(400).json({ error: 'New status is required.' });
    }

    const allowedSellerStatuses = [
        'transfer_in_progress', 
        'assets_transferred_pending_buyer_confirmation',
    ];

    if (!allowedSellerStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status update: '${status}'. Seller can only set specific transfer-related statuses.` });
    }

    try {
        const requestCheck = await db.query(
            'SELECT ppr.project_id, ppr.buyer_id, ppr.status, p.name as project_name, u_buyer.username as buyer_username FROM project_purchase_requests ppr JOIN projects p ON ppr.project_id = p.project_id JOIN users u_buyer ON ppr.buyer_id = u_buyer.user_id WHERE ppr.purchase_request_id = $1 AND ppr.seller_id = $2', 
            [requestId, sellerId]
        );

        if (requestCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase request not found or you are not the seller.' });
        }
        
        const currentRequest = requestCheck.rows[0];

        const result = await db.query(
            `UPDATE project_purchase_requests 
             SET status = $1, transfer_notes = $2, status_last_updated = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
             WHERE purchase_request_id = $3 AND seller_id = $4
             RETURNING *`, 
            [status, message, requestId, sellerId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Failed to update transfer status. Request not found or not authorized.' });
        }
        
        const updatedRequest = result.rows[0];
        const responseData = {
            ...updatedRequest,
            request_id: updatedRequest.purchase_request_id,
            accepted_price: updatedRequest.offer_amount
        };

        try {
            let notifMessage = `Seller ${sellerUsername || sellerId} updated the transfer status for "${currentRequest.project_name}" to: ${status.replace(/_/g, ' ')}.`;
            if (message) {
                notifMessage += ` Note: "${message}"`;
            }
            await createNotification(
                currentRequest.buyer_id,
                'TRANSFER_STATUS_UPDATED',
                notifMessage,
                `/dashboard?tab=buyerRequests&requestId=${requestId}`
            );
        } catch (notificationError) {
            console.error('Failed to create notification for transfer status update:', notificationError);
        }

        res.json(responseData);
    } catch (err) { 
        console.error("Error updating transfer status:", err);
        res.status(500).json({ error: 'Failed to update transfer status', details: err.message });
    }
});

// --- Seller Proposes Terms (Seller Action) ---
// PUT /api/purchase-requests/:requestId/seller-propose-terms
router.put('/:requestId/seller-propose-terms', authMiddleware, async (req, res) => {
    const { requestId } = req.params;
    const sellerId = req.user.id;
    const sellerUsername = req.user.username;
    const { seller_commitments, agreed_transferable_assets, seller_proposal_message } = req.body;

    if (!seller_commitments || typeof seller_commitments !== 'object') {
        return res.status(400).json({ error: 'Seller\'s commitments are required and must be an object.' });
    }
    if (!agreed_transferable_assets || typeof agreed_transferable_assets !== 'object') {
        return res.status(400).json({ error: 'List of agreed transferable assets is required and must be an object.' });
    }

    try {
        const requestResult = await db.query(
            'SELECT ppr.status, ppr.buyer_id, p.name as project_name, u_buyer.username as buyer_username FROM project_purchase_requests ppr JOIN projects p ON ppr.project_id = p.project_id JOIN users u_buyer ON ppr.buyer_id = u_buyer.user_id WHERE ppr.purchase_request_id = $1 AND ppr.seller_id = $2',
            [requestId, sellerId]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase request not found or you are not the seller.' });
        }

        const currentRequest = requestResult.rows[0];
        const buyerId = currentRequest.buyer_id;

        if (currentRequest.status !== 'buyer_interest_expressed') {
            return res.status(400).json({ error: `Cannot propose terms for request in status: ${currentRequest.status}.` });
        }

        const updateResult = await db.query(
            `UPDATE project_purchase_requests 
             SET status = 'seller_terms_proposed', 
                 seller_commitments = $1, 
                 agreed_transferable_assets = $2, 
                 seller_proposal_message = $3, 
                 updated_at = NOW() 
             WHERE purchase_request_id = $4 AND seller_id = $5
             RETURNING *`,
            [seller_commitments, agreed_transferable_assets, seller_proposal_message, requestId, sellerId]
        );
        
        const updatedRequest = updateResult.rows[0];

        // console.log(`Notification: Seller ${sellerId} proposed terms for request ${requestId}. Buyer ${buyerId} to review.`);
        try {
            await createNotification(
                buyerId,
                'SELLER_TERMS_PROPOSED',
                `Seller ${sellerUsername || sellerId} has proposed terms for the project "${currentRequest.project_name}". Please review.`,
                `/dashboard?tab=buyerRequests&requestId=${requestId}`
            );
        } catch (notificationError) {
            console.error('Failed to create notification for seller terms proposal:', notificationError);
        }

        res.json(updatedRequest);
    } catch (error) {
        console.error('Error seller proposing terms:', error);
        if (error.code === '22P02' && error.message.includes('invalid input syntax for type json')) {
            return res.status(400).json({ error: 'Invalid format for commitments or assets data.' });
        }
        res.status(500).json({ error: 'Failed to propose terms.' });
    }
});

// --- Buyer Accepts Seller's Proposed Terms (Buyer Action) ---
// PUT /api/purchase-requests/:requestId/buyer-accepts-terms
router.put('/:requestId/buyer-accepts-terms', authMiddleware, async (req, res) => {
    const { requestId } = req.params;
    const buyerId = req.user.id;
    const buyerUsername = req.user.username;
    const { buyer_final_agreement, buyer_digital_signature } = req.body;

    if (!buyer_final_agreement || typeof buyer_final_agreement !== 'object') {
        return res.status(400).json({ error: 'Buyer\'s final agreement details are required and must be an object.' });
    }
    if (typeof buyer_digital_signature !== 'string' || buyer_digital_signature.trim() === '') {
        return res.status(400).json({ error: 'Buyer\'s digital signature is required.' });
    }

    try {
        const requestResult = await db.query(
            'SELECT ppr.status, ppr.seller_id, p.name as project_name, u_seller.username as seller_username FROM project_purchase_requests ppr JOIN projects p ON ppr.project_id = p.project_id JOIN users u_seller ON ppr.seller_id = u_seller.user_id WHERE ppr.purchase_request_id = $1 AND ppr.buyer_id = $2',
            [requestId, buyerId]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase request not found or you are not the buyer.' });
        }

        const currentRequest = requestResult.rows[0];
        const sellerId = currentRequest.seller_id;

        if (currentRequest.status !== 'seller_terms_proposed') {
            return res.status(400).json({ error: `Cannot accept terms for request in status: ${currentRequest.status}. Expected status 'seller_terms_proposed'.` });
        }

        const updateResult = await db.query(
            `UPDATE project_purchase_requests 
             SET status = 'agreement_reached_pending_payment', 
                 buyer_final_agreement = $1, 
                 buyer_digital_signature = $2, 
                 updated_at = NOW() 
             WHERE purchase_request_id = $3 AND buyer_id = $4
             RETURNING *`,
            [buyer_final_agreement, buyer_digital_signature, requestId, buyerId]
        );
        
        const updatedRequest = updateResult.rows[0];

        // console.log(`Notification: Buyer ${buyerId} accepted terms for request ${requestId}. Seller ${sellerId} informed. Buyer can now proceed to payment.`);
        try {
            await createNotification(
                sellerId,
                'BUYER_ACCEPTED_TERMS',
                `Buyer ${buyerUsername || buyerId} has accepted your proposed terms for "${currentRequest.project_name}". They can now proceed to payment.`,
                `/dashboard?tab=sellerRequests&requestId=${requestId}`
            );
            await createNotification(
                buyerId,
                'TERMS_ACCEPTED_SELF',
                `You have accepted the terms for "${currentRequest.project_name}". You can now proceed to payment.`,
                `/dashboard?tab=buyerRequests&requestId=${requestId}`
            );
        } catch (notificationError) {
            console.error('Failed to create notification for buyer accepting terms:', notificationError);
        }

        res.json(updatedRequest);
    } catch (error) {
        console.error('Error buyer accepting terms:', error);
        if (error.code === '22P02' && error.message.includes('invalid input syntax for type json')) {
            return res.status(400).json({ error: 'Invalid format for buyer final agreement data.' });
        }
        res.status(500).json({ error: 'Failed to accept terms.' });
    }
});

// --- Buyer Withdraws Interest (Buyer Action) ---
// PUT /api/purchase-requests/:requestId/withdraw-interest
router.put('/:requestId/withdraw-interest', authMiddleware, async (req, res) => {
    const { requestId } = req.params;
    const buyerId = req.user.id;
    const buyerUsername = req.user.username;
    const { withdrawal_reason } = req.body; 

    try {
        const requestResult = await db.query(
            'SELECT ppr.status, ppr.seller_id, p.name as project_name, u_seller.username as seller_username FROM project_purchase_requests ppr JOIN projects p ON ppr.project_id = p.project_id JOIN users u_seller ON ppr.seller_id = u_seller.user_id WHERE ppr.purchase_request_id = $1 AND ppr.buyer_id = $2',
            [requestId, buyerId]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase request not found or you are not the buyer.' });
        }

        const currentRequest = requestResult.rows[0];
        const sellerId = currentRequest.seller_id;

        const withdrawableStatuses = [
            'buyer_interest_expressed',
            'seller_terms_proposed', 
            'seller_reviewing_interest' 
        ];

        if (!withdrawableStatuses.includes(currentRequest.status)) {
            return res.status(400).json({ error: `Cannot withdraw interest for request in status: ${currentRequest.status}.` });
        }

        const updateResult = await db.query(
            `UPDATE project_purchase_requests 
             SET status = 'buyer_withdrew_interest', 
                 message = $1, 
                 updated_at = NOW() 
             WHERE purchase_request_id = $2 AND buyer_id = $3
             RETURNING *`,
            [withdrawal_reason, requestId, buyerId]
        );
        
        const updatedRequest = updateResult.rows[0];

        // console.log(`Notification: Buyer ${buyerId} withdrew interest for request ${requestId}. Seller ${sellerId} informed.`);
        try {
            await createNotification(
                sellerId,
                'BUYER_WITHDREW_INTEREST',
                `Buyer ${buyerUsername || buyerId} withdrew their interest in "${currentRequest.project_name}". Reason: ${withdrawal_reason || 'Not provided'}`,
                `/dashboard?tab=sellerRequests&requestId=${requestId}`
            );
        } catch (notificationError) {
            console.error('Failed to create notification for buyer withdrawal:', notificationError);
        }

        res.json(updatedRequest);
    } catch (error) {
        console.error('Error buyer withdrawing interest:', error);
        res.status(500).json({ error: 'Failed to withdraw interest.' });
    }
});

// --- Seller Declines Interest (Seller Action) ---
// PUT /api/purchase-requests/:requestId/decline-interest
router.put('/:requestId/decline-interest', authMiddleware, async (req, res) => {
    const { requestId } = req.params;
    const sellerId = req.user.id;
    const sellerUsername = req.user.username;
    const { decline_reason } = req.body; 

    try {
        const requestResult = await db.query(
            'SELECT ppr.status, ppr.buyer_id, p.name as project_name, u_buyer.username as buyer_username FROM project_purchase_requests ppr JOIN projects p ON ppr.project_id = p.project_id JOIN users u_buyer ON ppr.buyer_id = u_buyer.user_id WHERE ppr.purchase_request_id = $1 AND ppr.seller_id = $2',
            [requestId, sellerId]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase request not found or you are not the seller.' });
        }

        const currentRequest = requestResult.rows[0];
        const buyerId = currentRequest.buyer_id;

        const declinableStatuses = [
            'buyer_interest_expressed',
            'seller_reviewing_interest' 
        ];

        if (!declinableStatuses.includes(currentRequest.status)) {
            return res.status(400).json({ error: `Cannot decline interest for request in status: ${currentRequest.status}.` });
        }

        const updateResult = await db.query(
            `UPDATE project_purchase_requests 
             SET status = 'seller_declined_interest', 
                 seller_rejection_reason = $1, 
                 updated_at = NOW() 
             WHERE purchase_request_id = $2 AND seller_id = $3
             RETURNING *`,
            [decline_reason, requestId, sellerId]
        );
        
        const updatedRequest = updateResult.rows[0];

        // console.log(`Notification: Seller ${sellerId} declined interest for request ${requestId}. Buyer ${buyerId} informed.`);
        try {
            await createNotification(
                buyerId,
                'SELLER_DECLINED_INTEREST',
                `Seller ${sellerUsername || sellerId} declined your interest in "${currentRequest.project_name}". Reason: ${decline_reason || 'Not provided'}`,
                `/dashboard?tab=buyerRequests&requestId=${requestId}`
            );
        } catch (notificationError) {
            console.error('Failed to create notification for seller declining interest:', notificationError);
        }

        res.json(updatedRequest);
    } catch (error) {
        console.error('Error seller declining interest:', error);
        res.status(500).json({ error: 'Failed to decline interest.' });
    }
});

module.exports = router; 