# PowerShell script to run all migration files on Supabase
# Usage: .\run-migrations-supabase.ps1 "your_connection_string"

param(
    [Parameter(Mandatory=$true)]
    [string]$ConnectionString
)

Write-Host "Running database migrations on Supabase..." -ForegroundColor Cyan

# Get the current directory where the script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Try to find psql in common locations
$psqlPath = $null
$possiblePaths = @(
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files\PostgreSQL\14\bin\psql.exe",
    "C:\Program Files\PostgreSQL\13\bin\psql.exe",
    "psql"  # Try system PATH as fallback
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path -ErrorAction SilentlyContinue) {
        $psqlPath = $path
        Write-Host "Found psql at: $path" -ForegroundColor Green
        break
    } elseif (Get-Command $path -ErrorAction SilentlyContinue) {
        $psqlPath = $path
        Write-Host "Found psql in PATH" -ForegroundColor Green
        break
    }
}

if (-not $psqlPath) {
    Write-Host "ERROR: psql is not installed or not found." -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools to run migrations." -ForegroundColor Red
    Write-Host "Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    exit 1
}

# Function to run a SQL file
function Invoke-SqlFile {
    param(
        [string]$FilePath
    )
    
    $FileName = Split-Path $FilePath -Leaf
    Write-Host "`nExecuting $FileName..." -ForegroundColor Yellow
    
    try {
        # Using psql to execute the file with the connection string
        & $psqlPath "$ConnectionString" -f $FilePath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully executed $FileName" -ForegroundColor Green
        } else {
            Write-Host "Error executing $FileName. Exit code: $LASTEXITCODE" -ForegroundColor Red
            Write-Host "Continuing with other migrations..." -ForegroundColor Yellow
        }
    } catch {
        $errorMessage = $_.Exception.Message
        Write-Host "Exception while executing ${FileName}: $errorMessage" -ForegroundColor Red
    }
}

# Find all SQL migration files and sort them numerically
$migrations = Get-ChildItem -Path $ScriptDir -Filter "??_*.sql" | Sort-Object Name

# Run each migration
foreach ($migration in ($migrations | Select-Object -ExpandProperty FullName)) {
    $FilePath = Join-Path $ScriptDir $migration
    if (Test-Path $FilePath) {
        Invoke-SqlFile -FilePath $FilePath
    } else {
        Write-Host "Migration file not found: $migration" -ForegroundColor Red
    }
}

Write-Host "`nMigration process completed!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Check for any errors above" -ForegroundColor White
Write-Host "2. If needed, run seed data with: node scripts/seed-supabase.js" -ForegroundColor White
Write-Host "3. Start the application with: npm run dev" -ForegroundColor White 