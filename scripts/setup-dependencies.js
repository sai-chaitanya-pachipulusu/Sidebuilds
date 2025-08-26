// Script to install required dependencies for database scripts
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if package.json exists in scripts directory
const packageJsonPath = path.join(__dirname, 'package.json');

if (!fs.existsSync(packageJsonPath)) {
  console.log('Creating package.json in scripts directory...');
  
  const packageJson = {
    "name": "sidebuilds-scripts",
    "version": "1.0.0",
    "description": "Scripts for SideBuilds.space project",
    "main": "index.js",
    "scripts": {
      "seed": "node seed-supabase-data.js",
      "test-connection": "node test-supabase-connection.js",
      "deploy": "node deploy-to-supabase.js"
    },
    "dependencies": {
      "pg": "^8.11.3",
      "bcryptjs": "^2.4.3",
      "dotenv": "^16.3.1",
      "uuid": "^9.0.1"
    }
  };
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('package.json created successfully');
}

// Install dependencies
console.log('Installing required dependencies...');
try {
  execSync('npm install', { stdio: 'inherit', cwd: __dirname });
  console.log('Dependencies installed successfully');
} catch (error) {
  console.error('Error installing dependencies:', error.message);
  process.exit(1);
}

console.log('\nSetup complete! You can now run the following commands:');
console.log('- Test database connection: npm run test-connection');
console.log('- Seed database: npm run seed');
console.log('- Deploy database schema: npm run deploy'); 