// Enhanced Jest setup for SideBuilds marketplace testing
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { server } from './mocks/server';

// Configure testing library
configure({
  testIdAttribute: 'data-cy', // Use Cypress data attributes
});

// Enhanced console error handling for tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Start MSW server for API mocking
  server.listen({
    onUnhandledRequest: 'error',
  });

  // Suppress specific warnings during tests
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Warning: componentWillReceiveProps has been renamed'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('React Hook useEffect has a missing dependency')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterEach(() => {
  // Reset handlers after each test
  server.resetHandlers();
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear localStorage
  localStorage.clear();
  
  // Clear sessionStorage
  sessionStorage.clear();
});

afterAll(() => {
  // Restore console methods
  console.error = originalError;
  console.warn = originalWarn;
  
  // Clean up MSW
  server.close();
});

// Mock external dependencies
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
    a: ({ children, ...props }) => <a {...props}>{children}</a>,
  },
  AnimatePresence: ({ children }) => children,
}));

// Mock Socket.IO
jest.mock('../utils/socket', () => ({
  getSocket: jest.fn(),
  initializeSocket: jest.fn(),
  disconnectSocket: jest.fn(),
  emitWithRetry: jest.fn(),
  subscribeToSocketStatus: jest.fn(() => jest.fn()),
  subscribeToConnectionEvents: jest.fn(() => jest.fn()),
  getCurrentSocketStatus: jest.fn(() => ({
    status: 'connected',
    quality: 'excellent',
    latency: 45,
    isConnected: true,
    socketId: 'test-socket-id',
    metrics: {}
  })),
  isSocketHealthy: jest.fn(() => true),
}));

// Mock Intersection Observer
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock window.matchMedia for responsive testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.getComputedStyle for CSS testing
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: (prop) => {
      // Mock common CSS property values for testing
      const mockValues = {
        'min-height': '48px',
        'min-width': '44px',
        'font-size': '16px',
        'line-height': '1.5',
      };
      return mockValues[prop] || '';
    },
  }),
});

// Mock Performance API
Object.defineProperty(window, 'performance', {
  value: {
    timing: {
      navigationStart: 1000,
      loadEventEnd: 2000,
    },
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
  },
});

// Mock Payment Request API
global.PaymentRequest = class PaymentRequest {
  constructor() {}
  show() {
    return Promise.resolve({
      complete: jest.fn(),
    });
  }
  canMakePayment() {
    return Promise.resolve(true);
  }
};

// Mock Stripe (if needed for component testing)
global.Stripe = jest.fn(() => ({
  elements: jest.fn(() => ({
    create: jest.fn(() => ({
      mount: jest.fn(),
      unmount: jest.fn(),
      on: jest.fn(),
      focus: jest.fn(),
      blur: jest.fn(),
    })),
  })),
  confirmCardPayment: jest.fn(),
  redirectToCheckout: jest.fn(),
}));

// Mock environment variables
process.env.REACT_APP_API_URL = 'http://localhost:5000/api';
process.env.REACT_APP_SOCKET_URL = 'http://localhost:5000';
process.env.REACT_APP_STRIPE_PUBLIC_KEY = 'pk_test_123';
process.env.REACT_APP_VERSION = '1.0.0';

// Global test utilities
global.testUtils = {
  // Mock user data for tests
  createMockUser: (overrides = {}) => ({
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'buyer',
    isVerified: true,
    trustScore: 85,
    ...overrides,
  }),

  // Mock project data for tests
  createMockProject: (overrides = {}) => ({
    id: 1,
    project_id: 1,
    name: 'Test Project',
    description: 'A test project description',
    sale_price: 25000,
    monthly_revenue: 5000,
    stage: 'launched',
    tech_stack: ['React', 'Node.js', 'PostgreSQL'],
    is_for_sale: true,
    is_verified: true,
    revenue_verified: true,
    code_quality_verified: true,
    trust_score: 90,
    created_at: '2024-01-01T00:00:00Z',
    users_count: 1500,
    github_url: 'https://github.com/test/project',
    domain: 'testproject.com',
    ...overrides,
  }),

  // Mock payment data for tests
  createMockPayment: (overrides = {}) => ({
    id: 'pay_123',
    amount: 25000,
    currency: 'USD',
    status: 'succeeded',
    provider: 'stripe',
    projectId: 1,
    sellerId: 2,
    buyerId: 1,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }),

  // Wait for async operations
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock localStorage
  mockLocalStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },

  // Performance measurement helpers
  measurePerformance: async (fn) => {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
  },
};

// Replace localStorage with mock during tests
Object.defineProperty(window, 'localStorage', {
  value: global.testUtils.mockLocalStorage,
});

// Performance expectations for critical operations
global.performanceExpectations = {
  componentRender: 100, // ms
  apiRequest: 500, // ms
  searchResponse: 300, // ms
  paymentProcessing: 2000, // ms
  socketConnection: 1000, // ms
};
