/**
 * Generate Test Certificate Script
 * 
 * This script creates a test seller certificate in the database
 * Usage: node generate-test-certificate.js
 */

require('dotenv').config({ path: '../.env' });
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

async function generateTestCertificate() {
  try {
    console.log('Generating test seller certificate...');

    // Get a seller and buyer user for the test certificate
    const usersResult = await db.query('SELECT user_id, username FROM users LIMIT 2');
    
    if (usersResult.rows.length < 2) {
      console.error('Error: Need at least two users in the database');
      process.exit(1);
    }
    
    const seller = usersResult.rows[0];
    const buyer = usersResult.rows[1];
    
    // Get a project owned by the seller
    const projectResult = await db.query(
      'SELECT project_id, name FROM projects WHERE owner_id = $1 LIMIT 1',
      [seller.user_id]
    );
    
    if (projectResult.rows.length === 0) {
      console.error('Error: Seller has no projects');
      process.exit(1);
    }
    
    const project = projectResult.rows[0];
    
    // Generate a unique verification code
    const verificationCode = crypto.randomBytes(6).toString('hex');
    
    // Insert the test certificate
    const result = await db.query(
      `INSERT INTO seller_certificates (
        certificate_id, 
        project_id, 
        seller_id, 
        buyer_id, 
        verification_code, 
        sale_amount, 
        sale_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        uuidv4(),
        project.project_id,
        seller.user_id,
        buyer.user_id,
        verificationCode,
        99.99, // Test sale amount
        new Date() // Current date as sale date
      ]
    );
    
    const certificate = result.rows[0];
    
    console.log('Test certificate generated successfully:');
    console.log('----------------------------------');
    console.log(`Certificate ID: ${certificate.certificate_id}`);
    console.log(`Project: ${project.name}`);
    console.log(`Seller: ${seller.username}`);
    console.log(`Buyer: ${buyer.username}`);
    console.log(`Verification Code: ${certificate.verification_code}`);
    console.log(`Sale Amount: $${certificate.sale_amount}`);
    console.log(`Sale Date: ${certificate.sale_date}`);
    console.log('----------------------------------');
    console.log(`Verification URL: /verify/${certificate.verification_code}`);
    
  } catch (error) {
    console.error('Error generating test certificate:', error);
    process.exit(1);
  }
}

// Run the function
generateTestCertificate(); 