#!/usr/bin/env node

/**
 * Complete SideBuilds Setup and Test Script
 * 1. Fixes database issues
 * 2. Updates passwords
 * 3. Tests API functionality
 * 4. Provides startup instructions
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 SideBuilds Complete Setup & Test\n');

async function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        console.log(`🔄 Running: ${command} ${args.join(' ')}`);
        
        const process = spawn(command, args, {
            stdio: 'inherit',
            shell: true,
            ...options
        });
        
        process.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}`));
            }
        });
        
        process.on('error', reject);
    });
}

async function checkFileExists(filePath) {
    try {
        await fs.promises.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function setupDatabase() {
    console.log('📊 Setting up database...');
    
    try {
        // Run database migration
        await runCommand('node', ['database/run-unified-migration.js']);
        console.log('✅ Database migration completed');
        
        // Fix passwords
        await runCommand('node', ['fix-passwords.js']);
        console.log('✅ Test passwords updated');
        
        return true;
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        return false;
    }
}

async function testAPIs() {
    console.log('\n🧪 Testing API functionality...');
    
    try {
        // Check if backend is running by testing the health endpoint
        const axios = require('axios');
        
        try {
            await axios.get('http://localhost:5001/api/public/health', { timeout: 5000 });
            console.log('✅ Backend server is running');
        } catch {
            console.log('⚠️  Backend server not running - APIs cannot be tested');
            return false;
        }
        
        // Run API tests
        await runCommand('node', ['test-api-functionality.js']);
        return true;
    } catch (error) {
        console.error('❌ API tests failed:', error.message);
        return false;
    }
}

async function displayInstructions() {
    console.log('\n📋 SETUP COMPLETE - NEXT STEPS:');
    console.log('================================');
    
    console.log('\n1️⃣  START BACKEND SERVER:');
    console.log('   cd server && npm start');
    console.log('   (Should run on http://localhost:5001)');
    
    console.log('\n2️⃣  START FRONTEND CLIENT:');
    console.log('   cd client && npm start');
    console.log('   (Should run on http://localhost:3001)');
    
    console.log('\n3️⃣  LOGIN WITH TEST CREDENTIALS:');
    console.log('   Email: john@sidebuilds.com');
    console.log('   Password: password123');
    
    console.log('\n4️⃣  WHAT YOU SHOULD SEE:');
    console.log('   ✅ 8 projects in marketplace');
    console.log('   ✅ Profile settings that save properly');
    console.log('   ✅ Project creation that works');
    console.log('   ✅ Real-time features and messaging');
    
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('   • Backend not starting: Check port 5001 is free');
    console.log('   • Frontend not starting: Check port 3001 is free');
    console.log('   • No projects visible: Run "node test-credentials.js"');
    console.log('   • Profile not saving: Check backend logs for errors');
    
    console.log('\n📞 QUICK TESTS:');
    console.log('   • Health check: http://localhost:5001/api/public/health');
    console.log('   • Marketplace: http://localhost:5001/api/public/marketplace');
    console.log('   • Database check: node test-credentials.js');
    console.log('   • API test: node test-api-functionality.js');
}

async function main() {
    try {
        // Step 1: Setup database
        console.log('🔧 Step 1: Database Setup');
        const dbSuccess = await setupDatabase();
        
        if (!dbSuccess) {
            console.log('❌ Database setup failed. Please check the errors above.');
            return;
        }
        
        // Step 2: Test APIs (if backend is running)
        console.log('\n🔧 Step 2: API Testing');
        await testAPIs(); // Don't fail if this doesn't work
        
        // Step 3: Display instructions
        await displayInstructions();
        
        console.log('\n🎉 Setup completed successfully!');
        console.log('💡 Start the servers and visit http://localhost:3001');
        
    } catch (error) {
        console.error('\n💥 Setup failed:', error.message);
        console.log('\n🔧 Manual steps:');
        console.log('1. cd database && node run-unified-migration.js');
        console.log('2. node fix-passwords.js');
        console.log('3. cd server && npm start');
        console.log('4. cd client && npm start');
    }
}

// Check if required files exist
async function checkRequiredFiles() {
    const requiredFiles = [
        'database/run-unified-migration.js',
        'fix-passwords.js',
        'test-credentials.js',
        'server/package.json',
        'client/package.json'
    ];
    
    for (const file of requiredFiles) {
        if (!(await checkFileExists(file))) {
            console.error(`❌ Required file missing: ${file}`);
            return false;
        }
    }
    
    return true;
}

// Run setup
checkRequiredFiles().then(filesOk => {
    if (filesOk) {
        main();
    } else {
        console.error('❌ Missing required files. Please ensure you\'re in the correct directory.');
    }
}).catch(console.error);