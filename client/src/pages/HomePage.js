import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../shadcn/ui/button';
import { ArrowRight, Play, Award, Shield, Layers, Clock, Code, Users, Rocket, BarChart3, Search, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';
import { Badge } from '../shadcn/ui/badge';

// Premium UI Components
import BentoGrid from '../components/BentoGrid';
import AnimatedTestimonials from '../components/AnimatedTestimonials';

// Memoized components for performance
const MemoizedBentoGrid = memo(BentoGrid);
const MemoizedAnimatedTestimonials = memo(AnimatedTestimonials);

// Optimized Hero Section - removed mouse tracking effects
const HeroSection = memo(() => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const containerRef = useRef(null);

  // Scroll-based animations - passive, no mouse tracking
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

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

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center"
    >
      {/* Pure black background with subtle accent glows - Linear/Resend style */}
      <div className="absolute inset-0 bg-[#000000]" />
      
      {/* Static subtle top-center purple glow - no animation */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1400px] h-[800px] pointer-events-none bg-purple-500/5" />
      
      {/* Static secondary accent glow */}
      <div className="absolute top-20 right-[10%] w-[500px] h-[500px] pointer-events-none opacity-20 bg-purple-500/5" />

      {/* Subtle dot grid pattern - CSS only, no animation */}
      <div className="absolute inset-0 opacity-[0.02] bg-gray-900" />
        
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
                <span className="text-purple-400">
                  Vibe
                </span>
                <span className="relative inline-block">
                  <span className="line-through decoration-white/50 decoration-4 text-white/40">
                    Coded
                  </span>
                  <span className="absolute -top-[60%] left-0 text-purple-400 font-black">
                    Engineered
                  </span>
                </span>
                <span className="text-white">
                  ideas.
                </span>
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
            
          {/* CTA Buttons - simplified animations */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-14"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >  
            <Button
              size="lg"
              className="relative px-8 py-7 text-lg font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-2xl border-0 transition-all duration-300 hover:scale-105"
              onClick={() => navigate(isAuthenticated ? '/marketplace' : '/register')}  
            >  
              <span className="flex items-center gap-2">  
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </span>  
            </Button>  
              
            <Button  
              size="lg"  
              variant="outline"  
              className="px-8 py-7 text-lg font-semibold border-white/10 hover:border-purple-500/30 text-white rounded-xl backdrop-blur-xl bg-white/5 hover:bg-white/10 transition-all duration-300"  
              onClick={() => navigate('/how-it-works')}  
            >  
              <Play className="w-5 h-5 mr-2 fill-white" />  
              Watch Demo  
            </Button>  
          </motion.div>  
            
          {/* Trust badges - simplified, no hover animations */}
          <motion.div 
            className="flex flex-wrap justify-center gap-8 mt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >  
            {[
              { icon: Award, label: 'Verified Projects' },
              { icon: Shield, label: 'Secure Escrow' },
              { icon: Clock, label: '24h Support' },
              { icon: Layers, label: 'Full Asset Transfer' }
            ].map((item) => (
              <div 
                key={item.label}
                className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 transition-colors duration-200"
              >  
                <item.icon className="w-4 h-4 text-purple-400" />  
                <span className="text-sm text-gray-300 font-medium">{item.label}</span>  
              </div>
            ))}
          </motion.div>
        </motion.div>  
      </motion.div>  
    </section>  
  );
});

// Simple CTA card linking to the full How It Works page
const HowItWorksCTA = memo(() => {
    const navigate = useNavigate();
    
    return (
        <section className="py-20 bg-black relative overflow-hidden">
            <div className="max-w-4xl mx-auto px-4 relative z-10">
                <motion.div
                    className="relative bg-gray-900/80 border border-white/[0.08] rounded-3xl p-12 text-center overflow-hidden hover:border-purple-500/30 transition-all duration-500"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Icon cluster - simplified */}
                    <div className="flex justify-center gap-4 mb-8">
                        <div className="p-4 bg-purple-500 rounded-2xl shadow-lg shadow-purple-500/20">
                            <Search className="w-6 h-6 text-white" />
                        </div>
                        <div className="p-4 bg-violet-500 rounded-2xl shadow-lg shadow-violet-500/20 -mt-2">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div className="p-4 bg-green-500 rounded-2xl shadow-lg shadow-green-500/20">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 relative z-10">
                        Curious How It All Works?
                    </h2>
                    <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto relative z-10">
                        From discovering your perfect project to completing a secure transaction — 
                        learn the step-by-step process for both buyers and sellers.
                    </p>
                    
                    <Button
                        onClick={() => navigate('/how-it-works')}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 hover:scale-105"
                    >
                        See How It Works
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                </motion.div>
            </div>
        </section>
    );
});

// Optimized Animated Counter Component
const AnimatedCounter = memo(({ value, suffix = '', prefix = '' }) => {
    const [count, setCount] = useState(0);
    const [hasAnimated, setHasAnimated] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !hasAnimated) {
                    setHasAnimated(true);
                    // Use requestAnimationFrame for smooth animation
                    const duration = 1500;
                    const startTime = performance.now();
                    
                    const animate = (currentTime) => {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        
                        // Ease out cubic
                        const easeProgress = 1 - Math.pow(1 - progress, 3);
                        const current = Math.floor(easeProgress * value);
                        
                        setCount(current);
                        
                        if (progress < 1) {
                            requestAnimationFrame(animate);
                        } else {
                            setCount(value);
                        }
                    };
                    
                    requestAnimationFrame(animate);
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
});

// Optimized Stats Section
const StatsSection = memo(() => {
    const [stats, setStats] = useState([
        { value: 0, label: 'Active Projects', suffix: '+', color: 'text-purple-500', key: 'totalProjects' },
        { value: 0, label: 'Projects for Sale', suffix: '', color: 'text-pink-500', key: 'projectsForSale' },
        { value: 0, label: 'Active Makers', suffix: '+', color: 'text-orange-500', key: 'totalUsers' },
        { value: 0, label: 'Successful Sales', suffix: '+', color: 'text-violet-500', key: 'successfulSales' },
        { value: 0, label: 'Total Volume', prefix: '$', suffix: 'K', color: 'text-green-500', key: 'totalVolume', isVolume: true },
    ]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // Use backend API directly (proxy may not always be configured)
                const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';
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
            {/* Background grid - simplified */}
            <div className="absolute inset-0 opacity-5 bg-gray-900/30" />
            
            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <motion.div
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-8"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.5 }}
                >
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="text-center group"
                        >
                            <div className={`text-4xl md:text-5xl lg:text-6xl font-black ${stat.color} mb-2`}>
                                {isLoading ? (
                                    <span className="animate-pulse">...</span>
                                ) : (
                                    <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={stat.prefix || ''} />
                                )}
                            </div>
                            <p className="text-gray-400 font-medium">{stat.label}</p>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
});

// Simplified Testimonials Section
const TestimonialsSection = memo(() => {
    const testimonials = [
        { name: 'Sarah Chen', role: 'Founder @ TechFlow', content: 'Sold my project in just 2 weeks. The verification process gave buyers confidence, and the transfer was seamless.' },
        { name: 'Marcus Johnson', role: 'Developer @ BuildFast', content: 'Found the perfect project to accelerate our startup. Revenue was exactly as advertised. Highly recommend!' },
        { name: 'Emily Rodriguez', role: 'Indie Maker', content: 'The escrow service gave me peace of mind. Everything was handled professionally from start to finish.' },
    ];
    
    return (
        <section className="py-24 bg-gray-900/50">
            <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-white mb-4">Loved by Makers Worldwide</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <div key={index} className="bg-gray-900 border border-gray-800 p-6 rounded-lg">
                            <p className="text-gray-300 italic mb-6">"{testimonial.content}"</p>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-purple-500"></div>
                                <div>
                                    <p className="font-semibold text-white">{testimonial.name}</p>
                                    <p className="text-sm text-gray-400">{testimonial.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
});

// CTA Section
const CTASection = memo(() => {
    const navigate = useNavigate();
    return (
        <section className="py-32 text-center bg-black">
            <div className="max-w-4xl mx-auto px-4">
                <h2 className="text-5xl font-bold text-white mb-4">Ready to Join?</h2>
                <p className="text-xl text-gray-400 mb-8">Start building, buying, or selling today. Create an account to get started.</p>
                <Button size="lg" onClick={() => navigate('/register')} className="hover:scale-105 transition-transform">
                    Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
            </div>
        </section>
    );
});

// Optimized Vibe Coding Section
const VibeCodingSection = memo(() => (
    <section className="py-24 bg-gray-900 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
            <div>
                <Badge variant="outline" className="text-purple-400 border-purple-400/50 mb-6">Beyond Software 2.0</Badge>
                <h2 className="text-4xl font-bold text-white mb-6">
                    What is{' '}
                    <span className="text-purple-400">Vibe</span>
                    <span className="inline-flex items-center gap-2 ml-3 align-bottom">
                        <span className="relative inline-block">
                            <span className="line-through decoration-white/50 decoration-2 text-white/40 text-3xl">Coding</span>
                            <span className="absolute -top-[60%] left-0 text-3xl font-bold text-purple-400">Engineering</span>
                        </span>
                    </span>
                    ?
                </h2>
                <div className="space-y-6 text-lg text-gray-300 leading-relaxed">
                    <p>
                        <strong className="text-white">Logic is commodity. Vibe is currency.</strong>
                    </p>
                    <p>
                        <strong className="text-purple-400">Vibe Engineering</strong> is the capture of peak creative resonance. It is the art of coding at the speed of thought—harnessing AI to bypass boilerplate and lock onto the product's "soul": the immediate tactile utility and aesthetic that users crave.
                    </p>
                    <ul className="space-y-4 mt-6">
                        <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2.5" />
                            <span><strong>Kinetic Software:</strong> Trade projects that have velocity and user-love, not just static repositories.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2.5" />
                            <span><strong>Architectural Intent:</strong> Acquire the spark, the vision, and the "ghost in the machine." The implementation is just a detail.</span>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="relative">
                <div className="absolute inset-0 bg-purple-500/10 blur-3xl rounded-full" />
                <div className="relative bg-[#0d0d0d] border border-white/10 rounded-xl overflow-hidden shadow-2xl font-mono text-sm leading-relaxed">
                    {/* Terminal Header */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/50" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                            <div className="w-3 h-3 rounded-full bg-green-500/50" />
                        </div>
                        <div className="ml-2 text-xs text-gray-500">vibe-engine — zsh — 80x24</div>
                    </div>

                    {/* Terminal Content - simplified, no animations */}
                    <div className="p-6 text-gray-300 min-h-[300px]">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-purple-400">➜</span>
                                <span className="text-purple-400">~/projects</span>
                                <span className="text-gray-500">git clone idea-to-reality</span>
                            </div>
                            <div className="text-gray-500">Cloning into 'next-big-thing'...</div>
                            <div className="pt-2 flex items-center gap-2">
                                <span className="text-purple-400">➜</span>
                                <span className="text-purple-400">~/next-big-thing</span>
                                <span className="text-gray-200">npx <span className="text-yellow-400">inject-vibe@latest</span></span>
                            </div>
                            <div className="space-y-1 pt-1 ml-4 border-l-2 border-gray-800 pl-4 my-2">
                                <div className="text-gray-400">Analyzing market gaps... <span className="text-green-400">Done</span></div>
                                <div className="text-gray-400">Synthesizing aesthetic... <span className="text-green-400">Done</span></div>
                                <div className="text-gray-400">Optimizing user dopamine... <span className="text-green-400">Done</span></div>
                            </div>
                            <div className="pt-2">
                                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    VIBE_CHECK_PASSED: Project ready for momentum.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
));

// Use Cases Section - simplified
const UseCasesSection = memo(() => {
    const [activeCase, setActiveCase] = useState(0);
    const cases = [
        {
            title: "For Founders",
            description: "Acquire a turnkey project with existing traction to bypass the 'zero to one' phase and scale faster.",
            icon: Rocket,
        },
        {
            title: "For Builders",
            description: "Sell your completed side projects to fund your next venture or earn a return on your hard work.",
            icon: Code,
        },
        {
            title: "For Investors",
            description: "Discover and invest in a portfolio of promising, revenue-generating digital assets.",
            icon: BarChart3,
        }
    ];

    return (
        <section className="py-24 bg-gray-900/50">
            <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <h2 className="text-4xl font-bold text-white mb-6">Built for Every Ambition</h2>
                    <div className="space-y-4">
                        {cases.map((item, index) => (
                            <div 
                                key={item.title}
                                onMouseEnter={() => setActiveCase(index)}
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
                    <div className="absolute inset-0 bg-purple-500/5 mix-blend-overlay z-10" />
                    
                    <AnimatePresence mode="wait">
                        {activeCase === 0 && (
                            <motion.div 
                                key="founders"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="w-full h-full flex items-center justify-center"
                            >
                                <div className="text-center">
                                    <Rocket className="w-24 h-24 text-purple-500 mx-auto mb-4" />
                                    <p className="text-2xl font-bold text-white">Scale Faster</p>
                                    <p className="text-gray-400 mt-2">Skip the zero-to-one phase</p>
                                </div>
                            </motion.div>
                        )}

                        {activeCase === 1 && (
                            <motion.div 
                                key="builders"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="w-full h-full flex items-center justify-center"
                            >
                                <div className="text-center">
                                    <Code className="w-24 h-24 text-blue-500 mx-auto mb-4" />
                                    <p className="text-2xl font-bold text-white">Monetize Your Code</p>
                                    <p className="text-gray-400 mt-2">Turn side projects into revenue</p>
                                </div>
                            </motion.div>
                        )}

                        {activeCase === 2 && (
                            <motion.div 
                                key="investors"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="w-full h-full flex items-center justify-center"
                            >
                                <div className="text-center">
                                    <BarChart3 className="w-24 h-24 text-green-500 mx-auto mb-4" />
                                    <p className="text-2xl font-bold text-white">Smart Investments</p>
                                    <p className="text-gray-400 mt-2">Diversify with digital assets</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
});

// Main HomePage Component
const HomePage = () => {
    return (
        <div className="bg-black text-white min-h-screen">
            <SEO
                title="SideBuilds - Marketplace for Vibe Coded Apps"
                description="Buy, sell, and showcase production-ready side projects. The premium marketplace for verified makers and ambitious builders."
            />
            <HeroSection />
            <HowItWorksCTA />
            <VibeCodingSection />
            <UseCasesSection />
            <MemoizedBentoGrid />
            <StatsSection />
            <MemoizedAnimatedTestimonials />
            <TestimonialsSection />
            <CTASection />
        </div>
    );
};

export default HomePage;
