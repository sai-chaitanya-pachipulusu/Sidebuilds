import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, TrendingUp, Package, Eye, Users, ShoppingCart } from 'lucide-react';
import { Button } from '../../shadcn/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shadcn/ui/card';
import { useEscapeKey } from '../../hooks/useEscapeKey';

const PortfolioValueModal = ({ isOpen, onClose, stats, projects }) => {
  // Close modal on ESC key
  useEscapeKey(onClose, isOpen);

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

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
                <DollarSign className="w-6 h-6 text-green-400" />
                <span>Portfolio Overview</span>
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
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card className="bg-gray-800/50 border-white/[0.08]">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-gray-400">Total Projects</span>
                    </div>
                    <p className="text-2xl font-bold text-white mt-2">{stats.totalProjects}</p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-white/[0.08]">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-gray-400">Portfolio Value</span>
                    </div>
                    <p className="text-2xl font-bold text-white mt-2">{formatPrice(stats.portfolioValue)}</p>
                  </CardContent>
                </Card>

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
                      <Users className="w-4 h-4 text-pink-400" />
                      <span className="text-sm text-gray-400">Interest Received</span>
                    </div>
                    <p className="text-2xl font-bold text-white mt-2">{stats.interestReceived}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Projects Breakdown */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Project Breakdown</h3>
                {projects.length > 0 ? (
                  <div className="space-y-3">
                    {projects.map((project, index) => (
                      <motion.div
                        key={project.id || index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-white/[0.05]"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{project.name}</h4>
                            <p className="text-gray-400 text-sm">{project.stage || 'idea'}</p>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          {project.sale_price && (
                            <p className="text-green-400 font-medium">{formatPrice(project.sale_price)}</p>
                          )}
                          <p className="text-gray-400 text-sm">{project.view_count || 0} views</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>No projects in your portfolio</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PortfolioValueModal;
