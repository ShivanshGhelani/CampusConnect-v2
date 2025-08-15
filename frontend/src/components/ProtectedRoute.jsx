import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

function ProtectedRoute({ children, userType }) {
  const { isAuthenticated, userType: currentUserType, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to appropriate login page with correct tab
    const loginTab = userType === 'admin' ? 'admin' : userType === 'faculty' ? 'faculty' : 'student';
    const loginPath = `/auth/login?tab=${loginTab}`;
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (userType && currentUserType !== userType) {
    // User type mismatch - redirect to appropriate dashboard
    let dashboardPath;
    if (currentUserType === 'admin') {
      // For Executive Admin, redirect to Create Event instead of dashboard
      if (user?.role === 'executive_admin') {
        dashboardPath = '/admin/events/create';
      } else {
        dashboardPath = '/admin/dashboard';
      }
    } else if (currentUserType === 'faculty') {
      dashboardPath = '/faculty/profile';
    } else {
      dashboardPath = '/client/profile';
    }
    return <Navigate to={dashboardPath} replace />;
  }

  // Special handling for Executive Admin - restrict access to only allowed paths
  if (userType === 'admin' && user?.role === 'executive_admin') {
    const currentPath = location.pathname;
    
    // Allowed paths for Executive Admin
    const EXECUTIVE_ADMIN_ALLOWED_PATHS = [
      '/admin/events/create',
      '/admin/create-event',
      '/admin/events/created-success',
      '/admin/certificates',
      '/admin/certificate-editor'
    ];
    
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

export default ProtectedRoute;
