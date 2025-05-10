# SideBuilds.space

A platform for tracking, sharing, and selling side projects. Built with React, Node.js, Express, and CockroachDB.

## Features

- 🚀 Track your side projects from idea to launch
- 🔄 Monitor progress and update project status
- 🌐 Publish projects to a public directory
- 💲 List projects for sale in the marketplace
- 💳 Process payments with Stripe integration
- 🌓 Dark/light theme support
- 📱 Fully responsive design

## Project Transfer System

The SideProject Tracker includes a comprehensive project transfer system for handling the purchase and transfer of projects:

### Purchase Workflow

1. **Buying a Project**: Users can purchase projects through the marketplace using Stripe integration
2. **Payment Processing**: The system handles payments with a 5% commission fee
3. **Post-Purchase UI**: Purchased projects appear in the buyer's dashboard with distinct highlighting

### Transfer Process

The transfer process is semi-manual and includes the following steps:

1. **Transfer Status Tracking**: A dedicated transfer status page for each purchased project
2. **Transfer Checklist**: Three key transfer components tracked individually:
   - Code Repository Access
   - Domain Transfer
   - Assets & Documentation

### Verification Period

- All purchased projects have a 7-day verification period
- During this time, buyers can confirm all project assets have been properly transferred
- A visual countdown timer shows the remaining verification days

### UI Elements

- **Dashboard Indicators**: Recently purchased projects are highlighted
- **Transfer Status Button**: Quick access to view transfer details from the dashboard
- **Status Badges**: Clear pending/complete status indicators for each transfer item
- **Seller Contact**: Direct access to seller's contact information

To view the transfer status of a purchased project, click the "Transfer Status" button in your dashboard.

## Tech Stack

### Frontend
- React
- React Router
- Axios
- Stripe.js
- CSS (with custom theming)

### Backend
- Node.js
- Express
- JWT Authentication
- Stripe API
- PostgreSQL (CockroachDB)

### Deployment
- CockroachDB (Database)
- Render (Backend hosting)
- Vercel (Frontend hosting)
- Custom domain: www.sidebuilds.space

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm
- PostgreSQL or CockroachDB
- Stripe Account (for payment processing)

### Local Development

1. **Clone the repository**
   ```
   git clone https://github.com/yourusername/sidebuilds.git
   cd sidebuilds
   ```

2. **Set up environment variables**
   - Create a `.env` file in the server directory with the following variables:
     ```
     # Database Connection
     DATABASE_URL=your_cockroachdb_connection_string
     DB_SSL=true

     # JWT Authentication
     JWT_SECRET=your_jwt_secret_key_here

     # Server Configuration
     PORT=5001
     NODE_ENV=development

     # Client URL - Important for Stripe redirects
     CLIENT_URL=http://localhost:3001

     # Stripe Configuration - Replace with your actual keys
     STRIPE_SECRET_KEY=your_stripe_secret_key_here
     STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
     STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

     # Commission Rate (%)
     COMMISSION_RATE=5
     ```
   
   - Create a `.env` file in the client directory with the following variables:
     ```
     # API Configuration
     REACT_APP_API_URL=http://localhost:5001/api

     # Stripe Configuration - Replace with your actual publishable key
     REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
     ```

3. **Install dependencies**
   ```
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

4. **Set up the database**
   - Create a CockroachDB instance or use PostgreSQL locally
   - Run the schema file: `psql -U youruser -d yourdatabase -f database/schema.sql`
   - Optionally run the seed file: `psql -U youruser -d yourdatabase -f database/seed.sql`

5. **Set up Stripe**
   - Create a Stripe account at https://stripe.com
   - Get your API keys from the Stripe Dashboard
   - Set up a webhook endpoint in test mode pointing to `http://localhost:5001/api/payments/webhook`
   - Use the webhook signing secret in your server `.env` file

6. **Start the development servers**
   ```
   # Start the backend server (from the server directory)
   npm run dev

   # Start the frontend server (from the client directory)
   npm run dev
   ```

7. **Access the application**
   - Backend: http://localhost:5001
   - Frontend: http://localhost:3001  # Note: Using port 3001 for client

## Testing Stripe Payments

For testing Stripe payments, use the following test card numbers:

| Card Type | Number | Description |
|-----------|--------|-------------|
| Visa (success) | 4242 4242 4242 4242 | Successful payment |
| Visa (decline) | 4000 0000 0000 0002 | Generic decline |

For more test cards and options, see the [Stripe Testing documentation](https://stripe.com/docs/testing).

## Deployment

For detailed deployment instructions, please see [docs/deployment-guide.md](docs/deployment-guide.md).

## Project Structure

```
├── client/               # React frontend
│   ├── public/           # Static files
│   └── src/
│       ├── components/   # Reusable components
│       ├── context/      # React context providers
│       ├── pages/        # Page components
│       ├── services/     # API service functions
│       └── utils/        # Utility functions
├── server/               # Express backend
│   ├── middleware/       # Express middleware
│   ├── routes/           # API routes
│   ├── config/           # Configuration files
│   ├── db.js             # Database connection
│   └── index.js          # Server entry point
├── database/             # Database scripts
│   ├── schema.sql        # Database schema
│   └── seed.sql          # Sample data
└── scripts/              # Utility scripts
    └── deploy-database.js # Database deployment script
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 