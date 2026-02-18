Client Side Features:

# Client-Side Feature Documentation

This document provides a comprehensive overview of the functionality, architecture, and technology stack used in the frontend application (`client/src`). It documents features by folder structure and logical grouping, explaining the implementation strategy and the theoretical underpinnings of the chosen technologies.

## 1. Core Architecture & Technologies

### Tech Stack

- **Framework**: React.js (v18+)
- **Routing**: `react-router-dom` (v6) with Lazy Loading & Suspense
- **Styling**: TailwindCSS (Utility-First) with Custom Design System (`index.css`) & `shadcn/ui` components
- **State Management**: React Context API (`AuthContext`, `ThemeContext`)
- **Animations**: `framer-motion` (Physics-based)
- **Networking**: `axios` with Interceptors & Custom Caching Layer
- **Notifications**: `react-hot-toast`
- **Real-time**: `socket.io-client`

### Implementation Philosophy

The application follows a **feature-first** and **component-drive** architecture. Global state is minimized to essential data (User, Theme), while local state or server-state (via API calls) drives specific pages. Performance is prioritized through **Route Splitting**, **Component Lazy Loading**, and **API Request Caching**.

### Theoretical Deep Dive

#### React & Virtual DOM

The application leverages React's **Virtual DOM** to optimize rendering. By creating a lightweight copy of the DOM, React employs a **Reconciliation Algorithm** (Diffing) to identify changed elements. We explicitly optimize this process using:

- **`useMemo`**: To cache expensive calculations (e.g., filtering the Marketplace list) so they don't re-run on every render.
- **`useCallback`**: To memoize event handlers, preventing unnecessary re-renders of child components (like `ProjectCard`) that rely on reference equality of props.

#### Utility-First CSS (Tailwind)

We adopt the **Utility-First** methodology over traditional BEM or CSS-in-JS.

- **Why**: It reduces the CSS bundle size significantly because utilities are reusable. Instead of shipping a unique class for every button, we ship a single `.bg-blue-500` class used thousands of times.
- **JIT (Just-In-Time) Engine**: Tailwind generates styles on-demand as we author files, ensuring development builds are fast and production builds contain _only_ the used CSS.

#### Client-Side Routing (SPA)

The app is a **Single Page Application (SPA)**.

- **Theory**: Instead of the browser requesting a new HTML document for every page navigate (which causes a full reload), `react-router-dom` intercepts the URL change. It interacts with the **Browser History API** (`pushState`) to change the URL visually while swapping the React Component view dynamically.
- **Code Splitting**: We use `React.lazy()` and `Suspense` to split the application bundle. The "Marketplace" code is not downloaded until the user actually clicks the "Marketplace" link, reducing the initial load time (Time to Interactive).

---

## 2. Authentication System (`client/src/context`, `client/src/services`)

### Features

- **User Registration & Login**: Secure credential handling.
- **Session Persistence**: Automatic token management.
- **Token Refresh**: Silent access token refreshing.
- **Socket Integration**: Real-time connection establishment upon authentication.

### Implementation Strategy

1.  **Auth Context**: A centralized `AuthContext` provides the user state (`user`, `token`, `isAuthenticated`) to the entire app. It handles the initial boot connection and synchronizes with `localStorage`.
    - **AbortController**: Profile fetches include timeouts that abort slow requests to prevent UI hanging.
    - **Socket Coupling**: Tightly binds socket lifecycle to auth state — only connecting when fully authenticated.
2.  **Network Interceptors**: The API client (`api.js`) is configured with Request Interceptors to automatically inject the JWT `Authorization` header.
3.  **Resilience Pattern**:
    - **Token Expiry Detection**: Detects specific "expired" messages from the server.
    - **Silent Refresh**: Pauses failed requests, refreshes token, updates header, and transparently retries.
    - **Event Bus**: Dispatches a custom `tokenExpired` window event to trigger global UI alerts (Toast) and redirect logic without prop drilling.

---

## 3. Project Management (`client/src/pages`, `client/src/components`)

### Features

- **Project Listings**: Browse, search, and filter projects.
- **Project Creation/Editing**: Detailed forms with validation and AI assistance.
- **Status Lifecycle**: Visual tracking of project stages (Idea → Planning → MVP → Launched).
- **File Management**: Multi-file uploads for project assets.

### Implementation Strategy

1.  **Dynamic Forms**: `ProjectFormPage` handles both creation and editing modes. It uses "Controlled Components" for form state and conditionally renders fields based on the selected project stage (e.g., "Demo URL" only appears for "Launched" projects).
2.  **AI Integration**: An "AI Idea Assist" feature allows users to auto-generate project details (Milestones, Tech Stack) based on the project stage and category, streamlining the input process.
3.  **Visualization**:
    - **Project Cards**: Uses a sophisticated 3D tilt effect (`framer-motion`) that reacts to mouse position.
    - **Color Coding**: A central configuration maps project stages (e.g., "MVP", "Planning") to specific Tailwind color themes, ensuring visual consistency across badges, borders, and text.
4.  **File Uploads**: A dedicated `ProjectFileUploader` component manages the upload queue, providing visual progress feedback and handling file type validation before sending to the backend.

---

## 4. Marketplace & Discovery (`client/src/pages`)

### Features

- **High-Performance List View**: Efficient rendering of large project lists.
- **Advanced Filtering**: Filter by Stage, Price, Tech Stack, and Category.
- **Search**: Real-time search by keywords.
- **Sorting**: Multi-parameter sorting (Newest, Price, Revenue, AI Score).

### Implementation Strategy

1.  **Client-Side Optimization**: The Marketplace fetches a batch of projects and utilizes `useMemo` hooks to perform filtering and sorting instantaneously on the client side, reducing specific API calls for minor filter changes.
2.  **Caching Strategy**: A custom memory cache (`apiCache` utility) stores API responses. When a user navigates between pages or filters, the app checks this cache first to serve data instantly before validating with the network.
3.  **Debounced Search**: Search input utilizes a custom `useDebounce` hook to prevent API over-fetching while the user types.
4.  **Virtualization Approach**: The list logic implements a virtualization-friendly structure (rendering items only as needed/requested) and staggered animation delays for a smooth "waterfall" loading effect.

---

## 5. Payments & Commerce (`client/src/services/paymentService.js`)

### Features

- **Stripe Connect Integration**: Managed onboarding for sellers.
- **Checkout Flows**: Secure session-based payments.
- **Idempotency**: Preventing duplicate charges.

### Implementation Strategy

1.  **Service Abstraction**: A singleton `PaymentService` class allows the UI to call generic methods like `createCheckout()` without worrying about the underlying provider's specific API requirements.
2.  **Resiliency**: The service implements a **Retry Mechanism** with exponential backoff for network-related failures. It creates a robust transaction experience even under poor network conditions.
3.  **State Tracking**: Each payment operation generates a unique `requestId` to track attempts and prevent duplicate transactions (idempotency).
4.  **Marketplace Integrity**: Before initiating a checkout, the service performs a pre-flight "Availability Check" to ensure the project hasn't been sold or removed in the interim.
5.  **Seller Onboarding**: Dedicated components (`StripeConnectModal`) guide users through the complex Oauth-like flow required to set up a Stripe Express account for receiving funds.

---

## 6. UI/UX System & Shared Components (`client/src/components`)

### Features

- **Global Command Palette**: Keyboard-driven navigation (`Cmd+K`).
- **Responsive Design**: Mobile-first approach with varying layouts for phones/desktops.
- **Feedback Systems**: Toast notifications, Error Boundaries, and Loading Skeletons.
- **Visual Effects**: Glassmorphism, Gradient Glows, and 3D interactions.

### Implementation Strategy

1.  **Command Palette**: Implemented as a global overlay controlled by the specialized `CommandPalette` component. It indexes routes and actions, filtering them in real-time based on user input. It supports keyboard navigation (Arrow Keys) for accessibility.
2.  **Error Handling**: The application is wrapped in a `ProductionErrorBoundary`. If a sub-component crashes, this boundary catches the error and displays a "Graceful Fallback" UI (like an elegant loading screen or friendly error message) instead of a white screen of death.
3.  **Styling Architecture**:
    - **Tailwind Layers**: `index.css` defines custom layers (`@layer components`) for reusable classes like `.btn-primary` or `.card-glass`, centralizing the design system tokens.
    - **CSS Variables**: Extensive use of CSS variables for theming (Colors, Blur amounts, Spacing), facilitating easy Dark/Light mode switching (conceptually prepared).
4.  **Loading States**: Instead of generic spinners, the app uses **Skeleton Loaders** (`ImageSkeleton`, `MarketplaceLoadingSkeleton`) that mimic the layout of the content being loaded, reducing perceived wait time (`layout shift`).

### 7. Data Visualization & Analytics (`client/src/pages`)

### Features

- **Interactive Dashboards**: Real-time portfolio performance tracking.
- **Market Insights**: Visualizing platform trends, hot categories, and pricing opportunities.
- **Project ROI**: Calculating and displaying Return on Investment and Payback Period.

### Implementation Strategy

1.  **Charts & Graphs**: Utilizes `recharts` or similar library (inferred from data structure) to render time-series revenue and view data.
2.  **Aggregation Logic**: The frontend consumes pre-aggregated data from the server (`/api/analytics`) to keep client-side processing light.
    - **Trend Analysis**: Displays growth indicators (e.g., "+15% vs last month") calculated by comparing current vs historical data points.
3.  **Real-Time Feed**: A WebSocket-driven "Activity Feed" updates live as users interact with projects (views, offers), providing a dynamic "pulse" of the platform.

---

### 8. Advanced Intelligence & Tools (`client/src/components`)

### Features

- **Hybrid Recommendation Engine**: A dual-layer system that attempts server-side AI matching first, falling back to a client-side heuristic algorithm (scoring based on Revenue, Tech Stack match, and Seller Rating).
- **Competitor Analysis**: An interactive strategic dashboard visualizing SideBuilds' market position vs incumbents (Acquire.com, Flippa) using dynamic SWOT grids and market share visualizations.
- **Command Palette (⌘+K)**: A fully accessible, keyboard-driven global controller. It spatially maps the entire application state, allowing users to navigate, execute actions (e.g., "Create Project"), and manage settings without leaving the keyboard.

### Implementation Strategy

1.  **Client-Side Intelligence**: The `SmartRecommendationEngine` implements complex scoring logic (e.g., `calculateDynamicScore`) directly in the browser to provide instant feedback even when the backend AI is rate-limited.
2.  **State-Aware Commands**: The Command Palette dynamically filters available actions based on the user's auth state (e.g., hiding "Sign In" if logged in) and context.
3.  **Visual Strategy**: `CompetitorAnalysisDashboard` uses `framer-motion` layout animations to transform static data into an interactive storytelling experience about the platform's value proposition.

---

## 9. Folder Structure Summary

- **`src/components`**: Reusable UI blocks (ProjectCard, NavBar) and specific feature widgets (CommandPalette).
- **`src/context`**: React Context providers for global state (Auth, Theme).
- **`src/pages`**: Top-level Route components representing full Views (Dashboard, Marketplace).
- **`src/services`**: API abstraction layer separating Data Fetching logic from UI logic.
- **`src/shadcn`**: Low-level UI primitives (Buttons, Inputs) providing a consistent accessible base.
- **`src/utils`**: Helper functions (Caching, Formatters) and custom hooks.

Server Side Code:

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

Differentiation Report:
Based on a deep analysis of your current codebase (specifically the new SmartRecommendationEngine and CompetitorAnalysisDashboard) and a fresh market sweep of players like Acquire.com, Flippa, and Microns, here is your strategic differentiation report.

1. Your Core Differentiator: The "Lifecycle" Advantage
   The biggest differentiator is structural. Competitors are destinations; SideBuilds is a companion.

The Others (Transactional): Users only go to Flippa or Acquire when they are desperate to sell. This signals "end of life."
SideBuilds (Relational): You track the project's journey. By offering tools like the "AI Idea Assist" and "Milestone Tracker" (which I see in your code), you capture the user months before they sell.
The "Feed" Idea: When a user finally hits "List for Sale," you don't just have a static listing; you have a verified timeline of progress. You can prove consistent shipping of code, not just revenue screenshots. That is verified trust that Flippa cannot fake. 2. Market Positioning: The "$5K–$50K Guarantee"
Your codebase's
CompetitorAnalysisDashboard.js
correctly identifies the "Underserved Middle."

Flippa: Use for <$1K "starter sites" or dropshipping junk. High noise, low trust.
Acquire.com: Has moved upmarket. If you aren't doing $100K+ ARR or asking $250k+, you are invisible there.
Microns: Great for <$5k, but lacks tooling.
SideBuilds: You bring Enterprise-grade M&A tools (Escrow logic, Legal transfer steps, AI Due Diligence) to the $5k–$50k developer market. You are effectively "Gentutifying" the indie hacker sale. 3. Technical Differentiators (Hard to Copy)
Your codebase has features that generic marketplaces lack:

Feature Competitors (Flippa/Acquire) SideBuilds (Your Code) The "Feed" (Advantage)
Discovery Static Filters (Revenue, Age) Hybrid AI Engine You match based on Tech Stack compatibility (e.g., "Find me React+Node apps"), not just money.
Search Dropdowns & Checkboxes Command Palette (⌘+K) Speed. Developers hate clicking. You let them navigate by keyboard.
Vetting Manual or None AI Code Analysis Your enhancedAIService scans the "technical asset" to prove code quality, not just financial quality.
Safety Middlemen Escrow State Machine Your purchaseRequests table implements a cryptographic state machine (Interest -> Lock -> Pay -> Release). 4. Strategic Recommendations ("The Feed")
Here is how to weaponize this via immediate action:

Rebrand the Trust Badge:
Current: Simple "Verified" checkmark.
New: "SideBuilds Certified Build". Use your AI service to generate a "Code Health Score" (e.g., "92/100 maintainability"). This becomes a badge users want to show off on Twitter/X even if they aren't selling, driving free traffic.
The "Pre-Sale" Mode:
Add a project state called "Open to Offers" (distinct from "For Sale").
Allow users to display their project on the marketplace without a price tag. This lets them test demand without seemingly "failed" listing.
