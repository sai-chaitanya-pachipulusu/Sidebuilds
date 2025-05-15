# SideBuilds.space

A platform for tracking, sharing, and selling side projects. Built with React, Node.js, Express, and CockroachDB.

## Features

- 🚀 Track your side projects from idea to launch
- 🔄 Monitor progress and update project status
- 🌐 Publish projects to a public directory
- 🛒 List projects for sale in the marketplace
- 🤝 Secure request-to-buy workflow: Buyers request, sellers approve, then payment occurs.
- 💳 Stripe-powered payments with automated platform fee deduction.
- 💸 Direct payouts to sellers via Stripe Connect.
- 🌃 Consistent Dark Theme with subtle animated background for enhanced UI/UX.
- 📱 Fully responsive design

## Project Transfer System

The SideBuilds platform includes a robust, multi-step system for project purchases and asset transfers:

### Purchase Workflow

The new workflow ensures clarity and commitment from both buyer and seller:

1.  **Buyer Initiates Purchase Request**: On a project listing, a potential buyer can request to purchase the project, agreeing to preliminary terms.
2.  **Seller Review & Action**: The project seller is notified and can review the request. They can then:
    *   **Accept**: Signaling they agree to sell to this buyer under the listed terms.
    *   **Reject**: If they do not wish to proceed with the sale to this buyer.
3.  **Payment (If Accepted)**: Once a seller accepts, the buyer is notified and can proceed to make the payment through Stripe.
4.  **Automated Fee Deduction**: The platform's commission fee (e.g., 5%) is automatically deducted during the Stripe transaction.
5.  **Notification & Next Steps**: Both parties are notified upon successful payment, and the process moves to asset transfer.

### Asset Transfer Process

Once payment is confirmed, the focus shifts to the secure transfer of project assets. This process is tracked on a dedicated Project Transfer Page:

1.  **Transfer Status Tracking**: Both buyer and seller can view the current status of the asset transfer.
2.  **Seller Actions**: The seller updates the status as they transfer assets (e.g., "Assets Transferred, Awaiting Buyer Confirmation") and can add notes or instructions for the buyer.
3.  **Transfer Checklist (Conceptual)**: While not individual checkboxes, the transfer implies the delivery of agreed-upon assets, such as:
    *   Code Repository Access
    *   Domain Transfer (if applicable)
    *   Databases, customer lists, brand assets, etc.
    *   Documentation
4.  **Buyer Confirmation**: Once the buyer has received and verified all assets, they confirm receipt on the Transfer Page. This marks the transaction as complete.

### Verification Period & Support

- All purchases include a 7-day period post-buyer-confirmation for addressing any immediate, unforeseen issues with the received assets. (This relies on clear Terms & Conditions).
- Clear communication channels (e.g., using contact details, or a future in-app messaging system) are encouraged during the transfer.

### UI Elements for the New Flow

- **Project Detail Page**: "Request to Purchase" button for potential buyers.
- **Dashboard - Seller View**: Section for "Incoming Purchase Requests" with Accept/Reject actions.
- **Dashboard - Buyer View**: Section for "My Purchase Requests" showing status, and a "Proceed to Payment" button when a request is accepted by the seller.
- **Project Transfer Page**: Dedicated page accessible from the buyer/seller dashboard to track asset transfer, update status (seller), and confirm receipt (buyer).

To manage or track a purchase/sale, navigate to your Dashboard.

## Stripe Connect for Sellers

The platform requires all sellers to connect their Stripe accounts before listing projects for sale. This enables:

- Direct fund transfers to sellers when their projects are purchased
- Automated marketplace commission handling
- Secure payment processing
- Compliance with financial regulations

For detailed information on how to connect your Stripe account and start selling, see the [Stripe Connect Guide](docs/stripe-connect-guide.md).

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
- Stripe Connect
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
     
     # Stripe Connect Configuration
     STRIPE_CONNECT_ACCOUNT_TYPE=express
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

## Documentation

- [Deployment Guide](docs/deployment-guide.md)
- [Stripe Integration Guide](docs/stripe-integration-guide.md)
- [Stripe Connect Guide](docs/stripe-connect-guide.md)
- [Project Transfer Guide](docs/project-transfer-guide.md)

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
├── docs/                 # Documentation
│   ├── deployment-guide.md
│   ├── stripe-integration-guide.md
│   ├── stripe-connect-guide.md
│   └── project-transfer-guide.md
└── scripts/              # Utility scripts
    └── deploy-database.js # Database deployment script
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 