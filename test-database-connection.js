require('dotenv').config({ path: require('path').join(__dirname, 'server', '.env') });

async function testConnection() {
  const useSQLite = process.env.USE_SQLITE === 'true';

  if (useSQLite) {
    console.log('Testing SQLite connection...');
    try {
      const sqlite3 = require('sqlite3');
      const path = require('path');
      const dbPath = path.join(__dirname, 'server', 'sidebuilds-complete.db');
      const db = new sqlite3.Database(dbPath);
      db.get('SELECT 1 as test', (err, row) => {
        if (err) {
          console.error('SQLite connection failed:', err.message);
          process.exit(1);
        }
        console.log('SQLite connection OK:', row);
        db.close();
        process.exit(0);
      });
    } catch (e) {
      console.error('SQLite connection failed:', e.message);
      process.exit(1);
    }
  } else {
    console.log('Testing PostgreSQL connection...');
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      });
      const result = await pool.query('SELECT 1 as test');
      console.log('PostgreSQL connection OK:', result.rows[0]);
      await pool.end();
      process.exit(0);
    } catch (e) {
      console.error('PostgreSQL connection failed:', e.message);
      process.exit(1);
    }
  }
}

testConnection();
