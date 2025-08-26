// Script to check table schema
const { Pool } = require('pg');
require('dotenv').config();

// Use the Supabase connection string
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Qwerty@123@db.rwrlotiafxzunqaypvlo.supabase.co:5432/postgres";

// Create a connection pool
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Supabase connections
  }
});

async function checkTableSchema() {
  try {
    // Get list of tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Available tables:');
    tablesResult.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.table_name}`);
    });
    
    // Check projects table columns
    const projectsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects'
      ORDER BY ordinal_position
    `);
    
    console.log('\nColumns in projects table:');
    projectsResult.rows.forEach((row) => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    
    // Check project_purchase_requests table columns
    const purchaseRequestsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'project_purchase_requests'
      ORDER BY ordinal_position
    `);
    
    console.log('\nColumns in project_purchase_requests table:');
    purchaseRequestsResult.rows.forEach((row) => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await pool.end();
  }
}

checkTableSchema(); 