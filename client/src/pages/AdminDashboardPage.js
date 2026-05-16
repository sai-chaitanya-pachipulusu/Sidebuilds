import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Activity, AlertTriangle, Briefcase, DollarSign, RefreshCw, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getAdminProjects, getAdminStats, getAdminTransactions, getAdminUsers } from '../services/api';

const StatCard = ({ label, value, icon: Icon }) => (
  <div className="bg-gray-900/70 border border-white/[0.08] p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-gray-400">{label}</span>
      <Icon className="w-5 h-5 text-blue-300" />
    </div>
    <div className="text-3xl font-bold text-white">{value ?? 0}</div>
  </div>
);

const AdminDashboardPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.is_admin === true || user?.is_admin === 1;

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsData, usersData, projectsData, transactionsData] = await Promise.all([
        getAdminStats(),
        getAdminUsers(),
        getAdminProjects(),
        getAdminTransactions()
      ]);
      setStats(statsData);
      setUsers(usersData || []);
      setProjects(projectsData || []);
      setTransactions(transactionsData || []);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to load admin dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen px-6 py-24">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-blue-300 text-sm font-mono uppercase tracking-wider">Admin</p>
            <h1 className="text-4xl font-bold text-white mt-2">Platform Control Center</h1>
            <p className="text-gray-400 mt-2">Monitor users, listings, purchase workflow health, and failed payments.</p>
          </div>
          <button
            type="button"
            onClick={loadAdminData}
            disabled={isLoading}
            className="px-4 py-2 bg-white text-black font-semibold flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard label="Users" value={stats?.users} icon={Users} />
          <StatCard label="Projects" value={stats?.projects} icon={Briefcase} />
          <StatCard label="Active Listings" value={stats?.activeListings} icon={Activity} />
          <StatCard label="Purchase Requests" value={stats?.purchaseRequests} icon={DollarSign} />
          <StatCard label="Failed Payments" value={stats?.failedPayments} icon={AlertTriangle} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <section className="bg-gray-900/70 border border-white/[0.08] p-5">
            <h2 className="text-xl font-semibold text-white mb-4">Recent Users</h2>
            <div className="space-y-3 max-h-[420px] overflow-auto">
              {users.map((item) => (
                <div key={item.user_id} className="border border-white/[0.06] p-3">
                  <div className="text-white font-medium">{item.username || item.email}</div>
                  <div className="text-xs text-gray-400">{item.email}</div>
                  <div className="text-xs text-gray-500 mt-1">{item.is_admin ? 'Admin' : item.is_verified ? 'Verified' : 'Standard'}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-gray-900/70 border border-white/[0.08] p-5">
            <h2 className="text-xl font-semibold text-white mb-4">Recent Projects</h2>
            <div className="space-y-3 max-h-[420px] overflow-auto">
              {projects.map((item) => (
                <div key={item.project_id} className="border border-white/[0.06] p-3">
                  <div className="text-white font-medium">{item.name}</div>
                  <div className="text-xs text-gray-400">Owner: {item.owner_username || 'Unknown'}</div>
                  <div className="text-xs text-gray-500 mt-1">{item.is_for_sale ? 'For sale' : 'Not for sale'} · {item.stage || 'unknown'}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-gray-900/70 border border-white/[0.08] p-5">
            <h2 className="text-xl font-semibold text-white mb-4">Transactions</h2>
            <div className="space-y-3 max-h-[420px] overflow-auto">
              {transactions.map((item) => (
                <div key={item.id} className="border border-white/[0.06] p-3">
                  <div className="text-white font-medium">{item.project_name || item.project_id}</div>
                  <div className="text-xs text-gray-400">Status: {item.status}</div>
                  <div className="text-xs text-gray-500 mt-1">Price: {item.price ? `$${Number(item.price).toLocaleString()}` : 'N/A'}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
