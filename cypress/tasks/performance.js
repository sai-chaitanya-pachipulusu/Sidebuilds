/**
 * Performance monitoring tasks for Cypress tests
 * Stub implementation.
 */

const measure = async (url) => {
  console.log('[Cypress Task] measurePerformance — no-op stub', url);
  return null;
};

const generateReport = async () => {
  console.log('[Cypress Task] generatePerformanceReport — no-op stub');
  return null;
};

module.exports = { measure, generateReport };
