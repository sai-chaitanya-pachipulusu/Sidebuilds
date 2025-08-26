// Test the server database connection
// This script simulates how the server would connect to the database

// Set environment variables directly in the script
process.env.DATABASE_URL = "postgresql://postgres:Qwerty@123@db.rwrlotiafxzunqaypvlo.supabase.co:5432/postgres";
process.env.DB_SSL = "true";

// Import the database module
const db = require('../server/db');

async function testServerDbConnection() {
  console.log('Testing server database connection...');
  
  try {
    // Use the database module's connection check
    const status = await db.checkConnection();
    
    if (status.ok) {
      console.log('✅ Server database connection successful!');
      
      // Test a query to list tables
      const tables = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      console.log('\nDatabase tables:');
      if (tables.rows.length === 0) {
        console.log('No tables found.');
      } else {
        tables.rows.forEach((row, i) => {
          console.log(`${i + 1}. ${row.table_name}`);
        });
      }
      
      // Test a simple query to count users
      const users = await db.query('SELECT COUNT(*) FROM users');
      console.log(`\nUser count: ${users.rows[0].count}`);
      
    } else {
      console.error('❌ Server database connection failed:', status.message);
    }
  } catch (err) {
    console.error('❌ Error testing server database connection:', err.message);
  } finally {
    // Close the connection pool
    await db.pool.end();
  }
}

// Run the test
testServerDbConnection(); 