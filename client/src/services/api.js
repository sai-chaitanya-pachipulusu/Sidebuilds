import axios from 'axios';
import apiCache, { CACHE_TTL, cachedFetch } from '../utils/apiCache';

// Create an axios instance
const apiClient = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5002/api',
    headers: { 'Content-Type': 'application/json' },
    timeout: 8000, // 8 seconds — fail fast, show clear error
});

// ── Slow-request warning (Render cold start UX) ───────────────────────────
// If a request takes > 3s, show a toast so the user knows the server is waking up
let slowRequestToast = null;
apiClient.interceptors.request.use((config) => {
    config._requestStart = Date.now();
    config._slowTimer = setTimeout(() => {
        // Dynamically import toast to avoid circular deps
        import('react-hot-toast').then(({ default: toast }) => {
            slowRequestToast = toast.loading(
                '⏳ Server is starting up, please wait a moment...', 
                { id: 'server-wakeup', duration: 20000 }
            );
        });
    }, 3000);
    return config;
});
apiClient.interceptors.response.use(
    (response) => {
        clearTimeout(response.config._slowTimer);
        if (slowRequestToast) {
            import('react-hot-toast').then(({ default: toast }) => {
                toast.dismiss('server-wakeup');
            });
            slowRequestToast = null;
        }
        return response;
    },
    (error) => {
        if (error.config?._slowTimer) clearTimeout(error.config._slowTimer);
        if (slowRequestToast) {
            import('react-hot-toast').then(({ default: toast }) => {
                toast.dismiss('server-wakeup');
            });
            slowRequestToast = null;
        }
        return Promise.reject(error);
    }
);
// ─────────────────────────────────────────────────────────────────────────

// Debug function to check localStorage token - only runs in development
const debugToken = () => {
    if (process.env.NODE_ENV === 'production') return;
    
    const token = localStorage.getItem('token');
    if (token) {
        try {
            // Try to decode JWT payload
            const parts = token.split('.');
            if (parts.length !== 3) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        } catch (e) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }
};

// Run debug on startup
debugToken();

// Export function to clear auth state (can be called from console)
window.clearAuthState = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
};

// --- Interceptor to add JWT token to requests ---
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
            const parts = token.split('.');
            if (parts.length === 3) {
                config.headers['Authorization'] = `Bearer ${token}`;
            } else {
                // Bad token format — clear it silently, don't hard-redirect
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
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

        // Handle unauthorized errors (401)
        if (error.response.status === 401) {
            // Check if token is expired and try to refresh
            if (error.response.data?.message?.includes('expired') ||
                error.response.data?.message?.includes('Token expired')) {

                const currentToken = localStorage.getItem('token');
                if (currentToken && !error.config._retry) {
                    try {
                        // Try to refresh the token
                        const refreshResponse = await apiClient.post('/auth/refresh', {}, {
                            headers: {
                                'Authorization': `Bearer ${currentToken}`
                            }
                        });

                        // Update stored token
                        localStorage.setItem('token', refreshResponse.data.token);
                        localStorage.setItem('user', JSON.stringify(refreshResponse.data.user));

                        // Update API client header
                        apiClient.defaults.headers.common['Authorization'] = `Bearer ${refreshResponse.data.token}`;

                        // Retry the original request with new token
                        error.config._retry = true;
                        error.config.headers['Authorization'] = `Bearer ${refreshResponse.data.token}`;

                        return apiClient(error.config);

                    } catch (refreshError) {
                        // Clear auth state if refresh fails
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');

                        const tokenExpiredEvent = new CustomEvent('tokenExpired', {
                            detail: {
                                path: window.location.pathname,
                                message: 'Your session has expired. Please log in again.'
                            }
                        });
                        window.dispatchEvent(tokenExpiredEvent);
                    }
                } else {
                    // Clear auth state if no token or refresh already attempted
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');

                    const tokenExpiredEvent = new CustomEvent('tokenExpired', {
                        detail: {
                            path: window.location.pathname,
                            message: 'Your session has expired. Please log in again.'
                        }
                    });
                    window.dispatchEvent(tokenExpiredEvent);
                }
            }
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
        // Re-throw the error or return a specific error object
        throw error.response ? error.response.data : new Error('Registration failed');
    }
};

export const loginUser = async (credentials) => {
    try {
        const response = await apiClient.post('/auth/login', credentials);
        return response.data; // Should contain { token, user }
    } catch (error) {
        throw error.response ? error.response.data : new Error('Login failed');
    }
};

export const refreshToken = async () => {
    try {
        const response = await apiClient.post('/auth/refresh');
        return response.data; // Should contain { token, user }
    } catch (error) {
        throw error.response ? error.response.data : new Error('Token refresh failed');
    }
};

export const verifyToken = async () => {
    try {
        const response = await apiClient.post('/auth/verify');
        return response.data; // Should contain { valid: true/false, user }
    } catch (error) {
        throw error.response ? error.response.data : new Error('Token verification failed');
    }
};

// --- User Profile API Calls ---
export const getUserProfile = async () => {
    try {
        const response = await apiClient.get('/users/profile');
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch user profile');
    }
};

export const updateUserProfile = async (profileData) => {
    try {
        const response = await apiClient.put('/users/profile', profileData);
        return response.data; // Returns the updated profile
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to update user profile');
    }
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
        const response = await apiClient.get('/projects');
        return response.data;
    } catch (error) {
        // Return empty array to prevent UI from breaking
        return [];
    }
};

export const createProject = async (projectData) => {
    try {
        const response = await apiClient.post('/projects', projectData);
        
        // Invalidate marketplace cache so new project appears
        apiCache.invalidatePattern('marketplace');
        
        return response.data; // Returns the newly created project
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to create project');
    }
};

export const getProjectById = async (projectId) => {
    try {
        // For marketplace projects, try public endpoint first
        try {
            const publicResponse = await apiClient.get(`/public/projects/${projectId}`);
            return publicResponse.data;
        } catch (publicError) {
            // If public fails, try private project (for owners)
            if (publicError.response?.status === 404) {
                try {
                    const privateResponse = await apiClient.get(`/projects/${projectId}`);
                    return privateResponse.data;
                } catch (privateError) {
                    throw new Error('Project not found or access denied');
                }
            }
            throw publicError;
        }
    } catch (error) {
        throw new Error(error.message || 'Failed to fetch project details');
    }
};

export const updateProject = async (projectId, projectData) => {
    try {
        const response = await apiClient.put(`/projects/${projectId}`, projectData);
        return response.data; // Returns the updated project
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to update project');
    }
};

// --- AI API Calls ---
export const aiIdeaAssist = async ({ stage, category, prompt }) => {
    try {
        const response = await apiClient.post('/ai/idea-assist', { stage, category, prompt });
        return response.data; // { stage, template }
    } catch (error) {
        throw error.response?.data || new Error('Failed to generate stage template');
    }
};

export const deleteProject = async (projectId) => {
    try {
        const response = await apiClient.delete(`/projects/${projectId}`);
        return response.data; // Returns { message: '...', projectId: ... }
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to delete project');
    }
};

export const toggleHoldProject = async (projectId) => {
    try {
        const response = await apiClient.patch(`/projects/${projectId}/toggle-hold`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to toggle hold status');
    }
};

// --- Project Files API Calls ---

/**
 * Upload files to a project
 * @param {string} projectId - The project ID
 * @param {FileList|Array} files - Files to upload
 * @param {Object} options - Upload options (description, is_public)
 * @returns {Promise} - Upload result with file metadata
 */
export const uploadProjectFiles = async (projectId, files, options = {}) => {
    try {
        const formData = new FormData();
        
        // Append each file
        if (files instanceof FileList) {
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }
        } else if (Array.isArray(files)) {
            files.forEach(file => {
                if (file.file instanceof File) {
                    formData.append('files', file.file);
                } else {
                    formData.append('files', file);
                }
            });
        }
        
        // Append options
        if (options.description) {
            formData.append('description', options.description);
        }
        if (options.is_public !== undefined) {
            formData.append('is_public', options.is_public);
        }
        
        const response = await apiClient.post(`/projects/${projectId}/files`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: options.onProgress || (() => {})
        });
        
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to upload files');
    }
};

/**
 * Get all files for a project
 * @param {string} projectId - The project ID
 * @returns {Promise} - List of project files
 */
export const getProjectFiles = async (projectId) => {
    try {
        const response = await apiClient.get(`/projects/${projectId}/files`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch project files');
    }
};

/**
 * Delete a project file
 * @param {string} projectId - The project ID
 * @param {string} fileId - The file ID to delete
 * @returns {Promise} - Deletion result
 */
export const deleteProjectFile = async (projectId, fileId) => {
    try {
        const response = await apiClient.delete(`/projects/${projectId}/files/${fileId}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to delete file');
    }
};

/**
 * Get project file statistics
 * @param {string} projectId - The project ID
 * @returns {Promise} - File statistics
 */
export const getProjectFileStats = async (projectId) => {
    try {
        const response = await apiClient.get(`/projects/${projectId}/files/stats`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch file statistics');
    }
};

/**
 * Download a file
 * @param {string} fileId - The file ID to download
 * @returns {Promise} - File blob
 */
export const downloadFile = async (fileId) => {
    try {
        const response = await apiClient.get(`/files/download/${fileId}`, {
            responseType: 'blob'
        });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to download file');
    }
};

// --- Public API Calls ---

export const getPublicProjects = async () => {
    try {
        // Note: No token needed for this public endpoint
        const response = await apiClient.get('/public/projects'); 
        // Handle both paginated response { data: [...] } and direct array
        return response.data?.data || response.data || [];
    } catch (error) {
        // Return empty array to prevent UI from breaking
        return [];
    }
};

// Fetch marketplace statistics (cached for 5 minutes)
export const getMarketplaceStats = async (forceRefresh = false) => {
  const cacheKey = 'marketplace:stats';
  
  // Check cache first unless forcing refresh
  if (!forceRefresh) {
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;
  }
  
  try {
    const response = await apiClient.get('/public/stats/marketplace');
    const data = response.data;
    const stats = {
      totalProjects: data.totalProjects || 0,
      activeListings: data.activeListings || 0,
      totalValue: data.totalValue || 0,
      successfulSales: data.successfulSales || 0,
      projectsCount: data.totalProjects || 0,
      activeUsers: data.activeUsers || 0,
      developerCount: data.activeUsers || 0,
      completedSales: data.successfulSales || 0,
      avgValue: data.totalValue && data.successfulSales ? Math.floor(data.totalValue / data.successfulSales) : 0
    };
    
    // Cache for 5 minutes
    apiCache.set(cacheKey, stats, CACHE_TTL.STATS);
    
    return stats;
  } catch (error) {
    // Return default stats to prevent UI from breaking
    return {
      projectsCount: 0,
      developerCount: 0,
      completedSales: 0,
      avgValue: 0,
      totalProjects: 0,
      activeListings: 0,
      totalValue: 0,
      successfulSales: 0,
      activeUsers: 0
    };
  }
};

export const getMarketplaceProjects = async (options = {}) => {
    // Support both old format (boolean forceRefresh) and new format (options object)
    const isOptionsObject = typeof options === 'object' && options !== null;
    const forceRefresh = isOptionsObject ? options.forceRefresh : options;
    
    const {
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'desc'
    } = isOptionsObject ? options : {};
    
    const cacheKey = `marketplace:projects:p${page}:l${limit}:s${sortBy}:o${sortOrder}`;
    
    // Check cache first unless forcing refresh
    if (!forceRefresh) {
        const cached = apiCache.get(cacheKey);
        if (cached) return cached;
    }
    
    try {
        const response = await apiClient.get('/public/marketplace', {
            params: { page, limit, sortBy, sortOrder }
        });
        
        // Cache the response
        apiCache.set(cacheKey, response.data, CACHE_TTL.MARKETPLACE);
        
        return response.data;
    } catch (error) {
        return { data: [], pagination: { page: 1, totalPages: 1, total: 0 } }; // Return proper structure instead of empty array
    }
};


// --- Health Check ---

export const checkApiHealth = async () => {
    try {
        const response = await apiClient.get('/'); 
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('API health check failed');
    }
};

// Payment API calls - DEPRECATED: Use createCheckoutSessionForPurchaseRequest instead
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
        throw error.response?.data || error;
    }
};

// --- Stripe Connect API Calls ---
export const getStripeAccountStatus = async () => {
    try {
        const response = await apiClient.get('/users/stripe-status');
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch Stripe account status');
    }
};

export const checkStripeOnboardingStatus = async () => {
    try {
        // Corrected the endpoint to the single source of truth for Stripe status.
        const response = await apiClient.get('/users/stripe-status');
        return response.data; // { isOnboardingComplete: boolean, needsAttention: boolean, accountId: string | null, arePayoutsEnabled: boolean }
    } catch (error) {
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
        const defaultMessage = 'Failed to create or retrieve Stripe account link. Please try again.';
        throw new Error(error.response?.data?.error || error.message || defaultMessage);
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
        throw error.response?.data || error;
    }
};

export const getSellerPurchaseRequests = async () => {
    try {
        const response = await apiClient.get('/purchase-requests/seller');
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Failed to fetch seller purchase requests.';
        throw new Error(errorMessage);
    }
};

export const getBuyerPurchaseRequests = async () => {
    try {
        const response = await apiClient.get('/purchase-requests/buyer');
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Failed to fetch buyer purchase requests.';
        throw new Error(errorMessage);
    }
};

export const acceptPurchaseRequest = async (requestId, termsAgreedVersion) => {
    try {
        const response = await apiClient.post(`/purchase-requests/${requestId}/accept`, { terms_agreed_version: termsAgreedVersion });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const rejectPurchaseRequest = async (requestId, rejectionReason) => {
    try {
        const response = await apiClient.post(`/purchase-requests/${requestId}/reject`, { rejection_reason: rejectionReason });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const confirmTransferReceived = async (requestId) => {
    try {
        const response = await apiClient.post(`/purchase-requests/${requestId}/confirm-transfer`);
        return response.data;
    } catch (error) {
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
        throw error.response?.data || error;
    }
};

// --- New Workflow API Calls ---

// Called by buyer to initiate interest with initial commitments
export const expressInterestInProject = async (projectId, buyerInitialCommitments, buyerIntroMessage) => {
    try {
        const response = await apiClient.post(`/purchase-requests/projects/${projectId}/request`, { 
            buyerCommitments: buyerInitialCommitments,
            buyerIntroMessage: buyerIntroMessage
        });
        return response.data;
    } catch (error) {
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
        throw error.response?.data || error;
    }
};

export const markNotificationAsRead = async (notificationId) => {
    try {
        const response = await apiClient.post(`/notifications/${notificationId}/mark-read`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const markAllNotificationsAsRead = async () => {
    try {
        const response = await apiClient.post('/notifications/mark-all-read');
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};
// --- End Notification API Calls ---

// --- Purchase Request Message API Calls ---
export const getPurchaseRequestMessages = async (requestId) => {
    if (!requestId) {
        throw new Error('Request ID is required.');
    }
    try {
        const response = await apiClient.get(`/purchase-requests/${requestId}/messages`);
        return response.data; // Expected to be an array of message objects
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const sendPurchaseRequestMessage = async (requestId, content) => {
    if (!requestId || !content) {
        throw new Error('Request ID and message content are required.');
    }
    try {
        const response = await apiClient.post(`/purchase-requests/${requestId}/messages`, { content });
        return response.data; // Expected to be the newly created message object
    } catch (error) {
        throw error.response?.data || error;
    }
};
// --- End Purchase Request Message API Calls ---

// --- Public API Calls (No Auth Required) ---

export const getUserCount = async () => {
    try {
        const response = await apiClient.get('/public/user-count');
        return response.data.count;
    } catch (error) {
        console.error('Error fetching user count:', error);
        return 0; // Return 0 as fallback
    }
};

// --- End Public API Calls ---

export default apiClient; // Ensure apiClient is the default export
