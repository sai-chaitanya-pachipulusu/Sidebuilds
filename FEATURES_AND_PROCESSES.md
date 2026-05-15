# SideBuilds - Features & Processes Documentation

> A practical guide to the functionality and workflows of the SideBuilds platform, written in plain English.

---

## Table of Contents

1. [Core Platform Features](#core-platform-features)
2. [User Registration & Authentication](#user-registration--authentication)
3. [Project Management](#project-management)
4. [Marketplace & Discovery](#marketplace--discovery)
5. [Buying Process](#buying-process)
6. [Selling Process](#selling-process)
7. [Transaction Management](#transaction-management)
8. [Payment System](#payment-system)
9. [Communication & Notifications](#communication--notifications)
10. [Analytics & Insights](#analytics--insights)
11. [AI-Powered Features](#ai-powered-features)
12. [Security & Trust](#security--trust)
13. [Technical Infrastructure](#technical-infrastructure)
14. [Support & Troubleshooting](#support--troubleshooting)

---

## Core Platform Features

### What is SideBuilds?
SideBuilds is a specialized marketplace for buying and selling side projects in the $5,000 to $50,000 range. It offers:

- **Verified Progression**: Tracks project lifecycle from idea to exit
- **AI Valuation**: Provides objective project scoring and market analysis
- **Secure Transactions**: Built-in escrow and asset transfer management
- **Developer-Friendly**: Git-integrated, tech stack-aware platform

---

## User Registration & Authentication

### Creating an Account
1. User provides name, email, and password
2. System validates input and creates user profile
3. Welcome email sent with verification link
4. User verifies email to complete registration

### Logging In
1. User enters email and password
2. System validates credentials and issues JWT token
3. Token stored in localStorage for session persistence
4. Auto-login on subsequent visits

### Password Recovery
1. User requests password reset
2. System sends password reset link via email
3. User creates new password and confirms
4. System updates password hash in database

---

## Project Management

### Creating a Project
1. Seller navigates to "My Projects" page
2. Clicks "Create New Project"
3. Fills out project details (name, description, stage, category)
4. Adds tech stack, revenue information, and GitHub URL
5. Uploads project files and images
6. Clicks "Save" to create project listing

### Editing a Project
1. Seller navigates to project detail page
2. Clicks "Edit Project"
3. Updates project information
4. Changes saved automatically or via "Save" button
5. System notifies followers of updates

### Deleting a Project
1. Seller navigates to project detail page
2. Clicks "Delete Project"
3. Confirms deletion in modal
4. System removes project from marketplace
5. Notifies interested buyers of removal

---

## Marketplace & Discovery

### Browsing Projects
1. User navigates to marketplace page
2. Views grid/list of available projects
3. Projects sorted by default (newest first)
4. Can switch between grid and list views

### Searching Projects
1. User enters keywords in search bar
2. System searches project names, descriptions, and tech stacks
3. Results displayed in real-time as user types
4. Search queries debounced to prevent API overload

### Filtering Projects
1. User opens filter panel
2. Applies filters (stage, price range, tech stack, category)
3. Results updated instantly on client-side
4. Filter combinations saved for future sessions

### Sorting Projects
1. User selects sorting option from dropdown
2. Projects re-sorted based on selected criteria:
   - Newest: By creation date
   - Price: Low to high or high to low
   - Revenue: Monthly revenue
   - AI Score: Certified Build Score

---

## Buying Process

### Finding a Project
1. Buyer browses marketplace
2. Uses search and filters to find matching projects
3. Views project details and AI analysis
4. Reads seller profile and reviews

### Expressing Interest
1. Buyer navigates to project detail page
2. Clicks "Express Interest" button
3. Enters message and initial offer amount
4. System creates purchase request and notifies seller
5. Buyer receives confirmation email

### Negotiating Terms
1. Seller responds to interest with counteroffer
2. Buyer and seller communicate via in-app chat
3. Negotiation continues until terms agreed upon
4. System tracks all messages and offer history

### Completing Purchase
1. Buyer accepts final offer
2. System creates Stripe checkout session
3. Buyer completes payment
4. Funds held in escrow until asset transfer
5. System sends payment confirmation emails

---

## Selling Process

### Listing a Project
1. Seller completes project creation process
2. Sets project to "For Sale" status
3. Enters sale price and payment terms
4. System calculates AI valuation and score
5. Project appears in marketplace

### Managing Offers
1. Seller receives notification of new offer
2. Views offer details and buyer profile
3. Accepts, rejects, or counters the offer
4. System updates purchase request status
5. Notifies buyer of seller's response

### Completing Sale
1. Seller accepts buyer's offer
2. System guides seller through asset transfer process
3. Seller provides code, domain, and other assets
4. Buyer confirms receipt of assets
5. Funds released from escrow to seller

---

## Transaction Management

### Purchase Request Status
- **Interest Expressed**: Buyer has shown interest
- **Seller Accepted**: Seller agrees to negotiate
- **Payment Locked**: Funds held in escrow
- **Transfer Completed**: Assets delivered to buyer
- **Funds Released**: Payment transferred to seller

### Asset Transfer Process
1. Seller prepares project assets
2. Uploads code repository, domain transfer instructions, etc.
3. Buyer reviews and verifies assets
4. Buyer confirms receipt
5. System updates transaction status

### Refund & Dispute Process
1. Either party raises a dispute
2. Platform reviews case and mediates
3. If dispute resolved, transaction continues
4. If not, funds refunded to buyer
5. Project relisted for sale

---

## Payment System

### Stripe Connect Onboarding
1. Seller navigates to payment settings
2. Clicks "Connect Stripe Account"
3. Redirected to Stripe Connect onboarding
4. Completes KYC and bank account verification
5. Returns to SideBuilds with connected account

### Payment Methods
- Credit/debit cards
- Stripe Connect payouts
- Multiple currency support

### Commission Structure
- 5% platform fee on completed sales
- No listing fees
- Pro subscription: $29/month (unlimited listings)
- Enterprise: $99/month (white-label, API access)

---

## Communication & Notifications

### In-App Messaging
1. Buyer and seller access chat from purchase request page
2. Send messages with typing indicators
3. Read receipts show message status
4. Messages stored and searchable

### Email Notifications
- Welcome email after registration
- Project update notifications
- Offer status changes
- Payment confirmations
- Asset transfer reminders

### In-App Notifications
1. Notifications appear as toast messages
2. Central notification center in dashboard
3. Mark notifications as read/unread
4. Filter notifications by type

---

## Analytics & Insights

### Dashboard Metrics
- **Portfolio Value**: Total worth of user's projects/purchases
- **Conversion Rate**: Percentage of views to offers
- **Revenue Growth**: Month-over-month changes
- **Engagement Score**: User interaction metrics

### Market Insights
- **Hot Categories**: Most active project categories
- **Price Benchmarks**: Average prices by category/stage
- **Opportunity Scores**: High-growth potential projects
- **Trending Topics**: Popular technologies/business models

### Project Analytics
- **View Count**: Total and unique views
- **Time on Page**: Average visit duration
- **Offer Rate**: Percentage of views resulting in offers
- **Revenue Analysis**: Time-series revenue data

---

## AI-Powered Features

### Certified Build Score
- 0-100 score based on multiple factors
- Breakdown: Revenue (30%), Technical Quality (25%), Market Demand (20%), Growth Potential (15%), Documentation (10%)
- Updated whenever project details change

### AI Valuation
- Estimates market value range
- Considers comparable projects and market trends
- Provides confidence score for valuation

### AI Idea Assist
- Generates milestone timelines based on project stage
- Suggests appropriate tech stacks
- Estimates development effort
- Provides market positioning advice

### Deep Analysis Reports
- Comprehensive project evaluation
- Risk assessment and mitigation suggestions
- Competitive landscape analysis
- Growth opportunity identification

---

## Security & Trust

### Authentication Security
- JWT tokens with 24-hour expiration
- bcrypt password hashing (10 rounds)
- HTTP-only cookies for refresh tokens
- Role-based access control

### Payment Security
- Stripe handles all card data (PCI compliant)
- Webhook signature verification
- Idempotent payment processing
- Escrow protection for buyers

### Data Protection
- File upload validation and sanitization
- Secure file storage with access controls
- Encrypted communication (HTTPS)
- Regular security audits

---

## Technical Infrastructure

### Frontend Technologies
- React 18 + Vite for fast development
- Tailwind CSS for responsive design
- Framer Motion for animations
- Socket.IO for real-time communication

### Backend Technologies
- Node.js + Express for server-side logic
- PostgreSQL for production database
- SQLite for development
- Stripe Connect for payments

### Deployment
- Vercel for frontend hosting
- Render for backend deployment
- Docker for containerization

---

## Support & Troubleshooting

### Common Issues

#### Cannot Connect to Database
- Check database connection string
- Verify database server is running
- Check file permissions for SQLite

#### Authentication Failed
- Clear localStorage and cookies
- Verify JWT secret configuration
- Check token expiration

#### Stripe Payment Failed
- Verify Stripe keys (test vs live mode)
- Check webhook secret configuration
- Review Stripe dashboard for error details

#### CORS Errors
- Verify client URL configuration
- Check CORS middleware settings

### Debug Mode
```bash
# Enable debug logging
DEBUG=* node dev-start.js
```

---

This documentation covers all core features and processes of the SideBuilds platform in plain English, focusing on practical functionality and user workflows rather than technical implementation details.
