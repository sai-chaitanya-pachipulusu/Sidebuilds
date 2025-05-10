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

/**
 * Check and process a pending purchase after redirecting back from Stripe
 * 
 * @param {string} sessionId - Stripe checkout session ID
 * @param {string} projectId - Project ID that was purchased
 * @param {Object} apiClient - Axios or API client instance
 * @returns {Promise<Object>} Transaction details if successful
 */
export const checkAndProcessPendingPurchase = async (sessionId, projectId, apiClient) => {
  try {
    console.log(`Checking transaction status for session ${sessionId}, project ${projectId}`);
    
    // First, check the transaction status
    const response = await apiClient.get(`/payments/status/${sessionId}`);
    
    if (!response || !response.data) {
      throw new Error('No transaction data found for this session');
    }
    
    const transaction = response.data;
    console.log(`Transaction status: ${transaction.status}`);
    
    // If the transaction is completed, we're good to go
    if (transaction.status === 'completed') {
      console.log('Transaction is already completed');
      return transaction;
    }
    
    // If the transaction is still pending, try to poll for updates
    if (transaction.status === 'pending') {
      console.log('Transaction is pending, waiting for completion...');
      // You could implement polling logic here if needed
      // For now, just return the pending transaction
      return transaction;
    }
    
    // Handle other statuses
    console.warn(`Transaction has unexpected status: ${transaction.status}`);
    return transaction;
    
  } catch (error) {
    console.error('Error checking transaction status:', error);
    throw error;
  }
} 