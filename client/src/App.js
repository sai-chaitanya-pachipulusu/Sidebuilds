import { MotionConfig } from 'framer-motion';
import React, { Suspense, lazy, useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import CommandPalette from './components/CommandPalette';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import ElegantLoadingScreen from './components/ElegantLoadingScreen';
import ProtectedRoute from './components/ProtectedRoute';
//import AnimatedBackground from './components/AnimatedBackground';
import ProductionErrorBoundary, { ComponentErrorBoundary } from './components/ProductionErrorBoundary';
import { Toaster } from 'react-hot-toast';
import './index.css';

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
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
const SavedProjectsPage = lazy(() => import('./pages/SavedProjectsPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
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
  const { pathname } = useLocation();
  const previousPath = useRef(null);
  useEffect(() => {
    if (previousPath.current !== null && previousPath.current !== pathname)
      document.getElementById('main-content')?.focus({ preventScroll: true });
    previousPath.current = pathname;
  }, [pathname]);
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

    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user"><div className="min-h-screen bg-black text-white">
      {/* <AnimatedBackground variant="constellation" /> */}
      <NavBar />
      
      {/* Enhanced Command Palette with state management */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />
      
      <main id="main-content" tabIndex={-1} className="relative z-10 pt-16">
        <ComponentErrorBoundary fallback={<ElegantLoadingScreen />}>
          <Suspense fallback={<ElegantLoadingScreen />}>
            <Routes>
                      {/* Public Routes */}
                      <Route path="/" element={<ComponentErrorBoundary><HomePage /></ComponentErrorBoundary>} />
                      <Route path="/login" element={<ComponentErrorBoundary><LoginPage /></ComponentErrorBoundary>} />
                      <Route path="/register" element={<ComponentErrorBoundary><RegisterPage /></ComponentErrorBoundary>} />
                      <Route path="/forgot-password" element={<ComponentErrorBoundary><ForgotPasswordPage /></ComponentErrorBoundary>} />
                      <Route path="/reset-password" element={<ComponentErrorBoundary><ResetPasswordPage /></ComponentErrorBoundary>} />
                      <Route path="/marketplace" element={<ComponentErrorBoundary><MarketplacePage /></ComponentErrorBoundary>} />
                      <Route path="/projects/:id" element={<ComponentErrorBoundary><ProjectDetailPage /></ComponentErrorBoundary>} />
                      <Route path="/project/:id" element={<ComponentErrorBoundary><ProjectDetailPage /></ComponentErrorBoundary>} />
                      <Route path="/public-projects" element={<ComponentErrorBoundary><PublicProjectsPage /></ComponentErrorBoundary>} />
                      <Route path="/about" element={<ComponentErrorBoundary><AboutUsPage /></ComponentErrorBoundary>} />
                      <Route path="/blog" element={<ComponentErrorBoundary><BlogPage /></ComponentErrorBoundary>} />
                      <Route path="/contact" element={<ComponentErrorBoundary><ContactPage /></ComponentErrorBoundary>} />
                      <Route path="/faq" element={<ComponentErrorBoundary><FAQPage /></ComponentErrorBoundary>} />
                      <Route path="/help" element={<ComponentErrorBoundary><FAQPage /></ComponentErrorBoundary>} />
                      <Route path="/how-it-works" element={<ComponentErrorBoundary><HowItWorksPage /></ComponentErrorBoundary>} />
                      <Route path="/pricing" element={<ComponentErrorBoundary><PricingPage /></ComponentErrorBoundary>} />
                      <Route path="/terms" element={<ComponentErrorBoundary><TermsPage /></ComponentErrorBoundary>} />
                      <Route path="/trending" element={<ComponentErrorBoundary><TrendingPage /></ComponentErrorBoundary>} />
                      <Route path="/verify" element={<ComponentErrorBoundary><VerifyPage /></ComponentErrorBoundary>} />
                      <Route path="/verify/:verificationCode" element={<ComponentErrorBoundary><VerifyPage /></ComponentErrorBoundary>} />
                      <Route path="/vibe-code" element={<ComponentErrorBoundary><VibeCodePage /></ComponentErrorBoundary>} />
                      <Route path="/profile/:userId" element={<ComponentErrorBoundary><ProfilePage /></ComponentErrorBoundary>} />

                      {/* Protected Routes */}
                      <Route element={<ProtectedRoute />}>
                        <Route path="/create" element={<ComponentErrorBoundary><ProjectFormPage editMode={false} /></ComponentErrorBoundary>} />
                        <Route path="/dashboard" element={<ComponentErrorBoundary><DashboardPage /></ComponentErrorBoundary>} />
                        <Route path="/my-projects" element={<ComponentErrorBoundary><MyProjectsPage /></ComponentErrorBoundary>} />
                        <Route path="/projects/new" element={<ComponentErrorBoundary><ProjectFormPage editMode={false} /></ComponentErrorBoundary>} />
                        <Route path="/projects/edit/:id" element={<ComponentErrorBoundary><ProjectFormPage editMode={true} /></ComponentErrorBoundary>} />
                        <Route path="/profile" element={<ComponentErrorBoundary><ProfilePage /></ComponentErrorBoundary>} />
                        <Route path="/profile-settings" element={<ComponentErrorBoundary><ProfileSettingsPage /></ComponentErrorBoundary>} />
                        <Route path="/settings" element={<ComponentErrorBoundary><ProfileSettingsPage /></ComponentErrorBoundary>} />
                        <Route path="/notifications" element={<ComponentErrorBoundary><NotificationsPage /></ComponentErrorBoundary>} />
                        <Route path="/purchases" element={<ComponentErrorBoundary><PurchasesPage /></ComponentErrorBoundary>} />
                        <Route path="/saved" element={<ComponentErrorBoundary><SavedProjectsPage /></ComponentErrorBoundary>} />
                        <Route path="/admin" element={<ComponentErrorBoundary><AdminDashboardPage /></ComponentErrorBoundary>} />
                        <Route path="/purchase/success" element={<ComponentErrorBoundary><PurchaseSuccessPage /></ComponentErrorBoundary>} />
                        <Route path="/stripe/connect/complete" element={<ComponentErrorBoundary><StripeConnectCompletePage /></ComponentErrorBoundary>} />
                        <Route path="/project-transfer" element={<ComponentErrorBoundary><ProjectTransferPage /></ComponentErrorBoundary>} />
                      </Route>

                      {/* Catch-all Not Found Route */}
                      <Route path="*" element={<ComponentErrorBoundary><NotFoundPage /></ComponentErrorBoundary>} />
              </Routes>
          </Suspense>
        </ComponentErrorBoundary>
      </main>
      <Footer />
      
      {/* Enhanced Toast Notifications */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
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
    </div></MotionConfig>
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
