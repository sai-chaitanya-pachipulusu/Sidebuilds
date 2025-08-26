import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';

function NotFoundPage() {
  return (
    <div className="not-found-page">
      <h2>404 - Page Not Found</h2>
      <p>Sorry, we couldn't find what you were looking for.</p>
      <Link to="/" className="btn">Go Home</Link>
    </div>
  );
}

export default NotFoundPage; 