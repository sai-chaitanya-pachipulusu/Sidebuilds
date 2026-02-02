import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  X, 
  Check, 
  AlertCircle, 
  Info, 
  DollarSign, 
  ShoppingBag, 
  TrendingUp,
  Users,
  Eye,
  Heart,
  Clock,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Gift,
  Zap,
  Star,
  Award,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

const NotificationCenter = ({ notifications = [], onMarkAsRead, onMarkAllAsRead, onDeleteNotification }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const getNotificationIcon = (type) => {
    const iconMap = {
      payment: DollarSign,
      purchase: ShoppingBag,
      offer: Heart,
      view: Eye,
      message: MessageSquare,
      system: Info,
      achievement: Award,
      security: Shield,
      revenue: TrendingUp,
      milestone: Star,
      promotion: Gift,
      success: CheckCircle,
      warning: AlertTriangle,
      error: AlertCircle,
      info: Info
    };
    return iconMap[type] || Bell;
  };

  const getNotificationColorClasses = (type) => {
    const colorMap = {
      payment: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      purchase: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      offer: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
      view: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
      message: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
      system: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
      achievement: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      security: 'bg-red-500/10 border-red-500/20 text-red-400',
      revenue: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      milestone: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
      promotion: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
      success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      error: 'bg-red-500/10 border-red-500/20 text-red-400',
      info: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
    };
    return colorMap[type] || 'bg-gray-500/10 border-gray-500/20 text-gray-400';
  };

  const filteredNotifications = notifications
    .filter(notification => {
      if (filter === 'all') return true;
      if (filter === 'unread') return !notification.read;
      if (filter === 'payments') return ['payment', 'purchase', 'revenue'].includes(notification.type);
      if (filter === 'social') return ['offer', 'view', 'message'].includes(notification.type);
      return notification.type === filter;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
      }
      return 0;
    });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id) => {
    onMarkAsRead?.(id);
  };

  const handleMarkAllAsRead = () => {
    onMarkAllAsRead?.();
    toast.success('All notifications marked as read');
  };

  const handleDeleteNotification = (id) => {
    onDeleteNotification?.(id);
    toast.success('Notification deleted');
  };

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

  const NotificationItem = ({ notification }) => {
    const IconComponent = getNotificationIcon(notification.type);
    const colorClasses = getNotificationColorClasses(notification.type);

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className={`p-4 border border-white/[0.08] transition-all duration-200 group relative ${
          notification.read
            ? 'bg-black/30'
            : 'bg-white/5 border-white/20'
        } hover:border-white/[0.12]`}
      >
        {/* Unread indicator */}
        {!notification.read && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-white"></div>
        )}

        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`p-2 ${colorClasses} rounded-none flex-shrink-0`}>
            <IconComponent className="w-4 h-4" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium text-sm mb-1 line-clamp-1">
                  {notification.title}
                </h4>
                <p className="text-gray-300 text-sm line-clamp-2 leading-relaxed">
                  {notification.message}
                </p>
                
                {/* Metadata */}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-gray-500 text-xs">
                    {formatTime(notification.created_at)}
                  </span>
                  
                  {notification.priority && notification.priority !== 'low' && (
                    <span className={`px-2 py-0.5 rounded-none text-xs font-medium ${
                      notification.priority === 'high' 
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {notification.priority}
                    </span>
                  )}
                  
                  {notification.amount && (
                    <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-none text-xs font-medium">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(notification.amount)}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {!notification.read && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="p-1 hover:bg-gray-700 rounded transition-colors duration-200"
                    title="Mark as read"
                  >
                    <Check className="w-3 h-3 text-gray-400" />
                  </button>
                )}
                
                <button
                  onClick={() => handleDeleteNotification(notification.id)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors duration-200"
                  title="Delete notification"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Action button */}
            {notification.actionUrl && (
              <motion.a
                href={notification.actionUrl}
                className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-xs font-bold uppercase transition-colors duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {notification.actionText || 'View'}
                <Zap className="w-3 h-3" />
              </motion.a>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-none transition-all duration-200"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bell className="w-5 h-5" />
        
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-medium rounded-none flex items-center justify-center px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}
      </motion.button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 w-96 bg-gray-900 border border-white/[0.08] rounded-none shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/[0.08]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-white hover:text-gray-300 transition-colors duration-200"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1 hover:bg-gray-800 rounded transition-colors duration-200"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 mb-3">
                  {[
                    { id: 'all', name: 'All' },
                    { id: 'unread', name: 'Unread' },
                    { id: 'payments', name: 'Payments' },
                    { id: 'social', name: 'Social' }
                  ].map((filterOption) => (
                    <button
                      key={filterOption.id}
                      onClick={() => setFilter(filterOption.id)}
                      className={`px-3 py-1 text-xs font-bold uppercase transition-colors duration-200 ${
                        filter === filterOption.id
                          ? 'bg-white text-black'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {filterOption.name}
                    </button>
                  ))}
                </div>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-none text-white text-xs focus:border-blue-500 focus:outline-none"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="priority">Priority</option>
                </select>
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto p-2">
                {filteredNotifications.length > 0 ? (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {filteredNotifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <h4 className="text-white font-medium mb-1">No notifications</h4>
                    <p className="text-gray-400 text-sm">
                      {filter === 'unread' 
                        ? "You're all caught up!"
                        : "New notifications will appear here."
                      }
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter; 
