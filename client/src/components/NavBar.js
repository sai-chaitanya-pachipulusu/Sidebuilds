import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getNotifications } from '../services/api';

import { 
  Menu,
  X,
  Home,
  Grid3X3,
  ShoppingBag,
  PlusCircle,
  Settings,
  Bell,
  LogOut,
  HelpCircle,
  Code2,
  DollarSign,
  Command,
  User
} from 'lucide-react';
import { Badge } from '../shadcn/ui/badge';

const NavBar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const navRef = useRef(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const scrollY = useMotionValue(0);

  const navOpacity = useTransform(scrollY, [0, 50], [0.8, 0.95]);
  const navBlur = useTransform(scrollY, [0, 50], [8, 20]);
  const logoScale = useTransform(scrollY, [0, 100], [1, 0.9]);
  const springConfig = { damping: 20, stiffness: 300, restDelta: 0.001 };

  // Navigation items with enhanced structure
  const navItems = [
    { path: '/', label: 'Home', icon: Home, hasExternal: false },
    { path: '/marketplace', label: 'Marketplace', icon: ShoppingBag, hasExternal: false },
    { path: '/how-it-works', label: 'How it Works', icon: HelpCircle, hasExternal: false },
    { path: '/dashboard', label: 'Dashboard', icon: Grid3X3, requiresAuth: true },
  ];

  // User menu items with enhanced marketplace-focused options
  const userMenuItems = [
    { label: 'My Projects', icon: Code2, path: '/my-projects', description: 'Manage your project listings' },
    { label: 'Purchase History', icon: ShoppingBag, path: '/dashboard?tab=purchases', description: 'View your bought projects' },
    { label: 'Earnings & Sales', icon: DollarSign, path: '/dashboard?tab=sales', description: 'Track your revenue & sales' },
    { type: 'divider' },
    { label: 'Account Settings', icon: Settings, path: '/profile-settings', description: 'Profile & preferences' },
    { label: 'Notifications', icon: Bell, path: '/notifications', description: 'Manage your alerts' },
    { type: 'divider' },
    { label: 'Help & Support', icon: HelpCircle, path: '/faq', description: 'Get help & documentation' },
    { label: 'Logout', icon: LogOut, action: 'logout', description: 'Sign out securely' },
  ];

  // Enhanced scroll effect with spring physics
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 20);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsNotificationOpen(false);
  }, [location]);

  // Fetch notifications
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsProfileOpen(false);
    navigate('/');
  };

  const handleUserMenuAction = (action, path) => {
    if (action === 'logout') {
      handleLogout();
    } else if (path) {
      navigate(path);
    }
    setIsUserMenuOpen(false);
  };

  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('openCommandPalette'));
  };

  return (
    <>
      {/* Enhanced floating navbar inspired by framer.com and liveblocks.io */}
      <motion.nav
        ref={navRef}
        className={`fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 pt-3 sm:pt-4 ${
          isScrolled 
            ? 'bg-black/80 backdrop-blur-xl border-b border-gray-800/50' 
            : 'bg-transparent'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className={`max-w-7xl mx-auto transition-all duration-700 ease-out ${
            isScrolled 
              ? 'bg-black/90 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/20 rounded-2xl' 
              : 'bg-black/60 backdrop-blur-md border border-white/[0.05] rounded-2xl hover:bg-black/70'
          }`}
          style={{
            backdropFilter: `blur(${navBlur}px)`,
            opacity: navOpacity,
          }}
          whileHover={{ 
            borderColor: 'rgba(255, 255, 255, 0.12)',
            transition: { duration: 0.3 }
          }}
        >
          <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6">
            
            {/* Enhanced Logo with framer.com style scaling */}
            <motion.div
              className="flex items-center gap-3"
              style={{ scale: logoScale }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link to="/" className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">S</span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-black animate-pulse" />
                </div>
                <span className="text-xl font-bold text-white">SideBuilds</span>
                <Badge className="bg-purple-500/20 text-purple-300 text-xs border-purple-400/30">
                  2.0
                </Badge>
              </Link>
            </motion.div>

            {/* Enhanced Navigation Items with liveblocks.io styling */}
            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: index * 0.05,
                    type: "spring",
                    ...springConfig
                  }}
                >
                  <Link
                    to={item.path}
                    className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 group overflow-hidden no-underline ${
                      location.pathname === item.path
                        ? 'text-white bg-white/[0.12]'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    style={{ textDecoration: 'none' }}
                  >
                    {/* Liveblocks.io precise hover background */}
                    <motion.div
                      className="absolute inset-0 bg-white/[0.08] rounded-lg"
                      initial={{ scale: 0.9, opacity: 0 }}
                      whileHover={{ 
                        scale: 1, 
                        opacity: location.pathname === item.path ? 0 : 1,
                        transition: { 
                          type: "spring", 
                          stiffness: 350, 
                          damping: 25,
                          duration: 0.25
                        }
                      }}
                    />
                    <motion.span 
                      className="relative z-10"
                      whileHover={{ 
                        scale: 1.02,
                        transition: { type: "spring", stiffness: 400, damping: 30 }
                      }}
                    >
                      {item.label}
                    </motion.span>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Enhanced Right Section */}
            <div className="flex items-center space-x-3">
              
              {/* Enhanced Command Palette with liveblocks.io style */}
              <motion.button
                onClick={openCommandPalette}
                className="hidden md:flex items-center space-x-2 px-3 py-2 rounded-xl text-gray-400 hover:text-white transition-all duration-200 group relative overflow-hidden"
                whileHover={{ 
                  scale: 1.02,
                  transition: { type: "spring", stiffness: 400, damping: 25 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Liveblocks.io hover background */}
                <motion.div
                  className="absolute inset-0 bg-white/[0.08] rounded-xl"
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileHover={{ 
                    scale: 1, 
                    opacity: 1,
                    transition: { type: "spring", stiffness: 200, damping: 20, duration: 0.3 }
                  }}
                />
                <Command className="w-3.5 h-3.5 relative z-10" />
                <span className="text-xs font-medium tracking-wider relative z-10">⌘K</span>
              </motion.button>

              {isAuthenticated ? (
                <>
                  {/* Enhanced Create Button with liveblocks.io effect */}
                  <motion.button
                    onClick={() => navigate('/projects/new')}
                    className="hidden md:flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium text-sm shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200 group relative overflow-hidden"
                    whileHover={{ 
                      scale: 1.02,
                      transition: { type: "spring", stiffness: 400, damping: 25 }
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Enhanced gradient overlay for create button */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-purple-700 to-pink-700 rounded-xl"
                      initial={{ opacity: 0 }}
                      whileHover={{ 
                        opacity: 1,
                        transition: { duration: 0.2 }
                      }}
                    />
                    <PlusCircle className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Create</span>
                  </motion.button>

                  {/* Enhanced Notifications with liveblocks.io hover */}
                  <div className="relative">
                    <motion.button
                      onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                      className="relative p-2.5 rounded-xl text-gray-400 hover:text-white transition-all duration-200 group overflow-hidden"
                      whileHover={{ 
                        scale: 1.02,
                        transition: { type: "spring", stiffness: 400, damping: 25 }
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Liveblocks.io hover background */}
                      <motion.div
                        className="absolute inset-0 bg-white/[0.08] rounded-xl"
                        initial={{ scale: 0.8, opacity: 0 }}
                        whileHover={{ 
                          scale: 1, 
                          opacity: 1,
                          transition: { type: "spring", stiffness: 200, damping: 20, duration: 0.3 }
                        }}
                      />
                      <Bell className="w-5 h-5 relative z-10" />
                      {unreadCount > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-lg z-20"
                        >
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </motion.span>
                      )}
                    </motion.button>

                    {/* Enhanced Notification Dropdown */}
                    <AnimatePresence>
                      {isNotificationOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ 
                            duration: 0.2, 
                            ease: [0.22, 1, 0.36, 1],
                            type: "spring",
                            ...springConfig
                          }}
                          className="absolute right-0 mt-3 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
                        >
                          <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-purple-900/40 to-pink-900/40">
                            <h3 className="text-white font-semibold tracking-tight">Notifications</h3>
                            {unreadCount > 0 && (
                              <p className="text-xs text-purple-300 mt-1">{unreadCount} unread</p>
                            )}
                          </div>
                          <div className="max-h-96 overflow-y-auto">
                            {notifications.length > 0 ? (
                              notifications.slice(0, 5).map((notification, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ 
                                    delay: index * 0.05,
                                    type: "spring",
                                    ...springConfig
                                  }}
                                  className="p-4 hover:bg-gray-800 transition-colors duration-200 border-b border-gray-700 last:border-0 group cursor-pointer"
                                >
                                  <p className="text-sm text-gray-200 leading-relaxed group-hover:text-white transition-colors duration-200">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-2">
                                    {new Date(notification.created_at).toLocaleDateString()}
                                  </p>
                                </motion.div>
                              ))
                            ) : (
                              <div className="p-8 text-center text-gray-500">
                                <Bell className="w-8 h-8 mx-auto mb-3 opacity-40" />
                                <p className="text-sm">No notifications yet</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Enhanced User Menu with liveblocks.io hover */}
                  <div className="relative" ref={profileRef}>
                    <motion.button
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center gap-3 p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user?.username?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="hidden md:block text-left">
                        <div className="text-sm text-white font-medium">
                          {user?.username || 'User'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {user?.email}
                        </div>
                      </div>
                    </motion.button>

                    {/* Enhanced Dropdown Menu */}
                    <AnimatePresence>
                      {isProfileOpen && (
                        <motion.div
                          className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                        >
                          {/* User info header */}
                          <div className="p-4 border-b border-gray-700">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium">
                                  {user?.username?.[0]?.toUpperCase() || 'U'}
                                </span>
                              </div>
                              <div>
                                <div className="text-white font-medium">{user?.username}</div>
                                <div className="text-xs text-gray-400">{user?.email}</div>
                              </div>
                            </div>
                          </div>

                          {/* Menu items */}
                          <div className="py-2">
                            {userMenuItems.map((item, index) => {
                              if (item.type === 'divider') {
                                return <div key={index} className="border-t border-gray-700 my-2" />;
                              }
                              
                              if (item.action === 'logout') {
                                return <React.Fragment key={`logout-${index}`} />; // Empty fragment with key
                              }
                              
                              const Icon = item.icon;
                              
                              if (!Icon) {
                                return <React.Fragment key={`no-icon-${index}`} />; // Empty fragment with key
                              }
                              
                              return (
                                <motion.div 
                                  key={item.label}
                                  whileHover={{ x: 4 }}
                                >
                                  <Link
                                    to={item.path}
                                    className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                                    onClick={() => setIsProfileOpen(false)}
                                  >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                  </Link>
                                </motion.div>
                              );
                            })}
                            
                            <div className="border-t border-gray-700 mt-2 pt-2">
                              <motion.button
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors"
                                whileHover={{ x: 4 }}
                              >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="hidden md:flex items-center space-x-2">
                  {/* Liveblocks.io style Sign In button */}
                  <motion.div
                    whileHover={{ 
                      scale: 1.02,
                      transition: { type: "spring", stiffness: 400, damping: 25 }
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      to="/login"
                      className="relative px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors duration-200 rounded-lg overflow-hidden group no-underline"
                      style={{ textDecoration: 'none' }}
                    >
                      {/* Liveblocks.io hover background */}
                      <motion.div
                        className="absolute inset-0 bg-white/[0.08] rounded-lg"
                        initial={{ scale: 0.9, opacity: 0 }}
                        whileHover={{ 
                          scale: 1, 
                          opacity: 1,
                          transition: { type: "spring", stiffness: 350, damping: 25, duration: 0.25 }
                        }}
                      />
                      <span className="relative z-10">Sign in</span>
                    </Link>
                  </motion.div>
                  
                  {/* Liveblocks.io style Get Started button */}
                  <motion.div
                    whileHover={{ 
                      scale: 1.02,
                      transition: { type: "spring", stiffness: 400, damping: 25 }
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      to="/register"
                      className="relative px-4 py-2 text-sm font-medium text-black bg-white rounded-lg hover:bg-gray-100 transition-colors duration-200 shadow-sm no-underline"
                      style={{ textDecoration: 'none' }}
                    >
                      Get started
                    </Link>
                  </motion.div>
                </div>
              )}

              {/* Enhanced Mobile Menu Toggle */}
              <motion.button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  animate={{ rotate: isMobileMenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </motion.div>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.nav>

      {/* Enhanced Mobile Menu with premium animations */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ 
                type: 'spring', 
                damping: 25, 
                stiffness: 200,
                duration: 0.6 
              }}
              className="absolute right-2 sm:right-4 top-2 sm:top-4 bottom-2 sm:bottom-4 w-full max-w-xs sm:w-80 bg-gray-900/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl"
            >
              <div className="flex flex-col h-full pt-12 sm:pt-16 pb-4 sm:pb-6 px-4 sm:px-6 safe-area-bottom">
                
                {/* Mobile Navigation Items */}
                <div className="space-y-2">
                  {navItems.map((item, index) => {
                    if (item.requiresAuth && !user) return null;
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    
                    return (
                      <motion.div
                        key={item.path}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          delay: index * 0.1, 
                          duration: 0.3,
                          type: "spring",
                          ...springConfig
                        }}
                      >
                        <Link
                          to={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center space-x-3 px-3 sm:px-4 py-3 sm:py-4 rounded-xl transition-all duration-300 min-h-[48px] ${
                            isActive
                              ? 'bg-white/[0.08] text-white border border-white/10'
                              : 'text-gray-300 hover:text-white hover:bg-white/[0.05]'
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : ''}`} />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Mobile User Section */}
                <div className="mt-auto space-y-4">
                  {isAuthenticated ? (
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, type: "spring", ...springConfig }}
                      >
                        <Link
                          to="/projects/new"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium shadow-lg min-h-[48px]"
                        >
                          <PlusCircle className="w-5 h-5" />
                          <span>Create Project</span>
                        </Link>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, type: "spring", ...springConfig }}
                      >
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center justify-center space-x-2 px-3 sm:px-4 py-3 sm:py-4 rounded-xl border border-white/[0.08] text-gray-300 hover:text-white hover:bg-white/[0.05] transition-all duration-300 min-h-[48px]"
                        >
                          <LogOut className="w-5 h-5" />
                          <span>Logout</span>
                        </button>
                      </motion.div>
                    </>
                  ) : (
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, type: "spring", ...springConfig }}
                      >
                        <Link
                          to="/login"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block w-full text-center px-3 sm:px-4 py-3 sm:py-4 rounded-xl border border-white/[0.08] text-gray-300 hover:text-white hover:bg-white/[0.05] transition-all duration-300 min-h-[48px] flex items-center justify-center"
                        >
                          Sign In
                        </Link>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, type: "spring", ...springConfig }}
                      >
                        <Link
                          to="/register"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block w-full text-center px-3 sm:px-4 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium shadow-lg min-h-[48px] flex items-center justify-center"
                        >
                          Get Started
                        </Link>
                      </motion.div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside handlers */}
      {(isUserMenuOpen || isNotificationOpen) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setIsUserMenuOpen(false);
            setIsNotificationOpen(false);
          }}
        />
      )}
    </>
  );
};

export default NavBar;
