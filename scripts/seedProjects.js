// scripts/seedProjects.js
const db = require('../server/db'); // Adjust path as necessary
const bcrypt = require('bcryptjs');

const SEED_USER_EMAIL = 'seeduser@example.com';
const SEED_USER_PASSWORD = 'seedpassword'; // Use a more secure password in a real scenario

// Function to find or create the seed user
async function findOrCreateSeedUser() {
    console.log(`Checking for seed user: ${SEED_USER_EMAIL}`);
    let userResult = await db.query('SELECT * FROM users WHERE email = $1', [SEED_USER_EMAIL]);
    let userId;

    if (userResult.rows.length > 0) {
        userId = userResult.rows[0].user_id;
        console.log(`Seed user found with ID: ${userId}`);
    } else {
        console.log('Seed user not found, creating...');
        const hashedPassword = await bcrypt.hash(SEED_USER_PASSWORD, 10);
        // Ensure all required fields for user creation are included
        // Assuming 'username' is derived from email or a default can be set
        const username = SEED_USER_EMAIL.split('@')[0];
        const newUserResult = await db.query(
            'INSERT INTO users (username, email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING user_id',
            [username, SEED_USER_EMAIL, hashedPassword]
        );
        userId = newUserResult.rows[0].user_id;
        console.log(`Seed user created with ID: ${userId}`);
    }
    return userId;
}

// Sample project data
const sampleProjects = [
    {
        name: 'Ecoleta - Recycling Points Locator',
        description: 'A platform to connect people with waste collection points efficiently. Built with Node.js, React, and SQLite.',
        stage: 'MVP / Beta',
        domain: 'Sustainability Tech',
        is_public: true,
        is_for_sale: true,
        sale_price: 1500,
        contact_email: SEED_USER_EMAIL,
        payment_method: 'stripe_connect'
    },
    {
        name: 'Proffy - Online Tutoring Marketplace',
        description: 'Connect students with the best online tutors. Features real-time chat and scheduling. Built with TypeScript, Node.js, and React Native.',
        stage: 'Launched',
        domain: 'EdTech',
        is_public: true,
        is_for_sale: false,
        sale_price: null,
        contact_email: SEED_USER_EMAIL,
    },
    {
        name: 'DevFinance - Personal Finance Tracker',
        description: 'A simple application to track income and expenses. Helps users manage their finances effectively. Built with JavaScript, HTML, and CSS.',
        stage: 'Idea / Concept',
        domain: 'FinTech',
        is_public: false,
        is_for_sale: true,
        sale_price: 500,
        contact_email: SEED_USER_EMAIL,
        contact_phone: '123-456-7890',
        payment_method: 'stripe_direct'
    }
];

// Function to seed projects
async function seedProjects() {
    const userId = await findOrCreateSeedUser();
    if (!userId) {
        console.error("Could not find or create seed user. Aborting seed.");
        return;
    }
    
    // Check if user has Stripe account (needed for projects for sale)
    // This might involve more complex logic depending on your app's Stripe setup
    // For simplicity, this seed script assumes Stripe setup is handled elsewhere or not strictly enforced for seeding
    console.log(`Seeding projects for user ID: ${userId}`);

    for (const project of sampleProjects) {
        try {
            console.log(`Inserting project: ${project.name}`);
            await db.query(
                `INSERT INTO projects (owner_id, name, description, stage, domain, is_public, is_for_sale, sale_price, contact_email, contact_phone, payment_method, created_at, updated_at, owner_username)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), $12)`,
                [
                    userId,
                    project.name,
                    project.description,
                    project.stage,
                    project.domain,
                    project.is_public,
                    project.is_for_sale,
                    project.sale_price,
                    project.contact_email,
                    project.contact_phone,
                    project.payment_method,
                    SEED_USER_EMAIL.split('@')[0] // owner_username
                ]
            );
            console.log(`Project '${project.name}' seeded successfully.`);
        } catch (error) {
            if (error.code === '23505') { // unique_violation
                console.warn(`Project '${project.name}' already exists. Skipping.`);
            } else {
                console.error(`Error seeding project '${project.name}':`, error.message);
            }
        }
    }
    console.log('Project seeding complete.');
}

// Function to delete seeded projects (based on owner_id)
async function deleteSeededProjects() {
    console.log(`Finding seed user: ${SEED_USER_EMAIL} to delete projects.`);
    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [SEED_USER_EMAIL]);

    if (userResult.rows.length === 0) {
        console.log('Seed user not found. No projects to delete.');
        return;
    }
    const userId = userResult.rows[0].user_id;
    console.log(`Deleting projects for seed user ID: ${userId}`);

    try {
        const deleteResult = await db.query('DELETE FROM projects WHERE owner_id = $1', [userId]);
        console.log(`Deleted ${deleteResult.rowCount} projects owned by ${SEED_USER_EMAIL}.`);
    } catch (error) {
        console.error('Error deleting seeded projects:', error.message);
    }
}

async function main() {
    const command = process.argv[2]; // Get command: seed or delete

    if (command === 'seed') {
        await seedProjects();
    } else if (command === 'delete') {
        await deleteSeededProjects();
    } else {
        console.log('Please provide a command: "seed" or "delete"');
        console.log('Example: node scripts/seedProjects.js seed');
    }
    
    // Close the database pool (important for script to exit cleanly)
    // Assuming db.js exports the pool as 'pool'
    if (db.pool) {
        await db.pool.end();
        console.log('Database pool closed.');
    } else {
        console.warn('Database pool not found or not exported from db.js. Script might not exit cleanly.');
    }
}

main().catch(err => {
    console.error('Unhandled error in seed script:', err);
    process.exit(1);
});