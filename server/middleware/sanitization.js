const xss = require('xss');

// Since we may not have sanitize-html and validator yet, we'll create safe fallbacks

// Sanitize text input (removes all HTML)
const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  // Remove all HTML tags
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
};

// Sanitize rich text (allows minimal safe HTML)
const sanitizeRichText = (html) => {
  if (!html || typeof html !== 'string') return html;
  
  // Use xss library for basic sanitization
  return xss(html, {
    whiteList: {
      b: [],
      i: [],
      em: [],
      strong: [],
      a: ['href'],
      p: [],
      br: []
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  });
};

// Validate and sanitize email
const sanitizeEmail = (email) => {
  if (!email) return null;
  
  const trimmed = email.trim().toLowerCase();
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(trimmed) ? trimmed : null;
};

// Validate and sanitize URL
const sanitizeUrl = (url) => {
  if (!url) return null;
  
  const trimmed = url.trim();
  
  // Basic URL validation
  try {
    const urlObj = new URL(trimmed);
    // Only allow http and https protocols
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      return trimmed;
    }
  } catch (e) {
    return null;
  }
  
  return null;
};

// Sanitize phone number
const sanitizePhone = (phone) => {
  if (!phone) return null;
  
  // Remove all non-numeric characters except + and -
  const cleaned = phone.replace(/[^\d+-]/g, '');
  
  // Basic validation: between 7 and 15 digits
  const digitCount = cleaned.replace(/[^\d]/g, '').length;
  if (digitCount >= 7 && digitCount <= 15) {
    return cleaned;
  }
  
  return null;
};

// Sanitize integer
const sanitizeInteger = (value, options = {}) => {
  const { min, max, defaultValue = null } = options;
  
  const num = parseInt(value, 10);
  
  if (isNaN(num)) return defaultValue;
  if (min !== undefined && num < min) return defaultValue;
  if (max !== undefined && num > max) return defaultValue;
  
  return num;
};

// Sanitize float/decimal
const sanitizeFloat = (value, options = {}) => {
  const { min, max, defaultValue = null } = options;
  
  const num = parseFloat(value);
  
  if (isNaN(num)) return defaultValue;
  if (min !== undefined && num < min) return defaultValue;
  if (max !== undefined && num > max) return defaultValue;
  
  return num;
};

// Middleware to sanitize request body
const sanitizeBody = (req, res, next) => {
  if (req.body) {
    // Recursively sanitize all string fields
    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          // Apply basic text sanitization to all strings
          obj[key] = sanitizeText(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          sanitizeObject(obj[key]);
        } else if (Array.isArray(obj[key])) {
          obj[key] = obj[key].map(item => 
            typeof item === 'string' ? sanitizeText(item) : item
          );
        }
      }
    };
    
    sanitizeObject(req.body);
  }
  next();
};

// Specific sanitizer for project data
const sanitizeProjectData = (data) => {
  return {
    name: sanitizeText(data.name),
    description: sanitizeText(data.description),
    detailed_description: sanitizeRichText(data.detailed_description || data.description),
    stage: sanitizeText(data.stage),
    category: sanitizeText(data.category),
    subcategory: sanitizeText(data.subcategory),
    domain: sanitizeText(data.domain),
    demo_url: sanitizeUrl(data.demo_url),
    github_url: sanitizeUrl(data.github_url),
    contact_email: sanitizeEmail(data.contact_email),
    contact_phone: sanitizePhone(data.contact_phone),
    sale_price: sanitizeFloat(data.sale_price, { min: 0, max: 10000000 }),
    monthly_revenue: sanitizeFloat(data.monthly_revenue, { min: 0, defaultValue: 0 }),
    monthly_users: sanitizeInteger(data.monthly_users, { min: 0, defaultValue: 0 })
  };
};

module.exports = {
  sanitizeText,
  sanitizeRichText,
  sanitizeEmail,
  sanitizeUrl,
  sanitizePhone,
  sanitizeInteger,
  sanitizeFloat,
  sanitizeBody,
  sanitizeProjectData
};

