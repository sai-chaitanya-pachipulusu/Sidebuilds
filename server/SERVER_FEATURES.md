# Server Features & Architecture

This document provides a comprehensive overview of the server-side implementation for the SideProject Tracker platform. It details the architecture, core modules, data flow, and key features that power the backend, including the theoretical underpinnings of the chosen technologies.

## 1. Architecture Overview

The server is a **Node.js** application built with **Express 4**, designed for scalability and robustness. It follows a modular architecture with clear separation of concerns between routes, services, middleware, and database interactions.

### Tech Stack

- **Runtime**: Node.js (Event-driven, Non-blocking I/O)
- **Framework**: Express.js (Middleware-based)
- **Database**: Dual-support:
  - **PostgreSQL**: Production (ACID compliant, robust)
  - **SQLite**: Development (File-based, zero-config)
- **Real-time**: Socket.IO (WebSocket protocol)
- **ORM**: Custom lightweight query wrapper for performance control

### Theoretical Deep Dive

#### Node.js Event Loop

Node.js uses a **Single-Threaded Event Loop** model.

- **Theory**: Unlike multi-threaded servers (e.g., Apache/Java) that spawn a thread per request, Node.js handles thousands of concurrent connections on a single thread by offloading I/O operations (Database queries, API calls) to the system kernel.
- **Application**: This architecture is ideal for our application, which is I/O-heavy (Waiting for DB, Stripe, OpenAI) rather than CPU-heavy.

#### RESTful API Design

Our API follows **REST (Representational State Transfer)** principles.

- **Statelessness**: Each request contains all necessary info (JWT Token) to be understood; the server stores no session state between requests.
- **Resource-Oriented**: URLs represent nouns (`/api/projects`, `/api/users`), and HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`) represent actions.

#### Database Normalization (3NF)

Our schema design adheres to **Third Normal Form (3NF)** to minimize redundancy and dependency.

- **Example**: Instead of storing user details (username, email) inside the `projects` table, we store only the `owner_id` (Foreign Key). This ensures that if a user changes their email, it updates everywhere automatically, maintaining data integrity.

---

## 2. Core Features & Implementation

### 2.1 Authentication & Security

The system implements a robust authentication strategy located in `routes/auth.js` and `middleware/authMiddleware.js`.

- **Registration**: Handles user creation with bcrypt password hashing and unique username generation.
- **Login**: Issues JWTs signed with `JWT_SECRET`.
- **Token Management**:
  - Supports both `Authorization: Bearer <token>` header and legacy formats.
  - Attributes user payload to `req.user`.
  - Includes token refresh and verification endpoints.
- **Security Measures**:
  - **Rate Limiting**: Custom limiters (`authLimiter`, `purchaseRequestLimiter`) prevent brute-force attacks.
  - **Input Sanitization**: Global helper `sanitizeInput` uses the `xss` library to prevent injection attacks.
  - **CORS**: Environment-specific configurations (strict in production, permissive in dev).

### 2.2 Project Management

Located in `routes/projects.js`, this module handles the full lifecycle of a project listing.

- **CRUD Operations**: Full Create, Read, Update, Delete capabilities.
- **Dynamic Validation**:
  - Validates fields based on project **Stage** (e.g., `idea` stage cannot have `monthly_revenue`).
  - Enforces business rules for "For Sale" listings (requires positive price, contact info, and Stripe onboarding).
- **Asset Management**:
  - Uses **Multer** for handling multipart file uploads (images, documents).
  - Stores file metadata in `project_files` and files on disk.
  - Supports `public` vs `private` file visibility.
- **Transfer Logic**: Tracks asset handover via flags: `code_transferred`, `domain_transferred`, `assets_transferred`. Automatically marks project as `completed` (Sold) when all are true.

### 2.3 Purchase System (Escrow & Transactions)

The core marketplace functionality is implemented across `routes/purchaseRequests.js` and `routes/payments.js`.

- **Request Flow**:
  1.  **Interest**: Buyer expresses interest (`expressInterest`). Checked against existing requests to prevent duplicates.
  2.  **Negotiation**: Seller accepts/rejects. Status moves to `seller_accepted_pending_payment`.
  3.  **Checkout**: Buyer initiates payment via Stripe.
  4.  **Escrow**: Funds are held (capture `escrow_status` = 'held') rather than instantly paid out.
  5.  **Transfer**: Buyer confirms receipt of assets (`confirmTransfer`).
  6.  **Release**: Funds are released from escrow to the seller's Stripe Connect account (`confirmReceipt`).
- **Concurrency Control**: Critical database operations use `FOR UPDATE` row locking within transactions to prevent race conditions (e.g., double purchasing).
- **Idempotency**: In-memory store (extensible to Redis) using `Idempotency-Key` headers to safely retry requests without side effects.

### 2.4 Payments & Stripe Integration

A sophisticated integration with **Stripe Connect** handles marketplace payments.

- **Onboarding**:
  - `routes/stripe.js` manages Stripe Connect (Express) account creation.
  - Generates account links for onboarding flows.
  - Webhooks listen for `account.updated` to sync status (`charges_enabled`, `payouts_enabled`) to local DB.
- **Checkout Sessions**:
  - Creates Stripe Checkout Sessions with metadata linking to internal `purchase_request_id`.
  - Calculates platform commission (default 5%) and seller net amount.
- **Webhooks (`services/webhookService.js`)**:
  - Verifies Stripe signatures.
  - Handlers for `checkout.session.completed`, `payment_intent.succeeded/failed`, and `charge.dispute.created`.
  - **Resilience**: Implements an event queue and retry logic with exponential backoff for failed webhook processing.

### 2.5 AI Analysis Service

Located in `services/enhancedAIService.js`, providing intelligent project valuation.

- **Dual Mode**:
  1.  **Real AI**: Uses OpenAI GPT-4 (if API key present) to analyze project data.
  2.  **Enhanced Mock**: Sophisticated fallback algorithm that scores projects based on revenue, tech stack, and completeness.
- **Analysis Output**:
  - **Scores**: Overall (0-100), Revenue, Technical, Market, Growth, etc.
  - **Valuation**: Estimated market value range.
  - **Qualitative**: Key insights, recommendations, and risk assessment.
- **Persistence**: Caches analysis results in `project_ai_analyses` to improve performance and reduce API costs.

### 2.6 Real-time Communication

Powered by **Socket.IO** in `websocket/events.js`.

- **Authentication**: Authenticates socket connections via JWT, with handling for token expiration and refresh.
- **Event System**:
  - **Project**: Real-time view counts (`project_viewed`) and interest notifications.
  - **Messaging**: Typing indicators and chat messages (`new_message`).
  - **Collaboration**: Tracks active users (`join_collaboration`) and cursor movements (`cursor_moved`).
  - **Analytics**: Tracks page views and custom events for admin dashboards.
- **User Presence**: Maintains a registry of connected users and their active rooms.

### 2.7 Analytics Engine

Located in `routes/analytics.js`, this module provides deep insights using complex SQL aggregations.

- **Dashboard Metrics**: Aggregates portfolio value, total views, and conversion rates using single-query efficiency.
- **Market Insights**: Analyzes platform-wide trends to generate "Hot Categories" and pricing benchmarks + opportunity scores.
- **Performance Tracking**: Calculates ROI and Payback Period for individual projects based on revenue vs. list price.
- **Revenue Analysis**: time-series data generation for revenue charts.

### 2.8 Notification & Email System

Implemented in `services/emailService.js` and `routes/notifications.js`.

- **Transactional Emails**: Uses `nodemailer` with a production/dev split (logs to console in dev).
- **Template Engine**: specialized HTML templates for marketplace lifecycle events:
  - Interest Expressed
  - Terms Proposed
  - Payment Received
  - Transfer Confirmed
- **In-App Notifications**: Database-backed notification feed for realtime user alerts.

### 2.9 Advanced File Management

Detailed in `routes/files.js`, handling the security and delivery of assets.

- **Access Control**: Strict ownership checks; only Project Owners or file owners can manage files.
- **Secure Delivery**: usage of `is_public` flags to gate access. Private files are streamed securely via API, never exposed via static public URLs.
- **Preview System**: Specialized endpoint for secure image previews without full download.
- **Stats**: Tracks file types and download counts per project.

### 2.10 Resilience & Queuing (`services/webhookQueue.js`)

A custom, database-backed formulation of a priority queue ensures system reliability.

- **Persistence**: All webhook events are logged to `webhook_queue` table before processing.
- **Priority Scheduling**: Supports `High`, `Normal`, and `Low` priority processing.
- **Concurrency Control**: Limits simultaneous webhook processing to prevent DB saturation.
- **Exponential Backoff**: sophisticated retry logic (`1s`, `5s`, `15s`, `30s`) for failing jobs.

---

## 3. Database Schema Design (Inferred)

The application uses a relational schema. Below are key tables and their roles:

- **Users**:
  - Core identity (`username`, `email`, `password_hash`).
  - Stripe status (`stripe_account_id`, `onboarding_complete`, `payout_enabled`).
- **Projects**:
  - Listing details (`name`, `description`, `stage`, `tech_stack`, `is_for_sale`, `sale_price`).
  - Transfer status flags (`code_transferred`, `domain_transferred`).
- **Purchase Requests (`purchase_requests`)**:
  - Tracks the state of a sale (`status`, `offer_amount`, `buyer_id`, `seller_id`).
  - Statuses: `interest_expressed`, `seller_accepted_pending_payment`, `payment_completed_pending_transfer`, `transfer_completed_buyer_confirmed`.
- **Transactions (`project_transactions`)**:
  - Financial records (`amount`, `commission`, `escrow_status`, `stripe_session_id`).
- **Project Files (`project_files`)**:
  - Metadata for uploaded assets (`file_path`, `mime_type`, `is_public`).
- **Analytics (`project_analytics`, `project_ai_analyses`)**:
  - Stores view counts, trending scores, and AI-generated valuations.

---

## 4. API Structure

| Route Prefix             | Module                       | Description                              |
| :----------------------- | :--------------------------- | :--------------------------------------- |
| `/api/auth`              | `routes/auth.js`             | User authentication & token management   |
| `/api/projects`          | `routes/projects.js`         | Project CRUD & file management           |
| `/api/purchase-requests` | `routes/purchaseRequests.js` | Buying/Selling workflow                  |
| `/api/payments`          | `routes/payments.js`         | Stripe checkout & transaction management |
| `/api/stripe`            | `routes/stripe.js`           | Connect account onboarding & status      |
| `/api/ai`                | `routes/ai.js`               | AI analysis endpoints                    |
| `/api/users`             | `routes/users.js`            | User profile management                  |
| `/api/notifications`     | `routes/notifications.js`    | User notifications                       |

---

## 5. Security & Best Practices

1.  **Row-Level Locking**: Used in `purchaseRequests.js` (`FOR UPDATE`) to ensure data integrity during status transitions.
2.  **Environment Isolation**: Distinct configurations for Development (SQLite/Permissive CORS) vs Production (PostgreSQL/Strict CORS).
3.  **Graceful Error Handling**: Centralized error logging and mapped HTTP status codes.
4.  **Modular Service Layer**: Complex logic (Webhooks, AI, Email) is abstracted into services, keeping controllers lean.
