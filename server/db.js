const { Pool } = require('pg');
require('dotenv').config(); // Load environment variables from .env file

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
    console.error("FATAL ERROR: DATABASE_URL environment variable is missing.");
    process.exit(1);
}

// Configure connection pool with optimized settings for CockroachDB
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false
    },
    // Connection pool settings optimized for CockroachDB
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 5000, // Maximum time to wait for connection to be established
    // CockroachDB specific settings for better performance
    statement_timeout: 10000, // Statement timeout in ms (10s)
    query_timeout: 10000 // Query timeout in ms (10s)
});

// Monitor the connection pool
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    // Do not exit the process here - just log the error
});

// Test the connection
pool.query('SELECT version()', (err, res) => {
    if (err) {
        console.error('Error connecting to CockroachDB:', err.stack);
    } else {
        console.log('Successfully connected to CockroachDB');
        console.log('Database version:', res.rows[0].version);
    }
});

// Helper function to handle retries for CockroachDB transactions
// CockroachDB might return a serialization error that requires retrying the transaction
const retry = async (callback, maxRetries = 5) => {
    let retries = 0;
    while (true) {
        try {
            return await callback();
        } catch (err) {
            // Check if this is a CockroachDB serialization error (40001)
            if (err.code === '40001' && retries < maxRetries) {
                retries++;
                console.log(`Transaction failed with error: ${err.message}. Retrying (${retries}/${maxRetries})...`);
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, 2 ** retries * 100));
                continue;
            }
            throw err;
        }
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    retry,
    pool // Export the pool itself if needed
}; 