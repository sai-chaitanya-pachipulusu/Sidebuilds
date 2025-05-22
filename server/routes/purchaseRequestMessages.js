const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams allows access to :requestId
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const { createNotification } = require('../services/notificationService');
const { io } = require('../index'); // Import io

// POST /api/purchase-requests/:requestId/messages - Send a message
router.post('/', authMiddleware, async (req, res) => {
    const { requestId } = req.params;
    const senderId = req.user.id;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim() === '') {
        return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    try {
        const prQuery = 'SELECT pr.buyer_id, pr.seller_id, p.project_name, u_buyer.username as buyer_username, u_seller.username as seller_username FROM project_purchase_requests pr JOIN projects p ON pr.project_id = p.project_id JOIN users u_buyer ON pr.buyer_id = u_buyer.id JOIN users u_seller ON pr.seller_id = u_seller.id WHERE pr.request_id = $1';
        const prResult = await db.query(prQuery, [requestId]);

        if (prResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase request not found.' });
        }

        const purchaseRequest = prResult.rows[0];
        let receiverId;
        let receiverUsername;
        let senderUsername;

        if (senderId === purchaseRequest.buyer_id) {
            receiverId = purchaseRequest.seller_id;
            receiverUsername = purchaseRequest.seller_username;
            senderUsername = purchaseRequest.buyer_username;
        } else if (senderId === purchaseRequest.seller_id) {
            receiverId = purchaseRequest.buyer_id;
            receiverUsername = purchaseRequest.buyer_username;
            senderUsername = purchaseRequest.seller_username;
        } else {
            return res.status(403).json({ error: 'You are not authorized to send messages for this request.' });
        }

        const insertMsgQuery = `
            INSERT INTO purchase_request_messages (purchase_request_id, sender_id, receiver_id, content)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const msgResult = await db.query(insertMsgQuery, [requestId, senderId, receiverId, content]);
        const newMessageData = msgResult.rows[0];

        // Emit socket event for the new message to the receiver
        if (io) {
            // We add sender_username to the payload for easier display on client
            const messagePayload = { 
                ...newMessageData, 
                sender_username: senderUsername, 
                project_name: purchaseRequest.project_name 
            };
            io.to(receiverId).emit('new_message', messagePayload);
            console.log(`[PurchaseRequestMessages] Emitted 'new_message' to user room: ${receiverId}`);
        }

        // Create a notification for the receiver (this will also emit a socket event via notificationService)
        const notificationMessage = `New message from ${senderUsername} regarding "${purchaseRequest.project_name}".`;
        const notificationLink = `/dashboard?requestId=${requestId}&view=messages`; 
        await createNotification(receiverId, 'NEW_MESSAGE_PURCHASE_REQUEST', notificationMessage, notificationLink);

        // Return the created message (original object without the added usernames for consistency of POST response)
        res.status(201).json(newMessageData); 

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message.' });
    }
});

// GET /api/purchase-requests/:requestId/messages - Fetch messages for a request
router.get('/', authMiddleware, async (req, res) => {
    const { requestId } = req.params;
    const currentUserId = req.user.id;

    try {
        // 1. Verify the purchase request exists and the current user is part of it
        // Fetch usernames along with IDs for context
        const prQuery = 'SELECT pr.buyer_id, pr.seller_id, u_buyer.username as buyer_username, u_seller.username as seller_username FROM project_purchase_requests pr JOIN users u_buyer ON pr.buyer_id = u_buyer.id JOIN users u_seller ON pr.seller_id = u_seller.id WHERE pr.request_id = $1';
        const prResult = await db.query(prQuery, [requestId]);

        if (prResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase request not found.' });
        }

        const purchaseRequest = prResult.rows[0];
        if (currentUserId !== purchaseRequest.buyer_id && currentUserId !== purchaseRequest.seller_id) {
            return res.status(403).json({ error: 'You are not authorized to view messages for this request.' });
        }

        // 2. Fetch messages and join with sender's username
        const getMsgsQuery = `
            SELECT m.*, u.username as sender_username
            FROM purchase_request_messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.purchase_request_id = $1
            ORDER BY m.created_at ASC;
        `;
        const msgsResult = await db.query(getMsgsQuery, [requestId]);
        const messages = msgsResult.rows;

        const unreadMessageIds = messages
            .filter(msg => msg.receiver_id === currentUserId && !msg.is_read)
            .map(msg => msg.message_id);

        if (unreadMessageIds.length > 0) {
            const markReadQuery = `
                UPDATE purchase_request_messages
                SET is_read = TRUE
                WHERE message_id = ANY($1::uuid[]) AND receiver_id = $2;
            `;
            await db.query(markReadQuery, [unreadMessageIds, currentUserId]);
            messages.forEach(msg => {
                if (unreadMessageIds.includes(msg.message_id)) {
                    msg.is_read = true;
                }
            });
        }

        res.status(200).json(messages);

    } catch (error) {
        console.error('Error fetching messages:', error);
        if (error.message.includes("invalid input syntax for type uuid")) {
             return res.status(400).json({ error: 'Invalid request ID format.' });
        }
        res.status(500).json({ error: 'Failed to fetch messages.' });
    }
});

module.exports = router; 