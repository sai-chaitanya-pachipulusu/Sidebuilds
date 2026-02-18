import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../shadcn/ui/button';
import { ArrowRight, Award, Shield, Clock, Code, Users, Rocket, BarChart3, Zap, DollarSign, Globe, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';
import BentoGrid from '../components/BentoGrid';

// Color palette - sophisticated warm tones
const colors = {
  black: '#000000',
  white: '#FFFFFF',
  amber: '#D97706',
  amberLight: '#F59E0B',
  amberDark: '#92400E',
  rust: '#C2410C',
  rustLight: '#EA580C',
  sage: '#65A30D',
  sageDark: '#3F6212',
  navy: '#1E3A5F',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textSubtle: '#52525B',
  borderLight: 'rgba(255, 255, 255, 0.15)',
  borderMedium: 'rgba(255, 255, 255, 0.10)',
  borderSubtle: 'rgba(255, 255, 255, 0.05)',
};

// Hero Section
const HeroSection = memo(() => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.2 }
    }
  };

  const wordVariants = {
    hidden: { opacity: 0, y: 40, rotateX: -40 },
    visible: {
      opacity: 1, y: 0, rotateX: 0,
      transition: { type: "spring", damping: 20, stiffness: 100 }
    }
  };

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center"
      style={{ backgroundColor: colors.black }}
    >
      <div className="absolute inset-0" style={{ backgroundColor: colors.black }} />
      <div
        className="absolute top-0 right-0 w-1/2 h-1/2 opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle at 100% 0%, ${colors.amber}20 0%, transparent 50%)` }}
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
              <motion.span className="block" variants={wordVariants}>
                Buy &amp; Sell
              </motion.span>
              <motion.span
                className="block"
                style={{ color: colors.textMuted }}
                variants={wordVariants}
              >
                Side Projects
              </motion.span>
            </motion.h1>

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

          <motion.div
            className="flex flex-col sm:flex-row gap-4 items-start"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <Button
              size="lg"
              className="px-8 py-6 text-lg font-bold rounded-none border-2 transition-all duration-200"
              style={{ backgroundColor: colors.amber, color: colors.black, borderColor: colors.amber }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = colors.amber;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.amber;
                e.currentTarget.style.color = colors.black;
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
              style={{ border: `2px solid ${colors.borderLight}`, color: colors.textPrimary, backgroundColor: 'transparent' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.amber;
                e.currentTarget.style.color = colors.amber;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.borderLight;
                e.currentTarget.style.color = colors.textPrimary;
              }}
              onClick={() => navigate('/how-it-works')}
            >
              HOW IT WORKS
            </Button>
          </motion.div>

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

// How It Works CTA
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
          <div
            className="absolute top-0 left-0 w-16 h-16 pointer-events-none"
            style={{ background: `linear-gradient(135deg, ${colors.amber}30 0%, transparent 50%)` }}
          />
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider" style={{ color: colors.amber }}>
                Process
              </span>
              <h2 className="text-3xl md:text-4xl font-black mt-2 uppercase tracking-tight" style={{ color: colors.textPrimary }}>
                How It Works
              </h2>
              <p className="mt-4 font-mono text-sm leading-relaxed" style={{ color: colors.textMuted }}>
                Search. Verify. Purchase. Transfer.<br/>
                Four steps to your next project.
              </p>
            </div>
            <div className="flex justify-start md:justify-end">
              <Button
                onClick={() => navigate('/how-it-works')}
                className="px-8 py-4 font-bold rounded-none border-2 transition-all duration-200"
                style={{ backgroundColor: colors.white, color: colors.black, borderColor: colors.white }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = colors.white;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.white;
                  e.currentTarget.style.color = colors.black;
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

// Animated Counter
const AnimatedCounter = memo(({ value, suffix = '', prefix = '' }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 1500;
          const startTime = performance.now();
          const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(easeProgress * value));
            if (progress < 1) requestAnimationFrame(animate);
            else setCount(value);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, hasAnimated]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
});

// Stats Section
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
            if (stat.isVolume && value > 0) value = Math.round(value / 1000);
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
              style={{ borderLeft: `2px solid ${index === 0 ? colors.amber : colors.borderMedium}` }}
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
              <p className="text-xs font-mono uppercase tracking-wider" style={{ color: colors.textMuted }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

// Featured Projects Section - pulls real data from API
const FeaturedProjectsSection = memo(() => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';
        const response = await fetch(`${apiUrl}/public/marketplace?limit=3&sortBy=created_at&sortOrder=desc`);
        if (response.ok) {
          const data = await response.json();
          setProjects(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch featured projects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const formatPrice = (price) => {
    if (!price) return 'Make an offer';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(price);
  };

  const stageColors = {
    idea: colors.textMuted,
    planning: '#6366f1',
    mvp: colors.amber,
    development: '#14b8a6',
    launched: colors.sage,
    on_hold: colors.textSubtle,
  };

  if (loading) {
    return (
      <section className="py-24 border-t" style={{ backgroundColor: colors.black, borderColor: colors.borderMedium }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-12">
            <span className="text-xs font-mono uppercase tracking-wider" style={{ color: colors.amber }}>Marketplace</span>
            <h2 className="text-3xl md:text-4xl font-black mt-2 uppercase" style={{ color: colors.textPrimary }}>Latest Projects</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-px" style={{ backgroundColor: colors.borderMedium }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="p-6 animate-pulse" style={{ backgroundColor: colors.black }}>
                <div className="h-4 bg-white/10 rounded mb-3 w-3/4" />
                <div className="h-3 bg-white/5 rounded mb-2 w-full" />
                <div className="h-3 bg-white/5 rounded mb-2 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (projects.length === 0) return null;

  return (
    <section className="py-24 border-t" style={{ backgroundColor: colors.black, borderColor: colors.borderMedium }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-end justify-between mb-12">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider" style={{ color: colors.amber }}>Marketplace</span>
            <h2 className="text-3xl md:text-4xl font-black mt-2 uppercase" style={{ color: colors.textPrimary }}>Latest Projects</h2>
          </div>
          <Button
            onClick={() => navigate('/marketplace')}
            className="px-6 py-3 font-bold rounded-none border-2 transition-all duration-200 hidden md:flex items-center gap-2"
            style={{ backgroundColor: 'transparent', color: colors.textSecondary, borderColor: colors.borderLight }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.amber;
              e.currentTarget.style.color = colors.amber;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.borderLight;
              e.currentTarget.style.color = colors.textSecondary;
            }}
          >
            VIEW ALL <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-px" style={{ backgroundColor: colors.borderMedium }}>
          {projects.map((project, index) => (
            <motion.div
              key={project.project_id}
              className="p-6 cursor-pointer group transition-colors"
              style={{ backgroundColor: colors.black }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${colors.amber}08`; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.black; }}
              onClick={() => navigate(`/projects/${project.project_id}`)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-start justify-between mb-3">
                <span
                  className="text-xs font-mono uppercase tracking-wider px-2 py-1"
                  style={{
                    color: stageColors[project.stage?.toLowerCase()] || colors.textMuted,
                    border: `1px solid ${stageColors[project.stage?.toLowerCase()] || colors.borderMedium}30`,
                    backgroundColor: `${stageColors[project.stage?.toLowerCase()] || colors.textMuted}10`
                  }}
                >
                  {project.stage || 'idea'}
                </span>
                <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: colors.amber }} />
              </div>

              <h3 className="text-lg font-bold mb-2 uppercase" style={{ color: colors.textPrimary }}>
                {project.name}
              </h3>
              <p className="text-sm font-mono leading-relaxed mb-4 line-clamp-2" style={{ color: colors.textMuted }}>
                {project.description || 'No description provided.'}
              </p>

              <div className="flex items-center justify-between pt-4" style={{ borderTop: `1px solid ${colors.borderSubtle}` }}>
                <span className="text-lg font-black" style={{ color: index === 0 ? colors.amber : colors.textPrimary }}>
                  {formatPrice(project.sale_price)}
                </span>
                {project.monthly_revenue > 0 && (
                  <span className="text-xs font-mono" style={{ color: colors.sage }}>
                    ${project.monthly_revenue.toLocaleString()}/mo
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 flex md:hidden">
          <Button
            onClick={() => navigate('/marketplace')}
            className="w-full px-6 py-3 font-bold rounded-none border-2 transition-all duration-200 flex items-center justify-center gap-2"
            style={{ backgroundColor: 'transparent', color: colors.textSecondary, borderColor: colors.borderLight }}
          >
            VIEW ALL PROJECTS <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
});

// Vibe Coding Section
const VibeCodingSection = memo(() => (
  <section
    className="py-24 border-t"
    style={{ backgroundColor: colors.black, borderColor: colors.borderMedium }}
  >
    <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-start">
      <div>
        <span className="text-xs font-mono uppercase tracking-wider" style={{ color: colors.amber }}>Concept</span>
        <h2 className="text-3xl md:text-5xl font-black mt-2 uppercase tracking-tight" style={{ color: colors.textPrimary }}>
          Vibe Engineering
        </h2>
        <div className="space-y-6 leading-relaxed mt-8 font-mono text-sm" style={{ color: colors.textSecondary }}>
          <p style={{ color: colors.amber }}>Logic is commodity. Vibe is currency.</p>
          <p>
            Vibe Engineering is the capture of peak creative resonance. The art of coding at the speed of thought—harnessing AI to bypass boilerplate and lock onto the product's soul.
          </p>
          <ul className="space-y-4 mt-6 border-t pt-6" style={{ borderColor: colors.borderMedium }}>
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
          style={{ backgroundColor: '#0a0a0a', border: `1px solid ${colors.borderLight}` }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3 border-b"
            style={{ backgroundColor: colors.borderSubtle, borderColor: colors.borderMedium }}
          >
            <div className="flex gap-1.5">
              <div className="w-3 h-3" style={{ backgroundColor: colors.rust }} />
              <div className="w-3 h-3" style={{ backgroundColor: colors.amber }} />
              <div className="w-3 h-3" style={{ backgroundColor: colors.sage }} />
            </div>
            <div className="ml-2 text-xs" style={{ color: colors.textSubtle }}>terminal</div>
          </div>
          <div className="p-6 min-h-[280px]" style={{ color: colors.textSecondary }}>
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
              <div className="space-y-1 pt-1 ml-4 pl-4 my-2" style={{ borderLeft: `1px solid ${colors.borderMedium}` }}>
                <div style={{ color: colors.textMuted }}>Analyzing... <span style={{ color: colors.sage }}>Done</span></div>
                <div style={{ color: colors.textMuted }}>Synthesizing... <span style={{ color: colors.sage }}>Done</span></div>
                <div style={{ color: colors.textMuted }}>Optimizing... <span style={{ color: colors.sage }}>Done</span></div>
              </div>
              <div className="pt-4">
                <div className="p-3 flex items-center gap-3" style={{ border: `1px solid ${colors.amber}`, color: colors.textPrimary }}>
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

// Use Cases Section
const UseCasesSection = memo(() => {
  const navigate = useNavigate();
  const cases = [
    { title: "Founders", description: "Acquire turnkey projects. Skip zero-to-one.", icon: Rocket, accent: colors.amber, cta: "Browse Projects", path: "/marketplace" },
    { title: "Builders", description: "Sell side projects. Fund your next.", icon: Code, accent: colors.sage, cta: "List a Project", path: "/create" },
    { title: "Investors", description: "Digital assets. Real returns.", icon: BarChart3, accent: colors.rust, cta: "Explore Deals", path: "/marketplace" },
  ];

  return (
    <section
      className="py-24 border-t"
      style={{ backgroundColor: colors.black, borderColor: colors.borderMedium }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-12">
          <span className="text-xs font-mono uppercase tracking-wider" style={{ color: colors.amber }}>Audience</span>
          <h2 className="text-3xl md:text-4xl font-black mt-2 uppercase" style={{ color: colors.textPrimary }}>
            Who It's For
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-px" style={{ backgroundColor: colors.borderMedium }}>
          {cases.map((item) => (
            <div
              key={item.title}
              className="p-8 transition-colors group cursor-pointer"
              style={{ backgroundColor: colors.black }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${item.accent}10`; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.black; }}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="w-8 h-8 mb-6 transition-colors" style={{ color: item.accent }} />
              <h3 className="text-xl font-bold uppercase mb-2" style={{ color: colors.textPrimary }}>{item.title}</h3>
              <p className="font-mono text-sm mb-6" style={{ color: colors.textMuted }}>{item.description}</p>
              <span
                className="text-xs font-mono uppercase tracking-wider flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: item.accent }}
              >
                {item.cta} <ArrowRight className="w-3 h-3" />
              </span>
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
  const { isAuthenticated } = useAuth();
  return (
    <section
      className="py-32 border-t"
      style={{ backgroundColor: colors.black, borderColor: colors.borderMedium }}
    >
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight" style={{ color: colors.textPrimary }}>
              Ready?
            </h2>
            <p className="mt-4 font-mono text-sm" style={{ color: colors.textMuted }}>
              {isAuthenticated ? 'Browse the marketplace or list your project.' : 'Create an account. Start trading.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {isAuthenticated ? (
              <>
                <Button
                  size="lg"
                  onClick={() => navigate('/marketplace')}
                  className="px-8 py-6 font-bold rounded-none border-2 transition-all duration-200"
                  style={{ backgroundColor: colors.amber, color: colors.black, borderColor: colors.amber }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = colors.amber; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.amber; e.currentTarget.style.color = colors.black; }}
                >
                  BROWSE <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  onClick={() => navigate('/create')}
                  className="px-8 py-6 font-bold rounded-none border-2 transition-all duration-200"
                  style={{ backgroundColor: 'transparent', color: colors.white, borderColor: colors.borderLight }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.white; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.borderLight; }}
                >
                  LIST PROJECT
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                onClick={() => navigate('/register')}
                className="px-8 py-6 font-bold rounded-none border-2 transition-all duration-200"
                style={{ backgroundColor: colors.amber, color: colors.black, borderColor: colors.amber }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = colors.amber; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.amber; e.currentTarget.style.color = colors.black; }}
              >
                GET STARTED <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});

// Main HomePage Component
const HomePage = () => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.black, color: colors.textPrimary }}>
      <SEO
        title="SideBuilds - Buy & Sell Side Projects"
        description="The marketplace for side projects at every stage. Buy, sell, and showcase production-ready apps. Verified projects, secure escrow, real revenue data."
      />
      <HeroSection />
      <StatsSection />
      <HowItWorksCTA />
      <FeaturedProjectsSection />
      <BentoGrid />
      <VibeCodingSection />
      <UseCasesSection />
      <CTASection />
    </div>
  );
};

export default HomePage;
