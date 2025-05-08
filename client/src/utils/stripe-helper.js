/**
 * Stripe Helper Utility
 * 
 * Functions to assist with Stripe checkout and payment processing,
 * especially for seeded/testing projects
 */

/**
 * Create a checkout session and then redirect to Stripe using stripe.redirectToCheckout()
 * 
 * @param {Object} params - Parameters for checkout
 * @param {string} params.projectId - ID of the project being purchased
 * @param {boolean} params.isSeeded - Whether this is a seeded project
 * @param {Object} params.stripe - Stripe.js instance (from useStripe() hook)
 * @param {Object} params.api - Axios or API client instance
 * @returns {Promise<void>} Redirects the user to Stripe checkout or throws error
 */
export const createAndRedirectToCheckout = async ({ projectId, isSeeded, stripe, api }) => {
  console.log(`Creating checkout session for project ${projectId}`);
  console.log(`Is seeded project: ${isSeeded}`);

  if (!stripe) {
    console.error("Stripe.js has not been loaded yet. Cannot redirect.");
    throw new Error("Payment system not ready.");
  }

  try {
    // Create the checkout session via API
    console.log('Calling backend to create checkout session...');
    const response = await api.post('/payments/create-checkout-session', { 
      projectId,
      isSeeded // Pass isSeeded status if backend uses it
    });
    
    const { id: sessionId } = response.data;
    
    if (!sessionId) {
      console.error('No session ID returned from server.');
      throw new Error('Failed to create checkout session: No Session ID received.');
    }
    
    console.log(`Checkout session created: ${sessionId}. Redirecting to Stripe...`);
    
    // Use the standard Stripe.js method to redirect
    const { error } = await stripe.redirectToCheckout({ sessionId });
    
    // If redirectToCheckout fails (e.g., user closes tab before redirect),
    // it will return an error object.
    if (error) {
      console.error('Stripe redirectToCheckout error:', error);
      // You might want to display this error message to the user
      throw new Error(error.message || 'Failed to redirect to payment page.');
    }

    // If redirect is successful, the user's browser navigates away,
    // so code execution essentially stops here in the current context.

  } catch (error) {
    console.error('Error during checkout creation or redirect:', error);
    // Re-throw the error so the calling component (MarketplacePage) can handle it (e.g., show error message)
    throw error;
  }
}; 