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
import StripeConnectBanner from '../components/StripeConnectBanner';

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
  const [recentActivity, setRecentActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use real-time dashboard sync
  const { 
    data: realtimeStats, 
    loading: realtimeLoading, 
    refresh: refreshDashboard,
    connectionStatus 
  } = useDashboardSync({
    refreshInterval: 60000, // 1 minute
    enableRealTime: true
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      try {
        // Fetch real-time dashboard analytics from API
        const dashboardResponse = await fetch('/api/analytics/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        let dynamicStats = {};
        if (dashboardResponse.ok) {
          dynamicStats = await dashboardResponse.json();
        }

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

        const ownedProjects = projectsData.filter(p => p.user_id === user.id && !p.is_purchased);
        const totalValue = ownedProjects.reduce((sum, p) => sum + (p.sale_price || 0), 0);
        const totalViews = ownedProjects.reduce((sum, p) => sum + (p.view_count || 0), 0);
        const activeOffers = sellerRequestsData.filter(r => 
          !['completed', 'rejected_by_seller', 'withdrawn_by_buyer'].includes(r.status)
        ).length;
        const completedSales = sellerRequestsData.filter(r => r.status === 'completed').length;
        const purchasesMade = buyerRequestsData.filter(r => r.status === 'completed').length;
        
        // Calculate dynamic metrics
        const monthlyRevenue = ownedProjects.reduce((sum, p) => sum + (p.monthly_revenue || 0), 0);
        const lastMonthViews = ownedProjects.reduce((sum, p) => sum + (p.last_month_views || 0), 0);
        const growthRate = lastMonthViews > 0 ? ((totalViews - lastMonthViews) / lastMonthViews * 100) : 0;
        const conversionRate = totalViews > 0 ? (sellerRequestsData.length / totalViews * 100) : 0;
        
        setStats({
          totalProjects: ownedProjects.length,
          portfolioValue: totalValue,
          activeOffers,
          completedSales,
          totalViews,
          averageViews: ownedProjects.length > 0 ? Math.round(totalViews / ownedProjects.length) : 0,
          interestReceived: sellerRequestsData.length,
          purchasesMade,
          monthlyRevenue: dynamicStats.monthlyRevenue || monthlyRevenue,
          growthRate: dynamicStats.growthRate || Math.round(growthRate * 100) / 100,
          conversionRate: dynamicStats.conversionRate || Math.round(conversionRate * 100) / 100,
          lastUpdated: new Date().toISOString()
        });

        setProjects(ownedProjects.slice(0, 3));
        setNotifications(notificationsData.slice(0, 5));
        
        // Create activity feed
        const activities = [
          ...sellerRequestsData.slice(0, 3).map(req => ({
            type: 'interest',
            message: `New interest received for "${req.project_name}"`,
            time: req.created_at,
            status: req.status
          })),
          ...buyerRequestsData.slice(0, 2).map(req => ({
            type: 'purchase',
            message: `Purchase request for "${req.project_name}"`,
            time: req.created_at,
            status: req.status
          }))
        ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);
        
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

  const StatCard = ({ icon: Icon, title, value, change, changeType, description, color = "purple" }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6 hover:border-white/[0.12] transition-all duration-300 group relative overflow-hidden"
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br from-${color}-600/5 to-${color}-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl bg-${color}-500/10 border border-${color}-500/20`}>
            <Icon className={`w-6 h-6 text-${color}-400`} />
          </div>
          {change && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium ${
              changeType === 'increase' 
                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {changeType === 'increase' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {change}
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <h3 className="text-2xl font-bold text-white">{value}</h3>
          <p className="text-sm text-gray-400">{title}</p>
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      </div>
    </motion.div>
  );

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
        className="flex items-start space-x-3 p-3 hover:bg-white/[0.03] rounded-xl transition-colors duration-200"
      >
        <div className="p-2 rounded-lg bg-gray-800/50 border border-white/[0.05]">
          {getActivityIcon(activity.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 leading-relaxed">{activity.message}</p>
          <div className="flex items-center space-x-2 mt-1">
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
          />
          <StatCard
            icon={DollarSign}
            title="Portfolio Value"
            value={formatPrice(stats.portfolioValue)}
            description="Total value of your projects"
            color="green"
          />
          <StatCard
            icon={Heart}
            title="Active Offers"
            value={stats.activeOffers}
            description="Pending purchase requests"
            color="red"
          />
          <StatCard
            icon={CheckCircle}
            title="Completed Sales"
            value={stats.completedSales}
            description="Successfully completed transactions"
            color="blue"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Eye}
            title="Total Views"
            value={stats.totalViews.toLocaleString()}
            description="Across all your projects"
            color="indigo"
          />
          <StatCard
            icon={TrendingUp}
            title="Average Views"
            value={stats.averageViews}
            description="Per project"
            color="cyan"
          />
          <StatCard
            icon={Users}
            title="Interest Received"
            value={stats.interestReceived}
            description="Total purchase inquiries"
            color="pink"
          />
          <StatCard
            icon={ShoppingBag}
            title="Purchases Made"
            value={stats.purchasesMade}
            description="Projects you've bought"
            color="orange"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Activity & Projects */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6"
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
              className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6"
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
                      className={`p-3 rounded-xl transition-colors duration-200 cursor-pointer ${
                        !notification.is_read 
                          ? 'bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20' 
                          : 'bg-white/[0.03] hover:bg-white/[0.05]'
                      }`}
                      onClick={() => notification.link && navigate(notification.link)}
                    >
                      <p className="text-sm text-gray-200 leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </p>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                      )}
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
    </div>
  );
};

export default DashboardPage; 