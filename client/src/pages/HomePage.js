import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../shadcn/ui/button';
import { ArrowRight, Play, Award, Shield, Layers, Clock, Code, Users, Rocket, BarChart3, Command, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';
import { Card } from '../shadcn/ui/card';
import { Badge } from '../shadcn/ui/badge';

// Replicate Chronicle's dark, elegant, and animated style

const HeroSection = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      <div className="absolute inset-0 z-0 opacity-50">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-black" />
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />
        <motion.div   
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(147,51,234,0.12) 0%, transparent 70%)',
            right: '10%',  
            bottom: '20%',  
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.2, 0.12] }}
          transition={{ duration: 10, repeat: Infinity, delay: 2 }}
        />
      </div>
        
      <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">  
        <motion.div  
          initial={{ opacity: 0, y: 20 }}  
          animate={{ opacity: 1, y: 0 }}  
          transition={{ duration: 0.8 }}  
          className="space-y-8"  
        >
          <motion.div  
            initial={{ opacity: 0, scale: 0.9 }}  
            animate={{ opacity: 1, scale: 1 }}  
            transition={{ delay: 0.2 }}  
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 backdrop-blur-sm"  
          >  
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-purple-200">v2.0 Live Marketplace</span>
          </motion.div>
            
          <div className="space-y-4">
            <motion.h1 
              className="text-6xl md:text-8xl font-black tracking-tighter"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >  
              <span className="block text-white">The OS for</span>  
              <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">  
                Modern Makers.
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-light"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >  
              The premium marketplace where verified makers sell production-ready projects to ambitious builders.
            </motion.p>
          </div>
            
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
                  Get Started Free
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
            
          <motion.div 
            className="flex flex-wrap justify-center gap-8 mt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
          >  
            {[
              { icon: Award, label: 'Verified Projects' },
              { icon: Shield, label: 'Secure Escrow' },
              { icon: Clock, label: '24h Support' },
              { icon: Layers, label: 'Full Asset Transfer' }
            ].map((item, index) => (
              <motion.div 
                key={item.label}
                className="flex items-center gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + index * 0.1, duration: 0.5 }}
              >  
                <item.icon className="w-4 h-4 text-gray-400" />  
                <span className="text-sm text-gray-300 font-medium">{item.label}</span>  
              </motion.div>
            ))}
          </motion.div>
        </motion.div>  
      </div>  
    </section>  
  );  
};

const FeaturedOnSection = () => {
    const featuredLogos = [
        { name: 'Product Hunt', logo: () => <svg>...</svg> }, // Replace with actual SVG logos
        { name: 'Y Combinator', logo: () => <svg>...</svg> },
        { name: 'Indie Hackers', logo: () => <svg>...</svg> },
        { name: 'TechCrunch', logo: () => <svg>...</svg> },
        { name: 'GitHub', logo: () => <svg>...</svg> },
    ];

    return (
        <section className="py-12 bg-black">
            <div className="max-w-7xl mx-auto px-4 text-center">
                <p className="text-sm text-gray-500 mb-6">TRUSTED BY THE WORLD'S MOST AMBITIOUS MAKERS</p>
                <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
                    {featuredLogos.map(item => (
                        <div key={item.name} className="h-8 text-gray-400 fill-current">
                            {/* Placeholder for now */}
                            <span className="font-semibold">{item.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const HowItWorksSection = () => {
    const steps = [
        { 
            title: "Discover",
            description: "Browse a curated marketplace of high-potential projects, vetted for quality and transparency.",
            icon: Search
        },
        { 
            title: "Connect",
            description: "Engage directly with verified makers, ask questions, and negotiate terms in a secure environment.",
            icon: Users
        },
        { 
            title: "Acquire",
            description: "Finalize your purchase through our automated, escrow-backed system for a seamless and secure ownership transfer.",
            icon: Shield
        }
    ];

    return (
        <section className="py-24 bg-black">
            <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">A streamlined, secure process from discovery to ownership.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    {steps.map((step, index) => (
                        <div key={step.title} className="text-center">
                            <div className="flex justify-center mb-4">
                                <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                    <step.icon className="w-8 h-8 text-purple-400"/>
                                </div>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                            <p className="text-gray-400">{step.description}</p>
                        </div>
                    ))}
                </div>
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
    // ... (Hooks and other logic for HeroSection, etc.)

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

    // Features Data
    const features = [
        { icon: Shield, title: "Secure Escrow", description: "Bank-level encryption and automated fund release ensure every transaction is safe." },
        { icon: BarChart3, title: "Deep Analytics", description: "Get real-time insights into revenue, traffic, and user engagement." },
        { icon: Rocket, title: "Instant Transfers", description: "Our streamlined process transfers all project assets to you in minutes, not days." },
        { icon: Users, title: "Verified Community", description: "Connect with trusted makers and buyers in a curated, professional marketplace." },
        { icon: Command, title: "Command Menu", description: "Navigate the entire platform, search projects, and manage tasks without leaving your keyboard." },
        { icon: BarChart3, title: "Global Payouts", description: "With Stripe Connect, get paid out in your local currency, wherever you are." }
    ];

    return (
        <div className="bg-black text-white min-h-screen">
            <SEO
                title="SideBuilds - The Operating System for Modern Makers"
                description="Buy, sell, and showcase production-ready side projects. The premium marketplace for verified makers and ambitious builders."
            />
            <HeroSection />
            <FeaturedOnSection />
            <HowItWorksSection />
            
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
                                    className={`p-4 rounded-lg cursor-pointer transition-colors ${activeCase === index ? 'bg-purple-500/10' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <item.icon className={`w-6 h-6 ${activeCase === index ? 'text-purple-400' : 'text-gray-500'}`} />
                                        <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                                    </div>
                                    <p className="text-gray-400 mt-2 pl-10">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="h-[400px] rounded-2xl overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.img 
                                key={activeCase}
                                src={cases[activeCase].image}
                                alt={cases[activeCase].title}
                                className="w-full h-full object-cover"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            />
                        </AnimatePresence>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 bg-black">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <Badge variant="outline" className="text-purple-400 border-purple-400/50 mb-4">Core Features</Badge>
                        <h2 className="text-4xl font-bold text-white mb-4">Powerful, Yet Simple</h2>
                        <p className="text-lg text-gray-400">Everything you need, nothing you don't.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature) => (
                            <div key={feature.title} className="p-6 bg-gray-900/50 rounded-2xl border border-gray-800">
                                <div className="p-3 inline-block bg-purple-500/10 rounded-xl mb-4">
                                    <feature.icon className="w-6 h-6 text-purple-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                                <p className="text-gray-400">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            
            <TestimonialsSection />
            <CTASection />
        </div>
    );
};

export default HomePage;