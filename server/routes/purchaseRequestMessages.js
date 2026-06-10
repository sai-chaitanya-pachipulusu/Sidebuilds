const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/authMiddleware');
const db = require('../db');

// Verify the purchase request exists and the current user is a participant.
// Returns the request row or sends the appropriate error response.
async function loadRequestForUser(requestId, userId, res) {
    const requestCheck = await db.query(
        `SELECT pr.id, pr.buyer_id, pr.seller_id, pr.status,
                p.name as project_name, p.project_id
         FROM purchase_requests pr
         JOIN projects p ON pr.project_id = p.project_id
         WHERE pr.id = $1`,
        [requestId]
    );

    if (requestCheck.rows.length === 0) {
        res.status(404).json({ msg: 'Purchase request not found' });
        return null;
    }

    const request = requestCheck.rows[0];
    if (request.buyer_id !== userId && request.seller_id !== userId) {
        res.status(403).json({ msg: 'User not authorized for this conversation' });
        return null;
    }

    return request;
}

// @route   GET /api/purchase-requests/:requestId/messages
// @desc    Get all messages for a purchase request
// @access  Private (buyer or seller only)
router.get('/', auth, async (req, res) => {
    try {
        const { requestId } = req.params;

        const request = await loadRequestForUser(requestId, req.user.user_id, res);
        if (!request) return;

        const fullRequest = await db.query(
            `SELECT pr.*, p.name as project_name,
                    buyer.username as buyer_username,
                    seller.username as seller_username
             FROM purchase_requests pr
             JOIN projects p ON pr.project_id = p.project_id
             JOIN users buyer ON pr.buyer_id = buyer.user_id
             JOIN users seller ON pr.seller_id = seller.user_id
             WHERE pr.id = $1`,
            [requestId]
        );

        const requestData = fullRequest.rows[0];
        const messages = [];

        // Synthesize the negotiation messages stored on the request itself
        if (requestData.buyer_intro_message) {
            messages.push({
                id: `intro_${requestId}`,
                sender_id: requestData.buyer_id,
                sender_username: requestData.buyer_username,
                content: requestData.buyer_intro_message,
                message_type: 'intro',
                created_at: requestData.created_at,
                is_system_message: false
            });
        }

        if (requestData.seller_proposal_message) {
            messages.push({
                id: `proposal_${requestId}`,
                sender_id: requestData.seller_id,
                sender_username: requestData.seller_username,
                content: requestData.seller_proposal_message,
                message_type: 'proposal',
                created_at: requestData.updated_at || requestData.created_at,
                is_system_message: false
            });
        }

        if (requestData.message) {
            messages.push({
                id: `general_${requestId}`,
                sender_id: requestData.buyer_id,
                sender_username: requestData.buyer_username,
                content: requestData.message,
                message_type: 'general',
                created_at: requestData.created_at,
                is_system_message: false
            });
        }

        // Conversation messages persisted in purchase_request_messages
        const storedMessages = await db.query(
            `SELECT m.message_id, m.sender_id, m.recipient_id, m.content,
                    m.message_type, m.is_read, m.is_system_message,
                    m.attachment_url, m.created_at,
                    u.username as sender_username
             FROM purchase_request_messages m
             LEFT JOIN users u ON m.sender_id = u.user_id
             WHERE m.purchase_request_id = $1
             ORDER BY m.created_at ASC`,
            [requestId]
        );

        for (const row of storedMessages.rows) {
            messages.push({
                id: row.message_id,
                sender_id: row.sender_id,
                sender_username: row.sender_username,
                recipient_id: row.recipient_id,
                content: row.content,
                message_type: row.message_type,
                created_at: row.created_at,
                is_read: row.is_read,
                is_system_message: row.is_system_message,
                attachment_url: row.attachment_url
            });
        }

        messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        res.json({
            purchase_request_id: requestId,
            messages,
            participant_info: {
                buyer: {
                    id: requestData.buyer_id,
                    username: requestData.buyer_username
                },
                seller: {
                    id: requestData.seller_id,
                    username: requestData.seller_username
                }
            },
            project_name: requestData.project_name
        });

    } catch (err) {
        console.error('Error fetching purchase request messages:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /api/purchase-requests/:requestId/messages
// @desc    Send a message in a purchase request conversation
// @access  Private (buyer or seller only)
router.post('/', auth, async (req, res) => {
    const { content, message_type = 'general' } = req.body;

    if (!content || content.trim() === '') {
        return res.status(400).json({ msg: 'Message content is required' });
    }

    if (content.length > 5000) {
        return res.status(400).json({ msg: 'Message is too long (max 5000 characters)' });
    }

    try {
        const { requestId } = req.params;

        const request = await loadRequestForUser(requestId, req.user.user_id, res);
        if (!request) return;

        const recipientId = request.buyer_id === req.user.user_id ? request.seller_id : request.buyer_id;
        const trimmedContent = content.trim();

        // "message" mirrors "content" for legacy readers of this table
        const newMessage = await db.query(
            `INSERT INTO purchase_request_messages
                (purchase_request_id, sender_id, recipient_id, content, message, message_type)
             VALUES ($1, $2, $3, $4, $4, $5)
             RETURNING message_id, purchase_request_id, sender_id, recipient_id, content, message_type, created_at`,
            [requestId, req.user.user_id, recipientId, trimmedContent, message_type]
        );

        const savedMessage = newMessage.rows[0];

        const senderInfo = await db.query(
            `SELECT username FROM users WHERE user_id = $1`,
            [req.user.user_id]
        );

        await db.query(
            `UPDATE purchase_requests
             SET updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [requestId]
        );

        const responseMessage = {
            id: savedMessage.message_id,
            purchase_request_id: savedMessage.purchase_request_id,
            sender_id: savedMessage.sender_id,
            recipient_id: savedMessage.recipient_id,
            sender_username: senderInfo.rows[0]?.username,
            content: savedMessage.content,
            message_type: savedMessage.message_type,
            created_at: savedMessage.created_at,
            is_system_message: false
        };

        // Real-time delivery to anyone viewing this conversation
        try {
            const io = req.app.get('io');
            if (io) {
                io.to(`purchase_${requestId}`).emit('message_received', responseMessage);
                io.to(`user_${recipientId}`).emit('new_message_notification', {
                    purchase_request_id: requestId,
                    project_name: request.project_name,
                    sender_username: responseMessage.sender_username
                });
            }
        } catch (socketErr) {
            console.error('Socket broadcast error (message still saved):', socketErr.message);
        }

        // Notification for the recipient (non-fatal if it fails)
        try {
            const { createNotification } = require('../services/notificationService');
            await createNotification(
                recipientId,
                'new_message',
                `You have a new message regarding "${request.project_name}".`,
                `/dashboard/requests/${requestId}`
            );
        } catch (notificationErr) {
            console.error('Error creating notification:', notificationErr.message);
        }

        res.status(201).json(responseMessage);

    } catch (err) {
        console.error('Error sending message:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   GET /api/purchase-requests/:requestId/messages/unread
// @desc    Get count of unread messages for current user
// @access  Private
router.get('/unread', auth, async (req, res) => {
    try {
        const { requestId } = req.params;

        const unreadCount = await db.query(
            `SELECT COUNT(*) as unread_count
             FROM purchase_request_messages
             WHERE purchase_request_id = $1
             AND recipient_id = $2
             AND is_read = false`,
            [requestId, req.user.user_id]
        );

        res.json({ unread_count: parseInt(unreadCount.rows[0].unread_count) || 0 });

    } catch (err) {
        console.error('Error getting unread count:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   PUT /api/purchase-requests/:requestId/messages/mark-read
// @desc    Mark all messages as read for current user
// @access  Private
router.put('/mark-read', auth, async (req, res) => {
    try {
        const { requestId } = req.params;

        const result = await db.query(
            `UPDATE purchase_request_messages
             SET is_read = true, updated_at = CURRENT_TIMESTAMP
             WHERE purchase_request_id = $1
             AND recipient_id = $2
             AND is_read = false`,
            [requestId, req.user.user_id]
        );

        res.json({ marked_read: result.rowCount || 0 });

    } catch (err) {
        console.error('Error marking messages as read:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
