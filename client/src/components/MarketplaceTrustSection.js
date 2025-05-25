import React from 'react';
import './MarketplaceTrustSection.css';
import { motion } from 'framer-motion'; // For animations
import { Button } from '../shadcn/ui/button'; // Import Shadcn button
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../shadcn/ui/card'; // Import Shadcn card
import { Badge } from '../shadcn/ui/badge'; // Import Shadcn badge

const MarketplaceTrustSection = () => {
  // Data for the trust cards - using original content
  const trustBadges = [
    {
      title: 'Verified Sellers',
      description: 'All sellers undergo identity verification and maintain a proven track record.',
      logo: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5"/>
          <circle cx="12" cy="12" r="10"/>
        </svg>
      )
    },
    {
      title: 'Project Verification',
      description: 'Key metrics, revenue claims, and technical aspects are thoroughly validated.',
      logo: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      )
    },
    {
      title: '7-Day Guarantee',
      description: "Receive a full refund within 7 days if assets don't match the description.",
      logo: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"/>
          <path d="M18.5 16l2.5-2.5-2.5-2.5"/>
          <path d="M12.5 14H21"/>
          <path d="M21 12H7a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2"/>
          <path d="M12 18H7"/>
        </svg>
      )
    },
    {
      title: 'Secure Transfer',
      description: 'Comprehensive guidance for code, domain, and asset transfer is included.',
      logo: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <path d="M12 11V3"/>
          <path d="m19 9-7 4-7-4"/>
        </svg>
      )
    }
  ];

  // Stats inspired by Aino.agency
  const stats = [
    { value: '100+', label: 'Projects Sold' },
    { value: '98%', label: 'Satisfaction Rate' },
    { value: '24/7', label: 'Support Available' }
  ];

  return (
    <section className="marketplace-trust-section bg-black text-white">
      <div className="trust-section-container">
        <div className="trust-header">
          <motion.h2 
            className="trust-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Why Trust Our Marketplace
          </motion.h2>
          <motion.p 
            className="section-subheading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Trusted by our community for secure and reliable project acquisition and sales.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button 
              variant="link" 
              className="section-cta-link" 
              onClick={() => window.location.href="/process"}
            >
              Learn more about our process <span className="arrow">→</span>
            </Button>
          </motion.div>
        </div>
        
        {/* Stats section inspired by Aino.agency */}
        <motion.div 
          className="stats-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {stats.map((stat, index) => (
            <div className="stat-item" key={index}>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        <motion.div 
          className="trust-badges-grid"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {trustBadges.map((badge, index) => (
            <Card className="trust-badge" key={index}>
              <div className="badge-icon-container">
                <div className="badge-icon">
                  {badge.logo}
                </div>
                <Badge variant="outline" className="trust-badge-tag">Core Feature</Badge>
              </div>
              <CardHeader className="badge-header">
                <CardTitle className="badge-title">{badge.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="badge-description">
                  {badge.description}
                </CardDescription>
              </CardContent>
              <CardFooter className="badge-footer">
                {/* Removed the 'Read more' button */}
              </CardFooter>
            </Card>
          ))}
        </motion.div>
        
        <motion.div 
          className="secure-payment-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="secure-payment-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <p className="secure-payment-text">Transactions are securely processed via Stripe. We never store your card details.</p>
        </motion.div>
        
        {/* Call to action section inspired by Aino.agency */}
        <motion.div 
          className="cta-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <h3 className="cta-title">Ready to find your next project?</h3>
          <p className="cta-description">Browse our marketplace for high-quality, verified digital assets.</p>
          <div className="cta-buttons">
            <Button className="cta-button primary" onClick={() => window.location.href="/marketplace"}>
              Explore Marketplace
            </Button>
            <Button variant="outline" className="cta-button secondary" onClick={() => window.location.href="/contact"}>
              Contact Us
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default MarketplaceTrustSection; 