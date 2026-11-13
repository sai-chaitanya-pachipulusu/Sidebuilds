import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ArrowRight, Shield, Zap, X } from 'lucide-react';
import { getStripeAccountStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';

const StripeConnectBanner = ({ onConnectClick, isDismissible = true }) => {
  const [stripeStatus, setStripeStatus] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkStripeStatus = async () => {
      if (!user) return;
      
      try {
        const status = await getStripeAccountStatus();
        setStripeStatus(status);
        
        // Hide banner if already connected
        if (status?.isOnboardingComplete) {
          setIsVisible(false);
        }
      } catch (error) {
        console.error('Failed to check Stripe status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStripeStatus();
  }, [user]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('stripe-banner-dismissed', 'true');
  };

  // Don't show if loading, user not logged in, already connected, or dismissed
  if (isLoading || !user || !isVisible || stripeStatus?.isOnboardingComplete) {
    return null;
  }

  // Check if previously dismissed
  if (isDismissible && localStorage.getItem('stripe-banner-dismissed')) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative bg-black border border-white/20 p-6 mb-6 overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          background: '#191b1f',
        }} />
      </div>

      {/* Dismiss Button */}
      {isDismissible && (
        <motion.button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-none text-gray-400 hover:text-white hover:bg-white/10 transition-colors duration-200"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-4 h-4" />
        </motion.button>
      )}

      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/10">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
            <h3 className="text-xl font-bold text-white">
              Connect Stripe to Start Selling
            </h3>
          </div>
          
          <p className="text-gray-300 mb-4 max-w-2xl">
            Securely receive payments for your projects with Stripe. Fast payouts, industry-leading security, 
            and automatic tax handling - all built into SideBuilds.
          </p>

          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center gap-2 text-sm text-green-400">
              <Shield className="w-4 h-4" />
              <span>Bank-level security</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-400">
              <Zap className="w-4 h-4" />
              <span>Instant payouts</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white">
              <CreditCard className="w-4 h-4" />
              <span>Global payments</span>
            </div>
          </div>
        </div>

        <motion.button
          onClick={onConnectClick}
          className="px-6 py-3 bg-white text-black font-bold uppercase flex items-center gap-2 hover:bg-gray-200 transition-all duration-200"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>Connect Stripe</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default StripeConnectBanner; 
