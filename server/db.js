const { Pool } = require('pg');
const path = require('path'); // Import the path module

require('dotenv').config({ path: path.resolve(__dirname, '.env') });
// Explicitly load .env file from the server directory
// REMOVED: require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// REMOVED: console.log("DATABASE_URL from env:", process.env.DATABASE_URL);

// Environment-based database selection
const useSQLite = process.env.NODE_ENV === 'development' && process.env.USE_SQLITE === 'true';
console.log(`[SERVER/DB.JS] NODE_ENV: ${process.env.NODE_ENV || 'development'}, Database: ${useSQLite ? 'sqlite' : 'postgres'}`);

if (useSQLite) {
  // Use SQLite for development with unified schema
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  
  const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, 'sidebuilds-complete.db');
  const db = new sqlite3.Database(dbPath);
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });

  console.log(`[SERVER/DB.JS] Using SQLite database at: ${dbPath}`);

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
        stripe_customer_id TEXT,
        onboarding_complete INTEGER DEFAULT 0,
        payout_enabled INTEGER DEFAULT 0,
        stripe_charges_enabled INTEGER DEFAULT 0,
        stripe_details_submitted INTEGER DEFAULT 0
      )`);

    db.run(`CREATE TABLE IF NOT EXISTS projects (
      project_id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      owner_username TEXT,
      name TEXT NOT NULL,
      description TEXT,
      detailed_description TEXT,
      stage_details TEXT NOT NULL DEFAULT '{}',
      stage TEXT DEFAULT 'idea',
      status TEXT DEFAULT 'draft',
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
      interest_count INTEGER DEFAULT 0,
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
      is_on_hold INTEGER DEFAULT 0,
      code_transferred INTEGER DEFAULT 0,
      domain_transferred INTEGER DEFAULT 0,
      assets_transferred INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(user_id)
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
      stripe_transfer_id TEXT,
      code_transferred INTEGER DEFAULT 0,
      domain_transferred INTEGER DEFAULT 0,
      assets_transferred INTEGER DEFAULT 0,
      transfer_notes TEXT,
      terms_agreed_version TEXT,
      escrow_status TEXT DEFAULT 'not_started',
      dispute_reason TEXT,
      dispute_reported_at DATETIME,
      dispute_reported_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(project_id),
      FOREIGN KEY (buyer_id) REFERENCES users(user_id),
      FOREIGN KEY (seller_id) REFERENCES users(user_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS purchase_agreements (
      id TEXT PRIMARY KEY,
      purchase_request_id INTEGER NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
      version INTEGER NOT NULL CHECK (version > 0),
      price_cents INTEGER NOT NULL CHECK (price_cents BETWEEN 50 AND 100000000),
      included_items TEXT NOT NULL,
      exclusions TEXT NOT NULL,
      running_costs TEXT NOT NULL,
      handover_steps TEXT NOT NULL,
      support_terms TEXT NOT NULL,
      seller_approved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      buyer_approved_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (purchase_request_id, version)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT,
      message TEXT,
      is_read INTEGER DEFAULT 0,
      link TEXT,
      action_url TEXT,
      data TEXT,
      related_project_id TEXT,
      related_transaction_id TEXT,
      priority INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
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

    db.run(`CREATE TABLE IF NOT EXISTS purchase_request_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT UNIQUE DEFAULT (lower(hex(randomblob(16)))),
      purchase_request_id INTEGER REFERENCES purchase_requests(id),
      sender_id TEXT NOT NULL,
      recipient_id TEXT,
      content TEXT NOT NULL,
      message TEXT,
      is_system_message INTEGER DEFAULT 0,
      attachment_url TEXT,
      message_type TEXT DEFAULT 'general',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(user_id),
      FOREIGN KEY (recipient_id) REFERENCES users(user_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS project_transactions (
      transaction_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      project_id TEXT,
      seller_id TEXT,
      buyer_id TEXT,
      amount REAL NOT NULL,
      commission_amount REAL DEFAULT 0,
      seller_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      payment_id TEXT,
      stripe_session_id TEXT,
      stripe_payment_intent_id TEXT,
      stripe_transfer_id TEXT,
      escrow_released INTEGER DEFAULT 0,
      escrow_status TEXT DEFAULT 'held',
      escrow_released_at DATETIME,
      transfer_completed INTEGER DEFAULT 0,
      transfer_completed_at DATETIME,
      transaction_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (project_id) REFERENCES projects(project_id),
      FOREIGN KEY (seller_id) REFERENCES users(user_id),
      FOREIGN KEY (buyer_id) REFERENCES users(user_id)
    )`);

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

    db.run(`CREATE TABLE IF NOT EXISTS project_saves (
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, project_id),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS project_reviews (
      review_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      project_id TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      title TEXT,
      comment TEXT,
      is_verified_purchase INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (project_id, reviewer_id),
      FOREIGN KEY (project_id) REFERENCES projects(project_id),
      FOREIGN KEY (reviewer_id) REFERENCES users(user_id),
      FOREIGN KEY (seller_id) REFERENCES users(user_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS project_questions (
      question_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      project_id TEXT NOT NULL,
      asker_id TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT,
      answered_by TEXT,
      answered_at DATETIME,
      is_public INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
      FOREIGN KEY (asker_id) REFERENCES users(user_id),
      FOREIGN KEY (answered_by) REFERENCES users(user_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS user_follows (
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (follower_id, following_id),
      CHECK (follower_id <> following_id),
      FOREIGN KEY (follower_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(user_id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS payment_disputes (
      dispute_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      transaction_id TEXT NOT NULL,
      initiated_by TEXT NOT NULL,
      dispute_reason TEXT NOT NULL,
      dispute_status TEXT DEFAULT 'open',
      resolution TEXT,
      resolved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES project_transactions(transaction_id)
    )`);

    db.run('CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_project_questions_project ON project_questions(project_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_project_reviews_seller ON project_reviews(seller_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_transactions_parties ON project_transactions(buyer_id, seller_id)');

    // CREATE TABLE IF NOT EXISTS does not upgrade older local databases. These
    // additive migrations keep existing developer data while bringing it up to
    // the current route contract. Duplicate-column errors are expected and safe.
    const addColumn = (table, column, definition) => {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (error) => {
        if (error && !/duplicate column name/i.test(error.message)) {
          console.error(`[SERVER/DB.JS] Could not add ${table}.${column}:`, error.message);
        }
      });
    };
    addColumn('users', 'payout_enabled', 'INTEGER DEFAULT 0');
    addColumn('users', 'stripe_charges_enabled', 'INTEGER DEFAULT 0');
    addColumn('users', 'stripe_details_submitted', 'INTEGER DEFAULT 0');
    addColumn('users', 'stripe_onboarding_complete', 'INTEGER DEFAULT 0');
    addColumn('projects', 'featured', 'INTEGER DEFAULT 0');
    addColumn('projects', 'status', "TEXT DEFAULT 'draft'");
    addColumn('projects', 'stage_details', "TEXT NOT NULL DEFAULT '{}'");
    addColumn('projects', 'verified', 'INTEGER DEFAULT 0');
    addColumn('purchase_requests', 'stripe_session_id', 'TEXT');
    addColumn('purchase_requests', 'agreement_id', 'TEXT REFERENCES purchase_agreements(id)');
    addColumn('purchase_requests', 'stripe_payment_intent_id', 'TEXT');
    addColumn('purchase_requests', 'stripe_payout_id', 'TEXT');
    addColumn('purchase_requests', 'stripe_transfer_id', 'TEXT');
    addColumn('purchase_requests', 'code_transferred', 'INTEGER DEFAULT 0');
    addColumn('purchase_requests', 'domain_transferred', 'INTEGER DEFAULT 0');
    addColumn('purchase_requests', 'assets_transferred', 'INTEGER DEFAULT 0');
    addColumn('purchase_requests', 'transfer_notes', 'TEXT');
    addColumn('purchase_requests', 'terms_agreed_version', 'TEXT');
    addColumn('purchase_requests', 'escrow_status', "TEXT DEFAULT 'not_started'");
    addColumn('purchase_requests', 'dispute_reason', 'TEXT');
    addColumn('purchase_requests', 'dispute_reported_at', 'DATETIME');
    addColumn('purchase_requests', 'dispute_reported_by', 'TEXT');
    addColumn('notifications', 'link', 'TEXT');
    addColumn('notifications', 'data', 'TEXT');
    addColumn('purchase_request_messages', 'message_id', 'TEXT');
    addColumn('purchase_request_messages', 'message', 'TEXT');
    addColumn('purchase_request_messages', 'is_system_message', 'INTEGER DEFAULT 0');
    addColumn('purchase_request_messages', 'attachment_url', 'TEXT');
    db.run('UPDATE purchase_request_messages SET message_id = lower(hex(randomblob(16))) WHERE message_id IS NULL');
    db.run(`UPDATE notifications
      SET notification_id = lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))
      WHERE notification_id IS NULL`);
    addColumn('project_transactions', 'stripe_transfer_id', 'TEXT');
    addColumn('project_transactions', 'escrow_status', "TEXT DEFAULT 'held'");
    addColumn('project_transactions', 'purchase_request_id', 'INTEGER REFERENCES purchase_requests(id)');
    addColumn('project_transactions', 'currency', "TEXT DEFAULT 'usd'");
    addColumn('project_transactions', 'seller_stripe_account_id', 'TEXT');
    addColumn('project_transactions', 'dispute_reason', 'TEXT');
    addColumn('project_transactions', 'dispute_reported_at', 'DATETIME');
    addColumn('project_transactions', 'dispute_reported_by', 'TEXT');
    addColumn('project_transactions', 'provider_dispute_id', 'TEXT');
    addColumn('project_transactions', 'refunded_amount', 'REAL NOT NULL DEFAULT 0');
    addColumn('project_transactions', 'reconciled_at', 'DATETIME');
    addColumn('project_transactions', 'reconciled_by', 'TEXT');
    addColumn('users', 'is_test', 'INTEGER NOT NULL DEFAULT 0');
    addColumn('users', 'last_login_at', 'DATETIME');
    addColumn('users', 'login_count', 'INTEGER NOT NULL DEFAULT 0');
    db.run(`CREATE TABLE IF NOT EXISTS checkout_reservations (
      project_id TEXT PRIMARY KEY REFERENCES projects(project_id), purchase_request_id INTEGER NOT NULL REFERENCES purchase_requests(id),
      generation TEXT UNIQUE NOT NULL, agreement_id TEXT NOT NULL, price_cents INTEGER NOT NULL, fee_cents INTEGER NOT NULL,
      currency TEXT DEFAULT 'usd', seller_account_id TEXT NOT NULL, session_id TEXT UNIQUE, state TEXT DEFAULT 'creating',
      expires_at INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS payment_event_claims (event_id TEXT PRIMARY KEY,event_type TEXT NOT NULL,
      status TEXT DEFAULT 'processing', received_at DATETIME DEFAULT CURRENT_TIMESTAMP,completed_at DATETIME)`);
    db.run('CREATE TABLE IF NOT EXISTS project_file_blobs (file_id TEXT PRIMARY KEY REFERENCES project_files(file_id) ON DELETE CASCADE,content BLOB NOT NULL)');
    db.run('CREATE TABLE IF NOT EXISTS payment_blocks (payment_id TEXT PRIMARY KEY,reason TEXT NOT NULL,created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
    db.run('CREATE TABLE IF NOT EXISTS payment_event_failures (event_id TEXT PRIMARY KEY,event_type TEXT NOT NULL,attempts INTEGER DEFAULT 1,error_code TEXT,received_at DATETIME DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
    db.run('CREATE TABLE IF NOT EXISTS payout_attempts (transaction_id TEXT PRIMARY KEY REFERENCES project_transactions(transaction_id),created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
    for (const column of ['stripe_session_id', 'stripe_payment_intent_id', 'purchase_request_id']) {
      db.run(`CREATE UNIQUE INDEX IF NOT EXISTS transactions_unique_${column} ON project_transactions(${column}) WHERE ${column} IS NOT NULL`);
    }
    addColumn('ai_project_analysis', 'confidence_level', 'TEXT');
    addColumn('ai_project_analysis', 'insights', 'TEXT');
    addColumn('ai_project_analysis', 'risks', 'TEXT');
    db.run("UPDATE project_transactions SET status = 'payment_completed' WHERE status = 'completed' AND COALESCE(escrow_released, 0) = 0 AND COALESCE(transfer_completed, 0) = 0");

      // Seed basic data
      db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (process.env.SEED_DEMO_DATA === 'false') return;
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

          db.run(`INSERT INTO projects (project_id, owner_id, owner_username, name, description, stage, is_public, is_for_sale, sale_price)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [project1Id, 'seller1', 'seller1', 'TaskFlow Pro', 'Advanced task management application', 'mvp', 1, 1, 5000]);

          db.run(`INSERT INTO projects (project_id, owner_id, owner_username, name, description, stage, is_public, is_for_sale, sale_price)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [project2Id, 'seller1', 'seller1', 'DevCollab', 'Developer collaboration platform', 'prototype', 1, 1, 3500]);

          console.log('[SERVER/DB.JS] Test data seeded successfully');
          } catch (hashError) {
            console.error('[SERVER/DB.JS] Error hashing passwords:', hashError);
            // Use a simple fallback password for testing
            const fallbackPassword = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // 'password'

            db.run(`INSERT INTO users (user_id, username, email, password_hash, first_name, last_name, is_verified)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
              ['seller1', 'seller1', 'seller1@test.com', fallbackPassword, 'John', 'Seller', 1]);

            db.run(`INSERT INTO users (user_id, username, email, password_hash, first_name, last_name, is_verified)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
              ['buyer1', 'buyer1', 'buyer1@test.com', fallbackPassword, 'Jane', 'Buyer', 1]);

            console.log('[SERVER/DB.JS] Used fallback password for test users');
          }
        }
      });

      console.log('[SERVER/DB.JS] Basic tables initialized');
      db.get('SELECT 1', (error) => error ? rejectReady(error) : resolveReady());
    });
  });
  
  // Translate the small PostgreSQL syntax subset used by shared routes into
  // SQLite equivalents. Keeping this here lets route code stay database-agnostic.
  const normalizeSQLiteQuery = (text = '') => text
    .replace(/\s+FOR\s+UPDATE\b/gi, '')
    .replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/\bILIKE\b/gi, 'LIKE')
    .replace(/::(?:int(?:eger)?|float|numeric|text|boolean)\b/gi, '')
    .replace(/TIMESTAMPTZ/gi, 'DATETIME')
    .replace(/CURRENT_TIMESTAMP\s*-\s*INTERVAL\s+'(\d+)\s+(hour|hours|day|days)'/gi,
      (_match, amount, unit) => `datetime('now', '-${amount} ${unit}')`);

  const prepareSQLiteQuery = (text, params) => {
    const orderedParams = [];
    const sql = normalizeSQLiteQuery(text).replace(/\$(\d+)/g, (_match, number) => {
      orderedParams.push(params[Number(number) - 1]);
      return '?';
    });
    return {
      sql,
      params: orderedParams.length > 0 ? orderedParams : params
    };
  };

  // Query wrapper to match PostgreSQL's { rows, rowCount } interface.
  const query = (text, params = []) => {
    return new Promise((resolve, reject) => {
      const prepared = prepareSQLiteQuery(text, params);
      const normalizedText = prepared.sql;
      const normalizedParams = prepared.params;
      if (process.env.DB_LOG_QUERIES === 'true') {
        console.log('[DB-SQLITE] Query:', normalizedText, 'Params:', normalizedParams);
      }
      
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
      
      const command = normalizedText.trim().split(/\s+/)[0].toUpperCase();
      const returnsRows = command === 'SELECT' || command === 'PRAGMA' ||
        (command === 'WITH' && /\bSELECT\b/i.test(normalizedText)) ||
        /\bRETURNING\b/i.test(normalizedText);

      if (returnsRows) {
        db.all(normalizedText, normalizedParams, (err, rows) => {
          if (err) {
            console.error('[DB-SQLITE] SELECT Error:', err);
            reject(err);
          } else {
            resolve({ rows, rowCount: rows.length, changes: rows.length });
          }
        });
      } else if (command === 'INSERT') {
        db.run(normalizedText, normalizedParams, function(err) {
          if (err) {
            console.error('[DB-SQLITE] INSERT Error:', err);
            reject(err);
          } else {
            resolve({ 
              rows: [], 
              insertId: this.lastID,
              changes: this.changes,
              rowCount: this.changes
            });
          }
        });
      } else {
        db.run(normalizedText, normalizedParams, function(err) {
          if (err) {
            console.error('[DB-SQLITE] RUN Error:', err);
            reject(err);
          } else {
            resolve({ 
              rows: [], 
              changes: this.changes,
              rowCount: this.changes
            });
          }
        });
      }
    });
  };
  
  // Add transaction support for SQLite
  let transactionQueue = Promise.resolve();
  const withTransaction = async (callback) => {
    const previous = transactionQueue;
    let release;
    transactionQueue = new Promise(resolve => { release = resolve; });
    await previous;
    try {
    await query('BEGIN TRANSACTION');
    try {
      const result = await callback({ query });
      await query('COMMIT');
      return result;
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
    } finally { release(); }
  };

  const getQueryStats = () => ({ total: 0, byType: {}, note: 'SQLite stats not tracked' });

  // Predicate for "boolean column is true" in this dialect. SQLite stores
  // booleans as INTEGER 0/1; comparing to TRUE literal also works on modern
  // SQLite, but = 1 is universally safe for the INTEGER columns used here.
  const trueExpr = (column) => `(${column} = 1 OR ${column} = TRUE)`;

  module.exports = {
    query,
    db,
    ready,
    dialect: 'sqlite',
    trueExpr,
    withTransaction,
    checkConnection: async () => ({
      ok: true,
      type: 'sqlite',
      message: 'SQLite database is healthy'
    }),
    isConnectionHealthy: async () => true,
    getDatabaseInfo: async () => {
      const users = await query('SELECT COUNT(*) as count FROM users');
      const projects = await query('SELECT COUNT(*) as count FROM projects');
      return {
        type: 'sqlite',
        mode: 'development',
        healthy: true,
        userCount: Number(users.rows?.[0]?.count || 0),
        projectCount: Number(projects.rows?.[0]?.count || 0)
      };
    },
    getQueryStats
  };
  return;
}

// --- PostgreSQL code path (only reached when useSQLite is false) ---

// Configure connection pool with standard PostgreSQL settings
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

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required when not using explicit development SQLite mode.');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true,
      ca: require('fs').readFileSync(process.env.DB_SSL_CA_FILE || path.join(__dirname, 'certs', 'supabase-ca.crt')) } : false,
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 5000, // Maximum time to wait for connection to be established
    // Standard PostgreSQL settings
    statement_timeout: 10000, // Statement timeout in ms (10s)
    query_timeout: 10000 // Query timeout in ms (10s)
});

// Track connection state. Starts optimistic so queries issued before the
// initial connection probe completes don't all pay the 1s "not connected"
// penalty on cold starts; a real failure flips this to false immediately.
let isConnected = true;
let connectionRetries = 0;
const MAX_CONNECTION_RETRIES = 10;

// Test connection
pool.connect((err, client, release) => {
    if (err) {
      return console.error('Error acquiring client from pool', err.stack);
    }
    client.query('SELECT NOW()', (err, result) => {
      release();
      if (err) {
        isConnected = false;
        return console.error('Error executing query', err.stack);
      }
      isConnected = true;
      console.log('Successfully connected to PostgreSQL database. Server time:', result.rows[0].now);
    });
  });

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
const query = async (text, params = []) => {
    // If we know we're not connected, wait a bit before trying
    if (!isConnected) {
        // Wait for a short time to see if connection is restored
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    try {
        const formattedText = convertPlaceholders(text);
        if (process.env.NODE_ENV !== 'production') {
            console.log('[DB-POSTGRES] Original query:', text.substring(0, 200));
            console.log('[DB-POSTGRES] Converted query:', formattedText.substring(0, 200));
            console.log('[DB-POSTGRES] Params:', params);
        }
        const result = await pool.query(formattedText, params);
        isConnected = true;
        connectionRetries = 0;
        return result;
    } catch (err) {
        console.error('[DB-POSTGRES] Query error:', err.message);
        console.error('[DB-POSTGRES] Query:', text.substring(0, 200));
        console.error('[DB-POSTGRES] Error code:', err.code);
        console.error('[DB-POSTGRES] Error detail:', err.detail);
        
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
        isConnected = true;
        return true;
    } catch (err) {
        isConnected = false;
        return false;
    }
};

// Comprehensive connection check 
const checkConnection = async () => {
    try {
        const client = await pool.connect();
        try {
            await client.query('SELECT 1');
            isConnected = true;
            return { ok: true, type: 'postgres', message: 'Database connection is healthy' };
        } finally {
            client.release();
        }
    } catch (err) {
        return { 
            ok: false, 
            type: 'postgres',
            message: `Database connection failed: ${err.message}`,
            error: err 
        };
    }
};

const getCount = async (tableName) => {
    const result = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return Number(result.rows?.[0]?.count || 0);
};

const getDatabaseInfo = async () => {
    const connection = await checkConnection();
    const info = {
        type: 'postgres',
        mode: process.env.NODE_ENV || 'development',
        healthy: connection.ok,
        message: connection.message,
        userCount: null,
        projectCount: null
    };

    if (!connection.ok) {
        return info;
    }

    const [userCount, projectCount] = await Promise.all([
        getCount('users'),
        getCount('projects')
    ]);

    return {
        ...info,
        userCount,
        projectCount
    };
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

// Query performance stats
const queryStats = { total: 0, byType: {} };
const getQueryStats = () => queryStats;

// Export PostgreSQL interface
// Predicate for "boolean column is true" in this dialect. PostgreSQL BOOLEAN
// columns cannot be compared to integers (boolean = integer throws), so only
// the TRUE literal is valid here.
const trueExpr = (column) => `${column} = TRUE`;

module.exports = {
  query: async (text, params) => {
    queryStats.total++;
    const type = text.trim().split(/\s+/)[0].toUpperCase() || 'OTHER';
    queryStats.byType[type] = (queryStats.byType[type] || 0) + 1;
    return query(text, params);
  },
  dialect: 'postgres',
  trueExpr,
  getClient: () => pool.connect(),
  retry,
  withTransaction,
  pool,
  isConnectionHealthy,
  checkConnection,
  getDatabaseInfo,
  getQueryStats
};
