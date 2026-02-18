import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search } from 'lucide-react';
import SEO from '../components/SEO';

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <SEO title="404 - Page Not Found | SideBuilds" description="The page you're looking for doesn't exist." />
      
      <motion.div
        className="text-center max-w-lg"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* 404 Number */}
        <motion.div
          className="text-[10rem] font-black leading-none tracking-tighter text-white/5 select-none mb-4"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          404
        </motion.div>

        <div className="border-t border-white/10 pt-8 mb-8">
          <span className="text-xs font-mono uppercase tracking-wider text-amber-500">Error</span>
          <h1 className="text-3xl md:text-4xl font-black text-white mt-2 uppercase tracking-tight">
            Page Not Found
          </h1>
          <p className="text-gray-500 font-mono text-sm mt-4 leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-white/20 text-gray-400 hover:text-white hover:border-white/40 transition-all font-mono text-sm uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-black font-bold hover:bg-amber-500 transition-all font-mono text-sm uppercase tracking-wider no-underline"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>

          <Link
            to="/marketplace"
            className="flex items-center justify-center gap-2 px-6 py-3 border border-white/20 text-gray-400 hover:text-white hover:border-white/40 transition-all font-mono text-sm uppercase tracking-wider no-underline"
          >
            <Search className="w-4 h-4" />
            Marketplace
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default NotFoundPage;
