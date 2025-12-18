import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getProjects, getSellerPurchaseRequests, getBuyerPurchaseRequests, getNotifications } from '../services/api';
import { useDashboardSync } from '../hooks/useRealTimeSync';
import {
  //BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Package,
  //Clock,
  CheckCircle,
  //AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  //Filter,
  //Search,
  Eye,
  Heart,
  MessageSquare,
  Activity,
  //Star,
  //Calendar,
  Bell,
  ShoppingBag,
  Zap
} from 'lucide-react';
import { Button } from '../shadcn/ui/button';
import StripeConnectBanner from '../components/StripeConnectBanner';
import PortfolioValueModal from '../components/dashboard/PortfolioValueModal';
import ProjectInterestsModal from '../components/dashboard/ProjectInterestsModal';
import ProjectStatsModal from '../components/dashboard/ProjectStatsModal';
import SalesHistoryModal from '../components/dashboard/SalesHistoryModal';

// Motion animation variants
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProjects: 0,
    portfolioValue: 0,
    activeOffers: 0,
    completedSales: 0,
    totalViews: 0,
    averageViews: 0,
    interestReceived: 0,
    purchasesMade: 0,
    monthlyRevenue: 0,
    growthRate: 0,
    conversionRate: 0,
    lastUpdated: null
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [interestsModalOpen, setInterestsModalOpen] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [salesModalOpen, setSalesModalOpen] = useState(false);

  // Use real-time dashboard sync
  useDashboardSync({
    refreshInterval: 60000, // 1 minute
    enableRealTime: true
  });

  // Activity click handler
  const handleActivityClick = (activity) => {
    console.log('Activity clicked:', activity);
    if (activity.type === 'interest' || activity.type === 'purchase_request') {
      console.log('Opening interests modal from activity');
      setInterestsModalOpen(true);
    } else if (activity.type === 'sale' || activity.type === 'payment') {
      console.log('Opening sales modal from activity');
      setSalesModalOpen(true);
    } else {
      console.log('Unknown activity type:', activity.type);
    }
  };

  useEffect(() => {
    console.log('Dashboard useEffect triggered, user:', user);
    const fetchDashboardData = async () => {
      if (!user) {
        console.log('No user found, returning early');
        return;
      }
      
      try {
        console.log('Starting dashboard data fetch...');

        // Fetch comprehensive dashboard data from our updated API
        const dashboardResponse = await fetch('/api/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!dashboardResponse.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const dashboardData = await dashboardResponse.json();
        console.log('Dashboard data received:', dashboardData);

        // Use the dashboard API data
        setStats(dashboardData.stats);
        setRecentProjects(dashboardData.recentProjects || []);
        setRecentActivity(dashboardData.recentActivity || []);

        // Also fetch additional data for notifications and detailed project info
        const [
          projectsData,
          sellerRequestsData,
          buyerRequestsData,
          notificationsData
        ] = await Promise.all([
          getProjects(),
          getSellerPurchaseRequests(),
          getBuyerPurchaseRequests(),
          getNotifications()
        ]);

        console.log('Dashboard data fetched:', {
          projectsData: projectsData?.length || 0,
          sellerRequestsData: sellerRequestsData?.length || 0,
          buyerRequestsData: buyerRequestsData?.length || 0,
          notificationsData: notificationsData?.length || 0
        });

        // Keep the additional data for modals and detailed views
        setProjects(projectsData || []);
        setNotifications(notificationsData || []);
        
        // Create activity feed
        const sellerActivities = sellerRequestsData.slice(0, 3).map(req => ({
          type: 'interest',
          message: `New interest received for "${req.project_name}"`,
          time: req.created_at,
          status: req.status
        }));

        const buyerActivities = buyerRequestsData.slice(0, 2).map(req => ({
          type: 'purchase',
          message: `Purchase request for "${req.project_name}"`,
          time: req.created_at,
          status: req.status
        }));

        const activities = [...sellerActivities, ...buyerActivities]
          .sort((a, b) => new Date(b.time) - new Date(a.time))
          .slice(0, 5);

        console.log('Created activities:', activities);
        setRecentActivity(activities);

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user]);

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  const markNotificationAsRead = async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    console.log('Notification clicked:', notification);

    // Mark notification as read if it's unread
    if (!notification.is_read) {
      markNotificationAsRead(notification.notification_id);
    }

    // Navigate based on notification type and available fields
    if (notification.type === 'purchase_request' || notification.type?.includes('interest') || notification.type?.includes('offer')) {
      console.log('Opening interests modal for notification:', notification.type);
      // Open interests modal for project interest notifications
      setInterestsModalOpen(true);
    } else if (notification.type?.includes('sale') || notification.type?.includes('payment') || notification.type === 'payment') {
      console.log('Opening sales modal for notification:', notification.type);
      // Open sales modal for sale-related notifications
      setSalesModalOpen(true);
    } else if (notification.action_url) {
      console.log('Navigating to action_url:', notification.action_url);
      // Navigate to the specified action URL
      navigate(notification.action_url);
    } else if (notification.related_project_id) {
      console.log('Navigating to project:', notification.related_project_id);
      // Navigate to project detail page
      navigate(`/project/${notification.related_project_id}`);
    } else if (notification.related_transaction_id) {
      console.log('Navigating to transaction:', notification.related_transaction_id);
      // Navigate to transaction detail page
      navigate(`/transaction/${notification.related_transaction_id}`);
    } else {
      console.log('Default navigation to notifications page');
      // Default to notifications page
      navigate('/notifications');
    }
  };

  const StatCard = ({ icon: Icon, title, value, trend, trendUp, description, color = "purple", onClick }) => {
    const getColorClasses = (color) => {
      const colors = {
        purple: {
          bg: 'from-purple-600/10 to-purple-500/5',
          border: 'border-purple-500/20',
          iconBg: 'bg-purple-500/10',
          iconBorder: 'border-purple-500/20',
          iconColor: 'text-purple-400',
          glow: 'shadow-purple-500/25'
        },
        green: {
          bg: 'from-green-600/10 to-green-500/5',
          border: 'border-green-500/20',
          iconBg: 'bg-green-500/10',
          iconBorder: 'border-green-500/20',
          iconColor: 'text-green-400',
          glow: 'shadow-green-500/25'
        },
        red: {
          bg: 'from-red-600/10 to-red-500/5',
          border: 'border-red-500/20',
          iconBg: 'bg-red-500/10',
          iconBorder: 'border-red-500/20',
          iconColor: 'text-red-400',
          glow: 'shadow-red-500/25'
        },
        blue: {
          bg: 'from-blue-600/10 to-blue-500/5',
          border: 'border-blue-500/20',
          iconBg: 'bg-blue-500/10',
          iconBorder: 'border-blue-500/20',
          iconColor: 'text-blue-400',
          glow: 'shadow-blue-500/25'
        },
        indigo: {
          bg: 'from-indigo-600/10 to-indigo-500/5',
          border: 'border-indigo-500/20',
          iconBg: 'bg-indigo-500/10',
          iconBorder: 'border-indigo-500/20',
          iconColor: 'text-indigo-400',
          glow: 'shadow-indigo-500/25'
        },
        cyan: {
          bg: 'from-cyan-600/10 to-cyan-500/5',
          border: 'border-cyan-500/20',
          iconBg: 'bg-cyan-500/10',
          iconBorder: 'border-cyan-500/20',
          iconColor: 'text-cyan-400',
          glow: 'shadow-cyan-500/25'
        },
        pink: {
          bg: 'from-pink-600/10 to-pink-500/5',
          border: 'border-pink-500/20',
          iconBg: 'bg-pink-500/10',
          iconBorder: 'border-pink-500/20',
          iconColor: 'text-pink-400',
          glow: 'shadow-pink-500/25'
        },
        orange: {
          bg: 'from-orange-600/10 to-orange-500/5',
          border: 'border-orange-500/20',
          iconBg: 'bg-orange-500/10',
          iconBorder: 'border-orange-500/20',
          iconColor: 'text-orange-400',
          glow: 'shadow-orange-500/25'
        }
      };
      return colors[color] || colors.purple;
    };

    const colorClasses = getColorClasses(color);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6 hover:border-white/[0.12] transition-all duration-300 group relative overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-2xl hover:shadow-purple-500/10' : ''}`}
        onClick={onClick}
        whileHover={onClick ? {
          scale: 1.02,
          boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)`
        } : {}}
        whileTap={onClick ? { scale: 0.98 } : {}}
      >
        {/* Animated background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

        {/* Animated border glow */}
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${colorClasses.bg} opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl`} />

        {/* Floating particles effect */}
        <div className="absolute top-4 right-4 w-2 h-2 bg-current opacity-0 group-hover:opacity-60 rounded-full animate-pulse" style={{ color: `var(--${color}-400)` }} />
        <div className="absolute bottom-4 left-4 w-1 h-1 bg-current opacity-0 group-hover:opacity-40 rounded-full animate-pulse delay-75" style={{ color: `var(--${color}-400)` }} />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <motion.div
              className={`p-3 rounded-xl ${colorClasses.iconBg} ${colorClasses.iconBorder} border`}
              whileHover={{ rotate: 5, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Icon className={`w-6 h-6 ${colorClasses.iconColor}`} />
            </motion.div>
            {trend && (
              <motion.div
                className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium ${
                  trendUp
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {trend}
              </motion.div>
            )}
          </div>

          <div className="space-y-1">
            <motion.h3
              className="text-2xl font-bold text-white"
              initial={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              {value}
            </motion.h3>
            <p className="text-sm text-gray-400">{title}</p>
            {description && <p className="text-xs text-gray-500">{description}</p>}
          </div>
        </div>
      </motion.div>
    );
  };

  const ActivityItem = ({ activity, index }) => {
    const getActivityIcon = (type) => {
      switch (type) {
        case 'interest': return <Heart className="w-4 h-4" />;
        case 'purchase': return <ShoppingBag className="w-4 h-4" />;
        case 'message': return <MessageSquare className="w-4 h-4" />;
        default: return <Activity className="w-4 h-4" />;
      }
    };

    const getStatusColor = (status) => {
      if (status?.includes('completed')) return 'text-green-400';
      if (status?.includes('pending') || status?.includes('interest')) return 'text-yellow-400';
      if (status?.includes('declined') || status?.includes('withdrawn')) return 'text-red-400';
      return 'text-blue-400';
    };

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
        className="flex items-start space-x-3 p-3 hover:bg-white/[0.03] rounded-xl transition-colors duration-200 cursor-pointer touch-manipulation"
        onClick={() => {
          console.log('Activity item clicked:', activity);
          handleActivityClick(activity);
        }}
      >
        <div className="p-2 rounded-lg bg-gray-800/50 border border-white/[0.05]">
          {getActivityIcon(activity.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 leading-relaxed break-words">{activity.message}</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mt-1 space-y-1 sm:space-y-0">
            <span className="text-xs text-gray-500">
              {new Date(activity.time).toLocaleDateString()}
            </span>
            {activity.status && (
              <span className={`text-xs ${getStatusColor(activity.status)}`}>
                {activity.status.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stripe Connect Banner */}
        <StripeConnectBanner 
          onConnectClick={() => navigate('/profile-settings?tab=payouts')}
          isDismissible={true}
        />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Welcome back, {user?.username}
              </h1>
              <p className="text-gray-400 text-lg">
                Here's what's happening with your projects today
              </p>
            </div>
            <motion.button
              onClick={() => navigate('/create')}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-purple-500/25"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-5 h-5" />
              <span>New Project</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Package}
            title="Total Projects"
            value={stats.totalProjects}
            description="Active projects in your portfolio"
            color="purple"
            onClick={() => navigate('/my-projects')}
            trend={stats.totalProjects > 0 ? '+' + stats.totalProjects : '0'}
            trendUp={true}
          />
          <StatCard
            icon={DollarSign}
            title="Portfolio Value"
            value={formatPrice(stats.portfolioValue)}
            description="Total value of your projects"
            color="green"
            onClick={() => setPortfolioModalOpen(true)}
            trend={stats.portfolioValue > 0 ? '+' + formatPrice(stats.portfolioValue) : '0'}
            trendUp={true}
          />
          <StatCard
            icon={Heart}
            title="Active Offers"
            value={stats.activeOffers}
            description="Pending purchase requests"
            color="red"
            onClick={() => setInterestsModalOpen(true)}
            trend={stats.activeOffers > 0 ? '+' + stats.activeOffers : '0'}
            trendUp={true}
          />
          <StatCard
            icon={CheckCircle}
            title="Completed Sales"
            value={stats.completedSales}
            description="Successfully completed transactions"
            color="blue"
            onClick={() => setSalesModalOpen(true)}
            trend={stats.completedSales > 0 ? '+' + stats.completedSales : '0'}
            trendUp={true}
          />
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{stats.totalViews}</div>
                <div className="text-sm text-gray-400">Total Views</div>
              </div>
              <Eye className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{stats.averageViews}</div>
                <div className="text-sm text-gray-400">Avg Views</div>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{stats.interestReceived}</div>
                <div className="text-sm text-gray-400">Interests Received</div>
              </div>
              <Users className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{stats.purchasesMade}</div>
                <div className="text-sm text-gray-400">Purchases Made</div>
              </div>
              <ShoppingBag className="w-8 h-8 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Recent Projects Section */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Recent Projects</h2>
            <Button
              variant="outline"
              onClick={() => navigate('/my-projects')}
              className="text-purple-400 border-purple-400 hover:bg-purple-400 hover:text-white"
            >
              View All Projects
            </Button>
          </div>

          {recentProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-6 hover:bg-gray-800/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/edit/${project.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">{project.name}</h3>
                      <p className="text-gray-400 text-sm line-clamp-2">{project.description}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      project.status === 'launched' ? 'bg-green-500/10 text-green-400' :
                      project.status === 'mvp' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>
                      {project.status}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-white">
                      {project.price > 0 ? formatPrice(project.price) : 'Not for sale'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No projects yet</h3>
              <p className="text-gray-400 mb-4">Create your first project to get started</p>
              <Button onClick={() => navigate('/create')} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </div>
          )}
        </motion.div>

        {/* Recent Activity Section */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Recent Activity</h2>
            <Button
              variant="outline"
              onClick={() => navigate('/notifications')}
              className="text-purple-400 border-purple-400 hover:bg-purple-400 hover:text-white"
            >
              View All Notifications
            </Button>
          </div>

          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4 hover:bg-gray-800/50 transition-colors cursor-pointer"
                  onClick={() => handleActivityClick(activity)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.status === 'unread' ? 'bg-purple-400' : 'bg-gray-600'
                        }`} />
                        <h4 className="font-medium text-white">{activity.title}</h4>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{activity.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{new Date(activity.time).toLocaleDateString()}</span>
                        <span className="capitalize">{activity.type.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg">
              <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No recent activity</h3>
              <p className="text-gray-400">Activity will appear here when you have notifications</p>
            </div>
          )}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Activity & Projects */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  <span>Recent Activity</span>
                </h2>
                <RouterLink
                  to="/notifications"
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors duration-200"
                >
                  View all
                </RouterLink>
              </div>
              
              <div className="space-y-1">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <ActivityItem key={index} activity={activity} index={index} />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>No recent activity</p>
                    <p className="text-sm">Create a project to get started</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Recent Projects */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                  <Package className="w-5 h-5 text-blue-400" />
                  <span>Your Projects</span>
                </h2>
                <RouterLink
                  to="/my-projects"
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
                >
                  View all
                </RouterLink>
              </div>
              
              <div className="space-y-4">
                {projects.length > 0 ? (
                  projects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center space-x-4 p-4 hover:bg-white/[0.03] rounded-xl transition-colors duration-200 cursor-pointer"
                      onClick={() => navigate(`/project/${project.id}`)}
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                        <Package className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate">{project.name}</h3>
                        <p className="text-gray-400 text-sm truncate">{project.description}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs text-gray-500 flex items-center space-x-1">
                            <Eye className="w-3 h-3" />
                            <span>{project.view_count || 0} views</span>
                          </span>
                          {project.sale_price && (
                            <span className="text-xs text-green-400">
                              {formatPrice(project.sale_price)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight className="w-5 h-5 text-gray-400" />
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>No projects yet</p>
                    <motion.button
                      onClick={() => navigate('/create')}
                      className="mt-4 px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg text-sm hover:bg-purple-600/30 transition-colors duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Create your first project
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-yellow-400" />
                  <span>Notifications</span>
                </h2>
                <RouterLink
                  to="/notifications"
                  className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors duration-200"
                >
                  View all
                </RouterLink>
              </div>
              
              <div className="space-y-3">
                {notifications.length > 0 ? (
                  notifications.map((notification, index) => (
                    <motion.div
                      key={notification.notification_id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className={`p-3 rounded-xl transition-colors duration-200 cursor-pointer border ${
                        !notification.is_read
                          ? 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20'
                          : 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.05]'
                      }`}
                      onClick={() => {
                        console.log('Notification clicked in sidebar:', notification);
                        handleNotificationClick(notification);
                      }}
                    >
                      <p className="text-sm text-gray-200 leading-relaxed break-words">
                        {notification.message}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 space-y-1 sm:space-y-0">
                        <p className="text-xs text-gray-500">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </p>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-yellow-400 rounded-full sm:ml-2"></div>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No notifications</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center space-x-2">
                <Zap className="w-5 h-5 text-green-400" />
                <span>Quick Actions</span>
              </h2>
              
              <div className="space-y-3">
                <motion.button
                  onClick={() => navigate('/create')}
                  className="w-full flex items-center space-x-3 p-3 bg-purple-600/10 border border-purple-600/20 rounded-xl text-purple-400 hover:bg-purple-600/20 transition-colors duration-200 text-left"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="w-5 h-5" />
                  <span>Create New Project</span>
                </motion.button>
                
                <motion.button
                  onClick={() => navigate('/marketplace')}
                  className="w-full flex items-center space-x-3 p-3 bg-blue-600/10 border border-blue-600/20 rounded-xl text-blue-400 hover:bg-blue-600/20 transition-colors duration-200 text-left"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Browse Marketplace</span>
                </motion.button>
                
                <motion.button
                  onClick={() => navigate('/dashboard/sales')}
                  className="w-full flex items-center space-x-3 p-3 bg-green-600/10 border border-green-600/20 rounded-xl text-green-400 hover:bg-green-600/20 transition-colors duration-200 text-left"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <DollarSign className="w-5 h-5" />
                  <span>Manage Sales</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PortfolioValueModal
        isOpen={portfolioModalOpen}
        onClose={() => setPortfolioModalOpen(false)}
        stats={stats}
        projects={projects}
      />

      <ProjectInterestsModal
        isOpen={interestsModalOpen}
        onClose={() => setInterestsModalOpen(false)}
        userId={user?.id || user?.user_id}
      />

      <ProjectStatsModal
        isOpen={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
        stats={stats}
        projects={projects}
      />

      <SalesHistoryModal
        isOpen={salesModalOpen}
        onClose={() => setSalesModalOpen(false)}
        userId={user?.id || user?.user_id}
      />
    </div>
  );
};

export default DashboardPage; 