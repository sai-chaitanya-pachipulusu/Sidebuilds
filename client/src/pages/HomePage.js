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
      {/* Pure black background - brutalist aesthetic */}
      <div className="absolute inset-0 bg-black" />
      
      {/* No decorative glows - raw brutalist style */}
      
      <motion.div 
        className="relative z-10 max-w-5xl mx-auto px-6 text-left"
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
      >  
        <motion.div  
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-12"  
        >
          <div className="space-y-8">
            {/* Brutalist heading - raw, bold, left-aligned */}
            <motion.h1
              className="text-5xl md:text-[7rem] font-black tracking-tighter leading-[0.9] text-white uppercase"
              style={{ perspective: 1000 }}
            >
              <motion.span
                className="block text-white/60 text-2xl md:text-4xl font-mono mb-6 tracking-normal normal-case"
                variants={wordVariants}
              >
                SideBuilds /
              </motion.span>
              <motion.span
                className="block"
                variants={wordVariants}
              >
                Buy & Sell
              </motion.span>
              <motion.span
                className="block text-white/40"
                variants={wordVariants}
              >
                Side Projects
              </motion.span>
            </motion.h1>
            
            {/* Description - raw, utilitarian */}
            <motion.p
              className="text-lg md:text-xl text-gray-500 max-w-xl leading-relaxed font-mono"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
            >
              Marketplace for projects at every stage — from raw ideas to production-ready apps.<br/>
              No fluff. Just code.
            </motion.p>
          </div>
            
          {/* CTA Buttons - brutalist, sharp edges, monochrome */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 items-start"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <Button
              size="lg"
              className="px-8 py-6 text-lg font-bold bg-white text-black rounded-none border-2 border-white hover:bg-transparent hover:text-white transition-all duration-200"
              onClick={() => navigate(isAuthenticated ? '/marketplace' : '/register')}
            >
              <span className="flex items-center gap-2">
                ENTER MARKETPLACE
                <ArrowRight className="w-5 h-5" />
              </span>
            </Button>
              
            <Button
              size="lg"
              variant="outline"
              className="px-8 py-6 text-lg font-bold border-2 border-white/20 text-white rounded-none hover:border-white hover:bg-white/5 transition-all duration-200"
              onClick={() => navigate('/how-it-works')}
            >
              HOW IT WORKS
            </Button>
          </motion.div>
            
          {/* Trust badges - raw, list style */}
          <motion.div
            className="flex flex-wrap gap-6 pt-8 border-t border-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            {[
              { icon: Award, label: 'Verified Projects' },
              { icon: Shield, label: 'Secure Escrow' },
              { icon: Clock, label: '24h Support' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-gray-500 font-mono text-sm"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
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
        <section className="py-20 bg-black border-t border-white/10">
            <div className="max-w-5xl mx-auto px-6">
                <motion.div
                    className="relative border border-white/20 p-8 md:p-12"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div>
                            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Process</span>
                            <h2 className="text-3xl md:text-4xl font-black text-white mt-2 uppercase tracking-tight">
                                How It Works
                            </h2>
                            <p className="text-gray-500 mt-4 font-mono text-sm leading-relaxed">
                                Search. Verify. Purchase. Transfer.<br/>
                                Four steps to your next project.
                            </p>
                        </div>
                        
                        <div className="flex justify-start md:justify-end">
                            <Button
                                onClick={() => navigate('/how-it-works')}
                                className="px-8 py-4 bg-white text-black font-bold rounded-none border-2 border-white hover:bg-transparent hover:text-white transition-all duration-200"
                            >
                                READ MORE
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </div>
                    </div>
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
        { value: 0, label: 'Active Projects', suffix: '+', key: 'totalProjects' },
        { value: 0, label: 'Projects for Sale', suffix: '', key: 'projectsForSale' },
        { value: 0, label: 'Active Makers', suffix: '+', key: 'totalUsers' },
        { value: 0, label: 'Successful Sales', suffix: '+', key: 'successfulSales' },
        { value: 0, label: 'Total Volume', prefix: '$', suffix: 'K', key: 'totalVolume', isVolume: true },
    ]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';
                const response = await fetch(`${apiUrl}/public/marketplace/analytics`);
                if (response.ok) {
                    const data = await response.json();
                    setStats(prevStats => prevStats.map(stat => {
                        let value = data[stat.key] || 0;
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
        <section className="py-24 bg-black border-t border-white/10">
            <div className="max-w-6xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                    {stats.map((stat) => (
                        <div key={stat.label} className="border-l-2 border-white/20 pl-4">
                            <div className="text-4xl md:text-5xl font-black text-white mb-1">
                                {isLoading ? (
                                    <span className="text-gray-600">...</span>
                                ) : (
                                    <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={stat.prefix || ''} />
                                )}
                            </div>
                            <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">{stat.label}</p>
                        </div>
                    ))}
                </div>
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
        <section className="py-24 bg-black border-t border-white/10">
            <div className="max-w-6xl mx-auto px-6">
                <div className="mb-12">
                    <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Testimonials</span>
                    <h2 className="text-3xl md:text-4xl font-black text-white mt-2 uppercase">What People Say</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-px bg-white/10">
                    {testimonials.map((testimonial, index) => (
                        <div key={index} className="bg-black p-6">
                            <p className="text-gray-400 text-sm leading-relaxed mb-6">"{testimonial.content}"</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/10 flex items-center justify-center text-xs font-mono text-white">
                                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">{testimonial.name}</p>
                                    <p className="text-xs text-gray-500 font-mono">{testimonial.role}</p>
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
        <section className="py-32 bg-black border-t border-white/10">
            <div className="max-w-5xl mx-auto px-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                    <div>
                        <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tight">Ready?</h2>
                        <p className="text-gray-500 mt-4 font-mono text-sm">Create an account. Start trading.</p>
                    </div>
                    <Button
                        size="lg"
                        onClick={() => navigate('/register')}
                        className="px-8 py-6 bg-white text-black font-bold rounded-none border-2 border-white hover:bg-transparent hover:text-white transition-all duration-200"
                    >
                        GET STARTED <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
            </div>
        </section>
    );
});

// Optimized Vibe Coding Section
const VibeCodingSection = memo(() => (
    <section className="py-24 bg-black border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-start">
            <div>
                <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Concept</span>
                <h2 className="text-3xl md:text-5xl font-black text-white mt-2 uppercase tracking-tight">
                    Vibe Engineering
                </h2>
                <div className="space-y-6 text-gray-400 leading-relaxed mt-8 font-mono text-sm">
                    <p>
                        Logic is commodity. Vibe is currency.
                    </p>
                    <p>
                        Vibe Engineering is the capture of peak creative resonance. The art of coding at the speed of thought—harnessing AI to bypass boilerplate and lock onto the product's soul.
                    </p>
                    <ul className="space-y-4 mt-6 border-t border-white/10 pt-6">
                        <li className="flex items-start gap-3">
                            <span className="text-white">→</span>
                            <span>Kinetic Software: Trade projects with velocity, not just repositories.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-white">→</span>
                            <span>Architectural Intent: Acquire the spark, the vision.</span>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="relative">
                <div className="relative bg-[#0a0a0a] border border-white/20 font-mono text-sm leading-relaxed">
                    {/* Terminal Header */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 bg-white/20" />
                            <div className="w-3 h-3 bg-white/20" />
                            <div className="w-3 h-3 bg-white/20" />
                        </div>
                        <div className="ml-2 text-xs text-gray-600">terminal</div>
                    </div>

                    {/* Terminal Content - brutalist */}
                    <div className="p-6 text-gray-400 min-h-[280px]">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-white">$</span>
                                <span>git clone idea-to-reality</span>
                            </div>
                            <div className="text-gray-600">Cloning...</div>
                            <div className="pt-2 flex items-center gap-2">
                                <span className="text-white">$</span>
                                <span>npx inject-vibe</span>
                            </div>
                            <div className="space-y-1 pt-1 ml-4 border-l border-white/10 pl-4 my-2">
                                <div className="text-gray-500">Analyzing... <span className="text-white">Done</span></div>
                                <div className="text-gray-500">Synthesizing... <span className="text-white">Done</span></div>
                                <div className="text-gray-500">Optimizing... <span className="text-white">Done</span></div>
                            </div>
                            <div className="pt-4">
                                <div className="border border-white/20 text-white p-3 flex items-center gap-3">
                                    <span className="text-xs">[OK]</span>
                                    Project ready.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
));

// Use Cases Section - brutalist
const UseCasesSection = memo(() => {
    const cases = [
        {
            title: "Founders",
            description: "Acquire turnkey projects. Skip zero-to-one.",
            icon: Rocket,
        },
        {
            title: "Builders",
            description: "Sell side projects. Fund your next.",
            icon: Code,
        },
        {
            title: "Investors",
            description: "Digital assets. Real returns.",
            icon: BarChart3,
        }
    ];

    return (
        <section className="py-24 bg-black border-t border-white/10">
            <div className="max-w-6xl mx-auto px-6">
                <div className="mb-12">
                    <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Audience</span>
                    <h2 className="text-3xl md:text-4xl font-black text-white mt-2 uppercase">Who It's For</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-px bg-white/10">
                    {cases.map((item) => (
                        <div key={item.title} className="bg-black p-8 group hover:bg-white/5 transition-colors">
                            <item.icon className="w-8 h-8 text-white mb-6" />
                            <h3 className="text-xl font-bold text-white uppercase mb-2">{item.title}</h3>
                            <p className="text-gray-500 font-mono text-sm">{item.description}</p>
                        </div>
                    ))}
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
