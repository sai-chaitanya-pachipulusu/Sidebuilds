const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up database...');

const sqliteSchemaPath = path.join(__dirname, 'database', 'sqlite_schema.sql');
const serverDbDir = path.join(__dirname, 'server');
const dbPath = path.join(serverDbDir, 'sidebuilds-complete.db');

if (fs.existsSync(dbPath)) {
  console.log('SQLite database already exists at', dbPath);
} else if (fs.existsSync(sqliteSchemaPath)) {
  console.log('Creating SQLite database from schema...');
  try {
    const schema = fs.readFileSync(sqliteSchemaPath, 'utf8');
    const sqlite3 = require('sqlite3');
    const db = new sqlite3.Database(dbPath);
    db.exec(schema, (err) => {
      if (err) {
        console.error('Error creating database:', err.message);
        process.exit(1);
      }
      console.log('Database created successfully.');
      db.close();
    });
  } catch (e) {
    console.error('Failed to create database:', e.message);
    process.exit(1);
  }
} else {
  console.log('No schema file found at', sqliteSchemaPath);
  console.log('Database setup skipped.');
}

console.log('Database setup complete.');
