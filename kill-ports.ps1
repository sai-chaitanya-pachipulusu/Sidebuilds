# SideBuilds Port Management PowerShell Script
Write-Host "🔪 SideBuilds Port Management System (PowerShell)" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# Target ports for SideBuilds
$PORTS = @{
    backend = 5001
    frontend = 3001
    cleanup = @(3000, 3002, 3003, 5000, 5002, 8080, 8000)
}

$allPorts = @($PORTS.backend, $PORTS.frontend) + $PORTS.cleanup

Write-Host "Target Configuration:"
Write-Host "  Backend (Server): Port $($PORTS.backend)"
Write-Host "  Frontend (Client): Port $($PORTS.frontend)`n"

function Kill-ProcessOnPort {
    param([int]$Port)
    
    Write-Host "🔍 Checking port $Port..." -ForegroundColor Yellow
    
    try {
        # Find processes using the port
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        
        if ($processes) {
            foreach ($pid in $processes) {
                if ($pid -and $pid -ne 0 -and $pid -ne $PID) {
                    try {
                        Stop-Process -Id $pid -Force -ErrorAction Stop
                        Write-Host "✅ Killed process $pid on port $Port" -ForegroundColor Green
                    }
                    catch {
                        Write-Host "⚠️  Could not kill PID $pid (may be system process or already terminated)" -ForegroundColor Yellow
                    }
                }
            }
        }
        else {
            Write-Host "✅ Port $Port is free" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "✅ Port $Port is free" -ForegroundColor Green
    }
}

function Kill-OrphanedNodeProcesses {
    Write-Host "`n🧹 Cleaning up orphaned Node.js processes..." -ForegroundColor Yellow
    
    try {
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        $killedCount = 0
        
        foreach ($process in $nodeProcesses) {
            if ($process.Id -ne $PID) {
                try {
                    Stop-Process -Id $process.Id -Force -ErrorAction Stop
                    $killedCount++
                }
                catch {
                    # Process might have already terminated
                }
            }
        }
        
        if ($killedCount -gt 0) {
            Write-Host "✅ Cleaned up $killedCount orphaned Node.js processes" -ForegroundColor Green
        }
        else {
            Write-Host "✅ No orphaned Node.js processes found" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "✅ No orphaned Node.js processes found" -ForegroundColor Green
    }
}

# Main execution
foreach ($port in $allPorts) {
    Kill-ProcessOnPort -Port $port
}

Kill-OrphanedNodeProcesses

Write-Host "`n🎉 Port cleanup complete!" -ForegroundColor Green
Write-Host "SideBuilds development ports are now available."
Write-Host "`nNext steps:"
Write-Host "  1. Backend will start on port $($PORTS.backend)"
Write-Host "  2. Frontend will start on port $($PORTS.frontend)"
Write-Host "  3. Run 'npm run dev' to start both servers"

Write-Host "`n✨ Ready for fresh server startup!" -ForegroundColor Green