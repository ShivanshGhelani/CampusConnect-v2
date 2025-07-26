import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Import components
import Homepage from '../pages/client/Homepage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import EventListPage from '../pages/client/EventList';
import EventDetailPage from '../pages/client/EventDetail';

// Student components - new organized structure
import ProfilePage from '../pages/client/student/Account/ProfilePage';
import EditProfile from '../pages/client/student/Account/EditProfile';
import TeamManagement from '../pages/client/student/Account/TeamManagement';
import StudentIndividualRegistration from '../pages/client/student/EventRegistration/IndividualRegistration';
import StudentTeamRegistration from '../pages/client/student/EventRegistration/TeamRegistration';
import RegistrationSuccess from '../pages/client/student/EventRegistration/RegistrationSuccess';
import AlreadyRegistered from '../pages/client/student/EventRegistration/AlreadyRegistered';
import NotRegistered from '../pages/client/student/EventRegistration/NotRegistered';

// Faculty components - new organized structure
import FacultyProfilePage from '../pages/client/faculty/Account/FacultyProfilePage';
import FacultyProfileEdit from '../pages/client/faculty/Account/FacultyProfileEdit';
import FacultyIndividualRegistration from '../pages/client/faculty/EventRegistration/IndividualRegistration';
import FacultyTeamRegistration from '../pages/client/faculty/EventRegistration/TeamRegistration';

// Test components
import TestIndex from '../pages/test/TestIndex';

import AdminDashboard from '../pages/admin/Dashboard';
import AdminEvents from '../pages/admin/Events';
import AdminStudents from '../pages/admin/Students';
import Faculty from '../pages/admin/Faculty';
import ManageCertificates from '../pages/admin/ManageCertificates';
import Assets from '../pages/admin/Assets';
import Venue from '../pages/admin/Venue';
import CreateEvent from '../pages/admin/CreateEvent';
import EventCreatedSuccess from '../pages/admin/EventCreatedSuccess';
import EditEvent from '../pages/admin/EditEvent';
import EventDetail from '../pages/admin/EventDetail';
import ExportData from '../pages/admin/ExportData';
import ManageAdmin from '../pages/admin/ManageAdmin';
import SettingsProfile from '../pages/admin/SettingsProfile';

import LoadingSpinner from '../components/LoadingSpinner';
import ProtectedRoute from '../components/ProtectedRoute';
import ScrollToTop from '../components/common/ScrollToTop';

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
      <ScrollToTop />
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
        <Route path="/client/register" element={<Navigate to="/auth/register" replace />} />
        
        {/* Faculty legacy redirects */}
        <Route path="/faculty/dashboard" element={<Navigate to="/faculty/profile" replace />} />
        
        {/* Client/Student Routes - Public */}
        <Route path="/client/events" element={<EventListPage />} />
        <Route path="/client/events/:eventId" element={<EventDetailPage />} />
        
        {/* Development/Test Routes - Public (remove in production) */}
        <Route path="/dev" element={<TestIndex />} />
        <Route path="/dev/event-registration/:eventId" element={<StudentIndividualRegistration />} />
        <Route path="/dev/event-registration" element={<StudentIndividualRegistration />} />
        <Route path="/dev/event-registration-team" element={<StudentTeamRegistration />} />
        <Route path="/dev/registration-success" element={<RegistrationSuccess />} />
        <Route path="/dev/team-management" element={<TeamManagement />} />
        <Route path="/dev/team-management/:eventId/:teamId" element={<TeamManagement />} />
        <Route path="/dev/not-registered" element={<NotRegistered />} />
        <Route path="/dev/not-registered/:eventId" element={<NotRegistered />} />
        
        {/* Protected Client/Student Routes */}
        <Route
          path="/client/dashboard"
          element={
            <ProtectedRoute userType="student">
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client/profile"
          element={
            <ProtectedRoute userType="student">
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client/profile/edit"
          element={
            <ProtectedRoute userType="student">
              <EditProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/profile"
          element={
            <ProtectedRoute userType="student">
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/profile/edit"
          element={
            <ProtectedRoute userType="student">
              <EditProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/team-management"
          element={
            <ProtectedRoute userType="student">
              <TeamManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/events/:eventId/register"
          element={
            <ProtectedRoute userType="student">
              <StudentIndividualRegistration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/events/:eventId/register-team"
          element={
            <ProtectedRoute userType="student">
              <StudentTeamRegistration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/events/:eventId/registration-success"
          element={
            <ProtectedRoute userType="student">
              <RegistrationSuccess />
            </ProtectedRoute>
          }
        />
        
        {/* Faculty Routes */}
        <Route
          path="/faculty/profile"
          element={
            <ProtectedRoute userType="faculty">
              <FacultyProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty/profile/edit"
          element={
            <ProtectedRoute userType="faculty">
              <FacultyProfileEdit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty/events"
          element={
            <ProtectedRoute userType="faculty">
              <EventListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty/events/:eventId"
          element={
            <ProtectedRoute userType="faculty">
              <EventDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Faculty Registration Routes */}
        <Route
          path="/faculty/events/:eventId/register"
          element={
            <ProtectedRoute userType="faculty">
              <FacultyIndividualRegistration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty/events/:eventId/register-team"
          element={
            <ProtectedRoute userType="faculty">
              <FacultyTeamRegistration />
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
          path="/admin/events/:eventId"
          element={
            <ProtectedRoute userType="admin">
              <EventDetail />
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
          path="/admin/faculty"
          element={
            <ProtectedRoute userType="admin">
              <Faculty />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/certificates"
          element={
            <ProtectedRoute userType="admin">
              <ManageCertificates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/assets"
          element={
            <ProtectedRoute userType="admin">
              <Assets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/venue"
          element={
            <ProtectedRoute userType="admin">
              <Venue />
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
        <Route
          path="/admin/events/created-success"
          element={
            <ProtectedRoute userType="admin">
              <EventCreatedSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events/:eventId/edit"
          element={
            <ProtectedRoute userType="admin">
              <EditEvent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events/:eventId/export"
          element={
            <ProtectedRoute userType="admin">
              <ExportData />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/manage-admins"
          element={
            <ProtectedRoute userType="admin">
              <ManageAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute userType="admin">
              <SettingsProfile />
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
