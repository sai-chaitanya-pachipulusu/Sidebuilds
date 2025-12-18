import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Shield, 
  TrendingUp, 
  Globe, 
  Code, 
  DollarSign,
  Users,
  BarChart3,
  Lock
} from 'lucide-react';

/**
 * BentoGrid - A modern bento box layout for feature showcase
 * Inspired by Antimetal, Shelve, and Linear
 */
const BentoGrid = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const features = [
    {
      title: "AI-Powered Valuations",
      description: "Get instant, accurate project valuations powered by machine learning algorithms that analyze market trends and comparable sales.",
      icon: Zap,
      gradient: "from-purple-500 to-pink-500",
      span: "col-span-2", // Large card
      visual: (
        <div className="absolute right-4 bottom-4 w-32 h-32 opacity-20">
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 blur-2xl" />
        </div>
      )
    },
    {
      title: "Secure Escrow",
      description: "Every transaction protected with our automated escrow system.",
      icon: Shield,
      gradient: "from-green-500 to-emerald-500",
      span: "col-span-1",
    },
    {
      title: "Verified Revenue",
      description: "All revenue claims are verified with bank statements and analytics.",
      icon: DollarSign,
      gradient: "from-yellow-500 to-orange-500",
      span: "col-span-1",
    },
    {
      title: "Global Marketplace",
      description: "Connect with buyers and sellers from 150+ countries worldwide.",
      icon: Globe,
      gradient: "from-blue-500 to-cyan-500",
      span: "col-span-1",
    },
    {
      title: "Code Quality Analysis",
      description: "Automated code review with security scanning and best practice checks.",
      icon: Code,
      gradient: "from-pink-500 to-rose-500",
      span: "col-span-1",
    },
    {
      title: "Real-Time Analytics",
      description: "Track views, inquiries, and market position with comprehensive dashboards and insights.",
      icon: BarChart3,
      gradient: "from-indigo-500 to-purple-500",
      span: "col-span-2", // Large card
      visual: (
        <div className="absolute right-4 bottom-4 flex gap-1">
          {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
            <motion.div
              key={i}
              className="w-3 rounded-t bg-gradient-to-t from-indigo-500 to-purple-500 opacity-30"
              initial={{ height: 0 }}
              animate={{ height: h }}
              transition={{ delay: i * 0.1, duration: 0.5, type: "spring" }}
            />
          ))}
        </div>
      )
    },
  ];

  return (
    <section className="py-24 bg-[#000000] relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Built for Every <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Ambition</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Whether you're selling a weekend project or a profitable SaaS, we have the tools you need.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className={`${feature.span || 'col-span-1'} relative group`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <motion.div
                className={`relative h-full p-6 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm overflow-hidden transition-colors duration-300 ${
                  hoveredIndex === index ? 'border-white/20 bg-white/[0.05]' : ''
                }`}
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {/* Gradient glow on hover */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 blur-xl transition-opacity duration-500`}
                  animate={{ opacity: hoveredIndex === index ? 0.1 : 0 }}
                />
                
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} p-3 mb-4 shadow-lg`}>
                  <feature.icon className="w-full h-full text-white" />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-white transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
                
                {/* Visual element for large cards */}
                {feature.visual}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BentoGrid;
