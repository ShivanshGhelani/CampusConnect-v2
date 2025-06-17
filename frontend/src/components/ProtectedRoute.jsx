import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

function ProtectedRoute({ children, userType }) {
  const { isAuthenticated, userType: currentUserType, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to appropriate login page
    const loginPath = userType === 'admin' ? '/auth/login?mode=admin' : '/auth/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (userType && currentUserType !== userType) {
    // User type mismatch - redirect to appropriate dashboard
    const dashboardPath = currentUserType === 'admin' ? '/admin/dashboard' : '/client/dashboard';
    return <Navigate to={dashboardPath} replace />;
  }

  return children;
}

export default ProtectedRoute;
