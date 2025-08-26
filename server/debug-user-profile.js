const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Database connection
const pool = new Pool({
  connectionString: 'postgresql://postgres:Qwerty@123@db.rwrlotiafxzunqaypvlo.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function debugUserProfile() {
  try {
    console.log('🔍 Debugging user profile issues...');
    
    // First, let's see what users exist
    const allUsers = await pool.query('SELECT user_id, username, email FROM users LIMIT 5');
    console.log('📊 Found users:', allUsers.rows.length);
    allUsers.rows.forEach(user => {
      console.log(`  - ID: ${user.user_id}, Username: ${user.username}, Email: ${user.email}`);
    });
    
    if (allUsers.rows.length > 0) {
      const testUserId = allUsers.rows[0].user_id;
      console.log(`\n🧪 Testing profile fetch for user: ${testUserId}`);
      
      // Test the exact query that the profile route uses
      const PROFILE_FIELDS = [
        'user_id', 'username', 'email', 'created_at', 'updated_at',
        'stripe_customer_id', 'stripe_account_id', 'onboarding_complete'
      ].join(', ');
      
      const profileResult = await pool.query(
        `SELECT ${PROFILE_FIELDS} FROM users WHERE user_id = $1`,
        [testUserId]
      );
      
      console.log('✅ Profile query successful!');
      console.log('📊 Profile fields:', Object.keys(profileResult.rows[0]));
      console.log('📄 Profile data:', profileResult.rows[0]);
      
      // Test creating a token for this user
      const tokenPayload = {
        user: {
          id: testUserId,
          username: allUsers.rows[0].username,
          email: allUsers.rows[0].email
        }
      };
      
      const token = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      
      console.log('\n🔑 Generated test token (first 50 chars):', token.substring(0, 50) + '...');
      
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      console.log('✅ Token verification successful');
      console.log('📄 Decoded payload:', decoded.user);
      
    } else {
      console.log('❌ No users found in database');
    }
    
  } catch (error) {
    console.error('❌ Error debugging user profile:', error.message);
    console.error('📄 Full error:', error);
  } finally {
    await pool.end();
  }
}

debugUserProfile();