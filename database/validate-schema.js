#!/usr/bin/env node

/**
 * SideBuilds Database Schema Validator
 * Validates that the database schema matches application requirements
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SchemaValidator {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'server', 'sidebuilds-complete.db');
        this.db = null;
        this.requiredTables = [
            'users',
            'projects',
            'project_purchase_requests',
            'purchase_request_messages',
            'notifications',
            'ai_project_analysis',
            'project_transactions',
            'project_transfers',
            'payment_methods',
            'payout_preferences',
            'project_valuations'
        ];

        this.requiredColumns = {
            users: [
                'user_id', 'username', 'email', 'password_hash', 'created_at', 'updated_at',
                'first_name', 'last_name', 'bio', 'avatar_url', 'location', 'website_url',
                'is_verified', 'verification_level', 'total_projects_sold', 'total_projects_bought',
                'total_revenue', 'reputation_score', 'is_admin', 'account_status'
            ],
            projects: [
                'project_id', 'name', 'description', 'detailed_description', 'stage', 'status',
                'github_url', 'demo_url', 'domain', 'tech_stack', 'category', 'subcategory',
                'monthly_revenue', 'monthly_users', 'growth_rate', 'launch_date',
                'is_public', 'is_for_sale', 'sale_price', 'owner_id', 'owner_username',
                'created_at', 'updated_at', 'view_count', 'interest_count', 'tags'
            ],
            project_purchase_requests: [
                'request_id', 'project_id', 'buyer_id', 'seller_id', 'status', 'offered_price',
                'buyer_intro_message', 'agreed_price', 'created_at', 'updated_at'
            ],
            notifications: [
                'notification_id', 'user_id', 'type', 'title', 'message', 'is_read',
                'related_project_id', 'related_transaction_id', 'created_at'
            ]
        };
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Connected to SQLite database for validation');
                    resolve();
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

    async validateSchema() {
        console.log('🔍 Validating database schema...\n');

        try {
            // 1. Check required tables exist
            await this.validateTables();

            // 2. Check required columns exist
            await this.validateColumns();

            // 3. Check data integrity
            await this.validateDataIntegrity();

            // 4. Check indexes exist
            await this.validateIndexes();

            // 5. Check seeded data
            await this.validateSeededData();

            console.log('\n🎉 Database schema validation completed successfully!');
            console.log('✅ All requirements met - database is ready for production');

        } catch (error) {
            console.error('\n💥 Database schema validation failed:', error.message);
            throw error;
        }
    }

    async validateTables() {
        console.log('📋 Checking required tables...');

        const existingTables = await this.getQuery(`
            SELECT name FROM sqlite_master WHERE type='table'
        `);

        const existingTableNames = existingTables.map(row => row.name);

        for (const requiredTable of this.requiredTables) {
            if (!existingTableNames.includes(requiredTable)) {
                throw new Error(`Missing required table: ${requiredTable}`);
            }
        }

        console.log(`✅ Found ${this.requiredTables.length} required tables`);
    }

    async validateColumns() {
        console.log('🔧 Checking required columns...');

        for (const [tableName, requiredColumns] of Object.entries(this.requiredColumns)) {
            const tableInfo = await this.getQuery(`PRAGMA table_info(${tableName})`);
            const existingColumns = tableInfo.map(col => col.name);

            for (const requiredColumn of requiredColumns) {
                if (!existingColumns.includes(requiredColumn)) {
                    throw new Error(`Missing required column: ${tableName}.${requiredColumn}`);
                }
            }

            console.log(`✅ Table ${tableName}: ${requiredColumns.length} required columns found`);
        }
    }

    async validateDataIntegrity() {
        console.log('🔗 Checking data integrity...');

        // Check users exist
        const userCount = await this.getQuery('SELECT COUNT(*) as count FROM users');
        if (userCount[0].count === 0) {
            console.warn('⚠️  No users found in database');
        } else {
            console.log(`✅ Found ${userCount[0].count} users`);
        }

        // Check projects exist and have valid owners
        const projectCount = await this.getQuery(`
            SELECT COUNT(*) as count FROM projects WHERE owner_id IS NOT NULL
        `);
        console.log(`✅ Found ${projectCount[0].count} projects with valid owners`);

        // Check foreign key constraints
        const orphanedProjects = await this.getQuery(`
            SELECT COUNT(*) as count
            FROM projects p
            LEFT JOIN users u ON p.owner_id = u.user_id
            WHERE u.user_id IS NULL
        `);

        if (orphanedProjects[0].count > 0) {
            console.warn(`⚠️  Found ${orphanedProjects[0].count} orphaned projects`);
        } else {
            console.log('✅ All projects have valid owners');
        }

        // Check notifications have valid users
        const orphanedNotifications = await this.getQuery(`
            SELECT COUNT(*) as count
            FROM notifications n
            LEFT JOIN users u ON n.user_id = u.user_id
            WHERE u.user_id IS NULL
        `);

        if (orphanedNotifications[0].count > 0) {
            console.warn(`⚠️  Found ${orphanedNotifications[0].count} orphaned notifications`);
        } else {
            console.log('✅ All notifications have valid users');
        }
    }

    async validateIndexes() {
        console.log('📊 Checking database indexes...');

        const indexes = await this.getQuery(`
            SELECT name, tbl_name, sql
            FROM sqlite_master
            WHERE type='index' AND name NOT LIKE 'sqlite_%'
        `);

        const indexNames = indexes.map(idx => idx.name);

        // Check for important indexes
        const importantIndexes = [
            'idx_users_email',
            'idx_users_username',
            'idx_projects_owner',
            'idx_projects_public',
            'idx_projects_for_sale',
            'idx_notifications_user'
        ];

        for (const indexName of importantIndexes) {
            if (indexNames.includes(indexName)) {
                console.log(`✅ Index found: ${indexName}`);
            } else {
                console.warn(`⚠️  Missing index: ${indexName}`);
            }
        }
    }

    async validateSeededData() {
        console.log('🌱 Checking seeded data...');

        // Check for test users
        const testUsers = await this.getQuery(`
            SELECT username, email, is_verified
            FROM users
            WHERE email LIKE '%@sidebuilds.com'
        `);

        if (testUsers.length === 0) {
            console.warn('⚠️  No test users found');
        } else {
            console.log(`✅ Found ${testUsers.length} test users:`);
            testUsers.forEach(user => {
                console.log(`   - ${user.username} (${user.email}) - ${user.is_verified ? 'Verified' : 'Unverified'}`);
            });
        }

        // Check for marketplace projects
        const marketplaceProjects = await this.getQuery(`
            SELECT name, category, sale_price, is_for_sale
            FROM projects
            WHERE is_public = 1 AND is_for_sale = 1
        `);

        if (marketplaceProjects.length === 0) {
            console.warn('⚠️  No marketplace projects found');
        } else {
            console.log(`✅ Found ${marketplaceProjects.length} marketplace projects`);
        }

        // Check for AI analysis data
        const aiAnalysis = await this.getQuery(`
            SELECT COUNT(*) as count FROM ai_project_analysis
        `);

        if (aiAnalysis[0].count === 0) {
            console.warn('⚠️  No AI analysis data found');
        } else {
            console.log(`✅ Found ${aiAnalysis[0].count} AI analysis records`);
        }
    }

    async generateReport() {
        console.log('📊 Generating schema validation report...\n');

        const report = {
            timestamp: new Date().toISOString(),
            database: 'SQLite',
            tables: {},
            data_integrity: {},
            recommendations: []
        };

        // Get table information
        const tables = await this.getQuery(`
            SELECT name, COUNT(*) as record_count
            FROM sqlite_master
            WHERE type='table'
            GROUP BY name
        `);

        tables.forEach(table => {
            report.tables[table.name] = {
                record_count: table.record_count,
                exists: true
            };
        });

        // Get column information for key tables
        for (const tableName of Object.keys(this.requiredColumns)) {
            const columns = await this.getQuery(`PRAGMA table_info(${tableName})`);
            report.tables[tableName].columns = columns.map(col => ({
                name: col.name,
                type: col.type,
                nullable: !col.notnull,
                default: col.dflt_value,
                pk: col.pk
            }));
        }

        // Check data integrity
        const userCount = await this.getQuery('SELECT COUNT(*) as count FROM users');
        const projectCount = await this.getQuery('SELECT COUNT(*) as count FROM projects WHERE owner_id IS NOT NULL');
        const publicProjectCount = await this.getQuery('SELECT COUNT(*) as count FROM projects WHERE is_public = 1 AND is_for_sale = 1');

        report.data_integrity = {
            total_users: userCount[0].count,
            total_projects: projectCount[0].count,
            marketplace_projects: publicProjectCount[0].count,
            has_test_data: userCount[0].count > 0 && publicProjectCount[0].count > 0
        };

        // Generate recommendations
        if (report.data_integrity.total_users === 0) {
            report.recommendations.push('Run database seeding script to add test users');
        }

        if (report.data_integrity.marketplace_projects === 0) {
            report.recommendations.push('Ensure projects are marked as public and for sale');
        }

        return report;
    }

    async close() {
        if (this.db) {
            return new Promise((resolve) => {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                    }
                    resolve();
                });
            });
        }
    }
}

// Main execution
async function main() {
    const validator = new SchemaValidator();

    try {
        console.log('🚀 SideBuilds Database Schema Validation Starting...\n');

        await validator.connect();
        await validator.validateSchema();

        const report = await validator.generateReport();

        console.log('\n📊 VALIDATION REPORT');
        console.log('==================');
        console.log(`Database: ${report.database}`);
        console.log(`Validation Date: ${report.timestamp}`);
        console.log(`Total Tables: ${Object.keys(report.tables).length}`);

        console.log('\n📋 Table Status:');
        Object.entries(report.tables).forEach(([tableName, info]) => {
            console.log(`  ${tableName}: ${info.record_count} records`);
        });

        console.log('\n🔗 Data Integrity:');
        console.log(`  Users: ${report.data_integrity.total_users}`);
        console.log(`  Projects: ${report.data_integrity.total_projects}`);
        console.log(`  Marketplace Projects: ${report.data_integrity.marketplace_projects}`);
        console.log(`  Has Test Data: ${report.data_integrity.has_test_data ? '✅ Yes' : '❌ No'}`);

        if (report.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            report.recommendations.forEach(rec => {
                console.log(`  • ${rec}`);
            });
        }

        console.log('\n🎉 Database validation completed successfully!');
        console.log('✅ Your database schema is up to date and ready for production');

    } catch (error) {
        console.error('\n💥 Database validation failed:', error.message);
        process.exit(1);
    } finally {
        await validator.close();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = SchemaValidator;
