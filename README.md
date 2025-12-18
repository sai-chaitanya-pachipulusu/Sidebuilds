# 🚀 SideBuilds - Modern Side Project Marketplace

<div align="center">
  <img src="https://img.shields.io/badge/Status-Production%20Ready-brightgreen" alt="Status" />
  <img src="https://img.shields.io/badge/Version-2.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</div>

**The Operating System for Modern Makers** — A premium marketplace for buying and selling side projects, combining the discovery power of Product Hunt, transaction security of Flippa, and modern UX of Linear/Chronicle.

---

## ✨ Features

| Feature                | Description                           |
| ---------------------- | ------------------------------------- |
| 🏪 **Marketplace**     | Buy/sell projects with secure escrow  |
| ⌘ **Command Palette**  | Keyboard-first navigation (⌘K)        |
| 🎨 **Modern UI**       | Linear/Chronicle-inspired design      |
| 🔒 **Secure Payments** | Stripe Connect with escrow protection |
| 🤖 **AI Scoring**      | Smart project quality scoring         |
| 📱 **Mobile-First**    | Responsive across all devices         |

---

## 🚀 Quick Start

```bash
# Install
git clone <repo> && cd SideProject-Tracker
cd server && npm install
cd ../client && npm install

# Configure
cp .env.example .env  # Add your keys

# Run
npm run dev
```

**Access:**

- Frontend: http://localhost:3002
- Backend: http://localhost:5001

**Test Accounts:**

- Seller: `seller1@test.com` / `password123`
- Buyer: `buyer1@test.com` / `password123`

---

## 🛠 Tech Stack

| Layer        | Technologies                                |
| ------------ | ------------------------------------------- |
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion |
| **Backend**  | Node.js, Express, PostgreSQL/SQLite         |
| **Payments** | Stripe Connect + Escrow                     |
| **Hosting**  | Vercel (frontend) + Render (backend)        |

---

## 📚 Documentation

All documentation has been consolidated into:

- **[DOCS.md](DOCS.md)** — Complete technical documentation
  - Architecture overview
  - API reference
  - Database schema
  - Deployment guide
  - Security & troubleshooting

---

## 📁 Project Structure

```
├── client/          # React frontend
├── server/          # Express backend
├── database/        # Database migrations
├── DOCS.md          # Complete documentation
└── README.md        # This file
```

---

## 🎯 Key Innovations

- **⌘K Command Palette** — Power user navigation
- **AI Quality Scoring** — Smart project recommendations
- **Premium UI/UX** — Bento Grid, Magnetic Buttons, Animated sections
- **Secure Escrow** — Protected buyer-seller transactions
- **Mobile-First** — Superior mobile experience

---

## 🧪 Testing

```bash
node deep-workflow-test.js  # Full workflow tests
npm test                     # Unit tests
```

---

## 📫 License

MIT License — see [LICENSE](LICENSE) for details.

---

**Built with ❤️ for makers.**
