import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play, Star, Users, Zap, Shield } from 'lucide-react';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 backdrop-blur-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-purple-200">Live marketplace</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tight">
            <span className="block text-white">Build.</span>
            <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Ship.
            </span>
            <span className="block text-white">Sell.</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            The premium marketplace where verified makers sell production-ready projects to ambitious builders.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/marketplace')}
              className="relative px-8 py-6 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl shadow-2xl flex items-center gap-2"
            >
              Browse Marketplace
              <ArrowRight className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/how-it-works')}
              className="px-8 py-6 text-lg font-semibold border border-gray-600 hover:border-gray-400 text-white rounded-xl backdrop-blur-sm bg-white/5 hover:bg-white/10 transition-all duration-300 flex items-center gap-2"
            >
              <Play className="w-5 h-5" />
              Watch Demo
            </motion.button>
          </div>

          <div className="flex flex-wrap justify-center gap-8 mt-16">
            {[
              { icon: Shield, label: 'Secure Escrow', color: 'text-blue-400' },
              { icon: Zap, label: 'Quick Transfer', color: 'text-purple-400' },
              { icon: Users, label: 'Verified Makers', color: 'text-green-400' },
              { icon: Star, label: 'Premium Quality', color: 'text-yellow-400' }
            ].map((item, index) => (
              <motion.div
                key={item.label}
                className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-900/40 backdrop-blur-sm border border-gray-700/50"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <span className="text-sm text-gray-300 font-medium">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection; 