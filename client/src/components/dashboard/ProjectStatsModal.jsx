import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, TrendingUp, Users, Calendar, BarChart3 } from 'lucide-react';
import { Button } from '../../shadcn/ui/button';
import { Card, CardContent } from '../../shadcn/ui/card';
import { Badge } from '../../shadcn/ui/badge';
import { useEscapeKey } from '../../hooks/useEscapeKey';

const ProjectStatsModal = ({ isOpen, onClose, stats, projects }) => {
  const [chartData, setChartData] = useState([]);

  // Close modal on ESC key
  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (projects.length > 0) {
      const data = projects.map(project => ({
        name: project.name,
        views: project.view_count || 0,
        stage: project.stage || 'idea',
        created: new Date(project.created_at).toLocaleDateString()
      })).sort((a, b) => b.views - a.views);

      setChartData(data);
    }
  }, [projects]);


  const getStageColor = (stage) => {
    switch (stage?.toLowerCase()) {
      case 'idea': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'planning': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'mvp': return 'bg-white/10 text-white border-white/20';
      case 'development': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'launched': return 'bg-green-500/10 text-green-400 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-gray-900 border border-white/[0.08] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
              <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                <BarChart3 className="w-6 h-6 text-blue-400" />
                <span>Project Statistics</span>
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card className="bg-gray-800/50 border-white/[0.08]">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-gray-400">Total Views</span>
                    </div>
                    <p className="text-2xl font-bold text-white mt-2">{stats.totalViews.toLocaleString()}</p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-white/[0.08]">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-gray-400">Average Views</span>
                    </div>
                    <p className="text-2xl font-bold text-white mt-2">{stats.averageViews}</p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-white/[0.08]">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-gray-400">Interest Received</span>
                    </div>
                    <p className="text-2xl font-bold text-white mt-2">{stats.interestReceived}</p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-white/[0.08]">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-orange-400" />
                      <span className="text-sm text-gray-400">Projects</span>
                    </div>
                    <p className="text-2xl font-bold text-white mt-2">{stats.totalProjects}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Project Performance Table */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Project Performance</h3>
                {chartData.length > 0 ? (
                  <div className="space-y-3">
                    {chartData.map((project, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-white/[0.05]"
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center">
                            <BarChart3 className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-medium truncate">{project.name}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge className={getStageColor(project.stage)}>
                                {project.stage}
                              </Badge>
                              <span className="text-xs text-gray-500">{project.created}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            <Eye className="w-4 h-4 text-blue-400" />
                            <span className="text-white font-medium">{project.views.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{
                                width: `${chartData.length > 1 ? (project.views / Math.max(...chartData.map(p => p.views))) * 100 : 100}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>No project data available</p>
                  </div>
                )}
              </div>

              {/* Insights */}
              <div className="mt-8 p-4 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl border border-blue-500/20">
                <h4 className="text-white font-medium mb-2 flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span>Insights</span>
                </h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Your top performing project has {Math.max(...chartData.map(p => p.views), 0)} views</li>
                  <li>• Average views per project: {stats.averageViews}</li>
                  <li>• Total engagement: {stats.totalViews + stats.interestReceived} interactions</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProjectStatsModal;
