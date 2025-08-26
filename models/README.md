# Database Models

This directory contains schema documentation for our PostgreSQL database.
The actual schema is defined in the `/database` directory as SQL migrations.

## Why no ORM models here?

We're using raw SQL queries with PostgreSQL for:
- Better performance
- More control over queries
- Direct SQL optimization
- Simpler deployment

The database schema is managed through SQL migrations in `/database/*.sql` files. 