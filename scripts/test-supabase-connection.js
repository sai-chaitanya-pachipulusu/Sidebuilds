// Test connection to Supabase
const { Pool } = require('pg');

// Use the Supabase connection string format
// You need to replace YOUR_PASSWORD with your actual database password
const connectionString = "postgresql://postgres:Qwerty@123@db.rwrlotiafxzunqaypvlo.supabase.co:5432/postgres";

console.log("Attempting to connect to:", connectionString.replace(/(postgresql:\/\/postgres:)([^@]+)(@.*)/, '$1*****$3'));

// Create a connection pool
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Supabase connections
  },
  max: 8 // Supabase free tier has a limit of 10 connections
});

// Try with direct parameters
const directPool = new Pool({
  user: 'postgres',
  password: 'Qwerty@123', // Replace with your actual password
  host: 'db.rwrlotiafxzunqaypvlo.supabase.co', 
  port: 5432,
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  },
  max: 8
});

async function testConnectionWithPool(pool, name) {
  console.log(`\nTesting connection using ${name}...`);
  
  try {
    // Get a client from the pool
    const client = await pool.connect();
    
    try {
      // Test a simple query
      const result = await client.query('SELECT NOW() as current_time');
      console.log(`✅ ${name} connection successful!`);
      console.log('Current database time:', result.rows[0].current_time);
      
      // Get PostgreSQL version information
      const versionResult = await client.query('SELECT version()');
      console.log('Database version:', versionResult.rows[0].version);
      
      // List the tables in the database
      console.log('\nListing database tables:');
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      if (tablesResult.rows.length === 0) {
        console.log('No tables found in the database.');
      } else {
        tablesResult.rows.forEach((row, i) => {
          console.log(`${i + 1}. ${row.table_name}`);
        });
      }
      
      return true;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (err) {
    console.error(`❌ ${name} connection failed:`, err.message);
    return false;
  }
}

async function testConnection() {
  try {
    // Try using connection string method
    const connectionStringSuccess = await testConnectionWithPool(pool, "Connection String");
    
    // If that fails, try direct parameters method
    if (!connectionStringSuccess) {
      await testConnectionWithPool(directPool, "Direct Parameters");
    }
  } catch (err) {
    console.error('Error during testing:', err);
  } finally {
    // Close both pools
    await pool.end();
    await directPool.end();
  }
}

// Run the test
testConnection(); 