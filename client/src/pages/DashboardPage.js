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
// Stripe banner removed from dashboard - only shown in project listing flow
import ElegantLoadingScreen from '../components/ElegantLoadingScreen';
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
  // loading is initialized to true
  const [loading, setLoading] = useState(true);

  // Modal states
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [interestsModalOpen, setInterestsModalOpen] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [salesModalOpen, setSalesModalOpen] = useState(false);

  // Use real-time dashboard sync and actually CONSUME the data
  const { 
    data: syncData, 
    loading: syncLoading
  } = useDashboardSync({
    refreshInterval: 60000, 
    enableRealTime: true,
    cacheData: false // Force fresh fetch on mount issues
  });

  // Update effect for syncData
  useEffect(() => {
    if (syncData) {
      console.log('[Dashboard] Sync hook data received:', syncData);
      if (syncData.stats) setStats(syncData.stats);
      if (syncData.recentProjects) setRecentProjects(syncData.recentProjects);
      // If the hook provides data, we can turn off our local loading state
      if (loading) setLoading(false);
    }
  }, [syncData, loading]);

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

  // Initial Fetch Effect - Acts as immediate fallback while sync hook initializes
  useEffect(() => {
    console.log('Dashboard useEffect triggered, user:', user);
    const fetchDashboardData = async () => {
      if (!user) {
        console.log('No user found, returning early');
        return;
      }
      
      try {
        console.log('Starting dashboard initial fetch...');

        // Fetch comprehensive dashboard data
        const dashboardResponse = await fetch('/api/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!dashboardResponse.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const dashboardData = await dashboardResponse.json();
        const s = dashboardData.stats || {};
        console.log('[Dashboard] Raw stats received from API:', s);
        
        // Use the dashboard API data
        setStats(s);
        setRecentProjects(dashboardData.recentProjects || []);
        setLoading(false);
        
        // Show a brief debug toast in development
        if (process.env.NODE_ENV !== 'production') {
          const toast = require('react-hot-toast').default;
          // toast.success(`Dashboard data synced: ${s.totalProjects || 0} projects found.`, { id: 'dashboard-debug' });
        }
        
        // Also fetch additional data for notifications and detailed project info
        try {
          const [
            projectsData,
            sellerRequestsData,
            buyerRequestsData,
            notificationsData
          ] = await Promise.all([
            getProjects().catch(e => { console.error('getProjects failed', e); return []; }),
            getSellerPurchaseRequests().catch(e => { console.error('getSellerPurchaseRequests failed', e); return []; }),
            getBuyerPurchaseRequests().catch(e => { console.error('getBuyerPurchaseRequests failed', e); return []; }),
            getNotifications().catch(e => { console.error('getNotifications failed', e); return []; })
          ]);


          console.log('[Dashboard] Additional data fetched:', {
            projectsCount: projectsData?.length,
            sellerReqCount: sellerRequestsData?.length,
            buyerReqCount: buyerRequestsData?.length
          });

          // Keep the additional data for modals and detailed views
          setProjects(projectsData || []);
          setNotifications(notificationsData || []);
          
          // Create activity feed from requests
          const sellerActivities = (sellerRequestsData || []).slice(0, 3).map(req => ({
            type: 'interest',
            message: `New interest received for "${req.project_name || 'Project'}"`,
            time: req.created_at,
            status: req.status
          }));
  
          const buyerActivities = (buyerRequestsData || []).slice(0, 2).map(req => ({
            type: 'purchase',
            message: `Purchase request for "${req.project_name || 'Project'}"`,
            time: req.created_at,
            status: req.status
          }));
  
          const activities = [...sellerActivities, ...buyerActivities]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 5);
  
          if (activities.length > 0) {
            setRecentActivity(activities);
          }
        } catch (dataErr) {
          console.error('Error fetching supplementary dashboard data:', dataErr);
        }

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // Do NOT set loading(false) on error. 
        // Let the loading screen persist so the user doesn't see empty 0 values.
        // The useDashboardSync hook will retry and eventually populate the data.
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

  const StatCard = ({ icon: Icon, title, value, trend, trendUp, description, color = "gray", onClick }) => {
    // Simplified color mapping for the new premium theme
    const getColorClasses = (color) => {
      const colors = {
        // Monochrome color scheme
        gray: { text: 'text-white', icon: 'text-white', bg: 'bg-white/10', border: 'border-white/20' },
        green: { text: 'text-emerald-400', icon: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        red: { text: 'text-rose-400', icon: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
        blue: { text: 'text-white', icon: 'text-white', bg: 'bg-white/10', border: 'border-white/20' },
        indigo: { text: 'text-white', icon: 'text-white', bg: 'bg-white/10', border: 'border-white/20' },
        cyan: { text: 'text-white', icon: 'text-white', bg: 'bg-white/10', border: 'border-white/20' },
        pink: { text: 'text-white', icon: 'text-white', bg: 'bg-white/10', border: 'border-white/20' },
        orange: { text: 'text-amber-400', icon: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }
      };
      return colors[color] || colors.gray;
    };
    
    const colorClasses = getColorClasses(color);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`spotlight-card rounded-none p-6 transition-all duration-300 group cursor-pointer hover:shadow-premium-lg`}
        onClick={onClick}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
          e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-none ${colorClasses.bg} ${colorClasses.border} border shadow-inner`}>
              <Icon className={`w-6 h-6 ${colorClasses.icon}`} />
            </div>
            {trend && (
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-none text-xs font-medium border ${
                trendUp
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {trend}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-3xl font-bold text-white tracking-tight">
              {value}
            </h3>
            <p className="text-sm text-gray-400 font-medium">{title}</p>
            {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
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
      return 'text-white';
    };

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
        className="glass-card hover:glass-card-hover flex items-start space-x-4 p-4 rounded-none cursor-pointer group"
        onClick={() => {
          console.log('Activity item clicked:', activity);
          handleActivityClick(activity);
        }}
      >
        <div className={`p-2 rounded-none ${
            activity.type === 'purchase' || activity.type === 'sale' ? 'bg-white/10 text-white' :
            activity.type === 'interest' ? 'bg-white/10 text-white' :
            'bg-gray-800 text-gray-400'
        }`}>
          {getActivityIcon(activity.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 leading-relaxed font-medium">{activity.message}</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mt-1.5">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <div className="w-1 h-1 rounded-none bg-gray-500" />
              {new Date(activity.time).toLocaleDateString()}
            </span>
            {activity.status && (
              <span className={`text-xs px-2 py-0.5 rounded-none border ${
                getStatusColor(activity.status) === 'text-green-400' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                getStatusColor(activity.status) === 'text-yellow-400' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                'bg-white/10 border-white/20 text-white'
              }`}>
                {activity.status.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return <ElegantLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* NOTE: Stripe Connect prompt moved to project listing flow - not needed on main dashboard */}

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
              className="flex items-center space-x-2 px-6 py-3 bg-white text-black rounded-none font-medium hover:bg-gray-200 transition-all duration-200 shadow-lg shadow-white/20 border border-white/20"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-5 h-5" />
              <span>New Project</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard
            icon={Package}
            title="Total Projects"
            value={stats.totalProjects}
            description="Active projects in your portfolio"
            color="gray"
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
          <div className="glass-card p-4 rounded-none">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">{stats.textViews || stats.totalViews}</div>
                <div className="text-sm text-gray-400">Total Views</div>
              </div>
              <Eye className="w-8 h-8 text-gray-300/50" />
            </div>
          </div>
          <div className="glass-card p-4 rounded-none">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">{stats.averageViews}</div>
                <div className="text-sm text-gray-400">Avg Views</div>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-500/50" />
            </div>
          </div>
          <div className="glass-card p-4 rounded-none">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">{stats.interestReceived}</div>
                <div className="text-sm text-gray-400">Interests Received</div>
              </div>
              <Users className="w-8 h-8 text-gray-300/50" />
            </div>
          </div>
          <div className="glass-card p-4 rounded-none">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">{stats.purchasesMade}</div>
                <div className="text-sm text-gray-400">Purchases Made</div>
              </div>
              <ShoppingBag className="w-8 h-8 text-amber-500/50" />
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
              className="text-white border-white/40 hover:bg-gray-400 hover:text-white"
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
                  className="glass-card hover:glass-card-hover p-6 cursor-pointer group"
                  onClick={() => navigate(`/projects/edit/${project.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">{project.name}</h3>
                      <p className="text-gray-400 text-sm line-clamp-2">{project.description}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      project.status === 'launched' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      project.status === 'mvp' ? 'bg-white/10 text-white border border-white/20' :
                      'bg-gray-500/10 text-gray-400 border border-gray-500/20'
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
            <div className="spotlight-card rounded-none p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-none bg-gray-800/50 flex items-center justify-center border border-white/5">
                <Package className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No projects started yet</h3>
              <p className="text-gray-400 mb-6 max-w-sm mx-auto">
                Your portfolio is empty. Launch your first project to start tracking views and sales.
              </p>
              <Button onClick={() => navigate('/create')} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create First Project
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
              className="text-white border-white hover:bg-white hover:text-black"
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
                  className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-none p-4 hover:bg-gray-800/50 transition-colors cursor-pointer"
                  onClick={() => handleActivityClick(activity)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-2 h-2 rounded-none ${
                          activity.status === 'unread' ? 'bg-white' : 'bg-gray-600'
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
            <div className="text-center py-12 bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-none">
              <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No recent activity</h3>
              <p className="text-gray-400">Activity will appear here when you have notifications</p>
            </div>
          )}
        </motion.div>

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
      {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'true' && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/95 p-6 z-[9999] max-h-64 overflow-auto border-t border-blue-500">
          <pre className="text-xs text-green-400">
            {JSON.stringify({ stats, user, projectsCount: projects.length }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DashboardPage; 
