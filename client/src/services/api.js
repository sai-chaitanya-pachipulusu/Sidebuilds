import axios from 'axios';
import { resolveServiceUrl } from '../config/apiUrl';
// (Removed unused imports)

// Create an axios instance
const apiClient = axios.create({
    // Use consistent backend port (server runs on 5002)
    baseURL: resolveServiceUrl(process.env.REACT_APP_API_URL, 'http://localhost:5002/api'),
    headers: {
        'Content-Type': 'application/json',
    },
    // Add timeout to prevent hanging requests
    timeout: 15000, // 15 seconds timeout for production
});

const isDev = process.env.NODE_ENV === 'development';
let refreshPromise = null;
const expireSession = () => {
    const hadToken = !!localStorage.getItem('token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete apiClient.defaults.headers.common['Authorization'];
    if (hadToken) window.dispatchEvent(new CustomEvent('tokenExpired', {
        detail: { message: 'Your session has expired. Sign in again when you are ready.' }
    }));
};

if (isDev) {
    console.log('🌐 API Client configured with baseURL:', apiClient.defaults.baseURL);
}

// Validate the stored token format and clear it if malformed.
// Never logs token contents outside development.
const debugToken = () => {
    const token = localStorage.getItem('token');

    if (token) {
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                if (isDev) {
                    const payload = JSON.parse(atob(parts[1]));
                    console.log('🔍 Token expires:', new Date(payload.exp * 1000),
                        '| expired:', Date.now() > payload.exp * 1000);
                }
            } else {
                if (isDev) console.log('⚠️ Invalid token format, clearing token');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        } catch (e) {
            if (isDev) console.log('⚠️ Token decode error, clearing token:', e.message);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }
};

// Run debug on startup
debugToken();

// Export function to clear auth state (can be called from console)
window.clearAuthState = () => {
    console.log('🧹 Clearing authentication state...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
};

// Export debug function for console access
window.debugToken = debugToken;

// --- Interceptor to add JWT token to requests --- 
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
            // Basic validation: check if token has proper JWT format
            const parts = token.split('.');
            if (parts.length === 3) {
                config.headers['Authorization'] = `Bearer ${token}`;
                if (isDev) console.log('🔑 Adding token to request:', config.url);
            } else {
                if (isDev) console.log('⚠️ Invalid token format detected, clearing token');
                expireSession();
                delete config.headers['Authorization'];
            }
        } else {
            if (isDev) console.log('⚠️ No token found for request:', config.url);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// --- Response interceptor for error handling ---
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Handle database connection errors
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

        // Refresh once through a separate transport: refresh failures must never
        // enter this interceptor recursively or consume the login rate limit.
        const config = error.config || {};
        const currentToken = localStorage.getItem('token');
        const authEndpoint = /\/auth\/(?:login|register|refresh)(?:\?|$)/.test(config.url || '');
        if (error.response.status === 401 && currentToken && !authEndpoint) {
            const expired = /expired/i.test(error.response.data?.message || '');
            if (expired && !config._retry) {
                config._retry = true;
                try {
                    if (!refreshPromise) {
                        refreshPromise = axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {}, {
                            headers: { Authorization: `Bearer ${currentToken}` }, timeout: 15000
                        }).finally(() => { refreshPromise = null; });
                    }
                    const { data } = await refreshPromise;
                    if (!data?.token || !data?.user) throw new Error('Missing refreshed session');
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                    config.headers = { ...config.headers, Authorization: `Bearer ${data.token}` };
                    return apiClient(config);
                } catch (_refreshError) {
                    expireSession();
                }
            } else {
                expireSession();
            }
        }

        return Promise.reject(error);
    }
);

// --- Authentication API Calls --- 

const toApiError = (error, fallbackMessage) => {
    const data = error.response?.data;
    const message = data?.message || data?.error || error.message || fallbackMessage;
    const normalizedError = new Error(message);
    normalizedError.status = error.response?.status;
    normalizedError.retryAfter = data?.retryAfter;
    normalizedError.code = data?.code;
    normalizedError.data = data;
    return normalizedError;
};

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

export const requestPasswordReset = async (email) => {
    try {
        const response = await apiClient.post('/auth/forgot-password', { email });
        return response.data;
    } catch (error) {
        console.error('Forgot password API error:', error.response ? error.response.data : error.message);
        throw toApiError(error, 'Password reset request failed');
    }
};

export const validatePasswordResetLink = async (token) => {
    try {
        const response = await apiClient.post('/auth/reset-password/validate', { token });
        return response.data;
    } catch (error) {
        throw toApiError(error, 'Reset link could not be checked');
    }
};

export const resetPassword = async ({ token, password }) => {
    try {
        const response = await apiClient.post('/auth/reset-password', { token, password });
        return response.data;
    } catch (error) {
        console.error('Reset password API error:', error.response ? error.response.data : error.message);
        throw toApiError(error, 'Password reset failed');
    }
};

export const refreshToken = async () => {
    try {
        const response = await apiClient.post('/auth/refresh');
        return response.data; // Should contain { token, user }
    } catch (error) {
        console.error('Token refresh API error:', error.response ? error.response.data : error.message);
        throw error.response ? error.response.data : new Error('Token refresh failed');
    }
};

export const verifyToken = async () => {
    try {
        const response = await apiClient.post('/auth/verify');
        return response.data; // Should contain { valid: true/false, user }
    } catch (error) {
        console.error('Token verification API error:', error.response ? error.response.data : error.message);
        throw error.response ? error.response.data : new Error('Token verification failed');
    }
};

// --- User Profile API Calls ---
export const getUserProfile = async () => {
    try {
        const response = await apiClient.get('/users/profile');
        return response.data;
    } catch (error) {
        console.error('Get User Profile API error:', error.response ? error.response.data : error.message);
        // Normalized error keeps `.status` so callers can react to 401/403.
        throw toApiError(error, 'Failed to fetch user profile');
    }
};

export const updateUserProfile = async (profileData) => {
    try {
        const response = await apiClient.put('/users/profile', profileData);
        return response.data; // Returns the updated profile
    } catch (error) {
        console.error('Update User Profile API error:', error.response ? error.response.data : error.message);
        throw toApiError(error, 'Failed to update user profile');
    }
};

// --- Admin API Calls ---
export const getAdminStats = async () => {
    const { data } = await apiClient.get('/admin/stats');
    return data;
};

export const getAdminUsers = async () => {
    const { data } = await apiClient.get('/admin/users');
    return data;
};

export const getAdminProjects = async () => {
    const { data } = await apiClient.get('/admin/projects');
    return data;
};

export const getAdminTransactions = async () => {
    const { data } = await apiClient.get('/admin/transactions');
    return data;
};

// Get user profile by ID
export const getUserProfileById = async (userId) => {
    const { data } = await apiClient.get(`/users/${userId}/profile`);
    return data;
};

// Get user projects
export const getUserProjects = async (userId) => {
    const { data } = await apiClient.get(`/users/${userId}/projects`);
    return data;
};

// Get transaction details
export const getTransaction = async (transactionId) => {
    const { data } = await apiClient.get(`/transactions/${transactionId}`);
    return data;
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
        throw new Error('Your projects are temporarily unavailable. Please try again.');
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
        console.log(`Attempting to fetch project ID: ${projectId}`);
        
        // For marketplace projects, try public endpoint first
        try {
            const publicResponse = await apiClient.get(`/public/projects/${projectId}`);
            console.log('Successfully fetched public project:', publicResponse.data);
            return publicResponse.data;
        } catch (publicError) {
            console.log('Public project fetch failed, trying private:', publicError.response?.status);
            
            // If public fails, try private project (for owners)
            if (publicError.response?.status === 404) {
                try {
                    const privateResponse = await apiClient.get(`/projects/${projectId}`);
                    console.log('Successfully fetched private project:', privateResponse.data);
                    return privateResponse.data;
                } catch (privateError) {
                    console.error('Both public and private project fetch failed');
                    throw new Error('Project not found or access denied');
                }
            }
            throw publicError;
        }
    } catch (error) {
        console.error('Get Project By ID API error:', error);
        throw new Error(error.message || 'Failed to fetch project details');
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

export const toggleHoldProject = async (projectId) => {
    try {
        const response = await apiClient.patch(`/projects/${projectId}/toggle-hold`);
        return response.data;
    } catch (error) {
        console.error('Toggle hold project API error:', error.response?.data || error.message);
        throw error.response?.data || new Error('Failed to update project hold status');
    }
};

export const uploadProjectFiles = async (projectId, files, options = {}) => {
    try {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
        if (options.description) formData.append('description', options.description);
        if (options.is_public !== undefined) formData.append('is_public', String(options.is_public));

        const response = await apiClient.post(`/files/upload/${projectId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: options.onProgress
        });
        return response.data;
    } catch (error) {
        console.error('Upload project files API error:', error.response?.data || error.message);
        throw error.response?.data || new Error('Failed to upload project files');
    }
};

export const getProjectFiles = async (projectId) => {
    try {
        const response = await apiClient.get(`/files/project/${projectId}`);
        return response.data;
    } catch (error) {
        console.error('Get project files API error:', error.response?.data || error.message);
        throw error.response?.data || new Error('Failed to fetch project files');
    }
};

export const deleteProjectFile = async (projectId, fileId) => {
    try {
        const response = await apiClient.delete(`/files/${fileId}`);
        return response.data;
    } catch (error) {
        console.error('Delete project file API error:', error.response?.data || error.message);
        throw error.response?.data || new Error('Failed to delete project file');
    }
};

// --- AI API Calls ---
export const aiIdeaAssist = async ({ stage, category, prompt }) => {
    try {
        const response = await apiClient.post('/ai/idea-assist', { stage, category, prompt });
        return response.data; // { stage, template }
    } catch (error) {
        console.error('AI Idea Assist API error:', error.response?.data || error.message);
        throw error.response?.data || new Error('Failed to generate stage template');
    }
};

export const getDueDiligenceReport = async (projectId) => {
    try {
        const response = await apiClient.get(`/ai/due-diligence/${projectId}`);
        return response.data;
    } catch (error) {
        console.error('Due diligence report API error:', error.response?.data || error.message);
        throw error.response?.data || new Error('Failed to generate due diligence report');
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
        const projects = Array.isArray(response.data) ? response.data : response.data?.data || [];
        console.log(`Received ${projects.length} public projects`);
        return projects;
    } catch (error) {
        console.error('Get Public Projects API error:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        throw new Error('Public projects are temporarily unavailable. Please try again.');
    }
};

// Fetch marketplace statistics
export const getMarketplaceStats = async () => {
  try {
    const response = await apiClient.get('/public/stats/marketplace');
    const data = response.data;
    return {
      totalProjects: Number(data.totalProjects ?? data.projects_count ?? 0),
      activeListings: Number(data.activeListings ?? data.active_listings ?? 0),
      totalValue: Number(data.totalValue ?? data.total_value ?? 0),
      successfulSales: Number(data.successfulSales ?? data.completed_sales ?? 0),
      projectsCount: Number(data.totalProjects ?? data.projects_count ?? 0),
      activeUsers: Number(data.activeUsers ?? data.users_count ?? 0),
      developerCount: Number(data.activeUsers ?? data.users_count ?? 0),
      completedSales: Number(data.successfulSales ?? data.completed_sales ?? 0),
      avgValue: Number(data.successfulSales ?? data.completed_sales) > 0
        ? Math.floor(Number(data.totalValue ?? data.total_value ?? 0) / Number(data.successfulSales ?? data.completed_sales)) : 0
    };
  } catch (error) {
    console.error('Error fetching marketplace stats:', error);
    throw new Error('Live statistics are temporarily unavailable.');
  }
};

export const getMarketplaceProjects = async (params = {}) => {
    try {
        console.log('Calling marketplace API endpoint');
        const response = await apiClient.get('/public/marketplace', { params });
        const count = Array.isArray(response.data) ? response.data.length : response.data?.data?.length || 0;
        console.log('Marketplace API response received:', count, 'projects');
        return response.data;
    } catch (error) {
        console.error('Get Marketplace Projects API error:', error);
        if (error.response?.status === 400) {
            throw new Error(error.response.data?.message || 'Please check your marketplace filters.');
        }
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        } else if (error.request) {
            console.error('No response received. Request:', error.request);
        }
        throw new Error('Marketplace is temporarily unavailable. Please try again.');
    }
};

// --- Health Check ---

export const checkApiHealth = async () => {
    try {
        const response = await apiClient.get('/status');
        return response.data;
    } catch (error) {
        console.error('API Health Check error:', error.response ? error.response.data : error.message);
        throw error.response ? error.response.data : new Error('API health check failed');
    }
};

// Payment API calls - DEPRECATED: Use createCheckoutSessionForPurchaseRequest instead
export const createCheckoutSession = async (projectId) => {
    console.warn('createCheckoutSession is deprecated. Use createCheckoutSessionForPurchaseRequest with purchase_request_id instead.');
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

export const checkStripeOnboardingStatus = async () => {
    try {
        // Corrected the endpoint to the single source of truth for Stripe status.
        const response = await apiClient.get('/users/stripe-status');
        return response.data; // { isOnboardingComplete: boolean, needsAttention: boolean, accountId: string | null, arePayoutsEnabled: boolean }
    } catch (error) {
        console.error('Check Stripe Onboarding Status API error:', error.response?.data || error.message);
        throw error.response?.data || new Error('Failed to check Stripe onboarding status.');
    }
};

export const createStripeAccountLink = async () => {
    try {
        // Try the new Stripe route first
        const response = await apiClient.post('/stripe/create-account-link', {});
        if (!response.data.url && !response.data.onboarding_complete) {
            throw new Error('Stripe account link URL not provided and onboarding not marked complete.');
        }
        return response.data;
    } catch (error) {
        console.error('Create Stripe Account Link API error:', error.response ? error.response.data : error.message);
        const defaultMessage = 'Failed to create or retrieve Stripe account link. Please try again.';
        throw new Error(error.response?.data?.error || error.message || defaultMessage);
    }
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
export const createCheckoutSessionForPurchaseRequest = async (purchaseRequestId, idempotencyKey, agreementId) => {
    try {
        const response = await apiClient.post(
            '/payments/create-checkout-session',
            { purchase_request_id: purchaseRequestId, agreement_id: agreementId },
            idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined
        );
        return response.data; // Should contain { url: checkoutSessionUrl, sessionId: ... }
    } catch (error) {
        console.error('Error creating checkout session for purchase request:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// Direct “Buy now” flow: reserve the project for this buyer, then use the
// returned purchase-request ID with the server-authoritative Stripe endpoint.
export const initiateProjectCheckout = async (projectId, idempotencyKey) => {
    const response = await apiClient.post(
        `/purchase-requests/projects/${projectId}/initiate-checkout`,
        { terms_agreed_version: 'v_direct_buy_1.0' },
        { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return response.data;
};

// --- New Workflow API Calls ---

// Called by buyer to initiate interest with initial commitments
export const expressInterestInProject = async (projectId, buyerInitialCommitments, buyerIntroMessage) => {
    try {
        console.log('Sending interest request with data:', {
            projectId,
            buyerCommitments: buyerInitialCommitments,
            buyerIntroMessage
        });
        
        const response = await apiClient.post(`/purchase-requests/projects/${projectId}/request`, { 
            buyerCommitments: buyerInitialCommitments,
            buyerIntroMessage: buyerIntroMessage
        });
        return response.data;
    } catch (error) {
        console.error('Error expressing interest in project:', error.response?.data || error.message);
        // Throw the original error object so we can access status codes and error details
        if (error.response) {
            throw error; // Axios error with response
        }
        throw new Error(error.message || 'Failed to send interest');
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

// --- Saved Projects (Watchlist) ---
export const getSavedProjects = async () => {
    const response = await apiClient.get('/saves');
    return response.data;
};

export const getSavedProjectIds = async () => {
    const response = await apiClient.get('/saves/ids');
    return response.data;
};

export const saveProject = async (projectId) => {
    const response = await apiClient.post(`/saves/${projectId}`);
    return response.data;
};

export const unsaveProject = async (projectId) => {
    const response = await apiClient.delete(`/saves/${projectId}`);
    return response.data;
};

// --- Reviews ---
export const getSellerReviews = async (sellerId) => {
    const response = await apiClient.get(`/reviews/seller/${sellerId}`);
    return response.data; // { reviews, summary: { review_count, average_rating } }
};

export const getProjectReviews = async (projectId) => {
    const response = await apiClient.get(`/reviews/project/${projectId}`);
    return response.data;
};

export const createReview = async ({ project_id, rating, title, comment }) => {
    const response = await apiClient.post('/reviews', { project_id, rating, title, comment });
    return response.data;
};

// --- Project Q&A ---
export const getProjectQuestions = async (projectId) => {
    const response = await apiClient.get(`/questions/project/${projectId}`);
    return response.data;
};

export const askProjectQuestion = async (projectId, question) => {
    const response = await apiClient.post(`/questions/project/${projectId}`, { question });
    return response.data;
};

export const answerProjectQuestion = async (questionId, answer) => {
    const response = await apiClient.post(`/questions/${questionId}/answer`, { answer });
    return response.data;
};

// --- Follows ---
export const getFollowing = async () => {
    const response = await apiClient.get('/follows/following');
    return response.data;
};

export const getFollowStatus = async (userId) => {
    const response = await apiClient.get(`/follows/status/${userId}`);
    return response.data; // { follower_count, is_following }
};

export const followUser = async (userId) => {
    const response = await apiClient.post(`/follows/${userId}`);
    return response.data;
};

export const unfollowUser = async (userId) => {
    const response = await apiClient.delete(`/follows/${userId}`);
    return response.data;
};

// --- Trending ---
export const getTrendingProjects = async (limit = 12) => {
    const response = await apiClient.get(`/public/trending?limit=${limit}`);
    return response.data; // { data: [...] }
};

export default apiClient; // Ensure apiClient is the default export
