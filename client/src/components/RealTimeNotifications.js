import React, { useState, useEffect, useCallback, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  X,
  Check,
  Eye,
  Heart,
  MessageSquare,
  DollarSign,
  Star,
  User,
  ShoppingCart,
  Zap,
  Award,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  ExternalLink,
  Settings,
  Filter,
  Search,
  Archive,
  Trash2,
  MoreHorizontal,
  Volume2,
  VolumeX,
  Smartphone,
  Mail,
  Globe,
  Calendar,
  Target,
  Bookmark,
  Wifi,
  WifiOff
} from 'lucide-react'
import { cn } from '../lib/utils'
import { AuthContext } from '../context/AuthContext'
import { initializeSocket, getSocket, disconnectSocket, subscribeToSocketStatus, getCurrentSocketStatus } from '../utils/socket'
import { config } from '../config/environment'

const RealTimeNotifications = ({ className }) => {
  const { user, token } = useContext(AuthContext)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [realTimeEnabled, setRealTimeEnabled] = useState(true)
  const [socketStatus, setSocketStatus] = useState('disconnected')
  const [connectionError, setConnectionError] = useState(null)

  // Socket.IO real-time notifications
  useEffect(() => {
    if (!user || !token || !realTimeEnabled) {
      disconnectSocket()
      return
    }

    // Initialize Socket.IO connection with authentication
    const initSocket = async () => {
      try {
        setConnectionError(null)
        const socket = initializeSocket(token)
        
        // Join user-specific room for notifications
        socket.emit('join_user_room', { userId: user.id })
        
        // Listen for real-time notifications
        socket.on('notification', (notification) => {
          addNotification({
            ...notification,
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            read: false
          })
        })
        
        // Listen for notification updates
        socket.on('notification_update', (update) => {
          setNotifications(prev => 
            prev.map(n => 
              n.id === update.notificationId 
                ? { ...n, ...update.changes }
                : n
            )
          )
        })
        
        // Listen for bulk notification events
        socket.on('notifications_bulk', (bulkNotifications) => {
          const formattedNotifications = bulkNotifications.map(n => ({
            ...n,
            id: n.id || Date.now() + Math.random(),
            timestamp: n.timestamp || new Date().toISOString(),
            read: n.read || false
          }))
          setNotifications(prev => [...formattedNotifications, ...prev])
          setUnreadCount(prev => prev + bulkNotifications.filter(n => !n.read).length)
        })
        
        // Listen for market updates
        socket.on('market_update', (marketData) => {
          addNotification({
            id: Date.now() + Math.random(),
            type: 'market_update',
            message: `Market update: ${marketData.message}`,
            metadata: marketData,
            timestamp: new Date().toISOString(),
            read: false,
            priority: 'medium',
            actionable: false
          })
        })
        
        // Listen for system announcements
        socket.on('system_announcement', (announcement) => {
          addNotification({
            id: Date.now() + Math.random(),
            type: 'system',
            message: announcement.message,
            metadata: announcement,
            timestamp: new Date().toISOString(),
            read: false,
            priority: announcement.priority || 'low',
            actionable: false
          })
        })
        
      } catch (error) {
        console.error('Socket initialization error:', error)
        setConnectionError(error.message)
      }
    }
    
    initSocket()
    
    // Load initial notifications from API
    loadNotificationsFromAPI()
    
    return () => {
      disconnectSocket()
    }
  }, [user, token, realTimeEnabled])
  
  // Socket status monitoring
  useEffect(() => {
    const unsubscribe = subscribeToSocketStatus((status, details) => {
      setSocketStatus(status)
      if (status === 'error') {
        setConnectionError(details)
      } else if (status === 'connected') {
        setConnectionError(null)
      }
    })
    
    return unsubscribe
  }, [])
  
  // Load notifications from API
  const loadNotificationsFromAPI = async () => {
    try {
      const response = await fetch(config.getApiEndpoint('/api/notifications'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
      // Fallback to sample data for demo
      const sampleNotifications = [
        generateNotification('interest', 'Someone is interested in your project', { projectName: 'Sample Project' }),
        generateNotification('view', 'Your project gained new views today', { projectName: 'Sample Project', views: 25 })
      ]
      setNotifications(sampleNotifications)
      setUnreadCount(sampleNotifications.length)
    }
  }

  const generateRandomNotification = () => {
    const types = ['interest', 'view', 'message', 'market_update', 'feature']
    const randomType = types[Math.floor(Math.random() * types.length)]
    
    const messages = {
      interest: [
        'New buyer interest in your project',
        'Someone bookmarked your listing',
        'High-quality buyer viewed your project'
      ],
      view: [
        'Your project gained 10+ views today',
        'Trending views on your listing',
        'Project visibility increased 25%'
      ],
      message: [
        'New message from potential buyer',
        'Buyer asked a question about your project',
        'Chat message received'
      ],
      market_update: [
        'Projects in your category trending up 15%',
        'New market opportunity detected',
        'Similar project sold for higher price'
      ],
      feature: [
        'Your project quality score improved',
        'Listing featured in recommendation',
        'Project promoted to trending section'
      ]
    }

    const randomMessage = messages[randomType][Math.floor(Math.random() * messages[randomType].length)]
    return generateNotification(randomType, randomMessage, { projectName: 'Sample Project' })
  }

  const generateNotification = (type, message, metadata = {}) => {
    return {
      id: Date.now() + Math.random(),
      type,
      message,
      metadata,
      timestamp: new Date().toISOString(),
      read: false,
      priority: getPriorityByType(type),
      actionable: isActionableType(type)
    }
  }

  const getPriorityByType = (type) => {
    const priorities = {
      sale: 'high',
      interest: 'high',
      message: 'medium',
      view: 'low',
      market_update: 'medium',
      feature: 'low'
    }
    return priorities[type] || 'low'
  }

  const isActionableType = (type) => {
    return ['interest', 'message', 'sale'].includes(type)
  }

  const getNotificationIcon = (type) => {
    const icons = {
      interest: Heart,
      sale: DollarSign,
      message: MessageSquare,
      view: Eye,
      market_update: TrendingUp,
      feature: Star,
      system: Settings,
      achievement: Award
    }
    return icons[type] || Bell
  }

  const getNotificationColor = (type, priority) => {
    if (priority === 'high') return 'text-red-400 bg-red-400/10'
    
    const colors = {
      interest: 'text-pink-400 bg-pink-400/10',
      sale: 'text-green-400 bg-green-400/10',
      message: 'text-blue-400 bg-blue-400/10',
      view: 'text-purple-400 bg-purple-400/10',
      market_update: 'text-yellow-400 bg-yellow-400/10',
      feature: 'text-orange-400 bg-orange-400/10'
    }
    return colors[type] || 'text-gray-400 bg-gray-400/10'
  }

  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev])
    setUnreadCount(prev => prev + 1)
    
    if (soundEnabled) {
      playNotificationSound(notification.priority)
    }
    
    // Browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('SideBuilds', {
        body: notification.message,
        icon: '/logo-192.png',
        tag: notification.id,
        badge: '/logo-192.png',
        requireInteraction: notification.priority === 'high'
      })
    }
    
    // Send acknowledgment back to server
    try {
      const socket = getSocket()
      if (socket && socket.connected) {
        socket.emit('notification_received', { notificationId: notification.id })
      }
    } catch (error) {
      // Socket not available, silent fail
    }
  }, [soundEnabled])

  const playNotificationSound = (priority) => {
    // In a real app, you'd load actual audio files
    if (priority === 'high') {
      // Play high priority sound
      console.log('🔊 High priority notification sound')
    } else {
      // Play normal notification sound
      console.log('🔔 Notification sound')
    }
  }

  const markAsRead = async (notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
    
    // Send to API
    try {
      await fetch(config.getApiEndpoint('/api/notifications/mark-read'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notificationId })
      })
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    
    // Send to API
    try {
      await fetch(config.getApiEndpoint('/api/notifications/mark-all-read'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const deleteNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    const notification = notifications.find(n => n.id === notificationId)
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const clearAllNotifications = () => {
    setNotifications([])
    setUnreadCount(0)
  }

  const filteredNotifications = notifications.filter(notification => {
    const matchesFilter = filter === 'all' || notification.type === filter
    const matchesSearch = !searchTerm || notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission()
    }
  }

  const filterOptions = [
    { id: 'all', name: 'All', icon: Bell, count: notifications.length },
    { id: 'interest', name: 'Interest', icon: Heart, count: notifications.filter(n => n.type === 'interest').length },
    { id: 'message', name: 'Messages', icon: MessageSquare, count: notifications.filter(n => n.type === 'message').length },
    { id: 'sale', name: 'Sales', icon: DollarSign, count: notifications.filter(n => n.type === 'sale').length },
    { id: 'view', name: 'Views', icon: Eye, count: notifications.filter(n => n.type === 'view').length }
  ]

  const formatTimeAgo = (timestamp) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diff = now - time
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div className={cn("relative", className)}>
      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className={cn(
          "relative p-2 bg-gray-900/50 border border-white/10 rounded-xl hover:border-white/20 transition-colors duration-200",
          socketStatus === 'connected' ? "ring-1 ring-green-500/20" : socketStatus === 'error' ? "ring-1 ring-red-500/20" : ""
        )}
        title={`Notifications (${socketStatus})`}
      >
        <Bell className="w-5 h-5 text-gray-300" />
        
        {/* Connection status indicator */}
        <div className="absolute -top-1 -left-1">
          {socketStatus === 'connected' && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 bg-green-400 rounded-full"
            />
          )}
          {socketStatus === 'connecting' && (
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-2 h-2 bg-yellow-400 rounded-full"
            />
          )}
          {socketStatus === 'error' && (
            <div className="w-2 h-2 bg-red-400 rounded-full" />
          )}
        </div>
        
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
          >
            <span className="text-xs text-white font-medium">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </motion.div>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-96 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    {soundEnabled ? 
                      <Volume2 className="w-4 h-4 text-gray-400" /> :
                      <VolumeX className="w-4 h-4 text-gray-400" />
                    }
                  </button>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Search & Controls */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-800/50 border border-white/10 rounded-lg text-white placeholder-gray-400 text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {filterOptions.map((option) => {
                      const Icon = option.icon
                      return (
                        <button
                          key={option.id}
                          onClick={() => setFilter(option.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors duration-200 whitespace-nowrap",
                            filter === option.id
                              ? "bg-purple-600/20 text-purple-300"
                              : "text-gray-400 hover:text-white hover:bg-white/5"
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{option.name}</span>
                          {option.count > 0 && (
                            <span className="px-1 bg-gray-700 rounded-full text-xs">
                              {option.count}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-green-400 hover:text-green-300 transition-colors whitespace-nowrap"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Mark all read
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No notifications found</p>
                  <p className="text-gray-600 text-sm mt-1">
                    {searchTerm ? 'Try a different search term' : 'All caught up!'}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredNotifications.map((notification, index) => {
                    const Icon = getNotificationIcon(notification.type)
                    const colorClasses = getNotificationColor(notification.type, notification.priority)
                    
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "p-3 rounded-xl transition-all duration-200 group cursor-pointer",
                          notification.read 
                            ? "bg-gray-800/30 hover:bg-gray-800/50" 
                            : "bg-gray-800/70 hover:bg-gray-800/90"
                        )}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn("p-1.5 rounded-lg", colorClasses)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm mb-1",
                              notification.read ? "text-gray-400" : "text-white"
                            )}>
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(notification.timestamp)}
                              </span>
                              
                              {notification.priority === 'high' && (
                                <span className="px-1.5 py-0.5 bg-red-600/20 text-red-400 text-xs rounded-full">
                                  Urgent
                                </span>
                              )}
                              
                              {notification.actionable && (
                                <span className="px-1.5 py-0.5 bg-blue-600/20 text-blue-400 text-xs rounded-full">
                                  Action needed
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {notification.actionable && (
                              <button className="p-1 hover:bg-white/5 rounded transition-colors">
                                <ExternalLink className="w-3 h-3 text-gray-400" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                              className="p-1 hover:bg-white/5 rounded transition-colors"
                            >
                              <Trash2 className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/10 bg-gray-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Connection status */}
                  <div className="flex items-center gap-1 text-xs">
                    {socketStatus === 'connected' ? (
                      <>
                        <Wifi className="w-3 h-3 text-green-400" />
                        <span className="text-green-400">Live</span>
                      </>
                    ) : socketStatus === 'connecting' ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Wifi className="w-3 h-3 text-yellow-400" />
                        </motion.div>
                        <span className="text-yellow-400">Connecting</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3 text-red-400" />
                        <span className="text-red-400">Offline</span>
                      </>
                    )}
                  </div>
                  
                  <button
                    onClick={requestNotificationPermission}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    <Smartphone className="w-3 h-3" />
                    Enable browser notifications
                  </button>
                </div>
                
                <button
                  onClick={clearAllNotifications}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear all
                </button>
              </div>
              
              {connectionError && (
                <div className="mt-2 p-2 bg-red-600/20 border border-red-500/30 rounded-lg">
                  <p className="text-xs text-red-300">{connectionError}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time indicator */}
      {realTimeEnabled && (
        <div className="absolute -top-1 -left-1">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 bg-green-400 rounded-full"
          />
        </div>
      )}
    </div>
  )
}

export default RealTimeNotifications