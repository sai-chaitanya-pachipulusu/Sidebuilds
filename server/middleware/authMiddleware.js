const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function(req, res, next) {
    // Get token from header - support both formats
    let token = req.header('x-auth-token'); // Legacy format
    
    // If no legacy token, check for Authorization Bearer format
    if (!token) {
        const authHeader = req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
    }

    // Check if no token found in either format
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied.' });
    }

    // Debug log token info - development only (NO token content logged)
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH === 'true') {
        console.log('[AUTH] Token validation in progress');
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add user from payload to the request object
        // Support both user_id and id for backwards compatibility
        const userPayload = decoded.user || {};
        req.user = {
            ...userPayload,
            user_id: userPayload.user_id || userPayload.id, // Ensure user_id is always present
            id: userPayload.user_id || userPayload.id // Also set id for compatibility
        };
        next(); // Call the next middleware or route handler
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[AUTH] Token verification failed:', err.name);
        }
        
        // Better error handling for different token issues
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired, please login again.' });
        } else if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token format.' });
        }
        
        res.status(401).json({ message: 'Token is not valid.' });
    }
}; 