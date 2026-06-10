/**
 * Accessibility testing tasks for Cypress tests
 * Stub implementation.
 */

const audit = async (options) => {
  console.log('[Cypress Task] runAccessibilityAudit — no-op stub', options);
  return { violations: [] };
};

module.exports = { audit };
