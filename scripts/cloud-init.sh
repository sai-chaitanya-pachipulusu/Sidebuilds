#!/bin/bash

# This script is used during cloud initialization to set up environment variables
# and prepare the application for deployment.

# Exit on error
set -e

echo "Starting deployment setup..."

# Create environment variable files
echo "Creating .env files..."

# For backend
cat > ./server/.env << EOF
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
PORT=${PORT:-5001}
NODE_ENV=production
CLIENT_URL=${CLIENT_URL:-https://sidebuilds.space}
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-""}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-""}
LOG_LEVEL=${LOG_LEVEL:-info}
EOF

# For frontend
cat > ./client/.env << EOF
REACT_APP_API_URL=${API_URL:-https://api.sidebuilds.space/api}
EOF

echo "Environment files created successfully."

# Install dependencies if not in a Docker container
if [ -z "$IN_DOCKER" ]; then
  echo "Installing server dependencies..."
  cd server && npm install
  
  echo "Installing client dependencies..."
  cd ../client && npm install
fi

echo "Setup completed successfully." 