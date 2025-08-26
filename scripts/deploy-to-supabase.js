// Script to deploy database schema to Supabase
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Use the provided connection string or a default one
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Qwerty@123@db.rwrlotiafxzunqaypvlo.supabase.co:5432/postgres";

// Check for connection string
if (!connectionString) {
  console.error('ERROR: No database connection string available');
  process.exit(1);
}

console.log('Using database connection:', connectionString.replace(/(postgresql:\/\/postgres:)([^@]+)(@.*)/, '$1*****$3'));

const SCHEMA_FILES_DIR = path.join(__dirname, '../database');

// Process schema files in order
async function deploySchema() {
  // Create a new pool using the connection string
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false // Needed for cloud database providers
    },
    max: 8 // Supabase free tier has a limit of 10 connections
  });

  try {
    console.log('Looking for schema files in:', SCHEMA_FILES_DIR);
    
    // Get all SQL files in the database directory and sort them
    const schemaFiles = fs.readdirSync(SCHEMA_FILES_DIR)
      .filter(file => file.endsWith('.sql') && !file.includes('seed'))
      .sort();
    
    if (schemaFiles.length === 0) {
      console.error('No schema SQL files found in the database directory');
      process.exit(1);
    }

    console.log(`Found ${schemaFiles.length} schema files to process:`);
    schemaFiles.forEach(file => console.log(`- ${file}`));

    console.log('\nConnecting to database...');
    
    // Get a client from the pool
    const client = await pool.connect();
    
    try {
      console.log('Connected! Deploying schema...');
      
      // Process each schema file in order
      for (const file of schemaFiles) {
        const filePath = path.join(SCHEMA_FILES_DIR, file);
        const schemaSql = fs.readFileSync(filePath, 'utf8');
        
        console.log(`\nProcessing ${file}...`);
        
        // Begin transaction for this file
        await client.query('BEGIN');
        
        try {
          // Execute the SQL commands in the schema file
          await client.query(schemaSql);
          
          // Commit transaction
          await client.query('COMMIT');
          console.log(`✅ Successfully deployed ${file}`);
        } catch (error) {
          // Rollback transaction on error
          await client.query('ROLLBACK');
          console.error(`❌ Error deploying ${file}:`, error.message);
          console.error('Rolling back changes for this file');
          
          // Ask to continue or abort
          const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
          });
          
          const answer = await new Promise(resolve => {
            readline.question('Continue with the next file? (y/n): ', resolve);
          });
          
          readline.close();
          
          if (answer.toLowerCase() !== 'y') {
            console.log('Aborting deployment');
            process.exit(1);
          }
        }
      }
      
      console.log('\n✅ Schema deployment completed!');
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('Error reading schema files or connecting to database:', error);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the deployment
deploySchema(); 