# PowerShell script to run all migration files in order
# Usage: .\run-migrations.ps1 "your_connection_string"

param(
    [Parameter(Mandatory=$true)]
    [string]$ConnectionString
)

Write-Host "Running database migrations..."
Write-Host "Connection string: $ConnectionString"

# Get the current directory where the script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Function to run a SQL file
function Run-SqlFile {
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
        }
    } catch {
        $errorMessage = $_.Exception.Message
        Write-Host "Exception while executing $FilePath`: $errorMessage" -ForegroundColor Red
    }
}

# Run all migration files in order with full paths
Write-Host "Executing 01_base_schema.sql..."
Run-SqlFile -FilePath "$ScriptDir\01_base_schema.sql" -ConnectionString $ConnectionString

Write-Host "Executing 02_payment_integration.sql..."
Run-SqlFile -FilePath "$ScriptDir\02_payment_integration.sql" -ConnectionString $ConnectionString

Write-Host "Executing 03_stripe_connect.sql..."
Run-SqlFile -FilePath "$ScriptDir\03_stripe_connect.sql" -ConnectionString $ConnectionString

Write-Host "Do you want to run the seed data? (Y/N)"
$runSeed = Read-Host
if ($runSeed -eq "Y" -or $runSeed -eq "y") {
    Write-Host "Executing 04_seed_data.sql..."
    Run-SqlFile -FilePath "$ScriptDir\04_seed_data.sql" -ConnectionString $ConnectionString
} else {
    Write-Host "Skipping seed data."
}

Write-Host "Executing 05_asset_transfer_completion.sql..."
Run-SqlFile -FilePath "$ScriptDir\05_asset_transfer_completion.sql" -ConnectionString $ConnectionString

Write-Host "Executing 06_payment_feature_completion.sql..."
Run-SqlFile -FilePath "$ScriptDir\06_payment_feature_completion.sql" -ConnectionString $ConnectionString

Write-Host "Database migration completed." -ForegroundColor Green 