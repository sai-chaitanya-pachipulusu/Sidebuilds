import React from 'react';
import './MarketplaceTrustSection.css';

const MarketplaceTrustSection = () => {
  return (
    <div className="marketplace-trust-section">
      <h3 className="trust-title">Why Trust Our Marketplace</h3>
      
      <div className="trust-badges-grid">
        <div className="trust-badge">
          <div className="badge-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="badge-content">
            <h4>Verified Sellers</h4>
            <p>All sellers must complete identity verification and have a proven track record.</p>
          </div>
        </div>

        <div className="trust-badge">
          <div className="badge-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M7.835 4.697A3.42 3.42 0 001.12 9.32a3.42 3.42 0 105.737 2.245 3.42 3.42 0 01.967-2.68 3.42 3.42 0 016.18-.104 3.42 3.42 0 01.952 2.784 3.42 3.42 0 105.738-2.245 3.42 3.42 0 00-6.768-4.624 3.42 3.42 0 01-2.856.045 3.42 3.42 0 01-2.454 0 3.42 3.42 0 01-1.781-1.044z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="badge-content">
            <h4>Project Verification</h4>
            <p>We verify key metrics, revenue claims, and technical aspects of each project.</p>
          </div>
        </div>
        
        <div className="trust-badge">
          <div className="badge-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3V7M3 7H7M3 7L7 3M21 3V7M21 7H17M21 7L17 3M3 21V17M3 17H7M3 17L7 21M21 21V17M21 17H17M21 17L17 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="badge-content">
            <h4>7-Day Guarantee</h4>
            <p>If project assets don't match the description, receive a full refund within 7 days.</p>
          </div>
        </div>
        
        <div className="trust-badge">
          <div className="badge-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15V3M12 15L8 11M12 15L16 11M3 12V15C3 16.6569 4.34315 18 6 18H18C19.6569 18 21 16.6569 21 15V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 17V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="badge-content">
            <h4>Secure Transfer</h4>
            <p>Complete code, domain, and asset transfer guidance included with every purchase.</p>
          </div>
        </div>
      </div>
      
      <div className="secure-payment-notice">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p>All transactions on SideBuilds are processed securely via Stripe with encrypted payment information. We never store your card details.</p>
      </div>
    </div>
  );
};

export default MarketplaceTrustSection; 