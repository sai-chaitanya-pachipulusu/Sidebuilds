const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sidebuilds.db');
const db = new sqlite3.Database(dbPath);

console.log('Migrating users table...');

db.serialize(() => {
  // First check if username column exists
  db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
      console.error('Error checking table:', err);
      return;
    }
    
    const hasUsername = columns.some(col => col.name === 'username');
    const hasUserIdColumn = columns.some(col => col.name === 'user_id');
    const hasPasswordHash = columns.some(col => col.name === 'password_hash');
    
    console.log('Current columns:', columns.map(c => c.name));
    console.log('Has username:', hasUsername);
    console.log('Has user_id:', hasUserIdColumn);
    console.log('Has password_hash:', hasPasswordHash);
    
    if (!hasUsername) {
      console.log('Adding username column...');
      db.run("ALTER TABLE users ADD COLUMN username TEXT", (err) => {
        if (err) console.error('Error adding username:', err);
        else console.log('✅ Username column added');
      });
    }
    
    if (!hasUserIdColumn) {
      console.log('Need to recreate table to change primary key...');
      // Create new table with correct schema
      db.run(`CREATE TABLE users_new (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating new table:', err);
          return;
        }
        console.log('✅ New users table created');
        
        // Copy data if any exists
        db.run(`INSERT INTO users_new (username, email, password_hash, first_name, last_name, created_at, updated_at)
                SELECT 
                  substr(email, 1, instr(email, '@') - 1) as username,
                  email,
                  password as password_hash,
                  first_name,
                  last_name,
                  created_at,
                  updated_at
                FROM users`, (err) => {
          if (err) {
            console.error('Error copying data:', err);
          } else {
            console.log('✅ Data copied to new table');
            
            // Drop old table and rename
            db.run("DROP TABLE users", (err) => {
              if (err) {
                console.error('Error dropping old table:', err);
              } else {
                db.run("ALTER TABLE users_new RENAME TO users", (err) => {
                  if (err) {
                    console.error('Error renaming table:', err);
                  } else {
                    console.log('✅ Table migration completed');
                    db.close();
                  }
                });
              }
            });
          }
        });
      });
    } else if (!hasPasswordHash) {
      console.log('Adding password_hash column...');
      db.run("ALTER TABLE users ADD COLUMN password_hash TEXT", (err) => {
        if (err) console.error('Error adding password_hash:', err);
        else {
          console.log('✅ Password_hash column added');
          // Copy password to password_hash
          db.run("UPDATE users SET password_hash = password WHERE password_hash IS NULL", (err) => {
            if (err) console.error('Error copying password:', err);
            else console.log('✅ Password data copied');
            db.close();
          });
        }
      });
    } else {
      console.log('✅ Table already has correct schema');
      db.close();
    }
  });
});