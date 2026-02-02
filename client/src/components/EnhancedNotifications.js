import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  Check, 
  CheckCircle, 
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
  MessageSquare,
  DollarSign,
  Mail,
  Clock,
  Archive,
  Star,
  Bookmark,
  Settings,
  Search,
  CheckCheck,
  Trash2,
  MoreHorizontal,
  ArrowRight,
  Globe
} from 'lucide-react'
import { cn } from '../lib/utils'
import { formatDistanceToNow } from 'date-fns'

const EnhancedNotifications = ({ notifications, onMarkAsRead, onMarkAllAsRead, onRefresh }) => {
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNotifications, setSelectedNotifications] = useState(new Set())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const notificationTypes = [
    { id: 'all', name: 'All', icon: Bell, count: notifications.length },
    { id: 'unread', name: 'Unread', icon: AlertCircle, count: notifications.filter(n => !n.is_read).length },
    { id: 'interests', name: 'Interest', icon: Heart, count: notifications.filter(n => n.type?.includes('interest')).length },
    { id: 'payments', name: 'Payments', icon: DollarSign, count: notifications.filter(n => n.type?.includes('payment')).length },
    { id: 'messages', name: 'Messages', icon: MessageSquare, count: notifications.filter(n => n.type?.includes('message')).length },
    { id: 'system', name: 'System', icon: Settings, count: notifications.filter(n => n.type?.includes('system')).length }
  ]

  const getNotificationIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'new_interest':
      case 'project_sale_pending_payment':
        return DollarSign
      case 'terms_proposed_by_seller':
      case 'transfer_update':
        return Mail
      case 'payment_successful_pending_transfer':
      case 'transfer_confirmed_by_buyer':
      case 'transfer_completed_self':
        return CheckCircle
      case 'purchase_request':
        return ShoppingCart
      case 'offer_received':
        return Heart
      case 'project_view':
        return Eye
      case 'message':
        return MessageSquare
      case 'warning':
        return AlertTriangle
      case 'info':
        return Info
      default:
        return Bell
    }
  }

  const getNotificationColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'new_interest':
      case 'project_sale_pending_payment':
      case 'payment_successful_pending_transfer':
        return 'text-green-400 bg-green-400/10 border-green-400/20'
      case 'terms_proposed_by_seller':
      case 'transfer_update':
      case 'info':
        return 'text-gray-300 bg-white/10 border-white/20'
      case 'purchase_request':
      case 'offer_received':
        return 'text-white bg-white/10 border-white/30'
      case 'warning':
        return 'text-gray-300 bg-white/10 border-white/20'
      case 'error':
        return 'text-white bg-white/10 border-white/30'
      default:
        return 'text-gray-400 bg-white/10 border-white/20'
    }
  }

  const filterNotifications = useCallback(() => {
    let filtered = notifications

    // Filter by type
    if (filter !== 'all') {
      switch (filter) {
        case 'unread':
          filtered = filtered.filter(n => !n.is_read)
          break
        case 'interests':
          filtered = filtered.filter(n => n.type?.includes('interest'))
          break
        case 'payments':
          filtered = filtered.filter(n => n.type?.includes('payment'))
          break
        case 'messages':
          filtered = filtered.filter(n => n.type?.includes('message'))
          break
        case 'system':
          filtered = filtered.filter(n => n.type?.includes('system'))
          break
      }
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(n => 
        n.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.type?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }, [notifications, filter, searchTerm])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setIsRefreshing(false)
  }

  const handleSelectNotification = (notificationId) => {
    const newSelected = new Set(selectedNotifications)
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId)
    } else {
      newSelected.add(notificationId)
    }
    setSelectedNotifications(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set())
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.notification_id)))
    }
  }

  const filteredNotifications = filterNotifications()

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-black border border-white/20 text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors duration-200"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              "p-3 bg-gray-900/50 border border-white/10 rounded-xl text-white hover:border-white/20 transition-colors duration-200",
              isRefreshing && "animate-spin"
            )}
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowActions(!showActions)}
            className="flex items-center gap-2 px-4 py-3 bg-gray-900/50 border border-white/10 rounded-xl text-white hover:border-white/20 transition-colors duration-200"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>Actions</span>
          </button>

          {notifications.filter(n => !n.is_read).length > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-3 bg-white/10 border border-white/30 text-white hover:bg-white/20 transition-colors duration-200"
            >
              <CheckCheck className="w-5 h-5" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {notificationTypes.map((type) => {
          const Icon = type.icon
          return (
            <button
              key={type.id}
              onClick={() => setFilter(type.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 whitespace-nowrap",
                filter === type.id
                  ? "bg-white/20 text-gray-300 border border-white/50/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{type.name}</span>
              {type.count > 0 && (
                <span className={cn(
                  "px-2 py-0.5 text-xs rounded-full",
                  filter === type.id
                    ? "bg-white/10 text-white"
                    : "bg-gray-700 text-gray-300"
                )}>
                  {type.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {(showActions || selectedNotifications.size > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between p-4 bg-gray-900/30 border border-white/10 rounded-xl"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors duration-200"
              >
                <CheckCheck className="w-4 h-4" />
                <span>
                  {selectedNotifications.size === filteredNotifications.length ? 'Deselect All' : 'Select All'}
                </span>
              </button>

              {selectedNotifications.size > 0 && (
                <span className="text-sm text-gray-400">
                  {selectedNotifications.size} selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-white transition-colors duration-200">
                <Archive className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-red-400 transition-colors duration-200">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Bell className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-medium mb-2">No notifications found</h3>
            <p className="text-sm">
              {searchTerm ? 'Try adjusting your search terms' : 'New notifications will appear here'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredNotifications.map((notification, index) => {
              const Icon = getNotificationIcon(notification.type)
              const colorClasses = getNotificationColor(notification.type)
              const isSelected = selectedNotifications.has(notification.notification_id)

              return (
                <motion.div
                  key={notification.notification_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer group",
                    !notification.is_read
                      ? "bg-gray-900/50 border-white/10 hover:border-white/20"
                      : "bg-gray-800/30 border-white/5 hover:border-white/10",
                    isSelected && "ring-2 ring-white/50/50 border-white/50/30"
                  )}
                  onClick={() => handleSelectNotification(notification.notification_id)}
                >
                  {/* Selection Checkbox */}
                  <div className="flex-shrink-0 mt-1">
                    <div className={cn(
                      "w-5 h-5 border-2 rounded-md flex items-center justify-center transition-all duration-200",
                      isSelected 
                        ? "bg-white border-white/60"
                        : "border-gray-600 group-hover:border-gray-500"
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>

                  {/* Icon */}
                  <div className={cn(
                    "flex-shrink-0 p-2 rounded-lg border",
                    colorClasses
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        "text-sm leading-relaxed",
                        !notification.is_read ? "text-white" : "text-gray-300"
                      )}>
                        {notification.message}
                      </p>
                      
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onMarkAsRead(notification.notification_id)
                          }}
                          className="flex-shrink-0 p-1 text-gray-400 hover:text-green-400 transition-colors duration-200"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>

                      {notification.link && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            window.location.href = notification.link
                          }}
                          className="flex items-center gap-1 text-xs text-white hover:text-gray-300 transition-colors duration-200"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Unread Indicator */}
                  {!notification.is_read && (
                    <div className="flex-shrink-0 w-2 h-2 bg-white/10 rounded-full mt-2" />
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Load More */}
      {filteredNotifications.length >= 20 && (
        <div className="text-center">
          <button className="px-6 py-3 bg-gray-900/50 border border-white/10 rounded-xl text-white hover:border-white/20 transition-colors duration-200">
            Load More Notifications
          </button>
        </div>
      )}
    </div>
  )
}

export default EnhancedNotifications
