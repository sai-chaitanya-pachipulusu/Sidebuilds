import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, CheckCircle, Calendar, User, Package, TrendingUp } from 'lucide-react';
import { Button } from '../../shadcn/ui/button';
import { Card, CardContent } from '../../shadcn/ui/card';
import { Badge } from '../../shadcn/ui/badge';
import { getSellerPurchaseRequests } from '../../services/api';
import { useEscapeKey } from '../../hooks/useEscapeKey';

const SalesHistoryModal = ({ isOpen, onClose, userId }) => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Close modal on ESC key
  useEscapeKey(onClose, isOpen);

  console.log('SalesHistoryModal props:', { isOpen, userId });

  useEffect(() => {
    console.log('SalesHistoryModal effect triggered:', { isOpen, userId, userIdType: typeof userId });
    if (isOpen && userId) {
      console.log('Calling fetchSalesData with userId:', userId);
      fetchSalesData();
    } else if (isOpen && !userId) {
      console.error('Modal opened but userId is missing:', userId);
      setLoading(false);
    }
  }, [isOpen, userId]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      console.log('Fetching sales data for user:', userId);

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const apiPromise = getSellerPurchaseRequests();
      const purchaseRequests = await Promise.race([apiPromise, timeoutPromise]);

      console.log('Received purchase requests:', purchaseRequests);

      // Filter for completed sales and format the data
      const completedSales = purchaseRequests
        .filter(request => request.status === 'completed' || request.status === 'transfer_completed_buyer_confirmed')
        .map(request => ({
          id: request.request_id || request.id,
          project_name: request.project_name,
          buyer_username: request.buyer_username,
          amount: request.price || request.accepted_price,
          date: request.created_at,
          status: request.status,
          transfer_status: request.status === 'completed' ? 'completed' : 'pending'
        }));

      console.log('Filtered completed sales:', completedSales);
      setSales(completedSales);

    } catch (error) {
      console.error('Failed to fetch sales data:', error);
      console.error('Error details:', error.response?.data || error.message);
      setSales([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.amount, 0);

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
                <CheckCircle className="w-6 h-6 text-green-400" />
                <span>Sales History</span>
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
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="bg-gray-800/50 border-white/[0.08]">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-gray-400">Completed Sales</span>
                    </div>
                    <p className="text-2xl font-bold text-white mt-2">{sales.length}</p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-white/[0.08]">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-gray-400">Total Revenue</span>
                    </div>
                    <p className="text-2xl font-bold text-white mt-2">{formatPrice(totalRevenue)}</p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-white/[0.08]">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-gray-400">Average Sale</span>
                    </div>
                    <p className="text-2xl font-bold text-white mt-2">
                      {sales.length > 0 ? formatPrice(totalRevenue / sales.length) : formatPrice(0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Sales List */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                  <span className="ml-3 text-gray-400">Loading sales history...</span>
                </div>
              ) : sales.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Sales</h3>
                  {sales.map((sale, index) => (
                    <motion.div
                      key={sale.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gray-800/30 rounded-xl border border-white/[0.05] p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-white font-medium">{sale.project_name}</h3>
                            <p className="text-gray-400 text-sm flex items-center space-x-2">
                              <User className="w-3 h-3" />
                              <span>Sold to: {sale.buyer_username}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-400">{formatPrice(sale.amount)}</p>
                          <Badge className="bg-green-500/10 text-green-400 border-green-500/20 mt-1">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {sale.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(sale.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>Transfer: </span>
                          <Badge
                            className={
                              sale.transfer_status === 'completed'
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            }
                          >
                            {sale.transfer_status}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 mt-4">
                        <Button size="sm" variant="outline" className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10">
                          View Details
                        </Button>
                        <Button size="sm" variant="outline" className="border-purple-500/20 text-purple-400 hover:bg-purple-500/10">
                          Download Receipt
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-lg">No completed sales yet</p>
                  <p className="text-sm mt-1">When you complete sales, they'll appear here</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SalesHistoryModal;
