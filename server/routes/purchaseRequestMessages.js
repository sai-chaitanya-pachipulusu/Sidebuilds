const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const db = require('../db');

// @route   GET /api/purchase-requests/:requestId/messages
// @desc    Get all messages for a purchase request
// @access  Private (buyer or seller only)
router.get('/', auth, async (req, res) => {
    try {
        const { requestId } = req.params;
        
        // First verify the purchase request exists and user has access
        const requestCheck = await db.query(
            `SELECT purchase_request_id, buyer_id, seller_id 
             FROM project_purchase_requests 
             WHERE purchase_request_id = $1`,
            [requestId]
        );

        if (requestCheck.rows.length === 0) {
            return res.status(404).json({ msg: 'Purchase request not found' });
        }

        const request = requestCheck.rows[0];
        if (request.buyer_id !== req.user.id && request.seller_id !== req.user.id) {
            return res.status(403).json({ msg: 'User not authorized to view these messages' });
        }

        // For now, return structured messages from the existing message fields
        // This provides a consistent API while using existing database structure
        const messages = [];
        
        // Get purchase request with all message fields
        const fullRequest = await db.query(
            `SELECT pr.*, p.name as project_name,
                    buyer.username as buyer_username,
                    seller.username as seller_username
             FROM project_purchase_requests pr
             JOIN projects p ON pr.project_id = p.project_id
             JOIN users buyer ON pr.buyer_id = buyer.user_id
             JOIN users seller ON pr.seller_id = seller.user_id
             WHERE pr.purchase_request_id = $1`,
            [requestId]
        );

        const requestData = fullRequest.rows[0];

        // Structure existing messages into conversation format
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

        // Add status update messages
        messages.push({
            id: `status_${requestId}`,
            content: `Purchase request status: ${requestData.status}`,
            message_type: 'status',
            created_at: requestData.updated_at || requestData.created_at,
            is_system_message: true
        });

        // Sort messages by creation time
        messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        res.json({
            purchase_request_id: requestId,
            messages: messages,
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
        res.status(500).json({ error: 'Server Error', details: err.message });
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

    try {
        const { requestId } = req.params;
        
        // Verify purchase request exists and user has access
        const requestCheck = await db.query(
            `SELECT pr.purchase_request_id, pr.buyer_id, pr.seller_id, pr.status,
                    p.name as project_name, p.project_id
             FROM project_purchase_requests pr
             JOIN projects p ON pr.project_id = p.project_id
             WHERE pr.purchase_request_id = $1`,
            [requestId]
        );

        if (requestCheck.rows.length === 0) {
            return res.status(404).json({ msg: 'Purchase request not found' });
        }

        const request = requestCheck.rows[0];
        if (request.buyer_id !== req.user.id && request.seller_id !== req.user.id) {
            return res.status(403).json({ msg: 'User not authorized to send messages here' });
        }

        // Determine recipient
        const recipientId = request.buyer_id === req.user.id ? request.seller_id : request.buyer_id;
        
        // For now, we'll create a simple messages table if it doesn't exist
        // First check if messages table exists
        const tableCheck = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'purchase_request_messages'
        `);

        // Create messages table if it doesn't exist
        if (tableCheck.rows.length === 0) {
            await db.query(`
                CREATE TABLE IF NOT EXISTS purchase_request_messages (
                    message_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    purchase_request_id UUID REFERENCES project_purchase_requests(purchase_request_id) ON DELETE CASCADE,
                    sender_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
                    recipient_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    message_type VARCHAR(50) DEFAULT 'general',
                    is_read BOOLEAN DEFAULT false,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            `);
        }

        // Insert the new message
        const newMessage = await db.query(
            `INSERT INTO purchase_request_messages 
                (purchase_request_id, sender_id, recipient_id, content, message_type, created_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
             RETURNING message_id, purchase_request_id, sender_id, recipient_id, content, message_type, created_at`,
            [requestId, req.user.id, recipientId, content.trim(), message_type]
        );

        const savedMessage = newMessage.rows[0];

        // Get sender username for response
        const senderInfo = await db.query(
            `SELECT username FROM users WHERE user_id = $1`,
            [req.user.id]
        );

        // Update the purchase request's updated_at timestamp
        await db.query(
            `UPDATE project_purchase_requests 
             SET updated_at = CURRENT_TIMESTAMP 
             WHERE purchase_request_id = $1`,
            [requestId]
        );

        // Create notification for recipient
        try {
            await db.query(
                `INSERT INTO notifications (user_id, type, message, link, created_at)
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
                [
                    recipientId,
                    'new_message',
                    `You have a new message regarding "${request.project_name}".`,
                    `/dashboard/requests/${requestId}`
                ]
            );
        } catch (notificationErr) {
            console.error('Error creating notification:', notificationErr.message);
            // Continue - don't fail the message send if notification fails
        }

        // Return the message with sender info
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

        res.status(201).json(responseMessage);

    } catch (err) {
        console.error('Error sending message:', err.message);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
});

// @route   GET /api/purchase-requests/:requestId/messages/unread
// @desc    Get count of unread messages for current user
// @access  Private
router.get('/unread', auth, async (req, res) => {
    try {
        const { requestId } = req.params;
        
        // Check if messages table exists
        const tableCheck = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'purchase_request_messages'
        `);

        if (tableCheck.rows.length === 0) {
            return res.json({ unread_count: 0 });
        }

        const unreadCount = await db.query(
            `SELECT COUNT(*) as unread_count
             FROM purchase_request_messages 
             WHERE purchase_request_id = $1 
             AND recipient_id = $2 
             AND is_read = false`,
            [requestId, req.user.id]
        );

        res.json({ unread_count: parseInt(unreadCount.rows[0].unread_count) });

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
        
        // Check if messages table exists
        const tableCheck = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'purchase_request_messages'
        `);

        if (tableCheck.rows.length === 0) {
            return res.json({ marked_read: 0 });
        }

        const result = await db.query(
            `UPDATE purchase_request_messages 
             SET is_read = true, updated_at = CURRENT_TIMESTAMP
             WHERE purchase_request_id = $1 
             AND recipient_id = $2 
             AND is_read = false`,
            [requestId, req.user.id]
        );

        res.json({ marked_read: result.rowCount });

    } catch (err) {
        console.error('Error marking messages as read:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;