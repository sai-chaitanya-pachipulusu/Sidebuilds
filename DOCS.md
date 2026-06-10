# 📚 SideBuilds Complete Documentation

> This file consolidates all technical documentation for the SideBuilds platform.
> Last updated: December 18, 2025

---

## Table of Contents

1. [Quick Start](#-quick-start)
2. [Architecture Overview](#-architecture-overview)
3. [API Reference](#-api-reference)
4. [Database Schema](#-database-schema)
5. [Payment System](#-payment-system)
6. [Deployment Guide](#-deployment-guide)
7. [Testing](#-testing)
8. [Security](#-security)
9. [Troubleshooting](#-troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL (production) or SQLite (development)
- Stripe account

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd SideProject-Tracker

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/sidebuilds
USE_SQLITE=true  # Set to false for PostgreSQL

# Authentication
JWT_SECRET=your-secret-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# URLs
CLIENT_URL=http://localhost:3000
SERVER_URL=http://localhost:5001
```

### Running Development

```bash
# From root directory
npm run dev
# OR
node dev-start.js
```

- **Frontend**: http://localhost:3002 (or 3001)
- **Backend**: http://localhost:5002

### Test Accounts

Create test accounts locally through the registration page. Seed data for the
optional SQLite dev mode is defined in `server/db.js`. Do not commit real
credentials anywhere in this repository.

---

## 🏗 Architecture Overview

### Technology Stack

#### Frontend

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + Custom Design System
- **Animation**: Framer Motion, GSAP
- **State**: React Context + Local State
- **UI Components**: shadcn/ui primitives

#### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (production) / SQLite (development)
- **Payments**: Stripe Connect
- **Authentication**: JWT + bcrypt

### Project Structure

```
SideProject-Tracker/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── context/      # React context providers
│   │   ├── services/     # API service layer
│   │   └── shadcn/       # UI component library
│   └── public/           # Static assets
├── server/               # Express backend
│   ├── routes/           # API route handlers
│   ├── middleware/       # Express middleware
│   ├── db.js             # Database connection
│   └── server.js         # Main server file
├── database/             # Database migrations & schema
└── docs/                 # Additional documentation
```

### Key Design Patterns

1. **Component Composition**: Modular, reusable React components
2. **Context for Global State**: Auth, Theme, Notifications
3. **Service Layer**: API calls abstracted into service functions
4. **Repository Pattern**: Database access through abstraction layer
5. **Middleware Chain**: Security, auth, logging, error handling

---

## 📡 API Reference

### Authentication

#### POST `/api/auth/login`

```json
// Request
{ "email": "user@example.com", "password": "your-password" }

// Response
{ "token": "eyJ...", "user": { "user_id": "...", "username": "..." } }
```

#### POST `/api/auth/register`

```json
// Request
{ "username": "johndoe", "email": "user@example.com", "password": "securepass" }

// Response
{ "message": "User registered successfully", "user_id": "..." }
```

### Projects

#### GET `/api/projects`

Get user's projects (authenticated).

#### POST `/api/projects`

Create a new project.

#### PUT `/api/projects/:id`

Update an existing project.

#### DELETE `/api/projects/:id`

Delete a project.

#### GET `/api/public/marketplace`

Get public marketplace projects.

Query params: `limit`, `offset`, `category`, `stage`, `min_price`, `max_price`, `sort_by`

### Purchase Requests

#### GET `/api/purchase-requests/seller`

Get purchase requests as a seller.

#### GET `/api/purchase-requests/buyer`

Get purchase requests as a buyer.

#### POST `/api/purchase-requests/projects/:projectId/request`

Create a purchase request.

#### PUT `/api/purchase-requests/:id/status`

Update purchase request status.

**Valid statuses**: `interest_expressed`, `terms_negotiated`, `payment_pending`, `transfer_initiated`, `completed`, `seller_rejected`, `buyer_withdrew_interest`

### Payments

#### GET `/api/payments/stripe-status`

Get Stripe Connect account status.

#### POST `/api/payments/create-checkout-session`

Create Stripe checkout session.

### Notifications

#### GET `/api/notifications`

Get user notifications.

#### PUT `/api/notifications/:id/read`

Mark notification as read.

### Error Responses

| Code | Description      |
| ---- | ---------------- |
| 200  | Success          |
| 201  | Created          |
| 400  | Bad Request      |
| 401  | Unauthorized     |
| 403  | Forbidden        |
| 404  | Not Found        |
| 422  | Validation Error |
| 429  | Rate Limited     |
| 500  | Server Error     |

---

## 🗄 Database Schema

### Core Tables

#### users

```sql
user_id TEXT PRIMARY KEY,
username TEXT UNIQUE NOT NULL,
email TEXT UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
first_name TEXT,
last_name TEXT,
avatar_url TEXT,
bio TEXT,
location TEXT,
is_verified BOOLEAN DEFAULT FALSE,
stripe_account_id TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME
```

#### projects

```sql
project_id TEXT PRIMARY KEY,
owner_id TEXT REFERENCES users(user_id),
name TEXT NOT NULL,
description TEXT,
detailed_description TEXT,
stage TEXT DEFAULT 'idea',
category TEXT,
tech_stack TEXT,  -- JSON array
domain TEXT,
demo_url TEXT,
github_url TEXT,
monthly_revenue INTEGER DEFAULT 0,
sale_price INTEGER DEFAULT 0,
is_public BOOLEAN DEFAULT FALSE,
is_for_sale BOOLEAN DEFAULT FALSE,
view_count INTEGER DEFAULT 0,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME
```

#### purchase_requests

```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
project_id TEXT REFERENCES projects(project_id),
buyer_id TEXT REFERENCES users(user_id),
seller_id TEXT REFERENCES users(user_id),
status TEXT DEFAULT 'interest_expressed',
price INTEGER,
message TEXT,
buyer_commitments TEXT,  -- JSON
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME
```

#### notifications

```sql
notification_id TEXT PRIMARY KEY,
user_id TEXT REFERENCES users(user_id),
type TEXT NOT NULL,
title TEXT NOT NULL,
message TEXT,
is_read BOOLEAN DEFAULT FALSE,
action_url TEXT,
related_project_id TEXT,
related_transaction_id TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

---

## 💳 Payment System

### Stripe Connect Flow

1. **Seller Onboarding**: Sellers connect Stripe account
2. **Checkout Session**: Buyer initiates payment
3. **Escrow**: Funds held until transfer complete
4. **Asset Transfer**: Seller transfers project assets
5. **Release**: Funds released to seller (minus 5% platform fee)

### Webhook Events

- `checkout.session.completed` - Payment successful
- `payment_intent.succeeded` - Payment confirmed
- `transfer.created` - Funds transferred to seller

### Escrow States

- `escrow_pending` - Funds held
- `escrow_released` - Funds released to seller
- `escrow_disputed` - Dispute initiated
- `escrow_refunded` - Funds returned to buyer

---

## 🚀 Deployment Guide

### Vercel (Frontend)

```bash
cd client
vercel --prod
```

### Render (Backend)

1. Create new Web Service
2. Connect GitHub repository
3. Set environment variables
4. Deploy

### Docker

```bash
# Build
docker build -t sidebuilds .

# Run
docker run -p 5001:5001 sidebuilds
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure PostgreSQL database
- [ ] Set all environment variables
- [ ] Enable Stripe live mode
- [ ] Configure CORS for production domain
- [ ] Set up SSL certificates
- [ ] Configure CDN for static assets
- [ ] Enable error monitoring (Sentry)

---

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Workflow tests
node deep-workflow-test.js
```

### Test Coverage Areas

- Authentication flow
- Project CRUD operations
- Purchase request workflow
- Payment processing
- Notification system

---

## 🔒 Security

### Authentication

- JWT tokens with 24-hour expiration
- bcrypt password hashing (10 rounds)
- HTTP-only cookies for refresh tokens

### API Security

- Rate limiting on sensitive endpoints
- CORS configuration
- Helmet middleware for security headers
- Input validation and sanitization

### Payment Security

- Stripe handles all card data (PCI compliant)
- Webhook signature verification
- Idempotent payment processing

---

## 🔧 Troubleshooting

### Common Issues

#### "Cannot connect to database"

- Check DATABASE_URL is correct
- Ensure PostgreSQL is running
- For SQLite, check file permissions

#### "Authentication failed"

- Clear localStorage and cookies
- Check JWT_SECRET matches between frontend/backend
- Verify token hasn't expired

#### "Stripe payment failed"

- Check Stripe keys are correct (test vs live)
- Verify webhook secret
- Check Stripe dashboard for error details

#### "CORS errors"

- Verify CLIENT_URL environment variable
- Check CORS configuration in server

### Debug Mode

```bash
# Enable debug logging
DEBUG=* node dev-start.js
```

### Logs Location

- Server logs: Console output
- Client errors: Browser console
- Stripe events: Stripe Dashboard > Developers > Events

---

## 📞 Support

For issues or questions:

1. Check this documentation
2. Review GitHub Issues
3. Contact the development team

---

**Last updated: December 18, 2025**
