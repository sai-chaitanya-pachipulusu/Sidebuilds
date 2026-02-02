import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import CommandPalette from './components/CommandPalette';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import ElegantLoadingScreen from './components/ElegantLoadingScreen';
import ProtectedRoute from './components/ProtectedRoute';

import ProductionErrorBoundary, { ComponentErrorBoundary } from './components/ProductionErrorBoundary';
import { Toaster } from 'react-hot-toast';
import './index.css';

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePageSimple'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const MyProjectsPage = lazy(() => import('./pages/MyProjectsPage'));
const ProjectFormPage = lazy(() => import('./pages/ProjectFormPage'));
const ProfileSettingsPage = lazy(() => import('./pages/ProfileSettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const PurchaseSuccessPage = lazy(() => import('./pages/PurchaseSuccessPage'));
const StripeConnectCompletePage = lazy(() => import('./pages/StripeConnectCompletePage'));
const ProjectTransferPage = lazy(() => import('./pages/ProjectTransferPage'));
const PublicProjectsPage = lazy(() => import('./pages/PublicProjectsPage'));
const PurchasesPage = lazy(() => import('./pages/PurchasesPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AboutUsPage = lazy(() => import('./pages/AboutUsPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const TrendingPage = lazy(() => import('./pages/TrendingPage'));
const VerifyPage = lazy(() => import('./pages/VerifyPage'));
const VibeCodePage = lazy(() => import('./pages/VibeCodePage'));

// Main App Wrapper Component  
const AppContent = () => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Add keyboard shortcuts and global event listeners
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Command Palette: Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    const handleOpenCommandPalette = () => {
      setIsCommandPaletteOpen(true);
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('openCommandPalette', handleOpenCommandPalette);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('openCommandPalette', handleOpenCommandPalette);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] text-white overflow-x-hidden">
      {/* Global top glow - simplified without gradient */}
      <div 
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[600px] pointer-events-none z-40"
        style={{
          background: 'rgba(0, 0, 0, 0.99)',
        }}
      />
      
      {/* Remove AnimatedBackground - using cleaner approach */}
      <NavBar />
      
      {/* Enhanced Command Palette with state management */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />
      
      <main className="relative z-10">
        <ComponentErrorBoundary fallback={<ElegantLoadingScreen />}>
          <Suspense fallback={<ElegantLoadingScreen />}>
            <Routes>
              {/* ========== PUBLIC ROUTES - No login required ========== */}
              
              {/* Marketing Pages */}
              <Route path="/" element={<ComponentErrorBoundary><HomePage /></ComponentErrorBoundary>} />
              <Route path="/about" element={<ComponentErrorBoundary><AboutUsPage /></ComponentErrorBoundary>} />
              <Route path="/how-it-works" element={<ComponentErrorBoundary><HowItWorksPage /></ComponentErrorBoundary>} />
              <Route path="/pricing" element={<ComponentErrorBoundary><PricingPage /></ComponentErrorBoundary>} />
              <Route path="/faq" element={<ComponentErrorBoundary><FAQPage /></ComponentErrorBoundary>} />
              <Route path="/help" element={<ComponentErrorBoundary><FAQPage /></ComponentErrorBoundary>} />
              <Route path="/contact" element={<ComponentErrorBoundary><ContactPage /></ComponentErrorBoundary>} />
              <Route path="/blog" element={<ComponentErrorBoundary><BlogPage /></ComponentErrorBoundary>} />
              <Route path="/terms" element={<ComponentErrorBoundary><TermsPage /></ComponentErrorBoundary>} />
              
              {/* Auth Pages */}
              <Route path="/login" element={<ComponentErrorBoundary><LoginPage /></ComponentErrorBoundary>} />
              <Route path="/register" element={<ComponentErrorBoundary><RegisterPage /></ComponentErrorBoundary>} />
              <Route path="/verify" element={<ComponentErrorBoundary><VerifyPage /></ComponentErrorBoundary>} />
              <Route path="/verify/:verificationCode" element={<ComponentErrorBoundary><VerifyPage /></ComponentErrorBoundary>} />
              


              {/* ========== PROTECTED ROUTES - Login required ========== */}
              <Route element={<ProtectedRoute />}>
                {/* Dashboard & Projects Management */}
                <Route path="/dashboard" element={<ComponentErrorBoundary><DashboardPage /></ComponentErrorBoundary>} />
                <Route path="/my-projects" element={<ComponentErrorBoundary><MyProjectsPage /></ComponentErrorBoundary>} />
                <Route path="/create" element={<ComponentErrorBoundary><ProjectFormPage editMode={false} /></ComponentErrorBoundary>} />
                <Route path="/projects/edit/:id" element={<ComponentErrorBoundary><ProjectFormPage editMode={true} /></ComponentErrorBoundary>} />
                
                {/* Browsing - Login required to view projects/ideas */}
                <Route path="/marketplace" element={<ComponentErrorBoundary><MarketplacePage /></ComponentErrorBoundary>} />
                <Route path="/projects/:id" element={<ComponentErrorBoundary><ProjectDetailPage /></ComponentErrorBoundary>} />
                <Route path="/project/:id" element={<ComponentErrorBoundary><ProjectDetailPage /></ComponentErrorBoundary>} />
                <Route path="/profile/:userId" element={<ComponentErrorBoundary><ProfilePage /></ComponentErrorBoundary>} />
                
                {/* User Profile & Settings */}
                <Route path="/profile" element={<ComponentErrorBoundary><ProfilePage /></ComponentErrorBoundary>} />
                <Route path="/profile-settings" element={<ComponentErrorBoundary><ProfileSettingsPage /></ComponentErrorBoundary>} />
                <Route path="/settings" element={<ComponentErrorBoundary><ProfileSettingsPage /></ComponentErrorBoundary>} />
                <Route path="/notifications" element={<ComponentErrorBoundary><NotificationsPage /></ComponentErrorBoundary>} />
                
                {/* Purchases & Payments */}
                <Route path="/purchases" element={<ComponentErrorBoundary><PurchasesPage /></ComponentErrorBoundary>} />
                <Route path="/purchase/success" element={<ComponentErrorBoundary><PurchaseSuccessPage /></ComponentErrorBoundary>} />
                <Route path="/stripe/connect/complete" element={<ComponentErrorBoundary><StripeConnectCompletePage /></ComponentErrorBoundary>} />
                <Route path="/project-transfer" element={<ComponentErrorBoundary><ProjectTransferPage /></ComponentErrorBoundary>} />
              </Route>

              {/* Catch-all 404 */}
              <Route path="*" element={<ComponentErrorBoundary><NotFoundPage /></ComponentErrorBoundary>} />
            </Routes>
          </Suspense>
        </ComponentErrorBoundary>
      </main>
      <Footer />
      
      {/* Enhanced Toast Notifications */}
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            zIndex: 99999,
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  )
}

// Main App Component
function App() {
  return (
    <HelmetProvider>
      <ProductionErrorBoundary>
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </ProductionErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
