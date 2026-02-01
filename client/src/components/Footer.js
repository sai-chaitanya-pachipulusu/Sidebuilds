import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin, Heart, Mail, MapPin, MessageCircle } from 'lucide-react';
import Logo from './Logo';

const Footer = () => {
  const footerSections = {
    studio: [
      { label: 'Marketplace', to: '/marketplace' },
      { label: 'How it Works', to: '/how-it-works' },
      { label: 'About', to: '/about' },
      { label: 'Contact', to: '/contact' }
    ],
    legal: [
      { label: 'Terms', to: '/terms' },
      { label: 'Privacy', to: '/privacy' },
      { label: 'Security', to: '/security' }
    ]
  };

  const socialLinks = [
    { icon: Github, href: 'https://github.com/sidebuilds', label: 'GitHub' },
    { icon: Twitter, href: 'https://twitter.com/sidebuilds', label: 'Twitter' },
    { icon: Linkedin, href: 'https://linkedin.com/company/sidebuilds', label: 'LinkedIn' },
    { icon: MessageCircle, href: 'https://discord.gg/sidebuilds', label: 'Discord' }
  ];

  return (
    <footer className="relative bg-black/95 border-t border-gray-800/30">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Top section - inspired by antfood.com layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-12">
          
          {/* Brand section */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3 mb-6">
              <Logo size={40} />
              <span className="text-white font-bold text-xl tracking-tight">SideBuilds</span>
            </div>
            <p className="text-gray-300 text-lg leading-relaxed mb-8 max-w-md">
              The creative marketplace where side projects find their perfect match. Building the future, one project at a time.
            </p>
            
            {/* Contact info - antfood.com style */}
            {/*<div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-400">
                <FiMail className="w-4 h-4" />
                <span className="text-sm">hello@sidebuilds.space</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <FiMapPin className="w-4 h-4" />
                <span className="text-sm">San Francisco, CA</span>
              </div>
            </div>*/}
          </div>

          {/* Navigation sections */}
          <div className="lg:col-span-4">
            <div className="grid grid-cols-2 gap-8">
              {Object.entries(footerSections).map(([category, links]) => (
                <div key={category}>
                  <h4 className="text-white font-medium text-sm uppercase tracking-wider mb-6">
                    {category}
                  </h4>
                  <ul className="space-y-4">
                    {links.map((link) => (
                      <li key={link.label}>
                        <Link
                          to={link.to}
                          className="text-gray-400 hover:text-white transition-colors duration-300 text-sm block"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Social & Status section */}
          <div className="lg:col-span-3">
            <h4 className="text-white font-medium text-sm uppercase tracking-wider mb-6">
              Connect
            </h4>
            
            {/* Social links */}
            <div className="flex items-center gap-3 mb-8">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 border border-gray-700 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-600 hover:bg-white/5 transition-all duration-300"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs font-medium">All systems operational</span>
            </div>
          </div>
        </div>

        {/* Bottom section - selemen.liqium.com inspired */}
        <div className="border-t border-gray-800/50 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Copyright */}
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span>© 2024 SideBuilds</span>
              <span className="w-1 h-1 bg-gray-600 rounded-full" />
              <span className="flex items-center gap-1">
                Made with <Heart className="w-3 h-3 text-red-500" /> by makers
              </span>
            </div>

            {/* Version & time */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>v2.0.0</span>
              <span className="w-1 h-1 bg-gray-600 rounded-full" />
              <span>{new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Subtle bottom accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-blue-600/30 to-transparent" />
    </footer>
  );
};

export default Footer;