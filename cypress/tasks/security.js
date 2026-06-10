/**
 * Security testing tasks for Cypress tests
 * Stub implementation.
 */

const scan = async (url) => {
  console.log('[Cypress Task] scanForVulnerabilities — no-op stub', url);
  return { vulnerabilities: [] };
};

module.exports = { scan };
