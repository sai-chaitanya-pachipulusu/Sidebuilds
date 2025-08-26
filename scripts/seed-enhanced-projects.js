const db = require('../server/db');
const bcrypt = require('bcryptjs');

async function seedEnhancedProjects() {
  try {
    console.log('Starting enhanced project seeding (SQLite compatible)...');

    // Ensure three sellers exist
    const sellers = [
      { username: 'seller1', email: 'seller1@test.com' },
      { username: 'seller2', email: 'seller2@test.com' },
      { username: 'abc', email: 'abc@gmail.com' }
    ];

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    for (const s of sellers) {
      const existing = await db.query('SELECT user_id FROM users WHERE email = $1', [s.email]);
      if (existing.rows.length === 0) {
        await db.query(
          'INSERT INTO users (username, email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
          [s.username, s.email, hashedPassword]
        );
        console.log(`Created user ${s.email}`);
      }
    }

    // Map emails to user_id
    const userResult = await db.query('SELECT user_id, email FROM users WHERE email IN ($1, $2, $3)', [sellers[0].email, sellers[1].email, sellers[2].email]);
    const emailToId = Object.fromEntries(userResult.rows.map(r => [r.email, r.user_id]));

    const projects = [
      {
        user_id: emailToId[sellers[0].email],
        name: 'TaskFlow Pro',
        description: 'Modern task management SaaS with team collaboration features.',
        stage: 'launched',
        domain: 'taskflowpro.com',
        is_public: 1,
        is_for_sale: 1,
        sale_price: 45000,
        contact_email: sellers[0].email,
        payment_method: 'stripe_connect',
        tech_stack: JSON.stringify(['React', 'Node.js', 'PostgreSQL']),
        monthly_revenue: 4500
      },
      {
        user_id: emailToId[sellers[1].email],
        name: 'CodeSnippets Hub',
        description: 'Platform for sharing and discovering code snippets with social features.',
        stage: 'launched',
        domain: 'codesnippetshub.io',
        is_public: 1,
        is_for_sale: 1,
        sale_price: 25000,
        contact_email: sellers[1].email,
        payment_method: 'stripe_connect',
        tech_stack: JSON.stringify(['Vue.js', 'Django', 'PostgreSQL']),
        monthly_revenue: 1200
      },
      {
        user_id: emailToId[sellers[2].email],
        name: 'AI Content Writer',
        description: 'AI-powered content generation tool with GPT integration.',
        stage: 'launched',
        domain: 'aicontentwriter.app',
        is_public: 1,
        is_for_sale: 1,
        sale_price: 75000,
        contact_email: sellers[2].email,
        payment_method: 'stripe_connect',
        tech_stack: JSON.stringify(['Next.js', 'Python', 'FastAPI']),
        monthly_revenue: 8500
      }
    ];

    // Insert projects if not existing by name
    for (const p of projects) {
      const exists = await db.query('SELECT id FROM projects WHERE name = $1', [p.name]);
      if (exists.rows.length === 0) {
        await db.query(
          `INSERT INTO projects (user_id, name, description, stage, domain, is_public, is_for_sale, sale_price, contact_email, payment_method, tech_stack, monthly_revenue, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
          [
            p.user_id,
            p.name,
            p.description,
            p.stage,
            p.domain,
            p.is_public,
            p.is_for_sale,
            p.sale_price,
            p.contact_email,
            p.payment_method,
            p.tech_stack,
            p.monthly_revenue
          ]
        );
        console.log(`Seeded project: ${p.name}`);
      } else {
        console.log(`Project already exists, skipping: ${p.name}`);
      }
    }

    console.log('✅ Enhanced projects seeding complete.');
  } catch (e) {
    console.error('Seeding error:', e);
  } finally {
    process.exit(0);
  }
}

seedEnhancedProjects();