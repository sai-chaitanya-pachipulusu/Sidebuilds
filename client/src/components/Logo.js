import React from 'react';

// Brutalist Logo - Simple geometric blocks, monochrome
const Logo = ({ size = 32, className = '' }) => {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Bottom left block */}
        <rect x="2" y="18" width="12" height="12" fill="white" opacity="0.6" />
        {/* Bottom right block */}
        <rect x="18" y="18" width="12" height="12" fill="white" opacity="0.8" />
        {/* Top center block */}
        <rect x="10" y="4" width="12" height="12" fill="white" />
      </svg>
    </div>
  );
};

export default Logo;
