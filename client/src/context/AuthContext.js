import React, { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../services/api'; // For potential future use like fetching user data on load

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        token: localStorage.getItem('token') || null,
        user: JSON.parse(localStorage.getItem('user')) || null,
        isAuthenticated: !!localStorage.getItem('token'), // Check if token exists
        isLoading: true, // Initially loading until we check token/user
    });

    // Optional: Effect to verify token or fetch user data on initial load
    useEffect(() => {
        // If you wanted to verify the token against the backend on load:
        // const verifyToken = async () => {
        //     if (authState.token) {
        //         try {
        //             // Example: Add an API endpoint like /api/auth/me to get user data
        //             // const response = await apiClient.get('/auth/me'); 
        //             // setAuthState(prev => ({ ...prev, user: response.data, isAuthenticated: true, isLoading: false }));
                    
        //             // For now, just assume token is valid if present
        //             setAuthState(prev => ({ ...prev, isLoading: false }));
        //         } catch (error) {
        //             console.error("Token validation failed:", error);
        //             logout(); // Log out if token is invalid
        //         }
        //     } else {
        //         setAuthState(prev => ({ ...prev, isLoading: false }));
        //     }
        // };
        // verifyToken();
        
        // Simplified: Just set loading to false after initial check
        setAuthState(prev => ({ ...prev, isLoading: false }));

    }, []); // Run only once on mount

    const login = (token, user) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        // Update axios Authorization header immediately for subsequent requests in the same session
        apiClient.defaults.headers.common['x-auth-token'] = token;
        setAuthState({
            token,
            user,
            isAuthenticated: true,
            isLoading: false,
        });
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete apiClient.defaults.headers.common['x-auth-token'];
        setAuthState({
            token: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
        });
        // Optionally redirect to login page using navigate (import useNavigate from react-router-dom)
    };

    const value = {
        ...authState,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {/* Don't render children until loading is false */} 
            {!authState.isLoading ? children : <div>Loading authentication...</div>} 
        </AuthContext.Provider>
    );
}; 