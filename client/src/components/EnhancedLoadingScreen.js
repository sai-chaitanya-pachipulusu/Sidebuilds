// EnhancedLoadingScreen.js - Modern loading experience
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EnhancedLoadingScreen = ({ 
  message = "Loading...", 
  progress = null, 
  showProgress = false,
  variant = "default" // default, minimal, dots, pulse
}) => {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  // Different loading variants
  const variants = {
    default: (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <motion.div
          className="relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Spinning ring */}
          <motion.div
            className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Inner pulse */}
          <motion.div
            className="absolute inset-2 bg-purple-500/20 rounded-full"
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
        
        <motion.div
          className="mt-8 text-center"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-xl font-semibold text-white mb-2">
            {message}{dots}
          </h3>
          
          {showProgress && progress !== null && (
            <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
          
          <p className="text-gray-400 text-sm mt-2">
            Please wait while we prepare your experience
          </p>
        </motion.div>
      </div>
    ),
    
    minimal: (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <motion.div
          className="flex space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-purple-500 rounded-full"
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </motion.div>
      </div>
    ),
    
    dots: (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <motion.div
          className="text-4xl font-bold text-purple-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
          >
            •
          </motion.span>
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
          >
            •
          </motion.span>
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
          >
            •
          </motion.span>
        </motion.div>
      </div>
    ),
    
    pulse: (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <motion.div
          className="w-20 h-20 bg-purple-500 rounded-full"
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.7, 0.3, 0.7]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
    )
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {variants[variant]}
      </motion.div>
    </AnimatePresence>
  );
};

export default EnhancedLoadingScreen; 