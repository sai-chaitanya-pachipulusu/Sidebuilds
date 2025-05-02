// Script to deploy database schema to CockroachDB
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Load environment variables

// Check for required environment variables
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

async function deploySchema() {
  // Create a new pool using the connection string
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Needed for some cloud database providers
    }
  });

  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Connecting to database...');
    
    // Get a client from the pool
    const client = await pool.connect();
    
    try {
      console.log('Connected! Deploying schema...');
      
      // Begin transaction
      await client.query('BEGIN');
      
      // Execute the SQL commands in the schema file
      await client.query(schemaSql);
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log('Schema deployed successfully!');
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      console.error('Error deploying schema:', error);
      process.exit(1);
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('Error reading schema file or connecting to database:', error);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the function
deploySchema().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 