require('dotenv').config({ path: '../server/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function createMissingTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creating missing critical tables...');
    
    // 1. AI Project Analysis Table
    console.log('Creating ai_project_analysis table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_project_analysis (
          analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
          overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
          technical_score INTEGER CHECK (technical_score >= 0 AND technical_score <= 100),
          market_score INTEGER CHECK (market_score >= 0 AND market_score <= 100),
          revenue_score INTEGER CHECK (revenue_score >= 0 AND revenue_score <= 100),
          growth_score INTEGER CHECK (growth_score >= 0 AND growth_score <= 100),
          presentation_score INTEGER CHECK (presentation_score >= 0 AND presentation_score <= 100),
          strengths TEXT[],
          weaknesses TEXT[],
          recommendations TEXT[],
          market_analysis TEXT,
          estimated_value DECIMAL(12, 2),
          confidence_score DECIMAL(5, 2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
          valuation_factors JSONB,
          ai_model_version VARCHAR(20) DEFAULT 'v1.0',
          analysis_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          is_current BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 2. Purchase Request Messages Table  
    console.log('Creating purchase_request_messages table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_request_messages (
          message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          purchase_request_id UUID REFERENCES project_purchase_requests(purchase_request_id) ON DELETE CASCADE,
          sender_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
          recipient_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          message_type VARCHAR(20) DEFAULT 'text',
          is_read BOOLEAN DEFAULT FALSE,
          is_system_message BOOLEAN DEFAULT FALSE,
          attachment_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 3. Create performance indexes
    console.log('Creating performance indexes...');
    
    // Full-text search for projects
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_search_fts 
      ON projects USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')))
    `);
    
    // Tech stack search optimization
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_tech_stack_gin 
      ON projects USING gin(tech_stack)
    `);
    
    // Analytics performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_analytics 
      ON project_transactions(created_at, status, amount)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_revenue_analytics 
      ON projects(monthly_revenue, stage) 
      WHERE is_public = true
    `);
    
    // Message performance indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_purchase_request 
      ON purchase_request_messages(purchase_request_id, created_at)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_unread 
      ON purchase_request_messages(recipient_id, is_read) 
      WHERE is_read = false
    `);
    
    console.log('✅ All critical tables and indexes created successfully!');
    
    // Verify tables were created
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('ai_project_analysis', 'purchase_request_messages')
      ORDER BY table_name
    `);
    
    console.log('📋 Verified new tables:');
    tableCheck.rows.forEach(table => {
      console.log(`  ✅ ${table.table_name}`);
    });
    
  } catch (err) {
    console.error('❌ Error creating tables:', err.message);
    console.error('Stack:', err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

createMissingTables();