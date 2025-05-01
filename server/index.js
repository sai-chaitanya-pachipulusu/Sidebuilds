const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Load .env variables

// Import database connection (this will also run the connection test)
const db = require('./db');

// --- Check for JWT_SECRET --- 
if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET environment variable is not set.");
    process.exit(1);
}

// --- Middleware --- 
const app = express();

// Configure CORS based on environment
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.CLIENT_URL // Use the client URL from env in production
        : 'http://localhost:3000', // Default for development
    credentials: true
};
app.use(cors(corsOptions));

// Parse JSON request bodies
app.use(express.json());

// --- Routes --- 
app.get('/', (req, res) => {
    res.send('Side Project Tracker API is running!');
});

// Mount public routes (no auth needed)
app.use('/api/public', require('./routes/public'));

// Mount payment routes (webhook needs specific raw body parser)
app.use('/api/payments', require('./routes/payments'));

// Mount authentication routes
app.use('/api/auth', require('./routes/auth')); 

// Mount project routes (protected by middleware within the file)
app.use('/api/projects', require('./routes/projects')); 


// --- Server Initialization --- 
const PORT = process.env.PORT || 5000; // Use port from .env or default to 5000

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

// Optional: Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nGracefully shutting down from SIGINT (Ctrl+C)');
    try {
        await db.pool.end(); // Close the database connection pool
        console.log('Database pool closed.');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err.stack);
        process.exit(1);
    }
}); 