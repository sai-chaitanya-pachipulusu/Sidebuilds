// OptimizedConstellationBackground.js - Fixed and optimized particle system
import React, { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

const OptimizedConstellationBackground = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const isRunningRef = useRef(true);
  const particlesRef = useRef([]);

  // Throttled mouse movement for performance
  const handleMouseMove = useCallback((e) => {
    if (!isRunningRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Repel particles from mouse with reduced computation
    const particles = particlesRef.current;
    particles.forEach(particle => {
      const dx = particle.x - x;
      const dy = particle.y - y;
      const distance = dx * dx + dy * dy; // Skip sqrt for performance
      
      if (distance < 6400) { // 80px squared
        const force = (6400 - distance) / 6400;
        const normalizedDistance = Math.sqrt(distance);
        particle.x += (dx / normalizedDistance) * force * 1.5;
        particle.y += (dy / normalizedDistance) * force * 1.5;
      }
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Performance optimization
    ctx.imageSmoothingEnabled = false;

    // Particle class
    class Particle {
      constructor(width, height) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 1.2 + 0.3;
        this.speedX = (Math.random() - 0.5) * 0.2;
        this.speedY = (Math.random() - 0.5) * 0.2;
        this.opacity = Math.random() * 0.3 + 0.2;
        this.pulseSpeed = Math.random() * 0.01 + 0.005;
        this.pulsePhase = Math.random() * Math.PI * 2;
      }

      update(width, height) {
        if (!isRunningRef.current) return;
        
        this.x += this.speedX;
        this.y += this.speedY;

        // Wrap around edges
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        // Subtle pulsing
        this.pulsePhase += this.pulseSpeed;
        this.opacity = 0.15 + Math.sin(this.pulsePhase) * 0.1;
      }

      draw(ctx) {
        if (!isRunningRef.current) return;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147, 51, 234, ${this.opacity})`;
        ctx.fill();
      }
    }

    // Initialize canvas and particles
    const initSystem = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const particles = [];
      const particleCount = Math.min(Math.floor((canvas.width * canvas.height) / 25000), 50);
      
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(canvas.width, canvas.height));
      }
      
      particlesRef.current = particles;
    };

    // Draw connections between nearby particles
    const drawConnections = (ctx, particles, width, height) => {
      if (!isRunningRef.current) return;
      
      ctx.strokeStyle = 'rgba(147, 51, 234, 0.15)';
      ctx.lineWidth = 0.5;
      
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = dx * dx + dy * dy;

          if (distance < 8100) { // 90px squared
            const opacity = (8100 - distance) / 8100 * 0.15;
            ctx.strokeStyle = `rgba(147, 51, 234, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    // Animation loop
    const animate = () => {
      if (!isRunningRef.current) return;
      
      const particles = particlesRef.current;
      const { width, height } = canvas;
      
      // Clear with fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, width, height);
      
      // Update and draw particles
      particles.forEach(particle => {
        particle.update(width, height);
        particle.draw(ctx);
      });
      
      // Draw connections
      drawConnections(ctx, particles, width, height);
      
      animationRef.current = requestAnimationFrame(animate);
    };

    // Resize handler
    const handleResize = () => {
      if (!isRunningRef.current) return;
      initSystem();
    };

    // Initialize
    initSystem();
    
    // Event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    
    // Start animation
    animate();

    // Cleanup
    return () => {
      isRunningRef.current = false;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      particlesRef.current = [];
    };
  }, [handleMouseMove]);

  return (
    <motion.canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
    />
  );
};

export default OptimizedConstellationBackground; 