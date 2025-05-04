/**
 * Server Runner with Auto-Restart
 * This script will automatically restart the server if it crashes
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const serverScript = path.resolve(__dirname, 'index.js');
const maxRestarts = 10; // Maximum number of restarts in a time period
const restartTimeWindow = 60000; // Time window in milliseconds (1 minute)
const restartDelay = 3000; // Delay before restarting in milliseconds (3 seconds)
let serverPort = process.env.PORT || 5001; // Default port with ability to override

// Tracking variables
let restartCount = 0;
let restartTimes = [];
let currentProcess = null;
let isPortInUse = false;

// Function to check if we're restarting too frequently
function isTooManyRestarts() {
    const now = Date.now();
    // Remove restart times older than the time window
    restartTimes = restartTimes.filter(time => now - time < restartTimeWindow);
    restartTimes.push(now);
    
    return restartTimes.length > maxRestarts;
}

// Function to start the server
function startServer() {
    console.log(`Starting server process...`);
    console.log(`Server script path: ${serverScript}`);
    console.log(`Using port: ${serverPort}`);
    
    // Environment variables for the server process
    const env = { 
        ...process.env,
        PORT: serverPort.toString() 
    };
    
    // Spawn the server process with pipe for stdout/stderr so we can monitor output
    currentProcess = spawn('node', [serverScript], {
        stdio: ['inherit', 'pipe', 'pipe'], // Pipe stdout and stderr for monitoring
        env
    });
    
    // Server process output
    console.log(`Server process started with PID ${currentProcess.pid}`);
    
    // Monitor stdout
    currentProcess.stdout.on('data', (data) => {
        const output = data.toString();
        process.stdout.write(output); // Forward to parent process
        
        // Check for port conflict in the output
        if (output.includes('EADDRINUSE') || output.includes('address already in use')) {
            isPortInUse = true;
            console.log(`Port ${serverPort} is already in use. Will try port ${serverPort + 1} on next restart.`);
            serverPort++; // Increment port for next restart
        }
    });
    
    // Monitor stderr
    currentProcess.stderr.on('data', (data) => {
        const output = data.toString();
        process.stderr.write(output); // Forward to parent process
        
        // Check for port conflict in the output
        if (output.includes('EADDRINUSE') || output.includes('address already in use')) {
            isPortInUse = true;
            console.log(`Port ${serverPort} is already in use. Will try port ${serverPort + 1} on next restart.`);
            serverPort++; // Increment port for next restart
        }
    });
    
    // Handle process exit
    currentProcess.on('exit', (code, signal) => {
        if (code !== 0) {
            console.error(`\nServer process exited with code ${code}. Signal: ${signal}`);
            
            // Check if we should restart
            if (isTooManyRestarts()) {
                console.error('Too many restarts in a short time period. Exiting.');
                process.exit(1);
            }
            
            // Reset port conflict flag if we're not restarting due to port conflict
            if (!isPortInUse) {
                serverPort = process.env.PORT || 5001; // Reset to default port
            }
            isPortInUse = false; // Reset flag
            
            console.log(`Restarting server in ${restartDelay / 1000} seconds...`);
            setTimeout(startServer, restartDelay);
        } else {
            console.log('Server process exited normally');
            process.exit(0);
        }
    });
    
    // Handle errors
    currentProcess.on('error', (err) => {
        console.error('Failed to start server process:', err);
    });
}

// Handle process signals to gracefully shutdown
process.on('SIGINT', () => {
    console.log('\nGracefully shutting down runner...');
    if (currentProcess) {
        console.log('Terminating server process...');
        currentProcess.kill('SIGINT');
    }
    process.exit(0);
});

// Start the server initially
console.log('Server runner starting...');
startServer(); 