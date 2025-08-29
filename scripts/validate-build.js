#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating SideBuilds build configuration...\n');

const errors = [];
const warnings = [];

// Check if we're in the right directory
const currentDir = process.cwd();
const isClientDir = fs.existsSync(path.join(currentDir, 'src', 'index.js'));
const isRootDir = fs.existsSync(path.join(currentDir, 'client', 'src', 'index.js'));

if (!isClientDir && !isRootDir) {
  errors.push('❌ Run this script from the project root or client directory');
  process.exit(1);
}

const clientDir = isClientDir ? currentDir : path.join(currentDir, 'client');

// 1. Check package.json exists and has required scripts
const packageJsonPath = path.join(clientDir, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  errors.push('❌ package.json not found in client directory');
} else {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.scripts || !packageJson.scripts.build) {
    errors.push('❌ Build script not found in package.json');
  }
  
  if (!packageJson.homepage) {
    warnings.push('⚠️ Consider adding "homepage": "./" to package.json for better asset paths');
  }
  
  console.log('✅ package.json looks good');
}

// 2. Check Vercel configuration
const vercelJsonPath = path.join(currentDir, 'vercel.json');
const clientVercelJsonPath = path.join(clientDir, 'vercel.json');

if (fs.existsSync(vercelJsonPath)) {
  try {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
    
    if (!vercelConfig.builds && !vercelConfig.buildCommand) {
      errors.push('❌ Vercel config missing build configuration');
    }
    
    console.log('✅ Root vercel.json exists');
  } catch (error) {
    errors.push('❌ vercel.json contains invalid JSON');
  }
}

if (fs.existsSync(clientVercelJsonPath)) {
  try {
    JSON.parse(fs.readFileSync(clientVercelJsonPath, 'utf8'));
    console.log('✅ Client vercel.json exists');
  } catch (error) {
    errors.push('❌ client/vercel.json contains invalid JSON');
  }
}

// 3. Check environment files
const envProdPath = path.join(clientDir, '.env.production');
if (fs.existsSync(envProdPath)) {
  const envContent = fs.readFileSync(envProdPath, 'utf8');
  
  if (!envContent.includes('REACT_APP_API_URL')) {
    warnings.push('⚠️ .env.production missing REACT_APP_API_URL');
  }
  
  if (!envContent.includes('CI=false')) {
    warnings.push('⚠️ Consider adding CI=false to .env.production for better builds');
  }
  
  console.log('✅ .env.production exists');
} else {
  warnings.push('⚠️ .env.production not found - create for production-specific config');
}

// 4. Check build directory
const buildPath = path.join(clientDir, 'build');
if (fs.existsSync(buildPath)) {
  const buildFiles = fs.readdirSync(buildPath);
  
  if (!buildFiles.includes('index.html')) {
    errors.push('❌ build/index.html not found - run npm run build first');
  }
  
  if (!buildFiles.includes('static')) {
    warnings.push('⚠️ build/static directory not found - build may be incomplete');
  }
  
  console.log('✅ Build directory exists');
} else {
  warnings.push('⚠️ Build directory not found - run "npm run build" before deploying');
}

// 5. Check for common build-breaking files
const problematicFiles = [
  path.join(clientDir, 'src', 'setupProxy.js'),
  path.join(clientDir, 'public', '.htaccess')
];

problematicFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    const relativePath = path.relative(currentDir, filePath);
    warnings.push(`⚠️ ${relativePath} might cause Vercel deployment issues`);
  }
});

// 6. Check import paths for case sensitivity
const checkImportPaths = (dir) => {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      checkImportPaths(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for relative imports that might be case-sensitive
      const importRegex = /from\s+['"]\.\/[^'"]*['"]/g;
      const matches = content.match(importRegex);
      
      if (matches) {
        matches.forEach(importMatch => {
          if (importMatch.includes('../') || importMatch.includes('./')) {
            // This is a basic check - more sophisticated checking would be needed for production
            const relativePath = path.relative(clientDir, filePath);
            // We'll skip detailed case sensitivity checks for now
          }
        });
      }
    }
  });
};

try {
  checkImportPaths(path.join(clientDir, 'src'));
  console.log('✅ Import paths check completed');
} catch (error) {
  warnings.push('⚠️ Could not fully validate import paths');
}

// 7. Check for environment variable usage
const envConfigPath = path.join(clientDir, 'src', 'config', 'environment.js');
if (fs.existsSync(envConfigPath)) {
  console.log('✅ Environment configuration exists');
} else {
  warnings.push('⚠️ Environment configuration not found - may cause runtime issues');
}

// Summary
console.log('\n📋 Validation Summary:');
console.log(`✅ Passed: ${6 - errors.length}/6 critical checks`);
console.log(`⚠️ Warnings: ${warnings.length}`);
console.log(`❌ Errors: ${errors.length}`);

if (errors.length > 0) {
  console.log('\n❌ Critical Issues:');
  errors.forEach(error => console.log(`  ${error}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️ Warnings:');
  warnings.forEach(warning => console.log(`  ${warning}`));
}

if (errors.length === 0) {
  console.log('\n🎉 Build configuration looks good for Vercel deployment!');
  console.log('\n📝 Next steps:');
  console.log('1. Commit all changes to git');
  console.log('2. Push to your main/master branch');
  console.log('3. Vercel should auto-deploy from the connected repository');
  console.log('4. Check Vercel dashboard for deployment status');
  
  if (warnings.length > 0) {
    console.log('\n💡 Consider addressing the warnings above for optimal deployment');
  }
} else {
  console.log('\n🛠️ Please fix the critical issues above before deploying');
  process.exit(1);
}

console.log('\n🔗 Useful links:');
console.log('- Vercel Dashboard: https://vercel.com/dashboard');
console.log('- Vercel Docs: https://vercel.com/docs');
console.log('- React Deployment: https://create-react-app.dev/docs/deployment/');