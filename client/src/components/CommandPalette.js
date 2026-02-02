import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search,
  Command,
  ArrowRight,
  User,
  Settings,
  Plus,
  Home,
  ShoppingBag,
  Code2,
  Bell,
  HelpCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  FileText,
  Zap,
  Globe,
  Bookmark,
  Filter,
  Download,
  Upload,
  Share2,
  Eye,
  Edit3,
  Trash2,
  LogOut,
  Moon,
  Sun,
  Palette,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [category, setCategory] = useState('all');
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const executeCommand = useCallback((command) => {
    if (command.path) {
        navigate(command.path);
    } else if (command.action) {
        command.action();
    }
    onClose();
  }, [navigate, onClose]);

  // Define all available commands
  const commands = useMemo(() => [
    // Navigation
    {
      id: 'nav-home',
      title: 'Go to Home',
      subtitle: 'Navigate to homepage',
      category: 'navigation',
      icon: Home,
      action: () => navigate('/'),
      keywords: ['home', 'homepage', 'landing']
    },
    {
      id: 'nav-marketplace',
      title: 'Browse Marketplace',
      subtitle: 'Find projects to buy',
      category: 'navigation',
      icon: ShoppingBag,
      action: () => navigate('/marketplace'),
      keywords: ['marketplace', 'buy', 'projects', 'browse']
    },
    {
      id: 'nav-dashboard',
      title: 'Open Dashboard',
      subtitle: 'View your analytics',
      category: 'navigation',
      icon: TrendingUp,
      action: () => navigate('/dashboard'),
      keywords: ['dashboard', 'analytics', 'stats'],
      requiresAuth: true
    },
    {
      id: 'nav-my-projects',
      title: 'My Projects',
      subtitle: 'Manage your listings',
      category: 'navigation',
      icon: Code2,
      action: () => navigate('/my-projects'),
      keywords: ['projects', 'my', 'manage', 'listings'],
      requiresAuth: true
    },
    {
      id: 'nav-notifications',
      title: 'View Notifications',
      subtitle: 'Check your alerts',
      category: 'navigation',
      icon: Bell,
      action: () => navigate('/notifications'),
      keywords: ['notifications', 'alerts', 'messages'],
      requiresAuth: true
    },

    // Actions
    {
      id: 'action-create-project',
      title: 'Create New Project',
      subtitle: 'List a new project',
      category: 'actions',
      icon: Plus,
      action: () => navigate('/create'),
      keywords: ['create', 'new', 'project', 'add', 'list'],
      requiresAuth: true
    },
    {
      id: 'action-quick-search',
      title: 'Quick Search Projects',
      subtitle: 'Search by keyword',
      category: 'actions',
      icon: Search,
      action: () => {
        navigate('/marketplace');
        // Focus search after navigation
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder*="Search"]');
          if (searchInput) searchInput.focus();
        }, 100);
      },
      keywords: ['search', 'find', 'quick', 'filter']
    },
    {
      id: 'action-view-earnings',
      title: 'View Earnings',
      subtitle: 'Check your revenue',
      category: 'actions',
      icon: DollarSign,
      action: () => navigate('/dashboard?tab=earnings'),
      keywords: ['earnings', 'revenue', 'money', 'income'],
      requiresAuth: true
    },

    // Account
    {
      id: 'account-profile',
      title: 'Edit Profile',
      subtitle: 'Update your information',
      category: 'account',
      icon: User,
      action: () => navigate('/profile-settings'),
      keywords: ['profile', 'edit', 'settings', 'account'],
      requiresAuth: true
    },
    {
      id: 'account-settings',
      title: 'Account Settings',
      subtitle: 'Manage preferences',
      category: 'account',
      icon: Settings,
      action: () => navigate('/profile-settings'),
      keywords: ['settings', 'preferences', 'account'],
      requiresAuth: true
    },
    {
      id: 'account-logout',
      title: 'Sign Out',
      subtitle: 'Log out of your account',
      category: 'account',
      icon: LogOut,
      action: async () => {
        await logout();
        navigate('/');
      },
      keywords: ['logout', 'sign out', 'exit'],
      requiresAuth: true,
      destructive: true
    },

    // Help & Support
    {
      id: 'help-faq',
      title: 'View FAQ',
      subtitle: 'Frequently asked questions',
      category: 'help',
      icon: HelpCircle,
      action: () => navigate('/faq'),
      keywords: ['faq', 'help', 'questions', 'support']
    },
    {
      id: 'help-contact',
      title: 'Contact Support',
      subtitle: 'Get help from our team',
      category: 'help',
      icon: FileText,
      action: () => navigate('/contact'),
      keywords: ['contact', 'support', 'help', 'email']
    },
    {
      id: 'help-how-it-works',
      title: 'How It Works',
      subtitle: 'Learn about our platform',
      category: 'help',
      icon: Sparkles,
      action: () => navigate('/how-it-works'),
      keywords: ['how it works', 'guide', 'tutorial', 'learn']
    },

    // Quick Actions (when not authenticated)
    ...(!user ? [
      {
        id: 'auth-login',
        title: 'Sign In',
        subtitle: 'Access your account',
        category: 'auth',
        icon: User,
        action: () => navigate('/login'),
        keywords: ['login', 'sign in', 'auth', 'account']
      },
      {
        id: 'auth-register',
        title: 'Create Account',
        subtitle: 'Join SideBuilds',
        category: 'auth',
        icon: Plus,
        action: () => navigate('/register'),
        keywords: ['register', 'signup', 'create account', 'join']
      }
    ] : []),

    // Theme & Customization
    {
      id: 'theme-toggle',
      title: 'Toggle Theme',
      subtitle: 'Switch between light/dark',
      category: 'customization',
      icon: Palette,
      action: () => {
        // Theme toggle logic would go here
        console.log('Theme toggle not implemented yet');
      },
      keywords: ['theme', 'dark', 'light', 'mode']
    }
  ], [user, logout, executeCommand]);

  // Filter commands based on query and category
  const filteredCommands = useMemo(() => {
    let filtered = commands;

    // Filter by authentication
    filtered = filtered.filter(cmd => !cmd.requiresAuth || user);

    // Filter by category
    if (category !== 'all') {
      filtered = filtered.filter(cmd => cmd.category === category);
    }

    // Filter by search query
    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      filtered = filtered.filter(cmd => 
        cmd.title.toLowerCase().includes(searchTerm) ||
        cmd.subtitle.toLowerCase().includes(searchTerm) ||
        cmd.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
      );
    }

    return filtered;
  }, [commands, query, category, user]);

  // Categories for filtering
  const categories = [
    { id: 'all', name: 'All', icon: Command },
    { id: 'navigation', name: 'Navigate', icon: ArrowRight },
    { id: 'actions', name: 'Actions', icon: Zap },
    { id: 'account', name: 'Account', icon: User },
    { id: 'help', name: 'Help', icon: HelpCircle }
  ];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands.length, selectedIndex, executeCommand, onClose]);

  // Reset selection when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-4 sm:pt-[10vh] md:pt-[20vh] z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-2xl max-h-[90vh] bg-gray-900 border border-white/[0.08] rounded-none shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-3 sm:p-4 border-b border-white/[0.08]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search..."
                className="w-full pl-10 pr-4 py-3 min-h-[48px] bg-black border border-white/20 text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors duration-200 text-sm sm:text-base"
              />
            </div>

            {/* Categories */}
            <div className="flex items-center gap-1 sm:gap-2 mt-3 sm:mt-4 overflow-x-auto scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-2 sm:px-3 py-1.5 text-xs font-bold uppercase transition-all duration-200 flex items-center gap-1 sm:gap-1.5 whitespace-nowrap min-h-[44px] ${
                    category === cat.id
                      ? 'bg-white text-black'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <cat.icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{cat.name}</span>
                  <span className="sm:hidden">{cat.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="max-h-80 sm:max-h-96 overflow-y-auto">
            {filteredCommands.length > 0 ? (
              <div className="p-2">
                {filteredCommands.map((command, index) => {
                  const Icon = command.icon;
                  return (
                    <motion.button
                      key={command.id}
                      onClick={() => executeCommand(command)}
                      className={`w-full px-3 sm:px-4 py-3 text-left transition-all duration-200 flex items-center gap-2 sm:gap-3 min-h-[48px] ${
                        index === selectedIndex
                          ? 'bg-white text-black'
                          : 'text-gray-200 hover:bg-white/5'
                      }`}
                      onMouseEnter={() => setSelectedIndex(index)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <div className={`p-2 rounded-none ${
                        index === selectedIndex
                          ? 'bg-white/20'
                          : command.destructive
                          ? 'bg-red-500/10'
                          : 'bg-gray-700'
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          command.destructive && index !== selectedIndex
                            ? 'text-red-400'
                            : ''
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm sm:text-base">{command.title}</p>
                        <p className={`text-xs sm:text-sm truncate ${
                          index === selectedIndex
                            ? 'text-gray-600'
                            : 'text-gray-400'
                        }`}>
                          {command.subtitle}
                        </p>
                      </div>
                      {index === selectedIndex && (
                        <ArrowRight className="w-4 h-4 flex-shrink-0" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-40" />
                <p className="text-lg font-medium mb-2">No commands found</p>
                <p className="text-sm">Try a different search term or category</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 border-t border-white/[0.08] bg-gray-800/30">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="hidden sm:flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Enter</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Esc</kbd>
                  Close
                </span>
              </div>
              <div className="sm:hidden text-center w-full">
                <span className="text-gray-500">Tap to select • {filteredCommands.length} commands</span>
              </div>
              <span className="hidden sm:inline">{filteredCommands.length} commands</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CommandPalette;

/*
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Home, 
  ShoppingBag, 
  Plus, 
  Settings, 
  LogOut,
  User,
  FileText,
  Mail,
  Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// This is a placeholder component. We will make it functional in Phase 3.
const CommandPalette = () => {
  return null; // Render nothing for now
};

export default CommandPalette; 
*/
