const db = require('../db');

let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

const getIO = () => ioInstance;

// notifications.title is NOT NULL in the schema — derive a human-readable
// title from the type when the caller doesn't supply one.
const titleFromType = (type) => {
    return String(type)
        .toLowerCase()
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
};

const createNotification = async (userId, type, message, link = null, title = null) => {
    if (!userId || !type || !message) {
        console.error('[NotificationService] Missing required parameters:', { userId, type, message });
        throw new Error('User ID, type, and message are required to create a notification.');
    }

    let notificationData;
    try {
        const query = `
            INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
            VALUES ($1, $2, $3, $4, $5, FALSE, NOW())
            RETURNING *;
        `;
        const { rows } = await db.query(query, [userId, type, title || titleFromType(type), message, link]);
        if (rows.length === 0) {
            throw new Error('Failed to create notification, no rows returned.');
        }
        notificationData = rows[0];
    } catch (error) {
        console.error(`[NotificationService] Error creating notification for user ${userId}:`, error);
        throw new Error(`Failed to create notification database entry. Details: ${error.message}`);
    }

    try {
        if (ioInstance && notificationData) {
            ioInstance.to(`user_${userId}`).emit('new_notification', notificationData);
        } else {
            console.warn('[NotificationService] Socket.io instance not available, skipping event emission.');
        }
    } catch (socketError) {
        console.error(`[NotificationService] Error emitting socket event for user ${userId}:`, socketError);
    }

    return notificationData;
};

module.exports = {
    createNotification,
    setIO,
    getIO,
};
