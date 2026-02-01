const { Pool } = require('pg');
const path = require('path'); // Import the path module

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Environment-based database selection
const useSQLite = process.env.NODE_ENV === 'development' && process.env.USE_SQLITE === 'true';
console.log(`[SERVER/DB.JS] NODE_ENV: ${process.env.NODE_ENV}, Using SQLite: ${useSQLite}`);

if (useSQLite) {
  // Use SQLite for development with unified schema
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  
  const dbPath = path.join(__dirname, 'sidebuilds-complete.db');
  const db = new sqlite3.Database(dbPath);

  // SQLite database initialized

  // Initialize basic tables asynchronously (don't block server startup)
  process.nextTick(() => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        first_name TEXT,
        last_name TEXT,
        bio TEXT,
        location TEXT,
        website_url TEXT,
        linkedin_url TEXT,
        github_username TEXT,
        twitter_handle TEXT,
        avatar_url TEXT,
        is_admin INTEGER DEFAULT 0,
        is_verified INTEGER DEFAULT 0,
        verification_level INTEGER DEFAULT 0,
        total_projects_sold INTEGER DEFAULT 0,
        total_projects_bought INTEGER DEFAULT 0,
        total_revenue REAL DEFAULT 0,
        reputation_score REAL DEFAULT 0,
        stripe_account_id TEXT,
        stripe_onboarding_complete INTEGER DEFAULT 0
      )`);

    db.run(`CREATE TABLE IF NOT EXISTS projects (
      project_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      detailed_description TEXT,
      stage TEXT DEFAULT 'idea',
      category TEXT,
      subcategory TEXT,
      domain TEXT,
      demo_url TEXT,
      github_url TEXT,
      tech_stack TEXT,
      tags TEXT,
      monthly_revenue REAL DEFAULT 0,
      monthly_users INTEGER DEFAULT 0,
      growth_rate REAL DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      sale_price REAL,
      price_negotiable INTEGER DEFAULT 1,
      contact_email TEXT,
      contact_phone TEXT,
      payment_method TEXT,
      thumbnail_url TEXT,
      launch_date TEXT,
      is_public INTEGER DEFAULT 1,
      is_for_sale INTEGER DEFAULT 0,
      featured INTEGER DEFAULT 0,
      verified INTEGER DEFAULT 0,
      code_transferred INTEGER DEFAULT 0,
      domain_transferred INTEGER DEFAULT 0,
      assets_transferred INTEGER DEFAULT 0,
      is_on_hold INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS purchase_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT,
      buyer_id TEXT,
      seller_id TEXT,
      status TEXT DEFAULT 'interest_expressed',
      message TEXT,
      price REAL,
      stripe_session_id TEXT,
      stripe_payment_intent_id TEXT,
      stripe_payout_id TEXT,
      code_transferred INTEGER DEFAULT 0,
      domain_transferred INTEGER DEFAULT 0,
      assets_transferred INTEGER DEFAULT 0,
      transfer_notes TEXT,
      terms_agreed_version TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(project_id),
      FOREIGN KEY (buyer_id) REFERENCES users(user_id),
      FOREIGN KEY (seller_id) REFERENCES users(user_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      read INTEGER DEFAULT 0,
      link TEXT,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ai_project_analysis (
      project_id TEXT PRIMARY KEY,
      overall_score REAL,
      estimated_value REAL,
      confidence_score REAL,
      confidence_level TEXT,
      factor_scores TEXT,
      recommendations TEXT,
      insights TEXT,
      risks TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(project_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS project_ai_analyses (
      project_id TEXT PRIMARY KEY,
      overall_score REAL,
      confidence_level REAL,
      estimated_value REAL,
      factor_scores TEXT,
      insights TEXT,
      recommendations TEXT,
      risks TEXT,
      analysis_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(project_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS project_transactions (
      transaction_id TEXT PRIMARY KEY,
      project_id TEXT,
      buyer_id TEXT,
      seller_id TEXT,
      amount REAL,
      commission_amount REAL,
      seller_amount REAL,
      status TEXT,
      escrow_status TEXT, 
      payment_method TEXT,
      payment_id TEXT,
      stripe_payment_intent_id TEXT,
      stripe_session_id TEXT,
      transfer_completed INTEGER DEFAULT 0,
      transfer_completed_at DATETIME,
      transaction_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(project_id),
      FOREIGN KEY (buyer_id) REFERENCES users(user_id),
      FOREIGN KEY (seller_id) REFERENCES users(user_id)
    )`);

    // Create project_files table for file uploads
    db.run(`CREATE TABLE IF NOT EXISTS project_files (
      file_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_category TEXT DEFAULT 'document',
      file_size INTEGER NOT NULL,
      mime_type TEXT,
      storage_path TEXT NOT NULL,
      storage_type TEXT DEFAULT 'local',
      is_public INTEGER DEFAULT 0,
      download_count INTEGER DEFAULT 0,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )`);

    // Create indexes for project_files
    db.run(`CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_project_files_user_id ON project_files(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_project_files_type ON project_files(file_type)`);

      // Seed basic data
      db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (!err && row.count === 0) {
          console.log('[SERVER/DB.JS] Seeding basic test data...');

          try {
            // Create test users
            const bcrypt = require('bcryptjs');
            const saltRounds = 10;

            // Hash passwords
            const sellerPassword = bcrypt.hashSync('password123', saltRounds);
            const buyerPassword = bcrypt.hashSync('password123', saltRounds);

          db.run(`INSERT INTO users (user_id, username, email, password_hash, first_name, last_name, is_verified)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['seller1', 'seller1', 'seller1@test.com', sellerPassword, 'John', 'Seller', 1]);

          db.run(`INSERT INTO users (user_id, username, email, password_hash, first_name, last_name, is_verified)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['buyer1', 'buyer1', 'buyer1@test.com', buyerPassword, 'Jane', 'Buyer', 1]);

          // Create test projects with UUIDs
          const project1Id = '550e8400-e29b-41d4-a716-446655440001';
          const project2Id = '550e8400-e29b-41d4-a716-446655440002';

          db.run(`INSERT INTO projects (project_id, user_id, name, description, stage, is_public, is_for_sale, sale_price)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [project1Id, 'seller1', 'TaskFlow Pro', 'Advanced task management application', 'mvp', 1, 1, 5000]);

          db.run(`INSERT INTO projects (project_id, user_id, name, description, stage, is_public, is_for_sale, sale_price)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [project2Id, 'seller1', 'DevCollab', 'Developer collaboration platform', 'prototype', 1, 1, 3500]);

          // Test data seeded
          } catch (hashError) {
            // Error hashing passwords - using fallback
            // Use a simple fallback password for testing
            const fallbackPassword = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // 'password'

            db.run(`INSERT INTO users (user_id, username, email, password_hash, first_name, last_name, is_verified)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
              ['seller1', 'seller1', 'seller1@test.com', fallbackPassword, 'John', 'Seller', 1]);

            db.run(`INSERT INTO users (user_id, username, email, password_hash, first_name, last_name, is_verified)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
              ['buyer1', 'buyer1', 'buyer1@test.com', fallbackPassword, 'Jane', 'Buyer', 1]);

            // Used fallback password for test users
          }
        }
      });

      // Basic tables initialized
    });
  });
  
  // Query wrapper to match PostgreSQL interface
  const query = (text, params = []) => {
    return new Promise((resolve, reject) => {
      // Handle transaction commands
      if (text.toLowerCase().trim() === 'begin transaction' || text.toLowerCase().trim() === 'begin') {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            reject(err);
          } else {
            resolve({ rows: [], changes: 0 });
          }
        });
        return;
      }
      
      if (text.toLowerCase().trim() === 'commit') {
        db.run('COMMIT', (err) => {
          if (err) {
            reject(err);
          } else {
            resolve({ rows: [], changes: 0 });
          }
        });
        return;
      }
      
      if (text.toLowerCase().trim() === 'rollback') {
        db.run('ROLLBACK', (err) => {
          if (err) {
            reject(err);
          } else {
            resolve({ rows: [], changes: 0 });
          }
        });
        return;
      }
      
      if (text.toLowerCase().includes('select')) {
        db.all(text, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve({ rows });
          }
        });
      } else if (text.toLowerCase().includes('insert')) {
        db.run(text, params, function(err) {
          if (err) {
            reject(err);
          } else {
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
            reject(err);
          } else {
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

// SQL Helper functions for cross-database compatibility
// These are always PostgreSQL-compatible since we use PostgreSQL for production
const SQL = {
    // Boolean check helper - PostgreSQL uses true/false
    checkBool: (col) => `${col} = true`,
    
    // Check for boolean being false
    checkBoolFalse: (col) => `${col} = false`,
    
    // Set boolean to true
    setBoolTrue: () => `true`,
    
    // Set boolean to false  
    setBoolFalse: () => `false`,
    
    // Date/time interval - PostgreSQL syntax: NOW() - INTERVAL 'X days'
    dateInterval: (interval) => `NOW() - INTERVAL '${interval}'`,
    
    // Date/time comparison - e.g., "created_at > NOW() - INTERVAL '30 days'"
    dateAfter: (col, interval) => `${col} > NOW() - INTERVAL '${interval}'`,
    
    // Date/time between - PostgreSQL syntax
    dateBetween: (col, startInterval, endInterval) => 
        `${col} BETWEEN NOW() - INTERVAL '${startInterval}' AND NOW() - INTERVAL '${endInterval}'`,
    
    // Datetime function for INSERT/UPDATE - PostgreSQL uses CURRENT_TIMESTAMP or NOW()
    datetime: (offset = '') => offset ? `NOW() - INTERVAL '${offset}'` : 'NOW()',
    
    // Strftime equivalent for PostgreSQL - TO_CHAR
    strftime: (format, col) => {
        // Convert SQLite strftime format to PostgreSQL TO_CHAR format
        const formatMap = {
            '%Y-%m-%d %H:00': 'YYYY-MM-DD HH24:00',
            '%Y-%m-%d': 'YYYY-MM-DD',
            '%H:00': 'HH24:00'
        };
        return `TO_CHAR(${col}, '${formatMap[format] || format}')`;
    },
    
    // Julianday difference (days between dates) - PostgreSQL uses EXTRACT
    daysDiff: (col1, col2 = 'NOW()') => 
        `EXTRACT(EPOCH FROM (${col2} - ${col1})) / 86400`,
    
    // COALESCE for boolean columns - PostgreSQL uses true/false
    coalesceBool: (col, defaultVal = false) => 
        `COALESCE(${col}, ${defaultVal})`,
    
    // Check for boolean true in CASE WHEN
    caseWhenBool: (col) => `WHEN ${col} = true THEN 1`,
    
    // Count case when boolean
    countCaseWhenBool: (col, alias) => 
        `COUNT(CASE WHEN ${col} = true THEN 1 END) as ${alias}`,
    
    // Sum case when boolean
    sumCaseWhenBool: (col, valueCol, alias) => 
        `SUM(CASE WHEN ${col} = true THEN ${valueCol} ELSE 0 END) as ${alias}`
};

const convertPlaceholders = (text = '') => {
    if (!text || typeof text !== 'string') return text;
    if (!text.includes('?')) return text;
    
    // Handle PostgreSQL placeholder conversion (? -> $1, $2, etc.)
    // This regex matches ? but not inside string literals
    let index = 0;
    let result = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const prevChar = i > 0 ? text[i - 1] : '';
        
        // Toggle quote states (handle escaped quotes)
        if (char === "'" && prevChar !== '\\' && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote;
            result += char;
        } else if (char === '"' && prevChar !== '\\' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote;
            result += char;
        } else if (char === '?' && !inSingleQuote && !inDoubleQuote) {
            // Replace ? with PostgreSQL placeholder
            index++;
            result += `$${index}`;
        } else {
            result += char;
        }
    }
    
    return result;
};

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    // Enhanced connection pool settings for better performance
    max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum number of clients in the pool
    min: parseInt(process.env.DB_POOL_MIN || '5'), // Minimum number of clients to maintain
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 10000, // Maximum time to wait for connection to be established
    // Performance optimizations
    statement_timeout: 30000, // Statement timeout in ms (30s)
    query_timeout: 30000, // Query timeout in ms (30s)
    // Connection lifecycle
    keepAlive: true, // Keep connections alive
    keepAliveInitialDelayMillis: 10000, // Start keepalive after 10s
    // Pool behavior
    allowExitOnIdle: false, // Don't allow process to exit with idle clients
    // Application name for monitoring
    application_name: 'sidebuilds_api'
});

// Query performance monitoring
const queryStats = {
    totalQueries: 0,
    slowQueries: 0,
    errors: 0,
    avgQueryTime: 0
};

// Monitor query performance
const originalQuery = pool.query.bind(pool);
pool.query = async (text, params) => {
    const start = Date.now();
    queryStats.totalQueries++;
    
    try {
        const result = await originalQuery(text, params);
        const duration = Date.now() - start;
        
        // Update average query time
        queryStats.avgQueryTime = (queryStats.avgQueryTime * (queryStats.totalQueries - 1) + duration) / queryStats.totalQueries;
        
        // Log slow queries (over 1 second)
        if (duration > 1000) {
            queryStats.slowQueries++;
            console.warn(`[DB] Slow query (${duration}ms): ${text.substring(0, 100)}...`);
        }
        
        return result;
    } catch (error) {
        queryStats.errors++;
        throw error;
    }
};

// Get query statistics
const getQueryStats = () => ({
    ...queryStats,
    poolSize: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingClients: pool.waitingCount
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
      // Database connection successful
    });
  });
  
  // NOTE: Main module.exports is at the end of the file (line ~600)
  // This section just tests the connection

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
    
    setTimeout(async () => {
        connectionRetries++;
        try {
            const client = await pool.connect();
            client.release();
            isConnected = true;
            connectionRetries = 0; // Reset retry counter on success
        } catch (err) {
            reconnect(); // Try again
        }
    }, delay);
}

// Monitor the connection pool
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err.message);
    isConnected = false;
    
    // Start reconnection process
    reconnect();
});

// Test the connection
async function testConnection() {
    try {
        await pool.query('SELECT version()');
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
const query = async (text, params = []) => {
    // If we know we're not connected, wait a bit before trying
    if (!isConnected) {
        // Wait for a short time to see if connection is restored
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    try {
        const formattedText = convertPlaceholders(text);
        const result = await pool.query(formattedText, params);
        return result;
    } catch (err) {
        console.error('[DB-POSTGRES] Query error:', err.message);
        
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
    const wrappedQuery = (text, params = []) => {
        const formattedText = convertPlaceholders(text);
        return client.query(formattedText, params);
    };
    const proxyClient = {
        query: wrappedQuery,
        raw: client
    };
    try {
        await client.query('BEGIN');
        const result = await callback(proxyClient);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

if (useSQLite) {
  // Export SQLite interface
  module.exports = {
    query,
    getClient: () => db, // Return the SQLite db instance
    retry: () => true, // SQLite doesn't need retry logic like PostgreSQL
    withTransaction: async (callback) => {
      return new Promise((resolve, reject) => {
        db.serialize(async () => {
          try {
            await query('BEGIN TRANSACTION');
            const result = await callback(db);
            await query('COMMIT');
            resolve(result);
          } catch (error) {
            await query('ROLLBACK');
            reject(error);
          }
        });
      });
    },
    db, // Export SQLite db instance
    isConnectionHealthy: () => true, // Assume SQLite is always healthy
    checkConnection: async () => ({ connected: true }),
    isSQLite: true
  };
} else {
  // Export PostgreSQL interface
  module.exports = {
    query,
    getClient: () => pool.connect(),
    retry,
    withTransaction,
    pool, // Export the pool itself if needed
    isConnectionHealthy,
    checkConnection,
    isSQLite: false,
    SQL, // PostgreSQL SQL helper functions
    getQueryStats // Query performance statistics
  };
}