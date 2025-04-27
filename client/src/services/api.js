import axios from 'axios';

// Create an axios instance
const apiClient = axios.create({
    // Use environment variable for base URL, fallback for development
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api', 
    headers: {
        'Content-Type': 'application/json',
    },
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

export default apiClient; // Export the configured instance if needed elsewhere 