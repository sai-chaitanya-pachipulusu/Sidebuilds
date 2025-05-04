@echo off
echo Starting SideProject Tracker...

REM Start the server in a new terminal window
start cmd /k "cd server && node run-server.js"

REM Wait a moment for the server to start
timeout /t 3

REM Start the client on port 3001
start cmd /k "cd client && set PORT=3001 && npm start"

echo Both server and client should be starting now.
echo - Server runs on http://localhost:5001
echo - Client runs on http://localhost:3001 