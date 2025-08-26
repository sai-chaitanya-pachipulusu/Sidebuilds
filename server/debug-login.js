const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'sidebuilds-complete.db');
const db = new sqlite3.Database(dbPath);

console.log('🧪 Testing login debug...');

const testLogin = async () => {
    const email = 'test@example.com';
    const password = 'password123';
    
    console.log(`Testing login for: ${email}`);
    
    // Get user from database
    db.get('SELECT user_id, username, email, password_hash FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            console.error('❌ Database error:', err);
            return;
        }
        
        if (!user) {
            console.log('❌ User not found');
            return;
        }
        
        console.log('✅ User found:', {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            password_hash: user.password_hash ? `${user.password_hash.substring(0, 20)}...` : 'null'
        });
        
        // Test password comparison
        try {
            const isMatch = await bcrypt.compare(password, user.password_hash);
            console.log(`Password comparison result: ${isMatch}`);
            
            if (isMatch) {
                console.log('✅ Login should succeed');
            } else {
                console.log('❌ Password does not match');
                
                // Test if we can create a new hash that works
                const newHash = await bcrypt.hash(password, 10);
                console.log('New hash for testing:', newHash);
                const testNewHash = await bcrypt.compare(password, newHash);
                console.log('New hash comparison:', testNewHash);
            }
        } catch (hashError) {
            console.error('❌ Password comparison error:', hashError);
        }
        
        db.close();
    });
};

testLogin().catch(console.error);