import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import './App.css'; // Import the CSS file
import NavBar from './components/NavBar';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';

// Import actual page components
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProjectFormPage from './pages/ProjectFormPage'; // Import the new form page
import ProjectDetailPage from './pages/ProjectDetailPage'; // Import the detail page
import PublicProjectsPage from './pages/PublicProjectsPage'; // Import public page
import MarketplacePage from './pages/MarketplacePage'; // Import Marketplace page
import PurchaseSuccessPage from './pages/PurchaseSuccessPage'; // Import purchase success page

// Placeholder components for pages not yet created
// const HomePage = () => <div>Home Page - Publicly Accessible</div>;
// const DashboardPage = () => <div>Dashboard Page - Protected</div>;
// const ProjectPage = () => <div>Single Project Page - Protected</div>;
// const NotFoundPage = () => <div>404 Not Found</div>;

// --- Create actual placeholder components for now --- 
// const PlaceholderHomePage = () => <div>Home Page - Publicly Accessible</div>;
// Keep other placeholders for now
// const PlaceholderProjectPage = () => <div>Single Project Page - Protected</div>;


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
    const { logout } = useAuth();
    const { isLoading } = useAuth();
    const { isDarkMode } = useTheme();

    // Apply theme to document.body for full coverage
    React.useEffect(() => {
        document.body.className = isDarkMode ? 'dark-theme' : 'light-theme';
        document.documentElement.className = isDarkMode ? 'dark-theme' : 'light-theme';
    }, [isDarkMode]);

    return (
        <div className={`app-container ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
            <NavBar />
            <main>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<HomePage />} />
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
                        path="/projects/new"
                        element={
                            <ProtectedRoute>
                                <ProjectFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route 
                        path="/projects/:id"
                        element={
                            <ProtectedRoute>
                                <ProjectDetailPage />
                            </ProtectedRoute>
                        }
                    /> 
                    <Route 
                        path="/purchase/success"
                        element={
                            <ProtectedRoute>
                                <PurchaseSuccessPage />
                            </ProtectedRoute>
                        }
                    />
                    
                    {/* Catch-all route for 404 Not Found */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;
