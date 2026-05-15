# SideBuilds Complete Platform Documentation

> A comprehensive guide to the SideBuilds platform - a specialized marketplace for buying and selling side projects in the $5k–$50k range.

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Core Features](#core-features)
3. [User Roles & Workflows](#user-roles--workflows)
4. [Buyer Journey](#buyer-journey)
5. [Seller Journey](#seller-journey)
6. [Transaction & Escrow System](#transaction--escrow-system)
7. [AI-Powered Features](#ai-powered-features)
8. [Real-Time Communication](#real-time-communication)
9. [Analytics & Insights](#analytics--insights)
10. [Security & Trust](#security--trust)
11. [Payment System](#payment-system)
12. [Technical Architecture](#technical-architecture)
13. [Deployment & Infrastructure](#deployment--infrastructure)
14. [Testing & Quality Assurance](#testing--quality-assurance)
15. [Troubleshooting & Support](#troubleshooting--support)

---

## Platform Overview

SideBuilds is a lifecycle-driven marketplace designed specifically for the $5k–$50k micro-acquisition market. Unlike traditional listing platforms, SideBuilds acts as a companion throughout a project's journey—from idea to exit—providing verified progression tracking, AI-driven due diligence, and secure transaction management.

### Key Value Propositions

- **For Sellers**: A "GitHub for Business" profile that validates work through technical analysis, not just revenue screenshots. No listing fees and "Open to Offers" testing modes.
- **For Buyers**: Institutional-grade safety tools (escrow, code audits, legal transfer) brought to the micro-market level.
- **The Moat**: Verified Progression tracking provides a tamper-proof history of project development that cannot be faked.

---

## Core Features

### 1. Project Management

- **Lifecycle Tracking**: Tracks projects through stages from Idea → Planning → MVP → Launched → Sold
- **Dynamic Forms**: Smart project creation/editing with conditional fields based on project stage
- **File Management**: Multi-file uploads with progress tracking and type validation
- **Visualization**: 3D tilt project cards with color-coded stage indicators
- **Public/Private Settings**: Control project visibility and sales status

### 2. Marketplace & Discovery

- **High-Performance List View**: Efficient rendering of large project lists with virtualization
- **Advanced Filtering**: Filter by stage, price, tech stack, category, and other criteria
- **Real-Time Search**: Debounced search with instant results
- **Smart Sorting**: Multiple sorting options including AI score, price, revenue, and newest
- **AI Recommendations**: Personalized project suggestions based on user profile and behavior
- **Competitor Analysis**: Interactive dashboard showing market position vs. incumbents

### 3. User Authentication & Authorization

- **Secure Registration/Login**: Credential handling with bcrypt hashing
- **Session Management**: Automatic token refresh and persistence
- **Role-Based Access**: Different permissions for buyers, sellers, and administrators
- **Stripe Connect Integration**: Managed onboarding for sellers to receive payments

### 4. Communication System

- **Real-Time Notifications**: Instant alerts for project updates, offers, and messages
- **In-App Messaging**: Chat system with typing indicators and read receipts
- **Email Notifications**: Transactional emails for key lifecycle events
- **Notification Center**: Centralized hub for managing all notifications

### 5. Payment & Transaction Management

- **Stripe Checkout**: Secure payment processing with session-based transactions
- **Escrow System**: Funds held until asset transfer is complete
- **Transaction Tracking**: Complete payment history and status updates
- **Refund Management**: Process for handling disputes and refunds
- **Commission Calculation**: Automatic 5% platform fee on completed sales

### 6. Analytics & Reporting

- **Dashboard Metrics**: Portfolio value, total views, conversion rates, and ROI calculations
- **Market Insights**: Hot categories, pricing benchmarks, and opportunity scores
- **Project Analytics**: Revenue tracking, view counts, and engagement metrics
- **Performance Reports**: ROI and payback period calculations
- **Certificates & Verification**: Generate and verify certificates for completed sales with unique verification codes

### 7. AI-Powered Features

- **Dual-Layer Valuation**: GPT-4 for qualitative analysis + deterministic algorithm for quantitative scoring
- **Certified Build Score**: 0-100 score based on code quality, market position, and revenue
- **AI Idea Assist**: Auto-generate project details (milestones, tech stack) from stage and category
- **Deep Analysis Reports**: Comprehensive project evaluations including risk assessment
- **Smart Recommendation Engine**: Personalized project recommendations based on user profile and behavior
- **AI Project Scoring**: Dynamic scoring component that visualizes project quality metrics
- **Competitor Analysis Dashboard**: Interactive dashboard comparing SideBuilds to competitors like Acquire.com
- **Enhanced AI Service**: Real AI analysis using OpenAI GPT-4 with fallback to enhanced mock analysis

### 8. Collaboration Tools

- **Real-Time Presence**: Track active users viewing a project
- **Project Collaboration**: Shared workspaces for buyers and sellers
- **Cursor Tracking**: Visual indicators of other users' positions
- **File Sharing**: Secure document exchange during negotiations
- **Real-Time Sync**: Automatic data synchronization using WebSocket connections
- **Optimized Search**: High-performance search with caching, debouncing, and virtualization

### 9. Accessibility & UX

- **Command Palette**: Keyboard-driven navigation (Cmd+K) for power users
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Loading Skeletons**: Layout-aware placeholders that reduce perceived wait time
- **Error Boundaries**: Graceful fallback UI for failed components
- **Product Tours**: Interactive guides for new users

### 10. Certificate System

- **Certificate Generation**: Automatically creates certificates for sellers upon successful project completion
- **Verification Page**: Public page for verifying certificate authenticity using unique verification codes
- **Certificate Viewing**: Sellers can view and share their certificates
- **Verification Code**: Unique code assigned to each certificate for public validation

### 11. Webhook & Event Processing

- **Webhook Queue**: Reliable event processing with exponential backoff and retry mechanism
- **Event Types**: Support for payment events, project updates, and user notifications
- **Priority Processing**: High-priority events (e.g., payment confirmations) processed first
- **Error Handling**: Automatic retry for failed webhook events

---

## User Roles & Workflows

### Seller Workflow

1. **Onboarding**: Register account, complete Stripe Connect onboarding
2. **Project Creation**: Add project details, tech stack, revenue, and files
3. **AI Analysis**: Receive Certified Build Score and valuation range
4. **Listing Management**: Control visibility, price, and sales status
5. **Offer Management**: Review and respond to buyer inquiries
6. **Negotiation**: Communicate with buyers and finalize terms
7. **Transaction**: Complete payment, transfer assets, and receive funds

### Buyer Workflow

1. **Onboarding**: Register account, set up payment methods
2. **Discovery**: Browse, search, and filter marketplace listings
3. **Due Diligence**: Review AI scores, project details, and analytics
4. **Interest Expression**: Send offer to seller
5. **Negotiation**: Communicate with seller to finalize terms
6. **Purchase**: Complete payment through Stripe
7. **Asset Transfer**: Receive project assets and confirm delivery

---

## Transaction & Escrow System

### Escrow State Machine

A cryptographic workflow in PostgreSQL enforces transaction integrity with row-level locking:

```
Interest Expressed → Seller Accepts → Payment Locked → Asset Transfer → Buyer Confirms → Funds Released
```

### Key Transaction States

- **Interest Expressed**: Buyer shows interest in a project
- **Seller Accepted**: Seller agrees to negotiate
- **Payment Locked**: Funds held in escrow
- **Transfer Completed**: Assets delivered to buyer
- **Funds Released**: Payment transferred to seller (minus commission)

### Concurrency Control

- Row-level locking prevents double purchases
- Idempotent requests with unique request IDs
- Atomic operations ensure data consistency

---

## AI-Powered Features

### Dual-Layer Valuation Engine

1. **Qualitative Analysis (GPT-4)**: 
   - Project description evaluation
   - Market demand assessment  
   - Risk analysis
   - Competitive landscape review

2. **Quantitative Scoring**:
   - Revenue quality and growth
   - Technical stack modernity
   - Documentation completeness
   - Seller credibility

### Certified Build Score

A 0-100 score that serves as a trust signal, breaking down into:
- Revenue Score (30%)
- Technical Quality (25%)
- Market Demand (20%)
- Growth Potential (15%)
- Documentation (10%)

### AI Idea Generation

Assists sellers in project creation by:
- Generating milestone timelines
- Suggesting appropriate tech stacks
- Estimating development effort
- Providing market positioning advice

---

## Real-Time Communication

### Socket.IO Architecture

- **User Presence**: Tracks active users and their current pages
- **Project Events**: Instant updates for views, offers, and status changes
- **Messaging**: Real-time chat with typing indicators
- **Collaboration**: Cursor tracking and shared workspace synchronization

### Event Types

- `project_viewed`: Track when users view a project
- `new_message`: Chat messages between buyers and sellers
- `purchase_request_updated`: Status changes to offers
- `user_joined`: User presence updates
- `cursor_moved`: Collaboration cursor positions

---

## Analytics & Insights

### Dashboard Metrics

- **Portfolio Value**: Total worth of user's projects or purchases
- **Conversion Rate**: Percentage of views that result in offers
- **Revenue Growth**: Month-over-month revenue changes
- **Engagement Score**: User interaction metrics

### Market Insights

- **Hot Categories**: Most active project categories
- **Price Benchmarks**: Average prices by category and stage
- **Opportunity Scores**: Projects with high growth potential
- **Trending Topics**: Popular technologies and business models

### Project Analytics

- **View Count**: Total and unique project views
- **Time on Page**: Average duration of visits
- **Offer Rate**: Percentage of views resulting in offers
- **Revenue Analysis**: Time-series revenue data

---

## Security & Trust

### Authentication & Authorization

- JWT tokens with 24-hour expiration
- bcrypt password hashing (10 rounds)
- HTTP-only cookies for refresh tokens
- Role-based access control

### API Security

- Rate limiting on sensitive endpoints
- CORS configuration
- Helmet middleware for security headers
- Input validation and sanitization

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

## Payment System

### Stripe Connect Integration

- **Seller Onboarding**: Step-by-step account creation process
- **Checkout Sessions**: Secure payment flow with metadata tracking
- **Payout Management**: Automated fund distribution to sellers
- **Dispute Resolution**: Process for handling payment disputes

### Platform Fees

- **Transaction Fee**: 5% on completed sales (seller keeps 95%)
- **Subscription Plans**: 
  - Free: Up to 3 projects, basic analytics
  - Pro ($29/month): Unlimited listings, advanced analytics
  - Enterprise ($99/month): White-label, API access

### Payment Methods

- Credit/debit cards
- Stripe Connect payouts
- Support for multiple currencies

---

## Technical Architecture

### Frontend Stack

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Animations**: Framer Motion
- **State Management**: React Context API
- **Networking**: Axios with interceptors
- **Real-Time**: Socket.IO client
- **Testing**: Jest + React Testing Library

### Backend Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (production) / SQLite (development)
- **Payments**: Stripe Connect
- **Real-Time**: Socket.IO
- **Authentication**: JWT + bcrypt
- **File Upload**: Multer
- **Email**: Nodemailer

### Database Schema

Key tables:
- `users`: User profiles and authentication data
- `projects`: Project listings and details
- `purchase_requests`: Transaction state and details
- `project_files`: File metadata and storage locations
- `project_ai_analyses`: AI valuation results
- `notifications`: In-app notification system

---

## Deployment & Infrastructure

### Frontend Deployment

- **Vercel**: Production deployment
- **Netlify**: Alternative deployment option
- **Docker**: Containerized builds

### Backend Deployment

- **Render**: Production server
- **Docker**: Containerized deployment
- **PostgreSQL**: Managed database service

### CI/CD Pipeline

- GitHub Actions for automated testing
- Docker build and push workflows
- Environment-specific configuration

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests**: Component and service level tests
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Cypress for critical workflows
- **Performance Tests**: Load testing with k6

### Critical Workflows Tested

- User registration and login
- Project creation and management
- Purchase request flow
- Payment processing
- Escrow transactions
- AI analysis integration

---

## Troubleshooting & Support

### Common Issues

#### "Cannot connect to database"
- Check database connection string
- Verify database server is running
- Check file permissions for SQLite

#### "Authentication failed"
- Clear localStorage and cookies
- Verify JWT secret configuration
- Check token expiration

#### "Stripe payment failed"
- Verify Stripe keys (test vs live mode)
- Check webhook secret configuration
- Review Stripe dashboard for error details

#### "CORS errors"
- Verify client URL configuration
- Check CORS middleware settings

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

## Future Roadmap

### Q1 2026

- GitHub repo verification integration
- "Open to Offers" mode
- Mobile app development

### Q2 2026

- Blockchain escrow implementation
- AI deep dive reports ($49 per analysis)
- Advanced search filters

### Q3 2026

- Buyer-side subscriptions with deal alerts
- API access for third-party integrations
- Enhanced analytics dashboard

---

**Last Updated**: March 2026  
**Version**: 1.0  
**Platform**: SideBuilds (sidebuilds.space)
