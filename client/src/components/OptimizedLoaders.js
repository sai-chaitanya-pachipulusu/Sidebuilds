// OptimizedLoaders.js - Performance-optimized loading components
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// Lightweight spinner component
export const FastSpinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <div className={`${sizes[size]} ${className}`}>
      <div className="w-full h-full border-2 border-gray-600 border-t-purple-500 rounded-full animate-spin" />
    </div>
  );
};

// Optimized loading screen with minimal animations
export const FastLoadingScreen = ({ message = "Loading..." }) => {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(intervalRef.current);
          return 100;
        }
        return prev + Math.random() * 10 + 5;
      });
    }, 200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="text-center space-y-4">
        <FastSpinner size="lg" />
        <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-gray-400 text-sm">{message}</p>
        <p className="text-xs text-gray-500 font-mono">{Math.round(progress)}%</p>
      </div>
    </div>
  );
};

// Minimal page loader
export const FastPageLoader = ({ text = "Loading..." }) => {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="text-center space-y-3">
        <FastSpinner />
        <p className="text-gray-400 text-sm">{text}</p>
      </div>
    </div>
  );
};

// CSS-only animated dots (no JavaScript)
export const CSSAnimatedDots = () => (
  <div className="inline-flex space-x-1">
    {[0, 1, 2].map(i => (
      <div
        key={i}
        className="w-1 h-1 bg-gray-400 rounded-full animate-pulse"
        style={{ animationDelay: `${i * 0.2}s` }}
      />
    ))}
  </div>
);

export default {
  FastSpinner,
  FastLoadingScreen,
  FastPageLoader,
  CSSAnimatedDots
}; 