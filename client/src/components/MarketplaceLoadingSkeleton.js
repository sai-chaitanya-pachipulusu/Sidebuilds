import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

// Individual project card skeleton
const ProjectCardSkeleton = memo(() => {
  return (
    <motion.div
      initial={{ opacity: 0.7 }}
      animate={{ opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-none p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-6 bg-gray-800 rounded-none w-48 animate-pulse" />
            <div className="h-4 bg-gray-800 rounded-none w-12 animate-pulse" />
          </div>
          <div className="h-4 bg-gray-800 rounded-none w-32 animate-pulse" />
        </div>
        <div className="text-right space-y-1">
          <div className="h-8 bg-gray-800 rounded-none w-20 animate-pulse" />
          <div className="h-3 bg-gray-800 rounded-none w-16 animate-pulse" />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-800 rounded-none w-full animate-pulse" />
        <div className="h-4 bg-gray-800 rounded-none w-3/4 animate-pulse" />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 py-3 bg-gray-800/30 rounded-none">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center space-y-2">
            <div className="h-5 bg-gray-800 rounded-none w-16 mx-auto animate-pulse" />
            <div className="h-3 bg-gray-800 rounded-none w-12 mx-auto animate-pulse" />
          </div>
        ))}
      </div>

      {/* Tech stack */}
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-6 bg-gray-800 rounded-none w-16 animate-pulse" />
        ))}
      </div>

      {/* Financial info */}
      <div className="bg-gray-800/20 rounded-none p-3 space-y-2">
        <div className="flex justify-between">
          <div className="h-4 bg-gray-800 rounded-none w-20 animate-pulse" />
          <div className="h-4 bg-gray-800 rounded-none w-24 animate-pulse" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 bg-gray-800 rounded-none w-16 animate-pulse" />
          <div className="h-4 bg-gray-800 rounded-none w-20 animate-pulse" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-2 pt-4 border-t border-gray-800">
        <div className="h-10 bg-gray-800 rounded-none w-full animate-pulse" />
        <div className="flex gap-2">
          <div className="h-10 bg-gray-800 rounded-none flex-1 animate-pulse" />
          <div className="h-10 bg-gray-800 rounded-none flex-1 animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
});

// List view skeleton
const ProjectListSkeleton = memo(() => {
  return (
    <motion.div
      initial={{ opacity: 0.7 }}
      animate={{ opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-none p-6"
    >
      <div className="flex items-center gap-6">
        {/* Project info */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-6 bg-gray-800 rounded-none w-64 animate-pulse" />
            <div className="h-4 bg-gray-800 rounded-none w-16 animate-pulse" />
            <div className="h-4 bg-gray-800 rounded-none w-12 animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-800 rounded-none w-full animate-pulse" />
            <div className="h-4 bg-gray-800 rounded-none w-2/3 animate-pulse" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-5 bg-gray-800 rounded-none w-12 animate-pulse" />
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div className="flex gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center space-y-1">
              <div className="h-5 bg-gray-800 rounded-none w-16 animate-pulse" />
              <div className="h-3 bg-gray-800 rounded-none w-12 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Price and actions */}
        <div className="text-right space-y-3">
          <div className="space-y-1">
            <div className="h-8 bg-gray-800 rounded-none w-24 animate-pulse" />
            <div className="h-3 bg-gray-800 rounded-none w-16 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 bg-gray-800 rounded-none w-20 animate-pulse" />
            <div className="h-9 bg-gray-800 rounded-none w-24 animate-pulse" />
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// Production-ready skeleton components for marketplace loading states
const MarketplaceLoadingSkeleton = memo(({ count = 9, viewMode = 'grid' }) => {
  // Memoize skeleton items to prevent re-creation on every render
  const skeletonItems = useMemo(() => 
    Array.from({ length: count }, (_, i) => i), 
    [count]
  );

  // Grid skeleton (default)
  if (viewMode === 'grid') {
    return (
      <div className="space-y-8">
        {/* Hero skeleton */}
        <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-black border-b border-gray-800 p-16">
          <div className="max-w-7xl mx-auto text-center space-y-6">
            <div className="h-4 bg-gray-800 rounded-none w-64 mx-auto animate-pulse" />
            <div className="h-16 bg-gray-800 rounded-none w-96 mx-auto animate-pulse" />
            <div className="h-6 bg-gray-800 rounded-none w-80 mx-auto animate-pulse" />
            <div className="flex justify-center gap-8 pt-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <div className="h-8 bg-gray-800 rounded-none w-16 mx-auto mb-2 animate-pulse" />
                  <div className="h-4 bg-gray-800 rounded w-20 mx-auto animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search and filters skeleton */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="sticky top-16 z-40 bg-black/90 backdrop-blur-xl border-b border-gray-800 py-6 space-y-6">
            {/* Search bar skeleton */}
            <div className="max-w-2xl mx-auto">
              <div className="h-16 bg-gray-800 rounded-none animate-pulse" />
            </div>

            {/* Tabs skeleton */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-gray-800 rounded-none w-24 animate-pulse" />
                ))}
              </div>
              <div className="flex gap-3">
                <div className="h-10 bg-gray-800 rounded-none w-20 animate-pulse" />
                <div className="h-10 bg-gray-800 rounded-none w-32 animate-pulse" />
                <div className="h-10 bg-gray-800 rounded-none w-24 animate-pulse" />
              </div>
            </div>

            {/* Category pills skeleton */}
            <div className="flex gap-2 overflow-x-auto">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="h-8 bg-gray-800 rounded-none w-20 animate-pulse flex-shrink-0" />
              ))}
            </div>
          </div>

          {/* Projects grid skeleton */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skeletonItems.map((index) => (
              <ProjectCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // List skeleton
  return (
    <div className="space-y-4">
      {skeletonItems.map((index) => (
        <ProjectListSkeleton key={index} />
      ))}
    </div>
  );
});

// Search loading skeleton
export const SearchLoadingSkeleton = memo(() => {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-5 h-5 border-2 border-white border-t-transparent"
        />
        <span className="text-gray-400">Searching projects...</span>
      </div>
    </div>
  );
});

// Performance metrics skeleton
export const MetricsSkeleton = memo(() => {
  return (
    <div className="flex items-center gap-4 text-xs text-gray-500">
      <div className="flex items-center gap-1">
        <div className="h-3 bg-gray-800 rounded w-8 animate-pulse" />
        <span>items</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="h-3 bg-gray-800 rounded w-12 animate-pulse" />
        <span>search time</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="h-3 bg-gray-800 rounded w-6 animate-pulse" />
        <span>cache hits</span>
      </div>
    </div>
  );
});

// Load more button skeleton
export const LoadMoreSkeleton = memo(() => {
  return (
    <div className="flex justify-center py-8">
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="h-12 bg-gray-800 rounded-none w-40 animate-pulse"
      />
    </div>
  );
});

export default MarketplaceLoadingSkeleton;
