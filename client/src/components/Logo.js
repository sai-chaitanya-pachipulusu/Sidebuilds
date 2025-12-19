import React from 'react';

// Building Blocks Logo SVG - Used globally across the app
const Logo = ({ size = 32, className = '' }) => {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
        {/* Bottom left block */}
        <rect x="2" y="18" width="12" height="12" rx="2" fill="url(#logoGradient)" opacity="0.7" />
        {/* Bottom right block */}
        <rect x="18" y="18" width="12" height="12" rx="2" fill="url(#logoGradient)" opacity="0.85" />
        {/* Top center block */}
        <rect x="10" y="4" width="12" height="12" rx="2" fill="url(#logoGradient)" />
      </svg>
    </div>
  );
};

export default Logo;
