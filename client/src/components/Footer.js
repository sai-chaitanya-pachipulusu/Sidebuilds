import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin, MessageCircle } from 'lucide-react';
import Logo from './Logo';

const Footer = () => {
  const footerSections = {
    platform: [
      { label: 'Marketplace', to: '/marketplace' },
      { label: 'How it Works', to: '/how-it-works' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'About', to: '/about' },
      { label: 'Contact', to: '/contact' },
      { label: 'Blog', to: '/blog' },
    ],
    legal: [
      { label: 'Terms of Service', to: '/terms' },
      { label: 'Privacy Policy', to: '/terms' },
      { label: 'FAQ', to: '/faq' },
    ]
  };

  const socialLinks = [
    { icon: Github, href: 'https://github.com/sidebuilds', label: 'GitHub' },
    { icon: Twitter, href: 'https://twitter.com/sidebuilds', label: 'Twitter' },
    { icon: Linkedin, href: 'https://linkedin.com/company/sidebuilds', label: 'LinkedIn' },
    { icon: MessageCircle, href: 'https://discord.gg/sidebuilds', label: 'Discord' }
  ];

  return (
    <footer className="bg-black border-t-2 border-white/20">
      <div className="max-w-6xl mx-auto px-6 py-16">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          
          {/* Brand section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Logo size={32} />
              <span className="text-white font-bold text-lg uppercase tracking-tight font-mono">SideBuilds</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed font-mono">
              Marketplace for side projects.<br/>No fluff. Just code.
            </p>
          </div>

          {/* Navigation sections */}
          <div className="grid grid-cols-2 gap-8">
            {Object.entries(footerSections).map(([category, links]) => (
              <div key={category}>
                <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4 font-mono">
                  {category}
                </h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-gray-500 hover:text-white transition-colors text-xs font-mono block uppercase tracking-wider"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Social section */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4 font-mono">
              Connect
            </h4>
            
            <div className="flex items-center gap-0">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 border border-white/20 flex items-center justify-center text-gray-400 hover:text-white hover:border-white hover:bg-white/5 transition-all -ml-px first:ml-0"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>

            <div className="mt-6">
              <p className="text-gray-600 text-xs font-mono uppercase tracking-wider mb-2">Support</p>
              <a
                href="mailto:support@sidebuilds.space"
                className="text-gray-500 hover:text-white transition-colors text-xs font-mono"
              >
                support@sidebuilds.space
              </a>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="border-t-2 border-white/20 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            <div className="flex items-center gap-2 text-gray-600 text-xs font-mono uppercase tracking-wider">
              <span>© 2025 SideBuilds</span>
              <span>/</span>
              <span>v2.0.0</span>
            </div>

            <div className="text-gray-600 text-xs font-mono uppercase tracking-wider">
              Built by Sai Chaitanya
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
