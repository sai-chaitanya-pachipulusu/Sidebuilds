# PowerShell script to run all migration files in order
# Usage: .\run-migrations.ps1 "your_connection_string" [-CleanInstall]

param(
    [Parameter(Mandatory=$true)]
    [string]$ConnectionString,
    [switch]$CleanInstall
)

Write-Host "Running database migrations..."
Write-Host "Connection string: $ConnectionString"
if ($CleanInstall) {
    Write-Host "CleanInstall flag detected. Dropping all tables first." -ForegroundColor Yellow
}

# Get the current directory where the script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Function to run a SQL file
function Invoke-SqlFile {
    param(
        [string]$FilePath,
        [string]$ConnectionString
    )
    
    Write-Host "Running $FilePath..."
    
    try {
        # Using -f flag to specify the file
        cockroach sql --url="$ConnectionString" -f $FilePath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully executed $FilePath" -ForegroundColor Green
        } else {
            Write-Host "Error executing $FilePath. Exit code: $LASTEXITCODE" -ForegroundColor Red
            # Optionally, exit script on error if needed for critical migrations
            # exit 1
        }
    } catch {
        $errorMessage = $_.Exception.Message
        Write-Host "Exception while executing $FilePath`: $errorMessage" -ForegroundColor Red
    }
}

# If CleanInstall is specified, run the drop script first
if ($CleanInstall) {
    $DropScriptPath = "$ScriptDir\00_drop_all_tables.sql"
    if (Test-Path $DropScriptPath) {
        Invoke-SqlFile -FilePath $DropScriptPath -ConnectionString $ConnectionString
    } else {
        Write-Host "WARNING: 00_drop_all_tables.sql not found. Skipping drop step." -ForegroundColor Yellow
    }
}

# Run all migration files in order with full paths
Write-Host "Executing 01_base_schema.sql..."
Invoke-SqlFile -FilePath "$ScriptDir\01_base_schema.sql" -ConnectionString $ConnectionString

Write-Host "Executing 02_payment_integration.sql..."
Invoke-SqlFile -FilePath "$ScriptDir\02_payment_integration.sql" -ConnectionString $ConnectionString

Write-Host "Executing 03_stripe_connect.sql..."
Invoke-SqlFile -FilePath "$ScriptDir\03_stripe_connect.sql" -ConnectionString $ConnectionString

Write-Host "Executing 05_asset_transfer_completion.sql..."
Invoke-SqlFile -FilePath "$ScriptDir\05_asset_transfer_completion.sql" -ConnectionString $ConnectionString

Write-Host "Executing 06_payment_feature_completion.sql..."
Invoke-SqlFile -FilePath "$ScriptDir\06_payment_feature_completion.sql" -ConnectionString $ConnectionString

Write-Host "Executing 07_add_purchase_requests.sql..."
Invoke-SqlFile -FilePath "$ScriptDir\07_add_purchase_requests.sql" -ConnectionString $ConnectionString

Write-Host "Executing 08_add_user_profile_fields.sql..."
Invoke-SqlFile -FilePath "$ScriptDir\08_add_user_profile_fields.sql" -ConnectionString $ConnectionString

Write-Host "Do you want to run the OLD SQL seed data file (04_seed_data.sql)?"
Write-Host "(This is generally NOT recommended if you plan to use the new scripts/seedProjects.js node script for seeding.)"
Write-Host "Enter 'Y' to run 04_seed_data.sql, or any other key to skip." -ForegroundColor Yellow
$runOldSeed = Read-Host
if ($runOldSeed -eq "Y" -or $runOldSeed -eq "y") {
    Write-Host "Executing 04_seed_data.sql..."
    Invoke-SqlFile -FilePath "$ScriptDir\04_seed_data.sql" -ConnectionString $ConnectionString
} else {
    Write-Host "Skipping 04_seed_data.sql."
}

Write-Host "Database migration completed." -ForegroundColor Green 