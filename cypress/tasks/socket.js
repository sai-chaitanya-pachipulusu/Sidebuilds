/**
 * WebSocket testing tasks for Cypress tests
 * Stub implementation.
 */

const mockEvent = async ({ event, data }) => {
  console.log('[Cypress Task] mockSocketEvent — no-op stub', { event, data });
  return null;
};

module.exports = { mockEvent };
