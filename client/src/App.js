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
import AnimatedBackground from './components/AnimatedBackground';
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

    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <AnimatedBackground variant="constellation" />
      <NavBar />
      
      {/* Enhanced Command Palette with state management */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />
      
      <main className="relative z-10">
        <Suspense fallback={<ElegantLoadingScreen />}>
          <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/marketplace" element={<MarketplacePage />} />
                    <Route path="/projects/:id" element={<ProjectDetailPage />} />
                    <Route path="/project/:id" element={<ProjectDetailPage />} />
                    <Route path="/public-projects" element={<PublicProjectsPage />} />
                    <Route path="/about" element={<AboutUsPage />} />
                    <Route path="/blog" element={<BlogPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/faq" element={<FAQPage />} />
                    <Route path="/help" element={<FAQPage />} />
                    <Route path="/how-it-works" element={<HowItWorksPage />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/trending" element={<TrendingPage />} />
                    <Route path="/verify" element={<VerifyPage />} />
                    <Route path="/verify/:verificationCode" element={<VerifyPage />} />
                    <Route path="/vibe-code" element={<VibeCodePage />} />
                    <Route path="/profile/:userId" element={<ProfilePage />} />
                    <Route path="/create" element={<ProjectFormPage editMode={false} />} />

                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute />}>
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/my-projects" element={<MyProjectsPage />} />
                      <Route path="/projects/new" element={<ProjectFormPage editMode={false} />} />
                      <Route path="/projects/edit/:id" element={<ProjectFormPage editMode={true} />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/profile-settings" element={<ProfileSettingsPage />} />
                      <Route path="/settings" element={<ProfileSettingsPage />} />
                      <Route path="/notifications" element={<NotificationsPage />} />
                      <Route path="/purchase/success" element={<PurchaseSuccessPage />} />
                      <Route path="/stripe/connect/complete" element={<StripeConnectCompletePage />} />
                      <Route path="/project-transfer" element={<ProjectTransferPage />} />
                    </Route>

                    {/* Catch-all Not Found Route */}
                    <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </Suspense>
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
    </div>
  )
}

// Main App Component
function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
