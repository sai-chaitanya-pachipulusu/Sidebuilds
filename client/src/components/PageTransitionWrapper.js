import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const PageTransitionWrapper = ({ 
  children, 
  mode = 'fade',
  duration = 0.5,
  className = '' 
}) => {
  const location = useLocation();

  // Different transition modes
  const transitions = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    },
    slideUp: {
      initial: { opacity: 0, y: 50 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -50 }
    },
    slideRight: {
      initial: { opacity: 0, x: -100 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 100 }
    },
    scale: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 1.1 }
    },
    rotate: {
      initial: { opacity: 0, rotate: -10, scale: 0.9 },
      animate: { opacity: 1, rotate: 0, scale: 1 },
      exit: { opacity: 0, rotate: 10, scale: 0.9 }
    },
    blur: {
      initial: { opacity: 0, filter: 'blur(10px)' },
      animate: { opacity: 1, filter: 'blur(0px)' },
      exit: { opacity: 0, filter: 'blur(10px)' }
    }
  };

  const currentTransition = transitions[mode] || transitions.fade;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className={`min-h-screen ${className}`}
        initial={currentTransition.initial}
        animate={currentTransition.animate}
        exit={currentTransition.exit}
        transition={{
          duration,
          ease: [0.43, 0.13, 0.23, 0.96] // Custom easing
        }}
      >
        {/* Background gradient animation */}
        <motion.div
          className="fixed inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration * 1.5 }}
        >
          <div className="absolute inset-0 bg-black/20   " />
        </motion.div>

        {/* Page content */}
        <div className="relative z-10">
          {children}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransitionWrapper;
