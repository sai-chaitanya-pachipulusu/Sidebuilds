// EnhancedToast.js - Modern toast notifications
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

const EnhancedToast = ({ 
  message, 
  type = 'info',
  duration = 5000,
  isVisible,
  onClose,
  position = 'top-right'
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Auto dismiss
  useEffect(() => {
    if (!isVisible || isHovered) return;
    
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [isVisible, duration, onClose, isHovered]);

  // Toast types configuration
  const types = {
    success: {
      icon: CheckCircle,
      colors: 'bg-green-900/90 border-green-500/30 text-green-100',
      iconColor: 'text-green-400'
    },
    error: {
      icon: AlertCircle,
      colors: 'bg-red-900/90 border-red-500/30 text-red-100',
      iconColor: 'text-red-400'
    },
    warning: {
      icon: AlertTriangle,
      colors: 'bg-yellow-900/90 border-yellow-500/30 text-yellow-100',
      iconColor: 'text-yellow-400'
    },
    info: {
      icon: Info,
      colors: 'bg-blue-900/90 border-blue-500/30 text-blue-100',
      iconColor: 'text-blue-400'
    }
  };

  // Position styles
  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  const config = types[type];
  const Icon = config.icon;

  // Animation variants
  const variants = {
    hidden: { 
      opacity: 0, 
      y: position.includes('top') ? -50 : 50,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    },
    exit: {
      opacity: 0,
      y: position.includes('top') ? -20 : 20,
      scale: 0.95,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`fixed z-50 ${positions[position]}`}
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className={`
            flex items-start gap-3 p-4 rounded-none border backdrop-blur-sm
            shadow-lg max-w-md min-w-80
            ${config.colors}
          `}>
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            
            {/* Message */}
            <div className="flex-1 text-sm leading-relaxed">
              {message}
            </div>
            
            {/* Close button */}
            <motion.button
              className="flex-shrink-0 p-1 hover:bg-white/10 rounded-none transition-colors"
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-4 h-4" />
            </motion.button>
            
            {/* Progress bar */}
            {!isHovered && duration > 0 && (
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-white/20 rounded-b-xl"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ 
                  duration: duration / 1000, 
                  ease: "linear" 
                }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Toast manager component
export const ToastContainer = ({ toasts = [], removeToast }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {toasts.map((toast, index) => (
        <motion.div
          key={toast.id}
          className="pointer-events-auto"
          style={{
            position: 'absolute',
            top: `${4 + index * 5}rem`,
            right: '1rem'
          }}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ delay: index * 0.1 }}
        >
          <EnhancedToast
            {...toast}
            isVisible={true}
            onClose={() => removeToast(toast.id)}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default EnhancedToast; 
