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
let PORT = parseInt(process.env.PORT || '5002', 10);

// Import database connection AFTER dotenv has been configured and logged
const db = require('./db');

// --- Middleware --- 
const app = express();
const server = http.createServer(app); // Create HTTP server for Express app

// Configure CORS based on environment
const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [
        'https://www.sidebuilds.space',
        'https://sidebuilds.space'
      ]
    : [
        'https://www.sidebuilds.space',
        'http://localhost:3000', // Local client development
        'http://localhost:3001',  // Local client development (alternative port)
        'http://localhost:3002',  // Local client development (current port)
        'http://localhost:3009',
        'http://localhost:5002'
        // Removed wildcard '*' for security
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
            console.warn('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200
};

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));
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

// Enhanced Socket.IO Authentication Middleware
const authenticateSocket = (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return next(new Error('Authentication required'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.user || !decoded.user.id) {
            throw new Error('Invalid token payload');
        }
        
        socket.userId = decoded.user.id;
        socket.user = decoded.user;
        socket.isAuthenticated = true;
        
        next();
    } catch (err) {
        next(new Error('Invalid token'));
    }
};

// Apply authentication middleware
io.use(authenticateSocket);

// Initialize WebSocket event handling
const WebSocketEvents = require('./websocket/events');
const wsEvents = new WebSocketEvents(io);

// Set up periodic token expiry monitoring
setInterval(() => {
  if (wsEvents && wsEvents.checkForExpiringTokens) {
    wsEvents.checkForExpiringTokens();
  }
}, 60000); // Check every minute

// Make WebSocket events available to routes
app.set('wsEvents', wsEvents);

io.on('connection', (socket) => {
    // Auto-join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Broadcast online status
    socket.broadcast.emit('user_online', {
        userId: socket.userId,
        username: socket.user.username
    });

    // Enhanced room management with validation
    socket.on('join_user_room', (data) => {
        if (!socket.isAuthenticated) {
            socket.emit('error', { message: 'Authentication required' });
            return;
        }

        if (data && data.userId && data.userId === socket.userId) {
            const roomName = `user_${data.userId}`;
            if (!socket.rooms.has(roomName)) {
                socket.join(roomName);
            }
            socket.emit('room_joined', { room: roomName });
        } else {
            socket.emit('error', { message: 'Invalid room join request' });
        }
    });

    socket.on('disconnect', (reason) => {
        // Broadcast offline status
        socket.broadcast.emit('user_offline', {
            userId: socket.userId,
            username: socket.user?.username
        });

        // Clean up typing indicators
        if (socket.typingInRooms) {
            socket.typingInRooms.forEach(roomId => {
                socket.to(roomId).emit('opponent_typing_stopped', { 
                    userId: socket.userId, 
                    username: socket.user?.username 
                });
            });
            socket.typingInRooms.clear();
        }
    });

    // Enhanced typing indicators with validation
    socket.on('typing_started', ({ purchase_request_id }) => {
        if (!socket.isAuthenticated || !purchase_request_id) {
            return;
        }

        const roomName = `purchase_${purchase_request_id}`;
        socket.to(roomName).emit('opponent_typing_started', { 
            userId: socket.userId, 
            username: socket.user.username, 
            purchase_request_id 
        });
        
        if (!socket.typingInRooms) {
            socket.typingInRooms = new Set();
        }
        socket.typingInRooms.add(roomName);
        
        // Auto-stop typing after 10 seconds
        setTimeout(() => {
            if (socket.typingInRooms?.has(roomName)) {
                socket.to(roomName).emit('opponent_typing_stopped', { 
                    userId: socket.userId, 
                    username: socket.user.username, 
                    purchase_request_id 
                });
                socket.typingInRooms.delete(roomName);
            }
        }, 10000);
    });

    socket.on('typing_stopped', ({ purchase_request_id }) => {
        if (!socket.isAuthenticated || !purchase_request_id) {
            return;
        }

        const roomName = `purchase_${purchase_request_id}`;
        socket.to(roomName).emit('opponent_typing_stopped', { 
            userId: socket.userId, 
            username: socket.user.username, 
            purchase_request_id 
        });
        
        if (socket.typingInRooms) {
            socket.typingInRooms.delete(roomName);
        }
    });

    // Enhanced purchase request room management
    socket.on('join_purchase_request_room', ({ purchase_request_id }) => {
        if (!socket.isAuthenticated || !purchase_request_id) {
            socket.emit('error', { message: 'Authentication required or invalid request' });
            return;
        }

        const roomName = `purchase_${purchase_request_id}`;
        socket.join(roomName);
        socket.emit('room_joined', { room: roomName, purchase_request_id });
        
        // Notify others in the room
        socket.to(roomName).emit('user_joined_room', {
            userId: socket.userId,
            username: socket.user.username,
            purchase_request_id
        });
    });

    socket.on('leave_purchase_request_room', ({ purchase_request_id }) => {
        if (!socket.isAuthenticated || !purchase_request_id) {
            return;
        }

        const roomName = `purchase_${purchase_request_id}`;
        
        // Clean up typing if user was typing
        if (socket.typingInRooms?.has(roomName)) {
            socket.to(roomName).emit('opponent_typing_stopped', { 
                userId: socket.userId, 
                username: socket.user.username, 
                purchase_request_id 
            });
            socket.typingInRooms.delete(roomName);
        }
        
        socket.leave(roomName);
        socket.to(roomName).emit('user_left_room', {
            userId: socket.userId,
            username: socket.user.username,
            purchase_request_id
        });
    });

    // Enhanced message handling
    socket.on('send_message', async ({ purchase_request_id, message, message_type = 'text' }) => {
        if (!socket.isAuthenticated || !purchase_request_id || !message) {
            socket.emit('error', { message: 'Invalid message data' });
            return;
        }

        try {
            // Store message in database
            const messageData = {
                purchase_request_id,
                sender_id: socket.userId,
                message: message.trim(),
                message_type,
                created_at: new Date().toISOString()
            };

            const roomName = `purchase_${purchase_request_id}`;
            
            // Broadcast to room participants
            io.to(roomName).emit('message_received', {
                ...messageData,
                sender_name: socket.user.username,
                sender_role: socket.user.role || 'user'
            });
        } catch (error) {
            console.error('[Socket.IO] Message send error:', error.message);
            socket.emit('error', { message: 'Failed to send message' });
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
    "connect-src 'self' https://api.stripe.com https://m.stripe.network https://*.stripe.com http://localhost:5002 ws://localhost:5002; " + // Added localhost:5002 and ws://localhost:5002 for Socket.IO
    "img-src 'self' data: blob: https://*.stripe.com; " + // Allow images from Stripe, data URIs, and blob URLs
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

// --- Compression Middleware ---
const compression = require('compression');
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            // Don't compress responses with this request header
            return false;
        }
        // Compress all HTTP responses
        return compression.filter(req, res);
    },
    level: 6 // Balanced compression level
}));

// --- Rate Limiting Middleware ---
const { apiLimiter, searchLimiter, uploadLimiter } = require('./middleware/rateLimiter');

// Apply API rate limiting to all API routes
app.use('/api/', apiLimiter);

// Apply stricter rate limiting to search endpoints
app.use('/api/projects/search', searchLimiter);
app.use('/api/public/marketplace', searchLimiter);

// Apply upload rate limiting to file upload endpoints
app.use('/api/files/upload', uploadLimiter);
app.use('/api/projects/:id/files', uploadLimiter);

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

// Mount authentication routes
app.use('/api/auth', require('./routes/auth'));

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

// Mount Dashboard routes
const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

// Mount File routes
const fileRoutes = require('./routes/files');
app.use('/api/files', fileRoutes);

// Serve uploaded files statically (for development)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// AI and Analytics routes
const aiRoutes = require('./routes/ai');
const analyticsRoutes = require('./routes/analytics');
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);

// Webhook monitoring routes
const webhookRoutes = require('./routes/webhooks');
app.use('/api/webhooks', webhookRoutes);

// Performance monitoring routes
const performanceRoutes = require('./routes/performance');
app.use('/api/performance', performanceRoutes);

// --- Server Initialization ---

// Uncaught exception handling
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err.name, err.message);
    // In production, you might want to restart the process with a process manager like PM2
});

// Unhandled promise rejection handling
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION:', err.name, err.message);
    // In production, you might want to restart the process with a process manager like PM2
});

// Keep the server alive with a heartbeat
const heartbeatInterval = setInterval(() => {
    // Optionally, check database connection health
    db.query('SELECT 1').catch(err => {
        console.error('Database connection check failed:', err.message);
    });
}, 60000); // Check every minute

// Clean up resources if the process is killed
process.on('exit', (code) => {
    clearInterval(heartbeatInterval);
});

function startServer(onPort) {
  return new Promise((resolve, reject) => {
    server.listen(onPort, () => {
      console.log(`Server listening on port ${onPort}`);
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.warn('WARNING: Stripe webhook secret is missing. Webhooks will not work properly.');
      }
      resolve(onPort);
    }).on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${onPort} is already in use.`);
        reject(error);
      } else {
        console.error('Server error:', error.message);
        reject(error);
      }
    });
  });
}

(async () => {
  try {
    await startServer(PORT);
  } catch (e) {
    if (e.code === 'EADDRINUSE') {
      // Try fallback ports 5002 -> 5003 -> 5004
      const candidates = [5002, 5003, 5004].filter(p => p !== PORT);
      for (const candidate of candidates) {
        try {
          await startServer(candidate);
          PORT = candidate;
          break;
        } catch (err) {
          if (candidate === candidates[candidates.length - 1]) {
            console.error('Failed to bind to fallback ports');
          }
        }
      }
    }
  }
})();

// Optional: Graceful shutdown
process.on('SIGINT', async () => {
    clearInterval(heartbeatInterval);
    
    io.close(() => {});
    server.close(() => {});
    
    try {
        if (db && db.pool && typeof db.pool.end === 'function') {
            await db.pool.end();
        }
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err.message);
        process.exit(1);
    }
}); 

// Export io for use in other modules (e.g., services)
module.exports = { app, io }; // Exporting io along with app 