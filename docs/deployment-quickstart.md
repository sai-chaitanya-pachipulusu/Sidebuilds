# Quick Deployment Guide for SideBuilds.space

This guide provides concise instructions to deploy your SideProject Tracker application to production. For detailed setup and development instructions, refer to the full [setup guide](./setup-guide.md).

## Prerequisites

- GitHub account with repository containing your SideBuilds.space project
- CockroachDB Cloud account (or self-hosted CockroachDB instance)
- Render.com account (for backend hosting)
- Vercel account (for frontend hosting)

## Step 1: Database Setup (CockroachDB Cloud)

1. **Create a Serverless Cluster:**
   - Go to [CockroachDB Cloud](https://cockroachlabs.cloud/)
   - Create a new Serverless Cluster (Free tier available)
   - Choose your cloud provider and region (close to your backend deployments)

2. **Get Connection String:**
   - From your cluster overview page, click "Connect"
   - Select "Connection String" and note it for later use

3. **Initialize Database:**
   - Use the connection string to apply your schema:
   ```bash
   psql "your_connection_string" -f database/schema.sql
   ```

## Step 2: Backend Deployment (Render)

1. **Create a New Web Service:**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configure the Service:**
   - **Name:** sidebuilds-api
   - **Root Directory:** ./
   - **Build Command:** cd server && npm install
   - **Start Command:** cd server && npm start
   - **Environment Variables:**
     - `NODE_ENV=production`
     - `JWT_SECRET=[generate a secure random string]`
     - `DATABASE_URL=[your CockroachDB connection string]`
     - `LOG_LEVEL=info`
     - `CLIENT_URL=[leave blank for now, will update after frontend deployment]`

3. **Deploy:**
   - Click "Create Web Service"
   - Note the deployment URL (e.g., `https://sidebuilds-api.onrender.com`)

## Step 3: Frontend Deployment (Vercel)

1. **Create a New Project:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Connect your GitHub repository

2. **Configure Project:**
   - **Framework Preset:** Create React App
   - **Root Directory:** client
   - **Build and Output Settings:** Leave as default
   - **Environment Variables:**
     - `REACT_APP_API_URL=[your Render backend URL]/api`
     - `REACT_APP_ENV=production`

3. **Deploy:**
   - Click "Deploy"
   - Note the deployment URL (e.g., `https://sidebuilds.vercel.app`)

## Step 4: Connect Services

1. **Update Backend Client URL:**
   - Go to your Render dashboard, select your backend service
   - Under "Environment" tab, add/update `CLIENT_URL` with your Vercel frontend URL
   - Click "Save Changes" and wait for redeployment

2. **Test the Connection:**
   - Visit your frontend URL
   - Try to register or log in
   - Test creating a new project

## Step 5: Custom Domain (Optional)

1. **Purchase a Domain** (if you don't already have one)

2. **Set Up Frontend Domain:**
   - In Vercel dashboard, go to your project settings
   - Click "Domains" → "Add"
   - Follow the instructions to configure DNS settings

3. **Set Up Backend Domain:**
   - In Render dashboard, go to your service
   - Click "Settings" → "Custom Domain"
   - Follow instructions to configure DNS settings

4. **Update Environment Variables:**
   - Update any URLs in both services to reflect your custom domains

## Troubleshooting Common Issues

- **CORS Errors:** Ensure CLIENT_URL in backend matches your frontend domain exactly
- **Database Connection Issues:** Check your DATABASE_URL and network settings
- **Authentication Problems:** Verify JWT_SECRET is set correctly
- **API Requests Failing:** Check REACT_APP_API_URL format (should end with /api)

## Next Steps

- Set up automatic database backups
- Configure monitoring and alerts
- Implement CI/CD pipelines for automated testing
- Consider adding a CDN for frontend assets

For more detailed information, refer to the [CockroachDB cheatsheet](./cockroachdb-cheatsheet.md) and [setup guide](./setup-guide.md). 