import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageSquare, User, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../shadcn/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shadcn/ui/card';
import { Badge } from '../../shadcn/ui/badge';
import { getSellerPurchaseRequests, rejectPurchaseRequest } from '../../services/api';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import toast from 'react-hot-toast';

const ProjectInterestsModal = ({ isOpen, onClose, userId }) => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionRequestId, setActionRequestId] = useState(null);

  // Close modal on ESC key
  useEscapeKey(onClose, isOpen);

  console.log('ProjectInterestsModal props:', { isOpen, userId });

  useEffect(() => {
    console.log('Modal effect triggered:', { isOpen, userId, userIdType: typeof userId });
    if (isOpen && userId) {
      console.log('Calling fetchPurchaseRequests with userId:', userId);
      fetchPurchaseRequests();
    } else if (isOpen && !userId) {
      console.error('Modal opened but userId is missing:', userId);
      setLoading(false);
    }
  }, [isOpen, userId]);

  const fetchPurchaseRequests = async () => {
    try {
      setLoading(true);
      console.log('Fetching purchase requests for user:', userId);

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const apiPromise = getSellerPurchaseRequests();
      const data = await Promise.race([apiPromise, timeoutPromise]);

      console.log('Received purchase requests:', data);
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch purchase requests:', error);
      console.error('Error details:', error.response?.data || error.message);
      setRequests([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = (request) => {
    const requestId = request.request_id || request.id;
    onClose();
    navigate(`/purchase-agreement/${requestId}`);
  };

  const handleDecline = async (request) => {
    const requestId = request.request_id || request.id;
    if (!window.confirm('Decline this purchase request?')) return;
    try {
      setActionRequestId(requestId);
      await rejectPurchaseRequest(requestId, 'Seller declined the request');
      toast.success('Purchase request declined.');
      await fetchPurchaseRequests();
    } catch (error) {
      toast.error(error?.error || error?.message || 'Failed to decline the request.');
    } finally {
      setActionRequestId(null);
    }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);

  const getStatusColor = (status) => {
    switch (status) {
      case 'seller_accepted_pending_payment':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'seller_rejected':
      case 'buyer_withdrew_interest':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'seller_rejected':
      case 'buyer_withdrew_interest':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-gray-900 border border-white/[0.08] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
              <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                <Heart className="w-6 h-6 text-red-400" />
                <span>Project Interests</span>
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-400">Loading interests...</span>
                </div>
              ) : requests.length > 0 ? (
                <div className="space-y-4">
                  {requests.map((request, index) => (
                    <motion.div
                      key={request.request_id || request.id || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gray-800/30 rounded-xl border border-white/[0.05] p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-white font-medium">{request.buyer_username}</h3>
                            <p className="text-gray-400 text-sm">Interested in: {request.project_name}</p>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(request.status)} flex items-center space-x-1`}>
                          {getStatusIcon(request.status)}
                          <span className="text-xs">{request.status.replace(/_/g, ' ')}</span>
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-gray-300">
                            Offer: <span className="text-green-400 font-medium">{formatPrice(request.price || request.accepted_price || 0)}</span>
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-gray-300">
                            {new Date(request.request_date || request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {request.buyer_commitments && (
                          <div className="flex items-center space-x-2">
                            <MessageSquare className="w-4 h-4 text-purple-400" />
                            <span className="text-sm text-gray-300">Has commitments</span>
                          </div>
                        )}
                      </div>

                      {request.buyer_intro_message && (
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-white/[0.05]">
                          <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                            <MessageSquare className="w-4 h-4" />
                            <span>Buyer's Message</span>
                          </h4>
                          <p className="text-sm text-gray-400 leading-relaxed">{request.buyer_intro_message}</p>
                        </div>
                      )}

                      <div className="flex justify-end space-x-2 mt-4">
                        {request.status !== 'seller_rejected' && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleAccept(request)}
                            disabled={actionRequestId === (request.request_id || request.id)}
                          >
                            Review agreement
                          </Button>
                        )}
                        {request.status === 'interest_expressed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                            onClick={() => handleDecline(request)}
                            disabled={actionRequestId === (request.request_id || request.id)}
                          >
                            Decline
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Heart className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-lg">No interests received yet</p>
                  <p className="text-sm mt-1">When buyers show interest in your projects, they'll appear here</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProjectInterestsModal;
