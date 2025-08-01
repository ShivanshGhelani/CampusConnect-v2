import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Import components
import Homepage from '../pages/client/Homepage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import EventListPage from '../pages/client/EventList';
import EventDetailPage from '../pages/client/EventDetail';
import FeedbackForm from '../pages/client/FeedbackForm';
import FeedbackSuccess from '../pages/client/FeedbackSuccess';
import FeedbackConfirm from '../pages/client/FeedbackConfirm';
import CertificateDownload from '../pages/client/CertificateDownload';

// Student components - new organized structure
import ProfilePage from '../pages/client/student/Account/ProfilePage';
import EditProfile from '../pages/client/student/Account/EditProfile';
import TeamManagement from '../pages/client/student/Account/TeamManagement';
import RegistrationRouter from '../components/common/RegistrationRouter';
import AlreadyRegistered from '../pages/client/student/EventRegistration/AlreadyRegistered';
import RegistrationSuccess from '../pages/client/student/EventRegistration/RegistrationSuccess';

// Attendance components
import MarkAttendance from '../pages/client/student/Attendance/MarkAttendance';
import AttendanceSuccess from '../pages/client/student/Attendance/AttendanceSuccess';
import AttendanceConfirm from '../pages/client/student/Attendance/AttendanceConfirm';
import NotRegistered from '../pages/client/student/NotRegistered';

// Faculty components - new organized structure
import FacultyProfilePage from '../pages/client/faculty/Account/FacultyProfilePage';
import FacultyProfileEdit from '../pages/client/faculty/Account/FacultyProfileEdit';

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
import MaintenanceDashboard from '../components/admin/maintenance/MaintenanceDashboard';
import { MessageInbox, MessageThreadView } from '../components/admin/messages';
import PhysicalAttendancePortal from '../components/admin/attendance/PhysicalAttendancePortal';

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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password/:token" element={<ResetPasswordPage />} />
        
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
        <Route path="/client/events/:eventId/feedback" element={<FeedbackForm />} />
        <Route path="/client/events/:eventId/feedback-success" element={<FeedbackSuccess />} />
        <Route path="/client/events/:eventId/feedback-confirmation" element={<FeedbackConfirm />} />
        <Route path="/client/events/:eventId/certificate" element={<CertificateDownload />} />
        <Route path="/client/events/:eventId/registration-success" element={<RegistrationSuccess />} />
        
        {/* Attendance Routes - Protected (student only) */}
        <Route
          path="/client/events/:eventId/mark-attendance"
          element={
            <ProtectedRoute userType="student">
              <MarkAttendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client/events/:eventId/attendance-success"
          element={
            <ProtectedRoute userType="student">
              <AttendanceSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client/events/:eventId/attendance-confirmation"
          element={
            <ProtectedRoute userType="student">
              <AttendanceConfirm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client/events/:eventId/not-registered"
          element={
            <ProtectedRoute userType="student">
              <NotRegistered />
            </ProtectedRoute>
          }
        />
        
        {/* Team Management Route - Public (accessible by team leaders) */}
        <Route path="/client/events/:eventId/manage-team" element={<TeamManagement />} />
        
        {/* Development/Test Routes - Public (remove in production) */}
        <Route path="/dev" element={<TestIndex />} />
        <Route path="/dev/event-registration/:eventId" element={<RegistrationRouter />} />
        <Route path="/dev/event-registration" element={<RegistrationRouter />} />
        <Route path="/dev/team-management" element={<TeamManagement />} />
        <Route path="/dev/team-management/:eventId/:teamId" element={<TeamManagement />} />
        
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
              <RegistrationRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/events/:eventId/register-team"
          element={
            <ProtectedRoute userType="student">
              <RegistrationRouter forceTeamMode={true} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/events/:eventId/already-registered"
          element={
            <ProtectedRoute userType="student">
              <AlreadyRegistered />
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
        <Route
          path="/faculty/events/:eventId/register"
          element={
            <ProtectedRoute userType="faculty">
              <RegistrationRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty/events/:eventId/register-team"
          element={
            <ProtectedRoute userType="faculty">
              <RegistrationRouter forceTeamMode={true} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty/events/:eventId/registration-success"
          element={
            <ProtectedRoute userType="faculty">
              <RegistrationSuccess />
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
          path="/admin/maintenance"
          element={
            <ProtectedRoute userType="admin">
              <MaintenanceDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/messages"
          element={
            <ProtectedRoute userType="admin">
              <MessageInbox />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/messages/thread/:threadId"
          element={
            <ProtectedRoute userType="admin">
              <MessageThreadView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events/:eventId/attendance"
          element={
            <ProtectedRoute userType="admin">
              <PhysicalAttendancePortal />
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
