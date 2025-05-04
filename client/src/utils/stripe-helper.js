/**
 * Stripe Helper Utility
 * 
 * Functions to assist with Stripe checkout and payment processing,
 * especially for seeded/testing projects
 */

/**
 * Get a direct Stripe checkout URL from a session ID
 * This bypasses the Stripe.js redirect and uses a direct URL
 * which works more reliably for seeded projects
 * 
 * @param {string} sessionId - The Stripe checkout session ID
 * @returns {string} The direct checkout URL
 */
export const getStripeCheckoutUrl = (sessionId) => {
  if (!sessionId) {
    console.error('No session ID provided for Stripe checkout URL');
    return null;
  }
  
  // Format session ID (remove any prefix/suffix that might cause issues)
  const formattedSessionId = sessionId.trim();
  
  console.log(`Generating direct checkout URL for session ID: ${formattedSessionId}`);
  
  // Try an alternative URL format (Stripe has a few different URL patterns)
  // Note: Stripe sometimes changes their URL structure, so we're trying multiple formats
  return `https://checkout.stripe.com/pay/${formattedSessionId}`;
};

/**
 * Create a checkout session and then redirect to Stripe
 * Uses the most reliable method based on if it's a seeded project
 * 
 * @param {Object} params - Parameters for checkout
 * @param {string} params.projectId - ID of the project being purchased
 * @param {boolean} params.isSeeded - Whether this is a seeded project
 * @param {Object} params.stripe - Stripe.js instance
 * @returns {Promise<void>} Redirects the user to Stripe checkout
 */
export const createAndRedirectToCheckout = async ({ projectId, isSeeded, stripe, api }) => {
  console.log(`Creating checkout with direct redirect for project ${projectId}`);
  console.log(`Is seeded project: ${isSeeded}`);

  try {
    // Create the checkout session via API
    const response = await api.post('/payments/create-checkout-session', { 
      projectId,
      isSeeded
    });
    
    const { id: sessionId } = response.data;
    
    if (!sessionId) {
      throw new Error('No session ID returned from server');
    }
    
    console.log(`Session created: ${sessionId}`);
    
    // For all projects, get the direct URL (most reliable)
    const checkoutUrl = getStripeCheckoutUrl(sessionId);
    console.log(`Redirecting to direct URL: ${checkoutUrl}`);
    
    // Direct URL is more reliable for all projects (especially on Windows)
    window.location.assign(checkoutUrl);
    
    // Wait a moment to ensure redirect happens
    setTimeout(() => {
      // As a fallback, if still on the page, try the Stripe.js method
      if (!isSeeded && stripe) {
        console.log('Attempting Stripe.js redirect as fallback...');
        stripe.redirectToCheckout({ sessionId }).catch(err => {
          console.error('Fallback Stripe.js redirect failed:', err);
        });
      }
    }, 1000);
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    throw error;
  }
}; 