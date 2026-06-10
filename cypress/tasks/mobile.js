/**
 * Mobile testing helpers for Cypress tests
 * Stub implementation.
 */

const simulateGesture = async ({ gesture, element, coordinates }) => {
  console.log('[Cypress Task] simulateMobileGesture — no-op stub', { gesture, element, coordinates });
  return null;
};

module.exports = { simulateGesture };
