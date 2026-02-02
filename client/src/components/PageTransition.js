import React from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const PageTransition = ({ children, className = '' }) => {
  const location = useLocation();
  
  // Custom page variants based on route
  const getPageVariants = () => {
    const path = location.pathname;
    
    // Different animations for different routes
    if (path === '/') {
      return {
        initial: { opacity: 0, scale: 0.95 },
        in: { opacity: 1, scale: 1 },
        out: { opacity: 0, scale: 1.05 }
      };
    } else if (path.includes('/marketplace')) {
      return {
        initial: { opacity: 0, x: -50 },
        in: { opacity: 1, x: 0 },
        out: { opacity: 0, x: 50 }
      };
    } else if (path.includes('/projects')) {
      return {
        initial: { opacity: 0, y: 20, rotateX: -15 },
        in: { opacity: 1, y: 0, rotateX: 0 },
        out: { opacity: 0, y: -20, rotateX: 15 }
      };
    }
    
    // Default animation
    return {
      initial: { opacity: 0, y: 20 },
      in: { opacity: 1, y: 0 },
      out: { opacity: 0, y: -20 }
    };
  };

  const pageVariants = getPageVariants();

  const pageTransition = {
    type: 'tween',
    ease: [0.43, 0.13, 0.23, 0.96],
    duration: 0.5
  };

  return (
    <>
      {/* Page transition wrapper */}
      <motion.div
        key={location.pathname}
        className={`relative ${className}`}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        style={{ 
          position: 'relative',
          width: '100%',
          minHeight: '100vh'
        }}
      >
        {children}
      </motion.div>

      {/* Route transition indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-white z-50"
        initial={{ scaleX: 0, transformOrigin: 'left' }}
        animate={{ scaleX: 1 }}
        exit={{ scaleX: 0, transformOrigin: 'right' }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
    </>
  );
};

export default PageTransition;


/*
// PageTransition.js - Smooth page transitions with multiple effects
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 0.98,
  },
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4,
};

const PageTransition = ({ children, mode = 'fade' }) => {
  const location = useLocation();

  const variants = {
    fade: pageVariants,
    slide: {
      initial: { opacity: 0, x: -100 },
      in: { opacity: 1, x: 0 },
      out: { opacity: 0, x: 100 },
    },
    scale: {
      initial: { opacity: 0, scale: 0.8 },
      in: { opacity: 1, scale: 1 },
      out: { opacity: 0, scale: 1.2 },
    },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={variants[mode]}
        transition={pageTransition}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;

*/

/*
import React from 'react';
import { motion } from 'framer-motion';

const pageVariants = {
  initial: {
    opacity: 0,
    // x: '-100vw', // Example: slide in from left
  },
  in: {
    opacity: 1,
    // x: 0,
  },
  out: {
    opacity: 0,
    // x: '100vw', // Example: slide out to right
  }
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4 // Adjust duration as needed
};

const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      style={{ position: 'relative' }} // Important if pages have different heights or absolute elements
    >
      {children}
    </motion.div>
  );
};

export default PageTransition; 

*/
