/**
 * Payment testing tasks for Cypress tests
 * Stub implementation.
 */

const mockStripeWebhook = async (webhookData) => {
  console.log('[Cypress Task] mockStripeWebhook — no-op stub', webhookData);
  return null;
};

const verifyPaymentIntent = async (paymentIntentId) => {
  console.log('[Cypress Task] verifyPaymentIntent — no-op stub', paymentIntentId);
  return { status: 'unknown' };
};

module.exports = { mockStripeWebhook, verifyPaymentIntent };
