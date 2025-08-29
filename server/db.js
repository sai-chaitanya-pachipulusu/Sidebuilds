const { Pool } = require('pg');
const path = require('path'); // Import the path module

require('dotenv').config({ path: path.resolve(__dirname, '.env') });
console.log("DATABASE_URL from env:", process.env.DATABASE_URL);
// Explicitly load .env file from the server directory
// REMOVED: require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// REMOVED: console.log("DATABASE_URL from env:", process.env.DATABASE_URL);

console.log("[SERVER/DB.JS] Initializing Pool. DATABASE_URL=", process.env.DATABASE_URL);

// Environment-based database selection
const useSQLite = process.env.NODE_ENV === 'development' && process.env.USE_SQLITE === 'true';
console.log(`[SERVER/DB.JS] NODE_ENV: ${process.env.NODE_ENV}, Using SQLite: ${useSQLite}`);

if (useSQLite) {
  // Use SQLite for development with unified schema
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  
  const dbPath = path.join(__dirname, 'sidebuilds-complete.db');
  const db = new sqlite3.Database(dbPath);
  
  console.log(`[SERVER/DB.JS] Using SQLite database at: ${dbPath}`);
  
  // Query wrapper to match PostgreSQL interface
  const query = (text, params = []) => {
    return new Promise((resolve, reject) => {
      console.log('[DB-SQLITE] Query:', text, 'Params:', params);
      
      // Handle transaction commands
      if (text.toLowerCase().trim() === 'begin transaction' || text.toLowerCase().trim() === 'begin') {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            console.error('[DB-SQLITE] BEGIN Error:', err);
            reject(err);
          } else {
            console.log('[DB-SQLITE] BEGIN Result: transaction started');
            resolve({ rows: [], changes: 0 });
          }
        });
        return;
      }
      
      if (text.toLowerCase().trim() === 'commit') {
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('[DB-SQLITE] COMMIT Error:', err);
            reject(err);
          } else {
            console.log('[DB-SQLITE] COMMIT Result: transaction committed');
            resolve({ rows: [], changes: 0 });
          }
        });
        return;
      }
      
      if (text.toLowerCase().trim() === 'rollback') {
        db.run('ROLLBACK', (err) => {
          if (err) {
            console.error('[DB-SQLITE] ROLLBACK Error:', err);
            reject(err);
          } else {
            console.log('[DB-SQLITE] ROLLBACK Result: transaction rolled back');
            resolve({ rows: [], changes: 0 });
          }
        });
        return;
      }
      
      if (text.toLowerCase().includes('select')) {
        db.all(text, params, (err, rows) => {
          if (err) {
            console.error('[DB-SQLITE] SELECT Error:', err);
            reject(err);
          } else {
            console.log(`[DB-SQLITE] SELECT Result: ${rows.length} rows`);
            resolve({ rows });
          }
        });
      } else if (text.toLowerCase().includes('insert')) {
        db.run(text, params, function(err) {
          if (err) {
            console.error('[DB-SQLITE] INSERT Error:', err);
            reject(err);
          } else {
            console.log('[DB-SQLITE] INSERT Result: lastID=', this.lastID);
            resolve({ 
              rows: [], 
              insertId: this.lastID,
              changes: this.changes
            });
          }
        });
      } else {
        db.run(text, params, function(err) {
          if (err) {
            console.error('[DB-SQLITE] RUN Error:', err);
            reject(err);
          } else {
            console.log('[DB-SQLITE] RUN Result: changes=', this.changes);
            resolve({ 
              rows: [], 
              changes: this.changes
            });
          }
        });
      }
    });
  };
  
  // Add transaction support for SQLite
  const withTransaction = async (callback) => {
    await query('BEGIN TRANSACTION');
    try {
      const result = await callback({ query });
      await query('COMMIT');
      return result;
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  };

  module.exports = {
    query,
    db,
    withTransaction,
    checkConnection: async () => ({
      ok: true,
      message: 'SQLite database is healthy'
    }),
    isConnectionHealthy: async () => true
  };
  return;
}
// Configure connection pool with standard PostgreSQL settings
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 5000, // Maximum time to wait for connection to be established
    // Standard PostgreSQL settings
    statement_timeout: 10000, // Statement timeout in ms (10s)
    query_timeout: 10000 // Query timeout in ms (10s)
});

// Test connection
pool.connect((err, client, release) => {
    if (err) {
      return console.error('Error acquiring client from pool', err.stack);
    }
    client.query('SELECT NOW()', (err, result) => {
      release();
      if (err) {
        return console.error('Error executing query', err.stack);
      }
      console.log('Successfully connected to PostgreSQL database. Server time:', result.rows[0].now);
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
        console.log('Successfully connected to PostgreSQL database');
        console.log('Database version:', res.rows[0].version);
        isConnected = true;
        return true;
    } catch (err) {
        console.error('Error connecting to database:', err.message);
        isConnected = false;
        reconnect();
        return false;
    }
}

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

// Helper function to retry queries
const retry = async (fn, retries = 3, delay = 1000, backoff = 2) => {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return retry(fn, retries - 1, delay * backoff, backoff);
    }
};

// Health check function
const isConnectionHealthy = async () => {
    try {
        await pool.query('SELECT 1');
        return true;
    } catch (err) {
        return false;
    }
};

// Comprehensive connection check 
const checkConnection = async () => {
    try {
        const client = await pool.connect();
        try {
            await client.query('SELECT 1');
            return { ok: true, message: 'Database connection is healthy' };
        } finally {
            client.release();
        }
    } catch (err) {
        return { 
            ok: false, 
            message: `Database connection failed: ${err.message}`,
            error: err 
        };
    }
};

// Transaction wrapper for PostgreSQL
const withTransaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    query,
    getClient: () => pool.connect(),
    retry,
    withTransaction,
    pool, // Export the pool itself if needed
    isConnectionHealthy,
    checkConnection
};