# SideBuilds Port Management System

## Overview
This document describes the robust port management system implemented for the SideBuilds marketplace to ensure consistent and reliable server startup without port conflicts.

## Port Configuration

### Standard Ports
- **Backend (Server)**: Port `5001`
- **Frontend (Client)**: Port `3001`

### Additional Cleanup Ports
The system also cleans up these common development ports:
- `3000`, `3002`, `3003` (React development servers)
- `5000`, `5002` (Node.js servers)
- `8000`, `8080` (General web servers)

## Available Scripts

### 1. Port Cleanup
```bash
# Clean up all development ports
npm run kill-ports
# or
node kill-ports.js
```

### 2. Restart Servers
```bash
# Restart both servers with port cleanup
npm run restart
# or
node restart-servers.js
# or (Windows)
restart-servers.bat
```

### 3. Development Scripts
```bash
# Start development servers (clean)
npm run dev-clean

# Start production servers (clean)
npm run start-clean

# Regular development (no cleanup)
npm run dev
```

## Files and Components

### 1. `kill-ports.js`
Enhanced port cleanup script that:
- ✅ Properly handles Windows `taskkill` syntax
- ✅ Supports cross-platform operation (Windows, macOS, Linux)
- ✅ Cleans up orphaned Node.js processes
- ✅ Provides detailed logging and feedback
- ✅ Uses proper error handling for system processes

**Key Improvements:**
- Fixed Windows `taskkill` command syntax
- Added `windowsHide: true` option to prevent command windows
- Implemented proper PID deduplication
- Added orphaned process cleanup
- Cross-platform compatibility

### 2. `restart-servers.js`
Comprehensive server management script that:
- ✅ Runs port cleanup first
- ✅ Starts backend server on port 5001
- ✅ Starts frontend server on port 3001
- ✅ Monitors startup success/failure
- ✅ Provides graceful shutdown handling
- ✅ Includes startup timeouts and error recovery

**Features:**
- Sequential startup (backend first, then frontend)
- Process monitoring and health checks
- Automatic cleanup on termination
- Detailed logging and status updates
- Configurable timeouts and environment variables

### 3. `restart-servers.bat`
Windows batch file for easy execution:
- Provides Windows-friendly interface
- Runs cleanup and restart sequence
- Includes user-friendly messaging
- Handles Windows-specific command syntax

## Configuration Updates

### Backend (`server/index.js`)
```javascript
const PORT = process.env.PORT || 5001; // Default to 5001 for SideBuilds backend
```

### Frontend (`client/package.json`)
```json
{
  "scripts": {
    "start": "PORT=3001 react-scripts start",
    "start:windows": "set PORT=3001 && react-scripts start"
  },
  "proxy": "http://localhost:5001"
}
```

### Main Package (`package.json`)
```json
{
  "scripts": {
    "dev-clean": "node kill-ports.js && npm run dev",
    "restart": "node restart-servers.js",
    "kill-ports": "node kill-ports.js",
    "start-clean": "node kill-ports.js && npm start"
  }
}
```

## Infrastructure Benefits

### 1. Reliability
- **Zero Port Conflicts**: Automated cleanup prevents port binding errors
- **Process Isolation**: Proper termination of orphaned processes
- **Graceful Shutdown**: Clean process termination with signal handling

### 2. Development Experience
- **Consistent Ports**: Always starts on the same ports (5001/3001)
- **One-Command Restart**: Single command to clean and restart everything
- **Error Recovery**: Automatic cleanup if startup fails

### 3. Cross-Platform Support
- **Windows Compatibility**: Proper `taskkill` syntax and batch files
- **Unix/Linux Support**: Uses `lsof` and `kill` commands
- **macOS Support**: Full compatibility with macOS development

### 4. Monitoring & Observability
- **Detailed Logging**: Clear status messages for each operation
- **Process Monitoring**: Real-time feedback on server startup
- **Health Checks**: Startup success detection and timeout handling

## Usage Instructions

### Quick Start
1. **Clean Restart (Recommended)**:
   ```bash
   npm run restart
   ```

2. **Development Mode**:
   ```bash
   npm run dev-clean
   ```

3. **Port Cleanup Only**:
   ```bash
   npm run kill-ports
   ```

### Windows Users
Use the batch file for a Windows-friendly experience:
```cmd
restart-servers.bat
```

### Troubleshooting

#### Issue: Ports Still Blocked
```bash
# Run manual cleanup
node kill-ports.js

# Check for remaining processes
netstat -ano | findstr :5001
netstat -ano | findstr :3001
```

#### Issue: Server Won't Start
```bash
# Clean restart with full process cleanup
npm run kill-ports
# Wait a few seconds
npm run restart
```

#### Issue: Permission Errors
- Run command prompt as Administrator (Windows)
- Some system processes cannot be terminated (this is normal)

## Security Considerations

### Process Safety
- Only kills processes on specified development ports
- Excludes current process from cleanup
- Handles permission errors gracefully
- Uses proper Windows security flags

### Environment Isolation
- Development-specific port ranges
- No interference with system services
- Proper error handling for protected processes

## Performance Optimizations

### Startup Time
- Parallel port checking where possible
- Efficient process detection algorithms
- Minimal wait times between operations

### Resource Usage
- Low memory footprint for monitoring scripts
- Efficient process cleanup with batch operations
- Proper cleanup of monitoring resources

## Monitoring Integration

### Health Checks
- Server startup detection via log monitoring
- Timeout-based failure detection
- Automatic recovery procedures

### Logging
- Structured logging with timestamps
- Clear status indicators (✅, ⚠️, ❌)
- Detailed error reporting

### Alerting
- Console notifications for all operations
- Error highlighting for failed operations
- Success confirmation for completed tasks

## Future Enhancements

### Planned Improvements
1. **Docker Integration**: Container-based port management
2. **Service Discovery**: Automatic port allocation
3. **Load Balancer Integration**: Multiple instance management
4. **Metrics Collection**: Port usage analytics
5. **Auto-scaling Support**: Dynamic port allocation

### Infrastructure Roadmap
1. **Kubernetes Deployment**: Pod-based port management
2. **Service Mesh Integration**: Advanced traffic routing
3. **Monitoring Dashboard**: Real-time port status
4. **Automated Testing**: Port management test suite

## Best Practices

### Development Workflow
1. Always use `npm run restart` for fresh starts
2. Run `npm run kill-ports` if experiencing port issues
3. Check console output for startup confirmation
4. Use Ctrl+C to properly shutdown servers

### Production Considerations
- Use environment variables for port configuration
- Implement proper health checks
- Use process managers (PM2, systemd) for production
- Monitor port usage and availability

### Team Collaboration
- Document port assignments in team wiki
- Use consistent port numbers across environments
- Share restart commands in team documentation
- Include port management in onboarding process

---

## Summary

The SideBuilds port management system provides:
- ✅ **Reliable** server startup without port conflicts
- ✅ **Cross-platform** compatibility (Windows, macOS, Linux)
- ✅ **Developer-friendly** one-command operations
- ✅ **Robust** error handling and recovery
- ✅ **Consistent** port allocation (5001/3001)
- ✅ **Production-ready** infrastructure patterns

This system eliminates the common development pain point of port conflicts and provides a solid foundation for scaling the SideBuilds marketplace infrastructure.