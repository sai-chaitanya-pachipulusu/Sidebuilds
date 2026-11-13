// Dynamic Environment Configuration
import { resolveServiceUrl } from './apiUrl';

const getEnvironmentConfig = () => {
  const env = process.env.REACT_APP_ENVIRONMENT || process.env.REACT_APP_ENV || process.env.NODE_ENV || 'development';
  
  const configs = {
    development: {
      API_URL: resolveServiceUrl(process.env.REACT_APP_API_URL, 'http://localhost:5002'),
      SOCKET_URL: resolveServiceUrl(process.env.REACT_APP_SOCKET_URL, 'http://localhost:5002'),
      STRIPE_PUBLISHABLE_KEY: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '',
      ENABLE_DEBUG: true,
      ENABLE_ANALYTICS: false,
      REFRESH_INTERVALS: {
        notifications: 30000, // 30 seconds
        dashboard: 60000,     // 1 minute
        projects: 120000,     // 2 minutes
        recommendations: 300000 // 5 minutes
      },
      AI_FEATURES: {
        enabled: true,
        realTimeScoring: process.env.REACT_APP_AI_REAL_TIME === 'true',
        recommendationEngine: true,
        marketInsights: true
      },
      FEATURE_FLAGS: {
        realTimeNotifications: true,
        projectCollaboration: true,
        advancedAnalytics: true,
        premiumFeatures: false
      }
    },
    
    staging: {
      API_URL: resolveServiceUrl(process.env.REACT_APP_API_URL, 'https://api-staging.sidebuilds.online'),
      SOCKET_URL: resolveServiceUrl(process.env.REACT_APP_SOCKET_URL, 'https://api-staging.sidebuilds.online'),
      STRIPE_PUBLISHABLE_KEY: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '',
      ENABLE_DEBUG: false,
      ENABLE_ANALYTICS: true,
      REFRESH_INTERVALS: {
        notifications: 45000,
        dashboard: 120000,
        projects: 180000,
        recommendations: 600000
      },
      AI_FEATURES: {
        enabled: true,
        realTimeScoring: true,
        recommendationEngine: true,
        marketInsights: true
      },
      FEATURE_FLAGS: {
        realTimeNotifications: true,
        projectCollaboration: true,
        advancedAnalytics: true,
        premiumFeatures: true
      }
    },
    
    production: {
      API_URL: resolveServiceUrl(process.env.REACT_APP_API_URL, 'https://sidebuilds.onrender.com/api'),
      SOCKET_URL: resolveServiceUrl(process.env.REACT_APP_SOCKET_URL, 'https://sidebuilds.onrender.com'),
      STRIPE_PUBLISHABLE_KEY: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '',
      ENABLE_DEBUG: false,
      ENABLE_ANALYTICS: true,
      REFRESH_INTERVALS: {
        notifications: 60000,  // 1 minute
        dashboard: 180000,     // 3 minutes
        projects: 300000,      // 5 minutes
        recommendations: 900000 // 15 minutes
      },
      AI_FEATURES: {
        enabled: true,
        realTimeScoring: true,
        recommendationEngine: true,
        marketInsights: true
      },
      FEATURE_FLAGS: {
        realTimeNotifications: true,
        projectCollaboration: true,
        advancedAnalytics: true,
        premiumFeatures: true
      }
    }
  };

  return configs[env] || configs.development;
};

// Dynamic theme configuration
const getThemeConfig = () => {
  const userPreference = localStorage.getItem('theme-preference');
  const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  
  return {
    mode: userPreference || systemPreference,
    enableAnimations: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    enableGlassmorphism: true,
    enableParticleEffects: window.innerWidth > 768, // Disable on mobile for performance
    colorScheme: {
      primary: process.env.REACT_APP_PRIMARY_COLOR || '#8b5cf6',
      secondary: process.env.REACT_APP_SECONDARY_COLOR || '#06b6d4',
      accent: process.env.REACT_APP_ACCENT_COLOR || '#f59e0b'
    }
  };
};

// Performance configuration based on device capabilities
const getPerformanceConfig = () => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const deviceMemory = navigator.deviceMemory || 4; // Default to 4GB
  const hardwareConcurrency = navigator.hardwareConcurrency || 4; // Default to 4 cores
  
  const isLowEnd = deviceMemory < 4 || hardwareConcurrency < 4;
  const isSlowConnection = connection && (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g');
  
  return {
    enableImageOptimization: true,
    enableLazyLoading: true,
    enableVirtualization: !isLowEnd,
    enableAdvancedAnimations: !isLowEnd && !isSlowConnection,
    maxConcurrentRequests: isLowEnd ? 2 : 6,
    imageQuality: isSlowConnection ? 'low' : 'high',
    enablePrefetching: !isSlowConnection,
    cacheStrategy: isLowEnd ? 'aggressive' : 'standard'
  };
};

// Accessibility configuration
const getAccessibilityConfig = () => {
  return {
    enableScreenReader: true,
    enableKeyboardNavigation: true,
    enableHighContrast: window.matchMedia('(prefers-contrast: high)').matches,
    enableReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    fontSize: localStorage.getItem('font-size-preference') || 'medium',
    enableFocusVisible: true
  };
};

// Export all configurations
export const config = {
  ...getEnvironmentConfig(),
  theme: getThemeConfig(),
  performance: getPerformanceConfig(),
  accessibility: getAccessibilityConfig(),
  
  // Runtime feature detection
  features: {
    supportsWebGL: !!window.WebGLRenderingContext,
    supportsWebWorkers: !!window.Worker,
    supportsServiceWorkers: 'serviceWorker' in navigator,
    supportsPushNotifications: 'Notification' in window,
    supportsWebRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    supportsIntersectionObserver: 'IntersectionObserver' in window,
    supportsResizeObserver: 'ResizeObserver' in window
  },
  
  // Dynamic user preferences
  getUserPreferences: () => ({
    language: localStorage.getItem('language') || navigator.language || 'en-US',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currency: localStorage.getItem('currency') || 'USD',
    numberFormat: localStorage.getItem('number-format') || navigator.language || 'en-US',
    notifications: {
      enabled: localStorage.getItem('notifications-enabled') !== 'false',
      sound: localStorage.getItem('notifications-sound') === 'true',
      desktop: localStorage.getItem('notifications-desktop') === 'true',
      email: localStorage.getItem('notifications-email') === 'true'
    }
  }),
  
  // Dynamic API endpoints based on current config
  getApiEndpoint: (endpoint) => {
    const baseUrl = getEnvironmentConfig().API_URL.replace(/\/$/, '');
    let normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const baseIncludesApi = /\/api$/i.test(baseUrl);
    const endpointIncludesApi = normalizedEndpoint === '/api' || normalizedEndpoint.startsWith('/api/');

    if (baseIncludesApi && endpointIncludesApi) {
      normalizedEndpoint = normalizedEndpoint.slice(4) || '/';
    } else if (!baseIncludesApi && !endpointIncludesApi) {
      normalizedEndpoint = `/api${normalizedEndpoint}`;
    }

    return `${baseUrl}${normalizedEndpoint}`;
  },
  
  // Dynamic feature flag checker
  isFeatureEnabled: (featureName) => {
    const flags = getEnvironmentConfig().FEATURE_FLAGS;
    const userOverride = localStorage.getItem(`feature-${featureName}`);
    
    if (userOverride !== null) {
      return userOverride === 'true';
    }
    
    return flags[featureName] || false;
  },
  
  // Dynamic refresh interval getter
  getRefreshInterval: (type) => {
    const intervals = getEnvironmentConfig().REFRESH_INTERVALS;
    const userOverride = localStorage.getItem(`refresh-${type}`);
    
    if (userOverride && !isNaN(parseInt(userOverride))) {
      return parseInt(userOverride);
    }
    
    return intervals[type] || 60000; // Default 1 minute
  }
};

// Auto-update configuration when environment changes
if (typeof window !== 'undefined') {
  // Listen for theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    config.theme = getThemeConfig();
  });
  
  // Listen for connection changes
  if (navigator.connection) {
    navigator.connection.addEventListener('change', () => {
      config.performance = getPerformanceConfig();
    });
  }
  
  // Listen for accessibility changes
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
    config.accessibility = getAccessibilityConfig();
  });
}

export default config;
