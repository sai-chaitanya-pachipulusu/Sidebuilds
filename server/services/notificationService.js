const db = require('../db');
const { randomUUID } = require('crypto');

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

const createNotification = async (userId, type, message, actionUrl = null, title = null) => {
    if (!userId || !type || !message) {
        console.error('[NotificationService] Missing required parameters:', { userId, type, message });
        throw new Error('User ID, type, and message are required to create a notification.');
    }

    let notificationData;
    try {
        // Older SQLite databases use an integer autoincrement key; PostgreSQL uses UUIDs.
        const sqlite = db.dialect === 'sqlite';
        const query = `
            INSERT INTO notifications (${sqlite ? '' : 'notification_id, '}user_id, type, title, message, action_url, is_read, created_at)
            VALUES (${sqlite ? '' : '$6, '}$1, $2, $3, $4, $5, FALSE, NOW())
            RETURNING *;
        `;
        const params = [userId, type, title || titleFromType(type), message, actionUrl];
        if (!sqlite) params.push(randomUUID());
        const { rows } = await db.query(query, params);
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
