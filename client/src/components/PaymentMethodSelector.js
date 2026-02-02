import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Smartphone,
  Globe,
  CheckCircle,
  Loader2,
  ChevronRight,
  Star,
  Lock,
  Zap,
  Shield
} from 'lucide-react';
import paymentService from '../services/paymentService';
import toast from 'react-hot-toast';

const PaymentMethodSelector = ({ 
  projectId, 
  amount, 
  currency = 'USD', 
  onPaymentStart, 
  onPaymentSuccess, 
  onPaymentError,
  className = ''
}) => {
  const [availableMethods, setAvailableMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Payment method configurations
  const paymentMethods = {
    stripe: {
      id: 'stripe',
      name: 'Stripe',
      description: 'Credit/Debit Cards, Apple Pay, Google Pay',
      icon: CreditCard,
      color: 'from-white to-gray-300',
      features: ['Instant Processing', 'Secure Payments', 'Buyer Protection'],
      fees: '2.9% + $0.30',
      processingTime: 'Instant',
      popularity: 95
    },
    paypal: {
      id: 'paypal',
      name: 'PayPal',
      description: 'PayPal Balance, Cards, Bank Transfer',
      icon: Globe,
      color: 'from-blue-600 to-blue-700',
      features: ['Buyer Protection', 'Easy Refunds', 'Global Acceptance'],
      fees: '2.9% + $0.30',
      processingTime: 'Instant',
      popularity: 88
    },
    razorpay: {
      id: 'razorpay',
      name: 'Razorpay',
      description: 'UPI, Cards, Net Banking, Wallets',
      icon: Smartphone,
      color: 'from-green-600 to-emerald-600',
      features: ['UPI Support', 'Local Methods', 'Fast Processing'],
      fees: '2% + ₹2',
      processingTime: 'Instant',
      popularity: 82
    },
    square: {
      id: 'square',
      name: 'Square',
      description: 'Credit/Debit Cards',
      icon: CreditCard,
      color: 'from-gray-700 to-gray-800',
      features: ['Simple Setup', 'Transparent Pricing', 'No Hidden Fees'],
      fees: '2.6% + $0.10',
      processingTime: 'Instant',
      popularity: 75
    }
  };

  useEffect(() => {
    fetchAvailablePaymentMethods();
  }, [fetchAvailablePaymentMethods]);

  const fetchAvailablePaymentMethods = async () => {
    try {
      setLoading(true);
      const methods = await paymentService.getAvailablePaymentMethods();
      
      // Filter and enhance with local config
      const enhanced = methods
        .filter(method => paymentMethods[method.id])
        .map(method => ({
          ...method,
          ...paymentMethods[method.id]
        }))
        .sort((a, b) => b.popularity - a.popularity);
      
      setAvailableMethods(enhanced);
      
      // Auto-select most popular method
      if (enhanced.length > 0) {
        setSelectedMethod(enhanced[0]);
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      toast.error('Failed to load payment methods');
      
      // Fallback to default methods
      const defaultMethods = ['stripe', 'paypal'].map(id => paymentMethods[id]);
      setAvailableMethods(defaultMethods);
      setSelectedMethod(defaultMethods[0]);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    setProcessing(true);
    
    try {
      onPaymentStart?.(selectedMethod);
      
      const result = await paymentService.createUniversalCheckout(
        projectId, 
        selectedMethod.id,
        {
          amount,
          currency,
          metadata: {
            project_id: projectId,
            payment_method: selectedMethod.id
          }
        }
      );

      // Redirect to payment provider
      if (result.url) {
        window.location.href = result.url;
      } else if (result.success) {
        onPaymentSuccess?.(result);
        toast.success('Payment completed successfully!');
      }
    } catch (error) {
      console.error('Payment failed:', error);
      onPaymentError?.(error);
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatAmount = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-8">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-300 mr-3" />
          <span className="text-gray-400">Loading payment methods...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-5 h-5 text-green-400" />
          <h3 className="text-xl font-bold text-white">Secure Payment</h3>
        </div>
        <p className="text-gray-400">Choose your preferred payment method</p>
      </div>

      {/* Amount Display */}
      <div className="bg-gray-800/30 rounded-xl p-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-white mb-1">
            {formatAmount(amount, currency)}
          </div>
          <div className="text-gray-400 text-sm">One-time purchase</div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="space-y-3 mb-6">
        <h4 className="text-lg font-semibold text-white mb-3">Payment Methods</h4>
        
        {availableMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod?.id === method.id;
          
          return (
            <motion.div
              key={method.id}
              className={`relative p-4 border-2 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-white bg-white/10'
                  : 'border-white/20 hover:border-white/40 bg-black'
              }`}
              onClick={() => setSelectedMethod(method)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${method.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-white font-semibold">{method.name}</h5>
                      {method.popularity > 90 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-full">
                          <Star className="w-3 h-3 text-yellow-400" />
                          <span className="text-yellow-400 text-xs font-medium">Popular</span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{method.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Fees: {method.fees}</span>
                      <span>•</span>
                      <span>{method.processingTime}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isSelected && (
                    <CheckCircle className="w-5 h-5 text-white" />
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </div>
              </div>
              
              {/* Method Features */}
              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-gray-700"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {method.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Security Info */}
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-green-400 mt-0.5" />
          <div>
            <h4 className="text-green-400 font-semibold text-sm">Secure & Protected</h4>
            <p className="text-gray-300 text-sm">
              Your payment information is encrypted and secure. All transactions are protected by industry-standard security measures.
            </p>
          </div>
        </div>
      </div>

      {/* Payment Button */}
      <motion.button
        onClick={handlePayment}
        disabled={processing || !selectedMethod}
        className="w-full px-6 py-4 bg-white text-black font-bold uppercase disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-all duration-200 flex items-center justify-center gap-2"
        whileHover={{ scale: processing ? 1 : 1.02 }}
        whileTap={{ scale: processing ? 1 : 0.98 }}
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            Pay {formatAmount(amount, currency)}
          </>
        )}
      </motion.button>

      {/* Trust Indicators */}
      <div className="mt-6 flex items-center justify-center space-x-6 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          <span>SSL Encrypted</span>
        </div>
        <div className="flex items-center gap-1">
          <Lock className="w-3 h-3" />
          <span>PCI Compliant</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          <span>Verified Secure</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSelector; 
