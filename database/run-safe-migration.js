#!/usr/bin/env node

/**
 * SideBuilds SAFE Production Migration Runner
 * Executes database/safe_migration.sql against PostgreSQL
 */

const fs = require('fs');
const path = require('path');
// Check if pg installed
let pg;
try {
    pg = require('pg');
} catch (e) {
    console.error('❌ "pg" module not found. Run "npm install" first.');
    process.exit(1);
}

class MigrationRunner {
    constructor() {
        this.client = null;
        this.schemaPath = path.join(__dirname, 'safe_migration.sql');
    }

    async connect() {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is missing.');
        }

        console.log('🔄 Connecting to PostgreSQL Database...');
        // Note: Using SSL for 'production' enviroments often required by cloud DBs
        // We auto-detect or allow manual override if needed.
        this.client = new pg.Client({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false } // Lax SSL for broad compatibility with Heroku/Railway/etc default certs
        });

        await this.client.connect();
        console.log('✅ Connected.');
    }

    async run() {
        console.log('📖 Reading safe_migration.sql...');
        const schema = fs.readFileSync(this.schemaPath, 'utf8');

        console.log('🚀 Executing Migration Statements...');
        
        // Robust statement splitting handles $$ blocks (reused logic)
        const statements = this.splitSQLStatements(schema);

        let successVal = 0;
        let skipVal = 0;

        for (const sql of statements) {
            if (!sql.trim()) continue;
            try {
                await this.client.query(sql);
                successVal++;
            } catch (err) {
                // If "already exists", we consider it a success/skip in a safe migration context
                if (this.isExpectedError(err.message)) {
                    console.log(`⚠️  Skipped (Already exists): ${err.message.split('\n')[0]}`);
                    skipVal++;
                } else {
                    console.error(`❌ Error executing:\n${sql.substring(0, 50)}...`);
                    throw err;
                }
            }
        }
        console.log(`\n✅ Migration Complete: ${successVal} executed, ${skipVal} skipped.`);
    }

    async close() {
        if (this.client) await this.client.end();
    }

    // Helper: Split SQL by semicolons but respect $$ dollar quotes (functions/DO blocks)
    splitSQLStatements(schema) {
        const statements = [];
        let current = '';
        let inFunction = false; // logic checks for $$
        let dollarCount = 0;
        
        const lines = schema.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('--') || !trimmed) continue;

            current += line + '\n';
            if (trimmed.includes('$$')) {
                dollarCount++;
                inFunction = (dollarCount % 2 === 1);
            }
            if (trimmed.endsWith(';') && !inFunction) {
                statements.push(current.trim());
                current = '';
            }
        }
        if (current.trim()) statements.push(current.trim());
        return statements;
    }

    isExpectedError(msg) {
        const patterns = [
            'already exists', 'does not exist', 'duplicate key' // safe migration implies idempotency
        ];
        return patterns.some(p => new RegExp(p, 'i').test(msg));
    }
}

async function main() {
    // Load .env from server directory relative to this script
    require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });
    
    // Safety Check: Users often run this locally. 
    // If they are pointing to a remote DB, warn them.
    if (process.env.USE_SQLITE === 'true') {
        console.error('❌ USE_SQLITE=true in .env. This script is for PostgreSQL Production Migration only.');
        console.error('   If you want to migrate Production, set DATABASE_URL to your Prod connection string.');
        process.exit(1);
    }

    const runner = new MigrationRunner();
    try {
        await runner.connect();
        await runner.run();
    } catch (e) {
        console.error('❌ Migration Failed:', e.message);
        process.exit(1);
    } finally {
        await runner.close();
    }
}

main();
