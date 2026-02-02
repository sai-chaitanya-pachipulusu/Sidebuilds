import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

const AnimatedCounter = ({ value, prefix = '', suffix = '', duration = 2 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = typeof value === 'string' 
        ? parseFloat(value.replace(/[^0-9.-]+/g, ''))
        : value;
    
    if (start === end) return;

    let totalMilSecDur = duration * 1000;
    let incrementTime = (totalMilSecDur / end) * 0.01;
    let timer = setInterval(() => {
        start += 1;
        setCount(start);
        if (start === end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return (
      <span>
          {prefix}{Math.ceil(count).toLocaleString()}{suffix}
      </span>
  );
};

const StatsSection = ({ stats }) => {
  const statItems = [
    { label: 'Total Projects', value: stats?.totalProjects, icon: Activity, prefix: '', suffix: '' },
    { label: 'Active Listings', value: stats?.activeListings, icon: TrendingUp, prefix: '', suffix: '' },
    { label: 'Total Value', value: stats?.totalValue, icon: DollarSign, prefix: '$', suffix: '' },
    { label: 'Community', value: stats?.activeUsers, icon: Users, prefix: '', suffix: ' Makers' },
  ];

  return (
    <div className="py-24 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">Marketplace At a Glance</h2>
          <p className="text-xl text-gray-400">Discover the scale and activity of our vibrant ecosystem.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {statItems.map((item, index) => (
            <motion.div
              key={item.label}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-white/10 rounded-xl">
                  <item.icon className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-4xl font-bold text-white mb-2">
                <AnimatedCounter value={item.value || 0} prefix={item.prefix} suffix={item.suffix} />
              </h3>
              <p className="text-gray-400">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsSection; 
