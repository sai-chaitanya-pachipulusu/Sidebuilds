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
 * @param {string} params.purchaseRequestId - ID of the purchase request being purchased
 * @param {Object} params.stripe - Stripe.js instance (from useStripe() hook)
 * @param {Object} params.api - Axios or API client instance
 * @returns {Promise<void>} Redirects the user to Stripe checkout or throws error
 */
export const createAndRedirectToCheckout = async ({ purchaseRequestId, stripe, api }) => {
  console.log(`Creating checkout session for purchase request ID: ${purchaseRequestId}`);

  if (!stripe) {
    console.error("Stripe.js has not been loaded yet. Cannot redirect.");
    throw new Error("Payment system not ready.");
  }
  if (!purchaseRequestId) {
    console.error("Purchase Request ID is missing. Cannot create checkout session.");
    throw new Error("Purchase Request ID is required.");
  }

  try {
    // Create the checkout session via API
    console.log('Calling backend to create checkout session...');
    const response = await api.post('/payments/create-checkout-session', { 
      purchase_request_id: purchaseRequestId // Send purchase_request_id to the backend
    });
    
    const { id: sessionId, url: checkoutUrl } = response.data; // Backend might return full URL or just session ID
    
    if (!sessionId) {
      console.error('No session ID returned from server.');
      throw new Error('Failed to create checkout session: No Session ID received.');
    }
    
    console.log(`Checkout session created: ${sessionId}. Redirecting to Stripe...`);
    
    // If the backend already provides the full Stripe checkout URL, we can use it directly
    // This is often not the case; typically, only session ID is returned for client-side redirect.
    // However, if `checkoutUrl` is provided by our backend, it might be used for a direct window.location change.
    // For standard Stripe.js integration, `stripe.redirectToCheckout` is preferred.

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