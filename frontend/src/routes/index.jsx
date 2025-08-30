import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Import layout component
import PersistentClientLayout from '../components/layouts/PersistentClientLayout';

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
import QRCodeDemo from '../pages/QRCodeDemo'; // QR Code Demo Page
import QRTest from '../pages/QRTest'; // QR Code Test Page
import QRScannerPage from '../pages/QRScannerPage'; // QR Scanner Page
import MobileQRScanner from '../pages/MobileQRScanner'; // Mobile QR Scanner
import VolunteerScanner from '../pages/VolunteerScanner'; // Volunteer Scanner (Invitation-based)
import CreateInvitationLink from '../pages/CreateInvitationLink'; // Create Invitation Links
import TestMode from '../pages/TestMode'; // Test Mode - All Pages Overview
import AttendanceShowcase from '../pages/AttendanceShowcase'; // Attendance Components Showcase

// Student components - new organized structure
import ProfilePage from '../pages/client/student/Account/ProfilePage';
import EditProfile from '../pages/client/student/Account/EditProfile';
import TeamManagement from '../pages/client/student/Account/TeamManagement';
import Invitations from '../pages/client/student/Account/Invitations';
import RegistrationRouter from '../components/common/RegistrationRouter';
import RegistrationSuccess from '../pages/client/student/EventRegistration/RegistrationSuccess';

// Attendance components
import MarkAttendance from '../pages/client/student/Attendance/MarkAttendance';
import AttendanceSuccess from '../pages/client/student/Attendance/AttendanceSuccess';
import AttendanceConfirm from '../pages/client/student/Attendance/AttendanceConfirm';
import NotRegistered from '../pages/client/student/NotRegistered';

// Faculty components - new organized structure
import FacultyProfilePage from '../pages/client/faculty/Account/FacultyProfilePage';
import FacultyProfileEdit from '../pages/client/faculty/Account/FacultyProfileEdit';

import AdminDashboard from '../pages/admin/Dashboard';
import AdminEvents from '../pages/admin/Events';
import AdminStudents from '../pages/admin/Students';
import Faculty from '../pages/admin/Faculty';
import ManageCertificates from '../pages/admin/ManageCertificates';
import Assets from '../pages/admin/Assets';
import Venues from '../pages/admin/Venues';
import CreateEvent from '../pages/admin/CreateEvent';
import EventCreatedSuccess from '../pages/admin/EventCreatedSuccess';
import EditEvent from '../pages/admin/EditEvent';
import EventDetail from '../pages/admin/EventDetail';
import ExportData from '../pages/admin/ExportData';
import ManageAdmin from '../pages/admin/ManageAdmin';
import SettingsProfile from '../pages/admin/SettingsProfile';
import PhysicalAttendancePortal from '../components/admin/attendance/PhysicalAttendancePortal';
import CertificateEditor from '../pages/admin/CertificateEditor';
import DropdownManagement from '../components/admin/SuperAdmin/DropdownManagement';

import LoadingSpinner from '../components/LoadingSpinner';
import ProtectedRoute from '../components/ProtectedRoute';
import SuperAdminRoute from '../components/SuperAdminRoute';
import ScrollToTop from '../components/common/ScrollToTop';

// Admin redirect component to handle role-based redirects
function AdminRedirect() {
  const { user } = useAuth();
  
  if (user?.role === 'executive_admin') {
    return <Navigate to="/admin/events/create" replace />;
  }
  
  return <Navigate to="/admin/dashboard" replace />;
}

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
        {/* Auth Routes - No Layout */}
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

        {/* Client Routes with Persistent Navigation */}
        <Route path="/" element={<PersistentClientLayout />}>
          <Route index element={<Homepage />} />
          <Route path="client/events" element={<EventListPage />} />
          <Route path="client/events/:eventId" element={<EventDetailPage />} />
          <Route path="events" element={<EventListPage />} />
          
          {/* Continue with other client routes... */}
          <Route path="client/events/:eventId/feedback" element={<FeedbackForm />} />
          <Route path="client/events/:eventId/feedback-success" element={<FeedbackSuccess />} />
          <Route path="client/events/:eventId/feedback-confirmation" element={<FeedbackConfirm />} />
          <Route path="client/events/:eventId/certificate" element={<CertificateDownload />} />
          <Route path="client/events/:eventId/registration-success" element={<RegistrationSuccess />} />
          
          {/* Protected Routes */}
          <Route
            path="client/events/:eventId/mark-attendance"
            element={
              <ProtectedRoute userType="student">
                <MarkAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="client/events/:eventId/attendance-success"
            element={
              <ProtectedRoute userType="student">
                <AttendanceSuccess />
              </ProtectedRoute>
            }
          />
          <Route
            path="client/events/:eventId/attendance-confirmation"
            element={
              <ProtectedRoute userType="student">
                <AttendanceConfirm />
              </ProtectedRoute>
            }
          />
          <Route
            path="client/events/:eventId/not-registered"
            element={
              <ProtectedRoute userType="student">
                <NotRegistered />
              </ProtectedRoute>
            }
          />
          
          <Route path="client/events/:eventId/manage-team" element={<TeamManagement />} />
          
          <Route
            path="client/profile"
            element={
              <ProtectedRoute userType="student">
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="client/profile/edit"
            element={
              <ProtectedRoute userType="student">
                <EditProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="client/invitations"
            element={
              <ProtectedRoute userType="student">
                <Invitations />
              </ProtectedRoute>
            }
          />
          
          {/* Faculty Routes */}
          <Route
            path="faculty/profile"
            element={
              <ProtectedRoute userType="faculty">
                <FacultyProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="faculty/profile/edit"
            element={
              <ProtectedRoute userType="faculty">
                <FacultyProfileEdit />
              </ProtectedRoute>
            }
          />
          <Route
            path="faculty/events"
            element={
              <ProtectedRoute userType="faculty">
                <EventListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="faculty/events/:eventId"
            element={
              <ProtectedRoute userType="faculty">
                <EventDetailPage />
              </ProtectedRoute>
            }
          />
          
          {/* Dev/Legacy Routes */}
          <Route path="dev/event-registration/:eventId" element={<RegistrationRouter />} />
          <Route path="dev/event-registration" element={<RegistrationRouter />} />
          <Route path="dev/team-management" element={<TeamManagement />} />
          <Route path="dev/team-management/:eventId/:teamId" element={<TeamManagement />} />
          
          {/* Student Routes */}
          <Route
            path="client/dashboard"
            element={
              <ProtectedRoute userType="student">
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="student/profile"
            element={
              <ProtectedRoute userType="student">
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="student/profile/edit"
            element={
              <ProtectedRoute userType="student">
                <EditProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="student/team-management"
            element={
              <ProtectedRoute userType="student">
                <TeamManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="student/invitations"
            element={
              <ProtectedRoute userType="student">
                <Invitations />
              </ProtectedRoute>
            }
          />
          <Route
            path="student/events/:eventId/register"
            element={
              <ProtectedRoute userType="student">
                <RegistrationRouter />
              </ProtectedRoute>
            }
          />
          <Route
            path="student/events/:eventId/register-team"
            element={
              <ProtectedRoute userType="student">
                <RegistrationRouter forceTeamMode={true} />
              </ProtectedRoute>
            }
          />
          <Route
            path="student/events/:eventId/registration-success"
            element={
              <ProtectedRoute userType="student">
                <RegistrationSuccess />
              </ProtectedRoute>
            }
          />
          
          {/* Faculty Registration Routes */}
          <Route
            path="faculty/events/:eventId/register"
            element={
              <ProtectedRoute userType="faculty">
                <RegistrationRouter />
              </ProtectedRoute>
            }
          />
          <Route
            path="faculty/events/:eventId/register-team"
            element={
              <ProtectedRoute userType="faculty">
                <RegistrationRouter forceTeamMode={true} />
              </ProtectedRoute>
            }
          />
          <Route
            path="faculty/events/:eventId/registration-success"
            element={
              <ProtectedRoute userType="faculty">
                <RegistrationSuccess />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin/login" element={<Navigate to="/auth/login?mode=admin" replace />} />
        
        {/* Protected Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute userType="admin">
              <AdminRedirect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <SuperAdminRoute>
              <AdminDashboard />
            </SuperAdminRoute>
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
          path="/admin/certificate-editor"
          element={
            <ProtectedRoute userType="admin">
              <CertificateEditor />
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
          path="/admin/venues"
          element={
            <ProtectedRoute userType="admin">
              <Venues />
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
          path="/admin/events/create"
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
          path="/admin/dropdown-management"
          element={
            <SuperAdminRoute>
              <DropdownManagement />
            </SuperAdminRoute>
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

        {/* QR Code Demo Route (for development/testing) */}
        <Route
          path="/demo/qr"
          element={<QRCodeDemo />}
        />
        <Route
          path="/test/qr"
          element={<QRTest />}
        />
        
        {/* Test Mode - Overview of All Pages */}
        <Route
          path="/test/all-pages"
          element={<TestMode />}
        />
        
        {/* Attendance Components Showcase */}
        <Route
          path="/test/attendance"
          element={<AttendanceShowcase />}
        />
        
        <Route
          path="/admin/qr-scanner"
          element={
            <ProtectedRoute userType="admin">
              <QRScannerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty/qr-scanner"
          element={
            <ProtectedRoute userType="faculty">
              <QRScannerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mobile/qr-scanner"
          element={<MobileQRScanner />}
        />
        
        {/* Reusable Invitation Link System - Production Endpoints */}
        <Route
          path="/scan/join/:invitationCode"
          element={<VolunteerScanner />}
        />
        
        {/* Organizer Portal - Create Invitation Links */}
        <Route
          path="/admin/create-volunteer-link"
          element={
            <ProtectedRoute userType="admin">
              <CreateInvitationLink />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events/:eventId/volunteers"
          element={
            <ProtectedRoute userType="admin">
              <CreateInvitationLink />
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
