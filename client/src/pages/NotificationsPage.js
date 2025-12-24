import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Check, 
  CheckCircle, 
  Mail, 
  DollarSign, 
  Clock, 
  X,
  Filter,
  RefreshCw,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Users,
  ShoppingCart,
  AlertTriangle,
  Info,
  Eye,
  Heart,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/api';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';

const getNotificationIcon = (type) => {
  switch (type?.toLowerCase()) {
    case 'new_interest':
    case 'project_sale_pending_payment':
      return DollarSign;
    case 'terms_proposed_by_seller':
    case 'transfer_update':
      return Mail;
    case 'payment_successful_pending_transfer':
    case 'transfer_confirmed_by_buyer':
    case 'transfer_completed_self':
      return CheckCircle;
    case 'purchase_request':
      return ShoppingCart;
    case 'offer_received':
      return Heart;
    case 'project_view':
      return Eye;
    case 'message':
      return MessageSquare;
    case 'warning':
      return AlertTriangle;
    case 'info':
      return Info;
    default:
      return Bell;
  }
};

const getNotificationColor = (type) => {
  switch (type?.toLowerCase()) {
    case 'new_interest':
    case 'project_sale_pending_payment':
    case 'payment_successful_pending_transfer':
      return 'text-green-400';
    case 'terms_proposed_by_seller':
    case 'transfer_update':
    case 'info':
      return 'text-blue-400';
    case 'purchase_request':
    case 'offer_received':
      return 'text-purple-400';
    case 'warning':
      return 'text-yellow-400';
    case 'error':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchUserNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Could not load notifications. Please try again later.");
      toast.error(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserNotifications();
    }
  }, [user, fetchUserNotifications]);

  const handleMarkOneAsRead = async (notificationId, stopPropagation = false, e) => {
    if (stopPropagation && e) e.stopPropagation();
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n)
      );
      toast.success("Notification marked as read");
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      toast.error("Could not mark as read");
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await handleMarkOneAsRead(notification.notification_id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      toast.error("Could not mark all as read");
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    return true;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <>
        <SEO title="Notifications | SideBuilds" description="View your notifications and updates" />
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading notifications...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="Notifications | SideBuilds" description="View your notifications and updates" />
      
      <div className="min-h-screen bg-black">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
                <p className="text-gray-400">Stay updated with your projects and activity</p>
              </div>
              
              {/* Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      filter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    All ({notifications.length})
                  </button>
                  <button
                    onClick={() => setFilter('unread')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      filter === 'unread'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    Unread ({unreadCount})
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={fetchUserNotifications}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </motion.button>
                  
                  {unreadCount > 0 && (
                    <motion.button
                      onClick={handleMarkAllRead}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Mark All Read
                    </motion.button>
                  )}
                </div>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <div className="flex-1">
                    <p className="text-red-400">{error}</p>
                  </div>
                  <button
                    onClick={fetchUserNotifications}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    Try Again
                  </button>
                </div>
              </motion.div>
            )}

            {/* Empty State */}
            {filteredNotifications.length === 0 && !error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-12 text-center"
              >
                <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                </h3>
                <p className="text-gray-400">
                  {filter === 'unread' 
                    ? 'You have no unread notifications.' 
                    : 'When you get notifications, they\'ll show up here.'
                  }
                </p>
              </motion.div>
            )}

            {/* Notifications List */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredNotifications.map((notification, index) => {
                  const IconComponent = getNotificationIcon(notification.type);
                  const iconColor = getNotificationColor(notification.type);
                  
                  return (
                    <motion.div
                      key={notification.notification_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`relative bg-gray-900/50 backdrop-blur-sm border rounded-2xl p-6 transition-all duration-200 group ${
                        !notification.is_read 
                          ? 'border-purple-500/30 bg-purple-500/5' 
                          : 'border-white/[0.08] hover:border-white/[0.12]'
                      } ${notification.link ? 'cursor-pointer' : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {/* Unread indicator */}
                      {!notification.is_read && (
                        <div className="absolute top-4 right-4 w-2 h-2 bg-purple-500 rounded-full"></div>
                      )}

                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="flex-shrink-0">
                          <div className="p-2 bg-gray-800/50 rounded-lg">
                            <IconComponent className={`w-5 h-5 ${iconColor}`} />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-gray-300 leading-relaxed ${
                            !notification.is_read ? 'font-medium' : ''
                          }`}>
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-3">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span className="text-xs text-gray-500">
                              {formatTime(notification.created_at)}
                            </span>
                            
                            {notification.type && (
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                notification.type === 'payment' ? 'bg-green-500/10 text-green-400' :
                                notification.type === 'purchase' ? 'bg-blue-500/10 text-blue-400' :
                                notification.type === 'offer' ? 'bg-purple-500/10 text-purple-400' :
                                'bg-gray-500/10 text-gray-400'
                              }`}>
                                {notification.type}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {!notification.is_read && (
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <motion.button
                              onClick={(e) => handleMarkOneAsRead(notification.notification_id, true, e)}
                              className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors duration-200"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default NotificationsPage; 