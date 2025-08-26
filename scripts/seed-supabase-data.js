// Seed script for Supabase to create test users and projects
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Use the Supabase connection string
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Qwerty@123@db.rwrlotiafxzunqaypvlo.supabase.co:5432/postgres";

// Create a connection pool
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Supabase connections
  },
  max: 8 // Supabase free tier has a limit of 10 connections
});

// Import existing example projects
const { exampleProjects } = require('./seed-example-projects');

// Create test user if doesn't exist
async function createTestUser() {
  const email = 'abc@gmail.com';
  const username = 'testuser';
  const password = 'password123';
  
  try {
    // Check if user already exists
    const existingUser = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      console.log('Test user already exists');
      return existingUser.rows[0].user_id;
    }
    
    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, created_at, updated_at) 
       VALUES ($1, $2, $3, NOW(), NOW()) 
       RETURNING user_id`,
      [username, email, hashedPassword]
    );
    
    console.log('Created test user:', email);
    return result.rows[0].user_id;
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
}

// Create additional test users for buying/selling testing
async function createAdditionalTestUsers() {
  const additionalUsers = [
    { email: 'buyer1@test.com', username: 'buyer1', password: 'password123' },
    { email: 'buyer2@test.com', username: 'buyer2', password: 'password123' },
    { email: 'seller1@test.com', username: 'seller1', password: 'password123' },
    { email: 'seller2@test.com', username: 'seller2', password: 'password123' },
  ];

  const createdUsers = [];

  for (const userData of additionalUsers) {
    try {
      // Check if user already exists
      const existingUser = await pool.query('SELECT user_id FROM users WHERE email = $1', [userData.email]);
      
      if (existingUser.rows.length > 0) {
        console.log(`User ${userData.email} already exists`);
        createdUsers.push(existingUser.rows[0].user_id);
        continue;
      }
      
      // Create new user
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const result = await pool.query(
        `INSERT INTO users (username, email, password_hash, created_at, updated_at) 
         VALUES ($1, $2, $3, NOW(), NOW()) 
         RETURNING user_id`,
        [userData.username, userData.email, hashedPassword]
      );
      
      console.log(`Created user: ${userData.email}`);
      createdUsers.push(result.rows[0].user_id);
    } catch (error) {
      console.error(`Error creating user ${userData.email}:`, error.message);
    }
  }

  return createdUsers;
}

// Seed example projects
async function seedExampleProjects() {
  try {
    console.log('Starting to seed example projects in Supabase...');
    
    // Create test user first
    const userId = await createTestUser();
    
    // Create additional test users
    const additionalUserIds = await createAdditionalTestUsers();
    
    // All user IDs for distributing projects
    const allUserIds = [userId, ...additionalUserIds];
    
    // Clear existing example projects for all test users
    await pool.query('DELETE FROM project_purchase_requests WHERE project_id IN (SELECT project_id FROM projects WHERE owner_id = ANY($1))', [allUserIds]);
    await pool.query('DELETE FROM project_transfers WHERE project_id IN (SELECT project_id FROM projects WHERE owner_id = ANY($1))', [allUserIds]);
    await pool.query('DELETE FROM project_transactions WHERE project_id IN (SELECT project_id FROM projects WHERE owner_id = ANY($1))', [allUserIds]);
    await pool.query('DELETE FROM projects WHERE owner_id = ANY($1)', [allUserIds]);
    console.log('Cleared existing data for test users');
    
    // Insert example projects, distributing them among different users
    const createdProjects = [];
    for (let i = 0; i < exampleProjects.length; i++) {
      const project = exampleProjects[i];
      const ownerIndex = i % allUserIds.length; // Distribute projects among users
      const ownerId = allUserIds[ownerIndex];
      const ownerUsername = ownerIndex === 0 ? 'testuser' : `${ownerIndex === 1 ? 'buyer1' : ownerIndex === 2 ? 'buyer2' : ownerIndex === 3 ? 'seller1' : 'seller2'}`;
      
      try {
        // Prepare tech_stack as JSONB
        const techStack = project.tech_stack || (project.technologies ? project.technologies.split(',').map(t => t.trim()) : []);
        
        // Create features list as array
        const featureList = Array.isArray(project.feature_list) ? project.feature_list : [];
        
        const result = await pool.query(
          `INSERT INTO projects 
           (name, description, stage, domain, github_url, is_public, is_for_sale, 
            sale_price, owner_id, owner_username, created_at, updated_at,
            tech_stack, feature_list, monthly_revenue, monthly_profit, monthly_users, technologies) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), $11, $12, $13, $14, $15, $16) 
           RETURNING project_id, name, owner_id`,
          [
            project.name,
            project.description,
            project.stage,
            project.domain,
            project.github_url,
            project.is_public,
            project.is_for_sale,
            project.sale_price,
            ownerId,
            ownerUsername,
            JSON.stringify(techStack),
            JSON.stringify(featureList),
            project.monthly_revenue || 0,
            project.monthly_profit || 0,
            project.monthly_users || 0,
            project.technologies || ''
          ]
        );
        
        createdProjects.push({
          project_id: result.rows[0].project_id,
          name: result.rows[0].name,
          owner_id: result.rows[0].owner_id,
          sale_price: project.sale_price
        });
        
        console.log(`✓ Created project: ${project.name} (ID: ${result.rows[0].project_id}) - Owner: ${ownerUsername}`);
      } catch (error) {
        console.error(`✗ Failed to create project ${project.name}:`, error.message);
      }
    }
    
    // Create demo purchase requests
    await createDemoPurchaseRequests(allUserIds, createdProjects);
    
    // Create a project transfer (simulation of completed purchase)
    await createDemoProjectTransfer(allUserIds, createdProjects);
    
    console.log('\n🎉 Successfully seeded example projects in Supabase!');
    console.log('\n📋 Test Account Details:');
    console.log('Main Account: abc@gmail.com / password123');
    console.log('Buyer 1: buyer1@test.com / password123');
    console.log('Buyer 2: buyer2@test.com / password123');
    console.log('Seller 1: seller1@test.com / password123');
    console.log('Seller 2: seller2@test.com / password123');
    
    console.log('\n🚀 Testing Workflows:');
    console.log('1. Stripe Connect Onboarding (Seller Flow):');
    console.log('   - Login as seller1@test.com');
    console.log('   - Go to Dashboard > Settings > Stripe Connect');
    console.log('   - Complete Stripe Connect onboarding');
    
    console.log('\n2. Project Purchase Workflow:');
    console.log('   - Login as buyer1@test.com');
    console.log('   - Browse Marketplace');
    console.log('   - Request to purchase a project');
    console.log('   - Switch to seller account (seller1@test.com)');
    console.log('   - Accept purchase request');
    console.log('   - Switch back to buyer1@test.com');
    console.log('   - Proceed with payment');
    
    console.log('\n3. Asset Transfer Workflow:');
    console.log('   - After purchase, check transfer status');
    console.log('   - As seller, update code/domain/assets transfer status');
    console.log('   - As buyer, confirm receipt of assets');
    
  } catch (error) {
    console.error('Error seeding projects:', error);
  } finally {
    await pool.end();
  }
}

// Create demo purchase requests for testing
async function createDemoPurchaseRequests(userIds, projects) {
  console.log('\nCreating demo purchase requests...');
  
  const [mainUserId, buyer1Id, buyer2Id, seller1Id, seller2Id] = userIds;
  
  // Demo purchase requests
  const demoRequests = [
    {
      project: projects.find(p => p.owner_id === seller1Id),
      buyer_id: buyer1Id,
      status: 'pending',
      message: "I'm interested in this project and would like to discuss the purchase details."
    },
    {
      project: projects.find(p => p.owner_id === mainUserId && p.is_for_sale),
      buyer_id: buyer2Id,
      status: 'approved',
      message: "This looks like a great fit for my portfolio. I'd like to proceed with the purchase."
    }
  ];
  
  for (const request of demoRequests) {
    if (request.project) {
      try {
        // Get usernames for buyer and seller
        const buyerResult = await pool.query('SELECT username FROM users WHERE user_id = $1', [request.buyer_id]);
        const sellerResult = await pool.query('SELECT username FROM users WHERE user_id = $1', [request.project.owner_id]);
        
        const buyerUsername = buyerResult.rows[0]?.username || 'unknown';
        const sellerUsername = sellerResult.rows[0]?.username || 'unknown';
        
        await pool.query(
          `INSERT INTO project_purchase_requests 
           (project_id, buyer_id, seller_id, status, buyer_message, created_at, updated_at, sale_price,
            buyer_username, seller_username)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6, $7, $8)`,
          [
            request.project.project_id,
            request.buyer_id,
            request.project.owner_id,
            request.status,
            request.message,
            request.project.sale_price,
            buyerUsername,
            sellerUsername
          ]
        );
        console.log(`✓ Created purchase request: ${buyerUsername} wants to buy ${request.project.name}`);
      } catch (error) {
        console.error(`✗ Failed to create purchase request:`, error.message);
      }
    }
  }
}

// Create a demo project transfer to simulate a completed purchase
async function createDemoProjectTransfer(userIds, projects) {
  console.log('\nCreating a demo project transfer...');
  
  const [mainUserId, buyer1Id, buyer2Id, seller1Id, seller2Id] = userIds;
  
  // Find a project owned by seller2 to simulate a completed transfer to buyer1
  const projectForTransfer = projects.find(p => p.owner_id === seller2Id && p.is_for_sale);
  
  if (projectForTransfer) {
    try {
      // First create a transaction record
      const transactionResult = await pool.query(
        `INSERT INTO project_transactions
         (project_id, seller_id, buyer_id, amount, status, payment_method, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING transaction_id`,
        [
          projectForTransfer.project_id,
          seller2Id,
          buyer1Id,
          projectForTransfer.sale_price,
          'completed',
          'stripe'
        ]
      );
      
      const transactionId = transactionResult.rows[0].transaction_id;
      
      // Then create a transfer record
      await pool.query(
        `INSERT INTO project_transfers
         (project_id, seller_id, buyer_id, transaction_id, status, 
          code_transferred, domain_transferred, assets_transferred,
          transfer_started_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), NOW())`,
        [
          projectForTransfer.project_id,
          seller2Id,
          buyer1Id,
          transactionId,
          'in_progress',
          true,  // Code has been transferred
          false, // Domain not yet transferred
          false  // Assets not yet transferred
        ]
      );
      
      console.log(`✓ Created project transfer: ${projectForTransfer.name} from seller2 to buyer1 (in progress)`);
    } catch (error) {
      console.error(`✗ Failed to create project transfer:`, error.message);
    }
  } else {
    console.log('No suitable project found for demo transfer');
  }
}

// Run the seeding script
if (require.main === module) {
  seedExampleProjects();
}

module.exports = { seedExampleProjects }; 