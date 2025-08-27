const db = require('./server/db');

(async () => {
    try {
        console.log('Checking database schema...\n');
        
        // Check for critical tables
        const tables = ['users', 'projects', 'project_purchase_requests', 'purchase_requests', 'notifications', 'project_transactions', 'project_transfers'];
        
        for (const table of tables) {
            try {
                const result = await db.query(`
                    SELECT column_name, data_type, is_nullable 
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                `, [table]);
                
                console.log(`Table: ${table}`);
                if (result.rows.length > 0) {
                    result.rows.forEach(col => {
                        console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
                    });
                } else {
                    console.log(`  ❌ Table not found`);
                }
                console.log('');
            } catch (e) {
                console.log(`  ❌ Error checking ${table}: ${e.message}\n`);
            }
        }
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();