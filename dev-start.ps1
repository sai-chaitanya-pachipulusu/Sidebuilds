# SideBuilds Development Environment Startup Script for PowerShell
# Ensures consistent port usage: Backend 5001, Frontend 3001

Write-Host ""
Write-Host "🚀 SideBuilds Development Environment Startup" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not available" -ForegroundColor Red
    Write-Host "Please ensure Node.js is properly installed" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "🚀 Starting development environment..." -ForegroundColor Cyan

# Run the Node.js startup script
try {
    node dev-start.js
} catch {
    Write-Host ""
    Write-Host "❌ Failed to start development environment" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "🛑 Development environment stopped" -ForegroundColor Yellow
Read-Host "Press Enter to exit"