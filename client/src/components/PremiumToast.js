import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, X, Info, AlertCircle } from 'lucide-react';

const PremiumToast = ({ 
  message, 
  type = 'info', 
  isVisible, 
  onClose, 
  duration = 5000 
}) => {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  };

  const colors = {
    success: {
      bg: 'bg-green-900/90',
      border: 'border-green-500/30',
      icon: 'text-green-400',
      text: 'text-green-100'
    },
    error: {
      bg: 'bg-red-900/90',
      border: 'border-red-500/30',
      icon: 'text-red-400',
      text: 'text-red-100'
    },
    warning: {
      bg: 'bg-yellow-900/90',
      border: 'border-yellow-500/30',
      icon: 'text-yellow-400',
      text: 'text-yellow-100'
    },
    info: {
      bg: 'bg-blue-900/90',
      border: 'border-blue-500/30',
      icon: 'text-blue-400',
      text: 'text-blue-100'
    }
  };

  const Icon = icons[type];
  const colorScheme = colors[type];

  React.useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          className={`
            fixed top-4 right-4 z-50 max-w-sm w-full
            ${colorScheme.bg} ${colorScheme.border} ${colorScheme.text}
            border backdrop-blur-lg rounded-none shadow-2xl
            flex items-start gap-3 p-4
          `}
        >
          <Icon className={`w-5 h-5 ${colorScheme.icon} flex-shrink-0 mt-0.5`} />
          <p className="flex-1 text-sm font-medium">{message}</p>
          <motion.button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-4 h-4" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PremiumToast; 
