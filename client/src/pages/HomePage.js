import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../shadcn/ui/button';
import { ArrowRight, Play, Award, Shield, Layers, Clock, Code, Users, Rocket, BarChart3, Command, Search, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';
import { Card } from '../shadcn/ui/card';
import { Badge } from '../shadcn/ui/badge';

// Premium UI Components
import BentoGrid from '../components/BentoGrid';
import AnimatedTestimonials from '../components/AnimatedTestimonials';
import ProductTour, { useProductTour } from '../components/ProductTour';
import MagneticButton from '../components/MagneticButton';

// Enhanced Hero with Chronicle/GSAP-inspired animations

const HeroSection = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const containerRef = useRef(null);
  
  // Mouse position for gradient follow effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Smooth spring animation for mouse follow
  const springConfig = { damping: 25, stiffness: 150 };
  const gradientX = useSpring(mouseX, springConfig);
  const gradientY = useSpring(mouseY, springConfig);

  // Scroll-based animations
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  // Mouse move handler for gradient
  const handleMouseMove = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      mouseX.set(x * 100);
      mouseY.set(y * 100);
    }
  };

  // Staggered text animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2
      }
    }
  };

  const wordVariants = {
    hidden: { opacity: 0, y: 40, rotateX: -40 },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 100
      }
    }
  };

  const floatingVariants = {
    animate: {
      y: [-20, 20, -20],
      rotate: [-5, 5, -5],
      transition: {
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <section 
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Pure black background with subtle accent glows - Linear/Resend style */}
      <div className="absolute inset-0 bg-[#000000]" />
      
      {/* Subtle top-center purple glow - like Linear */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.05) 30%, transparent 70%)',
        }}
      />
      
      {/* Secondary accent glow - subtle pink */}
      <div 
        className="absolute top-20 right-[10%] w-[500px] h-[500px] pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Subtle dot grid pattern - very faint like Linear */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      />
        
      <motion.div 
        className="relative z-10 max-w-7xl mx-auto px-4 text-center"
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
      >  
        <motion.div  
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-8"  
        >
          {/* Badge with enhanced animation */}
          <motion.div  
            initial={{ opacity: 0, scale: 0.8, y: 20 }}  
            animate={{ opacity: 1, scale: 1, y: 0 }}  
            transition={{ type: "spring", damping: 20, stiffness: 100 }}  
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 backdrop-blur-xl"  
          >  
            <motion.div 
              className="w-2 h-2 bg-green-400 rounded-full"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-sm font-medium text-purple-200">v2.0 Live Marketplace</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
          </motion.div>
            
          <div className="space-y-6">
            {/* Animated heading with staggered words */}
            <motion.h1 
              className="text-6xl md:text-8xl font-black tracking-tighter text-center"
              style={{ perspective: 1000 }}
            >  
              <motion.span 
                className="block text-white mb-10"
                variants={wordVariants}
              >
                The platform built for
              </motion.span>  
              <motion.span 
                className="inline-flex items-baseline gap-4 justify-center flex-wrap"
                variants={wordVariants}
              >
                <motion.span 
                  className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  Vibe
                </motion.span>
                <span className="relative inline-block">
                  <motion.span 
                    className="line-through decoration-white/50 decoration-4 text-white/40"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    Coded
                  </motion.span>
                  <motion.span 
                    className="absolute -top-[60%] left-0 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-black"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, type: "spring", stiffness: 100 }}
                  >
                    Engineered
                  </motion.span>
                </span>
                <motion.span 
                  className="text-white"
                  variants={wordVariants}
                >
                  ideas.
                </motion.span>
              </motion.span>
            </motion.h1>
            
            {/* Description with fade-in */}
            <motion.p 
              className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light text-center mt-12"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
            >  
              The premier marketplace for <strong className="text-white">finished and unfinished apps</strong>. Buy and sell production-ready code, validated ideas, and "vibe engineered" projects engineered for speed and impact.
            </motion.p>
          </div>
            
          {/* CTA Buttons with enhanced glow */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-14"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >  
            <MagneticButton strength={0.3}>
              <motion.div 
                whileHover={{ scale: 1.03, y: -2 }} 
                whileTap={{ scale: 0.98 }}
                className="group relative"
              >  
                {/* Animated glow */}
                <motion.div 
                  className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-lg"
                  animate={{ 
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <Button  
                  size="lg"  
                  className="relative px-8 py-7 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl shadow-2xl border-0"  
                  onClick={() => navigate(isAuthenticated ? '/marketplace' : '/register')}  
                >  
                  <span className="flex items-center gap-2">  
                    Get Started Free
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowRight className="w-5 h-5" />
                    </motion.div>
                  </span>  
                </Button>  
              </motion.div>
            </MagneticButton>  
              
            <MagneticButton strength={0.2}>
              <motion.div 
                whileHover={{ scale: 1.03, y: -2 }} 
                whileTap={{ scale: 0.98 }}
              >  
                <Button  
                  size="lg"  
                  variant="outline"  
                  className="px-8 py-7 text-lg font-semibold border-white/10 hover:border-white/30 text-white rounded-xl backdrop-blur-xl bg-white/5 hover:bg-white/10 transition-all duration-300"  
                  onClick={() => navigate('/how-it-works')}  
                >  
                  <Play className="w-5 h-5 mr-2 fill-white" />  
                  Watch Demo  
                </Button>  
              </motion.div>
            </MagneticButton>  
          </motion.div>  
            
          {/* Trust badges with staggered animation */}
          <motion.div 
            className="flex flex-wrap justify-center gap-8 mt-20"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1, delayChildren: 1.2 }
              }
            }}
          >  
            {[
              { icon: Award, label: 'Verified Projects' },
              { icon: Shield, label: 'Secure Escrow' },
              { icon: Clock, label: '24h Support' },
              { icon: Layers, label: 'Full Asset Transfer' }
            ].map((item, index) => (
              <motion.div 
                key={item.label}
                className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/5"
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.9 },
                  visible: { 
                    opacity: 1, 
                    y: 0, 
                    scale: 1,
                    transition: { type: "spring", damping: 20, stiffness: 100 }
                  }
                }}
                whileHover={{ 
                  scale: 1.05, 
                  backgroundColor: "rgba(255,255,255,0.1)",
                  transition: { duration: 0.2 }
                }}
              >  
                <item.icon className="w-4 h-4 text-purple-400" />  
                <span className="text-sm text-gray-300 font-medium">{item.label}</span>  
              </motion.div>
            ))}
          </motion.div>
        </motion.div>  
      </motion.div>  
    </section>  
  );  
};



// Simple CTA card linking to the full How It Works page (replaces redundant section)
const HowItWorksCTA = () => {
    const navigate = useNavigate();
    
    return (
        <section className="py-20 bg-black relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent" />
            
            <div className="max-w-4xl mx-auto px-4 relative z-10">
                <motion.div 
                    className="relative bg-gradient-to-br from-gray-900/80 to-gray-800/50 border border-white/[0.08] rounded-3xl p-12 text-center overflow-hidden group hover:border-purple-500/30 transition-all duration-500"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    whileHover={{ scale: 1.02 }}
                >
                    {/* Animated gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Icon cluster */}
                    <div className="flex justify-center gap-4 mb-8">
                        <motion.div 
                            className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/20"
                            whileHover={{ rotate: -5, scale: 1.1 }}
                        >
                            <Search className="w-6 h-6 text-white" />
                        </motion.div>
                        <motion.div 
                            className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/20 -mt-2"
                            whileHover={{ rotate: 5, scale: 1.1 }}
                        >
                            <Users className="w-6 h-6 text-white" />
                        </motion.div>
                        <motion.div 
                            className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg shadow-green-500/20"
                            whileHover={{ rotate: -5, scale: 1.1 }}
                        >
                            <Shield className="w-6 h-6 text-white" />
                        </motion.div>
                    </div>
                    
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 relative z-10">
                        Curious How It All Works?
                    </h2>
                    <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto relative z-10">
                        From discovering your perfect project to completing a secure transaction — 
                        learn the step-by-step process for both buyers and sellers.
                    </p>
                    
                    <motion.button
                        onClick={() => navigate('/how-it-works')}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 relative z-10"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        See How It Works
                        <ArrowRight className="w-5 h-5" />
                    </motion.button>
                </motion.div>
            </div>
        </section>
    );
};

// Animated Counter Component
const AnimatedCounter = ({ value, suffix = '', prefix = '' }) => {
    const [count, setCount] = React.useState(0);
    const [hasAnimated, setHasAnimated] = React.useState(false);
    const ref = React.useRef(null);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !hasAnimated) {
                    setHasAnimated(true);
                    const duration = 2000;
                    const steps = 60;
                    const increment = value / steps;
                    let current = 0;
                    
                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= value) {
                            setCount(value);
                            clearInterval(timer);
                        } else {
                            setCount(Math.floor(current));
                        }
                    }, duration / steps);
                }
            },
            { threshold: 0.5 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, [value, hasAnimated]);

    return (
        <span ref={ref}>
            {prefix}{count.toLocaleString()}{suffix}
        </span>
    );
};

const StatsSection = () => {
    const [stats, setStats] = React.useState([
        { value: 0, label: 'Active Projects', suffix: '+', gradient: 'from-purple-500 to-pink-500', key: 'totalProjects' },
        { value: 0, label: 'Projects for Sale', suffix: '', gradient: 'from-indigo-500 to-purple-500', key: 'projectsForSale' },
        { value: 0, label: 'Active Makers', suffix: '+', gradient: 'from-orange-500 to-yellow-500', key: 'totalUsers' },
        { value: 0, label: 'Successful Sales', suffix: '+', gradient: 'from-blue-500 to-cyan-500', key: 'successfulSales' },
        { value: 0, label: 'Total Volume', prefix: '$', suffix: 'K', gradient: 'from-green-500 to-emerald-500', key: 'totalVolume', isVolume: true },
    ]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // Use backend API directly (proxy may not always be configured)
                const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
                const response = await fetch(`${apiUrl}/public/marketplace/analytics`);
                if (response.ok) {
                    const data = await response.json();
                    setStats(prevStats => prevStats.map(stat => {
                        let value = data[stat.key] || 0;
                        // Convert volume to K (thousands)
                        if (stat.isVolume && value > 0) {
                            value = Math.round(value / 1000);
                        }
                        return { ...stat, value };
                    }));
                }
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    return (
        <section className="py-24 bg-black relative overflow-hidden">
            {/* Background grid */}
            <div 
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }}
            />
            
            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <motion.div
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-8"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: { staggerChildren: 0.1 }
                        }
                    }}
                >
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            className="text-center group"
                            variants={{
                                hidden: { opacity: 0, y: 30, scale: 0.9 },
                                visible: { 
                                    opacity: 1, 
                                    y: 0, 
                                    scale: 1,
                                    transition: { type: "spring", damping: 20, stiffness: 100 }
                                }
                            }}
                        >
                            <div className={`text-4xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-2`}>
                                {isLoading ? (
                                    <span className="animate-pulse">...</span>
                                ) : (
                                    <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={stat.prefix || ''} />
                                )}
                            </div>
                            <p className="text-gray-400 font-medium">{stat.label}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

const TestimonialsSection = () => {
    const testimonials = [
        { name: 'Sarah Chen', role: 'Founder @ TechFlow', avatar: '...', content: 'Sold my project in just 2 weeks. The verification process gave buyers confidence, and the transfer was seamless.' },
        { name: 'Marcus Johnson', role: 'Developer @ BuildFast', avatar: '...', content: 'Found the perfect project to accelerate our startup. Revenue was exactly as advertised. Highly recommend!' },
        { name: 'Emily Rodriguez', role: 'Indie Maker', avatar: '...', content: 'The escrow service gave me peace of mind. Everything was handled professionally from start to finish.' },
    ];
    return (
        <section className="py-24 bg-gray-900/50">
            <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-white mb-4">Loved by Makers Worldwide</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <Card key={index} className="bg-gray-900 border-gray-800 p-6">
                            <p className="text-gray-300 italic mb-6">"{testimonial.content}"</p>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-purple-500"></div>
                                <div>
                                    <p className="font-semibold text-white">{testimonial.name}</p>
                                    <p className="text-sm text-gray-400">{testimonial.role}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
};

const CTASection = () => {
    const navigate = useNavigate();
    return (
        <section className="py-32 text-center bg-black">
            <div className="max-w-4xl mx-auto px-4">
                <h2 className="text-5xl font-bold text-white mb-4">Ready to Join?</h2>
                <p className="text-xl text-gray-400 mb-8">Start building, buying, or selling today. Create an account to get started.</p>
                <Button size="lg" onClick={() => navigate('/register')}>
                    Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
            </div>
        </section>
    );
};

const HomePage = () => {
    // Product Tour integration
    const { isOpen: isTourOpen, startTour, closeTour, completeTour, hasSeenTour } = useProductTour();
    const tourTriggeredRef = React.useRef(false);
    
    // Show tour for new visitors (after a short delay) - only once
    useEffect(() => {
        if (!hasSeenTour && !tourTriggeredRef.current) {
            tourTriggeredRef.current = true;
            const timer = setTimeout(() => {
                startTour();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [hasSeenTour]); // Removed startTour from deps - it's stable now
    
    const VibeCodingSection = () => (
      <section className="py-24 bg-gray-900 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
            <div>
                <Badge variant="outline" className="text-purple-400 border-purple-400/50 mb-6">Beyond Software 2.0</Badge>
                <h2 className="text-4xl font-bold text-white mb-6">
                    What is{' '}
                    <motion.span 
                        className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent inline-block"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        >
                        Vibe
                        </motion.span>
                    <span className="inline-flex items-center gap-2 ml-3 align-bottom">
                        <span className="relative inline-block">
                            <span className="line-through decoration-white/50 decoration-2 text-white/40 text-3xl">Coding</span>
                            <span className="absolute -top-[60%] left-0 text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Engineering</span>
                        </span>
                        <span className="sr-only">Vibe Engineering</span>
                    </span>
                    ?
                </h2>
                <div className="space-y-6 text-lg text-gray-300 leading-relaxed">
                    <p>
                        <strong className="text-white">Logic is commodity. Vibe is currency.</strong>
                    </p>
                    <p>
                        <strong className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Vibe Engineering</strong> is the capture of peak creative resonance. It is the art of coding at the speed of thought—harnessing AI to bypass boilerplate and lock onto the product's "soul": the immediate tactile utility and aesthetic that users crave.
                    </p>
                    <p>
                        We don't just ship code; we ship <strong className="text-white">momentum</strong>. A Vibe Engineered project isn't "unfinished"—it's a <strong>validated signal</strong> in a noisy world. It is a pre-loaded trajectory waiting for a pilot.
                    </p>
                    <ul className="space-y-4 mt-6">
                        <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2.5" />
                            <span><strong>Kinetic Software:</strong> Trade projects that have velocity and user-love, not just static repositories.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5" />
                            <span><strong>Architectural Intent:</strong> Acquire the spark, the vision, and the "ghost in the machine." The implementation is just a detail.</span>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 blur-3xl rounded-full" />
                <motion.div 
                    className="relative bg-[#0d0d0d] border border-white/10 rounded-xl overflow-hidden shadow-2xl font-mono text-sm leading-relaxed"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Terminal Header */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/50" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                            <div className="w-3 h-3 rounded-full bg-green-500/50" />
                        </div>
                        <div className="ml-2 text-xs text-gray-500">vibe-engine — zsh — 80x24</div>
                    </div>

                    {/* Terminal Content */}
                    <div className="p-6 text-gray-300 min-h-[300px]">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-purple-400">➜</span>
                                <span className="text-blue-400">~/projects</span>
                                <span className="text-gray-500">git clone idea-to-reality</span>
                            </div>
                            
                            <motion.div
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                <span className="text-gray-500">Cloning into 'next-big-thing'...</span>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 1.2 }}
                                className="pt-2"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-purple-400">➜</span>
                                    <span className="text-blue-400">~/next-big-thing</span>
                                    <span className="text-gray-200">npx <span className="text-yellow-400">inject-vibe@latest</span></span>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 2.0 }}
                                className="space-y-1 pt-1 ml-4 border-l-2 border-gray-800 pl-4 my-2"
                            >
                                <div className="text-gray-400">Analyzing market gaps... <span className="text-green-400">Done</span></div>
                                <div className="text-gray-400">Synthesizing aesthetic... <span className="text-green-400">Done</span></div>
                                <div className="text-gray-400">Optimizing user dopamine... <span className="text-green-400">Done</span></div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 3.5 }}
                                className="pt-2"
                            >
                                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    VIBE_CHECK_PASSED: Project ready for momentum.
                                </div>
                            </motion.div>
                            
                            <motion.div
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 4.5 }}
                                className="pt-2 flex items-center gap-2 animate-pulse"
                            >
                                <span className="text-purple-400">➜</span>
                                <span className="text-blue-400">~/next-big-thing</span>
                                <span className="w-2.5 h-4 bg-gray-500 block" />
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
      </section>
    );

    // Use Cases Data
    const [activeCase, setActiveCase] = useState(0);
    const cases = [
        {
            title: "For Founders",
            description: "Acquire a turnkey project with existing traction to bypass the 'zero to one' phase and scale faster.",
            icon: Rocket,
            image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600"
        },
        {
            title: "For Builders",
            description: "Sell your completed side projects to fund your next venture or earn a return on your hard work.",
            icon: Code,
            image: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600"
        },
        {
            title: "For Investors",
            description: "Discover and invest in a portfolio of promising, revenue-generating digital assets.",
            icon: BarChart3,
            image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600"
        }
    ];

    return (
        <div className="bg-black text-white min-h-screen">
            <SEO
                title="SideBuilds - The Operating System for Modern Makers"
                description="Buy, sell, and showcase production-ready side projects. The premium marketplace for verified makers and ambitious builders."
            />
            <HeroSection />
            <HowItWorksCTA />
            <VibeCodingSection />
            
            {/* Use Cases Section */}
            <section className="py-24 bg-gray-900/50">
                <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-4xl font-bold text-white mb-6">Built for Every Ambition</h2>
                        <div className="space-y-4">
                            {cases.map((item, index) => (
                                <div 
                                    key={item.title}
                                    onMouseOver={() => setActiveCase(index)}
                                    className={`p-4 rounded-lg cursor-pointer transition-colors ${activeCase === index ? 'bg-purple-500/10 border border-purple-500/20' : 'border border-transparent hover:bg-white/5'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <item.icon className={`w-6 h-6 ${activeCase === index ? 'text-purple-400' : 'text-gray-500'}`} />
                                        <h3 className={`text-xl font-semibold ${activeCase === index ? 'text-white' : 'text-gray-400'}`}>{item.title}</h3>
                                    </div>
                                    <p className="text-gray-400 mt-2 pl-10 leading-relaxed">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="h-[400px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-[#0d0d0d] flex items-center justify-center p-12">
                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent mix-blend-overlay z-10" />
                        
                        <AnimatePresence mode="wait">
                            {activeCase === 0 && (
                                <motion.div 
                                    key="founders"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.1 }}
                                    transition={{ duration: 0.4 }}
                                    className="w-full h-full relative"
                                >
                                    {/* Founders: Growth & Scale */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="relative w-64 h-64">
                                            {/* Rising Graph Lines */}
                                            <svg className="w-full h-full text-purple-500 overflow-visible" viewBox="0 0 100 100">
                                                <motion.path
                                                    d="M0,80 Q25,80 50,50 T100,10"
                                                    fill="none"
                                                    stroke="url(#gradient-founder)"
                                                    strokeWidth="4"
                                                    strokeLinecap="round"
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 1 }}
                                                    transition={{ duration: 1.5, ease: "easeInOut" }}
                                                />
                                                <defs>
                                                    <linearGradient id="gradient-founder" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0" />
                                                        <stop offset="100%" stopColor="#d8b4fe" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            
                                            {/* Floating Nodes */}
                                            <motion.div 
                                                className="absolute top-[10%] right-0 bg-gray-900 border border-purple-500/50 p-3 rounded-lg shadow-xl shadow-purple-500/20"
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 1 }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                                    <span className="text-xs font-mono text-white">Traction: Verified</span>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeCase === 1 && (
                                <motion.div 
                                    key="builders"
                                    initial={{ opacity: 0, rotateX: 20 }}
                                    animate={{ opacity: 1, rotateX: 0 }}
                                    exit={{ opacity: 0, rotateX: -20 }}
                                    transition={{ duration: 0.4 }}
                                    className="w-full h-full flex items-center justify-center"
                                >
                                    {/* Builders: Code to Asset */}
                                    <div className="bg-gray-900 border border-white/10 rounded-xl w-72 shadow-2xl overflow-hidden">
                                        <div className="h-8 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div className="space-y-2">
                                                <motion.div initial={{ width: 0 }} animate={{ width: "60%" }} transition={{ delay: 0.2 }} className="h-2 bg-purple-500/30 rounded-full" />
                                                <motion.div initial={{ width: 0 }} animate={{ width: "80%" }} transition={{ delay: 0.4 }} className="h-2 bg-gray-700/50 rounded-full" />
                                                <motion.div initial={{ width: 0 }} animate={{ width: "40%" }} transition={{ delay: 0.6 }} className="h-2 bg-gray-700/50 rounded-full" />
                                            </div>
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 1 }}
                                                className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between"
                                            >
                                                <span className="text-xs text-green-400">Project Value</span>
                                                <span className="text-sm font-bold text-white">$24,000</span>
                                            </motion.div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeCase === 2 && (
                                <motion.div 
                                    key="investors"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    transition={{ duration: 0.4 }}
                                    className="w-full h-full flex items-center justify-center"
                                >
                                    {/* Investors: Portfolio Stack */}
                                    <div className="relative w-72 h-48">
                                        {[1, 2, 3].map((card, i) => (
                                            <motion.div
                                                key={i}
                                                className="absolute inset-0 bg-gray-900 border border-white/10 rounded-xl shadow-xl flex items-center justify-center"
                                                initial={{ y: 0, scale: 1 - i * 0.05, opacity: 0.5 }}
                                                animate={{ 
                                                    y: -i * 15, 
                                                    scale: 1 - i * 0.05,
                                                    opacity: 1 - i * 0.2,
                                                    zIndex: 3 - i 
                                                }}
                                                transition={{ delay: i * 0.2 }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${i === 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'}`}>
                                                        <BarChart3 className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="h-2 w-20 bg-gray-700 rounded-full mb-2" />
                                                        <div className="h-2 w-12 bg-gray-800 rounded-full" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                        <motion.div 
                                            className="absolute -right-4 -bottom-4 bg-[#0a0a0a] border border-blue-500/50 p-3 rounded-xl shadow-lg shadow-blue-500/10 z-10"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 1, type: "spring" }}
                                        >
                                            <div className="text-xs text-gray-400">ROI</div>
                                            <div className="text-lg font-bold text-blue-400">+128%</div>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </section>
            
            {/* NEW: Bento Grid Feature Section */}
            <BentoGrid />
            
            <StatsSection />
            
            {/* NEW: Enhanced Animated Testimonials Carousel */}
            <AnimatedTestimonials />
            
            <CTASection />
            
            {/* NEW: Interactive Product Tour Modal */}
            <ProductTour 
                isOpen={isTourOpen} 
                onClose={closeTour} 
                onComplete={completeTour}
            />
        </div>
    );
};

export default HomePage;