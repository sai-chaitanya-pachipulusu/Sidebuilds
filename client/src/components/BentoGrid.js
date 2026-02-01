import React from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Shield, 
  DollarSign,
  Globe, 
  Code, 
  BarChart3,
} from 'lucide-react';

/**
 * BentoGrid - Brutalist feature showcase
 * Raw, minimal, no decorative elements
 */
const BentoGrid = () => {
  const features = [
    {
      title: "AI Valuations",
      description: "Instant project valuations. No guesswork.",
      icon: Zap,
      span: "col-span-2",
    },
    {
      title: "Secure Escrow",
      description: "Protected transactions.",
      icon: Shield,
      span: "col-span-1",
    },
    {
      title: "Verified Revenue",
      description: "Bank-verified claims.",
      icon: DollarSign,
      span: "col-span-1",
    },
    {
      title: "Global",
      description: "150+ countries.",
      icon: Globe,
      span: "col-span-1",
    },
    {
      title: "Code Quality",
      description: "Automated analysis.",
      icon: Code,
      span: "col-span-1",
    },
    {
      title: "Analytics",
      description: "Real-time dashboards. Track everything.",
      icon: BarChart3,
      span: "col-span-2",
    },
  ];

  return (
    <section className="py-24 bg-black border-t border-white/10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-12">
          <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Features</span>
          <h2 className="text-3xl md:text-4xl font-black text-white mt-2 uppercase">What You Get</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className={`${feature.span || 'col-span-1'} bg-black p-6 group hover:bg-white/5 transition-colors`}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <feature.icon className="w-6 h-6 text-white mb-4" />
              
              <h3 className="text-lg font-bold text-white uppercase mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500 font-mono leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BentoGrid;
