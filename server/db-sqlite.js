const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// SQLite database for development
const dbPath = path.join(__dirname, 'sidebuilds-complete.db');
const db = new sqlite3.Database(dbPath);

console.log(`[SERVER/DB-SQLITE.JS] Using SQLite database at: ${dbPath}`);

// Initialize tables
const initTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Helper: add column if it does not exist
      const ensureColumn = (tableName, columnName, columnType) => {
        db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
          if (err) {
            console.error(`[DB-SQLITE] Failed to read table info for ${tableName}:`, err.message);
            return;
          }
          const hasColumn = Array.isArray(rows) && rows.some((r) => r.name === columnName);
          if (!hasColumn) {
            const alterSql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`;
            db.run(alterSql, [], (alterErr) => {
              if (alterErr) {
                console.warn(`[DB-SQLITE] ALTER TABLE add column failed (${tableName}.${columnName}):`, alterErr.message);
              } else {
                console.log(`[DB-SQLITE] Added missing column ${tableName}.${columnName}`);
              }
            });
          }
        });
      };
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Projects table (augmented with stage-specific and AI fields)
      db.run(`CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        stage TEXT,
        stage_details TEXT,              -- JSON string with stage-specific fields
        domain TEXT,
        demo_url TEXT,
        github_url TEXT,
        tech_stack TEXT,                 -- JSON string array
        monthly_revenue DECIMAL(10,2) DEFAULT 0,
        is_public BOOLEAN DEFAULT 1,
        is_for_sale BOOLEAN DEFAULT 0,
        sale_price DECIMAL(10,2),
        contact_email TEXT,
        contact_phone TEXT,
        payment_method TEXT,
        user_id INTEGER,
        ai_score INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id)
      )`);

      // Backfill missing columns for projects (for existing DBs)
      ensureColumn('projects', 'stage_details', 'TEXT');
      ensureColumn('projects', 'demo_url', 'TEXT');
      ensureColumn('projects', 'github_url', 'TEXT');
      ensureColumn('projects', 'tech_stack', 'TEXT');
      ensureColumn('projects', 'monthly_revenue', 'DECIMAL(10,2) DEFAULT 0');
      ensureColumn('projects', 'is_public', 'BOOLEAN DEFAULT 1');
      ensureColumn('projects', 'is_for_sale', 'BOOLEAN DEFAULT 0');
      ensureColumn('projects', 'sale_price', 'DECIMAL(10,2)');
      ensureColumn('projects', 'contact_email', 'TEXT');
      ensureColumn('projects', 'contact_phone', 'TEXT');
      ensureColumn('projects', 'payment_method', 'TEXT');
      ensureColumn('projects', 'ai_score', 'INTEGER DEFAULT 0');
      ensureColumn('projects', 'view_count', 'INTEGER DEFAULT 0');

      // Purchase requests table
      db.run(`CREATE TABLE IF NOT EXISTS purchase_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        buyer_id INTEGER,
        seller_id INTEGER,
        status TEXT DEFAULT 'pending',
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id),
        FOREIGN KEY (buyer_id) REFERENCES users (user_id),
        FOREIGN KEY (seller_id) REFERENCES users (user_id)
      )`);

      // Project purchase requests table (alternative name used in queries)
      db.run(`CREATE TABLE IF NOT EXISTS project_purchase_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        buyer_id INTEGER,
        seller_id INTEGER,
        status TEXT DEFAULT 'pending',
        message TEXT,
        price DECIMAL(10,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id),
        FOREIGN KEY (buyer_id) REFERENCES users (user_id),
        FOREIGN KEY (seller_id) REFERENCES users (user_id)
      )`);

      // Notifications table
      db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        read BOOLEAN DEFAULT 0,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id)
      )`);

      // User profiles table (extended user data)
      db.run(`CREATE TABLE IF NOT EXISTS user_profiles (
        user_id INTEGER PRIMARY KEY,
        bio TEXT,
        company TEXT,
        website TEXT,
        linkedin TEXT,
        twitter TEXT,
        github TEXT,
        skills TEXT,
        experience_level TEXT,
        location TEXT,
        timezone TEXT,
        profile_image TEXT,
        verified BOOLEAN DEFAULT 0,
        phone_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id)
      )`);

      // Ensure phone_number column exists on older databases
      db.all(`PRAGMA table_info(user_profiles)`, [], (err, rows) => {
        if (!err) {
          const hasPhone = rows && rows.some(r => r.name === 'phone_number');
          if (!hasPhone) {
            db.run(`ALTER TABLE user_profiles ADD COLUMN phone_number TEXT`, (alterErr) => {
              if (alterErr) {
                console.log('[DB-SQLITE] phone_number column add error (safe to ignore if exists):', alterErr.message);
              } else {
                console.log('[DB-SQLITE] phone_number column added to user_profiles');
              }
            });
          }
        }
      });

      // Stripe accounts table
      db.run(`CREATE TABLE IF NOT EXISTS stripe_accounts (
        user_id INTEGER PRIMARY KEY,
        stripe_account_id TEXT,
        account_status TEXT DEFAULT 'pending',
        details_submitted BOOLEAN DEFAULT 0,
        charges_enabled BOOLEAN DEFAULT 0,
        payouts_enabled BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id)
      )`);

      console.log('✅ SQLite database tables initialized');
      resolve();
    });
  });
};

// Query wrapper to match PostgreSQL interface
const query = (text, params = []) => {
  return new Promise((resolve, reject) => {
    // Convert PostgreSQL-style parameters ($1, $2) to SQLite-style (?)
    let sqliteQuery = text;
    for (let i = params.length; i >= 1; i--) {
      sqliteQuery = sqliteQuery.replace(new RegExp(`\\$${i}`, 'g'), '?');
    }
    
    console.log('[DB-SQLITE] Query:', sqliteQuery, 'Params:', params);
    
    if (sqliteQuery.toLowerCase().includes('select')) {
      db.all(sqliteQuery, params, (err, rows) => {
        if (err) {
          console.error('[DB-SQLITE] SELECT Error:', err);
          reject(err);
        } else {
          console.log('[DB-SQLITE] SELECT Result:', rows);
          resolve({ rows });
        }
      });
    } else if (sqliteQuery.toLowerCase().includes('insert') && sqliteQuery.toLowerCase().includes('returning')) {
      // Handle INSERT with RETURNING clause
      const insertQuery = sqliteQuery.replace(/RETURNING.*$/i, '');
      db.run(insertQuery, params, function(err) {
        if (err) {
          console.error('[DB-SQLITE] INSERT Error:', err);
          reject(err);
        } else {
          // Get the inserted row
          const selectQuery = `SELECT * FROM users WHERE user_id = ?`;
          db.get(selectQuery, [this.lastID], (err, row) => {
            if (err) {
              console.error('[DB-SQLITE] SELECT after INSERT Error:', err);
              reject(err);
            } else {
              console.log('[DB-SQLITE] INSERT Result:', row);
              resolve({ rows: [row] });
            }
          });
        }
      });
    } else {
      db.run(sqliteQuery, params, function(err) {
        if (err) {
          console.error('[DB-SQLITE] RUN Error:', err);
          reject(err);
        } else {
          console.log('[DB-SQLITE] RUN Result: changes=', this.changes, 'lastID=', this.lastID);
          resolve({ 
            rows: [], 
            insertId: this.lastID,
            changes: this.changes
          });
        }
      });
    }
  });
};

// Initialize tables on startup
initTables().catch(console.error);

module.exports = {
  query,
  db,
  checkConnection: async () => ({
    ok: true,
    message: 'SQLite database is healthy'
  }),
  isConnectionHealthy: async () => true
};