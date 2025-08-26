#!/usr/bin/env node

/**
 * SideBuilds Complete Startup Script
 * Starts both backend and frontend servers
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting SideBuilds Development Environment...\n');

// Kill any existing processes on our ports
console.log('🧹 Cleaning up existing processes...');
const killPorts = spawn('node', ['kill-ports.js'], { 
    stdio: 'inherit',
    shell: true 
});

killPorts.on('close', (code) => {
    console.log('✅ Port cleanup completed\n');
    
    // Start backend server
    console.log('🔧 Starting backend server on port 5001...');
    const backend = spawn('npm', ['start'], {
        cwd: path.join(__dirname, 'server'),
        stdio: 'inherit',
        shell: true
    });
    
    // Wait a bit for backend to start, then start frontend
    setTimeout(() => {
        console.log('🎨 Starting frontend client on port 3001...');
        const frontend = spawn('npm', ['start'], {
            cwd: path.join(__dirname, 'client'),
            stdio: 'inherit',
            shell: true
        });
        
        frontend.on('error', (error) => {
            console.error('❌ Frontend error:', error);
        });
        
    }, 5000);
    
    backend.on('error', (error) => {
        console.error('❌ Backend error:', error);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down servers...');
        backend.kill('SIGINT');
        if (frontend) frontend.kill('SIGINT');
        process.exit(0);
    });
});

killPorts.on('error', (error) => {
    console.error('❌ Port cleanup error:', error);
    process.exit(1);
});