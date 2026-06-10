// Enhanced Cypress configuration for SideBuilds marketplace E2E testing
// Optimized for high-value transaction testing and mobile responsiveness

const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    // Base configuration
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    
    // Viewport settings
    viewportWidth: 1280,
    viewportHeight: 720,
    
    // Timeouts optimized for payment processing
    defaultCommandTimeout: 15000,
    requestTimeout: 30000,
    responseTimeout: 30000,
    pageLoadTimeout: 30000,
    
    // Retry configuration for flaky tests
    retries: {
      runMode: 2,
      openMode: 0
    },
    
    // Video and screenshot configuration
    video: true,
    videoCompression: 32,
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    screenshotOnRunFailure: true,
    
    // Browser configuration
    chromeWebSecurity: false,
    
    // Test isolation
    testIsolation: true,
    
    // Environment variables
    env: {
      // API endpoints
      apiUrl: 'http://localhost:5000/api',
      socketUrl: 'http://localhost:5000',
      
      // Test user credentials
      testUserEmail: 'buyer@sidebuilds.com',
      testUserPassword: 'SecurePass123!',
      testSellerEmail: 'seller@sidebuilds.com',
      testSellerPassword: 'SecurePass456!',
      
      // Payment testing
      stripePublicKey: 'pk_test_123',
      testCardNumber: '4242424242424242',
      
      // Feature flags for testing
      enableRealTimeFeatures: true,
      enableMobileOptimizations: true,
      enablePerformanceMonitoring: true,
      
      // Performance thresholds
      maxPageLoadTime: 3000,
      maxApiResponseTime: 1000,
      maxSearchTime: 500,
      
      // Mobile testing
      mobileViewports: [
        { width: 375, height: 667, name: 'iPhone SE' },
        { width: 390, height: 844, name: 'iPhone 12' },
        { width: 384, height: 854, name: 'Samsung Galaxy S21' },
        { width: 768, height: 1024, name: 'iPad' }
      ]
    },
    
    // Node events and tasks
    setupNodeEvents(on, config) {
      // Database management tasks
      on('task', {
        // Database operations
        'db:reset': () => {
          // Reset test database to clean state
          return require('./cypress/tasks/database').reset();
        },
        
        'db:seed': (data) => {
          // Seed database with test data
          return require('./cypress/tasks/database').seed(data);
        },
        
        'db:cleanup': () => {
          // Clean up test data after tests
          return require('./cypress/tasks/database').cleanup();
        },
        
        // Network simulation
        'throttleNetwork': (conditions) => {
          // Simulate network conditions
          return require('./cypress/tasks/network').throttle(conditions);
        },
        
        'setNetworkConditions': (conditions) => {
          // Set network conditions
          return require('./cypress/tasks/network').setConditions(conditions);
        },
        
        // Performance monitoring
        'measurePerformance': (url) => {
          // Measure page performance
          return require('./cypress/tasks/performance').measure(url);
        },
        
        'generatePerformanceReport': () => {
          // Generate performance report
          return require('./cypress/tasks/performance').generateReport();
        },
        
        // Email testing
        'getEmails': (criteria) => {
          // Get test emails
          return require('./cypress/tasks/email').getEmails(criteria);
        },
        
        'clearEmails': () => {
          // Clear test email inbox
          return require('./cypress/tasks/email').clear();
        },
        
        // File operations
        'readFile': (filePath) => {
          // Read file for testing
          return require('fs').readFileSync(filePath, 'utf8');
        },
        
        'writeFile': ({ filePath, content }) => {
          // Write file for testing
          require('fs').writeFileSync(filePath, content);
          return null;
        },
        
        // API mocking and testing
        'mockApiResponse': ({ endpoint, response, options }) => {
          // Mock API responses
          return require('./cypress/tasks/api').mockResponse(endpoint, response, options);
        },
        
        'clearApiMocks': () => {
          // Clear API mocks
          return require('./cypress/tasks/api').clearMocks();
        },
        
        // WebSocket testing
        'mockSocketEvent': ({ event, data }) => {
          // Mock socket events
          return require('./cypress/tasks/socket').mockEvent(event, data);
        },
        
        // Payment testing
        'mockStripeWebhook': (webhookData) => {
          // Mock Stripe webhook for testing
          return require('./cypress/tasks/payments').mockStripeWebhook(webhookData);
        },
        
        'verifyPaymentIntent': (paymentIntentId) => {
          // Verify payment intent status
          return require('./cypress/tasks/payments').verifyPaymentIntent(paymentIntentId);
        },
        
        // Mobile testing helpers
        'simulateMobileGesture': ({ gesture, element, coordinates }) => {
          // Simulate mobile gestures
          return require('./cypress/tasks/mobile').simulateGesture(gesture, element, coordinates);
        },
        
        // Security testing
        'scanForVulnerabilities': (url) => {
          // Basic security scan
          return require('./cypress/tasks/security').scan(url);
        },
        
        // Accessibility testing
        'runAccessibilityAudit': (options) => {
          // Run accessibility audit
          return require('./cypress/tasks/accessibility').audit(options);
        },
        
        // Performance testing
        'runLighthouseAudit': (url) => {
          // Run Lighthouse audit
          return require('./cypress/tasks/lighthouse').audit(url);
        },
        
        // Test reporting
        'generateTestReport': (results) => {
          // Generate comprehensive test report
          return require('./cypress/tasks/reporting').generate(results);
        },
        
        // Log management
        'log': (message) => {
          console.log(`[Cypress Task] ${message}`);
          return null;
        },
        
        'getBrowserLogs': () => {
          // Get browser console logs
          return require('./cypress/tasks/logs').getBrowserLogs();
        }
      });
      
      // Plugin configuration (disabled — packages not installed)
      // require('@cypress/code-coverage/task')(on, config);
      // require('cypress-terminal-report/src/installLogsPrinter')(on);
      
      // Custom event handlers
      on('before:browser:launch', (browser = {}, launchOptions) => {
        // Browser optimization for testing
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          // Chrome flags for better testing
          launchOptions.args.push('--disable-background-timer-throttling');
          launchOptions.args.push('--disable-backgrounding-occluded-windows');
          launchOptions.args.push('--disable-renderer-backgrounding');
          launchOptions.args.push('--disable-features=TranslateUI');
          launchOptions.args.push('--disable-ipc-flooding-protection');
          
          // Mobile simulation flags
          if (config.env.mobileTest) {
            launchOptions.args.push('--touch-events=enabled');
            launchOptions.args.push('--enable-touch-drag-drop');
          }
        }
        
        return launchOptions;
      });
      
      on('after:spec', (spec, results) => {
        // Post-test cleanup and reporting
        if (results && results.video) {
          // Keep videos only for failed tests
          const failures = results.tests.some(test => 
            test.attempts.some(attempt => attempt.state === 'failed')
          );
          
          if (!failures) {
            require('fs').unlinkSync(results.video);
          }
        }
      });
      
      // Custom configuration based on environment
      if (config.env.environment === 'ci') {
        // CI-specific optimizations
        config.video = false;
        config.defaultCommandTimeout = 10000;
        config.retries.runMode = 3;
      }
      
      return config;
    },
    
    // Experimental features
    experimentalStudio: true,
    experimentalSessionAndOrigin: true,
    experimentalMemoryManagement: true,
    
    // Custom browsers for mobile testing
    browsers: [
      {
        name: 'chrome',
        channel: 'stable',
        family: 'chromium',
        displayName: 'Chrome',
        version: '90.0.4430.212',
        path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        majorVersion: 90
      }
    ]
  },
  
  // Component testing configuration
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack'
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.js',
    
    // Component-specific settings
    viewportWidth: 1000,
    viewportHeight: 660,
    
    // Faster timeouts for component tests
    defaultCommandTimeout: 8000,
    requestTimeout: 10000,
    responseTimeout: 10000
  }
});