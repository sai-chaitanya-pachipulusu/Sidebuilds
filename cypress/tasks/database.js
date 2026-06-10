/**
 * Database tasks for Cypress tests
 * Stub implementation — replace with real logic for full test suites.
 */

const reset = async () => {
  console.log('[Cypress Task] db:reset — no-op stub');
  return null;
};

const seed = async (data) => {
  console.log('[Cypress Task] db:seed — no-op stub', data);
  return null;
};

const cleanup = async () => {
  console.log('[Cypress Task] db:cleanup — no-op stub');
  return null;
};

module.exports = { reset, seed, cleanup };
