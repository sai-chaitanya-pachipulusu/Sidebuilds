# PowerShell script to run the migration commands one by one
$connectionString = "postgresql://sai:U3e2V4dqp6Y_n4nXmvboJw@pale-bug-10901.j77.aws-us-east-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full"
$cockroachPath = "..\cockroach\cockroach-v25.1.5.windows-6.2-amd64\cockroach.exe"

$commands = @(
    # Add new columns to the projects table
    "ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS contact_email VARCHAR(100)",
    "ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20)",
    "ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'direct'",
    "ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(100)",
    "ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(100)",

    # Add new columns to the project_transactions table
    "ALTER TABLE IF EXISTS project_transactions ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(100)",
    "ALTER TABLE IF EXISTS project_transactions ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10, 2) DEFAULT 0.00",
    "ALTER TABLE IF EXISTS project_transactions ADD COLUMN IF NOT EXISTS seller_amount DECIMAL(10, 2) DEFAULT 0.00",

    # Create additional indexes
    "CREATE INDEX IF NOT EXISTS idx_projects_payment_method ON projects(payment_method) WHERE is_for_sale = TRUE",
    "CREATE INDEX IF NOT EXISTS idx_transactions_stripe_session ON project_transactions(stripe_session_id)",

    # Update existing data
    "UPDATE projects p SET contact_email = u.email FROM users u WHERE p.owner_id = u.user_id AND p.is_for_sale = TRUE AND p.contact_email IS NULL",
    
    # Update commission calculations
    "UPDATE project_transactions SET commission_amount = amount * 0.05, seller_amount = amount * 0.95 WHERE commission_amount = 0 AND amount > 0",
    
    # Create marketplace view
    "CREATE OR REPLACE VIEW marketplace_projects AS
    SELECT 
        p.project_id, 
        p.name, 
        p.description, 
        p.stage, 
        p.domain, 
        p.sale_price, 
        p.contact_email, 
        p.contact_phone, 
        p.payment_method,
        p.updated_at, 
        p.owner_id AS user_id,
        u.username AS owner_username 
    FROM projects p 
    JOIN users u ON p.owner_id = u.user_id 
    WHERE p.is_for_sale = TRUE AND p.sale_price IS NOT NULL AND p.sale_price > 0"
)

Write-Host "Starting migration execution..."

foreach ($cmd in $commands) {
    Write-Host "Executing: $cmd"
    $output = & $cockroachPath sql --url="$connectionString" -e "$cmd"
    Write-Host $output
}

Write-Host "Migration completed successfully!" 