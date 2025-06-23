import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Import components
import Homepage from '../pages/client/Homepage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import EventListPage from '../pages/client/EventList';
import EventDetailPage from '../pages/client/EventDetail';
import FeedbackPage from '../pages/client/FeedbackPage';
import CertificatePage from '../pages/client/CertificatePage';
import ProfilePage from '../pages/client/ProfilePage';
import EditProfile from '../pages/client/EditProfile';

import AdminDashboard from '../pages/admin/Dashboard';
import AdminEvents from '../pages/admin/Events';
import AdminStudents from '../pages/admin/Students';
import AdminAnalytics from '../pages/admin/Analytics';
import CreateEvent from '../pages/admin/CreateEvent';

import LoadingSpinner from '../components/LoadingSpinner';
import ProtectedRoute from '../components/ProtectedRoute';

function AppRoutes() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Router>      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Homepage />} />        
        {/* Auth Routes */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        
        {/* Legacy redirects for backward compatibility */}
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        <Route path="/register" element={<Navigate to="/auth/register" replace />} />
        <Route path="/client/login" element={<Navigate to="/auth/login" replace />} />
        <Route path="/client/register" element={<Navigate to="/auth/register" replace />} />        {/* Client/Student Routes - Public */}
        <Route path="/client/events" element={<EventListPage />} />
        <Route path="/client/events/:eventId" element={<EventDetailPage />} />
        
        {/* Protected Client Routes */}
        <Route
          path="/client/dashboard"
          element={
            <ProtectedRoute userType="student">
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client/events/:eventId/feedback"
          element={
            <ProtectedRoute userType="student">
              <FeedbackPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client/events/:eventId/certificate"
          element={
            <ProtectedRoute userType="student">
              <CertificatePage />
            </ProtectedRoute>
          }
        />        <Route
          path="/client/profile"
          element={
            <ProtectedRoute userType="student">
              <ProfilePage />
            </ProtectedRoute>
          }        />
        <Route
          path="/client/profile/edit"
          element={
            <ProtectedRoute userType="student">
              <EditProfile />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<Navigate to="/auth/login?mode=admin" replace />} />
        
        {/* Protected Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute userType="admin">
              <Navigate to="/admin/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute userType="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events"
          element={
            <ProtectedRoute userType="admin">
              <AdminEvents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <ProtectedRoute userType="admin">
              <AdminStudents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute userType="admin">
              <AdminAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/create-event"
          element={
            <ProtectedRoute userType="admin">
              <CreateEvent />
            </ProtectedRoute>
          }
        />

        {/* 404 Route */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-gray-600 mb-4">Page not found</p>
                <a
                  href="/"
                  className="btn-primary"
                >
                  Go Home
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default AppRoutes;
