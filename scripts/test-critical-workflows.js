// Test script to verify critical workflows
const { execSync } = require('child_process');

console.log('🚀 Starting Critical Workflow Testing...\n');

const tests = [
  {
    name: 'Server Connection',
    test: () => {
      try {
        execSync('cd server && node -e "require(\'./db.js\').testConnection()"', { stdio: 'inherit' });
        return '✅ Database connection successful';
      } catch (error) {
        return '❌ Database connection failed';
      }
    }
  },
  {
    name: 'Client Build',
    test: () => {
      try {
        execSync('cd client && npm run build', { stdio: 'inherit' });
        return '✅ Client builds without errors';
      } catch (error) {
        return '❌ Client build failed';
      }
    }
  }
];

tests.forEach(({ name, test }) => {
  console.log(`Testing ${name}...`);
  console.log(test());
  console.log('');
});

console.log('🎯 Manual Testing Checklist:');
console.log('1. [ ] Register new account');
console.log('2. [ ] Login/logout flow');
console.log('3. [ ] Create project');
console.log('4. [ ] Browse marketplace');
console.log('5. [ ] Show interest in project');
console.log('6. [ ] Test payment flow');
console.log('7. [ ] Real-time messaging'); 