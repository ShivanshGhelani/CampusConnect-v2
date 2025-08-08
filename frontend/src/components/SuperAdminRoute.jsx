import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

function SuperAdminRoute({ children }) {
  const { user, isAuthenticated, userType, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login?mode=admin" state={{ from: location }} replace />;
  }

  if (userType !== 'admin') {
    return <Navigate to="/auth/login?mode=admin" replace />;
  }

  // Only Super Admin can access dashboard
  if (user?.role !== 'super_admin') {
    // Redirect based on role
    if (user?.role === 'executive_admin') {
      return <Navigate to="/admin/events/create" replace />;
    } else if (user?.role === 'organizer_admin') {
      return <Navigate to="/admin/events" replace />;
    } else {
      return <Navigate to="/admin/events" replace />;
    }
  }

  return children;
}

export default SuperAdminRoute;
