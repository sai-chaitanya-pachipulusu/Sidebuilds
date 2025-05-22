import axios from 'axios';

// Create an axios instance
const apiClient = axios.create({
    // Use environment variable for base URL
    baseURL: process.env.REACT_APP_API_URL || '/api', // Fall back to relative path if env var not set
    headers: {
        'Content-Type': 'application/json',
    },
    // Add timeout to prevent hanging requests
    timeout: 15000, // 15 seconds timeout for production
});

// --- Interceptor to add JWT token to requests --- 
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token'); // Get token from local storage
        if (token) {
            // Ensure token format is correct - x-auth-token or Authorization Bearer
            config.headers['Authorization'] = `Bearer ${token}`;
            config.headers['x-auth-token'] = token;
        }
        
        // Log requests for debugging
        console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
        
        return config;
    },
    (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// --- Response interceptor for error handling --- 
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle database connection errors (useful for CockroachDB)
        if (error.code === 'ECONNABORTED') {
            console.error('Request timeout - database may be under load');
            return Promise.reject(new Error('Request timed out. Please try again later.'));
        }

        // Handle network errors
        if (!error.response) {
            console.error('Network error:', error.message);
            return Promise.reject(new Error('Network error. Please check your connection.'));
        }

        // Handle server errors (500s)
        if (error.response.status >= 500) {
            console.error('Server error:', error.response.data);
            return Promise.reject(new Error('Server error. Please try again later.'));
        }

        // Handle unauthorized errors (401)
        if (error.response.status === 401) {
            // If token is expired, dispatch a custom event instead of immediate redirect
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Dispatch a custom event that components can listen for
            const tokenExpiredEvent = new CustomEvent('tokenExpired', {
                detail: { 
                    path: window.location.pathname,
                    message: 'Your session has expired. Please log in again.'
                }
            });
            window.dispatchEvent(tokenExpiredEvent);
            
            // Don't redirect immediately - let the component handle it
            // This gives components a chance to save state
        }

        return Promise.reject(error);
    }
);

// --- Authentication API Calls --- 

export const registerUser = async (userData) => {
    try {
        const response = await apiClient.post('/auth/register', userData);
        return response.data; // Should contain { token, user }
    } catch (error) {
        console.error('Registration API error:', error.response ? error.response.data : error.message);
        // Re-throw the error or return a specific error object
        throw error.response ? error.response.data : new Error('Registration failed');
    }
};

export const loginUser = async (credentials) => {
    try {
        const response = await apiClient.post('/auth/login', credentials);
        return response.data; // Should contain { token, user }
    } catch (error) {
        console.error('Login API error:', error.response ? error.response.data : error.message);
        throw error.response ? error.response.data : new Error('Login failed');
    }
};

// --- User Profile API Calls ---
export const getUserProfile = async () => {
    try {
        const response = await apiClient.get('/users/profile');
        return response.data;
    } catch (error) {
        console.error('Get User Profile API error:', error.response ? error.response.data : error.message);
        throw error.response ? error.response.data : new Error('Failed to fetch user profile');
    }
};

export const updateUserProfile = async (profileData) => {
    try {
        const response = await apiClient.put('/users/profile', profileData);
        return response.data; // Returns the updated profile
    } catch (error) {
        console.error('Update User Profile API error:', error.response ? error.response.data : error.message);
        throw error.response ? error.response.data : new Error('Failed to update user profile');
    }
};

// --- Project API Calls (Placeholder - Add more as needed) ---

export const getProjects = async () => {
    try {
        console.log('Fetching user projects');
        const response = await apiClient.get('/projects');
        console.log(`Received ${response.data.length} user projects`);
        return response.data;
    } catch (error) {
        console.error('Get Projects API error:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        // Return empty array to prevent UI from breaking
        return [];
    }
};

export const createProject = async (projectData) => {
    try {
        const response = await apiClient.post('/projects', projectData);
        return response.data; // Returns the newly created project
    } catch (error) {
        console.error('Create Project API error:', error.response ? error.response.data : error.message);
        throw error.response ? error.response.data : new Error('Failed to create project');
    }
};

export const getProjectById = async (projectId) => {
    try {
        const response = await apiClient.get(`/projects/${projectId}`);
        return response.data;
    } catch (error) {
        console.error('Get Project By ID API error:', error.response ? error.response.data : error.message);
        throw error.response ? error.response.data : new Error('Failed to fetch project details');
    }
};

export const updateProject = async (projectId, projectData) => {
    try {
        const response = await apiClient.put(`/projects/${projectId}`, projectData);
        return response.data; // Returns the updated project
    } catch (error) {
        console.error('Update Project API error:', error.response ? error.response.data : error.message);
        throw error.response ? error.response.data : new Error('Failed to update project');
    }
};

export const deleteProject = async (projectId) => {
    try {
        const response = await apiClient.delete(`/projects/${projectId}`);
        return response.data; // Returns { message: '...', projectId: ... }
    } catch (error) {
        console.error('Delete Project API error:', error.response ? error.response.data : error.message);
        throw error.response ? error.response.data : new Error('Failed to delete project');
    }
};

// --- Public API Calls ---

export const getPublicProjects = async () => {
    try {
        console.log('Fetching public projects');
        // Note: No token needed for this public endpoint
        const response = await apiClient.get('/public/projects'); 
        console.log(`Received ${response.data.length} public projects`);
        return response.data;
    } catch (error) {
        console.error('Get Public Projects API error:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        // Return empty array to prevent UI from breaking
        return [];
    }
};

export const getMarketplaceProjects = async () => {
    try {
        console.log('Calling marketplace API endpoint');
        const response = await apiClient.get('/public/marketplace');
        console.log('Marketplace API response received:', response.data.length, 'projects');
        return response.data;
    } catch (error) {
        console.error('Get Marketplace Projects API error:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        } else if (error.request) {
            console.error('No response received. Request:', error.request);
        }
        return []; // Return empty array instead of throwing to avoid breaking UI
    }
};

// --- Health Check ---

export const checkApiHealth = async () => {
    try {
        const response = await apiClient.get('/'); 
        return response.data;
    } catch (error) {
        console.error('API Health Check error:', error.response ? error.response.data : error.message);
        throw error.response ? error.response.data : new Error('API health check failed');
    }
};

// Payment API calls
export const createCheckoutSession = async (projectId) => {
    const response = await apiClient.post('/payments/create-checkout-session', { projectId });
    return response.data;
};

export const getTransactionStatus = async (sessionId) => {
    const response = await apiClient.get(`/payments/status/${sessionId}`);
    return response.data;
};

export const getUserTransactions = async () => {
    const response = await apiClient.get('/payments/transactions');
    return response.data;
};

// Transfer status API calls
export const getTransferStatus = async (projectId) => {
    try {
        const response = await apiClient.get(`/payments/transfers/${projectId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching transfer status:', error);
        throw error.response?.data || error;
    }
};

// CORRECTED: Function for seller to update transfer status of a purchase request
export const updateSellerTransferStatus = async (requestId, statusData) => {
    // statusData should be an object like { status: 'new_status', message: 'optional_notes' }
    try {
        const response = await apiClient.put(`/purchase-requests/${requestId}/transfer-status`, statusData);
        return response.data;
    } catch (error) {
        console.error('Error updating seller transfer status:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// --- Stripe Connect API Calls ---
export const getStripeAccountStatus = async () => {
    try {
        const response = await apiClient.get('/users/stripe-status');
        return response.data;
    } catch (error) {
        console.error('Get Stripe Account Status API error:', error.response ? error.response.data : error.message);
        throw error.response ? error.response.data : new Error('Failed to fetch Stripe account status');
    }
};

export const createStripeAccountLink = async (/* type = 'account_onboarding' */) => { // type is handled by backend or defaults
    try {
        // console.log(`API: Creating Stripe Account Link, type: ${type}`); // Type no longer sent
        console.log('API: Initiating Stripe Connect account link creation/retrieval.');
        // Corrected endpoint and removed 'type' from body as backend /connect/create-account handles it
        const response = await apiClient.post('/payments/connect/create-account', {}); 
        console.log('API: Stripe Account Link call successful', response.data);
        // Backend route /connect/create-account returns { success: true, url: accountLink.url } 
        // or { success: true, onboarding_complete: true, message: '...' }
        if (!response.data.url && !response.data.onboarding_complete) {
            throw new Error('Stripe account link URL not provided and onboarding not marked complete.');
        }
        return response.data; // Expects { url: '...' } or info about completion
    } catch (error) {
        console.error('Create Stripe Account Link API error:', error.response ? error.response.data : error.message);
        if (error.response && error.response.data && error.response.data.error_code === 'stripe_account_not_found') {
            throw new Error('Stripe account not found. Please ensure your account is set up.');
        }
        // Provide a more generic error, or let the component handle specific messages from response
        const defaultMessage = 'Failed to create or retrieve Stripe account link. Please try again.';
        throw new Error(error.response?.data?.error || error.message || defaultMessage);
    }
};

export const checkStripeOnboardingStatus = async () => {
    try {
        console.log("Calling Stripe onboarding status endpoint...");
        const response = await apiClient.get('/stripe/check-onboarding-status');
        console.log("Stripe onboarding status response:", response.data);
        return response.data; // { isOnboardingComplete: boolean, needsAttention: boolean, accountId: string | null }
    } catch (error) {
        console.error('Check Stripe Onboarding Status API error:');
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
            throw error.response.data;
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received:', error.request);
            throw new Error('No response received from server when checking Stripe status. Please try again later.');
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error setting up request:', error.message);
            throw new Error('Failed to check Stripe onboarding status: ' + error.message);
        }
    }
};


// Debug API calls (development only)
export const debugTransferProject = async (projectId, sellerId) => {
    const response = await apiClient.post('/payments/debug/transfer-project', {
        projectId,
        sellerId
    });
    return response.data;
};

export const getProjectAnalytics = async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}/analytics`);
    return response.data;
};

// --- Purchase Request API Calls ---

export const requestProjectPurchase = async (projectId, termsAgreedVersion) => {
    try {
        const response = await apiClient.post(`/purchase-requests/projects/${projectId}/request`, { terms_agreed_version: termsAgreedVersion });
        return response.data;
    } catch (error) {
        console.error('Error requesting project purchase:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const getSellerPurchaseRequests = async () => {
    try {
        const response = await apiClient.get('/purchase-requests/seller');
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Failed to fetch seller purchase requests.';
        console.error('Error fetching seller purchase requests:', errorMessage, error.response?.data);
        throw new Error(errorMessage);
    }
};

export const getBuyerPurchaseRequests = async () => {
    try {
        const response = await apiClient.get('/purchase-requests/buyer');
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Failed to fetch buyer purchase requests.';
        console.error('Error fetching buyer purchase requests:', errorMessage, error.response?.data);
        throw new Error(errorMessage);
    }
};

export const acceptPurchaseRequest = async (requestId, termsAgreedVersion) => {
    try {
        const response = await apiClient.post(`/purchase-requests/${requestId}/accept`, { terms_agreed_version: termsAgreedVersion });
        return response.data;
    } catch (error) {
        console.error('Error accepting purchase request:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const rejectPurchaseRequest = async (requestId, rejectionReason) => {
    try {
        const response = await apiClient.post(`/purchase-requests/${requestId}/reject`, { rejection_reason: rejectionReason });
        return response.data;
    } catch (error) {
        console.error('Error rejecting purchase request:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const confirmTransferReceived = async (requestId) => {
    try {
        const response = await apiClient.post(`/purchase-requests/${requestId}/confirm-transfer`);
        return response.data;
    } catch (error) {
        console.error('Error confirming transfer received:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// --- End Purchase Request API Calls ---

// Function to create Stripe Checkout session for a purchase request
export const createCheckoutSessionForPurchaseRequest = async (purchaseRequestId) => {
    try {
        const response = await apiClient.post('/payments/create-checkout-session', { purchase_request_id: purchaseRequestId });
        return response.data; // Should contain { url: checkoutSessionUrl, sessionId: ... }
    } catch (error) {
        console.error('Error creating checkout session for purchase request:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// --- New Workflow API Calls ---

// Called by buyer to initiate interest with initial commitments
export const expressInterestInProject = async (projectId, buyerInitialCommitments, buyerIntroMessage) => {
    try {
        const response = await apiClient.post(`/purchase-requests/projects/${projectId}/request`, { 
            buyer_initial_commitments: buyerInitialCommitments, 
            buyer_intro_message: buyerIntroMessage 
        });
        return response.data;
    } catch (error) {
        console.error('Error expressing interest in project:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// Called by seller to propose terms, including asset list
export const sellerProposeTerms = async (requestId, sellerCommitments, agreedTransferableAssets, sellerProposalMessage) => {
    try {
        const response = await apiClient.put(`/purchase-requests/${requestId}/seller-propose-terms`, { 
            seller_commitments: sellerCommitments, 
            agreed_transferable_assets: agreedTransferableAssets, 
            seller_proposal_message: sellerProposalMessage 
        });
        return response.data;
    } catch (error) {
        console.error('Error for seller proposing terms:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// Called by buyer to accept seller's proposed terms
export const buyerAcceptsTerms = async (requestId, buyerFinalAgreement, buyerDigitalSignature) => {
    try {
        const response = await apiClient.put(`/purchase-requests/${requestId}/buyer-accepts-terms`, { 
            buyer_final_agreement: buyerFinalAgreement, 
            buyer_digital_signature: buyerDigitalSignature 
        });
        return response.data;
    } catch (error) {
        console.error('Error for buyer accepting terms:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// Called by buyer to withdraw their interest
export const buyerWithdrawInterest = async (requestId, withdrawalReason) => {
    try {
        const response = await apiClient.put(`/purchase-requests/${requestId}/withdraw-interest`, { 
            withdrawal_reason: withdrawalReason 
        });
        return response.data;
    } catch (error) {
        console.error('Error for buyer withdrawing interest:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// Called by seller to decline buyer's initial interest
export const sellerDeclineInterest = async (requestId, declineReason) => {
    try {
        const response = await apiClient.put(`/purchase-requests/${requestId}/decline-interest`, { 
            decline_reason: declineReason 
        });
        return response.data;
    } catch (error) {
        console.error('Error for seller declining interest:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// --- End New Workflow API Calls ---

// --- Notification API Calls ---
export const getNotifications = async () => {
    try {
        const response = await apiClient.get('/notifications');
        return response.data;
    } catch (error) {
        console.error('Error fetching notifications:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const markNotificationAsRead = async (notificationId) => {
    try {
        const response = await apiClient.post(`/notifications/${notificationId}/mark-read`);
        return response.data;
    } catch (error) {
        console.error(`Error marking notification ${notificationId} as read:`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const markAllNotificationsAsRead = async () => {
    try {
        const response = await apiClient.post('/notifications/mark-all-read');
        return response.data;
    } catch (error) {
        console.error('Error marking all notifications as read:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};
// --- End Notification API Calls ---

// --- Purchase Request Message API Calls ---
export const getPurchaseRequestMessages = async (requestId) => {
    if (!requestId) {
        console.error('Error: requestId is required to fetch messages.');
        throw new Error('Request ID is required.');
    }
    try {
        const response = await apiClient.get(`/purchase-requests/${requestId}/messages`);
        return response.data; // Expected to be an array of message objects
    } catch (error) {
        console.error(`Error fetching messages for request ${requestId}:`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const sendPurchaseRequestMessage = async (requestId, content) => {
    if (!requestId || !content) {
        console.error('Error: requestId and content are required to send a message.');
        throw new Error('Request ID and message content are required.');
    }
    try {
        const response = await apiClient.post(`/purchase-requests/${requestId}/messages`, { content });
        return response.data; // Expected to be the newly created message object
    } catch (error) {
        console.error(`Error sending message for request ${requestId}:`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};
// --- End Purchase Request Message API Calls ---

export default apiClient; // Ensure apiClient is the default export