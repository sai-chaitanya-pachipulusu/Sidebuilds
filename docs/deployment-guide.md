# Deployment Guide for SideBuilds.space

This guide provides step-by-step instructions for deploying the Side Project Tracker application to production using CockroachDB, Render, and Vercel with a custom domain (sidebuilds.space).

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Database Setup with CockroachDB](#database-setup-with-cockroachdb)
3. [Backend Deployment with Render](#backend-deployment-with-render)
4. [Frontend Deployment with Vercel](#frontend-deployment-with-vercel)
5. [Custom Domain Configuration](#custom-domain-configuration)
6. [Environment Variables](#environment-variables)
7. [Database Schema Migration](#database-schema-migration)
8. [Testing the Deployment](#testing-the-deployment)
9. [Maintenance and Monitoring](#maintenance-and-monitoring)

## Environment Setup

Before deploying, you'll need accounts on the following platforms:

- [CockroachDB Cloud](https://cockroachlabs.cloud/signup)
- [Render](https://render.com)
- [Vercel](https://vercel.com)
- Domain registrar for sidebuilds.space (like Namecheap, GoDaddy, etc.)

## Database Setup with CockroachDB

1. **Create a CockroachDB Cloud account**:
   - Go to [CockroachDB Cloud](https://cockroachlabs.cloud/signup) and sign up
   - Choose the free tier for development or select a paid plan for production

2. **Create a new cluster**:
   - Click "Create Cluster"
   - Choose "Serverless" for the free tier or a dedicated cluster for production
   - Select a cloud provider (GCP, AWS, Azure) and a region close to your users
   - Name your cluster "sideprojects-cluster" (or a name of your choice)
   - Click "Create Cluster"

3. **Set up database**:
   - Once the cluster is created, go to "SQL Users" and create a new SQL user
   - Note down the username and password
   - Go to "Connect" dialog and select "Connection String"
   - Copy the connection string and replace the placeholder username and password

4. **Create database tables**:
   - Download and install [CockroachDB SQL client](https://www.cockroachlabs.com/docs/stable/install-cockroachdb.html)
   - Use the connection string to connect to your database:
     ```
     cockroach sql --url "your-connection-string"
     ```
   - Create the required tables using the schema in the `database/schema.sql` file

## Backend Deployment with Render

1. **Create a Web Service on Render**:
   - Sign in to Render and click "New +"
   - Select "Web Service"
   - Connect your GitHub repository
   - Give your service a name (e.g., "sidebuilds-api")
   - Set the root directory to `/server`
   - Set the build command: `npm install`
   - Set the start command: `npm start`
   - Select the appropriate plan (Free or Starter)
   - Add all environment variables from the `.env.example` file
   - Click "Create Web Service"

2. **Set Environment Variables**:
   - In your Render dashboard, go to the web service
   - Click on "Environment" tab
   - Add the following variables:
     - `DATABASE_URL`: Your CockroachDB connection string
     - `JWT_SECRET`: A strong random string (use a generator)
     - `NODE_ENV`: "production"
     - `PORT`: Leave as is (Render will set this)
     - `CLIENT_URL`: Your Vercel frontend URL or custom domain
     - Add any other variables from `.env.example`

## Frontend Deployment with Vercel

1. **Deploy to Vercel**:
   - Sign in to Vercel and click "New Project"
   - Import your repository
   - Select the root directory for the client: `/client`
   - Configure the project:
     - Framework Preset: Create React App
     - Build Command: `npm run build`
     - Output Directory: `build`
   - Add environment variables:
     - `REACT_APP_API_URL`: Your Render backend URL + "/api"
   - Click "Deploy"

2. **Configure Build Settings**:
   - Go to "Settings" > "Build & Development Settings"
   - Make sure the Framework Preset is set to "Create React App"
   - Set the Production Branch to your main branch

## Custom Domain Configuration

1. **Purchase the domain**:
   - Buy "sidebuilds.space" from your preferred domain registrar

2. **Set up DNS for Backend (Render)**:
   - In your domain registrar, create a subdomain "api.sidebuilds.space"
   - Add a CNAME record pointing to your Render service URL
   - In Render, go to your web service settings
   - Under "Custom Domain," add "api.sidebuilds.space"
   - Verify the domain

3. **Set up DNS for Frontend (Vercel)**:
   - In Vercel, go to your project settings
   - Under "Domains," add "sidebuilds.space" and "www.sidebuilds.space"
   - Follow Vercel's instructions to configure DNS records with your registrar
   - Wait for DNS propagation (can take up to 48 hours)

4. **Update Environment Variables**:
   - In Render, update `CLIENT_URL` to "https://sidebuilds.space"
   - In Vercel, update `REACT_APP_API_URL` to "https://api.sidebuilds.space/api"

## Environment Variables

Make sure you have the following environment variables set up:

### Backend (Render)
```
DATABASE_URL=postgresql://your-cockroachdb-connection-string
JWT_SECRET=your-secure-jwt-secret
NODE_ENV=production
CLIENT_URL=https://sidebuilds.space
```

### Frontend (Vercel)
```
REACT_APP_API_URL=https://api.sidebuilds.space/api
```

## Database Schema Migration

To set up your database schema:

1. Connect to your CockroachDB instance
2. Run the following SQL commands:

```sql
-- Create schema for Side Project Tracker

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    stage VARCHAR(20) DEFAULT 'idea', -- idea, planning, mvp, development, launched, on_hold
    github_url TEXT,
    domain VARCHAR(255),
    is_public BOOLEAN DEFAULT FALSE,
    is_for_sale BOOLEAN DEFAULT FALSE,
    sale_price DECIMAL(10, 2) DEFAULT 0.00,
    owner_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    owner_username VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project transactions table
CREATE TABLE IF NOT EXISTS project_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(project_id) ON DELETE SET NULL,
    seller_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, refunded
    payment_method VARCHAR(50),
    payment_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Testing the Deployment

After completing all the above steps:

1. **Test the backend API**:
   - Visit `https://api.sidebuilds.space/` to check if the API is running
   - You should see a message saying "Side Project Tracker API is running!"

2. **Test the frontend**:
   - Visit `https://sidebuilds.space`
   - Try signing up for a new account
   - Create a project
   - Verify that the project appears on your dashboard

3. **Test the whole flow**:
   - Create a project and mark it as public
   - Check the public projects page to see if it appears
   - Create a project for sale and check the marketplace

## Maintenance and Monitoring

1. **Monitor your apps**:
   - Set up alerts in Render and Vercel for outages
   - Regularly check the logs for any errors

2. **Database backups**:
   - CockroachDB Cloud automatically creates backups
   - You can also set up additional backup strategies

3. **Updates**:
   - Regularly update your dependencies
   - Test updates in a staging environment before deploying to production

4. **Performance**:
   - Monitor API response times
   - Optimize database queries if needed
   - Consider adding caching for frequently accessed data 