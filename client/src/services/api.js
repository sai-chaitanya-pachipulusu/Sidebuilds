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
            config.headers['x-auth-token'] = token;
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
            // If token is expired, redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Only redirect if we're not already on the login page
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
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

// --- Project API Calls (Placeholder - Add more as needed) ---

export const getProjects = async () => {
    try {
        const response = await apiClient.get('/projects');
        return response.data;
    } catch (error) {
        console.error('Get Projects API error:', error.response ? error.response.data : error.message);
        throw error.response ? error.response.data : new Error('Failed to fetch projects');
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
        // Note: No token needed for this public endpoint
        const response = await apiClient.get('/public/projects'); 
        return response.data;
    } catch (error) {
        console.error('Get Public Projects API error:', error.response ? error.response.data : error.message);
        throw error.response ? error.response.data : new Error('Failed to fetch public projects');
    }
};

export const getMarketplaceProjects = async () => {
    try {
        const response = await apiClient.get('/public/marketplace'); 
        return response.data;
    } catch (error) {
        console.error('Get Marketplace Projects API error:', error.response ? error.response.data : error.message);
        throw error.response ? error.response.data : new Error('Failed to fetch marketplace projects');
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

export default apiClient; // Export the configured instance if needed elsewhere 