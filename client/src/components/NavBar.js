import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useScroll, useSpring } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getNotifications } from '../services/api';
import Logo from './Logo';

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
  const notificationRef = useRef(null);

  const scrollY = useMotionValue(0);

  const navOpacity = useTransform(scrollY, [0, 50], [0.8, 0.95]);
  const navBlur = useTransform(scrollY, [0, 50], [8, 20]);
  const logoScale = useTransform(scrollY, [0, 100], [1, 0.9]);
  const springConfig = { damping: 20, stiffness: 300, restDelta: 0.001 };

  // Scroll progress indicator
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

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

  const handleNotificationClick = (notification) => {
    console.log('NavBar notification clicked:', notification);
    // Close notification dropdown
    setIsNotificationOpen(false);

    // Navigate based on notification type and available fields
    if (notification.type === 'purchase_request' || notification.type?.includes('interest') || notification.type?.includes('offer')) {
      console.log('NavBar: Navigating to dashboard for interests modal');
      // Navigate to dashboard to show interests modal
      navigate('/dashboard');
    } else if (notification.type?.includes('sale') || notification.type?.includes('payment') || notification.type === 'payment') {
      console.log('NavBar: Navigating to dashboard for sales modal');
      // Navigate to dashboard to show sales modal
      navigate('/dashboard');
    } else if (notification.action_url) {
      console.log('NavBar: Navigating to action_url:', notification.action_url);
      // Navigate to the specified action URL
      navigate(notification.action_url);
    } else if (notification.related_project_id) {
      console.log('NavBar: Navigating to project:', notification.related_project_id);
      // Navigate to project detail page
      navigate(`/project/${notification.related_project_id}`);
    } else if (notification.related_transaction_id) {
      console.log('NavBar: Navigating to transaction:', notification.related_transaction_id);
      // Navigate to transaction detail page
      navigate(`/transaction/${notification.related_transaction_id}`);
    } else {
      console.log('NavBar: Default navigation to notifications page');
      // Default to notifications page
      navigate('/notifications');
    }
  };

  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('openCommandPalette'));
  };

  return (
    <>
      {/* Modern navbar inspired by Linear, Resend, Clerk */}
      <motion.nav
        ref={navRef}
        className={`fixed top-2 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-black/60 backdrop-blur-md border-b border-white/10' 
            : 'bg-transparent border-b border-transparent'
        }`}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Scroll Progress Indicator removed for cleaner look */
        }
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo - Clean and minimal like Linear */}
            <motion.div
              className="flex items-center gap-2.5"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <Link to="/" className="flex items-center gap-2.5 no-underline">
                <Logo size={32} />
                <span className="text-lg font-bold text-white tracking-tight font-mono uppercase">SideBuilds</span>
              </Link>
            </motion.div>

            {/* Center Navigation - Pill container like Clerk/Linear */}
            <div className="hidden lg:flex items-center">
              <div className="flex items-center bg-white/[0.02] rounded-none px-1.5 py-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      className={`relative px-4 py-1.5 text-[13px] font-medium rounded-none transition-all duration-200 no-underline font-mono uppercase tracking-wider ${
                        isActive
                          ? 'text-white bg-white/[0.1]'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right Section - Refined actions */}
            <div className="flex items-center gap-2">
              
              {/* Command Palette - Minimal like Resend */}
              <motion.button
                onClick={openCommandPalette}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-none text-gray-500 hover:text-gray-300 hover:bg-white/[0.05] transition-all duration-200 border border-transparent hover:border-white/[0.08]"
                whileTap={{ scale: 0.97 }}
              >
                <Command className="w-3.5 h-3.5" />
                <span className="text-xs font-medium font-mono">⌘K</span>
              </motion.button>

              {isAuthenticated ? (
                <>
                  {/* Create Button - Brutalist */}
                  <motion.button
                    onClick={() => navigate('/create')}
                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-bold uppercase tracking-wider hover:bg-transparent hover:text-white border-2 border-white transition-all duration-200 font-mono"
                    whileTap={{ scale: 0.98 }}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span className="font-mono">Create</span>
                  </motion.button>

                  {/* Notification Bell - Clean */}
                  <div className="relative" ref={notificationRef}>
                    <motion.button
                      onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                      className="relative p-2 rounded-none text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all duration-200"
                      whileTap={{ scale: 0.95 }}
                    >
                      <Bell className="w-[18px] h-[18px]" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-none flex items-center justify-center font-bold">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </motion.button>

                    {/* Notification Dropdown */}
                    <AnimatePresence>
                      {isNotificationOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute top-full right-0 mt-2 w-80 bg-[#0a0a0a] border border-white/[0.08] rounded-none shadow-2xl overflow-hidden z-[100]"
                        >
                          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-semibold text-white">Notifications</h3>
                              {unreadCount > 0 && (
                                <p className="text-xs text-gray-500 mt-0.5">{unreadCount} unread</p>
                              )}
                            </div>
                            {notifications.length > 0 && (
                              <button
                                onClick={() => navigate('/notifications')}
                                className="text-xs text-gray-500 hover:text-white transition-colors font-mono"
                              >
                                View all
                              </button>
                            )}
                          </div>
                          <div className="max-h-80 overflow-y-auto">
                            {notifications.length > 0 ? (
                              notifications.slice(0, 5).map((notification, index) => (
                                <div
                                  key={index}
                                  className="p-3 hover:bg-white/[0.03] transition-colors cursor-pointer border-b border-white/[0.04] last:border-0 flex items-start gap-2"
                                  onClick={() => handleNotificationClick(notification)}
                                >
                                  {!notification.is_read && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                                  )}
                                  <div className={!notification.is_read ? '' : 'ml-3.5'}>
                                    <p className="text-sm text-gray-300 leading-relaxed font-mono">{notification.message}</p>
                                    <p className="text-xs text-gray-600 mt-1.5">
                                      {new Date(notification.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-6 text-center">
                                <Bell className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                                <p className="text-sm text-gray-500 font-mono">No notifications</p>
                              </div>
                            )}
                          </div>
                          {notifications.length > 0 && (
                            <div className="border-t border-white/[0.06] p-3">
                              <button
                                onClick={() => { navigate('/notifications'); setIsNotificationOpen(false); }}
                                className="w-full text-center text-xs text-gray-500 hover:text-white transition-colors font-mono uppercase tracking-wider py-1"
                              >
                                View All Notifications
                              </button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* User Avatar - Clean like Linear */}
                  <div className="relative" ref={profileRef}>
                    <motion.button
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center gap-2.5 p-1.5 rounded-none hover:bg-white/[0.05] transition-all duration-200"
                      whileTap={{ scale: 0.97 }}
                    >
                      <div className="w-7 h-7 bg-white flex items-center justify-center">
                        <span className="text-black text-xs font-bold">
                          {user?.username?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    </motion.button>

                    {/* Profile Dropdown */}
                    <AnimatePresence>
                      {isProfileOpen && (
                        <motion.div
                          className="absolute top-full right-0 mt-2 w-56 bg-[#0a0a0a] border border-white/[0.08] rounded-none shadow-2xl overflow-hidden z-50"
                          initial={{ opacity: 0, y: -8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                        >
                            {/* User info */}
                            <div className="p-3 border-b border-white/[0.06]">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-white flex items-center justify-center">
                                  <span className="text-black text-sm font-bold">
                                    {user?.username?.[0]?.toUpperCase() || 'U'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                </div>
                              </div>
                            </div>

                            {/* Menu items */}
                            <div className="py-1">
                              {userMenuItems.map((item, index) => {
                                if (item.type === 'divider') {
                                  return <div key={index} className="border-t border-white/[0.06] my-1" />;
                                }
                                if (item.action === 'logout') return null;
                                const Icon = item.icon;
                                if (!Icon) return null;
                                
                                return (
                                  <Link
                                    key={item.label}
                                    to={item.path}
                                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors no-underline font-mono"
                                    onClick={() => setIsProfileOpen(false)}
                                  >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                  </Link>
                                );
                              })}
                            </div>
                            
                            {/* Logout */}
                            <div className="border-t border-white/[0.06] py-1">
                              <button
                                onClick={handleLogout}
                                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors font-mono uppercase tracking-wider"
                              >
                                <LogOut className="w-4 h-4" />
                                SIGN OUT
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-3.5 py-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors no-underline font-mono uppercase tracking-wider"
                  >
                    SIGN IN
                  </Link>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      to="/register"
                      className="px-4 py-1.5 text-sm font-medium text-white bg-white/[0.1] hover:bg-white/[0.15] border border-white/[0.1] rounded-none transition-all duration-200 no-underline font-mono uppercase tracking-wider"
                    >
                      GET STARTED
                    </Link>
                  </motion.div>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <motion.button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-none text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all duration-200"
                whileTap={{ scale: 0.95 }}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-72 bg-[#0a0a0a] border-l border-white/[0.08] shadow-2xl"
            >
              <div className="flex flex-col h-full p-6">
                <div className="flex justify-end mb-8">
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-none text-gray-400 hover:text-white hover:bg-white/[0.05]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-1">
                  {navItems.map((item) => {
                    if (item.requiresAuth && !user) return null;
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-none transition-all no-underline ${
                          isActive
                            ? 'bg-white/[0.08] text-white'
                            : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-auto space-y-3">
                  {isAuthenticated ? (
                    <>
                      <Link
                        to="/create"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-black font-bold uppercase no-underline"
                      >
                        <PlusCircle className="w-5 h-5" />
                        Create Project
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-none border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.05]"
                      >
                        <LogOut className="w-5 h-5" />
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-center px-4 py-3 rounded-none border border-white/[0.08] text-gray-400 hover:text-white no-underline"
                      >
                        Sign in
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-center px-4 py-3 bg-white text-black font-bold uppercase no-underline"
                      >
                        Get started
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside handlers */}
      {(isUserMenuOpen || isNotificationOpen || isProfileOpen) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setIsUserMenuOpen(false);
            setIsNotificationOpen(false);
            setIsProfileOpen(false);
          }}
        />
      )}
    </>
  );
};

export default NavBar;
