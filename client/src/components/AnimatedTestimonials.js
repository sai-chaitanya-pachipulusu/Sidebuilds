import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';

/**
 * AnimatedTestimonials - Auto-playing carousel with smooth animations
 * Inspired by Resend and premium SaaS testimonial sections
 */
const AnimatedTestimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Founder @ TechFlow",
      avatar: "SC",
      content: "Sold my SaaS project in just 2 weeks. The AI valuation was spot-on, and the verification process gave buyers the confidence they needed. The escrow made the transfer completely seamless.",
      rating: 5,
      highlight: "Sold in 2 weeks",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      name: "Marcus Johnson",
      role: "Serial Entrepreneur",
      avatar: "MJ",
      content: "Found the perfect project to accelerate our startup. Revenue verification meant we knew exactly what we were buying. Best acquisition decision we've made.",
      rating: 5,
      highlight: "Revenue verified",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      name: "Emily Rodriguez",
      role: "Indie Maker",
      avatar: "ER",
      content: "The escrow service gave me complete peace of mind. I was nervous about selling my first project, but everything was handled professionally from start to finish.",
      rating: 5,
      highlight: "Stress-free sale",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      name: "David Park",
      role: "Tech Lead @ Innovate",
      avatar: "DP",
      content: "We've acquired 3 projects through SideBuilds. The code quality analysis saved us from potential issues, and the transfer process is incredibly smooth.",
      rating: 5,
      highlight: "3 acquisitions",
      gradient: "from-orange-500 to-yellow-500"
    },
    {
      name: "Priya Sharma",
      role: "Solo Developer",
      avatar: "PS",
      content: "As a solo developer, I didn't know how to value or sell my project. SideBuilds AI gave me an instant valuation and connected me with serious buyers within days.",
      rating: 5,
      highlight: "AI-powered valuation",
      gradient: "from-indigo-500 to-purple-500"
    }
  ];

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95
    })
  };

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  }, [testimonials.length]);

  const prevSlide = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToSlide = (index) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  // Auto-play
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, nextSlide]);

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-24 bg-[#000000] relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Loved by <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Makers</span> Worldwide
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Join thousands of entrepreneurs who've successfully bought and sold projects on our platform.
          </p>
        </motion.div>

        {/* Testimonial Card */}
        <div 
          className="relative max-w-3xl mx-auto"
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative"
            >
              <div className="relative p-8 md:p-12 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm">
                {/* Quote icon */}
                <div className={`absolute -top-4 -left-4 w-12 h-12 rounded-xl bg-gradient-to-br ${currentTestimonial.gradient} p-3 shadow-lg`}>
                  <Quote className="w-full h-full text-white" />
                </div>
                
                {/* Highlight badge */}
                <div className="flex justify-end mb-6">
                  <span className={`px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r ${currentTestimonial.gradient} text-white shadow-lg`}>
                    {currentTestimonial.highlight}
                  </span>
                </div>
                
                {/* Content */}
                <p className="text-xl md:text-2xl text-gray-200 leading-relaxed mb-8 font-light">
                  "{currentTestimonial.content}"
                </p>
                
                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${currentTestimonial.gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {currentTestimonial.avatar}
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-lg">{currentTestimonial.name}</h4>
                    <p className="text-gray-400">{currentTestimonial.role}</p>
                  </div>
                  <div className="ml-auto flex gap-1">
                    {[...Array(currentTestimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-16 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-16 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center gap-2 mt-8">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'w-8 bg-gradient-to-r from-purple-500 to-pink-500' 
                  : 'bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default AnimatedTestimonials;
