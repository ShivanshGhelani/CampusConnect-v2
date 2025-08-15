import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

// Allowed paths for Executive Admin
const EXECUTIVE_ADMIN_ALLOWED_PATHS = [
  '/admin/events/create',
  '/admin/create-event',
  '/admin/events/created-success',
  '/admin/certificates',
  '/admin/certificate-editor'
];

function ExecutiveAdminRoute({ children }) {
  const { user, isAuthenticated, userType, isLoading, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login?tab=admin" state={{ from: location }} replace />;
  }

  if (userType !== 'admin') {
    return <Navigate to="/auth/login?tab=admin" replace />;
  }

  // Check if user is Executive Admin
  if (user?.role === 'executive_admin') {
    const currentPath = location.pathname;
    
    // Check if current path is allowed for Executive Admin
    const isAllowedPath = EXECUTIVE_ADMIN_ALLOWED_PATHS.some(allowedPath => 
      currentPath === allowedPath || currentPath.startsWith(allowedPath)
    );

    if (!isAllowedPath) {
      // Redirect to the default allowed page (Create Event)
      return <Navigate to="/admin/events/create" replace />;
    }
  }

  return children;
}

export default ExecutiveAdminRoute;
