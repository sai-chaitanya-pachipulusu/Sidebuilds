const db = require('../db'); // Corrected path to db.js
const { io } = require('../index'); // Import the io instance

/**
 * Creates a notification for a user and emits a socket event.
 *
 * @param {string} userId - The ID of the user to notify.
 * @param {string} type - The type of notification (e.g., 'NEW_INTEREST', 'TERMS_PROPOSED').
 * @param {string} message - The notification message.
 * @param {string} [link] - An optional link associated with the notification.
 * @returns {Promise<object>} The created notification object.
 * @throws {Error} If database insertion or event emission fails.
 */
const createNotification = async (userId, type, message, link = null) => {
    if (!userId || !type || !message) {
        console.error('[NotificationService] Missing required parameters for createNotification:', { userId, type, message });
        throw new Error('User ID, type, and message are required to create a notification.');
    }

    let notificationData;
    try {
        const query = `
            INSERT INTO notifications (user_id, type, message, link, is_read, created_at)
            VALUES ($1, $2, $3, $4, FALSE, NOW())
            RETURNING *;
        `;
        const { rows } = await db.query(query, [userId, type, message, link]);
        if (rows.length === 0) {
            throw new Error('Failed to create notification, no rows returned.');
        }
        notificationData = rows[0];
        console.log(`[NotificationService] Notification created for user ${userId}, type: ${type}, ID: ${notificationData.notification_id}`);
        
    } catch (error) {
        console.error(`[NotificationService] Error creating notification DB entry for user ${userId}:`, error);
        throw new Error(`Failed to create notification database entry. Details: ${error.message}`);
    }

    try {
        if (io && notificationData) {
            // Emit an event to a room specific to the user_id
            // The client will need to join this room upon connection/login
            io.to(userId).emit('new_notification', notificationData);
            console.log(`[NotificationService] Emitted 'new_notification' to user room: ${userId}`);
        } else {
            console.warn('[NotificationService] Socket.io instance (io) not available or notificationData missing, skipping event emission.');
        }
    } catch (socketError) {
        console.error(`[NotificationService] Error emitting socket event for user ${userId}:`, socketError);
        // Decide if this error should cause the whole function to fail.
        // For now, we'll log it but assume the DB part was the critical one.
    }
    
    return notificationData;
};

module.exports = {
    createNotification,
}; 