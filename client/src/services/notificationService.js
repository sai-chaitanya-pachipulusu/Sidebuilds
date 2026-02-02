class NotificationService {
  constructor() {
    this.listeners = [];
    this.notifications = [];
    this.socket = null;
    this.retryAttempts = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  // Initialize WebSocket connection for real-time notifications
  init(userId) {
    if (!userId) return;
    
    try {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';
      this.socket = new WebSocket(`${wsUrl}/notifications?userId=${userId}`);
      
      this.socket.onopen = () => {
        console.log('Notification WebSocket connected');
        this.retryAttempts = 0;
      };
      
      this.socket.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data);
          this.handleNewNotification(notification);
        } catch (error) {
          console.error('Failed to parse notification:', error);
        }
      };
      
      this.socket.onclose = () => {
        console.log('Notification WebSocket disconnected');
        this.attemptReconnect(userId);
      };
      
      this.socket.onerror = (error) => {
        console.error('Notification WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  // Attempt to reconnect with exponential backoff
  attemptReconnect(userId) {
    if (this.retryAttempts < this.maxRetries) {
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.retryAttempts + 1}/${this.maxRetries})`);
        this.retryAttempts++;
        this.init(userId);
      }, this.retryDelay * Math.pow(2, this.retryAttempts));
    }
  }

  // Handle new notification received via WebSocket
  handleNewNotification(notification) {
    const enhancedNotification = {
      ...notification,
      id: notification.id || Date.now() + Math.random(),
      timestamp: new Date(),
      read: false,
    };

    this.notifications.unshift(enhancedNotification);
    this.notifyListeners('new', enhancedNotification);

    // Show browser notification if permission granted
    this.showBrowserNotification(enhancedNotification);

    // Trigger sound for important notifications
    if (notification.priority === 'high') {
      this.playNotificationSound();
    }
  }

  // Show browser notification
  showBrowserNotification(notification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title || 'SideBuilds', {
        body: notification.message,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'high',
        actions: notification.actionUrl ? [
          { action: 'view', title: 'View', icon: '/logo192.png' }
        ] : undefined
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        browserNotification.close();
      };

      // Auto-close after 5 seconds for non-high priority
      if (notification.priority !== 'high') {
        setTimeout(() => {
          browserNotification.close();
        }, 5000);
      }
    }
  }

  // Play notification sound
  playNotificationSound() {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(console.error);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }

  // Request notification permission
  async requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }

  // Subscribe to notification updates
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners
  notifyListeners(type, data) {
    this.listeners.forEach(listener => {
      try {
        listener({ type, data, notifications: this.notifications });
      } catch (error) {
        console.error('Notification listener error:', error);
      }
    });
  }

  // Mark notification as read
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.notifyListeners('read', notification);
    }
  }

  // Mark all notifications as read
  markAllAsRead() {
    let readCount = 0;
    this.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        readCount++;
      }
    });
    
    if (readCount > 0) {
      this.notifyListeners('readAll', { count: readCount });
    }
    
    return readCount;
  }

  // Remove notification
  remove(notificationId) {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index > -1) {
      const removed = this.notifications.splice(index, 1)[0];
      this.notifyListeners('remove', removed);
      return removed;
    }
    return null;
  }

  // Clear all notifications
  clear() {
    const count = this.notifications.length;
    this.notifications = [];
    this.notifyListeners('clear', { count });
    return count;
  }

  // Get unread count
  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  // Get notifications with filtering
  getNotifications(filter = {}) {
    let filtered = [...this.notifications];

    if (filter.unreadOnly) {
      filtered = filtered.filter(n => !n.read);
    }

    if (filter.type) {
      filtered = filtered.filter(n => n.type === filter.type);
    }

    if (filter.priority) {
      filtered = filtered.filter(n => n.priority === filter.priority);
    }

    if (filter.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  // Add local notification (for testing or offline scenarios)
  addLocalNotification(notification) {
    const localNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      read: false,
      type: 'local',
      ...notification
    };

    this.handleNewNotification(localNotification);
    return localNotification;
  }

  // Generate smart notification messages
  generateNotificationMessage(type, data) {
    const templates = {
      'payment_received': `💰 Payment received: $${data.amount} for "${data.projectName}"`,
      'project_purchased': `🎉 Your project "${data.projectName}" was purchased by ${data.buyerName}`,
      'offer_received': `💝 New offer: $${data.amount} for "${data.projectName}"`,
      'project_transferred': `✅ Project "${data.projectName}" transfer completed`,
      'milestone_reached': `🎯 Milestone reached: ${data.milestone} for "${data.projectName}"`,
      'revenue_update': `📈 New revenue: $${data.amount} from "${data.projectName}"`,
      'support_message': `💬 New support message regarding "${data.projectName}"`,
      'account_security': `🔒 Security alert: ${data.action} on your account`,
      'system_maintenance': `⚠️ System maintenance scheduled: ${data.date}`,
      'feature_announcement': `✨ New feature: ${data.feature}`,
    };

    return templates[type] || data.message || 'New notification';
  }

  // Send notification to server (for triggering notifications to other users)
  async sendNotification(recipientId, notification) {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          recipientId,
          ...notification
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  // Cleanup resources
  cleanup() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.listeners = [];
    this.notifications = [];
  }

  // Analytics for notification engagement
  trackNotificationInteraction(notificationId, action) {
    // Track user interaction with notifications for analytics
    try {
      fetch('/api/analytics/notification-interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          notificationId,
          action, // 'viewed', 'clicked', 'dismissed'
          timestamp: new Date().toISOString()
        })
      }).catch(console.error);
    } catch (error) {
      console.error('Failed to track notification interaction:', error);
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

// Auto-request notification permission when service is imported
if (typeof window !== 'undefined') {
  notificationService.requestPermission();
}

export default notificationService; 
