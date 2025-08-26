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

    // Additional token format validation
    if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ message: 'Invalid token: token is empty or null.' });
    }

    // Check JWT format (should have 3 parts separated by dots)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
        return res.status(401).json({ message: 'Invalid token format: JWT must have 3 parts.' });
    }

    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET environment variable is not set');
        return res.status(500).json({ message: 'Server configuration error.' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Validate decoded payload structure
        if (!decoded.user || !decoded.user.id) {
            console.error('Token payload missing required user data:', decoded);
            return res.status(401).json({ message: 'Invalid token: missing user data.' });
        }

        // Add user from payload to the request object
        req.user = decoded.user; // The payload we set during login/register { user: { id: ..., username: ..., email: ... } }
        next(); // Call the next middleware or route handler
    } catch (err) {
        // Enhanced error logging for debugging
        console.error('Token verification failed:', {
            error: err.name,
            message: err.message,
            tokenLength: token.length,
            tokenStart: token.substring(0, 20) + '...'
        });

        // Token refresh logic
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired, please login again' });
        } else if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                message: 'Invalid token format.',
                details: err.message
            });
        } else if (err.name === 'NotBeforeError') {
            return res.status(401).json({ message: 'Token not active yet.' });
        }
        
        res.status(401).json({ message: 'Token is not valid.' });
    }
}; 