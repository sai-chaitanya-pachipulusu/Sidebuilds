import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Activity,
  Clock,
  Target,
  Brain,
  TrendingUp,
  TrendingDown,
  Users,
  Search,
  Zap,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle,
  CheckCircle,
  Hash,
  Calendar,
  Filter,
  Eye,
  MousePointer
} from 'lucide-react';
import { cn } from '../lib/utils';
import MarketplaceService from '../services/marketplace.service';

const SearchAnalyticsPanel = ({ 
  searchMetrics, 
  searchHistory, 
  filteredResults = [], 
  isVisible = true,
  className 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [marketplaceAnalytics, setMarketplaceAnalytics] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load marketplace analytics
  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const [marketplaceData, cachedAnalytics] = await Promise.all([
          MarketplaceService.getSearchAnalytics(),
          MarketplaceService.getCachedAnalytics()
        ]);
        
        setMarketplaceAnalytics(marketplaceData);
        
        if (cachedAnalytics) {
          setPerformanceData(cachedAnalytics.recentSearches || []);
        }
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (expanded) {
      loadAnalytics();
    }
  }, [expanded]);

  // Calculate search performance metrics
  const performanceMetrics = useMemo(() => {
    if (!searchMetrics) return null;

    const efficiency = searchMetrics.cacheHits / Math.max(searchMetrics.cacheHits + searchMetrics.cacheMisses, 1);
    const speed = searchMetrics.searchTime < 100 ? 'Fast' : 
                  searchMetrics.searchTime < 300 ? 'Good' : 'Slow';

    return {
      efficiency: Math.round(efficiency * 100),
      speed,
      accuracy: filteredResults.length > 0 ? 'Good' : 'No Results',
      cachePerformance: searchMetrics.cacheHits > 0 ? 'Active' : 'Cold'
    };
  }, [searchMetrics, filteredResults.length]);

  // Search trends analysis
  const searchTrends = useMemo(() => {
    if (!performanceData.length) return null;

    const recentSearches = performanceData.slice(-10);
    const avgTime = recentSearches.reduce((sum, s) => sum + (s.searchTime || 0), 0) / recentSearches.length;
    const avgResults = recentSearches.reduce((sum, s) => sum + (s.resultCount || 0), 0) / recentSearches.length;

    return {
      averageTime: Math.round(avgTime),
      averageResults: Math.round(avgResults),
      totalSearches: performanceData.length,
      recentTrend: recentSearches.length > 1 ? 
        (recentSearches[recentSearches.length - 1].searchTime > recentSearches[0].searchTime ? 'slower' : 'faster') : 'stable'
    };
  }, [performanceData]);

  // Popular search terms
  const popularTerms = useMemo(() => {
    if (!searchHistory.length) return [];

    const termCounts = {};
    searchHistory.forEach(term => {
      const normalized = term.toLowerCase().trim();
      termCounts[normalized] = (termCounts[normalized] || 0) + 1;
    });

    return Object.entries(termCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([term, count]) => ({ term, count }));
  }, [searchHistory]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("bg-gray-900/50 border border-white/10 rounded-xl overflow-hidden", className)}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/30 transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-white" />
          <span className="font-medium text-gray-200">Search Analytics</span>
          {performanceMetrics && (
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                performanceMetrics.speed === 'Fast' ? 'bg-green-400' :
                performanceMetrics.speed === 'Good' ? 'bg-yellow-400' : 'bg-red-400'
              )} />
              <span className="text-xs text-gray-500">{performanceMetrics.speed}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {searchMetrics && (
            <span className="text-sm text-gray-500">
              {searchMetrics.searchTime?.toFixed(1)}ms
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            <div className="p-4 space-y-6">
              {/* Quick Metrics */}
              {performanceMetrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Activity className="w-4 h-4 text-green-400" />
                      <span className="text-lg font-bold text-white">
                        {performanceMetrics.efficiency}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">Cache Efficiency</div>
                  </div>
                  
                  <div className="text-center p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-lg font-bold text-white">
                        {searchMetrics?.searchTime?.toFixed(0)}ms
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">Response Time</div>
                  </div>
                  
                  <div className="text-center p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Target className="w-4 h-4 text-white" />
                      <span className="text-lg font-bold text-white">
                        {filteredResults.length}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">Results Found</div>
                  </div>
                  
                  <div className="text-center p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Brain className="w-4 h-4 text-gray-300" />
                      <span className="text-lg font-bold text-white">
                        {searchMetrics?.semanticMatches || 0}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">AI Matches</div>
                  </div>
                </div>
              )}

              {/* Performance Breakdown */}
              {searchMetrics && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Performance Breakdown
                  </h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Local Search</span>
                      <span className="text-white font-medium">
                        {searchMetrics.localSearchTime?.toFixed(1) || searchMetrics.searchTime?.toFixed(1)}ms
                      </span>
                    </div>
                    
                    {searchMetrics.backendSearchTime > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Backend Search</span>
                        <span className="text-white font-medium">
                          {searchMetrics.backendSearchTime.toFixed(1)}ms
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Cache Performance</span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">{searchMetrics.cacheHits} hits</span>
                        <span className="text-red-400">{searchMetrics.cacheMisses} misses</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Trends */}
              {searchTrends && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Search Trends
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400 mb-1">Average Response</div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{searchTrends.averageTime}ms</span>
                        {searchTrends.recentTrend === 'faster' ? (
                          <TrendingDown className="w-3 h-3 text-green-400" />
                        ) : searchTrends.recentTrend === 'slower' ? (
                          <TrendingUp className="w-3 h-3 text-red-400" />
                        ) : null}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-gray-400 mb-1">Average Results</div>
                      <div className="text-white font-medium">{searchTrends.averageResults}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Popular Terms */}
              {popularTerms.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Popular Search Terms
                  </h4>
                  
                  <div className="flex flex-wrap gap-2">
                    {popularTerms.map(({ term, count }, index) => (
                      <div
                        key={term}
                        className="px-3 py-1.5 bg-gray-800/50 rounded-full flex items-center gap-2"
                      >
                        <span className="text-sm text-gray-300">{term}</span>
                        <span className="text-xs text-white font-medium">×{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Marketplace Insights */}
              {marketplaceAnalytics && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Marketplace Insights
                  </h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div className="p-2 bg-gray-800/30 rounded">
                      <div className="text-gray-400 mb-1">Total Projects</div>
                      <div className="text-white font-bold">{marketplaceAnalytics.totalProjects}</div>
                    </div>
                    
                    <div className="p-2 bg-gray-800/30 rounded">
                      <div className="text-gray-400 mb-1">New This Week</div>
                      <div className="text-green-400 font-bold">{marketplaceAnalytics.trends?.newThisWeek || 0}</div>
                    </div>
                    
                    <div className="p-2 bg-gray-800/30 rounded">
                      <div className="text-gray-400 mb-1">Avg Price</div>
                      <div className="text-blue-400 font-bold">
                        ${(marketplaceAnalytics.trends?.avgPrice || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Category Distribution */}
                  {marketplaceAnalytics.categories && (
                    <div className="mt-4">
                      <div className="text-xs text-gray-500 mb-2">Category Distribution</div>
                      <div className="space-y-1">
                        {Object.entries(marketplaceAnalytics.categories)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 5)
                          .map(([category, count]) => {
                            const percentage = Math.round((count / marketplaceAnalytics.totalProjects) * 100);
                            return (
                              <div key={category} className="flex items-center justify-between text-xs">
                                <span className="text-gray-400 capitalize">{category}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gray-400 rounded-full"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-white w-8 text-right">{count}</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Performance Tips */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-300">
                    <div className="font-medium mb-1">Search Performance Tips:</div>
                    <ul className="list-disc list-inside space-y-0.5 text-blue-300/80">
                      <li>Use specific keywords for better results</li>
                      <li>Try technology names (e.g., "React", "Node.js")</li>
                      <li>Filter by category to narrow results</li>
                      {searchMetrics?.backendSearchTime > 0 && (
                        <li>Backend search provides more comprehensive results</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {loading && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/40"></div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SearchAnalyticsPanel;
