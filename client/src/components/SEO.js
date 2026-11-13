import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

/**
 * Enhanced SEO component for managing meta tags, structured data, and document head content
 * 
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} props.description - Meta description
 * @param {string} props.canonicalUrl - Canonical URL
 * @param {Object} props.meta - Additional meta tags
 * @param {string} props.image - OG image URL
 * @param {Object} props.article - Article specific meta data
 * @param {Object} props.jsonLd - JSON-LD structured data
 * @param {string} props.type - Page type (website, article, product)
 */
const SEO = ({ 
  title, 
  description = 'Browse seller-listed side projects, ask questions and agree a clear purchase scope on SideBuilds.',
  canonicalUrl, 
  meta = [], 
  image = '/og-image.png', // Default OG image
  article = null,
  jsonLd = null,
  type = 'website',
  noindex = false,
  keywords = 'side projects, buy projects, sell projects, saas marketplace, project marketplace, verified projects, startup acquisition'
}) => {
  const location = useLocation();
  const siteUrl = 'https://www.sidebuilds.online';
  const canIndex = !noindex && !location.search && /^\/(?:|marketplace|projects\/[a-f0-9-]{36}|about|faq|contact|how-it-works|pricing|terms|privacy)$/.test(location.pathname);
  const fullUrl = canonicalUrl || `${siteUrl}${location.pathname}`;
  const siteTitle = title ? `${title} | SideBuilds` : 'SideBuilds - Where Side Projects Find Their Next Chapter';
  
  // Default JSON-LD structured data for organization
  const defaultJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SideBuilds",
    url: siteUrl,
    logo: `${siteUrl}/favicon.svg`,
    description: "A marketplace for buying and selling side projects"
  };

  // Merge with provided jsonLd or use page-specific structured data
  const structuredData = jsonLd || defaultJsonLd;
  
  return (
    <Helmet
      title={siteTitle}
      meta={[
        {
          name: 'description',
          content: description,
        },
        {
          name: 'keywords',
          content: keywords,
        },
        {
          name: 'author',
          content: 'SideBuilds Team',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, maximum-scale=5',
        },
        {
          name: 'theme-color',
          content: '#6366F1',
        },
        // Open Graph tags
        {
          property: 'og:title',
          content: siteTitle,
        },
        {
          property: 'og:description',
          content: description,
        },
        {
          property: 'og:type',
          content: type,
        },
        {
          property: 'og:url',
          content: fullUrl,
        },
        {
          property: 'og:image',
          content: image.startsWith('http') ? image : `${siteUrl}${image}`,
        },
        {
          property: 'og:image:width',
          content: '1200',
        },
        {
          property: 'og:image:height',
          content: '630',
        },
        {
          property: 'og:site_name',
          content: 'SideBuilds',
        },
        {
          property: 'og:locale',
          content: 'en_US',
        },
        // Twitter Card tags
        {
          name: 'twitter:card',
          content: 'summary_large_image',
        },
        {
          name: 'twitter:site',
          content: '@sidebuilds',
        },
        {
          name: 'twitter:title',
          content: siteTitle,
        },
        {
          name: 'twitter:description',
          content: description,
        },
        {
          name: 'twitter:image',
          content: image.startsWith('http') ? image : `${siteUrl}${image}`,
        },
        // Additional SEO tags
        {
          name: 'robots',
          content: canIndex ? 'index, follow, max-image-preview:large' : 'noindex, follow',
        },
        {
          name: 'googlebot',
          content: canIndex ? 'index, follow' : 'noindex, follow',
        },
        {
          name: 'generator',
          content: 'SideBuilds Platform v2.0',
        },
        // Article specific meta tags
        ...(article ? [
          {
            property: 'article:published_time',
            content: article.publishedTime,
          },
          {
            property: 'article:modified_time',
            content: article.modifiedTime,
          },
          {
            property: 'article:author',
            content: article.author,
          },
          {
            property: 'article:section',
            content: article.section,
          },
          {
            property: 'article:tag',
            content: article.tags?.join(', '),
          },
        ] : []),
        ...meta,
      ]}
      link={[
        {
          rel: 'canonical',
          href: fullUrl,
        },
        {
          rel: 'icon',
          href: '/favicon.svg',
        },
        {
          rel: 'apple-touch-icon',
          href: '/favicon.svg',
        },
        {
          rel: 'manifest',
          href: '/manifest.json',
        },
        // Preconnect to external domains for performance
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossOrigin: 'anonymous',
        },
        // Fonts
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
        },
      ]}
    >
      {/* JSON-LD structured data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData).replace(/</g, '\\u003c')}
      </script>
      
      {/* Analytics scripts would go here */}
    </Helmet>
  );
};

export default SEO; 
