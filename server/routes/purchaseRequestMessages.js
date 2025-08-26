const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const PurchaseRequest = require('../../models/PurchaseRequest');
const PurchaseRequestMessage = require('../../models/PurchaseRequestMessage');
const { createNotification } = require('../services/notificationService');

// @route   GET /api/purchase-requests/:requestId/messages
// @desc    Get all messages for a purchase request
// @access  Private (buyer or seller only)
router.get('/:requestId/messages', auth, async (req, res) => {
    try {
        const request = await PurchaseRequest.findById(req.params.requestId);
        if (!request) {
            return res.status(404).json({ msg: 'Purchase request not found' });
        }
        if (request.buyer.toString() !== req.user.id && request.seller.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'User not authorized to view these messages' });
        }
        const messages = await PurchaseRequestMessage.find({ purchaseRequest: req.params.requestId }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/purchase-requests/:requestId/messages
// @desc    Send a message in a purchase request conversation
// @access  Private (buyer or seller only)
router.post('/:requestId/messages', auth, async (req, res) => {
    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ msg: 'Message content is required' });
    }

    try {
        const request = await PurchaseRequest.findById(req.params.requestId).populate('project');
        if (!request) {
            return res.status(404).json({ msg: 'Purchase request not found' });
        }
        if (request.buyer.toString() !== req.user.id && request.seller.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'User not authorized to send messages here' });
        }
        
        const recipientId = request.buyer.toString() === req.user.id ? request.seller : request.buyer;

        const newMessage = new PurchaseRequestMessage({
            purchaseRequest: req.params.requestId,
            sender: req.user.id,
            recipient: recipientId,
            content: content
        });

        await newMessage.save();

        await createNotification(
            recipientId,
            'new_message',
            `You have a new message regarding "${request.project.name}".`,
            `/dashboard/requests/${request._id}`
        );

        res.status(201).json(newMessage);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router; 