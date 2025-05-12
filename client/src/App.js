import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css'; // Import the CSS file
import NavBar from './components/NavBar';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';

// Import actual page components
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProjectFormPage from './pages/ProjectFormPage'; // Import the new form page
import ProjectDetailPage from './pages/ProjectDetailPage'; // Import the detail page
import PublicProjectsPage from './pages/PublicProjectsPage'; // Import public page
import MarketplacePage from './pages/MarketplacePage'; // Import Marketplace page
import PurchaseSuccessPage from './pages/PurchaseSuccessPage'; // Import purchase success page
import ProjectTransferPage from './pages/ProjectTransferPage'; // Import transfer status page
import ProfileSettingsPage from './pages/ProfileSettingsPage'; // Import profile settings page

// Import new certificate components
import CertificatePage from './pages/CertificatePage';
import VerifyPage from './pages/VerifyPage';
import FAQPage from './pages/FAQPage'; // Import FAQPage
import TermsPage from './pages/TermsPage'; // Import TermsPage

// Placeholder components for pages not yet created
// const HomePage = () => <div>Home Page - Publicly Accessible</div>;
// const DashboardPage = () => <div>Dashboard Page - Protected</div>;
// const ProjectPage = () => <div>Single Project Page - Protected</div>;
// const NotFoundPage = () => <div>404 Not Found</div>;

// --- Create actual placeholder components for now --- 
// const PlaceholderHomePage = () => <div>Home Page - Publicly Accessible</div>;
// Keep other placeholders for now
// const PlaceholderProjectPage = () => <div>Single Project Page - Protected</div>;

function App() {
    // Apply dark theme to document.body for full coverage
    useEffect(() => {
        document.body.className = 'dark-theme';
        document.documentElement.className = 'dark-theme';
    }, []);

    return (
        <div className="app-container dark-theme">
            <NavBar />
            <main>
                <Routes>
                    {/* Public Routes - Home, Login, Register */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/verify" element={<VerifyPage />} />
                    <Route path="/verify/:verificationCode" element={<VerifyPage />} />
                    <Route path="/faq" element={<FAQPage />} /> {/* Add FAQ route */}
                    <Route path="/terms" element={<TermsPage />} /> {/* Add Terms route */}
                    
                    {/* Protected Routes - Everything else requires login */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/public-projects" element={<PublicProjectsPage />} />
                        <Route path="/marketplace" element={<MarketplacePage />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/profile-settings" element={<ProfileSettingsPage />} />
                        <Route path="/projects/new" element={<ProjectFormPage />} />
                        <Route path="/projects/:id" element={<ProjectDetailPage />} />
                        <Route path="/projects/:projectId/transfer" element={<ProjectTransferPage />} />
                        <Route path="/purchase/success" element={<PurchaseSuccessPage />} />
                        <Route path="/certificates/:certificateId" element={<CertificatePage />} />
                    </Route>
                    
                    {/* Catch-all route for 404 Not Found */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;
