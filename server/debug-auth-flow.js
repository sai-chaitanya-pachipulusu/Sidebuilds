const jwt = require('jsonwebtoken');
require('dotenv').config();

// Test JWT creation and validation
function testJWTFlow() {
    console.log('=== JWT Flow Debug Test ===\n');
    
    // Simulate the token creation process from auth.js
    const testUser = {
        user_id: 1,
        username: 'testuser', 
        email: 'test@example.com'
    };
    
    const tokenPayload = {
        user: {
            id: testUser.user_id,
            username: testUser.username,
            email: testUser.email
        }
    };
    
    console.log('1. Creating JWT token with payload:', JSON.stringify(tokenPayload, null, 2));
    
    const token = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET || 'default-secret-for-testing',
        { expiresIn: '1h' }
    );
    
    console.log('2. Generated token:', token.substring(0, 50) + '...');
    
    // Test token validation (simulate middleware)
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-for-testing');
        console.log('3. Decoded token:', JSON.stringify(decoded, null, 2));
        
        // Check if we can access user.id (as middleware does)
        if (decoded.user && decoded.user.id) {
            console.log('4. ✅ Successfully accessed decoded.user.id:', decoded.user.id);
        } else {
            console.log('4. ❌ Failed to access decoded.user.id');
            console.log('   Decoded structure:', Object.keys(decoded));
        }
        
    } catch (err) {
        console.log('3. ❌ Token verification failed:');
        console.log('   Error name:', err.name);
        console.log('   Error message:', err.message);
    }
    
    // Test different authorization header formats
    console.log('\n5. Testing authorization header formats:');
    
    const bearerHeader = `Bearer ${token}`;
    console.log(`   Bearer format: ${bearerHeader.substring(0, 30)}...`);
    
    // Simulate header extraction from middleware
    if (bearerHeader.startsWith('Bearer ')) {
        const extractedToken = bearerHeader.substring(7);
        console.log(`   ✅ Extracted token: ${extractedToken.substring(0, 30)}...`);
        console.log(`   ✅ Token matches: ${extractedToken === token}`);
    }
}

// Test environment variables
function testEnvironment() {
    console.log('\n=== Environment Debug ===');
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
    
    if (!process.env.JWT_SECRET) {
        console.log('❌ WARNING: JWT_SECRET not found in environment variables!');
        console.log('   This could cause "Invalid token format" errors');
    }
}

// Test database column consistency
function testColumnNames() {
    console.log('\n=== Database Column Debug ===');
    console.log('Expected columns in users table:');
    console.log('- user_id (primary key)');
    console.log('- username, email, password_hash');
    console.log('- bio, location, phone_number');
    console.log('- portfolio_link, linkedin_profile_url, github_profile_url, twitter_profile_url');
    console.log('- stripe_account_id, onboarding_complete, payout_enabled, stripe_charges_enabled, stripe_details_submitted');
    console.log('- created_at, updated_at');
}

// Run all tests
testEnvironment();
testJWTFlow();
testColumnNames();

console.log('\n=== Debugging Complete ===');
console.log('If you see "Invalid token format" errors, check:');
console.log('1. JWT_SECRET environment variable is set correctly');
console.log('2. Token is being sent with "Authorization: Bearer <token>" header');
console.log('3. Token structure matches expected { user: { id, username, email } }');
console.log('4. Middleware is using the correct import path'); 