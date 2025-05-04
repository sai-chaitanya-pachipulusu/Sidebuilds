# SideBuilds.space Setup Guide

This guide provides detailed instructions for setting up the complete SideBuilds.space application, including the database, backend, and frontend services.

## Database Setup (CockroachDB)

### Local Development
1. **Configure CockroachDB locally**:
   ```bash
   # Start a single-node CockroachDB cluster
   cd cockroach/cockroach-v25.1.5.windows-6.2-amd64/bin
   ./cockroach.exe start-single-node --insecure --listen-addr=localhost:26257 --http-addr=localhost:8080
   ```

2. **Connect to your CockroachDB instance**:
   ```bash
   ./cockroach.exe sql --insecure --host=localhost:26257
   ```

3. **Create a database and user**:
   ```sql
   CREATE DATABASE sidebuilds;
   CREATE USER sidebuilds_user WITH PASSWORD 'your_secure_password';
   GRANT ALL ON DATABASE sidebuilds TO sidebuilds_user;
   ```

4. **Initialize the database schema**:
   ```bash
   # From the project root directory
   cd cockroach/cockroach-v25.1.5.windows-6.2-amd64/bin
   ./cockroach.exe sql --insecure --host=localhost:26257 --database=sidebuilds < ../../database/schema.sql
   
   # Optionally, load seed data
   ./cockroach.exe sql --insecure --host=localhost:26257 --database=sidebuilds < ../../database/seed.sql
   ```

### Production Setup (CockroachDB Cloud)
1. **Create a CockroachDB Cloud account** at https://cockroachlabs.cloud/
2. **Create a new CockroachDB Serverless cluster**
3. **Get your connection string** from the CockroachDB Cloud Console
4. **Initialize the database schema**:
   ```bash
   # Download the latest CA certificate
   curl --create-dirs -o $HOME/.postgresql/root.crt -O https://cockroachlabs.cloud/clusters/[cluster-id]/cert
   
   # Apply the schema (replace with your connection string)
   psql "postgresql://[username]:[password]@[hostname]:26257/defaultdb?sslmode=verify-full&sslrootcert=$HOME/.postgresql/root.crt" -f database/schema.sql
   ```

## Backend Setup (Express.js)

### Local Development
1. **Set up environment variables**:
   Create a `.env` file in the `server` directory with:
   ```
   PORT=5001
   NODE_ENV=development
   JWT_SECRET=your_jwt_secret_key
   DATABASE_URL=postgresql://sidebuilds_user:your_secure_password@localhost:26257/sidebuilds?sslmode=disable
   CLIENT_URL=http://localhost:3000
   LOG_LEVEL=debug
   ```

2. **Install dependencies and start server**:
   ```bash
   cd server
   npm install
   npm run dev  # For development with nodemon
   # OR
   npm start    # For production build
   ```

### Production Deployment (Render)
1. **Create a Render account** at https://render.com/
2. **Connect your GitHub repository** to Render
3. **Create a new Web Service** and select your repository
4. **Configure the service**:
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`
   - Environment variables:
     - `NODE_ENV`: production
     - `PORT`: 5001 (will be overridden by Render)
     - `JWT_SECRET`: [your secure secret]
     - `DATABASE_URL`: [your CockroachDB connection string]
     - `CLIENT_URL`: [your frontend URL]
     - `LOG_LEVEL`: info

5. **Set up auto-deployments**:
   - Enable automatic deployments in the Render dashboard
   - This will deploy your backend whenever you push to the main branch

## Frontend Setup (React)

### Local Development
1. **Set up environment variables**:
   Create a `.env` file in the `client` directory with:
   ```
   REACT_APP_API_URL=http://localhost:5001/api
   REACT_APP_ENV=development
   ```

2. **Install dependencies and start the development server**:
   ```bash
   cd client
   npm install
   npm start
   ```

### Production Deployment (Vercel)
1. **Create a Vercel account** at https://vercel.com/
2. **Install the Vercel CLI** (optional but helpful):
   ```bash
   npm install -g vercel
   ```

3. **Connect your GitHub repository** to Vercel
4. **Configure the deployment**:
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Environment variables:
     - `REACT_APP_API_URL`: [your backend URL]/api
     - `REACT_APP_ENV`: production

5. **Set up a custom domain** (optional):
   - Add your domain in the Vercel project settings
   - Configure DNS settings as instructed by Vercel

## Connecting Everything Together

1. **Update backend environment variables** with your CockroachDB connection and frontend URL
2. **Update frontend environment variables** with your backend API URL
3. **Deploy both services** and ensure they can communicate with each other
4. **Test the complete application flow**

## Monitoring and Maintenance

### Database Monitoring
- Use the CockroachDB Console to monitor performance
- Set up alerts for high resource usage or errors

### Backend Monitoring
- Use Render's dashboard to monitor your backend service
- Check logs for errors or performance issues

### Frontend Monitoring
- Use Vercel Analytics to track frontend performance
- Monitor web vitals and user experience metrics

## Troubleshooting

### Database Issues
- Check connection strings and SSL certificate configuration
- Verify database user permissions
- Check for connectivity issues between your backend and database

### Backend Issues
- Check Render logs for errors
- Verify environment variables are set correctly
- Test API endpoints with Postman or similar tools

### Frontend Issues
- Check browser console for errors
- Verify API calls are correctly configured
- Test with different browsers to identify browser-specific issues

## Backup and Recovery

### Database Backups
- CockroachDB Cloud: Automatic backups are enabled
- Self-hosted: Set up scheduled backups using:
  ```bash
  ./cockroach.exe backup DATABASE sidebuilds TO 'backup-location' AS OF SYSTEM TIME '-10s'
  ```

## Security Considerations
- Never commit sensitive credentials to your repository
- Use environment variables for all secrets
- Keep all packages updated to address security vulnerabilities
- Implement rate limiting on your API endpoints
- Use HTTPS for all connections 