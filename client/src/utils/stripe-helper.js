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
    
    // Store the session ID in localStorage so we can check it later
    localStorage.setItem('lastCheckoutSessionId', sessionId);
    localStorage.setItem('checkoutProjectId', projectId);
    localStorage.setItem('checkoutTimestamp', Date.now().toString());
    
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

/**
 * Manually check and process a completed payment if the webhook hasn't done so
 * This is a fallback to ensure purchases appear in the user's dashboard
 * 
 * @param {Object} api - Axios or API client instance
 * @returns {Promise<boolean>} True if a manual processing was initiated
 */
export const checkAndProcessPendingPurchase = async (api) => {
  try {
    // Check if we have a recent checkout session stored
    const sessionId = localStorage.getItem('lastCheckoutSessionId');
    const projectId = localStorage.getItem('checkoutProjectId');
    const timestamp = localStorage.getItem('checkoutTimestamp');
    
    // If no session or too old (more than 30 minutes), ignore
    if (!sessionId || !projectId || !timestamp) {
      return false;
    }
    
    const timestampAge = Date.now() - parseInt(timestamp);
    if (timestampAge > 30 * 60 * 1000) { // 30 minutes
      // Clear old data
      localStorage.removeItem('lastCheckoutSessionId');
      localStorage.removeItem('checkoutProjectId');
      localStorage.removeItem('checkoutTimestamp');
      return false;
    }
    
    console.log(`Checking status of pending purchase session: ${sessionId}`);
    
    // Call an API to manually process this purchase if needed
    const response = await api.post('/payments/manual-process', { 
      sessionId, 
      projectId
    });
    
    if (response.data.success) {
      console.log('Manual processing of purchase succeeded:', response.data);
      
      // Clear the stored session data
      localStorage.removeItem('lastCheckoutSessionId');
      localStorage.removeItem('checkoutProjectId');
      localStorage.removeItem('checkoutTimestamp');
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking pending purchase:', error);
    return false;
  }
}; 