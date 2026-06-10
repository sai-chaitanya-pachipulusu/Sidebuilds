/**
 * API mocking tasks for Cypress tests
 * Stub implementation.
 */

const mockResponse = async (endpoint, response, options) => {
  console.log('[Cypress Task] mockApiResponse — no-op stub', { endpoint, response, options });
  return null;
};

const clearMocks = async () => {
  console.log('[Cypress Task] clearApiMocks — no-op stub');
  return null;
};

module.exports = { mockResponse, clearMocks };
