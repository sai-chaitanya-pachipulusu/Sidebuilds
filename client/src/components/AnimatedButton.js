// AnimatedButton.js - Modern animated button with multiple variants
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

const AnimatedButton = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  className,
  onClick,
  ...props
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700',
    secondary: 'bg-white/10 text-white border border-white/20 hover:bg-white/20',
    ghost: 'text-gray-300 hover:text-white hover:bg-white/10',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <motion.button
      className={cn(
        'relative inline-flex items-center justify-center font-medium rounded-full transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      whileHover={!disabled ? { scale: 1.05, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {/* Loading spinner */}
      {loading && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className={cn('animate-spin rounded-full border-2 border-white/30 border-t-white', iconSizes[size])} />
        </motion.div>
      )}

      {/* Button content */}
      <motion.div
        className={cn('flex items-center space-x-2', loading && 'opacity-0')}
        animate={loading ? { opacity: 0 } : { opacity: 1 }}
      >
        {Icon && iconPosition === 'left' && <Icon className={iconSizes[size]} />}
        <span>{children}</span>
        {Icon && iconPosition === 'right' && <Icon className={iconSizes[size]} />}
      </motion.div>

      {/* Hover effect overlay */}
      <motion.div
        className="absolute inset-0 rounded-full bg-white/0 hover:bg-white/10 transition-colors duration-200"
        initial={false}
      />

      {/* Ripple effect on click */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden"
        initial={false}
      >
        <motion.div
          className="absolute inset-0 bg-white/20"
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{ transformOrigin: 'center' }}
        />
      </motion.div>
    </motion.button>
  );
};

export default AnimatedButton;