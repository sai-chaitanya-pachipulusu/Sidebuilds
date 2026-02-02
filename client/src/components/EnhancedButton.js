// EnhancedButton.js - Modern button component with animations
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const EnhancedButton = ({ 
  children, 
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  onClick,
  className = '',
  ...props 
}) => {
  // Button variants - brutalist monochrome
  const variants = {
    primary: 'bg-white hover:bg-gray-200 text-black border-2 border-white',
    secondary: 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-gray-500',
    outline: 'bg-transparent hover:bg-white/10 text-white border-2 border-white/50 hover:border-white',
    ghost: 'bg-transparent hover:bg-white/5 text-gray-300 hover:text-white border-transparent',
    danger: 'bg-white hover:bg-gray-200 text-black border-2 border-white',
    success: 'bg-white hover:bg-gray-200 text-black border-2 border-white'
  };

  // Button sizes
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  };

  const baseClasses = `
    relative inline-flex items-center justify-center
    font-bold uppercase tracking-wider rounded-none
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black
    disabled:opacity-50 disabled:cursor-not-allowed
    ${variants[variant]}
    ${sizes[size]}
    ${className}
  `;

  return (
    <motion.button
      className={baseClasses}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15 }}
      {...props}
    >
      {/* Loading spinner */}
      {loading && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Loader2 className="w-5 h-5 animate-spin" />
        </motion.div>
      )}
      
      {/* Button content */}
      <motion.div
        className={`flex items-center gap-2 ${loading ? 'opacity-0' : 'opacity-100'}`}
        transition={{ duration: 0.2 }}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
      </motion.div>
      
      {/* Hover effect overlay */}
      <motion.div
        className="absolute inset-0 bg-white/10 rounded-none opacity-0 pointer-events-none"
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
    </motion.button>
  );
};

export default EnhancedButton; 
