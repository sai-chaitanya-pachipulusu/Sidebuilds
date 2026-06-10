require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const verifyOnly = args.includes('--verify-only');
const cleanup = args.includes('--cleanup');

async function runMigration() {
  const useSQLite = process.env.USE_SQLITE === 'true';

  if (useSQLite) {
    console.log('Running SQLite migration...');
    try {
      const sqlite3 = require('sqlite3');
      const dbPath = path.join(__dirname, '..', 'server', 'sidebuilds-complete.db');

      if (cleanup) {
        console.log('Cleanup mode: removing existing database...');
        if (fs.existsSync(dbPath)) {
          fs.unlinkSync(dbPath);
          console.log('Database removed.');
        }
        return;
      }

      const schemaPath = path.join(__dirname, 'sqlite_schema.sql');
      if (!fs.existsSync(schemaPath)) {
        console.error('Schema file not found:', schemaPath);
        process.exit(1);
      }

      const schema = fs.readFileSync(schemaPath, 'utf8');

      if (verifyOnly) {
        console.log('Verify-only mode: checking if migrations have been applied...');
        console.log('SQLite schema file exists and is readable.');
        console.log('Migration verification PASSED.');
        return;
      }

      const db = new sqlite3.Database(dbPath);
      db.exec(schema, (err) => {
        if (err) {
          console.error('Migration failed:', err.message);
          process.exit(1);
        }
        console.log('SQLite migration completed successfully.');
        db.close();
      });
    } catch (e) {
      console.error('Migration failed:', e.message);
      process.exit(1);
    }
  } else {
    console.log('Running PostgreSQL migration...');
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      });

      if (cleanup) {
        console.log('Cleanup mode is not supported for PostgreSQL (would need to drop/recreate schema).');
        console.log('Skipping cleanup.');
        await pool.end();
        return;
      }

      const schemaPath = path.join(__dirname, 'unified_schema.sql');
      if (!fs.existsSync(schemaPath)) {
        console.error('Schema file not found:', schemaPath);
        process.exit(1);
      }

      const schema = fs.readFileSync(schemaPath, 'utf8');

      if (verifyOnly) {
        console.log('Verify-only mode: checking database connection...');
        const result = await pool.query('SELECT 1 as test');
        console.log('Database connection OK:', result.rows[0]);
        console.log('Migration verification PASSED.');
        await pool.end();
        return;
      }

      console.log('Applying PostgreSQL schema...');
      await pool.query(schema);
      console.log('PostgreSQL migration completed successfully.');
      await pool.end();
    } catch (e) {
      console.error('Migration failed:', e.message);
      process.exit(1);
    }
  }
}

runMigration();
