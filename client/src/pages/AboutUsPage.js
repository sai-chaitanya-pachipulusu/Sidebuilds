import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Target, 
  Heart, 
  Shield, 
  Zap, 
  Users, 
  Globe,
  ArrowRight,
  Linkedin,
  Twitter,
  Github,
  Star,
  TrendingUp,
  Award,
  Clock
} from 'lucide-react';
import SEO from '../components/SEO';
import { getMarketplaceStats } from '../services/api';

const AboutUsPage = () => {
  const [stats, setStats] = useState({
    projectsListed: '0',
    happyUsers: '0',
    successRate: '0%',
    avgResponseTime: '< 2h'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const marketplaceStats = await getMarketplaceStats();
        
        // Calculate success rate (completed sales / total purchase requests)
        // For now, we'll use a simplified calculation
        const successRate = marketplaceStats.successfulSales > 0 
          ? Math.min(98, Math.round((marketplaceStats.successfulSales / Math.max(marketplaceStats.totalProjects, 1)) * 100))
          : 0;

        setStats({
          projectsListed: marketplaceStats.totalProjects > 0 
            ? `${marketplaceStats.totalProjects.toLocaleString()}+` 
            : '0',
          happyUsers: marketplaceStats.activeUsers > 0 
            ? `${marketplaceStats.activeUsers.toLocaleString()}+` 
            : '0',
          successRate: `${successRate}%`,
          avgResponseTime: '< 2h' // This could be calculated from actual response times if tracked
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Keep default values on error
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);
  const values = [
    {
      icon: Heart,
      title: 'Trust First',
      description: 'We build every feature with trust and transparency at its core',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      icon: Shield,
      title: 'Security',
      description: 'Bank-level security for all transactions and data protection',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Fostering connections between makers and entrepreneurs',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Zap,
      title: 'Innovation',
      description: 'Constantly improving to make project transfers seamless',
      color: 'text-white',
      bgColor: 'bg-white/10/10',
    },
  ];

  const milestones = [
    { year: '2023', event: 'SideBuilds founded with a vision', side: 'left' },
    { year: '2024', event: 'First 100 successful transfers', side: 'right' },
    { year: '2024', event: '$1M+ in project transactions', side: 'left' },
    { year: '2025', event: 'Launched enterprise features', side: 'right' },
  ];

  const team = [
    {
      name: 'Sai Chaitanya',
      role: 'Founder & CEO',
      bio: 'ML Enthusiast & Serial Entrepreneur',
      avatar: null,
      social: {
        linkedin: '#',
        twitter: '#',
        github: '#'
      }
    },
  ];

  const statsData = [
    { 
      label: 'Projects Listed', 
      value: stats.projectsListed,
      icon: TrendingUp,
      color: 'text-blue-400'
    },
    { 
      label: 'Happy Users', 
      value: stats.happyUsers,
      icon: Users,
      color: 'text-green-400'
    },
    { 
      label: 'Success Rate', 
      value: stats.successRate,
      icon: Award,
      color: 'text-white'
    },
    { 
      label: 'Avg Response Time', 
      value: stats.avgResponseTime,
      icon: Clock,
      color: 'text-orange-400'
    },
  ];

  const reasons = [
    'Trust & Security',
    'Fair Pricing', 
    'Smooth Transfers', 
    'Community Support'
  ];

  return (
    <>
      <SEO 
        title="About Us | SideBuilds" 
        description="SideBuilds is the premier marketplace for Vibe Engineered Apps and unfinished ideas. We empower Vibe Engineers to buy, sell, and transfer project assets securely." 
      />
      
      <div className="min-h-screen bg-black">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-gray-600/10 via-blue-600/10 to-gray-600/10 border-b border-white/[0.08] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-600/5 via-transparent to-blue-600/5" />
          
          <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10/10 border border-white/50/20 rounded-none mb-6">
                <Heart className="w-4 h-4 text-white" />
                <span className="text-sm text-gray-300">The Vibe Engineering Revolution</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Home for{' '}
                <span className="bg-gradient-to-r from-gray-400 to-blue-400 bg-clip-text text-transparent">
                  Vibe Engineered Apps
                </span>
                {' '}& Finished Ideas
              </h1>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
                SideBuilds is the dedicated marketplace for Vibe Engineers. Whether you're selling a 
                finished project or a high-potential unfinished idea, we provide the secure 
                infrastructure to turn your "vibes" into valuable assets.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to="/marketplace"
                    className="px-8 py-4 bg-gradient-to-r from-gray-600 to-blue-600 text-white rounded-none font-medium hover:from-gray-700 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-white-500/25 flex items-center gap-2"
                  >
                    Explore Marketplace
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to="/how-it-works"
                    className="px-8 py-4 bg-gray-800 text-white rounded-none font-medium hover:bg-gray-700 border border-gray-700 hover:border-gray-600 transition-all duration-200"
                  >
                    How It Works
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="space-y-20">
            {/* Our Story */}
            <div>
              <div className="text-center mb-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2 className="text-3xl font-bold text-white mb-4">Our Story</h2>
                  <p className="text-lg text-gray-400 max-w-3xl mx-auto">
                    SideBuilds was born from a simple observation: the rise of 
                    <span className="inline-flex items-center gap-1 mx-1 align-baseline">
                      <strong className="bg-gradient-to-r from-gray-400 to-gray-400 bg-clip-text text-transparent">Vibe</strong>
                      <span className="relative inline-block">
                        <span className="line-through decoration-white/50 decoration-2 text-white/40">Coding</span>
                        <span className="absolute -top-[60%] left-0 font-bold bg-gradient-to-r from-gray-400 to-gray-400 bg-clip-text text-transparent">Engineering</span>
                      </span>
                    </span>
                    has unleashed a wave of creativity, but makers lacked a trusted platform to trade these 
                    AI-native assets. We're here to bridge that gap.
                  </p>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-6"
                >
                  <h3 className="text-2xl font-bold text-white">The Vibe Era</h3>
                  <p className="text-gray-400">
                    In the era of AI-assisted development, the value lies in the "Vibe"—the architecture, 
                    the prompts, and the vision. We realized the market needed a dedicated platform that:
                  </p>
                  <div className="space-y-3">
                    {reasons.map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <Target className="w-5 h-5 text-white" />
                        <span className="text-gray-300">{item}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-8 text-center"
                >
                  <Globe className="w-16 h-16 text-white mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Global Reach</h3>
                  <p className="text-gray-400">
                    Connecting makers and entrepreneurs from over 50 countries worldwide
                  </p>
                </motion.div>
              </div>
            </div>

            {/* Mission & Vision */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-8 hover:border-white/[0.12] transition-all duration-200"
              >
                <Target className="w-12 h-12 text-white mb-6" />
                <h3 className="text-2xl font-bold text-white mb-4">Our Mission</h3>
                <p className="text-gray-400 leading-relaxed">
                  To democratize the buying and selling of digital projects by providing 
                  a secure, transparent, and user-friendly marketplace that empowers both 
                  creators and entrepreneurs.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-8 hover:border-white/[0.12] transition-all duration-200"
              >
                <Zap className="w-12 h-12 text-blue-400 mb-6" />
                <h3 className="text-2xl font-bold text-white mb-4">Our Vision</h3>
                <p className="text-gray-400 leading-relaxed">
                  To become the world's most trusted marketplace for side projects, 
                  where every idea has the potential to find its perfect owner and 
                  reach its full potential.
                </p>
              </motion.div>
            </div>

            {/* Core Values */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
              >
                <h2 className="text-3xl font-bold text-white mb-4">Our Core Values</h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  These principles guide everything we do and every decision we make
                </p>
              </motion.div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {values.map((value, index) => {
                  const Icon = value.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-6 hover:border-white/[0.12] transition-all duration-200 group hover:scale-105"
                    >
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-none mb-4 ${value.bgColor}`}>
                        <Icon className={`w-6 h-6 ${value.color}`} />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-gray-300 transition-colors duration-200">
                        {value.title}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {value.description}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Team Section */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
              >
                <h2 className="text-3xl font-bold text-white mb-4">Meet Our Team</h2>
                <p className="text-gray-400">
                  Passionate about empowering makers and entrepreneurs
                </p>
              </motion.div>
              
              <div className="flex justify-center">
                {team.map((member, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-8 text-center hover:border-white/[0.12] transition-all duration-200 max-w-sm"
                  >
                    <div className="w-24 h-24 bg-gradient-to-r from-gray-600 to-blue-600 rounded-none mx-auto mb-6 flex items-center justify-center text-white text-2xl font-bold">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                    <p className="text-white text-sm mb-3">{member.role}</p>
                    <p className="text-gray-400 text-sm mb-6">{member.bio}</p>
                    <div className="flex justify-center space-x-4">
                      {member.social.linkedin && (
                        <Linkedin className="w-5 h-5 text-gray-400 hover:text-blue-400 cursor-pointer transition-colors duration-200" />
                      )}
                      {member.social.twitter && (
                        <Twitter className="w-5 h-5 text-gray-400 hover:text-blue-400 cursor-pointer transition-colors duration-200" />
                      )}
                      {member.social.github && (
                        <Github className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors duration-200" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-12"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {statsData.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="text-center"
                    >
                      <Icon className={`w-8 h-8 ${stat.color} mx-auto mb-3`} />
                      <div className={`text-3xl font-bold ${stat.color} mb-2`}>
                        {stat.value}
                      </div>
                      <div className="text-gray-400 text-sm">{stat.label}</div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Timeline */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
              >
                <h2 className="text-3xl font-bold text-white mb-4">Our Journey</h2>
                <p className="text-gray-400">Key milestones in our mission</p>
              </motion.div>
              
              <div className="relative">
                <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-gray-800" />
                <div className="space-y-12">
                  {milestones.map((milestone, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative flex items-center"
                    >
                      <div className={`flex-1 ${milestone.side === 'left' ? 'pr-8 text-right' : 'opacity-0'}`}>
                        <div className="inline-block px-3 py-1 bg-white/10/20 text-gray-300 rounded-none text-sm font-medium mb-2">
                          {milestone.year}
                        </div>
                        <p className="text-white">{milestone.event}</p>
                      </div>
                      <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white/10 rounded-none border-4 border-black" />
                      <div className={`flex-1 ${milestone.side === 'right' ? 'pl-8 text-left' : 'opacity-0'}`}>
                        <div className="inline-block px-3 py-1 bg-white/10/20 text-gray-300 rounded-none text-sm font-medium mb-2">
                          {milestone.year}
                        </div>
                        <p className="text-white">{milestone.event}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-gray-600/20 via-blue-600/20 to-gray-600/20 border border-white/[0.08] rounded-none p-12 text-center"
            >
              <h2 className="text-3xl font-bold text-white mb-4">
                Join Our Growing Community
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
                Whether you're looking to buy your next project or sell your creation,
                we're here to make it happen.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to="/register"
                    className="px-8 py-4 bg-gradient-to-r from-gray-600 to-blue-600 text-white rounded-none font-medium hover:from-gray-700 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-white-500/25"
                  >
                    Get Started
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to="/contact"
                    className="px-8 py-4 bg-gray-800 text-white rounded-none font-medium hover:bg-gray-700 border border-gray-700 hover:border-gray-600 transition-all duration-200"
                  >
                    Contact Us
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AboutUsPage; 
