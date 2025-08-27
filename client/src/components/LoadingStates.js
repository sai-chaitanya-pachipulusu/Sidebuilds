import React from 'react';

// Enhanced Project Card Skeleton
export const SkeletonCard = () => (
  <div className="animate-pulse bg-gray-900/50 rounded-2xl p-6 space-y-4 border border-gray-700/30">
    <div className="h-4 bg-gray-700/50 rounded-lg w-3/4"></div>
    <div className="h-3 bg-gray-700/30 rounded w-1/2"></div>
    <div className="h-3 bg-gray-700/30 rounded w-2/3"></div>
    <div className="flex justify-between items-center mt-4">
      <div className="h-6 bg-purple-500/20 rounded-full w-16"></div>
      <div className="h-8 bg-gray-700/40 rounded-lg w-20"></div>
    </div>
  </div>
);

// Marketplace Grid Skeleton
export const MarketplaceSkeletonGrid = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

// Dashboard Skeleton
export const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse bg-gray-900/50 rounded-xl p-6 border border-gray-700/30">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-4 bg-gray-700/40 rounded w-24"></div>
              <div className="h-8 bg-gray-600/60 rounded w-16"></div>
            </div>
            <div className="w-8 h-8 bg-purple-500/20 rounded"></div>
          </div>
        </div>
      ))}
    </div>
    
    {/* Content Area */}
    <div className="space-y-4">
      <div className="h-6 bg-gray-700/50 rounded w-48"></div>
      <MarketplaceSkeletonGrid count={4} />
    </div>
  </div>
);

// Enhanced Loading Spinner
export const LoadingSpinner = ({ size = 'md', color = 'purple' }) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };
  
  const colorClasses = {
    purple: 'border-purple-500/30 border-t-purple-500',
    blue: 'border-blue-500/30 border-t-blue-500',
    green: 'border-green-500/30 border-t-green-500',
    red: 'border-red-500/30 border-t-red-500'
  };
  
  return (
    <div className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin rounded-full border-2`} />
  );
};

// Centered Loading State
export const CenteredLoading = ({ message = "Loading...", size = 'lg' }) => (
  <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
    <LoadingSpinner size={size} />
    <p className="text-gray-400 text-sm">{message}</p>
  </div>
);

// Payment Processing Loading
export const PaymentProcessingLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-96 space-y-6">
    <div className="relative">
      <LoadingSpinner size="xl" color="green" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 bg-green-500/20 rounded-full animate-pulse"></div>
      </div>
    </div>
    <div className="text-center space-y-2">
      <h3 className="text-lg font-semibold text-white">Processing Payment</h3>
      <p className="text-gray-400 text-sm max-w-sm">
        Please don't close this window. We're securely processing your payment.
      </p>
    </div>
  </div>
);

// Profile Loading Skeleton
export const ProfileSkeleton = () => (
  <div className="animate-pulse space-y-6">
    {/* Header */}
    <div className="flex items-start space-x-6">
      <div className="w-24 h-24 bg-gray-700/50 rounded-full"></div>
      <div className="flex-1 space-y-3">
        <div className="h-6 bg-gray-700/60 rounded w-48"></div>
        <div className="h-4 bg-gray-700/40 rounded w-32"></div>
        <div className="h-4 bg-gray-700/30 rounded w-64"></div>
      </div>
    </div>
    
    {/* Stats */}
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="text-center space-y-2">
          <div className="h-6 bg-gray-700/50 rounded w-12 mx-auto"></div>
          <div className="h-4 bg-gray-700/30 rounded w-20 mx-auto"></div>
        </div>
      ))}
    </div>
    
    {/* Projects */}
    <div className="space-y-4">
      <div className="h-5 bg-gray-700/50 rounded w-32"></div>
      <MarketplaceSkeletonGrid count={3} />
    </div>
  </div>
);

// Table Loading Skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="animate-pulse">
    {/* Header */}
    <div className="grid gap-4 p-4 border-b border-gray-700/30" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-700/50 rounded w-20"></div>
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid gap-4 p-4 border-b border-gray-800/30" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div key={colIndex} className="h-4 bg-gray-700/30 rounded" style={{ width: `${60 + Math.random() * 40}%` }}></div>
        ))}
      </div>
    ))}
  </div>
);

// Notification Loading
export const NotificationSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="animate-pulse flex items-start space-x-3 p-4 bg-gray-900/30 rounded-lg border border-gray-700/20">
        <div className="w-2 h-2 bg-purple-500/40 rounded-full mt-2"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
          <div className="h-3 bg-gray-700/30 rounded w-1/2"></div>
        </div>
        <div className="h-3 bg-gray-700/30 rounded w-12"></div>
      </div>
    ))}
  </div>
);

// Inline Loading Button
export const LoadingButton = ({ children, loading = false, disabled = false, className = '', ...props }) => (
  <button 
    {...props}
    disabled={disabled || loading}
    className={`relative ${className} ${(disabled || loading) ? 'opacity-75 cursor-not-allowed' : ''}`}
  >
    {loading && (
      <div className="absolute inset-0 flex items-center justify-center">
        <LoadingSpinner size="sm" />
      </div>
    )}
    <span className={loading ? 'opacity-0' : 'opacity-100'}>
      {children}
    </span>
  </button>
); 