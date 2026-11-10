import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { loginDestination } from '../utils/navigation';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        // Optional: Show a loading spinner or a blank page while auth state is being determined
        return <div>Loading...</div>; 
    }

    if (!isAuthenticated) {
        return <Navigate to={loginDestination(location.pathname + location.search + location.hash)} replace />;
    }

    return <Outlet />; // Renders the child route elements
};

export default ProtectedRoute; 
