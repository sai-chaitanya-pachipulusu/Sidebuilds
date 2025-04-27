import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './App.css'; // Import the CSS file

// Import actual page components
import HomePage from './pages/HomePage'; 
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProjectPage from './pages/ProjectPage'; // For viewing/editing a single project
import NotFoundPage from './pages/NotFoundPage';
import ProjectFormPage from './pages/ProjectFormPage'; // Import the new form page
import ProjectDetailPage from './pages/ProjectDetailPage'; // Import the detail page
import PublicProjectsPage from './pages/PublicProjectsPage'; // Import public page
import MarketplacePage from './pages/MarketplacePage'; // Import Marketplace page

// Placeholder components for pages not yet created
// const HomePage = () => <div>Home Page - Publicly Accessible</div>;
// const DashboardPage = () => <div>Dashboard Page - Protected</div>;
// const ProjectPage = () => <div>Single Project Page - Protected</div>;
// const NotFoundPage = () => <div>404 Not Found</div>;

// --- Create actual placeholder components for now --- 
const PlaceholderHomePage = () => <div>Home Page - Publicly Accessible</div>;
// Keep other placeholders for now
// const PlaceholderProjectPage = () => <div>Single Project Page - Protected</div>;
const PlaceholderNotFoundPage = () => <div>404 Not Found</div>;


// --- Protected Route Component ---
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
        return <div>Loading...</div>; // Or a spinner component
    }

    if (!isAuthenticated) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience
        // than dropping them off on the home page.
        return <Navigate to="/login" replace />;
    }

    return children;
};


function App() {
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

  return (
    <div>
      {/* Improved Navigation */}
      <nav>
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/public-projects">Public Projects</Link></li>
          <li><Link to="/marketplace">Marketplace</Link></li>
          {isAuthenticated ? (
              <>
                <li><Link to="/dashboard">Dashboard</Link></li>
                <li><span>Welcome, {user?.username}!</span></li>
                <li><button onClick={handleLogout}>Logout</button></li>
              </>
          ) : (
              <>
                <li><Link to="/login">Login</Link></li>
                <li><Link to="/register">Register</Link></li>
              </>
          )}
        </ul>
      </nav>

      <hr />

      {/* Route Definitions */}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PlaceholderHomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/public-projects" element={<PublicProjectsPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/projects/new" // Add route for new project form
          element={
            <ProtectedRoute>
              <ProjectFormPage />
            </ProtectedRoute>
          }
        />
         <Route 
          path="/projects/:id" // Use the real detail page
          element={
            <ProtectedRoute>
              <ProjectDetailPage />
            </ProtectedRoute>
          }
        /> 
        
        {/* Catch-all route for 404 Not Found */}
        <Route path="*" element={<PlaceholderNotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;
