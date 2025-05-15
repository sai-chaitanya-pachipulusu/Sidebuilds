const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Assuming your db config is here
const authMiddleware = require('../middleware/authMiddleware'); // Assuming auth middleware

// --- Create a new Purchase Request (Buyer Action) ---
// POST /api/purchase-requests/projects/:projectId/request
router.post('/projects/:projectId/request', authMiddleware, async (req, res) => {
    const { projectId } = req.params;
    const buyerId = req.user.id;
    const { terms_agreed_version } = req.body;

    if (!terms_agreed_version) {
        return res.status(400).json({ error: 'Terms agreement is required.' });
    }

    try {
        // Fetch project details to get seller_id and current price
        const projectResult = await db.query(
            'SELECT owner_id, sale_price FROM projects WHERE project_id = $1 AND is_for_sale = TRUE',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or not for sale.' });
        }
        const project = projectResult.rows[0];
        const sellerId = project.owner_id;

        if (sellerId === buyerId) {
            return res.status(400).json({ error: 'You cannot request to purchase your own project.' });
        }

        // Check for existing pending requests for the same project by the same buyer
        const existingRequest = await db.query(
            "SELECT request_id FROM project_purchase_requests WHERE project_id = $1 AND buyer_id = $2 AND status IN ('pending_seller_approval', 'seller_accepted_pending_payment')",
            [projectId, buyerId]
        );

        if (existingRequest.rows.length > 0) {
            return res.status(400).json({ error: 'You already have an active request for this project.' });
        }

        const result = await db.query(
            'INSERT INTO project_purchase_requests (project_id, buyer_id, seller_id, status, buyer_agreed_terms_version, accepted_price) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [projectId, buyerId, sellerId, 'pending_seller_approval', terms_agreed_version, project.sale_price] // Store current sale_price as initial accepted_price
        );

        // TODO: Implement notification to seller
        console.log(`Notification: New purchase request ${result.rows[0].request_id} for project ${projectId} by buyer ${buyerId} for seller ${sellerId}`);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating purchase request:', error);
        res.status(500).json({ error: 'Failed to create purchase request.' });
    }
});

// --- Get Purchase Requests for Seller (Seller Action) ---
// GET /api/purchase-requests/seller
router.get('/seller', authMiddleware, async (req, res) => {
    const sellerId = req.user.id;
    try {
        const result = await db.query(
            "SELECT ppr.*, p.name as project_name, u.username as buyer_username FROM project_purchase_requests ppr JOIN projects p ON ppr.project_id = p.project_id JOIN users u ON ppr.buyer_id = u.user_id WHERE ppr.seller_id = $1 AND ppr.status = 'pending_seller_approval' ORDER BY ppr.request_date DESC",
            [sellerId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching seller purchase requests:', error);
        res.status(500).json({ error: 'Failed to fetch purchase requests.' });
    }
});

// --- Get Purchase Requests for Buyer (Buyer Action) ---
// GET /api/purchase-requests/buyer
router.get('/buyer', authMiddleware, async (req, res) => {
    const buyerId = req.user.id;
    try {
        const result = await db.query(
            "SELECT ppr.*, p.name as project_name, u.username as seller_username FROM project_purchase_requests ppr JOIN projects p ON ppr.project_id = p.project_id JOIN users u ON ppr.seller_id = u.user_id WHERE ppr.buyer_id = $1 ORDER BY ppr.request_date DESC",
            [buyerId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching buyer purchase requests:', error);
        res.status(500).json({ error: 'Failed to fetch purchase requests.' });
    }
});

// --- Accept a Purchase Request (Seller Action) ---
// POST /api/purchase-requests/:requestId/accept
router.post('/:requestId/accept', authMiddleware, async (req, res) => {
    const { requestId } = req.params;
    const sellerId = req.user.id;
    const { terms_agreed_version } = req.body;

    if (!terms_agreed_version) {
        return res.status(400).json({ error: 'Terms agreement is required from seller.' });
    }

    try {
        const requestResult = await db.query(
            'SELECT * FROM project_purchase_requests WHERE request_id = $1 AND seller_id = $2',
            [requestId, sellerId]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase request not found or you are not the seller.' });
        }

        const request = requestResult.rows[0];
        if (request.status !== 'pending_seller_approval') {
            return res.status(400).json({ error: `Request cannot be accepted. Current status: ${request.status}` });
        }

        // Update the request status and seller's terms agreement
        // Note: accepted_price was already set at request creation from current project.sale_price.
        // If price can change between request and acceptance, logic to update accepted_price would be needed here.
        const updateResult = await db.query(
            "UPDATE project_purchase_requests SET status = 'seller_accepted_pending_payment', seller_agreed_terms_version = $1, updated_at = current_timestamp WHERE request_id = $2 RETURNING *",
            [terms_agreed_version, requestId]
        );

        // TODO: Implement notification to buyer
        console.log(`Notification: Purchase request ${requestId} accepted by seller ${sellerId}. Buyer ${request.buyer_id} can now proceed to payment.`);

        res.json(updateResult.rows[0]);
    } catch (error) {
        console.error('Error accepting purchase request:', error);
        res.status(500).json({ error: 'Failed to accept purchase request.' });
    }
});

// --- Reject a Purchase Request (Seller Action) ---
// POST /api/purchase-requests/:requestId/reject
router.post('/:requestId/reject', authMiddleware, async (req, res) => {
    const { requestId } = req.params;
    const sellerId = req.user.id;
    const { rejection_reason } = req.body; // Optional

    try {
        const requestResult = await db.query(
            'SELECT buyer_id FROM project_purchase_requests WHERE request_id = $1 AND seller_id = $2',
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
            "UPDATE project_purchase_requests SET status = 'seller_rejected', seller_rejection_reason = $1, updated_at = current_timestamp WHERE request_id = $2 RETURNING *",
            [rejection_reason, requestId]
        );

        // TODO: Implement notification to buyer
        console.log(`Notification: Purchase request ${requestId} rejected by seller ${sellerId}. Buyer ${request.buyer_id} notified.`);

        res.json(updateResult.rows[0]);
    } catch (error) {
        console.error('Error rejecting purchase request:', error);
        res.status(500).json({ error: 'Failed to reject purchase request.' });
    }
});


// --- Buyer confirms asset transfer ---
// POST /api/purchase-requests/:requestId/confirm-transfer
router.post('/:requestId/confirm-transfer', authMiddleware, async (req, res) => {
    const { requestId } = req.params;
    const buyerId = req.user.id;

    try {
        const requestResult = await db.query(
            'SELECT * FROM project_purchase_requests WHERE request_id = $1 AND buyer_id = $2',
            [requestId, buyerId]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase request not found or you are not the buyer.' });
        }

        const request = requestResult.rows[0];
        // Ensure transfer is in a state where buyer can confirm
        // e.g., 'assets_transferred_pending_buyer_confirmation'
        if (request.status !== 'assets_transferred_pending_buyer_confirmation') {
             return res.status(400).json({ error: `Cannot confirm transfer at this stage. Current status: ${request.status}` });
        }

        const updateResult = await db.query(
            "UPDATE project_purchase_requests SET status = 'transfer_completed_buyer_confirmed', updated_at = current_timestamp WHERE request_id = $1 RETURNING *",
            [requestId]
        );
        
        // Potentially update project_transfers table status as well if it has its own more granular status
        // await db.query("UPDATE project_transfers SET status = 'buyer_confirmed' WHERE transaction_id = $1", [request.transaction_id]);


        // TODO: Implement notification to seller about confirmation
        console.log(`Notification: Buyer ${buyerId} confirmed asset transfer for request ${requestId}.`);

        res.json(updateResult.rows[0]);
    } catch (error) {
        console.error('Error confirming asset transfer:', error);
        res.status(500).json({ error: 'Failed to confirm asset transfer.' });
    }
});


module.exports = router; 