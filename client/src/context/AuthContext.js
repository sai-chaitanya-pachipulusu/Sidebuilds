import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import apiClient, { getUserProfile } from '../services/api'; // Import getUserProfile
import { initializeSocket, disconnectSocket } from '../utils/socket'; // Import socket utils

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        token: localStorage.getItem('token') || null,
        user: JSON.parse(localStorage.getItem('user')) || null,
        isAuthenticated: !!localStorage.getItem('token'), // Check if token exists
        isLoading: true, // Initially loading until we check token/user
    });

    const connectUserSocket = useCallback((token, user) => {
        if (token && user && user.id) {
            try {
                const socket = initializeSocket(token); // Pass token for auth
                // Backend should handle user room joining based on authenticated socket
                // If direct event is needed after connect:
                socket.on('connect', () => {
                    console.log('[AuthContext] Socket connected, attempting to join user room for:', user.id);
                    // Emit an event that the backend will use to join this socket to a user-specific room
                    // The backend should ideally derive user.id from the token provided during socket handshake
                    socket.emit('join_user_room', { userId: user.id }); 
                });
            } catch (error) {
                console.error('[AuthContext] Failed to initialize socket:', error);
            }
        }
    }, []);

    const fetchUserProfile = useCallback(async (currentToken) => {
        const tokenToUse = currentToken || authState.token;
        if (tokenToUse) {
            try {
                console.log('AuthContext: Fetching user profile...');
                const profileData = await getUserProfile();
                localStorage.setItem('user', JSON.stringify(profileData));
                setAuthState(prev => ({ 
                    ...prev, 
                    user: profileData, 
                    isAuthenticated: true,
                }));
                console.log('AuthContext: User profile updated', profileData);
                // Connect socket after profile is successfully fetched and user ID is available
                connectUserSocket(tokenToUse, profileData);
                return profileData;
            } catch (error) {
                console.error("AuthContext: Failed to fetch user profile:", error);
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    console.log("AuthContext: Auth error during profile fetch, logging out.");
                    logout(); 
                }
                throw error; 
            }
        }
        return null; 
    }, [authState.token, connectUserSocket]);

    useEffect(() => {
        const verifyUserAndToken = async () => {
            const storedToken = localStorage.getItem('token');
            if (storedToken) {
                // Set token in API client header first
                apiClient.defaults.headers.common['x-auth-token'] = storedToken;
                try {
                    // Fetch profile which will also set user in state and connect socket
                    await fetchUserProfile(storedToken);
                } catch (error) {
                    console.log("Initial profile fetch failed. User might have been logged out.");
                }
            }
            setAuthState(prev => ({ ...prev, isLoading: false }));
        };

        verifyUserAndToken();
    }, [fetchUserProfile]);

    const login = (token, user) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        apiClient.defaults.headers.common['x-auth-token'] = token;
        setAuthState({
            token,
            user,
            isAuthenticated: true,
            isLoading: false,
        });
        // Connect socket after login
        connectUserSocket(token, user);
    };

    const logout = () => {
        console.log('[AuthContext] Logging out, disconnecting socket...');
        disconnectSocket(); // Disconnect socket on logout
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete apiClient.defaults.headers.common['x-auth-token'];
        setAuthState({
            token: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
        });
    };

    const value = {
        ...authState,
        login,
        logout,
        fetchUserProfile,
    };

    return (
        <AuthContext.Provider value={value}>
            {!authState.isLoading ? children : <div>Loading authentication...</div>} 
        </AuthContext.Provider>
    );
}; 