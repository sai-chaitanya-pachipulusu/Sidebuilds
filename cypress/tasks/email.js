/**
 * Email testing tasks for Cypress tests
 * Stub implementation.
 */

const getEmails = async (criteria) => {
  console.log('[Cypress Task] getEmails — no-op stub', criteria);
  return [];
};

const clear = async () => {
  console.log('[Cypress Task] clearEmails — no-op stub');
  return null;
};

module.exports = { getEmails, clear };
