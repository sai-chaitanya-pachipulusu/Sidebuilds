@echo off
REM SideBuilds Development Environment Startup Script for Windows
REM Ensures consistent port usage: Backend 5001, Frontend 3001

echo.
echo 🚀 SideBuilds Development Environment Startup
echo ============================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not available
    echo Please ensure Node.js is properly installed
    pause
    exit /b 1
)

echo ✅ Node.js and npm are available
echo.

REM Run the Node.js startup script
echo 🚀 Starting development environment...
node dev-start.js

REM If we get here, the process was interrupted
echo.
echo 🛑 Development environment stopped
pause