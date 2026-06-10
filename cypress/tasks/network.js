/**
 * Network simulation tasks for Cypress tests
 * Stub implementation.
 */

const throttle = async (conditions) => {
  console.log('[Cypress Task] throttleNetwork — no-op stub', conditions);
  return null;
};

const setConditions = async (conditions) => {
  console.log('[Cypress Task] setNetworkConditions — no-op stub', conditions);
  return null;
};

module.exports = { throttle, setConditions };
