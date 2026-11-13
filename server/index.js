// process.exit(0); // Intentionally commented out for now, let it run a bit more

const express = require('express');
const cors = require('cors');
const path = require('path'); // Import path
const http = require('http'); // Import http
const { Server } = require("socket.io"); // Import Server from socket.io
const { verifyToken: verifyJwtToken } = require('./utils/jwt');

// Explicitly load .env file from the server directory
// Keep values explicitly supplied by the host (Render, CI, or a local shell).
// The previous `override: true` made it impossible to select the documented
// SQLite development fallback without editing the checked-out .env file.
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: false });

// --- Server Port --- (Moved to top)
let PORT = parseInt(process.env.PORT || '5002', 10);

// Import database connection AFTER dotenv has been configured and logged
const db = require('./db');
const emailService = require('./services/emailService');
const serverConfig = require('./config/environment');
const authMiddleware = require('./middleware/authMiddleware');
const requireAdmin = require('./middleware/requireAdmin');
const { apiLimiter, searchLimiter, uploadLimiter, webhookLimiter } = require('./middleware/rateLimiter');

// --- Middleware ---
const app = express();
const server = http.createServer(app); // Create HTTP server for Express app

// Behind Render/Vercel proxies: required so req.ip reflects the real client
// for rate limiting and security logging
app.set('trust proxy', 1);

// This process serves an API, not the Stripe-enabled browser application. A
// restrictive API CSP prevents an accidentally returned HTML/upload response
// from executing scripts under the API origin.
const helmet = require('helmet');
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false, // Stripe.js compatibility
    crossOriginResourcePolicy: { policy: 'cross-origin' } // allow serving uploads to the client origin
}));

// Configure CORS based on environment
const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [
        'https://www.sidebuilds.online',
        'https://sidebuilds.online'
      ]
    : [
        'https://www.sidebuilds.online',
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Idempotency-Key'],
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
        const decoded = verifyJwtToken(token);
        if (!decoded.user || (!decoded.user.id && !decoded.user.user_id)) {
            throw new Error('Invalid token payload');
        }
        
        socket.userId = decoded.user.user_id || decoded.user.id;
        socket.user = { ...decoded.user, id: socket.userId };
        socket.tokenInfo = { issuedAt: decoded.iat, expiresAt: decoded.exp, userId: socket.userId };
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

// Wire notification service to socket.io (avoids circular dependency)
const notificationService = require('./services/notificationService');
notificationService.setIO(io);

// Periodic marketplace hygiene (stale request expiry, etc.)
require('./services/maintenanceService').start();

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

    // Register with WebSocketEvents for extended functionality
    if (wsEvents && wsEvents.registerAuthenticatedSocket) {
        wsEvents.registerAuthenticatedSocket(socket);
    }

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

    // Enhanced message handling: verify participant, persist, then broadcast
    socket.on('send_message', async ({ purchase_request_id, message, message_type = 'text' }) => {
        if (!socket.isAuthenticated || !purchase_request_id || !message || !message.trim()) {
            socket.emit('error', { message: 'Invalid message data' });
            return;
        }

        try {
            const requestCheck = await db.query(
                'SELECT buyer_id, seller_id FROM purchase_requests WHERE id = $1',
                [purchase_request_id]
            );
            const request = requestCheck.rows[0];
            if (!request || (request.buyer_id !== socket.userId && request.seller_id !== socket.userId)) {
                socket.emit('error', { message: 'Not authorized for this conversation' });
                return;
            }

            const recipientId = request.buyer_id === socket.userId ? request.seller_id : request.buyer_id;
            const trimmed = message.trim();

            const inserted = await db.query(
                `INSERT INTO purchase_request_messages
                    (purchase_request_id, sender_id, recipient_id, content, message, message_type)
                 VALUES ($1, $2, $3, $4, $4, $5)
                 RETURNING message_id, created_at`,
                [purchase_request_id, socket.userId, recipientId, trimmed, message_type]
            );

            const roomName = `purchase_${purchase_request_id}`;
            io.to(roomName).emit('message_received', {
                id: inserted.rows[0]?.message_id,
                purchase_request_id,
                sender_id: socket.userId,
                recipient_id: recipientId,
                content: trimmed,
                message: trimmed,
                message_type,
                created_at: inserted.rows[0]?.created_at || new Date().toISOString(),
                sender_name: socket.user.username,
                sender_username: socket.user.username,
                sender_role: socket.user.role || 'user'
            });
        } catch (error) {
            console.error('[Socket.IO] Message send error:', error.message);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });
});


// --- Check for JWT_SECRET --- 
if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET environment variable is not set.");
    process.exit(1);
}
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
    console.error('FATAL ERROR: JWT_SECRET must be at least 32 characters in production.');
    process.exit(1);
}


// For Stripe webhook only - Express raw body parser
// This must be defined BEFORE the express.json() middleware
app.post('/api/payments/webhook', 
    webhookLimiter,
    express.raw({ type: 'application/json', limit: '1mb' }),
    (req, res) => {
        // Directly call the webhookHandler with the raw body
        const { webhookHandler } = require('./routes/payments');
        return webhookHandler(req, res);
    }
);

// For all other routes - Parse JSON body
app.use(express.json({ limit: '100kb', strict: true }));

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
// Apply API rate limiting to all API routes
app.use('/api/', (req, res, next) => {
    if (['/health', '/ready', '/ping'].includes(req.path)) {
        return next();
    }
    return apiLimiter(req, res, next);
});

// Apply stricter rate limiting to search endpoints
app.use('/api/projects/search', searchLimiter);
app.use('/api/public/marketplace', searchLimiter);

// Apply upload rate limiting to both upload route families. `use` deliberately
// covers /upload/:projectId; an exact POST path did not match that route.
app.use('/api/files/upload', uploadLimiter);
app.post('/api/projects/:id/files', uploadLimiter);

// --- Routes ---
app.get('/', (req, res) => {
    res.send('Side Project Tracker API is running!');
});

// ─── Keep-alive / health check endpoints ───────────────────────────────────
// These are intentionally fast (no DB) so Render doesn't spin down
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: Date.now(),
        uptime: Math.floor(process.uptime())
    });
});

app.get('/api/ping', (req, res) => {
    res.status(200).json({ pong: true, ts: Date.now() });
});

app.get('/api/ready', require('./utils/readiness').createReadinessHandler(() => db.checkConnection()));

app.get('/api/status', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const database = await db.getDatabaseInfo();
        res.status(database.healthy ? 200 : 503).json({
            status: database.healthy ? 'ok' : 'degraded',
            uptime: Math.floor(process.uptime()),
            environment: process.env.NODE_ENV || 'development',
            database,
            email: emailService.getEmailStatus(),
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(503).json({
            status: 'degraded',
            uptime: Math.floor(process.uptime()),
            environment: process.env.NODE_ENV || 'development',
            database: {
                type: 'unknown',
                healthy: false,
                message: error.message
            },
            timestamp: Date.now()
        });
    }
});
// ───────────────────────────────────────────────────────────────────────────



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

// Mount admin routes
app.use('/api/admin', require('./routes/admin'));

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

// Marketplace engagement features
app.use('/api/saves', require('./routes/saves'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/follows', require('./routes/follows'));

// Mount Dashboard routes
const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

// Mount File routes
const fileRoutes = require('./routes/files');
app.use('/api/files', fileRoutes);

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
