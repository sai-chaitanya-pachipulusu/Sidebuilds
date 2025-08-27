const db = require('./server/db');

(async () => {
    try {
        console.log('Checking for missing tables and features...\n');
        
        // Check for AI/analytics related tables
        const aiTables = ['ai_project_analysis', 'project_valuations', 'payment_schedules', 'payment_disputes', 'purchase_request_messages'];
        
        for (const table of aiTables) {
            try {
                const result = await db.query(`
                    SELECT column_name, data_type, is_nullable 
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                `, [table]);
                
                console.log(`Table: ${table}`);
                if (result.rows.length > 0) {
                    console.log(`  ✅ Exists (${result.rows.length} columns)`);
                } else {
                    console.log(`  ❌ Missing - Required for AI analysis and marketplace features`);
                }
            } catch (e) {
                console.log(`  ❌ Error: ${e.message}`);
            }
        }
        
        // Check for indexes
        console.log('\nChecking critical indexes...');
        const indexQuery = `
            SELECT indexname, tablename 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname LIKE 'idx_%'
            ORDER BY tablename, indexname
        `;
        
        try {
            const result = await db.query(indexQuery);
            console.log(`Found ${result.rows.length} custom indexes`);
            
            // Check for specific performance indexes
            const criticalIndexes = [
                'idx_projects_for_sale',
                'idx_projects_public', 
                'idx_transactions_buyer',
                'idx_transactions_seller',
                'idx_notifications_user'
            ];
            
            const existingIndexes = result.rows.map(r => r.indexname);
            
            criticalIndexes.forEach(index => {
                if (existingIndexes.includes(index)) {
                    console.log(`  ✅ ${index}`);
                } else {
                    console.log(`  ❌ Missing: ${index}`);
                }
            });
            
        } catch (e) {
            console.log(`Error checking indexes: ${e.message}`);
        }
        
        // Check for views
        console.log('\nChecking marketplace views...');
        const viewQuery = `
            SELECT viewname 
            FROM pg_views 
            WHERE schemaname = 'public'
            ORDER BY viewname
        `;
        
        try {
            const result = await db.query(viewQuery);
            console.log(`Found ${result.rows.length} views:`);
            result.rows.forEach(r => console.log(`  - ${r.viewname}`));
        } catch (e) {
            console.log(`Error checking views: ${e.message}`);
        }
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();