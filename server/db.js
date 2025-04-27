const { Pool } = require('pg');
require('dotenv').config(); // Load environment variables from .env file

// Check if required environment variables are set
if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_HOST || !process.env.DB_PORT || !process.env.DB_DATABASE) {
    console.error("FATAL ERROR: Database configuration environment variables are missing.");
    console.error("Please ensure DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, and DB_DATABASE are set in your .env file.");
    process.exit(1); // Exit the application if config is missing
}

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to the database:', err.stack);
    } else {
        console.log('Database connected successfully at:', res.rows[0].now);
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool // Export the pool itself if needed for transactions
}; 