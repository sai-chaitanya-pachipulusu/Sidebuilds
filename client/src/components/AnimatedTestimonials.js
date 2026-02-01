import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * AnimatedTestimonials - Brutalist testimonial carousel
 * Minimal, raw, no decorative elements
 */
const AnimatedTestimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Founder @ TechFlow",
      content: "Sold my SaaS in 2 weeks. The verification gave buyers confidence. Transfer was seamless.",
    },
    {
      name: "Marcus Johnson",
      role: "Serial Entrepreneur",
      content: "Found the perfect project to accelerate our startup. Revenue was exactly as advertised.",
    },
    {
      name: "Emily Rodriguez",
      role: "Indie Maker",
      content: "The escrow service gave me complete peace of mind. Everything handled professionally.",
    },
    {
      name: "David Park",
      role: "Tech Lead @ Innovate",
      content: "Acquired 3 projects through SideBuilds. Code quality analysis saved us from issues.",
    },
    {
      name: "Priya Sharma",
      role: "Solo Developer",
      content: "AI valuation was instant. Connected with serious buyers within days.",
    }
  ];

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0
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

  // Auto-play
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      nextSlide();
    }, 6000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, nextSlide]);

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-24 bg-black border-t border-white/10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-12">
          <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Reviews</span>
          <h2 className="text-3xl md:text-4xl font-black text-white mt-2 uppercase">From Users</h2>
        </div>
        
        {/* Testimonial Card */}
        <div 
          className="relative max-w-3xl"
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
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div className="border border-white/20 p-8 md:p-12">
                {/* Content */}
                <p className="text-xl md:text-2xl text-gray-300 leading-relaxed mb-8 font-light">
                  "{currentTestimonial.content}"
                </p>
                
                {/* Author */}
                <div className="flex items-center gap-4 border-t border-white/10 pt-6">
                  <div className="w-12 h-12 bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                    {currentTestimonial.avatar || currentTestimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="text-white font-bold uppercase">{currentTestimonial.name}</h4>
                    <p className="text-gray-500 font-mono text-xs">{currentTestimonial.role}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={prevSlide}
              className="w-12 h-12 border border-white/20 flex items-center justify-center text-white hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              className="w-12 h-12 border border-white/20 flex items-center justify-center text-white hover:bg-white/5 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="flex items-center ml-4 gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setDirection(index > currentIndex ? 1 : -1);
                    setCurrentIndex(index);
                  }}
                  className={`w-2 h-2 transition-all duration-200 ${
                    index === currentIndex 
                      ? 'bg-white w-6' 
                      : 'bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnimatedTestimonials;
