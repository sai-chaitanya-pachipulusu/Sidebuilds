import axios from 'axios';

// Create an axios instance
const apiClient = axios.create({
    // Use environment variable for base URL, fallback for development
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api', 
    headers: {
        'Content-Type': 'application/json',
    },
    // Add timeout to prevent hanging requests
    timeout: 10000,
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

export const updateTransferStatus = async (projectId, statusData) => {
    try {
        const response = await apiClient.post(`/payments/transfers/${projectId}/update`, statusData);
        return response.data;
    } catch (error) {
        console.error('Error updating transfer status:', error);
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

export const createStripeAccountLink = async (type = 'account_onboarding') => {
    try {
        const response = await apiClient.post('/stripe/create-account-link', { type });
        return response.data; // Should return { url }
    } catch (error) {
        console.error('Create Stripe Account Link API error:', error.response ? error.response.data : error.message);
        throw error.response ? error.response.data : new Error('Failed to create Stripe account link');
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

export default apiClient; // Export the configured instance if needed elsewhere