#!/usr/bin/env node

/**
 * Kill processes running on specific ports
 */

const { exec } = require('child_process');
const os = require('os');

const ports = [3001, 3002, 5001, 5002, 5004];

console.log('🧹 Killing processes on ports:', ports.join(', '));

function killPort(port) {
    return new Promise((resolve) => {
        if (os.platform() === 'win32') {
            // Windows
            exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
                if (error) {
                    console.log(`Port ${port}: No process found`);
                    resolve();
                    return;
                }
                
                const lines = stdout.split('\n');
                lines.forEach(line => {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
                        const pid = parts[4];
                        exec(`taskkill /PID ${pid} /F`, (killError) => {
                            if (killError) {
                                console.log(`Port ${port}: Could not kill process ${pid}`);
                            } else {
                                console.log(`Port ${port}: Killed process ${pid}`);
                            }
                        });
                    }
                });
                resolve();
            });
        } else {
            // Unix/Linux/Mac
            exec(`lsof -ti:${port}`, (error, stdout) => {
                if (error) {
                    console.log(`Port ${port}: No process found`);
                    resolve();
                    return;
                }
                
                const pids = stdout.trim().split('\n');
                pids.forEach(pid => {
                    if (pid) {
                        exec(`kill -9 ${pid}`, (killError) => {
                            if (killError) {
                                console.log(`Port ${port}: Could not kill process ${pid}`);
                            } else {
                                console.log(`Port ${port}: Killed process ${pid}`);
                            }
                        });
                    }
                });
                resolve();
            });
        }
    });
}

async function killAllPorts() {
    for (const port of ports) {
        await killPort(port);
        // Wait a bit between kills
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log('✅ Port cleanup completed');
}

if (require.main === module) {
    killAllPorts();
}

module.exports = { killPort, killAllPorts };