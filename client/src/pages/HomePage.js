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

// Color palette - sophisticated warm tones replacing purple/cyan
const colors = {
  // Base
  black: '#000000',
  white: '#FFFFFF',
  
  // Warm accent colors - sophisticated, not "vibe coded"
  amber: '#D97706',      // Warm amber/gold for primary accents
  amberLight: '#F59E0B', // Lighter amber for highlights
  amberDark: '#92400E',  // Dark amber for depth
  
  rust: '#C2410C',       // Rust/terracotta for secondary accents
  rustLight: '#EA580C',  // Lighter rust
  
  sage: '#65A30D',       // Sage/olive green for tertiary accents
  sageDark: '#3F6212',   // Dark sage
  
  navy: '#1E3A5F',       // Deep navy for subtle depth
  
  // Text hierarchy
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',   // Warmer gray
  textMuted: '#71717A',       // Muted warm gray
  textSubtle: '#52525B',      // Subtle warm gray
  
  // Borders
  borderLight: 'rgba(255, 255, 255, 0.15)',
  borderMedium: 'rgba(255, 255, 255, 0.10)',
  borderSubtle: 'rgba(255, 255, 255, 0.05)',
};

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
      style={{ backgroundColor: colors.black }}
    >
      {/* Pure black background - brutalist aesthetic */}
      <div className="absolute inset-0" style={{ backgroundColor: colors.black }} />
      
      {/* Subtle warm gradient accent - top right corner only */}
      <div 
        className="absolute top-0 right-0 w-1/2 h-1/2 opacity-20 pointer-events-none"
        style={{ 
          background: `radial-gradient(circle at 100% 0%, ${colors.amber}20 0%, transparent 50%)`
        }}
      />
      
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
              className="text-5xl md:text-[7rem] font-black tracking-tighter leading-[0.9] uppercase"
              style={{ perspective: 1000, color: colors.textPrimary }}
            >
              <motion.span
                className="block text-2xl md:text-4xl font-mono mb-6 tracking-normal normal-case"
                style={{ color: colors.amber }}
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
                className="block"
                style={{ color: colors.textMuted }}
                variants={wordVariants}
              >
                Side Projects
              </motion.span>
            </motion.h1>
            
            {/* Description - raw, utilitarian with warm accent */}
            <motion.p
              className="text-lg md:text-xl max-w-xl leading-relaxed font-mono"
              style={{ color: colors.textSecondary }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
            >
              Marketplace for projects at every stage — from raw ideas to production-ready apps.<br/>
              <span style={{ color: colors.amber }}>No fluff. Just code.</span>
            </motion.p>
          </div>
            
          {/* CTA Buttons - brutalist, sharp edges, warm accent */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 items-start"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <Button
              size="lg"
              className="px-8 py-6 text-lg font-bold rounded-none border-2 transition-all duration-200"
              style={{ 
                backgroundColor: colors.amber, 
                color: colors.black,
                borderColor: colors.amber
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = colors.amber;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = colors.amber;
                e.target.style.color = colors.black;
              }}
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
              className="px-8 py-6 text-lg font-bold rounded-none transition-all duration-200"
              style={{ 
                border: `2px solid ${colors.borderLight}`, 
                color: colors.textPrimary,
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = colors.amber;
                e.target.style.color = colors.amber;
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = colors.borderLight;
                e.target.style.color = colors.textPrimary;
              }}
              onClick={() => navigate('/how-it-works')}
            >
              HOW IT WORKS
            </Button>
          </motion.div>
            
          {/* Trust badges - raw, list style with warm accents */}
          <motion.div
            className="flex flex-wrap gap-6 pt-8"
            style={{ borderTop: `1px solid ${colors.borderMedium}` }}
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
                className="flex items-center gap-2 font-mono text-sm"
                style={{ color: colors.textMuted }}
              >
                <item.icon className="w-4 h-4" style={{ color: colors.amber }} />
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
        <section 
          className="py-20 border-t"
          style={{ backgroundColor: colors.black, borderColor: colors.borderMedium }}
        >
            <div className="max-w-5xl mx-auto px-6">
                <motion.div
                    className="relative p-8 md:p-12"
                    style={{ border: `1px solid ${colors.borderLight}` }}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Warm accent corner */}
                    <div 
                      className="absolute top-0 left-0 w-16 h-16 pointer-events-none"
                      style={{
                        background: `linear-gradient(135deg, ${colors.amber}30 0%, transparent 50%)`
                      }}
                    />
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div>
                            <span 
                              className="text-xs font-mono uppercase tracking-wider"
                              style={{ color: colors.amber }}
                            >
                              Process
                            </span>
                            <h2 
                              className="text-3xl md:text-4xl font-black mt-2 uppercase tracking-tight"
                              style={{ color: colors.textPrimary }}
                            >
                                How It Works
                            </h2>
                            <p 
                              className="mt-4 font-mono text-sm leading-relaxed"
                              style={{ color: colors.textMuted }}
                            >
                                Search. Verify. Purchase. Transfer.<br/>
                                Four steps to your next project.
                            </p>
                        </div>
                        
                        <div className="flex justify-start md:justify-end">
                            <Button
                                onClick={() => navigate('/how-it-works')}
                                className="px-8 py-4 font-bold rounded-none border-2 transition-all duration-200"
                                style={{ 
                                  backgroundColor: colors.white, 
                                  color: colors.black,
                                  borderColor: colors.white
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.color = colors.white;
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = colors.white;
                                  e.target.style.color = colors.black;
                                }}
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
        <section 
          className="py-24 border-t"
          style={{ backgroundColor: colors.black, borderColor: colors.borderMedium }}
        >
            <div className="max-w-6xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                    {stats.map((stat, index) => (
                        <div 
                          key={stat.label} 
                          className="pl-4"
                          style={{ 
                            borderLeft: `2px solid ${index === 0 ? colors.amber : colors.borderMedium}` 
                          }}
                        >
                            <div 
                              className="text-4xl md:text-5xl font-black mb-1"
                              style={{ color: index === 0 ? colors.amber : colors.textPrimary }}
                            >
                                {isLoading ? (
                                    <span style={{ color: colors.textSubtle }}>...</span>
                                ) : (
                                    <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={stat.prefix || ''} />
                                )}
                            </div>
                            <p 
                              className="text-xs font-mono uppercase tracking-wider"
                              style={{ color: colors.textMuted }}
                            >
                              {stat.label}
                            </p>
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
        <section 
          className="py-24 border-t"
          style={{ backgroundColor: colors.black, borderColor: colors.borderMedium }}
        >
            <div className="max-w-6xl mx-auto px-6">
                <div className="mb-12">
                    <span 
                      className="text-xs font-mono uppercase tracking-wider"
                      style={{ color: colors.amber }}
                    >
                      Testimonials
                    </span>
                    <h2 
                      className="text-3xl md:text-4xl font-black mt-2 uppercase"
                      style={{ color: colors.textPrimary }}
                    >
                      What People Say
                    </h2>
                </div>
                <div 
                  className="grid md:grid-cols-3 gap-px"
                  style={{ backgroundColor: colors.borderMedium }}
                >
                    {testimonials.map((testimonial, index) => (
                        <div 
                          key={index} 
                          className="p-6"
                          style={{ backgroundColor: colors.black }}
                        >
                            <p 
                              className="text-sm leading-relaxed mb-6"
                              style={{ color: colors.textSecondary }}
                            >
                              "{testimonial.content}"
                            </p>
                            <div className="flex items-center gap-3">
                                <div 
                                  className="w-10 h-10 flex items-center justify-center text-xs font-mono"
                                  style={{ 
                                    backgroundColor: index === 0 ? colors.amber : colors.borderMedium,
                                    color: index === 0 ? colors.black : colors.textPrimary
                                  }}
                                >
                                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <p 
                                      className="font-bold text-sm"
                                      style={{ color: colors.textPrimary }}
                                    >
                                      {testimonial.name}
                                    </p>
                                    <p 
                                      className="text-xs font-mono"
                                      style={{ color: colors.textMuted }}
                                    >
                                      {testimonial.role}
                                    </p>
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
        <section 
          className="py-32 border-t"
          style={{ backgroundColor: colors.black, borderColor: colors.borderMedium }}
        >
            <div className="max-w-5xl mx-auto px-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                    <div>
                        <h2 
                          className="text-4xl md:text-6xl font-black uppercase tracking-tight"
                          style={{ color: colors.textPrimary }}
                        >
                          Ready?
                        </h2>
                        <p 
                          className="mt-4 font-mono text-sm"
                          style={{ color: colors.textMuted }}
                        >
                          Create an account. Start trading.
                        </p>
                    </div>
                    <Button
                        size="lg"
                        onClick={() => navigate('/register')}
                        className="px-8 py-6 font-bold rounded-none border-2 transition-all duration-200"
                        style={{ 
                          backgroundColor: colors.amber, 
                          color: colors.black,
                          borderColor: colors.amber
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                          e.target.style.color = colors.amber;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = colors.amber;
                          e.target.style.color = colors.black;
                        }}
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
    <section 
      className="py-24 border-t"
      style={{ backgroundColor: colors.black, borderColor: colors.borderMedium }}
    >
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-start">
            <div>
                <span 
                  className="text-xs font-mono uppercase tracking-wider"
                  style={{ color: colors.amber }}
                >
                  Concept
                </span>
                <h2 
                  className="text-3xl md:text-5xl font-black mt-2 uppercase tracking-tight"
                  style={{ color: colors.textPrimary }}
                >
                    Vibe Engineering
                </h2>
                <div 
                  className="space-y-6 leading-relaxed mt-8 font-mono text-sm"
                  style={{ color: colors.textSecondary }}
                >
                    <p style={{ color: colors.amber }}>
                        Logic is commodity. Vibe is currency.
                    </p>
                    <p>
                        Vibe Engineering is the capture of peak creative resonance. The art of coding at the speed of thought—harnessing AI to bypass boilerplate and lock onto the product's soul.
                    </p>
                    <ul 
                      className="space-y-4 mt-6 border-t pt-6"
                      style={{ borderColor: colors.borderMedium }}
                    >
                        <li className="flex items-start gap-3">
                            <span style={{ color: colors.amber }}>→</span>
                            <span>Kinetic Software: Trade projects with velocity, not just repositories.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span style={{ color: colors.amber }}>→</span>
                            <span>Architectural Intent: Acquire the spark, the vision.</span>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="relative">
                <div 
                  className="relative font-mono text-sm leading-relaxed"
                  style={{ 
                    backgroundColor: '#0a0a0a', 
                    border: `1px solid ${colors.borderLight}` 
                  }}
                >
                    {/* Terminal Header */}
                    <div 
                      className="flex items-center gap-2 px-4 py-3 border-b"
                      style={{ 
                        backgroundColor: colors.borderSubtle,
                        borderColor: colors.borderMedium
                      }}
                    >
                        <div className="flex gap-1.5">
                            <div 
                              className="w-3 h-3"
                              style={{ backgroundColor: colors.rust }}
                            />
                            <div 
                              className="w-3 h-3"
                              style={{ backgroundColor: colors.amber }}
                            />
                            <div 
                              className="w-3 h-3"
                              style={{ backgroundColor: colors.sage }}
                            />
                        </div>
                        <div 
                          className="ml-2 text-xs"
                          style={{ color: colors.textSubtle }}
                        >
                          terminal
                        </div>
                    </div>

                    {/* Terminal Content - brutalist */}
                    <div 
                      className="p-6 min-h-[280px]"
                      style={{ color: colors.textSecondary }}
                    >
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span style={{ color: colors.amber }}>$</span>
                                <span>git clone idea-to-reality</span>
                            </div>
                            <div style={{ color: colors.textSubtle }}>Cloning...</div>
                            <div className="pt-2 flex items-center gap-2">
                                <span style={{ color: colors.amber }}>$</span>
                                <span>npx inject-vibe</span>
                            </div>
                            <div 
                              className="space-y-1 pt-1 ml-4 pl-4 my-2"
                              style={{ borderLeft: `1px solid ${colors.borderMedium}` }}
                            >
                                <div style={{ color: colors.textMuted }}>
                                  Analyzing... <span style={{ color: colors.sage }}>Done</span>
                                </div>
                                <div style={{ color: colors.textMuted }}>
                                  Synthesizing... <span style={{ color: colors.sage }}>Done</span>
                                </div>
                                <div style={{ color: colors.textMuted }}>
                                  Optimizing... <span style={{ color: colors.sage }}>Done</span>
                                </div>
                            </div>
                            <div className="pt-4">
                                <div 
                                  className="p-3 flex items-center gap-3"
                                  style={{ 
                                    border: `1px solid ${colors.amber}`,
                                    color: colors.textPrimary
                                  }}
                                >
                                    <span className="text-xs" style={{ color: colors.amber }}>[OK]</span>
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
            accent: colors.amber,
        },
        {
            title: "Builders",
            description: "Sell side projects. Fund your next.",
            icon: Code,
            accent: colors.sage,
        },
        {
            title: "Investors",
            description: "Digital assets. Real returns.",
            icon: BarChart3,
            accent: colors.rust,
        }
    ];

    return (
        <section 
          className="py-24 border-t"
          style={{ backgroundColor: colors.black, borderColor: colors.borderMedium }}
        >
            <div className="max-w-6xl mx-auto px-6">
                <div className="mb-12">
                    <span 
                      className="text-xs font-mono uppercase tracking-wider"
                      style={{ color: colors.amber }}
                    >
                      Audience
                    </span>
                    <h2 
                      className="text-3xl md:text-4xl font-black mt-2 uppercase"
                      style={{ color: colors.textPrimary }}
                    >
                      Who It's For
                    </h2>
                </div>
                <div 
                  className="grid md:grid-cols-3 gap-px"
                  style={{ backgroundColor: colors.borderMedium }}
                >
                    {cases.map((item) => (
                        <div 
                          key={item.title} 
                          className="p-8 transition-colors group"
                          style={{ backgroundColor: colors.black }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = `${item.accent}10`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = colors.black;
                          }}
                        >
                            <item.icon 
                              className="w-8 h-8 mb-6 transition-colors" 
                              style={{ color: item.accent }}
                            />
                            <h3 
                              className="text-xl font-bold uppercase mb-2"
                              style={{ color: colors.textPrimary }}
                            >
                              {item.title}
                            </h3>
                            <p 
                              className="font-mono text-sm"
                              style={{ color: colors.textMuted }}
                            >
                              {item.description}
                            </p>
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
        <div 
          className="min-h-screen"
          style={{ backgroundColor: colors.black, color: colors.textPrimary }}
        >
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

