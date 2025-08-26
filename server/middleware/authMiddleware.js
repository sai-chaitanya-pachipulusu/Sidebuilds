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
        console.log('❌ No token found in request headers');
        return res.status(401).json({ message: 'No token, authorization denied.' });
    }

    // Debug log token info (without exposing the full token) - development only
    if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 Token received - length:', token.length, 'starts with:', token.substring(0, 20) + '...');
    }

    // Verify token
    try {
        if (process.env.NODE_ENV !== 'production') {
            console.log('🔍 JWT_SECRET available:', !!process.env.JWT_SECRET);
            console.log('🔍 JWT_SECRET length:', process.env.JWT_SECRET?.length);
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (process.env.NODE_ENV !== 'production') {
            console.log('✅ Token verified successfully for user:', decoded.user?.id);
        }

        // Add user from payload to the request object
        req.user = decoded.user; // The payload we set during login/register { user: { id: ..., username: ..., email: ... } }
        next(); // Call the next middleware or route handler
    } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('❌ Token verification failed:', err.name, err.message);
            console.error('Token starts with:', token.substring(0, 50) + '...');
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