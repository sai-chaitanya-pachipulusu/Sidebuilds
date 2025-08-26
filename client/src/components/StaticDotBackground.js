import React from 'react';

// Static dot pattern background inspired by durin.com but enhanced for SideBuilds
const StaticDotBackground = () => {
  return (
    <div className="fixed inset-0 z-0">
      {/* Main black background */}
      <div className="absolute inset-0 bg-black" />
      
      {/* Primary dot pattern - small white dots */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Secondary dot pattern - purple accent dots */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(147,51,234,0.6) 1px, transparent 0)`,
          backgroundSize: '80px 80px',
          backgroundPosition: '20px 20px'
        }}
      />
      
      {/* Tertiary dot pattern - blue accent dots */}
      <div 
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59,130,246,0.5) 1px, transparent 0)`,
          backgroundSize: '120px 120px',
          backgroundPosition: '60px 60px'
        }}
      />
      
      {/* Subtle gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-blue-900/10" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-purple-900/5 to-transparent" />
      
      {/* Large decorative accent dots for visual interest */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400/40 rounded-full blur-sm animate-pulse" />
        <div className="absolute top-3/4 right-1/4 w-1.5 h-1.5 bg-blue-400/35 rounded-full blur-sm" />
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-pink-400/45 rounded-full blur-sm animate-pulse" />
        <div className="absolute top-1/3 left-2/3 w-1.5 h-1.5 bg-cyan-400/30 rounded-full blur-sm" />
        <div className="absolute bottom-1/4 left-1/2 w-1 h-1 bg-purple-300/40 rounded-full blur-sm animate-pulse" />
        <div className="absolute top-2/3 left-1/5 w-1.5 h-1.5 bg-indigo-400/35 rounded-full blur-sm" />
      </div>
      
      {/* Subtle noise texture overlay for depth */}
      <div 
        className="absolute inset-0 opacity-[0.02] mix-blend-screen"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
    </div>
  );
};

export default StaticDotBackground; 