const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function(req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token'); // Or potentially 'Authorization': 'Bearer TOKEN'

    // Check if no token
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied.' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add user from payload to the request object
        req.user = decoded.user; // The payload we set during login/register { user: { id: ..., username: ..., email: ... } }
        next(); // Call the next middleware or route handler
    } catch (err) {
        console.error('Token verification failed:', err.message);
        res.status(401).json({ message: 'Token is not valid.' });
    }
}; 