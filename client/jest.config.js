// Enhanced Jest configuration for SideBuilds marketplace testing
// Optimized for high-value transaction testing and comprehensive coverage

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/tests/setupTests.js'],
  
  // Module name mapping for clean imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@tests/(.*)$': '<rootDir>/src/tests/$1',
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/tests/__mocks__/fileMock.js'
  },
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/components/**/*.{js,jsx}',
    'src/services/**/*.{js,jsx}',
    'src/hooks/**/*.{js,jsx}',
    'src/utils/**/*.{js,jsx}',
    'src/pages/**/*.{js,jsx}',
    'src/context/**/*.{js,jsx}',
    
    // Exclude test files and stories
    '!src/components/**/*.stories.js',
    '!src/tests/**/*',
    '!src/**/*.test.{js,jsx}',
    '!src/**/*.spec.{js,jsx}',
    
    // Exclude config and build files
    '!src/index.js',
    '!src/reportWebVitals.js',
    '!src/setupTests.js'
  ],
  
  // Coverage thresholds - High standards for critical components
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    
    // Critical business components require higher coverage
    'src/components/ProjectCard.js': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    
    'src/services/paymentService.js': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    
    'src/utils/socket.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    
    'src/components/TrustBadge.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    
    'src/hooks/useRealTimeSync.js': {
      branches: 88,
      functions: 88,
      lines: 88,
      statements: 88
    },
    
    // Marketplace core components
    'src/services/marketplace.service.js': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    
    'src/components/MarketplaceFilters.js': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Test patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx}',
    '<rootDir>/src/tests/**/*.test.{js,jsx}'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
    '^.+\\.css$': '<rootDir>/src/tests/__mocks__/styleMock.js'
  },
  
  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'json'],
  
  // Test timeout for comprehensive tests
  testTimeout: 30000,
  
  // Performance optimization
  maxWorkers: 4,
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Reporters for detailed output
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'junit.xml',
        suiteName: 'SideBuilds Frontend Tests'
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test-results',
        filename: 'test-report.html',
        pageTitle: 'SideBuilds Test Report',
        logoImgPath: '<rootDir>/public/logo192.png'
      }
    ]
  ],
  
  // Coverage reporting
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'cobertura'
  ],
  
  coverageDirectory: '<rootDir>/coverage',
  
  // Global test configuration
  globals: {
    'process.env': {
      NODE_ENV: 'test',
      REACT_APP_API_URL: 'http://localhost:5000/api',
      REACT_APP_SOCKET_URL: 'http://localhost:5000',
      REACT_APP_STRIPE_PUBLIC_KEY: 'pk_test_123',
      REACT_APP_VERSION: '1.0.0-test'
    }
  },
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  verbose: true,
  
  // Test result processing
  testResultsProcessor: '<rootDir>/src/tests/processors/testResultProcessor.js',
  
  // Custom test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Watch mode configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Snapshot configuration
  snapshotSerializers: [
    'enzyme-to-json/serializer'
  ],
  
  // Custom matchers for better assertions
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setupTests.js',
    '<rootDir>/src/tests/matchers/customMatchers.js'
  ],
  
  // Test categories with different configurations
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.test.{js,jsx}'],
      testEnvironment: 'jsdom'
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/tests/integration/**/*.test.{js,jsx}'],
      testEnvironment: 'jsdom',
      testTimeout: 10000
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/src/tests/performance/**/*.test.{js,jsx}'],
      testEnvironment: 'jsdom',
      testTimeout: 15000
    }
  ]
};