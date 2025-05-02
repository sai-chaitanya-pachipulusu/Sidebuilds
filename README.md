# SideBuilds.space

A platform for tracking, sharing, and selling side projects. Built with React, Node.js, Express, and CockroachDB.

## Features

- 🚀 Track your side projects from idea to launch
- 🔄 Monitor progress and update project status
- 🌐 Publish projects to a public directory
- 💲 List projects for sale in the marketplace
- 🌓 Dark/light theme support
- 📱 Fully responsive design

## Tech Stack

### Frontend
- React
- React Router
- Axios
- CSS (with custom theming)

### Backend
- Node.js
- Express
- JWT Authentication
- PostgreSQL (CockroachDB)

### Deployment
- CockroachDB (Database)
- Render (Backend hosting)
- Vercel (Frontend hosting)
- Custom domain: sidebuilds.space

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm
- PostgreSQL or CockroachDB

### Local Development

1. **Clone the repository**
   ```
   git clone https://github.com/yourusername/sidebuilds.git
   cd sidebuilds
   ```

2. **Set up environment variables**
   - Create a `.env` file in the server directory based on `.env.example`
   - Create a `.env` file in the client directory based on `.env.example`

3. **Install dependencies**
   ```
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

4. **Set up the database**
   - Create a CockroachDB instance or use PostgreSQL locally
   - Run the schema file: `psql -U youruser -d yourdatabase -f database/schema.sql`
   - Optionally run the seed file: `psql -U youruser -d yourdatabase -f database/seed.sql`

5. **Start the development servers**
   ```
   # Start the backend server (from the server directory)
   npm run dev

   # Start the frontend server (from the client directory)
   npm run dev
   ```

6. **Access the application**
   - Backend: http://localhost:5001
   - Frontend: http://localhost:3000

## Deployment

For detailed deployment instructions, please see [docs/deployment-guide.md](docs/deployment-guide.md).

## Project Structure

```
├── client/               # React frontend
│   ├── public/           # Static files
│   └── src/
│       ├── components/   # Reusable components
│       ├── context/      # React context providers
│       ├── pages/        # Page components
│       ├── services/     # API service functions
│       └── styles/       # Global styles
├── server/               # Express backend
│   ├── middleware/       # Express middleware
│   ├── routes/           # API routes
│   ├── db.js             # Database connection
│   └── index.js          # Server entry point
├── database/             # Database scripts
│   ├── schema.sql        # Database schema
│   └── seed.sql          # Sample data
└── scripts/              # Utility scripts
    └── deploy-database.js # Database deployment script
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 