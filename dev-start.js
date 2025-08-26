#!/usr/bin/env node

/**
 * Development Start Script
 * Cleans ports first, then starts both frontend and backend servers
 * Ensures consistent port usage: Backend 5001, Frontend 3001
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 SideBuilds Development Environment Startup');
console.log('============================================');

/**
 * Execute command and return promise
 */
function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

/**
 * Run port cleanup script
 */
async function cleanupPorts() {
    console.log('\n🧹 Step 1: Cleaning up ports 5001 and 3001...');
    
    try {
        const cleanupScript = path.join(__dirname, 'cleanup-ports.js');
        
        if (!fs.existsSync(cleanupScript)) {
            throw new Error('Cleanup script not found. Please ensure cleanup-ports.js exists.');
        }
        
        return new Promise((resolve, reject) => {
            const cleanup = spawn('node', [cleanupScript], {
                stdio: 'inherit',
                shell: true
            });
            
            cleanup.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Port cleanup completed successfully');
                    resolve();
                } else {
                    console.log('⚠️  Port cleanup completed with warnings');
                    // Continue anyway - ports might already be free
                    resolve();
                }
            });
            
            cleanup.on('error', (error) => {
                console.error('❌ Port cleanup failed:', error.message);
                reject(error);
            });
        });
    } catch (error) {
        console.error('❌ Failed to run port cleanup:', error.message);
        throw error;
    }
}

/**
 * Check if package.json exists in directory
 */
function checkPackageJson(dir) {
    const packagePath = path.join(dir, 'package.json');
    return fs.existsSync(packagePath);
}

/**
 * Start backend server
 */
async function startBackend() {
    console.log('\n🔧 Step 2: Starting Backend Server (Port 5001)...');
    
    const serverDir = path.join(__dirname, 'server');
    
    if (!checkPackageJson(serverDir)) {
        throw new Error('Server package.json not found. Run "npm install" in server directory.');
    }
    
    return new Promise((resolve, reject) => {
        const backend = spawn('npm', ['run', 'dev'], {
            cwd: serverDir,
            stdio: 'pipe',
            shell: true
        });
        
        let startupComplete = false;
        let startupTimeout;
        
        // Set timeout for startup detection
        startupTimeout = setTimeout(() => {
            if (!startupComplete) {
                console.log('⏰ Backend startup timeout - continuing anyway');
                startupComplete = true;
                resolve(backend);
            }
        }, 15000); // 15 second timeout
        
        backend.stdout.on('data', (data) => {
            const output = data.toString();
            process.stdout.write(`[BACKEND] ${output}`);
            
            // Look for successful startup indicators
            if ((output.includes('Server running on port 5001') || 
                 output.includes('listening on port 5001') ||
                 output.includes('5001')) && !startupComplete) {
                startupComplete = true;
                clearTimeout(startupTimeout);
                console.log('✅ Backend server started successfully on port 5001');
                resolve(backend);
            }
        });
        
        backend.stderr.on('data', (data) => {
            const output = data.toString();
            process.stderr.write(`[BACKEND ERROR] ${output}`);
            
            // Check for fatal errors
            if (output.includes('EADDRINUSE') && output.includes('5001')) {
                console.error('❌ Port 5001 is still in use. Please run cleanup-ports.js manually.');
                if (!startupComplete) {
                    startupComplete = true;
                    clearTimeout(startupTimeout);
                    reject(new Error('Backend port 5001 is in use'));
                }
            }
        });
        
        backend.on('error', (error) => {
            if (!startupComplete) {
                startupComplete = true;
                clearTimeout(startupTimeout);
                console.error('❌ Failed to start backend:', error.message);
                reject(error);
            }
        });
        
        backend.on('close', (code) => {
            console.log(`🔴 Backend process exited with code ${code}`);
        });
        
        // Give it a moment to start up
        setTimeout(() => {
            if (!startupComplete) {
                console.log('⏳ Backend is starting up...');
            }
        }, 2000);
    });
}

/**
 * Start frontend server
 */
async function startFrontend() {
    console.log('\n⚛️  Step 3: Starting Frontend Server (Port 3001)...');
    
    const clientDir = path.join(__dirname, 'client');
    
    if (!checkPackageJson(clientDir)) {
        throw new Error('Client package.json not found. Run "npm install" in client directory.');
    }
    
    return new Promise((resolve, reject) => {
        const frontend = spawn('npm', ['start'], {
            cwd: clientDir,
            stdio: 'pipe',
            shell: true,
            env: { ...process.env, PORT: '3001', BROWSER: 'none' }
        });
        
        let startupComplete = false;
        let startupTimeout;
        
        // Set timeout for startup detection
        startupTimeout = setTimeout(() => {
            if (!startupComplete) {
                console.log('⏰ Frontend startup timeout - continuing anyway');
                startupComplete = true;
                resolve(frontend);
            }
        }, 30000); // 30 second timeout for webpack
        
        frontend.stdout.on('data', (data) => {
            const output = data.toString();
            process.stdout.write(`[FRONTEND] ${output}`);
            
            // Look for successful startup indicators
            if ((output.includes('webpack compiled') || 
                 output.includes('Local:') ||
                 output.includes('localhost:3001') ||
                 output.includes('compiled successfully')) && !startupComplete) {
                startupComplete = true;
                clearTimeout(startupTimeout);
                console.log('✅ Frontend server started successfully on port 3001');
                resolve(frontend);
            }
        });
        
        frontend.stderr.on('data', (data) => {
            const output = data.toString();
            process.stderr.write(`[FRONTEND ERROR] ${output}`);
            
            // Check for fatal errors
            if (output.includes('EADDRINUSE') && output.includes('3001')) {
                console.error('❌ Port 3001 is still in use. Please run cleanup-ports.js manually.');
                if (!startupComplete) {
                    startupComplete = true;
                    clearTimeout(startupTimeout);
                    reject(new Error('Frontend port 3001 is in use'));
                }
            }
        });
        
        frontend.on('error', (error) => {
            if (!startupComplete) {
                startupComplete = true;
                clearTimeout(startupTimeout);
                console.error('❌ Failed to start frontend:', error.message);
                reject(error);
            }
        });
        
        frontend.on('close', (code) => {
            console.log(`🔴 Frontend process exited with code ${code}`);
        });
        
        // Give it a moment to start up
        setTimeout(() => {
            if (!startupComplete) {
                console.log('⏳ Frontend is starting up (this can take 20-30 seconds)...');
            }
        }, 5000);
    });
}

/**
 * Display startup summary
 */
function displaySummary() {
    console.log('\n🎉 Development Environment Ready!');
    console.log('=================================');
    console.log('🔧 Backend API:  http://localhost:5001/api');
    console.log('⚛️  Frontend UI:  http://localhost:3001');
    console.log('');
    console.log('📝 Notes:');
    console.log('  • Backend and frontend will restart automatically on file changes');
    console.log('  • Press Ctrl+C to stop both servers');
    console.log('  • If ports conflict, run: node cleanup-ports.js');
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('  • Port issues: Run "node cleanup-ports.js" manually');
    console.log('  • Missing deps: Run "npm install" in server/ and client/ directories');
    console.log('  • Database issues: Check server/.env configuration');
    console.log('');
}

/**
 * Handle graceful shutdown
 */
let backendProcess = null;
let frontendProcess = null;

function gracefulShutdown() {
    console.log('\n🛑 Shutting down development environment...');
    
    if (backendProcess) {
        console.log('🔧 Stopping backend server...');
        backendProcess.kill('SIGTERM');
    }
    
    if (frontendProcess) {
        console.log('⚛️  Stopping frontend server...');
        frontendProcess.kill('SIGTERM');
    }
    
    setTimeout(() => {
        console.log('✅ Development environment stopped');
        process.exit(0);
    }, 2000);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

/**
 * Main startup sequence
 */
async function main() {
    try {
        // Step 1: Clean up ports
        await cleanupPorts();
        
        // Step 2: Start backend
        backendProcess = await startBackend();
        
        // Wait a moment for backend to fully initialize
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 3: Start frontend
        frontendProcess = await startFrontend();
        
        // Display success message
        displaySummary();
        
    } catch (error) {
        console.error('\n💥 Failed to start development environment:');
        console.error(error.message);
        console.log('\n🔧 Troubleshooting steps:');
        console.log('1. Run "node cleanup-ports.js" to free up ports');
        console.log('2. Check if Node.js dependencies are installed');
        console.log('3. Verify .env files are configured correctly');
        console.log('4. Try running servers manually to see detailed error messages');
        
        gracefulShutdown();
        process.exit(1);
    }
}

// Start the development environment
main();