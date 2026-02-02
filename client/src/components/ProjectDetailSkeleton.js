import React from 'react';
import { motion } from 'framer-motion';

// Production-ready skeleton for project detail page
const ProjectDetailSkeleton = () => {
  return (
    <div className="min-h-screen bg-black">
      {/* Back Button Skeleton */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <div className="h-6 bg-gray-800 rounded-none w-16 animate-pulse mb-6" />
      </div>

      {/* Hero Section Skeleton */}
      <motion.div
        initial={{ opacity: 0.7 }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <div className="max-w-7xl mx-auto px-4 pb-8">
          <div className="relative h-[60vh] rounded-none overflow-hidden bg-gray-800 animate-pulse">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Project Info Overlay Skeleton */}
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="flex items-end justify-between">
                <div className="flex-1 space-y-4">
                  {/* Badges */}
                  <div className="flex items-center gap-3">
                    <div className="h-6 bg-gray-700 rounded-none w-20 animate-pulse" />
                    <div className="h-6 bg-gray-700 rounded-none w-24 animate-pulse" />
                  </div>
                  
                  {/* Title */}
                  <div className="h-12 bg-gray-700 rounded-none w-96 animate-pulse" />
                  
                  {/* Creator */}
                  <div className="h-6 bg-gray-700 rounded-none w-48 animate-pulse" />
                  
                  {/* Quick Stats */}
                  <div className="flex items-center gap-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="h-4 bg-gray-700 rounded-none w-4 animate-pulse" />
                        <div className="h-4 bg-gray-700 rounded-none w-16 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <div className="h-12 bg-gray-700 rounded-none w-12 animate-pulse" />
                  <div className="h-12 bg-gray-700 rounded-none w-12 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Content Section Skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Navigation Tabs Skeleton */}
            <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-none">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-1 px-4 py-3 rounded-none">
                  <div className="h-6 bg-gray-800 rounded-none w-full animate-pulse" />
                </div>
              ))}
            </div>

            {/* Tab Content Skeleton */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-8">
              <div className="space-y-6">
                {/* Title */}
                <div className="h-8 bg-gray-800 rounded-none w-64 animate-pulse" />
                
                {/* Content blocks */}
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-4 bg-gray-800 rounded-none w-full animate-pulse" style={{
                      width: `${Math.random() * 40 + 60}%`
                    }} />
                  ))}
                </div>
                
                {/* Feature list skeleton */}
                <div className="space-y-4">
                  <div className="h-6 bg-gray-800 rounded-none w-32 animate-pulse" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="h-5 bg-gray-800 rounded-none w-5 animate-pulse" />
                        <div className="h-4 bg-gray-800 rounded-none w-32 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="space-y-6">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-6 sticky top-8">
              <div className="h-6 bg-gray-800 rounded-none w-32 animate-pulse mb-6" />
              
              {/* Price Section */}
              <div className="bg-gray-800/30 rounded-none p-4 mb-6">
                <div className="text-center space-y-2">
                  <div className="h-10 bg-gray-800 rounded-none w-32 mx-auto animate-pulse" />
                  <div className="h-4 bg-gray-800 rounded-none w-24 mx-auto animate-pulse" />
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-4 mb-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-4 bg-gray-800 rounded-none w-4 animate-pulse" />
                      <div className="h-4 bg-gray-800 rounded-none w-24 animate-pulse" />
                    </div>
                    <div className="h-4 bg-gray-800 rounded-none w-16 animate-pulse" />
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <div className="h-12 bg-gray-800 rounded-none w-full animate-pulse" />
                <div className="h-12 bg-gray-800 rounded-none w-full animate-pulse" />
                
                {/* External Links */}
                <div className="flex gap-3">
                  <div className="h-12 bg-gray-800 rounded-none flex-1 animate-pulse" />
                  <div className="h-12 bg-gray-800 rounded-none flex-1 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Payment processing skeleton
export const PaymentProcessingSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50"
    >
      <div className="bg-gray-900 border border-white/[0.12] rounded-none p-8 max-w-md w-full text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-white border-t-transparent mx-auto mb-4"
        />
        <h3 className="text-xl font-semibold text-white mb-2">Processing Payment</h3>
        <p className="text-gray-400">Please wait while we create your secure checkout session...</p>
        <div className="mt-6 space-y-2">
          <div className="h-2 bg-gray-800 rounded-none overflow-hidden">
            <motion.div
              className="h-full bg-white"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <p className="text-xs text-gray-500">Securing your transaction...</p>
        </div>
      </div>
    </motion.div>
  );
};

// Interest modal skeleton
export const InterestModalSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50"
    >
      <div className="bg-gray-900 border border-white/[0.12] rounded-none p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-800 rounded-none w-64 animate-pulse" />
            <div className="h-8 bg-gray-800 rounded-none w-8 animate-pulse" />
          </div>

          {/* Description */}
          <div className="h-4 bg-gray-800 rounded-none w-full animate-pulse" />

          {/* Message area */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-800 rounded-none w-32 animate-pulse" />
            <div className="h-32 bg-gray-800 rounded-none w-full animate-pulse" />
          </div>

          {/* Commitments */}
          <div className="space-y-4">
            <div className="h-4 bg-gray-800 rounded-none w-40 animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-4 bg-gray-800 rounded-none w-4 animate-pulse mt-1" />
                  <div className="h-4 bg-gray-800 rounded-none w-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <div className="h-12 bg-gray-800 rounded-none flex-1 animate-pulse" />
            <div className="h-12 bg-gray-800 rounded-none flex-1 animate-pulse" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectDetailSkeleton;
