# SideProject Tracker Server

This is the backend server for the SideProject Tracker application.

## Running the Server

There are two ways to start the server:

### 1. Using the Server Runner (Recommended)

The server runner provides automatic restart capabilities and better error handling:

```bash
node run-server.js
```

Features of the server runner:
- Automatically restarts the server if it crashes
- Handles port conflicts by trying alternative ports
- Provides detailed logging
- Implements safeguards against rapid restart loops

### 2. Direct Server Startup

For development or debugging, you can start the server directly:

```bash
node index.js
```

## Environment Variables

The server uses the following environment variables:

- `PORT`: The port number for the server (default: 5001)
- `NODE_ENV`: Environment mode ('development' or 'production')
- `CLIENT_URL`: URL of the client application for CORS (in production)
- `JWT_SECRET`: Secret key for JWT token generation (required)
- `DATABASE_URL`: Database connection string
- `STRIPE_SECRET_KEY`: Stripe API secret key
- `STRIPE_PUBLISHABLE_KEY`: Stripe API publishable key
- `STRIPE_WEBHOOK_SECRET`: Secret for Stripe webhooks

## Troubleshooting

### Port Already in Use

If you see an error about the port being in use:
- The server runner will automatically try the next port number
- If running the server directly, change the PORT environment variable:
  ```bash
  PORT=5002 node index.js
  ```

### Database Connection Issues

If the server cannot connect to the database:
- Check that your database is running
- Verify the DATABASE_URL environment variable
- The server implements automatic reconnection logic 