// process.exit(0); // Intentionally commented out for now, let it run a bit more

const express = require('express');
const cors = require('cors');
const path = require('path'); // Import path
const http = require('http'); // Import http
const { Server } = require("socket.io"); // Import Server from socket.io
const jwt = require('jsonwebtoken'); // Import jsonwebtoken

// Explicitly load .env file from the server directory
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: true }); 

// --- Server Port --- (Moved to top)
const PORT = process.env.PORT; // Fallback if not in .env

// Import database connection AFTER dotenv has been configured and logged
const db = require('./db');

// --- Middleware --- 
const app = express();
const server = http.createServer(app); // Create HTTP server for Express app

// Configure CORS based on environment
const allowedOrigins = [
    'https://www.sidebuilds.space',
    'http://localhost:3000', // Local client development
    'http://localhost:3001',  // Local client development (alternative port)
    // No need to explicitly list 5001 here if the logic below handles it
];
  
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);

        // Normalize origin and serverHost by removing trailing slashes for robust comparison
        const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
        const serverHost = `http://localhost:${PORT}`;
        // serverHost will not have a trailing slash as constructed

        // Allow if normalized origin is the server itself
        if (normalizedOrigin === serverHost) return callback(null, true);

        // Check against the allowedOrigins array (also normalizing them just in case, though they are usually clean)
        const normalizedAllowedOrigins = allowedOrigins.map(o => o.endsWith('/') ? o.slice(0, -1) : o);
        if (normalizedAllowedOrigins.indexOf(normalizedOrigin) !== -1) {
            callback(null, true);
        } else {
            console.log(
                'CORS blocked origin:', origin, '(Normalized:', normalizedOrigin + ')',
                'Expected one of:', allowedOrigins, '(Normalized:', normalizedAllowedOrigins.join(', ') + ')',
                'or server self-origin:', serverHost
            );
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));

// --- Socket.io Setup ---
const io = new Server(server, { // Attach socket.io to the HTTP server
    cors: {
        origin: allowedOrigins, // Configure CORS for socket.io
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Make io accessible in other modules, e.g., by attaching to app or exporting
// For simplicity here, we can create a small module or attach to response locals if needed later.
// For now, services will need to require this `io` instance or have it passed.
// A better approach would be a dedicated socket manager module.

app.set('io', io); // Make io instance available in request handlers if needed via req.app.get('io')

io.on('connection', (socket) => {
    console.log('[Socket.IO] User connected:', socket.id);

    // Attempt to authenticate and join room on connection if token is present
    const token = socket.handshake.auth.token;
    let userId = null;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.id; // Assuming your JWT payload has an 'id' field for user ID
            socket.user = decoded; // Attach user info to the socket instance
            socket.join(userId);
            console.log(`[Socket.IO] User ${userId} (socket ${socket.id}) authenticated via handshake and joined room ${userId}`);
        } catch (err) {
            console.log(`[Socket.IO] Handshake token verification failed for socket ${socket.id}:`, err.message);
            // Optionally disconnect if auth is strictly required for any connection
            // socket.disconnect(true);
            // return;
        }
    } else {
        console.log(`[Socket.IO] No token in handshake for socket ${socket.id}. Waiting for 'join_user_room' or will remain unauthenticated.`);
    }

    // Handle explicit room joining event, primarily as a fallback or re-join mechanism
    socket.on('join_user_room', (data) => {
        if (data && data.userId) {
            // If already joined via handshake token, this is redundant but harmless
            if (socket.rooms.has(data.userId)) {
                console.log(`[Socket.IO] User ${data.userId} (socket ${socket.id}) already in room ${data.userId}.`);
                return;
            }

            // If not authenticated via handshake, try to use this event's context.
            // BEST PRACTICE: The token from handshake (socket.user) is more secure.
            // This event might be for a scenario where client wants to ensure it's in the room.
            if (socket.user && socket.user.id === data.userId) {
                socket.join(data.userId);
                console.log(`[Socket.IO] User ${data.userId} (socket ${socket.id}) joined room ${data.userId} via 'join_user_room' event (already authenticated).`);
            } else if (!socket.user && token) { // If handshake auth failed but client sent data.userId
                 // This path is less secure if we trust data.userId without re-validating the token for THIS userId.
                 // It's better if 'join_user_room' also requires re-authentication or token presence if not already authed.
                 // For now, we allow joining if a handshake token was present (even if failed) and client provides a userId.
                 // Ideally, re-verify token against this data.userId if they differ or if socket.user is not set.
                console.warn(`[Socket.IO] Socket ${socket.id} trying to join room ${data.userId} via event, but initial auth was for ${socket.user?.id || 'none'}. Use with caution.`);
                socket.join(data.userId); // Join, but log a warning
                // Potentially, we might want to store data.userId on socket for this case: socket.explicitUserId = data.userId;
            } else if (!socket.user && !token){
                 console.log(`[Socket.IO] User (socket ${socket.id}) attempting to join room ${data.userId} via event without prior authentication. This should be secured.`);
                 // Depending on security policy, you might reject this or require a token with the event.
                 // socket.join(data.userId); // Example: Allow for now but needs review for security.
            } else {
                 console.log(`[Socket.IO] User ${data.userId} (socket ${socket.id}) successfully joined room via 'join_user_room'.`);
                 socket.join(data.userId);
            }
        } else {
            console.log(`[Socket.IO] 'join_user_room' event from ${socket.id} missing userId.`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket.IO] User disconnected: ${socket.id}${userId ? ' (User: ' + userId + ')' : ''}`);
        // Socket.IO automatically handles leaving rooms on disconnect.

        // Broadcast that this user stopped typing if they were, to all relevant rooms
        if (socket.typingInRooms) {
            socket.typingInRooms.forEach(roomId => {
                socket.to(roomId).emit('opponent_typing_stopped', { userId: socket.user?.id, username: socket.user?.username });
            });
        }
    });

    // Typing indicators
    socket.on('typing_started', ({ purchase_request_id }) => {
        if (socket.user && purchase_request_id) {
            // The room for a purchase request should be named after the purchase_request_id
            // Ensure the sender isn't notified that they themselves are typing.
            socket.to(purchase_request_id).emit('opponent_typing_started', { userId: socket.user.id, username: socket.user.username, purchase_request_id });
            
            // Keep track of rooms where the user is marked as typing
            if (!socket.typingInRooms) {
                socket.typingInRooms = new Set();
            }
            socket.typingInRooms.add(purchase_request_id);
            console.log(`[Socket.IO] User ${socket.user.username} started typing in room ${purchase_request_id}`);
        }
    });

    socket.on('typing_stopped', ({ purchase_request_id }) => {
        if (socket.user && purchase_request_id) {
            socket.to(purchase_request_id).emit('opponent_typing_stopped', { userId: socket.user.id, username: socket.user.username, purchase_request_id });
            
            if (socket.typingInRooms) {
                socket.typingInRooms.delete(purchase_request_id);
            }
            console.log(`[Socket.IO] User ${socket.user.username} stopped typing in room ${purchase_request_id}`);
        }
    });

    // Handle joining/leaving specific purchase request rooms for targeted messaging (like typing indicators)
    socket.on('join_purchase_request_room', ({ purchase_request_id }) => {
        if (purchase_request_id && socket.user) {
            socket.join(purchase_request_id);
            console.log(`[Socket.IO] User ${socket.user.username} (socket ${socket.id}) joined room for purchase request: ${purchase_request_id}`);
        } else {
            console.log(`[Socket.IO] Failed to join purchase request room: missing purchase_request_id or user not authenticated. Socket ID: ${socket.id}`);
        }
    });

    socket.on('leave_purchase_request_room', ({ purchase_request_id }) => {
        if (purchase_request_id && socket.user) {
            socket.leave(purchase_request_id);
            console.log(`[Socket.IO] User ${socket.user.username} (socket ${socket.id}) left room for purchase request: ${purchase_request_id}`);
            // If the user was typing in this room, also emit a stopped typing event as they are leaving
            if (socket.typingInRooms && socket.typingInRooms.has(purchase_request_id)) {
                socket.to(purchase_request_id).emit('opponent_typing_stopped', { userId: socket.user.id, username: socket.user.username, purchase_request_id });
                socket.typingInRooms.delete(purchase_request_id);
                console.log(`[Socket.IO] User ${socket.user.username} auto-stopped typing in room ${purchase_request_id} due to leaving.`);
            }
        } else {
            console.log(`[Socket.IO] Failed to leave purchase request room: missing purchase_request_id or user not authenticated. Socket ID: ${socket.id}`);
        }
    });
});


// --- Content Security Policy for Stripe --- 
// Temporarily commented out to test Stripe onboarding in Firefox
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' https://js.stripe.com https://m.stripe.network 'unsafe-inline' https://*.stripe.com; " + // Allow unsafe-inline for scripts if necessary, but be cautious
    "style-src 'self' https://js.stripe.com 'unsafe-inline' https://*.stripe.com; " +      // Allow unsafe-inline for styles
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://m.stripe.network https://*.stripe.com; " +
    "connect-src 'self' https://api.stripe.com https://m.stripe.network https://*.stripe.com http://localhost:5001 ws://localhost:5001; " + // Added localhost:5001 and ws://localhost:5001 for Socket.IO
    "img-src 'self' data: https://*.stripe.com; " + // Allow images from Stripe and data URIs
    "font-src 'self' https://js.stripe.com https://*.stripe.com;" // Allow fonts from Stripe
  );
  next();
});


// --- Check for JWT_SECRET --- 
if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET environment variable is not set.");
    process.exit(1);
}


// For Stripe webhook only - Express raw body parser
// This must be defined BEFORE the express.json() middleware
app.post('/api/payments/webhook', 
    express.raw({type: 'application/json'}), 
    (req, res) => {
        // Directly call the webhookHandler with the raw body
        const { webhookHandler } = require('./routes/payments');
        return webhookHandler(req, res);
    }
);

// For all other routes - Parse JSON body
app.use(express.json());

// --- Routes --- 
app.get('/', (req, res) => {
    res.send('Side Project Tracker API is running!');
});

// Mount public routes (no auth needed)
app.use('/api/public', require('./routes/public'));

// Mount payment routes (excluding webhook which is handled above)
const payments = require('./routes/payments');
app.use('/api/payments', payments.router);

// Add payment extension routes
app.use('/api/payments', require('./routes/payments-extensions'));

console.log('SERVER_INDEX: About to mount /api/auth routes...');
// Mount authentication routes
app.use('/api/auth', require('./routes/auth')); 
console.log('SERVER_INDEX: Successfully mounted /api/auth routes.');

// Mount user profile routes
app.use('/api/users', require('./routes/users'));

// Mount project routes (protected by middleware within the file)
app.use('/api/projects', require('./routes/projects')); 

// Import the certificates routes
const certificatesRoutes = require('./routes/certificates');
const stripeRoutes = require('./routes/stripe'); // Import Stripe routes

// Mount certificates routes
app.use('/api/certificates', certificatesRoutes);

// Mount Stripe Connect routes
app.use('/api/stripe', stripeRoutes);

// Mount Purchase Request routes
const purchaseRequestRoutes = require('./routes/purchaseRequests');
app.use('/api/purchase-requests', purchaseRequestRoutes);

// Mount Messages routes for Purchase Requests (nested under purchase requests)
// This requires purchaseRequestRoutes to make way or for this to be structured carefully.
// A common way is to have the specific :requestId part in the messages router itself.
// Let's assume purchaseRequestRoutes handles /api/purchase-requests and specific /:requestId routes,
// and we want to add /:requestId/messages.

// Option 1: Simple Mounting (if messages router handles full path with :requestId)
// const purchaseRequestMessageRoutes = require('./routes/purchaseRequestMessages');
// app.use('/api/purchase-requests/:requestId/messages', purchaseRequestMessageRoutes); 
// This won't work directly if purchaseRequestMessageRoutes expects :requestId from a parent router.

// Option 2: More explicit or by attaching to the purchaseRequestRoutes if it's designed for it.
// Given purchaseRequestMessages.js is using router({ mergeParams: true }), 
// it should be mounted on a path that already includes :requestId.

// The most straightforward way if purchaseRequestRoutes does not have a way to nest routers:
const purchaseRequestMessageRoutes = require('./routes/purchaseRequestMessages');
// We mount this router specifically for paths that include a purchase request ID.
// The :requestId will be available in purchaseRequestMessageRoutes due to mergeParams.
purchaseRequestRoutes.use('/:requestId/messages', purchaseRequestMessageRoutes);

// Mount Notification routes
const notificationRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationRoutes);

// --- Server Initialization ---

// Uncaught exception handling
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION!');
    console.error(err.name, err.message);
    console.error(err.stack);
    console.error('Server will continue running...');
    // In production, you might want to restart the process with a process manager like PM2
});

// Unhandled promise rejection handling
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION!');
    console.error(err.name, err.message);
    console.error(err.stack);
    console.error('Server will continue running...');
    // In production, you might want to restart the process with a process manager like PM2
});

// Keep the server alive with a heartbeat
const heartbeatInterval = setInterval(() => {
    console.log(`Server heartbeat - ${new Date().toISOString()}`);
    // Optionally, check database connection health
    db.query('SELECT 1').catch(err => {
        console.error('Database connection check failed:', err);
        // Attempt to reconnect if necessary
    });
}, 60000); // Check every minute

// Clean up resources if the process is killed
process.on('exit', (code) => {
    console.log(`Server is shutting down with code: ${code}`);
    clearInterval(heartbeatInterval);
});

// Start the server (using the http.Server instance)
server.listen(PORT, () => { // Changed app.listen to server.listen
    console.log(`Server listening on port ${PORT}`);
    console.log(`Socket.IO server initialized and listening.`);
    console.log(`CORS enabled. Allowed origins include: ${allowedOrigins.join(', ')} and server self-origin (http://localhost:${PORT})`); 
    if (process.env.STRIPE_WEBHOOK_SECRET) {
        console.log('Stripe webhook secret is configured');
    } else {
        console.warn('WARNING: Stripe webhook secret is missing. Webhooks will not work properly.');
    }
});

// Handle server errors separately (attaching to the http.Server instance)
server.on('error', (error) => { // Changed from app.on to server.on for listen errors
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please use a different port.`);
    }
});

// Optional: Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nGracefully shutting down from SIGINT (Ctrl+C)');
    clearInterval(heartbeatInterval); // Assuming heartbeatInterval is defined globally or accessible
    
    io.close(() => { // Close socket.io server
        console.log('Socket.IO server closed.');
    });

    server.close(() => {
        console.log('HTTP server closed.');
    });
    
    try {
        // Assuming db.pool is the correct way to access your PostgreSQL pool
        if (db && db.pool && typeof db.pool.end === 'function') {
            await db.pool.end(); 
            console.log('Database pool closed.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err.stack);
        process.exit(1);
    }
}); 

// Export io for use in other modules (e.g., services)
module.exports = { app, io }; // Exporting io along with app 