import React from 'react';

export const SkeletonCard = () => (
  <div className="animate-pulse">
    <div className="rounded-2xl bg-gray-200/20 h-64 w-full">
      <div className="p-6 space-y-4">
        <div className="h-4 bg-gray-300/30 rounded-lg w-3/4"></div>
        <div className="h-3 bg-gray-300/20 rounded w-1/2"></div>
        <div className="h-3 bg-gray-300/20 rounded w-2/3"></div>
      </div>
    </div>
  </div>
);

export const LoadingSpinner = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  return (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500`} />
  );
}; 