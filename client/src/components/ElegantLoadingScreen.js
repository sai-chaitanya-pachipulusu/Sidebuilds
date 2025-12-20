import React from 'react';
import Logo from './Logo';

const ElegantLoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Logo size={48} />
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

export default ElegantLoadingScreen;