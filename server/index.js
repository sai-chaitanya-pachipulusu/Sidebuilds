const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Load .env variables

// Import database connection (this will also run the connection test)
 const db = require('./db');

// --- Middleware --- 
const app = express();

// Configure CORS based on environment
const allowedOrigins = [
    'https://sidebuilds.space',
    'https://sidebuilds-nc8w31avl-sai-chaitanyas-projects-f9e3324e.vercel.app', 
    'https://sidebuilds-sai-chaitanyas-projects-f9e3324e.vercel.app/',
    'https://sidebuilds.vercel.app',
    'https://www.sidebuilds.space'
];
  
const corsOptions = {
origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
    callback(null, true);
    } else {
    callback(new Error('Not allowed by CORS'));
    }
},
credentials: true
};

app.use(cors(corsOptions));

// --- Content Security Policy for Stripe --- 
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' https://js.stripe.com https://m.stripe.network 'unsafe-inline' https://*.stripe.com; " + // Allow unsafe-inline for scripts if necessary, but be cautious
    "style-src 'self' https://js.stripe.com 'unsafe-inline' https://*.stripe.com; " +      // Allow unsafe-inline for styles
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://m.stripe.network https://*.stripe.com; " +
    "connect-src 'self' https://api.stripe.com https://m.stripe.network https://*.stripe.com; " +
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

// Mount authentication routes
app.use('/api/auth', require('./routes/auth')); 

// Mount project routes (protected by middleware within the file)
app.use('/api/projects', require('./routes/projects')); 


// --- Server Initialization --- 
const PORT = process.env.PORT || 5001; // Use port from .env or default to 5001

// Uncaught exception handling
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥');
    console.error(err.name, err.message);
    console.error(err.stack);
    console.error('Server will continue running...');
    // In production, you might want to restart the process with a process manager like PM2
});

// Unhandled promise rejection handling
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥');
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

// Start the server
const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`CORS enabled for: ${corsOptions.origin}`);
    if (process.env.STRIPE_WEBHOOK_SECRET) {
        console.log('Stripe webhook secret is configured');
    } else {
        console.warn('WARNING: Stripe webhook secret is missing. Webhooks will not work properly.');
    }
});

// Handle server errors separately
server.on('error', (error) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please use a different port.`);
    }
});

// Optional: Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nGracefully shutting down from SIGINT (Ctrl+C)');
    // Clear the heartbeat interval
    clearInterval(heartbeatInterval);
    
    // Close the HTTP server
    server.close(() => {
        console.log('HTTP server closed.');
    });
    
    try {
        await db.pool.end(); // Close the database connection pool
        console.log('Database pool closed.');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err.stack);
        process.exit(1);
    }
}); 