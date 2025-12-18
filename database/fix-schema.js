#!/usr/bin/env node

/**
 * SideBuilds Database Schema Fix Script
 * Adds missing tables and columns to SQLite database
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class SchemaFixer {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'server', 'sidebuilds-complete.db');
        this.db = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Connected to SQLite database');
                    resolve();
                }
            });
        });
    }

    async runQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this);
                }
            });
        });
    }

    async getQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async applyMigration() {
        console.log('🔧 Starting database schema migration...');

        try {
            // 1. Create missing tables
            await this.createMissingTables();

            // 2. Add missing columns to existing tables
            await this.addMissingColumns();

            // 3. Add missing indexes
            await this.addMissingIndexes();

            // 4. Update existing data
            await this.updateExistingData();

            // 5. Verify schema integrity
            await this.verifySchema();

            console.log('✅ Schema migration completed successfully!');

        } catch (error) {
            console.error('❌ Schema migration failed:', error.message);
            throw error;
        }
    }

    async createMissingTables() {
        console.log('📋 Creating missing tables...');

        // Payment methods table
        await this.runQuery(`
            CREATE TABLE IF NOT EXISTS payment_methods (
                method_id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(user_id),
                type TEXT NOT NULL,
                stripe_payment_method_id TEXT,
                last_four TEXT,
                brand TEXT,
                exp_month INTEGER,
                exp_year INTEGER,
                is_default INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Payout preferences table
        await this.runQuery(`
            CREATE TABLE IF NOT EXISTS payout_preferences (
                pref_id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(user_id),
                payout_method TEXT DEFAULT 'bank_transfer',
                payout_schedule TEXT DEFAULT 'weekly',
                minimum_payout_amount REAL DEFAULT 100.00,
                bank_account_id TEXT,
                paypal_email TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Project valuations table
        await this.runQuery(`
            CREATE TABLE IF NOT EXISTS project_valuations (
                valuation_id TEXT PRIMARY KEY,
                project_id TEXT REFERENCES projects(project_id),
                estimated_value REAL NOT NULL,
                confidence_score REAL,
                valuation_method TEXT,
                factors TEXT,
                comparable_projects TEXT,
                market_data TEXT,
                created_by TEXT REFERENCES users(user_id),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active INTEGER DEFAULT 1
            )
        `);

        console.log('✅ Missing tables created');
    }

    async addMissingColumns() {
        console.log('🔧 Adding missing columns...');

        // Add missing columns to users table
        const missingUserColumns = [
            'is_admin INTEGER DEFAULT 0',
            'account_status TEXT DEFAULT "active"',
            'last_login_at DATETIME',
            'login_count INTEGER DEFAULT 0',
            'failed_login_attempts INTEGER DEFAULT 0',
            'account_locked_until DATETIME'
        ];

        for (const column of missingUserColumns) {
            await this.runQuery(`ALTER TABLE users ADD COLUMN ${column}`);
        }

        // Add missing columns to projects table
        const missingProjectColumns = [
            'subcategory TEXT',
            'database_type TEXT',
            'hosting_platform TEXT',
            'stripe_product_id TEXT',
            'stripe_price_id TEXT',
            'contact_phone TEXT',
            'gallery_images TEXT',
            'video_demo_url TEXT',
            'price_negotiable INTEGER DEFAULT 1',
            'domain_included INTEGER DEFAULT 0',
            'database_included INTEGER DEFAULT 0',
            'support_period_days INTEGER DEFAULT 30',
            'code_transferred INTEGER DEFAULT 0',
            'domain_transferred INTEGER DEFAULT 0',
            'assets_transferred INTEGER DEFAULT 0',
            'documentation_transferred INTEGER DEFAULT 0'
        ];

        for (const column of missingProjectColumns) {
            await this.runQuery(`ALTER TABLE projects ADD COLUMN ${column}`);
        }

        // Add missing columns to project_transactions table
        const missingTransactionColumns = [
            'commission_amount REAL DEFAULT 0.00',
            'seller_amount REAL DEFAULT 0.00',
            'escrow_released INTEGER DEFAULT 0',
            'escrow_released_at DATETIME',
            'transfer_completed INTEGER DEFAULT 0',
            'transfer_completed_at DATETIME',
            'transaction_notes TEXT',
            'completed_at DATETIME'
        ];

        for (const column of missingTransactionColumns) {
            await this.runQuery(`ALTER TABLE project_transactions ADD COLUMN ${column}`);
        }

        // Add missing columns to project_purchase_requests table
        const missingRequestColumns = [
            'agreed_transferable_assets TEXT DEFAULT "{}"',
            'seller_commitments TEXT',
            'buyer_commitments TEXT',
            'proposed_completion_date DATE',
            'actual_completion_date DATE',
            'transfer_status TEXT DEFAULT "not_started"',
            'withdrawal_reason TEXT',
            'responded_at DATETIME',
            'completed_at DATETIME'
        ];

        for (const column of missingRequestColumns) {
            await this.runQuery(`ALTER TABLE project_purchase_requests ADD COLUMN ${column}`);
        }

        // Add missing columns to purchase_request_messages table
        const missingMessageColumns = [
            'message_type TEXT DEFAULT "text"',
            'is_system_message INTEGER DEFAULT 0'
        ];

        for (const column of missingMessageColumns) {
            await this.runQuery(`ALTER TABLE purchase_request_messages ADD COLUMN ${column}`);
        }

        // Add missing columns to notifications table
        const missingNotificationColumns = [
            'is_email_sent INTEGER DEFAULT 0',
            'related_user_id TEXT',
            'expires_at DATETIME',
            'read_at DATETIME'
        ];

        for (const column of missingNotificationColumns) {
            await this.runQuery(`ALTER TABLE notifications ADD COLUMN ${column}`);
        }

        // Add missing columns to ai_project_analysis table
        const missingAnalysisColumns = [
            'technical_score INTEGER',
            'market_score INTEGER',
            'presentation_score INTEGER',
            'strengths TEXT',
            'weaknesses TEXT',
            'recommendations TEXT',
            'market_analysis TEXT',
            'valuation_factors TEXT'
        ];

        for (const column of missingAnalysisColumns) {
            await this.runQuery(`ALTER TABLE ai_project_analysis ADD COLUMN ${column}`);
        }

        console.log('✅ Missing columns added');
    }

    async addMissingIndexes() {
        console.log('📊 Adding missing indexes...');

        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_projects_subcategory ON projects(subcategory)',
            'CREATE INDEX IF NOT EXISTS idx_projects_tech_stack ON projects(tech_stack)',
            'CREATE INDEX IF NOT EXISTS idx_projects_tags ON projects(tags)',
            'CREATE INDEX IF NOT EXISTS idx_projects_monthly_revenue ON projects(monthly_revenue)',
            'CREATE INDEX IF NOT EXISTS idx_projects_growth_rate ON projects(growth_rate)',
            'CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON project_purchase_requests(status)',
            'CREATE INDEX IF NOT EXISTS idx_purchase_requests_created ON project_purchase_requests(created_at DESC)',
            'CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority)',
            'CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)',
            'CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_payout_preferences_user ON payout_preferences(user_id)'
        ];

        for (const index of indexes) {
            await this.runQuery(index);
        }

        console.log('✅ Missing indexes added');
    }

    async updateExistingData() {
        console.log('🔄 Updating existing data...');

        // Update projects with proper subcategory values
        await this.runQuery(`
            UPDATE projects SET subcategory = CASE
                WHEN category = 'saas' THEN 'productivity'
                WHEN category = 'mobile-app' THEN 'productivity'
                WHEN category = 'fintech' THEN 'finance'
                WHEN category = 'design-tools' THEN 'design'
                WHEN category = 'education' THEN 'learning'
                WHEN category = 'developer-tools' THEN 'development'
                ELSE 'general'
            END WHERE subcategory IS NULL OR subcategory = ''
        `);

        // Update projects with proper JSON string values
        await this.runQuery(`UPDATE projects SET tags = '[]' WHERE tags IS NULL OR tags = ''`);
        await this.runQuery(`UPDATE projects SET tech_stack = '[]' WHERE tech_stack IS NULL OR tech_stack = ''`);
        await this.runQuery(`UPDATE projects SET transferable_assets = '{}' WHERE transferable_assets IS NULL OR transferable_assets = ''`);

        // Update purchase requests
        await this.runQuery(`UPDATE project_purchase_requests SET agreed_transferable_assets = '{}' WHERE agreed_transferable_assets IS NULL OR agreed_transferable_assets = ''`);

        // Update notifications
        await this.runQuery(`UPDATE notifications SET is_email_sent = 0 WHERE is_email_sent IS NULL`);

        console.log('✅ Existing data updated');
    }

    async verifySchema() {
        console.log('🔍 Verifying schema integrity...');

        // Check table counts
        const tableCounts = await this.getQuery(`
            SELECT name as table_name, COUNT(*) as record_count
            FROM sqlite_master
            WHERE type='table'
            GROUP BY name
        `);

        console.log('📋 Table counts:');
        tableCounts.forEach(table => {
            console.log(`   ${table.table_name}: ${table.record_count} records`);
        });

        // Check foreign key constraints
        const projectOwnerCheck = await this.getQuery(`
            SELECT COUNT(*) as count
            FROM projects p
            LEFT JOIN users u ON p.owner_id = u.user_id
            WHERE u.user_id IS NULL
        `);

        if (projectOwnerCheck[0].count > 0) {
            console.warn(`⚠️  Found ${projectOwnerCheck[0].count} projects with invalid owners`);
        } else {
            console.log('✅ All projects have valid owners');
        }

        console.log('✅ Schema verification completed');
    }

    async close() {
        if (this.db) {
            return new Promise((resolve) => {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                    } else {
                        console.log('✅ Database connection closed');
                    }
                    resolve();
                });
            });
        }
    }
}

// Run the migration
async function main() {
    const fixer = new SchemaFixer();

    try {
        console.log('🚀 SideBuilds Database Schema Fix Starting...\n');

        await fixer.connect();
        await fixer.applyMigration();

        console.log('\n🎉 Schema fix completed successfully!');
        console.log('🔗 Your database should now support all application features');

    } catch (error) {
        console.error('\n💥 Schema fix failed:', error.message);
        process.exit(1);
    } finally {
        await fixer.close();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = SchemaFixer;
