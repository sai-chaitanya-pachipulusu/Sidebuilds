import '@testing-library/jest-dom';

// Match the Web Crypto available on the HTTPS app and localhost. Older jsdom
// versions omit it; use the real Node implementation rather than weak test IDs.
if (!window.crypto?.getRandomValues) Object.defineProperty(window, 'crypto', { configurable: true, writable: true, value: require('crypto').webcrypto });

Object.defineProperty(window, 'matchMedia', { writable: true, value: query => ({
  matches: false, media: query, onchange: null, addListener: jest.fn(), removeListener: jest.fn(),
  addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn()
}) });
