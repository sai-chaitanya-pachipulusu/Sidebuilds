import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import apiClient, { getUserProfile } from '../services/api'; // Import getUserProfile
import { initializeSocket, disconnectSocket } from '../utils/socket'; // Import socket utils
import toast from 'react-hot-toast';

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
                const socket = initializeSocket(token);
                
                socket.on('connect_error', (error) => {
                    console.error('[AuthContext] Socket connection failed:', error.message);
                });

                socket.on('error', (error) => {
                    console.error('[AuthContext] Socket error:', error);
                });

                return socket;
            } catch (error) {
                console.error('[AuthContext] Failed to initialize socket:', error);
            }
        }
    }, []);

    const fetchUserProfile = useCallback(async (currentToken) => {
        const tokenToUse = currentToken;
        if (tokenToUse) {
            try {
                const profileData = await getUserProfile();
                localStorage.setItem('user', JSON.stringify(profileData));
                setAuthState(prev => ({
                    ...prev,
                    user: profileData,
                    isAuthenticated: true,
                }));
                // Connect socket after profile is successfully fetched and user ID is available
                if (profileData && profileData.user_id) {
                    connectUserSocket(tokenToUse, profileData);
                }
                return profileData;
            } catch (error) {
                console.error("AuthContext: Failed to fetch user profile:", error);
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    logout();
                }
                throw error;
            }
        }
        return null;
    }, []); // Remove connectUserSocket dependency to prevent circular dependency

    const verifyUserAndToken = useCallback(async () => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            // Set token in API client header first - use Authorization Bearer format
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            try {
                // Create a more robust timeout with AbortController
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    controller.abort();
                }, 3000); // Reduced to 3 seconds

                // Add abort signal to the profile fetch
                await fetchUserProfile(storedToken);
                clearTimeout(timeoutId);
            } catch (error) {
                // On any error during startup, clear auth state to prevent infinite loading
                if (error.name === 'AbortError' || error.message.includes('timeout')) {
                    logout();
                } else if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    logout();
                }
            }
        }
        // Always set loading to false regardless of success/failure
        setAuthState(prev => ({ ...prev, isLoading: false }));
    }, [fetchUserProfile]);

    useEffect(() => {
        verifyUserAndToken();
    }, [verifyUserAndToken]);

    // Listen for token expiration events
    useEffect(() => {
        const handleTokenExpired = (event) => {
            // Show user a message and redirect to login
            toast.error(event.detail.message || 'Your session has expired. Please log in again.');
            logout();
            // Optionally redirect to login page
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        };

        window.addEventListener('tokenExpired', handleTokenExpired);

        return () => {
            window.removeEventListener('tokenExpired', handleTokenExpired);
        };
    }, []);

    const login = (token, user) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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
        disconnectSocket(); // Disconnect socket on logout
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete apiClient.defaults.headers.common['Authorization'];
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
            {!authState.isLoading ? children : (
                <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="text-2xl font-bold text-white">SideBuilds</div>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                </div>
            )} 
        </AuthContext.Provider>
    );
}; 