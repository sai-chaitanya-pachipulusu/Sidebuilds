import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        // Optional: Show a loading spinner or a blank page while auth state is being determined
        return <div>Loading...</div>; 
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />; // Renders the child route elements
};

export default ProtectedRoute; 