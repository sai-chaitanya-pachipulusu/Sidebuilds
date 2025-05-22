# Implementation Plan: Next Steps

This document outlines the phased implementation plan for the next set of features for the SideProject Tracker application.

## Phase 1: Real-time Notifications Core (COMPLETED)

**Goal:** Implement a basic real-time notification system for key events in the purchase workflow.

**Status: COMPLETED**

**Steps Taken:**

1.  **Database Schema for Notifications:** Defined in `docs/schema_changes_purchase_workflow.md`.
2.  **Backend Notification Service/Helper:** `server/services/notificationService.js` created with `createNotification` function.
3.  **Integrate Notification Creation into `purchaseRequests.js`:** Calls to `createNotification` added at relevant points in the purchase workflow routes, replacing console logs and TODOs.
4.  **Backend API Endpoint for Notifications:** `server/routes/notifications.js` created with GET `/`, POST `/:notificationId/mark-read`, and POST `/mark-all-read` endpoints. Mounted in `server/index.js`.
5.  **Frontend API Service for Notifications:** `getNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead` functions added to `client/src/services/api.js`.
6.  **Basic Frontend Notification Display:** Implemented in `client/src/components/NavBar.js` with polling, unread count, popover display, and mark as read functionality.

---

## Phase 2: Dedicated Communication within Purchase Requests (COMPLETED)

**Goal:** Allow buyers and sellers to send messages to each other directly within the context of a specific purchase request.

**Status: COMPLETED**

**Steps Taken:**

1.  **Database Schema for Messages:** `purchase_request_messages` table schema defined in `docs/schema_changes_purchase_workflow.md`.
2.  **Backend API Endpoints for Messages:** `server/routes/purchaseRequestMessages.js` created with `POST` and `GET` endpoints for messages, including authorization and notification triggering. Mounted in `server/index.js` under `/api/purchase-requests/:requestId/messages`.
3.  **Frontend API Service for Messages:** `getPurchaseRequestMessages` and `sendPurchaseRequestMessage` functions added to `client/src/services/api.js`.
4.  **Frontend UI for Messaging:** Integrated a chat-like interface into `client/src/pages/DashboardPage.js` within the existing `ProposeTermsModal` and `AcceptTermsModal`. This includes displaying messages, an input for sending new messages, polling for updates, and styling for sender/receiver.

---

## Phase 3: Enhanced Notifications/Messaging UI/UX & System Refinements

**Goal:** Improve the user experience for notifications and messaging, add a dedicated notifications page, and refine system stability.

**Steps:**

1.  **Dedicated Notifications Page (`/notifications`):
    *   Create a new page component `client/src/pages/NotificationsPage.js`.
    *   Route: `/notifications`.
    *   Display all notifications for the user (read and unread), with pagination if necessary.
    *   Allow filtering by type (e.g., 'Unread', 'Messages', 'System').
    *   Each notification item should be clickable, marking it as read and navigating to the `link` if provided (e.g., to the specific purchase request or message thread).
    *   Include a "Mark all as read" button.

2.  **Real-time Updates (Beyond Polling - Exploration):**
    *   **Backend:** Explore WebSockets (e.g., using `socket.io`) for pushing notifications and messages to connected clients in real-time.
        *   When a notification or message is created, emit an event to the specific `user_id` or `room` (e.g., a room for each purchase request chat).
    *   **Frontend:**
        *   Establish a WebSocket connection when the user logs in.
        *   Listen for new notification/message events.
        *   Update the `NavBar` notification count/popover and the active message view in `DashboardPage.js` (or `NotificationsPage.js`) without requiring polling or full refetches.
    *   *Note: This is a more significant architectural change. If full WebSocket implementation is too large for this phase, we can defer it or implement a simpler version, perhaps focusing only on notifications first.*

3.  **UI/UX Refinements for Messaging:**
    *   **Message Timestamps:** Ensure clear and user-friendly timestamps for messages (e.g., "2 minutes ago", "Yesterday at 10:30 AM").
    *   **Read Receipts (Visual Indicator):** In the message view, provide a visual cue if the other party has read a message (requires `is_read` to be updated effectively and possibly a new event if using WebSockets).
    *   **Typing Indicators (Optional, Advanced):** If using WebSockets, explore adding typing indicators.
    *   **Error Handling:** More robust and user-friendly error messages for message sending failures.
    *   **Accessibility:** Ensure the chat interface is accessible (ARIA attributes, keyboard navigation).

4.  **Notification Preferences (Optional, Future Phase):**
    *   Allow users to configure what types of notifications they want to receive (e.g., email notifications vs. in-app only).

5.  **Code Refactoring & Optimization:**
    *   **`DashboardPage.js`:** This component is becoming very large. Identify parts that can be extracted into smaller, reusable components (e.g., the individual modal contents, the table rendering logic for seller/buyer requests, the messaging UI itself).
    *   **Backend Services:** Review services like `notificationService.js` for clarity and efficiency.
    *   **Database Queries:** Ensure all database queries are optimized, especially for fetching messages and notifications.

**Completion Criteria for Phase 3:**
*   A functional dedicated notifications page is available.
*   Significant improvements to the real-time feel of notifications/messaging (even if full WebSockets are deferred, improvements over basic polling).
*   Messaging UI is more polished and user-friendly.
*   `DashboardPage.js` is refactored for better maintainability.

---

*This plan will be updated after the completion of each phase.* 