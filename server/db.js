const { Pool } = require('pg');
require('dotenv').config(); // Load environment variables from .env file

// Configure connection pool with optimized settings for CockroachDB
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    // Connection pool settings optimized for CockroachDB
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 5000, // Maximum time to wait for connection to be established
    // CockroachDB specific settings for better performance
    statement_timeout: 10000, // Statement timeout in ms (10s)
    query_timeout: 10000 // Query timeout in ms (10s)
});

// Test connection (optional, but good)
pool.connect((err, client, release) => {
    if (err) {
      return console.error('Error acquiring client from pool', err.stack);
    }
    client.query('SELECT NOW()', (err, result) => {
      release();
      if (err) {
        return console.error('Error executing query', err.stack);
      }
      console.log('Successfully connected to CockroachDB. Server time:', result.rows[0].now);
    });
  });
  
  module.exports = {
    query: (text, params) => pool.query(text, params),
    pool: pool // Export pool if you need to end it on shutdown
  };

// Track connection state
let isConnected = false;
let connectionRetries = 0;
const MAX_CONNECTION_RETRIES = 10;

// Reconnection function with exponential backoff
async function reconnect() {
    if (connectionRetries >= MAX_CONNECTION_RETRIES) {
        console.error(`Failed to reconnect to database after ${MAX_CONNECTION_RETRIES} attempts. Giving up.`);
        // Don't exit process, just log the error
        return;
    }
    
    const delay = Math.min(2 ** connectionRetries * 1000, 30000); // Max 30 second delay
    console.log(`Attempting to reconnect to database in ${delay/1000} seconds...`);
    
    setTimeout(async () => {
        connectionRetries++;
        try {
            const client = await pool.connect();
            console.log('Successfully reconnected to database');
            client.release();
            isConnected = true;
            connectionRetries = 0; // Reset retry counter on success
        } catch (err) {
            console.error('Reconnection attempt failed:', err.message);
            reconnect(); // Try again
        }
    }, delay);
}

// Monitor the connection pool
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    isConnected = false;
    
    // Start reconnection process
    reconnect();
});

// Test the connection
async function testConnection() {
    try {
        const res = await pool.query('SELECT version()');
        console.log('Successfully connected to CockroachDB');
        console.log('Database version:', res.rows[0].version);
        isConnected = true;
        return true;
    } catch (err) {
        console.error('Error connecting to CockroachDB:', err.message);
        isConnected = false;
        reconnect();
        return false;
    }
}

// Initialize connection test
testConnection();

// Enhanced query function with automatic retry on connection issues
const query = async (text, params) => {
    // If we know we're not connected, wait a bit before trying
    if (!isConnected) {
        // Wait for a short time to see if connection is restored
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    try {
        return await pool.query(text, params);
    } catch (err) {
        // Check for connection-related errors
        if (err.code === 'ECONNREFUSED' || err.code === '57P01' || err.code === '08006' || err.code === '08001') {
            console.error(`Database connection error: ${err.message}. Initiating reconnection...`);
            isConnected = false;
            reconnect();
            throw new Error(`Database connection failed. Operation could not be completed.`);
        }
        throw err;
    }
};

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

// Check connection status
const isConnectionHealthy = () => isConnected;

// Explicitly request a connection health check
const checkConnection = () => testConnection();

module.exports = {
    query,
    getClient: () => pool.connect(),
    retry,
    pool, // Export the pool itself if needed
    isConnectionHealthy,
    checkConnection
}; 