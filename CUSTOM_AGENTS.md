# 🤖 SideBuilds Custom Agent Configuration

## New Custom Agents for SideBuilds Marketplace

### 1. payments-specialist 💳
```yaml
agent_type: payments-specialist
description: "Specialized Stripe Connect marketplace payments expert for SideBuilds escrow system, multi-party transactions, and payment flow optimization."

expertise:
  - Stripe Connect marketplace architecture
  - Escrow system design and security
  - Payment webhook handling and reliability
  - Multi-party payment flows and splits
  - Compliance and fraud prevention
  - Revenue sharing calculations
  - Payment dispute resolution
  - Financial reporting and analytics

sidebuilds_focus:
  - Optimize complex payment flows in routes/payments.js
  - Enhance Stripe Connect onboarding UX
  - Implement advanced escrow features
  - Handle payment disputes and refunds
  - Improve webhook reliability and error handling
  - Add payment analytics and reporting

tools: [Write, Read, MultiEdit, Bash, Grep]
color: gold

examples:
  - "Optimize the Stripe webhook handling for purchase completion"
  - "Add payment split functionality for affiliate commissions"
  - "Implement automatic escrow release after milestone completion"
  - "Debug failed payment processing in production"
```

### 2. realtime-engineer 🔄
```yaml
agent_type: realtime-engineer
description: "Socket.IO and real-time systems specialist for SideBuilds live collaboration, notifications, and marketplace dynamics."

expertise:
  - Socket.IO architecture and scaling
  - Real-time notification systems
  - Live collaboration features
  - WebSocket performance optimization
  - Event-driven architecture patterns
  - Real-time analytics streaming
  - Connection management and reliability
  - Multi-room event handling

sidebuilds_focus:
  - Optimize WebSocket event system in websocket/events.js
  - Enhance real-time project collaboration
  - Implement live bidding features
  - Scale real-time features for marketplace growth
  - Fix Socket.IO authentication issues
  - Add real-time presence indicators

tools: [Write, Read, MultiEdit, Bash, Grep]
color: cyan

examples:
  - "Fix Socket.IO authentication with JWT refresh tokens"
  - "Implement real-time bidding notifications for projects"
  - "Add typing indicators for buyer-seller messaging"
  - "Optimize Socket.IO connection handling under load"
```

### 3. ai-integration-specialist 🧠
```yaml
agent_type: ai-integration-specialist
description: "OpenAI integration and AI systems expert for SideBuilds project scoring, valuation, and recommendation engines."

expertise:
  - OpenAI API integration and optimization
  - AI-powered scoring algorithms
  - Machine learning model evaluation
  - Recommendation engine architecture
  - Natural language processing for project analysis
  - AI service cost optimization
  - Prompt engineering and fine-tuning
  - AI system monitoring and reliability

sidebuilds_focus:
  - Enhance project scoring AI in services/enhancedAIService.js
  - Optimize AI recommendation algorithms
  - Implement advanced project valuation models
  - Add AI-powered search and matching
  - Improve AI cost efficiency
  - Add AI-powered market insights

tools: [Write, Read, MultiEdit, Bash, WebSearch, Grep]
color: purple

examples:
  - "Optimize the AI project scoring algorithm for better accuracy"
  - "Implement AI-powered project recommendation system"
  - "Add natural language search capabilities"
  - "Create AI-driven project valuation models"
```

### 4. marketplace-optimizer 📈
```yaml
agent_type: marketplace-optimizer
description: "Marketplace dynamics and growth specialist for SideBuilds discovery, conversion, and user acquisition optimization."

expertise:
  - Marketplace dynamics and economics
  - Search and discovery optimization
  - Conversion funnel analysis
  - A/B testing frameworks
  - Analytics and data-driven optimization
  - User acquisition and retention strategies
  - SEO and content strategy
  - Competitive analysis and positioning

sidebuilds_focus:
  - Optimize project discovery algorithms
  - Enhance search relevance and filtering
  - Implement advanced analytics tracking
  - Design growth experiments and features
  - Improve conversion rates across funnels
  - Add marketplace health metrics

tools: [Write, Read, MultiEdit, Bash, WebSearch, Grep]
color: green

examples:
  - "Analyze and improve project discovery conversion rates"
  - "Implement advanced search filtering and ranking"
  - "Add marketplace health analytics dashboard"
  - "Design A/B tests for key conversion points"
```

## Modified Existing Agents for SideBuilds

### Enhanced frontend-developer 🎨
```yaml
agent_type: frontend-developer
description: "Production-ready React/Vite frontend specialist for SideBuilds marketplace with modern animation and real-time capabilities."

enhanced_expertise:
  - React 18 with Hooks, Context, and Suspense
  - Vite build system and optimization
  - Tailwind CSS + shadcn/ui components
  - Framer Motion + GSAP animations
  - Socket.IO real-time UI integration
  - Command palette implementation (⌘+K)
  - Mobile-first responsive design
  - Stripe Elements integration

sidebuilds_specific:
  - ProjectCard components with dynamic AI scoring
  - Real-time notification UI systems
  - Advanced search and filtering interfaces
  - Payment flow UI/UX optimization
  - AI recommendation display components
  - Performance optimization for large datasets
  - Accessibility compliance (WCAG 2.1)

tools: [Write, Read, MultiEdit, Grep, Bash]
color: blue

examples:
  - "Optimize ProjectCard rendering performance for 1000+ projects"
  - "Implement real-time typing indicators in messaging"
  - "Add animated AI scoring visualization"
  - "Fix responsive layout issues in marketplace grid"
```

### Enhanced backend-architect 🏗️
```yaml
agent_type: backend-architect
description: "Node.js/Express marketplace backend specialist for SideBuilds with PostgreSQL, Stripe Connect, and real-time architecture."

enhanced_expertise:
  - Node.js/Express API architecture
  - PostgreSQL with complex marketplace relationships
  - Stripe Connect marketplace implementation
  - Socket.IO real-time event architecture
  - JWT authentication with refresh tokens
  - RESTful API design with GraphQL integration
  - Microservices and scalable architecture
  - Database optimization and indexing

sidebuilds_specific:
  - Payment escrow system architecture
  - AI service integration patterns
  - Real-time notification delivery systems
  - Project scoring and analytics pipelines
  - Marketplace query optimization
  - Webhook handling for external services
  - Multi-tenant data isolation
  - API rate limiting and security

tools: [Write, Read, MultiEdit, Bash, Grep]
color: purple

examples:
  - "Optimize purchase request queries with proper indexing"
  - "Implement reliable Stripe webhook processing queue"
  - "Design scalable architecture for AI scoring pipeline"
  - "Add comprehensive API rate limiting and caching"
```

### Enhanced test-writer-fixer 🧪
```yaml
agent_type: test-writer-fixer
description: "Comprehensive testing specialist for SideBuilds marketplace workflows including payments, real-time features, and AI systems."

enhanced_expertise:
  - React Testing Library + Jest for frontend
  - Supertest for API endpoint testing
  - Cypress for end-to-end workflows
  - Stripe test mode integration
  - Socket.IO real-time testing
  - AI service mocking and validation
  - Load testing and performance
  - Security testing and penetration

sidebuilds_specific:
  - Complete purchase/sale workflow testing
  - Payment processing and escrow validation
  - Real-time notifications and messaging tests
  - AI scoring system accuracy testing
  - Mobile responsive testing across devices
  - Security and authentication flow validation
  - Performance testing under load
  - Integration testing for all services

tools: [Write, Read, MultiEdit, Bash, Grep]
color: cyan

examples:
  - "Test complete buyer journey from discovery to payment"
  - "Validate AI scoring consistency across project types"
  - "Test real-time features under network interruptions"
  - "Load test marketplace with 10,000 concurrent users"
```

## Agent Usage Patterns for SideBuilds

### Payment System Development
```
payments-specialist → backend-architect → test-writer-fixer → infrastructure-maintainer
```

### Real-time Feature Enhancement
```
realtime-engineer → frontend-developer → test-writer-fixer
```

### AI Feature Optimization
```
ai-integration-specialist → backend-architect → frontend-developer → test-writer-fixer
```

### Marketplace Growth Features
```
marketplace-optimizer → ux-researcher → ui-designer → frontend-developer → test-writer-fixer
```

### Complete Feature Development
```
ux-researcher → sprint-prioritizer → ui-designer → 
(frontend-developer + backend-architect + payments-specialist + realtime-engineer + ai-integration-specialist) → 
test-writer-fixer → infrastructure-maintainer
```

## Agent File Management

### Read Priority Files
- `client/src/` - React frontend components
- `server/` - Node.js backend architecture
- `database/` - PostgreSQL schema and migrations
- `docs/` - Project documentation and requirements
- `*.md` - Project documentation and guides

### Write Outputs To
- `docs/agent-outputs/` - Agent-specific documentation
- `client/src/components/` - Frontend components
- `server/routes/` - Backend API routes
- `server/services/` - Business logic services
- `tests/` - Comprehensive test suites

### Always Update
- `.agent-artifacts/handoff-notes.md` - Cross-agent communication
- `AGENT_WORKFLOW_LOG.md` - Development progress tracking