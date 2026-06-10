/**
 * Lighthouse audit tasks for Cypress tests
 * Stub implementation.
 */

const audit = async (url) => {
  console.log('[Cypress Task] runLighthouseAudit — no-op stub', url);
  return { score: 0, audits: {} };
};

module.exports = { audit };
