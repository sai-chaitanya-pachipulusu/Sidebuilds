import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const PremiumModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  hideCloseButton = false 
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Opaque Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className={`relative w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden`}
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Box */}
          <div className="bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl">
            {/* Header */}
            {(title || !hideCloseButton) && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
                {title && (
                  <h2 className="text-xl font-semibold text-white">{title}</h2>
                )}
                {!hideCloseButton && (
                  <motion.button
                    onClick={onClose}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                )}
              </div>
            )}
            
            {/* Content */}
            <div className="px-6 py-6 max-h-[calc(90vh-8rem)] overflow-y-auto">
              {children}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PremiumModal; 