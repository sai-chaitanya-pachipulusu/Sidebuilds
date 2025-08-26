import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

const AnimatedBackground = ({ variant = 'constellation' }) => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animationFrameId

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const createParticles = (count = 100) => {
      const particles = []
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.6 + 0.2,
          twinkle: Math.random() * 0.02 + 0.01
        })
      }
      return particles
    }

    const drawConstellation = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Update and draw particles
      particles.forEach((particle, index) => {
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy
        
        // Update opacity for twinkling effect
        particle.opacity += particle.twinkle
        if (particle.opacity > 0.8 || particle.opacity < 0.2) {
          particle.twinkle *= -1
        }
        
        // Wrap around edges
        if (particle.x > canvas.width) particle.x = 0
        if (particle.x < 0) particle.x = canvas.width
        if (particle.y > canvas.height) particle.y = 0
        if (particle.y < 0) particle.y = canvas.height
        
        // Draw particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(147, 51, 234, ${particle.opacity})`
        ctx.fill()
        
        // Draw connections to nearby particles
        for (let j = index + 1; j < particles.length; j++) {
          const other = particles[j]
          const dx = particle.x - other.x
          const dy = particle.y - other.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < 100) {
            const opacity = (100 - distance) / 100 * 0.1
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(other.x, other.y)
            ctx.strokeStyle = `rgba(147, 51, 234, ${opacity})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      })
    }

    const drawDotGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const spacing = 40
      const dotSize = 1
      
      for (let x = 0; x < canvas.width; x += spacing) {
        for (let y = 0; y < canvas.height; y += spacing) {
          const opacity = Math.sin(Date.now() * 0.001 + x * 0.01 + y * 0.01) * 0.1 + 0.1
          ctx.beginPath()
          ctx.arc(x, y, dotSize, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
          ctx.fill()
        }
      }
    }

    let particles = []
    
    const animate = () => {
      if (variant === 'constellation') {
        drawConstellation()
      } else if (variant === 'dots') {
        drawDotGrid()
      }
      animationFrameId = requestAnimationFrame(animate)
    }

    // Initialize
    resizeCanvas()
    if (variant === 'constellation') {
      particles = createParticles(80)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      resizeCanvas()
      if (variant === 'constellation') {
        particles = createParticles(80)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [variant])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
    />
  )
}

export default AnimatedBackground