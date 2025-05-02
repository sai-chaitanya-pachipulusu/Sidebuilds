import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

// Arrow icon for links
const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function HomePage() {
  return (
    <>
      <section className="hero">
        <h1>Side Project Tracker ⚒️</h1>
        <p className="subtitle">Less hassle, more hustle.</p>
        <Link to="/register" className="hero-btn">Get Started <ArrowIcon /></Link>
      </section>

      <div className="section-heading">ABOUT</div>
      <p>
        Track, organize, and share your side projects. With SideBuilds, you can manage 
        all your ideas in one place, monitor their progress, and even monetize 
        them when they're ready.
      </p>
      <p>
        Perfect for developers, entrepreneurs, and creators who juggle multiple projects 
        and want to turn unfinished ideas into finished products.
      </p>

      <div className="section-heading">FEATURES</div>
      <div className="feature-card">
        <h3>Project Dashboard</h3>
        <p>Keep all your side projects organized with status tracking, milestones, and more.</p>
        <Link to="/login" className="arrow-link">
          Try it <ArrowIcon />
        </Link>
      </div>
      
      <div className="feature-card">
        <h3>Public Sharing</h3>
        <p>Share your projects with the community to get feedback or collaborators.</p>
        <Link to="/public-projects" className="arrow-link">
          Browse projects <ArrowIcon />
        </Link>
      </div>
      
      <div className="feature-card">
        <h3>Project Marketplace</h3>
        <p>Turn your side projects into income by selling them to interested buyers.</p>
        <Link to="/marketplace" className="arrow-link">
          Visit marketplace <ArrowIcon />
        </Link>
      </div>
    </>
  );
}

export default HomePage; 