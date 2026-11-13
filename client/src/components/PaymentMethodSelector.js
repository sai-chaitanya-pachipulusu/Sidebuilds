import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, CreditCard, Lock, Shield } from 'lucide-react';

// SideBuilds currently processes marketplace purchases through Stripe Checkout.
// Keep this component controlled by its parent so selecting a method and
// submitting payment are one predictable workflow (and never advertise payment
// providers that the server does not implement).
const PaymentMethodSelector = ({
  selectedMethod,
  onMethodSelect,
  amount,
  currency = 'USD',
  className = ''
}) => {
  useEffect(() => {
    if (!selectedMethod) onMethodSelect?.('stripe');
  }, [selectedMethod, onMethodSelect]);

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(Number(amount) || 0);

  const isSelected = selectedMethod === 'stripe';

  return (
    <div className={`bg-gray-900/50 border border-white/[0.08] p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-5 h-5 text-green-400" />
        <h3 className="text-xl font-bold text-white">Secure payment</h3>
      </div>
      <p className="text-gray-400 mb-5">Card, Apple Pay, or Google Pay through Stripe Checkout.</p>

      <motion.button
        type="button"
        onClick={() => onMethodSelect?.('stripe')}
        className={`w-full text-left p-4 border-2 transition-colors ${
          isSelected ? 'border-white bg-white/10' : 'border-white/20 hover:border-white/40'
        }`}
        whileTap={{ scale: 0.99 }}
        aria-pressed={isSelected}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white text-black">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="text-white font-semibold">Stripe</div>
              <div className="text-sm text-gray-400">One-time payment of {formattedAmount}</div>
            </div>
          </div>
          {isSelected && <CheckCircle className="w-5 h-5 text-green-400" />}
        </div>
      </motion.button>

      <div className="mt-4 flex items-start gap-3 bg-green-500/10 border border-green-500/20 p-4">
        <Shield className="w-5 h-5 text-green-400 mt-0.5" />
        <p className="text-sm text-gray-300">
          Payment is handled on Stripe's hosted checkout. SideBuilds never stores your card details.
        </p>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
