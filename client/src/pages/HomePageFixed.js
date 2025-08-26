// HomePageFixed.js - Modern homepage with Linear/Chronicle/Antimetal inspiration
import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight,   
  Zap,   
  Shield,   
  Globe,   
  TrendingUp,  
  Code,  
  Users,  
  DollarSign,  
  CheckCircle,  
  Star,  
  Github,  
  Twitter,  
  Sparkles,  
  Terminal,  
  Lock,  
  BarChart3,  
  Rocket,  
  Command,
  Play,
  Clock,
  Layers,
  Award,
  Search
} from 'lucide-react';

import { Button } from '../shadcn/ui/button';  
import { Card } from '../shadcn/ui/card';
import { Badge } from '../shadcn/ui/badge';  
import { useAuth } from '../context/AuthContext';
import { getPublicProjects } from '../services/api';
import SEO from '../components/SEO';
import Footer from '../components/Footer';
import StaticDotBackground from '../components/StaticDotBackground';
import './HomePage.css';

// Enhanced Chronicle-style hero section with Linear animations 
const HeroSection = () => {  
  const navigate = useNavigate();  
  const { isAuthenticated } = useAuth();  
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });  
    
  useEffect(() => {  
    const handleMouseMove = (e) => {  
      setMousePosition({ x: e.clientX, y: e.clientY });  
    };  
    window.addEventListener('mousemove', handleMouseMove);  
    return () => window.removeEventListener('mousemove', handleMouseMove);  
  }, []);  
    
  return (  
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">  
      {/* Enhanced background inspired by Antimetal + Linear */}
      <div className="fixed inset-0 z-0">
        {/* Primary gradient background - Antimetal style */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-black" />
        
        {/* Subtle mesh gradient overlay - Linear style */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
        
        {/* Premium dot pattern - Chronicle style */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />
        
        {/* Floating particles - Clerk inspired */}
        <div className="absolute inset-0">
          <motion.div 
            className="absolute top-1/4 left-1/4 w-1 h-1 bg-purple-400/60 rounded-full"
            animate={{ 
              y: [0, -20, 0],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div 
            className="absolute top-3/4 right-1/4 w-1.5 h-1.5 bg-blue-400/50 rounded-full"
            animate={{ 
              y: [0, 15, 0],
              x: [0, 10, 0],
              opacity: [0.5, 0.9, 0.5]
            }}
            transition={{ duration: 6, repeat: Infinity, delay: 1 }}
          />
          <motion.div 
            className="absolute top-1/2 right-1/3 w-0.5 h-0.5 bg-pink-400/70 rounded-full"
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{ duration: 3, repeat: Infinity, delay: 2 }}
          />
        </div>
      </div>
        
      {/* Sophisticated gradient orbs - Linear style */}  
      <div className="absolute inset-0 overflow-hidden opacity-40">  
        <motion.div   
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(147,51,234,0.15) 0%, transparent 70%)',
            left: '10%',  
            top: '20%',  
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />  
        <motion.div   
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
            right: '10%',  
            bottom: '20%',  
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.12, 0.2, 0.12]
          }}
          transition={{ duration: 10, repeat: Infinity, delay: 2 }}
        />  
      </div>  
        
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">  
        <motion.div  
          initial={{ opacity: 0, y: 20 }}  
          animate={{ opacity: 1, y: 0 }}  
          transition={{ duration: 0.8 }}  
          className="space-y-8"  
        >  
          {/* Enhanced badge - Clerk inspired */}  
          <motion.div  
            initial={{ opacity: 0, scale: 0.9 }}  
            animate={{ opacity: 1, scale: 1 }}  
            transition={{ delay: 0.2 }}  
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 backdrop-blur-sm"  
          >  
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-purple-200">Live marketplace</span>  
            <Badge className="bg-purple-500/20 text-purple-300 text-xs border-purple-400/30">
              2.0
            </Badge>
          </motion.div>  
            
          {/* Enhanced headline - Linear style */}  
          <div className="space-y-4">
            <motion.h1 
              className="text-6xl md:text-8xl font-black tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >  
              <span className="block text-white">Build.</span>  
              <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">  
                Ship.  
              </span>  
              <span className="block text-white">Sell.</span>  
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-light"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >  
              The premium marketplace where{' '}
              <span className="text-purple-300 font-medium">verified makers</span> sell 
              production-ready projects to ambitious builders.
            </motion.p>
          </div>
            
          {/* Enhanced CTA section - Antimetal inspired */}  
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >  
            <motion.div 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }}
              className="group relative"
            >  
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-300" />
              <Button  
                size="lg"  
                className="relative px-8 py-6 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl shadow-2xl"  
                onClick={() => navigate(isAuthenticated ? '/marketplace' : '/register')}  
              >  
                <span className="flex items-center gap-2">  
                  {isAuthenticated ? 'Browse Marketplace' : 'Start Building'}  
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />  
                </span>  
              </Button>  
            </motion.div>  
              
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>  
              <Button  
                size="lg"  
                variant="outline"  
                className="px-8 py-6 text-lg font-semibold border-gray-600 hover:border-gray-400 text-white rounded-xl backdrop-blur-sm bg-white/5 hover:bg-white/10 transition-all duration-300"  
                onClick={() => navigate('/how-it-works')}  
              >  
                <Play className="w-5 h-5 mr-2" />  
                Watch Demo  
              </Button>  
            </motion.div>  
          </motion.div>  
            
          {/* Enhanced trust indicators - Chronicle style */}  
          <motion.div 
            className="flex flex-wrap justify-center gap-8 mt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
          >  
            {[
              { icon: Award, label: 'Verified Projects', color: 'text-emerald-400' },
              { icon: Shield, label: 'Secure Escrow', color: 'text-blue-400' },
              { icon: Clock, label: '24h Support', color: 'text-purple-400' },
              { icon: Layers, label: 'Full Transfer', color: 'text-pink-400' }
            ].map((item, index) => {
              const IconComponent = item.icon;
              return (
                <motion.div 
                  key={item.label}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-900/40 backdrop-blur-sm border border-gray-700/50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + index * 0.1, duration: 0.5 }}
                >  
                  <IconComponent className={`w-4 h-4 ${item.color}`} />  
                  <span className="text-sm text-gray-300 font-medium">{item.label}</span>  
                </motion.div>
              );
            })}
          </motion.div>

          {/* Social proof - Linear inspired */}
          <motion.div
            className="mt-16 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.8 }}
          >
            <p className="text-sm text-gray-500 mb-4">Trusted by makers from</p>
            <div className="flex justify-center items-center gap-8 opacity-60">
              {['Y Combinator', 'Product Hunt', 'Indie Hackers', 'GitHub'].map((company, index) => (
                <motion.div
                  key={company}
                  className="text-gray-400 font-medium text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  transition={{ delay: 1.2 + index * 0.1 }}
                >
                  {company}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>  
      </div>  
        
      {/* Enhanced scroll indicator - Resend style */}  
      <motion.div  
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"  
        animate={{ y: [0, 8, 0] }}  
        transition={{ repeat: Infinity, duration: 2 }}  
      >  
        <div className="w-6 h-10 border-2 border-gray-600 rounded-full flex justify-center">  
          <motion.div 
            className="w-1 h-3 bg-purple-400 rounded-full mt-2"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />  
        </div>  
      </motion.div>  
    </section>  
  );  
};

const HomePage = () => {  
  return (  
    <div className="bg-black text-white flex flex-col min-h-screen">  
      <SEO  
        title="SideBuilds - The Marketplace for Digital Craftsmanship"  
        description="Buy and sell verified side projects with confidence. Join thousands of makers building the future."  
      />  
      
      <div className="flex-1">
        <HeroSection />  
        <Footer />
      </div>
    </div>  
  );  
};  
  
export default HomePage; 