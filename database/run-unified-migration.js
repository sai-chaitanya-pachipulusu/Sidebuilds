#!/usr/bin/env node

/**
 * SideBuilds Unified Database Migration Runner
 * Handles both PostgreSQL (Supabase) and SQLite fallback
 */

const fs = require('fs');
const path = require('path');

// Database connection modules
let pg;
try {
    pg = require('pg');
} catch (e) {
    console.log('PostgreSQL module not available, will use SQLite fallback');
}

class DatabaseMigrator {
    constructor() {
        this.dbType = null;
        this.client = null;
        this.schemaPath = path.join(__dirname, 'unified_schema.sql');
        this.sqliteSchemaPath = path.join(__dirname, 'sqlite_schema.sql');
    }

    async connect() {
        // Try PostgreSQL first (Supabase)
        if (pg && process.env.DATABASE_URL) {
            try {
                console.log('🔄 Attempting PostgreSQL connection...');
                this.client = new pg.Client({
                    connectionString: process.env.DATABASE_URL,
                    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
                });
                
                await this.client.connect();
                
                // Test connection
                await this.client.query('SELECT 1');
                
                this.dbType = 'postgresql';
                console.log('✅ Connected to PostgreSQL (Supabase)');
                return true;
            } catch (error) {
                console.log('❌ PostgreSQL connection failed:', error.message);
                if (this.client) {
                    try {
                        await this.client.end();
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                }
            }
        }

        // Fallback to SQLite
        try {
            console.log('🔄 Falling back to SQLite...');
            const dbPath = path.join(__dirname, '..', 'server', 'sidebuilds-complete.db');
            
            // Use require directly since sqlite3 should be available
            const sqlite3 = require('sqlite3').verbose();
            this.client = new sqlite3.Database(dbPath);
            this.dbType = 'sqlite';
            console.log('✅ Connected to SQLite:', dbPath);
            return true;
        } catch (error) {
            console.log('❌ SQLite connection failed:', error.message);
            console.log('💡 Installing sqlite3: npm install sqlite3');
        }

        throw new Error('No database connection available');
    }

    async runMigration() {
        try {
            if (this.dbType === 'postgresql') {
                console.log('📖 Reading unified schema...');
                const schema = fs.readFileSync(this.schemaPath, 'utf8');
                await this.runPostgreSQLMigration(schema);
            } else if (this.dbType === 'sqlite') {
                console.log('📖 Reading SQLite schema...');
                const schema = fs.readFileSync(this.sqliteSchemaPath, 'utf8');
                await this.runSQLiteMigration(schema);
            }
            
            console.log('✅ Migration completed successfully!');
            await this.verifyMigration();
            
        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            throw error;
        }
    }

    async runPostgreSQLMigration(schema) {
        console.log('🚀 Running PostgreSQL migration...');
        
        // Split schema into individual statements
        const statements = this.splitSQLStatements(schema);
        
        let successCount = 0;
        let skipCount = 0;
        
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await this.client.query(statement);
                    successCount++;
                } catch (error) {
                    // Skip certain expected errors
                    if (this.isExpectedError(error.message)) {
                        skipCount++;
                        console.log(`⚠️  Skipped: ${error.message.split('\n')[0]}`);
                    } else {
                        console.error(`❌ Error executing statement: ${statement.substring(0, 100)}...`);
                        throw error;
                    }
                }
            }
        }
        
        console.log(`✅ Executed ${successCount} statements, skipped ${skipCount}`);
    }

    async runSQLiteMigration(schema) {
        console.log('🚀 Running SQLite migration...');
        
        // Use the schema as-is since it's already SQLite compatible
        const statements = this.splitSQLStatements(schema);
        
        return new Promise((resolve, reject) => {
            let successCount = 0;
            let skipCount = 0;
            let currentIndex = 0;
            
            const executeNext = () => {
                if (currentIndex >= statements.length) {
                    console.log(`✅ Executed ${successCount} statements, skipped ${skipCount}`);
                    resolve();
                    return;
                }
                
                const statement = statements[currentIndex].trim();
                currentIndex++;
                
                if (!statement) {
                    executeNext();
                    return;
                }
                
                this.client.run(statement, (error) => {
                    if (error) {
                        if (this.isExpectedError(error.message)) {
                            skipCount++;
                            console.log(`⚠️  Skipped: ${error.message}`);
                        } else {
                            console.error(`❌ Error executing statement: ${statement.substring(0, 100)}...`);
                            reject(error);
                            return;
                        }
                    } else {
                        successCount++;
                    }
                    executeNext();
                });
            };
            
            executeNext();
        });
    }

    convertToSQLite(schema) {
        return schema
            // Remove PostgreSQL-specific syntax
            .replace(/UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/g, 'TEXT PRIMARY KEY')
            .replace(/UUID/g, 'TEXT')
            .replace(/TIMESTAMP WITH TIME ZONE/g, 'DATETIME')
            .replace(/DECIMAL\(\d+,\s*\d+\)/g, 'REAL')
            .replace(/JSONB/g, 'TEXT')
            .replace(/TEXT\[\]/g, 'TEXT')
            .replace(/USING gin\([^)]+\)/g, '')
            .replace(/CONCURRENTLY\s+/g, '')
            .replace(/CASCADE/g, '')
            .replace(/\$\$[^$]*\$\$/g, 'BEGIN END')
            // Remove PostgreSQL functions and triggers
            .replace(/CREATE OR REPLACE FUNCTION[^;]+;/gs, '')
            .replace(/CREATE TRIGGER[^;]+;/gs, '')
            .replace(/LANGUAGE plpgsql;/g, '')
            // Remove views (SQLite has limited view support)
            .replace(/CREATE OR REPLACE VIEW[^;]+;/gs, '')
            // Remove PostgreSQL-specific commands
            .replace(/ANALYZE[^;]+;/g, '')
            .replace(/SELECT setval[^;]+;/g, '')
            .replace(/DO \$\$[^$]*\$\$;/gs, '');
    }

    splitSQLStatements(schema) {
        // Split by semicolons, but be careful with function definitions
        const statements = [];
        let current = '';
        let inFunction = false;
        let dollarCount = 0;
        
        const lines = schema.split('\n');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Skip comments and empty lines
            if (trimmedLine.startsWith('--') || !trimmedLine) {
                continue;
            }
            
            current += line + '\n';
            
            // Track function boundaries
            if (trimmedLine.includes('$$')) {
                dollarCount++;
                if (dollarCount % 2 === 1) {
                    inFunction = true;
                } else {
                    inFunction = false;
                }
            }
            
            // Split on semicolon if not in function
            if (trimmedLine.endsWith(';') && !inFunction) {
                statements.push(current.trim());
                current = '';
            }
        }
        
        if (current.trim()) {
            statements.push(current.trim());
        }
        
        return statements;
    }

    isExpectedError(message) {
        const expectedErrors = [
            'already exists',
            'does not exist',
            'relation ".*" already exists',
            'function ".*" already exists',
            'trigger ".*" already exists',
            'index ".*" already exists',
            'duplicate key value',
            'table ".*" does not exist'
        ];
        
        return expectedErrors.some(pattern => 
            new RegExp(pattern, 'i').test(message)
        );
    }

    async verifyMigration() {
        console.log('🔍 Verifying migration...');
        
        try {
            if (this.dbType === 'postgresql') {
                // Check tables exist
                const result = await this.client.query(`
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_type = 'BASE TABLE'
                    ORDER BY table_name
                `);
                
                const tables = result.rows.map(row => row.table_name);
                console.log('📋 Created tables:', tables.join(', '));
                
                // Check seeded data
                const projectCount = await this.client.query('SELECT COUNT(*) FROM projects WHERE is_public = true');
                const userCount = await this.client.query('SELECT COUNT(*) FROM users');
                
                console.log(`👥 Users: ${userCount.rows[0].count}`);
                console.log(`📦 Public projects: ${projectCount.rows[0].count}`);
                
            } else if (this.dbType === 'sqlite') {
                // SQLite verification
                this.client.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
                    if (err) {
                        console.error('❌ Verification failed:', err.message);
                    } else {
                        const tables = rows.map(row => row.name);
                        console.log('📋 Created tables:', tables.join(', '));
                    }
                });
            }
            
        } catch (error) {
            console.warn('⚠️  Verification warning:', error.message);
        }
    }

    async close() {
        if (this.client) {
            if (this.dbType === 'postgresql') {
                await this.client.end();
            } else if (this.dbType === 'sqlite') {
                this.client.close();
            }
        }
    }
}

// CLI execution
async function main() {
    const migrator = new DatabaseMigrator();
    
    try {
        console.log('🚀 SideBuilds Database Migration Starting...\n');
        
        // Load environment variables
        require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });
        
        await migrator.connect();
        await migrator.runMigration();
        
        console.log('\n🎉 Migration completed successfully!');
        console.log('🔗 Your marketplace should now have visible projects');
        
    } catch (error) {
        console.error('\n💥 Migration failed:', error.message);
        process.exit(1);
    } finally {
        await migrator.close();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = DatabaseMigrator;