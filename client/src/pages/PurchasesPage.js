import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getBuyerPurchaseRequests } from '../services/api';
import SEO from '../components/SEO';
import ErrorBoundary from '../components/ErrorBoundary';
import { Button } from '../shadcn/ui/button';
import { Card, CardContent } from '../shadcn/ui/card';
import { Badge } from '../shadcn/ui/badge';
import {
  ShoppingBag,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Calendar,
  User,
  Package,
  ArrowLeft,
  Eye,
  Download,
  Loader2,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  FileText,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';

// Simple Modal Component
const Modal = ({ isOpen, onClose, title, children, error }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-900 border border-white/[0.1] rounded-xl p-6 max-w-md w-full shadow-2xl"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        {children}
      </motion.div>
    </div>
  );
};

// Skeleton Card Component for loading state
const PurchaseCardSkeleton = () => (
  <div className="bg-gray-900/30 rounded-xl border border-white/[0.05] p-6 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-800 rounded-xl" />
        <div className="space-y-2">
          <div className="h-5 bg-gray-800 rounded w-48" />
          <div className="h-4 bg-gray-800 rounded w-32" />
        </div>
      </div>
      <div className="text-right space-y-2">
        <div className="h-6 bg-gray-800 rounded w-24" />
        <div className="h-5 bg-gray-800 rounded w-20 ml-auto" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4 mb-4">
      <div className="h-4 bg-gray-800 rounded" />
      <div className="h-4 bg-gray-800 rounded" />
      <div className="h-4 bg-gray-800 rounded" />
    </div>
    <div className="flex justify-between">
      <div className="h-8 bg-gray-800 rounded w-28" />
      <div className="h-8 bg-gray-800 rounded w-32" />
    </div>
  </div>
);

// Empty State Component
const EmptyState = ({ onBrowse }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-16 px-4"
  >
    <div className="w-24 h-24 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
      <ShoppingBag className="w-12 h-12 text-gray-500" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">No purchases yet</h3>
    <p className="text-gray-400 max-w-md mx-auto mb-8">
      You haven't purchased any projects yet. Browse the marketplace to find projects you're interested in.
    </p>
    <Button onClick={onBrowse} className="bg-blue-600 hover:bg-blue-700">
      <Package className="w-4 h-4 mr-2" />
      Browse Marketplace
    </Button>
  </motion.div>
);

// Error State Component
const ErrorState = ({ error, onRetry }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-16 px-4"
  >
    <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
      <AlertTriangle className="w-12 h-12 text-red-400" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">Failed to load purchases</h3>
    <p className="text-red-400 max-w-md mx-auto mb-2">{error}</p>
    <p className="text-gray-500 text-sm mb-8">Please try again or contact support if the problem persists.</p>
    <Button onClick={onRetry} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
      <RefreshCw className="w-4 h-4 mr-2" />
      Try Again
    </Button>
  </motion.div>
);

// Purchase Card Component
const PurchaseCard = ({ purchase, index, onConfirmReceipt, onOpenDispute, onViewProject, submissionLoading }) => {
  const formatPrice = (price) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  const getStatusColor = (status, escrowStatus) => {
    if (escrowStatus === 'held') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    if (escrowStatus === 'released') return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (escrowStatus === 'disputed') return 'bg-red-500/10 text-red-400 border-red-500/20';

    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'seller_accepted_pending_payment':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'seller_rejected':
      case 'buyer_withdrew_interest':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    }
  };

  const getStatusIcon = (status, escrowStatus) => {
    if (escrowStatus === 'held') return <Clock className="w-4 h-4" />;
    if (escrowStatus === 'released') return <CheckCircle className="w-4 h-4" />;
    if (escrowStatus === 'disputed') return <XCircle className="w-4 h-4" />;

    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'seller_accepted_pending_payment':
        return <Clock className="w-4 h-4" />;
      case 'seller_rejected':
      case 'buyer_withdrew_interest':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status, escrowStatus) => {
    if (escrowStatus === 'held') return 'Funds Held in Escrow';
    if (escrowStatus === 'released') return 'Funds Released';
    if (escrowStatus === 'disputed') return 'Disputed';
    return status.replace(/_/g, ' ');
  };

  return (
    <motion.div
      key={purchase.id || index}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-gray-900/30 rounded-xl border border-white/[0.05] p-6 hover:border-white/[0.1] transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-medium text-lg">{purchase.project_name}</h3>
            <p className="text-gray-400 flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Seller: {purchase.seller_username}</span>
            </p>
          </div>
        </div>
        <div className="text-right space-y-2">
          <p className="text-2xl font-bold text-green-400">
            {formatPrice(purchase.price || purchase.accepted_price || 0)}
          </p>
          <Badge className={`${getStatusColor(purchase.status, purchase.escrow_status)} flex items-center space-x-1 w-fit ml-auto`}>
            {getStatusIcon(purchase.status, purchase.escrow_status)}
            <span className="text-xs">{getStatusText(purchase.status, purchase.escrow_status)}</span>
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">
            {new Date(purchase.created_at).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-gray-300">
            Request ID: #{purchase.purchase_request_id || purchase.id}
          </span>
        </div>
        {purchase.escrow_status === 'held' && (
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-400 font-medium">Action Required</span>
          </div>
        )}
      </div>

      {purchase.buyer_intro_message && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-white/[0.05] mb-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Message</h4>
          <p className="text-sm text-gray-400 leading-relaxed">{purchase.buyer_intro_message}</p>
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewProject(purchase.project_id)}
            className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Project
          </Button>
          
          {/* Report Issue Button - Only for held funds/active escrow */}
          {purchase.escrow_status === 'held' && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onOpenDispute(purchase)}
              disabled={submissionLoading}
              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Report Issue
            </Button>
          )}
        </div>
        
        <div className="flex space-x-2">
          {/* Status-based actions */}
          {purchase.status === 'seller_accepted_pending_payment' && (
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700" 
              onClick={() => onViewProject(purchase.project_id)}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Complete Payment
            </Button>
          )}
          
          {/* Confirm Receipt - Only if funds are held */}
          {purchase.escrow_status === 'held' && (
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => onConfirmReceipt(purchase)}
              disabled={submissionLoading}
            >
              {submissionLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Confirm & Release Funds
            </Button>
          )}
          
          {/* Download Receipt - If released */}
          {(purchase.escrow_status === 'released' || (purchase.status === 'completed' && !purchase.escrow_status)) && (
            <Button
              size="sm"
              variant="outline"
              className="border-green-500/20 text-green-400 hover:bg-green-500/10"
              onClick={() => toast.info('Receipt download coming soon!')}
            >
              <Download className="w-4 h-4 mr-2" />
              Receipt
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const PurchasesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Dispute Modal State
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [disputeError, setDisputeError] = useState(null);

  // Fetch purchases with retry logic
  const fetchPurchases = useCallback(async (isRetry = false) => {
    if (!user) return;

    try {
      setLoading(true);
      if (isRetry) {
        setError(null);
      }
      
      const data = await getBuyerPurchaseRequests();
      setPurchases(data);
      setRetryCount(0);
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
      const errorMessage = error.message || 'Failed to load purchases';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  // Retry with exponential backoff
  const handleRetry = useCallback(() => {
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const delay = Math.min(Math.pow(2, newRetryCount - 1) * 1000, 30000);
    
    toast.loading(`Retrying in ${delay / 1000}s...`, {
      duration: delay
    });
    
    setTimeout(() => {
      fetchPurchases(true);
    }, delay);
  }, [retryCount, fetchPurchases]);

  const handleConfirmReceipt = async (purchase) => {
    if (!purchase.transaction_id) {
      toast.error('Transaction ID not found');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to confirm receipt for ${purchase.project_name}? This will release funds to the seller.`)) {
      return;
    }

    try {
      setSubmissionLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/payments/confirm-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ transactionId: purchase.transaction_id })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm receipt');
      }

      toast.success('Receipt confirmed! Funds released to seller.');
      
      // Update local state
      setPurchases(prev => prev.map(p => 
        p.id === purchase.id ? { ...p, escrow_status: 'released', transfer_completed: 1 } : p
      ));
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setSubmissionLoading(false);
    }
  };

  const openDisputeModal = (purchase) => {
    setSelectedPurchase(purchase);
    setDisputeReason('');
    setDisputeError(null);
    setIsDisputeModalOpen(true);
  };

  const submitDispute = async () => {
    if (!disputeReason.trim()) {
      setDisputeError('Please provide a reason for the dispute.');
      return;
    }

    if (disputeReason.trim().length < 10) {
      setDisputeError('Please provide a more detailed description (at least 10 characters).');
      return;
    }

    try {
      setSubmissionLoading(true);
      setDisputeError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/payments/report-issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          transactionId: selectedPurchase.transaction_id,
          issueDescription: disputeReason
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to report issue');
      }

      toast.success('Issue reported. Funds are frozen pending review.');
      setIsDisputeModalOpen(false);
      
      // Update local state
      setPurchases(prev => prev.map(p => 
        p.id === selectedPurchase.id ? { ...p, escrow_status: 'disputed' } : p
      ));
    } catch (error) {
      console.error(error);
      setDisputeError(error.message);
      toast.error(error.message);
    } finally {
      setSubmissionLoading(false);
    }
  };

  const handleViewProject = (projectId) => {
    navigate(`/project/${projectId}`);
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  const totalSpent = purchases
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.price || p.accepted_price || 0), 0);

  const activePurchases = purchases.filter(p =>
    !['seller_rejected', 'buyer_withdrew_interest'].includes(p.status) && 
    (p.status !== 'completed' || p.escrow_status === 'held')
  ).length;

  const completedPurchases = purchases.filter(p => 
    p.status === 'completed' && p.escrow_status !== 'held'
  ).length;

  // Loading state with skeleton screens
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <SEO title="My Purchases - SideBuilds" />
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header Skeleton */}
          <div className="mb-8 animate-pulse">
            <div className="h-8 bg-gray-800 rounded w-48 mb-2" />
            <div className="h-4 bg-gray-800 rounded w-64" />
          </div>
          
          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-gray-900/50 border-white/[0.08]">
                <CardContent className="p-6">
                  <div className="h-5 bg-gray-800 rounded w-32 mb-2" />
                  <div className="h-8 bg-gray-800 rounded w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Purchase Cards Skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <PurchaseCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <SEO title="My Purchases - SideBuilds" />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-white flex items-center space-x-2">
              <ShoppingBag className="w-8 h-8 text-white" />
              <span>My Purchases</span>
            </h1>
          </div>
          <ErrorState error={error} onRetry={handleRetry} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <SEO
        title="My Purchases - SideBuilds"
        description="View all your project purchases and transaction history"
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center space-x-2">
                <ShoppingBag className="w-8 h-8 text-white" />
                <span>My Purchases</span>
              </h1>
              <p className="text-gray-400 text-lg mt-2">
                Track all your project purchases and manage escrow
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => fetchPurchases(true)}
              className="border-gray-700 text-gray-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-white/[0.08]">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-400">Completed Purchases</span>
              </div>
              <p className="text-3xl font-bold text-white mt-2">{completedPurchases}</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-white/[0.08]">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-gray-400">Active / In Escrow</span>
              </div>
              <p className="text-3xl font-bold text-white mt-2">{activePurchases}</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-white/[0.08]">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-400">Total Spent</span>
              </div>
              <p className="text-3xl font-bold text-white mt-2">{formatPrice(totalSpent)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Purchases List */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white mb-4">Purchase History</h2>

          {purchases.length > 0 ? (
            <div className="space-y-4">
              {purchases.map((purchase, index) => (
                <PurchaseCard
                  key={purchase.id || index}
                  purchase={purchase}
                  index={index}
                  onConfirmReceipt={handleConfirmReceipt}
                  onOpenDispute={openDisputeModal}
                  onViewProject={handleViewProject}
                  submissionLoading={submissionLoading}
                />
              ))}
            </div>
          ) : (
            <EmptyState onBrowse={() => navigate('/marketplace')} />
          )}
        </div>
      </div>

      {/* Dispute Modal */}
      <Modal 
        isOpen={isDisputeModalOpen} 
        onClose={() => setIsDisputeModalOpen(false)} 
        title="Report an Issue"
        error={disputeError}
      >
        <div className="space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-300 text-sm font-medium">Important</p>
                <p className="text-yellow-300/80 text-sm">
                  Reporting an issue will freeze the funds in escrow while we investigate. 
                  Please be detailed and accurate in your description.
                </p>
              </div>
            </div>
          </div>
          
          <p className="text-gray-300 text-sm">
            If you haven't received the assets or there is an issue with the transfer, 
            please describe it below.
          </p>
          
          <textarea
            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 min-h-[100px] resize-none"
            placeholder="Describe the issue in detail..."
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
          />
          
          <p className="text-xs text-gray-500">
            {disputeReason.length} characters (minimum 10)
          </p>
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="ghost" 
              onClick={() => setIsDisputeModalOpen(false)} 
              disabled={submissionLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={submitDispute} 
              disabled={submissionLoading || !disputeReason.trim() || disputeReason.trim().length < 10}
            >
              {submissionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Wrap with Error Boundary
const PurchasesPageWithErrorBoundary = () => (
  <ErrorBoundary
    fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-gray-400 mb-4">We couldn't load your purchases.</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Page
          </Button>
        </div>
      </div>
    }
  >
    <PurchasesPage />
  </ErrorBoundary>
);

export default PurchasesPageWithErrorBoundary;
