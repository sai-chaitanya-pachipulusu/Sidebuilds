// Script to load test data into the database
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Load environment variables

// Check for required environment variables
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

async function loadTestData() {
  // Create a new pool using the connection string
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Needed for some cloud database providers
    }
  });

  try {
    // Read the seed file
    const seedPath = path.join(__dirname, '../database/seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log('Connecting to database...');
    
    // Get a client from the pool
    const client = await pool.connect();
    
    try {
      console.log('Connected! Loading test data...');
      
      // Begin transaction
      await client.query('BEGIN');
      
      // Execute the SQL commands in the seed file
      await client.query(seedSql);
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log('Test data loaded successfully!');
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      console.error('Error loading test data:', error);
      process.exit(1);
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('Error reading seed file or connecting to database:', error);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the function
loadTestData().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 