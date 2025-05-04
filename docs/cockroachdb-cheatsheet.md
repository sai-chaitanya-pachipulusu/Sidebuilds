# CockroachDB Cheatsheet

This cheatsheet provides common commands for working with CockroachDB in your SideBuilds.space project.

## Basic Connection

```bash
# Connect to local insecure instance
./cockroach.exe sql --insecure --host=localhost:26257

# Connect to local secure instance (with certificate)
./cockroach.exe sql --certs-dir=/path/to/certs --host=localhost:26257

# Connect to CockroachDB Cloud
./cockroach.exe sql --url "postgresql://username:password@hostname:26257/defaultdb?sslmode=verify-full&sslrootcert=/path/to/root.crt"
```

## Database Management

```sql
-- List all databases
SHOW DATABASES;

-- Create a new database
CREATE DATABASE sidebuilds;

-- Switch to a specific database
USE sidebuilds;

-- Show tables in the current database
SHOW TABLES;

-- View table schema
SHOW CREATE TABLE users;

-- Drop a database (use with caution!)
DROP DATABASE sidebuilds;
```

## User Management

```sql
-- Create a new user
CREATE USER sidebuilds_user WITH PASSWORD 'secure_password';

-- Grant privileges to a user
GRANT ALL ON DATABASE sidebuilds TO sidebuilds_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE projects TO sidebuilds_user;

-- Show users
SHOW USERS;

-- Change user password
ALTER USER sidebuilds_user WITH PASSWORD 'new_secure_password';

-- Remove user (use with caution!)
DROP USER sidebuilds_user;
```

## Data Manipulation

```sql
-- Insert data
INSERT INTO projects (name, description, owner_id) VALUES ('My Project', 'A cool project', 'user_uuid_here');

-- Select data
SELECT * FROM projects WHERE owner_id = 'user_uuid_here';

-- Update data
UPDATE projects SET stage = 'development' WHERE project_id = 'project_uuid_here';

-- Delete data
DELETE FROM projects WHERE project_id = 'project_uuid_here';
```

## Transactions

```sql
-- Begin a transaction
BEGIN;

-- Run statements
INSERT INTO projects (name, description, owner_id) VALUES ('New Project', 'Description', 'user_uuid_here');
UPDATE users SET projects_count = projects_count + 1 WHERE user_id = 'user_uuid_here';

-- Commit the transaction
COMMIT;

-- Or roll it back
ROLLBACK;
```

## Performance Optimization

```sql
-- Explain a query execution plan
EXPLAIN SELECT * FROM projects WHERE owner_id = 'user_uuid_here';

-- Explain with query execution statistics
EXPLAIN ANALYZE SELECT * FROM projects WHERE owner_id = 'user_uuid_here';

-- Create an index
CREATE INDEX idx_projects_name ON projects(name);

-- Show indexes
SHOW INDEXES FROM projects;
```

## Backup and Restore

```bash
# Backup a database
./cockroach.exe backup DATABASE sidebuilds TO 'path/to/backup-dir' AS OF SYSTEM TIME '-10s';

# Restore a database
./cockroach.exe restore DATABASE sidebuilds FROM 'path/to/backup-dir';
```

## Monitoring

```sql
-- Show cluster overview
SELECT * FROM crdb_internal.node_build_info;

-- Check active sessions
SELECT * FROM crdb_internal.cluster_sessions WHERE application_name != 'cockroach';

-- Monitor statement statistics
SELECT * FROM crdb_internal.node_statement_statistics ORDER BY count DESC LIMIT 10;
```

## Common Issues and Solutions

### Connection Errors
- Check your connection string format
- Verify SSL/TLS settings
- Ensure the CockroachDB node is running
- Check network connectivity and firewall settings

### Transaction Retry Errors
CockroachDB may return error code `40001` (serialization failure). Your application should retry these transactions:

```javascript
// Example retry logic in Node.js (as shown in your db.js)
const retry = async (callback, maxRetries = 5) => {
    let retries = 0;
    while (true) {
        try {
            return await callback();
        } catch (err) {
            if (err.code === '40001' && retries < maxRetries) {
                retries++;
                await new Promise(resolve => setTimeout(resolve, 2 ** retries * 100));
                continue;
            }
            throw err;
        }
    }
};
```

### Performance Issues
- Use indexes for frequently queried columns
- Keep transactions short
- Avoid large joins when possible
- Use EXPLAIN ANALYZE to identify bottlenecks

## Additional Resources

- [CockroachDB Documentation](https://www.cockroachlabs.com/docs/)
- [SQL Reference](https://www.cockroachlabs.com/docs/stable/sql-statements.html)
- [Troubleshooting Guide](https://www.cockroachlabs.com/docs/stable/troubleshooting-overview.html) 