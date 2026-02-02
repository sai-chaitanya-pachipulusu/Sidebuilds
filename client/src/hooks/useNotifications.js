import { useState, useEffect, useCallback } from 'react';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/api';
import toast from 'react-hot-toast';

export const useNotifications = (options = {}) => {
  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    enableToasts = true,
    enableSound = false
  } = options;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getNotifications();
      setNotifications(data || []);
      
      // Calculate unread count
      const unread = (data || []).filter(n => !n.is_read).length;
      setUnreadCount(unread);
      
      return data;
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError(err.message || 'Failed to load notifications');
      
      if (enableToasts) {
        toast.error('Failed to load notifications');
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [enableToasts]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.notification_id === notificationId 
            ? { ...n, is_read: true }
            : n
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      if (enableToasts) {
        toast.success('Notification marked as read');
      }
      
      return true;
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      
      if (enableToasts) {
        toast.error('Failed to mark as read');
      }
      
      return false;
    }
  }, [enableToasts]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      
      const previousUnreadCount = unreadCount;
      setUnreadCount(0);
      
      if (enableToasts && previousUnreadCount > 0) {
        toast.success(`${previousUnreadCount} notifications marked as read`);
      }
      
      return true;
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      
      if (enableToasts) {
        toast.error('Failed to mark all as read');
      }
      
      return false;
    }
  }, [unreadCount, enableToasts]);

  // Add a new notification (for real-time updates)
  const addNotification = useCallback((newNotification) => {
    const notification = {
      ...newNotification,
      notification_id: newNotification.notification_id || Date.now(),
      created_at: newNotification.created_at || new Date().toISOString(),
      is_read: false
    };

    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show toast notification
    if (enableToasts) {
      toast(notification.message, {
        icon: getNotificationIcon(notification.type),
        duration: 4000,
        style: {
          borderRadius: '12px',
          background: '#1f2937',
          color: '#f9fafb',
          border: '1px solid #374151'
        }
      });
    }

    // Play sound for important notifications
    if (enableSound && notification.priority === 'high') {
      playNotificationSound();
    }

    return notification;
  }, [enableToasts, enableSound]);

  // Remove notification
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.notification_id === notificationId);
      const filtered = prev.filter(n => n.notification_id !== notificationId);
      
      // Update unread count if removing unread notification
      if (notification && !notification.is_read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      
      return filtered;
    });
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    
    if (enableToasts) {
      toast.success('All notifications cleared');
    }
  }, [enableToasts]);

  // Get filtered notifications
  const getFiltered = useCallback((filter = {}) => {
    let filtered = notifications;

    if (filter.unreadOnly) {
      filtered = filtered.filter(n => !n.is_read);
    }

    if (filter.type) {
      filtered = filtered.filter(n => n.type === filter.type);
    }

    if (filter.category) {
      filtered = filtered.filter(n => n.category === filter.category);
    }

    if (filter.priority) {
      filtered = filtered.filter(n => n.priority === filter.priority);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (filter.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }, [notifications]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchNotifications]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    
    // Actions
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
    clearAll,
    getFiltered,
    
    // Computed values
    hasUnread: unreadCount > 0,
    isEmpty: notifications.length === 0,
    recentNotifications: getFiltered({ limit: 5 }),
    unreadNotifications: getFiltered({ unreadOnly: true })
  };
};

// Utility functions
const getNotificationIcon = (type) => {
  const icons = {
    'payment': '💰',
    'purchase': '🛒',
    'offer': '💝',
    'message': '💬',
    'update': '🔔',
    'warning': '⚠️',
    'success': '✅',
    'info': 'ℹ️',
    'error': '❌'
  };
  
  return icons[type] || '🔔';
};

const playNotificationSound = () => {
  try {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
};

export default useNotifications; 
