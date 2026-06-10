# SideBuilds — Side Project Marketplace

<div align="center">
  <img src="https://img.shields.io/badge/Status-Production%20Ready-brightgreen" alt="Status" />
  <img src="https://img.shields.io/badge/Version-2.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</div>

A marketplace for buying and selling side projects — combining Product Hunt-style discovery, Flippa-style secure transactions, and a Linear/Chronicle-inspired UI.

**Live:** [sidebuilds.online](https://www.sidebuilds.online) · **API:** api.sidebuilds.online

---

## Features

| Feature                  | Description                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| 🏪 **Marketplace**       | Browse, filter, and buy projects with secure Stripe Connect escrow |
| 🤝 **Purchase workflow** | Express interest → negotiate → accept → pay → transfer → confirm   |
| 💬 **Real-time**         | Socket.IO messaging, typing indicators, live notifications          |
| ⭐ **Reviews**           | Verified-buyer reviews and seller star ratings                      |
| ❓ **Project Q&A**       | Public buyer questions with seller answers on every listing         |
| 🔖 **Watchlist**         | Save projects and revisit them at `/saved`                          |
| 👥 **Follow sellers**    | Get notified when sellers you follow list something new             |
| 🔥 **Trending**          | Engagement-ranked trending page (views + interest, recency decay)   |
| 🤖 **AI scoring**        | Project quality scoring and valuation (OpenAI)                      |
| ⌘ **Command palette**    | Keyboard-first navigation (⌘K / Ctrl+K)                             |

---

## Tech Stack

| Layer        | Technologies                                              |
| ------------ | --------------------------------------------------------- |
| **Frontend** | React 18 (Create React App), Tailwind CSS, Framer Motion  |
| **Backend**  | Node.js 20, Express, Socket.IO                            |
| **Database** | PostgreSQL (Supabase) — SQLite optional for local dev     |
| **Payments** | Stripe Connect (Express accounts) with escrow             |
| **Hosting**  | Vercel (frontend) · Render (backend)                      |

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/sai-chaitanya-pachipulusu/Sidebuilds.git
cd Sidebuilds
cd server && npm install
cd ../client && npm install

# 2. Configure environment (fill in your own keys — never commit .env files)
cp server/.env.example server/.env
cp client/.env.example client/.env

# 3. Run from the repo root
npm run dev
```

**Local URLs:**

- Frontend: http://localhost:3002
- Backend API: http://localhost:5002

All secrets (database URL, JWT secret, Stripe keys, SMTP) live in `server/.env`,
which is gitignored. See [server/.env.example](server/.env.example) for the
full list of required variables.

---

## Project Structure

```
├── client/              # React frontend (CRA)
│   └── src/
│       ├── components/  # UI components (cards, Q&A, reviews, modals…)
│       ├── pages/       # Route pages (marketplace, dashboard, saved…)
│       └── services/    # API client and domain services
├── server/              # Express backend
│   ├── routes/          # API routes (auth, projects, payments, reviews…)
│   ├── services/        # Webhooks, notifications, idempotency, maintenance
│   ├── middleware/      # Auth, rate limiting, security headers
│   └── websocket/       # Socket.IO event handling
├── database/            # Schema and migrations
└── DOCS.md              # Full technical documentation
```

---

## Deployment

### Frontend (Vercel — account: `siaichaitanyap-8259`)

```bash
npm i -g vercel
vercel login                                  # authenticate the new account
vercel link --scope siaichaitanyap-8259      # link this repo to the account
vercel --prod                                 # deploy
```

Build settings come from [vercel.json](vercel.json) (build command, output
directory, API/socket proxying to the backend).

### Backend (Render)

Configured via [render.yaml](render.yaml). Set the environment variables from
`server/.env.example` in the Render dashboard — never in the repo.

### Database migrations

```bash
npm run db:migrate       # apply unified schema
# individual fixes live in database/migrations/
```

---

## Testing

```bash
node test-database-connection.js   # verify DB connectivity
cd client && npm test              # unit tests
npx cypress run                    # e2e tests (needs both servers running)
```

---

## Security Notes

- All payments are server-authoritative: prices come from the database, never
  the client; webhook signatures are verified; checkout uses idempotency keys.
- Funds are held in escrow until the buyer confirms asset transfer.
- Auth uses JWT (24h expiry with a refresh grace window), bcrypt password
  hashing, and rate-limited auth endpoints.
- Do not commit `.env` files or credentials of any kind. `.env.example` files
  contain placeholders only.

---

## Documentation

Complete technical documentation lives in **[DOCS.md](DOCS.md)** — architecture,
API reference, database schema, deployment, and troubleshooting.

---

## License

MIT

---

**Built with ❤️ for makers.**
