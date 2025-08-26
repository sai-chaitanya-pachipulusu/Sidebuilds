# Backend Requirements for Production Frontend Features

## Overview

This document outlines the backend API enhancements and new endpoints required to support the production-ready frontend implementations completed in this phase.

**Last Updated**: 2024-01-15  
**Frontend Implementation**: Complete  
**Backend Status**: Requirements documented  

---

## 1. Enhanced Payment Service APIs

### 1.1 Payment Health Check Endpoint
**Endpoint**: `GET /api/payments/health`

**Description**: Provides real-time status of payment providers for frontend fallback logic.

**Response**:
```json
{
  "providers": {
    "stripe": {
      "status": "active",
      "responseTime": 150,
      "lastChecked": "2024-01-15T10:30:00Z"
    },
    "paypal": {
      "status": "maintenance", 
      "responseTime": null,
      "lastChecked": "2024-01-15T10:29:45Z",
      "estimatedRestoreTime": "2024-01-15T12:00:00Z"
    }
  },
  "overall": "partial"
}
```

### 1.2 Project Availability Check
**Endpoint**: `GET /api/projects/{id}/availability`

**Description**: Quick check if project is still available for purchase before payment processing.

**Response**:
```json
{
  "available": true,
  "reason": null,
  "lastUpdated": "2024-01-15T10:25:00Z"
}
```

### 1.3 Enhanced Payment Tracking
**Endpoint**: `POST /api/payments/track`

**Description**: Track payment events for analytics and debugging.

**Request**:
```json
{
  "event": "checkout_created",
  "provider": "stripe",
  "requestId": "pay_1234567890_abc",
  "projectId": "proj_123",
  "amount": 25000,
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "referrer": "https://app.sidebuilds.com/marketplace"
  }
}
```

---

## 2. Enhanced WebSocket Infrastructure

### 2.1 Heartbeat System
**Event**: `ping` / `pong`

**Description**: Implement server-side ping/pong for connection quality monitoring.

**Server Implementation**:
```javascript
// Handle ping from client
socket.on('ping', (data) => {
  socket.emit('pong', {
    timestamp: data.timestamp,
    serverTime: Date.now()
  });
});
```

### 2.2 Token Refresh Support
**Event**: `token_refresh_required`

**Description**: Server should emit this event when JWT token is near expiration.

**Implementation**:
```javascript
// Emit when token expires in < 5 minutes
socket.emit('token_refresh_required', {
  expiresIn: 300000, // 5 minutes in ms
  refreshUrl: '/api/auth/refresh'
});
```

### 2.3 Server Maintenance Notifications
**Event**: `server_maintenance`

**Description**: Notify clients of planned maintenance windows.

**Payload**:
```json
{
  "message": "Scheduled maintenance starting in 10 minutes",
  "estimatedDuration": 1800,
  "startTime": "2024-01-15T15:00:00Z",
  "endTime": "2024-01-15T15:30:00Z"
}
```

### 2.4 Rate Limiting Integration
**Event**: `rate_limit_warning`

**Description**: Warning when client is approaching rate limits.

**Payload**:
```json
{
  "currentRate": 45,
  "limit": 50,
  "resetTime": "2024-01-15T10:35:00Z",
  "backoffRecommended": 30000
}
```

---

## 3. Search and Performance APIs

### 3.1 Search Indexing Endpoint
**Endpoint**: `GET /api/search/index`

**Description**: Pre-built search index for client-side optimization.

**Response**:
```json
{
  "index": {
    "ngrams": {
      "react": [1, 5, 12, 23],
      "node": [2, 8, 15],
      "ai": [3, 9, 18, 22]
    },
    "metadata": {
      "lastUpdated": "2024-01-15T10:00:00Z",
      "totalProjects": 150,
      "indexSize": "2.3KB"
    }
  }
}
```

### 3.2 Cached Search Results
**Endpoint**: `GET /api/search/cached?query={term}&filters={filters}`

**Description**: Server-side cached search results for popular queries.

**Response**:
```json
{
  "results": [...],
  "cached": true,
  "cacheTime": "2024-01-15T09:45:00Z",
  "totalResults": 45,
  "searchTime": 12
}
```

### 3.3 Search Analytics
**Endpoint**: `POST /api/search/analytics`

**Description**: Track search performance and popular queries.

**Request**:
```json
{
  "query": "react ecommerce",
  "filters": {"category": "ecommerce"},
  "resultCount": 23,
  "searchTime": 150,
  "cacheHit": false,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 4. Error Reporting and Monitoring

### 4.1 Frontend Error Reporting
**Endpoint**: `POST /api/errors/report`

**Description**: Collect frontend errors for monitoring and debugging.

**Request**:
```json
{
  "errorId": "error_1705315800_abc123",
  "message": "Cannot read property 'map' of undefined",
  "stack": "Error: Cannot read property...\n    at Component...",
  "componentStack": "    in ProjectCard\n    in MarketplacePage",
  "timestamp": "2024-01-15T10:30:00Z",
  "userAgent": "Mozilla/5.0...",
  "url": "https://app.sidebuilds.com/marketplace",
  "userId": "user_123",
  "buildVersion": "1.2.0",
  "environment": "production"
}
```

**Response**:
```json
{
  "reportId": "report_1705315800_def456",
  "status": "received",
  "tracking": true
}
```

### 4.2 Performance Metrics
**Endpoint**: `POST /api/metrics/performance`

**Description**: Collect Core Web Vitals and performance metrics.

**Request**:
```json
{
  "metrics": {
    "FCP": 1200,
    "LCP": 2100,
    "FID": 45,
    "CLS": 0.02,
    "TTFB": 180
  },
  "page": "/marketplace",
  "timestamp": "2024-01-15T10:30:00Z",
  "sessionId": "session_abc123"
}
```

---

## 5. Authentication Enhancements

### 5.1 Token Refresh Endpoint
**Endpoint**: `POST /api/auth/refresh`

**Description**: Refresh JWT tokens for seamless user experience.

**Headers**:
```
Authorization: Bearer {current_token}
```

**Response**:
```json
{
  "token": "new_jwt_token_here",
  "expiresIn": 3600,
  "refreshedAt": "2024-01-15T10:30:00Z"
}
```

### 5.2 WebSocket Authentication
**Enhancement**: Support JWT authentication in Socket.IO handshake.

**Implementation**:
```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // Verify JWT token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.userId = decoded.id;
    next();
  });
});
```

---

## 6. Mobile and Accessibility APIs

### 6.1 Touch Gesture Events
**WebSocket Events**: Support for mobile gesture tracking.

**Events**:
- `gesture_swipe` - Track swipe gestures on project cards
- `gesture_pinch` - Track pinch-to-zoom on images
- `gesture_tap` - Track tap interactions for analytics

### 6.2 Accessibility Metadata
**Endpoint**: `GET /api/accessibility/metadata`

**Description**: Provide accessibility information for screen readers.

**Response**:
```json
{
  "announcements": [
    "New project available in AI category",
    "Marketplace updated with 5 new listings"
  ],
  "landmarks": {
    "main": "marketplace-content",
    "search": "marketplace-search",
    "filters": "marketplace-filters"
  }
}
```

---

## 7. Caching and Performance

### 7.1 Redis Integration
**Requirements**:
- Cache search results (TTL: 5 minutes)
- Cache project availability status (TTL: 1 minute) 
- Cache payment provider health (TTL: 30 seconds)
- Cache user sessions for WebSocket reconnection

### 7.2 CDN Headers
**Requirements**:
- Set appropriate cache headers for static assets
- Implement ETags for API responses
- Add compression for JSON responses

---

## 8. Database Schema Enhancements

### 8.1 Search Optimization
**New Tables**:
```sql
-- Search index table for faster queries
CREATE TABLE search_index (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  search_text TEXT,
  ngrams TEXT[],
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Search analytics
CREATE TABLE search_analytics (
  id SERIAL PRIMARY KEY,
  query TEXT,
  filters JSONB,
  result_count INTEGER,
  search_time INTEGER,
  cache_hit BOOLEAN,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 8.2 Error Tracking
**New Tables**:
```sql
-- Frontend error tracking
CREATE TABLE frontend_errors (
  id SERIAL PRIMARY KEY,
  error_id VARCHAR(255) UNIQUE,
  message TEXT,
  stack TEXT,
  component_stack TEXT,
  user_id INTEGER REFERENCES users(id),
  url TEXT,
  user_agent TEXT,
  build_version VARCHAR(50),
  environment VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 8.3 Performance Metrics
**New Tables**:
```sql
-- Core Web Vitals tracking
CREATE TABLE performance_metrics (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255),
  page VARCHAR(255),
  fcp INTEGER,
  lcp INTEGER,
  fid INTEGER,
  cls DECIMAL(4,3),
  ttfb INTEGER,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 9. Security Enhancements

### 9.1 Rate Limiting
**Implementation**:
- Search API: 100 requests/minute per user
- Payment API: 10 requests/minute per user
- Error reporting: 50 requests/minute per user
- WebSocket connections: 5 concurrent per user

### 9.2 Input Validation
**Requirements**:
- Sanitize all search inputs
- Validate payment amounts and project IDs
- Rate limit error reporting to prevent spam

### 9.3 CORS Configuration
**Headers**:
```
Access-Control-Allow-Origin: https://app.sidebuilds.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

---

## 10. Implementation Priority

### Phase 1 (Immediate - Week 1)
1. Payment health check endpoint
2. Basic error reporting API
3. WebSocket heartbeat system
4. Token refresh endpoint

### Phase 2 (Week 2-3)
1. Search optimization APIs
2. Performance metrics collection
3. Enhanced WebSocket events
4. Database schema updates

### Phase 3 (Week 4+)
1. Advanced caching implementation
2. Mobile gesture tracking
3. Accessibility metadata API
4. Complete analytics dashboard

---

## 11. Monitoring and Alerts

### 11.1 Key Metrics to Monitor
- Payment provider response times
- Search query performance
- WebSocket connection quality
- Frontend error rates
- Core Web Vitals scores

### 11.2 Alert Thresholds
- Payment API response time > 5 seconds
- Search response time > 1 second
- WebSocket disconnection rate > 10%
- Frontend error rate > 1%
- Core Web Vitals below thresholds

---

## 12. Testing Requirements

### 12.1 API Testing
- Load testing for search endpoints
- Payment flow integration tests
- WebSocket connection stress tests
- Error handling validation

### 12.2 Performance Testing
- Search index efficiency
- Cache hit rate optimization
- Database query performance
- CDN cache effectiveness

---

This document provides a comprehensive roadmap for backend implementation to support the production-ready frontend features. Each enhancement is designed to improve user experience, performance, and reliability of the SideBuilds marketplace platform.