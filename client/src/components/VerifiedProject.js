import React from 'react';
import './VerifiedProject.css';

/**
 * Displays verification information for a project to build trust
 * 
 * @param {Object} props
 * @param {Object} props.project - The project data
 */
const VerifiedProject = ({ project }) => {
  // For demo purposes, we'll assume all projects for sale have been verified
  // In a real implementation, this would come from a verification service
  
  return (
    <div className="verified-project">
      <div className="verification-header">
        <div className="verification-badge">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Project Verified</span>
        </div>
        <div className="verification-date">
          Verified on {formatDate(project.updated_at)}
        </div>
      </div>
      
      <div className="verification-details">
        <h4>Verification Details</h4>
        <div className="verified-items">
          <div className="verified-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Ownership verified</span>
          </div>
          
          <div className="verified-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Code quality reviewed</span>
          </div>
          
          <div className="verified-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Revenue claims validated</span>
          </div>
          
          <div className="verified-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Domain transferable</span>
          </div>
        </div>
      </div>
      
      <div className="seller-info">
        <h4>About the Seller</h4>
        <div className="seller-details">
          <div className="seller-name">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{project.owner_username || 'Anonymous'}</span>
          </div>
          <div className="verified-seller">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Verified Seller</span>
          </div>
          <div className="seller-projects">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>5 Projects Sold</span>
          </div>
        </div>
      </div>
      
      <div className="guarantee-box">
        <div className="guarantee-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12L11 14L15 10M7.835 4.697A3.42 3.42 0 001.12 9.32a3.42 3.42 0 105.737 2.245 3.42 3.42 0 01.967-2.68 3.42 3.42 0 016.18-.104 3.42 3.42 0 01.952 2.784 3.42 3.42 0 105.738-2.245 3.42 3.42 0 00-6.768-4.624 3.42 3.42 0 01-2.856.045 3.42 3.42 0 01-2.454 0 3.42 3.42 0 01-1.781-1.044z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="guarantee-text">
          <h4>7-Day Money-Back Guarantee</h4>
          <p>This project is covered by our 7-day guarantee. If the project doesn't match the description or has critical issues, you'll receive a full refund.</p>
        </div>
      </div>
    </div>
  );
};

// Helper function to format dates
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export default VerifiedProject; 