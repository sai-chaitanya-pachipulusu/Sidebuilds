// security.js - Input sanitization and XSS prevention utilities

// HTML entity encoding to prevent XSS attacks
export const escapeHtml = (text) => {
  if (typeof text !== 'string') return text;
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return text.replace(/[&<>"'`=\/]/g, (s) => map[s]);
};

// Decode HTML entities
export const unescapeHtml = (text) => {
  if (typeof text !== 'string') return text;
  
  const map = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '='
  };
  
  return text.replace(/&(amp|lt|gt|quot|#039|#x2F|#x60|#x3D);/g, (match) => map[match]);
};

// Sanitize user input for display
export const sanitizeInput = (input, options = {}) => {
  if (typeof input !== 'string') return input;
  
  const {
    allowBasicFormatting = false,
    maxLength = 10000,
    removeScripts = true,
    removeLinks = false
  } = options;
  
  let sanitized = input;
  
  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }
  
  // Remove script tags and javascript: URLs
  if (removeScripts) {
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }
  
  // Remove links if requested
  if (removeLinks) {
    sanitized = sanitized
      .replace(/<a\b[^>]*>/gi, '')
      .replace(/<\/a>/gi, '');
  }
  
  // If basic formatting is not allowed, escape all HTML
  if (!allowBasicFormatting) {
    sanitized = escapeHtml(sanitized);
  } else {
    // Allow only safe tags if basic formatting is enabled
    const allowedTags = ['b', 'i', 'em', 'strong', 'u', 'br', 'p'];
    const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
    
    sanitized = sanitized.replace(tagRegex, (match, tagName) => {
      if (allowedTags.includes(tagName.toLowerCase())) {
        return match;
      }
      return escapeHtml(match);
    });
  }
  
  return sanitized.trim();
};

// Validate and sanitize form data
export const sanitizeFormData = (formData, rules = {}) => {
  const sanitized = {};
  
  Object.keys(formData).forEach(key => {
    const value = formData[key];
    const rule = rules[key] || {};
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value, {
        maxLength: rule.maxLength || 1000,
        allowBasicFormatting: rule.allowHtml || false,
        removeScripts: true,
        removeLinks: rule.removeLinks || false
      });
    } else {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
};

// URL validation and sanitization
export const sanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();
  if (!trimmed) return '';

  const explicitScheme = trimmed.match(/^([a-z][a-z0-9+.-]*):/i);
  if (explicitScheme && !/^https?:$/i.test(explicitScheme[0])) return '';

  // Preserve same-origin application paths but reject protocol-relative URLs.
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;

  const candidate = trimmed.startsWith('//')
    ? `https:${trimmed}`
    : (/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : '';
  } catch (_error) {
    return '';
  }
};

export const openExternalUrl = (url) => {
  const safeUrl = sanitizeUrl(url);
  if (!safeUrl) return false;

  const openedWindow = window.open(safeUrl, '_blank', 'noopener,noreferrer');
  if (openedWindow) openedWindow.opener = null;
  return true;
};

// Content Security Policy helper
export const isCSPEnabled = () => {
  try {
    // Try to create a script element to test CSP
    const script = document.createElement('script');
    script.textContent = '// CSP test';
    document.head.appendChild(script);
    document.head.removeChild(script);
    return false; // If no error, CSP might not be enabled
  } catch (error) {
    return true; // Error indicates CSP is likely blocking
  }
};

// Safe DOM manipulation
export const safeSetTextContent = (element, content) => {
  if (!element || typeof content !== 'string') return;
  
  // Use textContent instead of innerHTML to prevent XSS
  element.textContent = content;
};

export const safeAppendText = (parent, text) => {
  if (!parent || typeof text !== 'string') return null;
  
  const textNode = document.createTextNode(text);
  parent.appendChild(textNode);
  return textNode;
};

export const safeCreateElement = (tagName, attributes = {}, textContent = '') => {
  const element = document.createElement(tagName);
  
  // Set attributes safely
  Object.keys(attributes).forEach(key => {
    if (key.startsWith('on')) {
      // Never set event handlers from attributes
      console.warn(`Blocked event handler attribute: ${key}`);
      return;
    }
    
    if (key === 'href' || key === 'src') {
      element.setAttribute(key, sanitizeUrl(attributes[key]));
    } else {
      element.setAttribute(key, sanitizeInput(attributes[key]));
    }
  });
  
  // Set text content safely
  if (textContent) {
    safeSetTextContent(element, textContent);
  }
  
  return element;
};

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate username format
export const isValidUsername = (username) => {
  // Allow alphanumeric characters, underscores, and hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
};

// Password strength validation
export const validatePassword = (password) => {
  const rules = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)
  };
  
  const score = Object.values(rules).filter(Boolean).length;
  
  return {
    ...rules,
    score,
    strength: score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong',
    isValid: score >= 3
  };
};

// Log security events for monitoring
export const logSecurityEvent = (eventType, details = {}) => {
  if (process.env.NODE_ENV === 'production') {
    // In production, send to security monitoring service
    console.warn(`SECURITY EVENT: ${eventType}`, details);
    
    // Example: Send to monitoring service
    // fetch('/api/security/log', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ eventType, details, timestamp: new Date().toISOString() })
    // });
  } else {
    console.log(`Security Event: ${eventType}`, details);
  }
};

export default {
  escapeHtml,
  unescapeHtml,
  sanitizeInput,
  sanitizeFormData,
  sanitizeUrl,
  openExternalUrl,
  isCSPEnabled,
  safeSetTextContent,
  safeAppendText,
  safeCreateElement,
  isValidEmail,
  isValidUsername,
  validatePassword,
  logSecurityEvent
};
