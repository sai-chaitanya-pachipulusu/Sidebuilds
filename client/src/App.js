import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react'; // Import ChakraProvider
import { AnimatePresence } from 'framer-motion'; // Import AnimatePresence
import theme from './theme'; // Import your custom theme
import './App.css'; // Import the CSS file
import NavBar from './components/NavBar';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';
import PageTransition from './components/PageTransition'; // Import PageTransition

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
    const location = useLocation(); // Get location for AnimatePresence key

    useEffect(() => {
        // Theme handling is now managed by ChakraProvider and index.css
    }, []);

    return (
        <ChakraProvider theme={theme}> {/* Wrap application with ChakraProvider and theme */}
            <div className="app-container"> {/* Removed dark-theme class here as Chakra/index.css should handle */}
                <NavBar />
                <main>
                    <AnimatePresence mode='wait'> {/* Use mode='wait' for smoother transitions */}
                        <Routes location={location} key={location.pathname}> {/* Pass location and key to Routes */}
                            {/* Public Routes - Home, Login, Register */}
                            <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
                            <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
                            <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />
                            <Route path="/verify" element={<PageTransition><VerifyPage /></PageTransition>} />
                            <Route path="/verify/:verificationCode" element={<PageTransition><VerifyPage /></PageTransition>} />
                            <Route path="/faq" element={<PageTransition><FAQPage /></PageTransition>} /> {/* Add FAQ route */}
                            <Route path="/terms" element={<PageTransition><TermsPage /></PageTransition>} /> {/* Add Terms route */}
                            
                            {/* Protected Routes - Everything else requires login */}
                            <Route element={<ProtectedRoute />}>
                                <Route path="/public-projects" element={<PageTransition><PublicProjectsPage /></PageTransition>} />
                                <Route path="/marketplace" element={<PageTransition><MarketplacePage /></PageTransition>} />
                                <Route path="/dashboard" element={<PageTransition><DashboardPage /></PageTransition>} />
                                <Route path="/profile-settings" element={<PageTransition><ProfileSettingsPage /></PageTransition>} />
                                <Route path="/projects/new" element={<PageTransition><ProjectFormPage /></PageTransition>} />
                                <Route path="/projects/:id" element={<PageTransition><ProjectDetailPage /></PageTransition>} />
                                <Route path="/projects/:projectId/transfer" element={<PageTransition><ProjectTransferPage /></PageTransition>} />
                                <Route path="/purchase/success" element={<PageTransition><PurchaseSuccessPage /></PageTransition>} />
                                <Route path="/certificates/:certificateId" element={<PageTransition><CertificatePage /></PageTransition>} />
                            </Route>
                            
                            {/* Catch-all route for 404 Not Found */}
                            <Route path="*" element={<PageTransition><NotFoundPage /></PageTransition>} />
                        </Routes>
                    </AnimatePresence>
                </main>
            </div>
        </ChakraProvider>
    );
}

export default App;
