# SideBuilds — Investor Pitch Deck

### _The Liquidity Engine for the Creator Economy_

**sidebuilds.space** | Version 1.0 | March 2026

---

> **How to use this document:** Each section below represents one slide. Read the **Slide Headline** as the title, the body as the speaker notes / talking points, and present the visuals described in the `[VISUAL]` callouts.

---

## SLIDE 1: Title Slide

### SideBuilds

**"The place where side projects find their next owner."**

_Turning developer-built digital assets into liquid, tradable investments._

`[VISUAL: Dark background, logo + URL sidebuilds.space + tagline. Clean, minimal — like Linear or Vercel's homepage aesthetic.]`

---

## SLIDE 2: The Hook — A Story

> _"Every week, thousands of developers kill their side projects. Not because they fail — but because there's no safe, easy way to sell them."_

**The Problem in 3 Sentences:**

- A developer builds a SaaS tool over 6 months. It earns $800/month.
- They get a new job, can't maintain it, and need to exit.
- They post in a Slack group, get 3 tire-kickers, then abandon it 3 months later. The project — worth $15,000+ — dies on a hard drive.

**This happens millions of times per year. This is the problem we solve.**

`[VISUAL: Simple 3-panel comic or diagram: "Builder burns out" → "Can't find buyer" → "$15k of value dies"]`

---

## SLIDE 3: The Market Gap — "The $50K Hole"

There are only two meaningful types of players in the space right now, and they both leave a massive segment unserved.

| Platform                        | Focus                    | Problem                                                                |
| ------------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| **Flippa**                      | $500 – $10M (everything) | Flooded with scams, domain parking, and spam. **Zero trust.**          |
| **Acquire.com**                 | $100K ARR+               | Won't even talk to you unless you're making $10K/month. **Too elite.** |
| **Microns / Tiny Acquisitions** | Under $5K                | Too small, no tooling, essentially a classified ad. **Too bare.**      |

### ✅ The Gap: **$5,000 – $50,000**

This is the "middle class" of the creator economy. Profitable, real products built by real developers. **Completely underserved.** This segment represents an estimated **$2.3B in illiquid digital assets** worldwide.

`[VISUAL: A horizontal bar showing the market, with a giant gap labeled "$2.3B Opportunity" between the Microns and Acquire zones. SideBuilds logo fills the gap.]`

---

## SLIDE 4: Our Solution — SideBuilds

**SideBuilds is the first dedicated lifecycle marketplace for the $5K–$50K digital asset class.**

We are not just a listing site. We are a **companion platform** — capturing the developer from the moment they have an idea, all the way through to a successful exit.

### What makes us different:

| Feature             | Competitors           | SideBuilds                                                               |
| ------------------- | --------------------- | ------------------------------------------------------------------------ |
| **Discovery**       | Revenue filters only  | **AI-powered matching** by Tech Stack + Business Model + Buyer Profile   |
| **Trust & Vetting** | Manual or none        | **AI Certified Build Score** (0-100) + GitHub/Revenue Verification       |
| **Safety**          | Agreements over email | **Cryptographic Escrow State Machine** (Interest → Lock → Pay → Release) |
| **UX**              | Dropdown menus        | **Command Palette (⌘+K)** — keyboard-native for developer users          |
| **Fees**            | 10-15% + listing fees | **5% success fee only. Free to list.**                                   |

`[VISUAL: Side-by-side product screenshot showing the SideBuilds marketplace filtering by "React + Node.js + $5K-$20K" vs. a competitor's basic price slider]`

---

## SLIDE 5: The Product — A Live Demo Walk-Through

### For Sellers (Developers)

1.  **List your project for free** — add tech stack, revenue, GitHub URL, and set your price in minutes.
2.  **Get your AI Score** — SideBuilds analyzes your project (code quality, market position, revenue multiple) and issues a **"Certified Build" badge** (e.g., 87/100). This is shareable on Twitter/X.
3.  **Receive offers** — real buyers, verified through the platform. Negotiate within the app.
4.  **Sell with confidence** — our 5-step Escrow system holds funds until the buyer has received the code, domain, and all assets.

### For Buyers (Entrepreneurs / Micro-PEs)

1.  **Search intelligently** — use the Command Palette (⌘+K) or filter by exact tech stack, category, and monthly revenue.
2.  **Trust the data** — every listing shows an AI-generated score, breaking down Revenue, Technical Quality, Market Demand, and Growth Potential.
3.  **Transact safely** — funds are held in Stripe-powered escrow. If something goes wrong, you get your money back. Every domain, GitHub repo, and asset is transferred through our dedicated secure transfer page.

`[VISUAL: Annotated screenshot of the ProjectDetailPage showing: 1) AI score badge 2) Escrow status 3) "Express Interest" button]`

---

## SLIDE 6: The Technology Moat — Why This Can't Be Easily Copied

We have built production-grade infrastructure that takes months to replicate.

### 🔒 The Escrow State Machine

A cryptographic workflow in PostgreSQL enforces every step of a transaction with **row-level locking** to prevent fraud. Status transitions are immutable once triggered:

```
Interest Expressed → Seller Accepts → Payment Locked → Asset Transfer → Buyer Confirms → Funds Released
```

Competitors handle this over email. We handle it with code.

### 🤖 The AI Valuation Engine

A dual-layer system (GPT-4 + deterministic algorithm) analyzes:

- Revenue quality and growth trajectory
- Technical stack modernity and maintainability
- Market demand by category (AI/ML commands 3-6x multiples)
- Seller credibility and documentation completeness

This produces a **Certified Build Score** — a shareable trust signal that doesn't exist anywhere else.

### ⛓️ Blockchain Escrow (Experimental)

We have also written a **Solidity smart contract** (`ProjectEscrow.sol`) that replicates the escrow logic on-chain. This future-proofs us for trustless, cross-border transactions where no single party (not even SideBuilds) holds the funds.

### 📡 Real-Time Infrastructure

Socket.IO powers live buyer presence (track who is viewing your listing right now), typing indicators during negotiations, and instant notifications across the entire transaction lifecycle.

`[VISUAL: A simple flow diagram of the state machine with colored boxes and arrows.]`

---

## SLIDE 7: Business Model

**Simple, aligned, and developer-friendly.**

We only win when our users win.

| Revenue Stream                | Details                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| **Transaction Fee (Primary)** | **5% success fee** on every completed sale. Sellers keep 95%.                                     |
| **Pro Subscription**          | $29/month — unlimited listings, featured placement, advanced analytics, buyer verification badge. |
| **Enterprise**                | $99/month — white-label, API access, custom contract templates, dedicated account manager.        |
| **AI Deep Dives (Future)**    | On-demand $49 AI analysis reports for buyers doing due diligence.                                 |

**Why the model works:**

- Free to list = maximum supply-side liquidity (unlike Flippa's listing fees).
- 5% fee = incentive aligned. We only earn if a deal closes.
- Subscription = predictable recurring revenue from power users.

### Unit Economics (Illustrative)

- **Average deal size:** $18,000
- **Platform fee per deal:** $900 (5%)
- **To reach $1M ARR:** ~1,111 completed transactions/year = **~93 deals/month**

`[VISUAL: A simple 3-tier bar chart showing Starter / Pro / Enterprise with price and key feature callouts]`

---

## SLIDE 8: Market Research & Opportunity

### The Tailwinds Are Massive

**1. The Rise of "Micro-PE"**
A new wave of solo entrepreneurs and small funds are buying profitable micro-SaaS tools to bundle or grow. Communities like MicroAcquire (before it rebranded to Acquire), Indie Hackers, and Twitter/X developer circles are exploding. These buyers need a trusted, filtered source.

**2. AI Makes Everyone a Builder**
Tools like GitHub Copilot and Claude have lowered the barrier to building dramatically. More developers are launching side projects than ever. More supply = more demand for an exit market.

**3. The "Creator Economy" is Maturing**
YouTubers have Patreon. Writers have Substack. Developers have... nothing purpose-built for their specific creator type. SideBuilds fills this gap.

**4. Trust is the Moat**
The current "market" is Twitter DMs, Slack groups, and forum posts. These have zero safety infrastructure. Any product that solves the trust problem owns the market.

### Total Addressable Market (TAM)

- ~50M developers worldwide. Conservatively, 1M build side projects annually.
- If 2% sell successfully through a marketplace, that's 20,000 transactions/year at an average of $18k = **$360M serviceable market in year 1, growing rapidly.**

`[VISUAL: A funnel or TAM/SAM/SOM concentric circle visual.]`

---

## SLIDE 9: Traction & Proof of Work

### What's Built (This Is Real & Live)

✅ **Full-stack production platform** deployed at `sidebuilds.space`
✅ **Stripe Connect** integration — fully live, sellers can onboard and receive payments today
✅ **AI Scoring Engine** — dual-layer (GPT-4 + fallback algorithm) analyzing projects in real-time
✅ **Escrow System** — complete 5-step transaction state machine with fund holding and release
✅ **Real-time infrastructure** — Socket.IO for live negotiations and notifications
✅ **32 production pages** — full buyer/seller workflow, profile management, analytics dashboard
✅ **45+ UI components** — Command Palette, Bento Grid, 3D cards, custom Trust Badges
✅ **Blockchain contract** — Solidity `ProjectEscrow.sol` written and ready for on-chain deployment
✅ **Cypress E2E test suite** — critical workflows automated and tested
✅ **Docker + CI/CD pipeline** — containerized, deployable via Vercel + Render

### Competitive Positioning

This has feature parity with platforms that raised $3M+ to build. We built it lean.

`[VISUAL: A "Feature Matrix" — checkmarks across SideBuilds vs Flippa vs Acquire vs Microns for: Escrow ✅❌✅❌ | AI Scoring ✅❌❌❌ | Blockchain ✅❌❌❌ | Free Listing ✅❌❌✅ | Dev-Native UX ✅❌❌❌]`

---

## SLIDE 10: Go-To-Market Strategy

**We don't need to find developers. We know exactly where they live.**

### Phase 1: Community-Led Growth (0-6 months)

- **Indie Hackers**: Post weekly "project for sale" threads. Become the official recommendation.
- **Twitter/X**: The "Tech Twitter" community already buys and sells tools via DMs. SideBuilds gives them a safe, official channel. Our Command Palette and "Certified Build" badge are inherently shareable.
- **Product Hunt**: Launch. Target #1 of the day for "Marketplace" category.
- **Dev.to / Hacker News**: "Show HN: I built a secure marketplace to sell your side projects safely."

### Phase 2: Supply-Side Flywheel (6-12 months)

- Partner with coding bootcamps and developer communities to onboard their graduates' projects.
- Integrate with GitHub — let sellers import their repo metadata directly, reducing friction to zero.
- Launch "Seller of the Month" spotlights to drive organic PR.

### Phase 3: Demand-Side (12-24 months)

- Target "Micro-PE" operators and newsletters (Acquisition Lab, The Bootstrapped Founder).
- Offer buyer-side subscriptions with deal alerts by tech stack and price range.

`[VISUAL: A 3-column roadmap: "Sellers First" → "Build Trust" → "Scale Demand"]`

---

## SLIDE 11: The Team

_[Placeholder — add your bio here]_

**Sai Chaitanya Pachipulusu** — Founder & Full-Stack Engineer

- Built SideBuilds end-to-end: React 18, Node.js, PostgreSQL, Stripe Connect, Socket.IO
- [Add your background, relevant experience, and why you are uniquely positioned to win this market]

`[Add any advisors, mentors, or notable community connections here]`

---

## SLIDE 12: The Ask

**We are raising [Amount] to:**

| Use of Funds              | %   | Goal                                                                           |
| ------------------------- | --- | ------------------------------------------------------------------------------ |
| **Marketing & Community** | 40% | Product Hunt launch, Indie Hackers sponsorship, Twitter/X creator partnerships |
| **Product Development**   | 35% | GitHub repo verification, "Open to Offers" mode, mobile app                    |
| **Operations & Infra**    | 15% | Scale Postgres, Redis for idempotency, CDN                                     |
| **Legal & Compliance**    | 10% | Smart contract auditing, escrow compliance                                     |

**What we will achieve:**

- 100 completed transactions in the first 90 days post-launch campaign
- $30K MRR within 12 months
- The verified, trusted standard for the micro-acquisition market

---

## SLIDE 13: Closing — The Vision

> _"We are building the infrastructure layer for the digital asset economy. Just as Stripe made internet payments safe and easy, SideBuilds is making internet business transfers safe and easy."_

**The 10-year vision:**

- Every GitHub repo has a "List on SideBuilds" button.
- Every bootstrapped founder has an exit strategy from day one.
- The $5K–$50K market, currently invisible and illiquid, becomes a mainstream, trusted asset class.

**SideBuilds: Where makers find the next chapter for their projects.**

`[VISUAL: Bold, full-screen closing slide: "sidebuilds.space — Let's Build the Exit Economy Together"]`

---

## APPENDIX A: Pricing Detail

| Tier       | Price                   | Key Features                                                                                           |
| ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| Starter    | **Free**                | List up to 3 projects, basic analytics, community support                                              |
| Pro        | **$29/mo** (or $290/yr) | Unlimited listings, featured placement, priority support, advanced analytics, buyer verification badge |
| Enterprise | **$99/mo** (or $990/yr) | White-label, API access, dedicated account manager, custom contract templates                          |

Platform takes **5% on every completed transaction** (all tiers).

---

## APPENDIX B: Full Feature Inventory

### Pages (32 total)

- `HomePage`, `MarketplacePage`, `ProjectDetailPage`, `DashboardPage`, `MyProjectsPage`, `PurchasesPage`
- `ProjectFormPage`, `ProjectTransferPage`, `PurchaseSuccessPage`, `TransactionDetailPage`
- `ProfilePage`, `ProfileSettingsPage`, `NotificationsPage`, `TrendingPage`
- `HowItWorksPage`, `PricingPage`, `FAQPage`, `BlogPage`, `AboutUsPage`, `ContactPage`, `TermsPage`
- `LoginPage`, `RegisterPage`, `StripeConnectCompletePage`, `VerifyPage`
- `VibeCodePage`, `CertificatePage`, `PublicProjectsPage`

### Key Components (45+ total)

- `CommandPalette`, `SmartRecommendationEngine`, `CompetitorAnalysisDashboard`
- `TrustBadge`, `TrustBadgeGroup`, `TrustScoreDisplay`
- `RealTimeNotifications`, `NotificationCenter`, `EnhancedNotifications`
- `ProjectCard`, `ProjectGallery`, `ProjectFileUploader`, `ProjectCollaboration`
- `AIProjectScoring`, `AIRecommendations`, `SearchAnalyticsPanel`
- `FileUploader`, `PaymentMethodSelector`, `StripeConnectModal`, `StripeConnectBanner`
- `ProductTour`, `CommandPalette`, `MagneticButton`, `BentoGrid`
- `ProductionErrorBoundary`, `ElegantLoadingScreen`, `PageTransition`
- `MarketplaceFilters`, `MarketplaceLoadingSkeleton`, `MobileOptimizedProjectCard`
- `AnimatedTestimonials`, `SEO`, `Footer`, `NavBar`

### APIs (8 route modules)

- `/api/auth`, `/api/projects`, `/api/purchase-requests`, `/api/payments`
- `/api/stripe`, `/api/ai`, `/api/users`, `/api/notifications`

---

## APPENDIX C: Key Technology Decisions & Rationale

| Decision                                   | Rationale                                                                                          |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **React 18 + Vite**                        | Fast hot-reload dev experience, excellent ecosystem for marketplace UIs                            |
| **Node.js + Express**                      | Non-blocking I/O ideal for high-concurrency (many buyers browsing, multiple offers on one project) |
| **PostgreSQL with row-level locking**      | ACID compliance + `FOR UPDATE` locking ensures no double-purchases at scale                        |
| **Stripe Connect**                         | Industry standard for multi-party marketplaces. Handles KYC, 1099s, and cross-border payouts       |
| **Socket.IO**                              | Real-time buyer presence is a critical trust signal for sellers                                    |
| **Solidity Escrow Contract**               | Future-proofs for crypto payments and trustless international transactions                         |
| **Dual DB (SQLite dev / PostgreSQL prod)** | Zero-config local dev, enterprise-grade production                                                 |
| **Framer Motion + shadcn/ui**              | Premium UX that matches what developers expect from modern tools                                   |
