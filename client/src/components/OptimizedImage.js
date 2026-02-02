import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const OptimizedImage = ({ 
  src, 
  alt, 
  className = '',
  aspectRatio = '16/9',
  objectFit = 'cover',
  priority = false,
  onLoad,
  onError,
  placeholder = 'blur',
  blurDataURL,
  ...props 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);
  const imgRef = useRef(null);

  useEffect(() => {
    // Preload image if priority
    if (priority && src) {
      const img = new Image();
      img.src = src;
    }
  }, [src, priority]);

  useEffect(() => {
    setImageSrc(src);
    setLoading(true);
    setError(false);
  }, [src]);

  const handleLoad = (e) => {
    setLoading(false);
    onLoad?.(e);
  };

  const handleError = (e) => {
    setLoading(false);
    setError(true);
    onError?.(e);
  };

  // Generate shimmer effect
  const shimmer = (w, h) => `
    <svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="g">
          <stop stop-color="#1a1a1a" offset="20%" />
          <stop stop-color="#2a2a2a" offset="50%" />
          <stop stop-color="#1a1a1a" offset="70%" />
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="#1a1a1a" />
      <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
      <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
    </svg>`;

  const toBase64 = (str) =>
    typeof window === 'undefined'
      ? Buffer.from(str).toString('base64')
      : window.btoa(str);

  const defaultBlurDataURL = `data:image/svg+xml;base64,${toBase64(shimmer(700, 475))}`;

  return (
    <div 
      className={`relative overflow-hidden bg-gray-900 ${className}`}
      style={{ aspectRatio }}
    >
      <AnimatePresence mode="wait">
        {/* Loading state */}
        {loading && (
          <motion.div
            key="loading"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {placeholder === 'blur' && (blurDataURL || defaultBlurDataURL) ? (
              <img
                src={blurDataURL || defaultBlurDataURL}
                alt=""
                className="w-full h-full object-cover filter blur-xl scale-110"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-shimmer" />
              </div>
            )}
          </motion.div>
        )}

        {/* Error state */}
        {error && (
          <motion.div
            key="error"
            className="absolute inset-0 flex items-center justify-center bg-gray-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center p-4">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-gray-500 text-sm">Failed to load image</p>
            </div>
          </motion.div>
        )}

        {/* Actual image */}
        <motion.img
          key="image"
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`
            w-full h-full
            transition-all duration-700 ease-out
            ${loading ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}
            ${error ? 'hidden' : 'block'}
            object-${objectFit}
          `}
          loading={priority ? 'eager' : 'lazy'}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: loading ? 0 : 1, scale: loading ? 1.1 : 1 }}
          transition={{ duration: 0.7, ease: [0.43, 0.13, 0.23, 0.96] }}
          {...props}
        />
      </AnimatePresence>

      {/* Optional overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
    </div>
  );
};

export default OptimizedImage;

/*
// OptimizedImage.js - Modern image component with loading states
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '../utils/cn';

const OptimizedImage = ({
  src,
  alt,
  className,
  containerClassName,
  aspectRatio,
  objectFit = 'cover',
  priority = false,
  onLoad,
  onError,
  placeholder = 'blur',
  blurDataURL,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState(placeholder === 'blur' && blurDataURL ? blurDataURL : null);

  useEffect(() => {
    if (!src) return;

    // Preload image
    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setImageSrc(src);
      setLoading(false);
      onLoad?.();
    };
    
    img.onerror = () => {
      setError(true);
      setLoading(false);
      onError?.();
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, onLoad, onError]);

  const aspectRatioClasses = {
    '16/9': 'aspect-video',
    '4/3': 'aspect-4/3',
    '1/1': 'aspect-square',
    '3/4': 'aspect-3/4',
    '9/16': 'aspect-9/16',
  };

  return (
    <div className={cn('relative overflow-hidden bg-gray-900', aspectRatioClasses[aspectRatio], containerClassName)}>
      <AnimatePresence mode="wait">
        {loading && !error && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {placeholder === 'skeleton' ? (
              <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-shimmer" />
            ) : placeholder === 'blur' && blurDataURL ? (
              <img
                src={blurDataURL}
                alt=""
                className="w-full h-full object-cover filter blur-xl scale-110"
              />
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 border-2 border-gray-600 border-t-white animate-spin" />
                <span className="text-xs text-gray-500">Loading...</span>
              </div>
            )}
          </motion.div>
        )}

        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900"
          >
            <ImageIcon className="w-12 h-12 text-gray-600 mb-2" />
            <span className="text-sm text-gray-500">Failed to load image</span>
          </motion.div>
        )}

        {!loading && !error && imageSrc && (
          <motion.img
            key="image"
            src={imageSrc}
            alt={alt}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              'w-full h-full',
              objectFit === 'cover' && 'object-cover',
              objectFit === 'contain' && 'object-contain',
              objectFit === 'fill' && 'object-fill',
              className
            )}
            loading={priority ? 'eager' : 'lazy'}
            {...props}
          />
        )}
      </AnimatePresence>

      // Decorative overlay for hover effects
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
};

// Generate blur data URL for placeholder
export const generateBlurDataURL = (width = 10, height = 10) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1a1a1a');
  gradient.addColorStop(1, '#2a2a2a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL();
};

export default OptimizedImage;

*/

/*
import React, { useState } from 'react';

const OptimizedImage = ({ src, alt, className, ...props }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-gray-200/20 animate-pulse rounded-none" />
      )}
      
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        className={`
          transition-opacity duration-500
          ${loading ? 'opacity-0' : 'opacity-100'}
          ${error ? 'hidden' : 'block'}
          object-cover w-full h-full
        `}
        loading="lazy"
        {...props}
      />
      
      {error && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <span className="text-gray-400 text-sm">Image unavailable</span>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage; 
*/
