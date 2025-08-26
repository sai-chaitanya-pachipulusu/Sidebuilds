# 🚀 SideBuilds Quick Start Guide

## 📋 Test Credentials

**All test users have the same password: `password123`**

| Email | Username | Role | Description |
|-------|----------|------|-------------|
| `john@sidebuilds.com` | `john_maker` | Verified Seller | Full-stack developer with SaaS projects |
| `sarah@sidebuilds.com` | `sarah_dev` | Verified Seller | Mobile app developer and UI/UX designer |
| `mike@sidebuilds.com` | `mike_founder` | Premium Seller | Serial entrepreneur with AI tools |
| `emma@sidebuilds.com` | `emma_designer` | Verified Seller | Product designer and no-code enthusiast |
| `alex@sidebuilds.com` | `alex_coder` | Verified Seller | Backend engineer and open source contributor |

## 🎯 Quick Start (3 Steps)

### Option 1: Automatic Startup
```bash
node start-sidebuilds.js
```

### Option 2: Manual Startup
```bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend  
cd client
npm start
```

### Option 3: Using NPM Scripts
```bash
npm run restart  # Kills ports and starts both servers
```

## 🌐 Access URLs

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:5001
- **Health Check**: http://localhost:5001/api/public/health
- **Marketplace API**: http://localhost:5001/api/public/marketplace

## 📦 Seeded Projects (8 Total)

The marketplace includes these test projects:

### 🚀 Launched Projects
1. **TaskFlow Pro** - $45,000 (AI project management, by john_maker)
2. **FitTracker Mobile** - $32,000 (Fitness app, by sarah_dev)
3. **EcoTrack Analytics** - $95,000 (Sustainability platform, by mike_founder)

### 🔧 MVP Stage
4. **CryptoPortfolio Tracker** - $18,000 (Crypto analytics, by mike_founder)
5. **DesignSystem Builder** - $12,500 (No-code design tool, by emma_designer)

### 💡 Ideas & Planning
6. **AI Code Reviewer** - $8,500 (GPT-4 code review, by alex_coder)
7. **Social Learning Platform** - $15,000 (P2P learning, by john_maker)

### 🏗️ Development
8. **Invoice Automation SaaS** - $22,000 (Business automation, by sarah_dev)

## 🔧 Troubleshooting

### Backend Won't Start
```bash
# Check if port is blocked
netstat -ano | findstr :5001

# Kill processes and restart
npm run kill-ports
cd server && npm start
```

### Frontend Won't Start
```bash
# Check if port is blocked
netstat -ano | findstr :3001

# Kill processes and restart
npm run kill-ports
cd client && npm start
```

### No Projects in Marketplace
```bash
# Verify database has data
node test-credentials.js

# Re-run migration if needed
cd database && node run-unified-migration.js
```

### Login Issues
```bash
# Reset passwords to 'password123'
node fix-passwords.js
```

## 🎮 Testing Workflow

1. **Visit**: http://localhost:3001
2. **Login**: Use any test email with password `password123`
3. **Browse Marketplace**: See 8 seeded projects
4. **View Project Details**: Click on any project
5. **Show Interest**: Test the purchase request flow
6. **Check Dashboard**: View your projects and analytics
7. **Real-time Features**: Test messaging and notifications

## 🔍 Database Verification

```bash
# Check database status
node test-credentials.js

# View database directly (SQLite)
sqlite3 server/sidebuilds-complete.db
.tables
SELECT COUNT(*) FROM projects WHERE is_for_sale = 1;
SELECT name, sale_price FROM projects LIMIT 5;
```

## 🚨 Common Issues & Solutions

### ECONNREFUSED Errors
- **Cause**: Backend server not running
- **Solution**: `cd server && npm start`

### Proxy Errors
- **Cause**: Frontend can't reach backend
- **Solution**: Ensure backend is on port 5001

### Empty Marketplace
- **Cause**: Database not seeded or wrong API endpoint
- **Solution**: Run `node test-credentials.js` to verify data

### Authentication Fails
- **Cause**: Wrong password or database issue
- **Solution**: Run `node fix-passwords.js` to reset passwords

## 📊 API Endpoints

### Public (No Auth Required)
- `GET /api/public/marketplace` - All marketplace projects
- `GET /api/public/health` - Server health check
- `GET /api/public/stats/marketplace` - Marketplace statistics

### Protected (Auth Required)
- `GET /api/projects` - User's projects
- `POST /api/projects` - Create new project
- `GET /api/dashboard` - Dashboard analytics
- `POST /api/purchase-requests` - Show interest in project

## 🎯 Key Features to Test

### ✅ Working Features
- User authentication and registration
- Project marketplace browsing
- Project creation and editing
- Purchase request system
- Real-time messaging
- Dashboard analytics
- AI project scoring (mock data)
- Mobile-responsive design

### 🔧 Enhanced Features
- Advanced search and filtering
- Real-time notifications
- Socket.IO messaging
- Stripe payment integration
- Project transfer workflow
- AI-powered recommendations

## 🚀 Production Deployment

When ready for production:

1. **Environment Variables**: Update `.env` files with production values
2. **Database**: Switch to PostgreSQL/Supabase
3. **Stripe**: Use live Stripe keys
4. **Deployment**: Use Vercel (frontend) + Render (backend)

## 📞 Support

If you encounter issues:

1. Check this guide first
2. Run `node test-credentials.js` for diagnostics
3. Check console logs in browser and terminal
4. Verify all services are running on correct ports

---

**🎉 You're ready to explore SideBuilds! Login with any test account and start browsing the marketplace.**