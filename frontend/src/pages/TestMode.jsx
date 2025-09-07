import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  UserIcon,
  AcademicCapIcon,
  CogIcon,
  QrCodeIcon,
  ClipboardDocumentCheckIcon,
  CalendarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const TestMode = () => {
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const pageCategories = [
    {
      id: 'auth',
      title: 'Authentication Pages',
      icon: <ShieldCheckIcon className="h-5 w-5" />,
      color: 'bg-blue-500',
      pages: [
        { name: 'Login Page', path: '/auth/login', description: 'User login form' },
        { name: 'Register Page', path: '/auth/register', description: 'User registration form' },
        { name: 'Forgot Password', path: '/forgot-password', description: 'Password reset request' },
        { name: 'Reset Password', path: '/auth/reset-password/sample-token', description: 'Password reset form (with sample token)' }
      ]
    },
    {
      id: 'client',
      title: 'Client/Public Pages',
      icon: <UserIcon className="h-5 w-5" />,
      color: 'bg-green-500',
      pages: [
        { name: 'Homepage', path: '/', description: 'Landing page' },
        { name: 'Event List', path: '/client/events', description: 'Public event listing' },
        { name: 'Event Detail', path: '/client/events/sample-event-id', description: 'Event detail page (with sample ID)' },
        { name: 'Feedback Form', path: '/client/events/sample-event-id/feedback', description: 'Event feedback form' },
        { name: 'Feedback Success', path: '/client/events/sample-event-id/feedback-success', description: 'Feedback submission success' },
        { name: 'Certificate Download', path: '/client/events/sample-event-id/certificate', description: 'Certificate download page' }
      ]
    },
    {
      id: 'student',
      title: 'Student Pages',
      icon: <AcademicCapIcon className="h-5 w-5" />,
      color: 'bg-purple-500',
      pages: [
        { name: 'Registration Router', path: '/dev/event-registration/sample-event-id', description: 'Event registration flow' },
        { name: 'Team Management', path: '/dev/team-management', description: 'Team management interface' },
        { name: 'Registration Success', path: '/client/events/sample-event-id/registration-success', description: 'Registration confirmation' },
        { name: 'Mark Attendance', path: '/client/events/sample-event-id/mark-attendance', description: 'Attendance marking (protected)' },
        { name: 'Attendance Success', path: '/client/events/sample-event-id/attendance-success', description: 'Attendance confirmation (protected)' },
        { name: 'Not Registered', path: '/client/events/sample-event-id/not-registered', description: 'Not registered notice (protected)' }
      ]
    },
    {
      id: 'admin',
      title: 'Admin Pages',
      icon: <CogIcon className="h-5 w-5" />,
      color: 'bg-red-500',
      pages: [
        { name: 'Admin Dashboard', path: '/admin/dashboard', description: 'Main admin dashboard (protected)' },
        { name: 'Events Management', path: '/admin/events', description: 'Admin event management (protected)' },
        { name: 'Create Event', path: '/admin/events/create', description: 'Create new event (protected)' },
        { name: 'Students Management', path: '/admin/students', description: 'Student management (protected)' },
        { name: 'Faculty Management', path: '/admin/faculty', description: 'Faculty management (protected)' },
        { name: 'Venues Management', path: '/admin/venues', description: 'Venue management (protected)' },
        { name: 'Certificate Editor', path: '/admin/certificate-editor', description: 'Certificate template editor (protected)' },
        { name: 'Assets Management', path: '/admin/assets', description: 'Asset management (protected)' },
        { name: 'Manage Admins', path: '/admin/manage-admins', description: 'Admin user management (protected)' }
      ]
    },
    {
      id: 'qr',
      title: 'QR Code & Scanner Pages',
      icon: <QrCodeIcon className="h-5 w-5" />,
      color: 'bg-orange-500',
      pages: [
        { name: 'QR Code Demo', path: '/demo/qr', description: 'QR code generation demo' },
        { name: 'QR Test Page', path: '/test/qr', description: 'QR code testing interface' },
        { name: 'QR Scanner', path: '/admin/qr-scanner', description: 'QR scanner interface (protected)' },
        { name: 'Mobile QR Scanner', path: '/mobile/qr-scanner', description: 'Mobile-optimized QR scanner' },
        { name: 'Volunteer Scanner', path: '/scan/join/sample-invitation-code', description: 'Invitation-based volunteer scanner' },
        { name: 'Create Invitation Link', path: '/admin/create-volunteer-link', description: 'Create volunteer invitation links (protected)' }
      ]
    },
    {
      id: 'attendance',
      title: 'Attendance Components',
      icon: <ClipboardDocumentCheckIcon className="h-5 w-5" />,
      color: 'bg-teal-500',
      pages: [
        { name: 'Physical Attendance Portal', path: '/admin/events/sample-event-id/attendance', description: 'Physical attendance management (protected)' }
      ]
    },
    {
      id: 'faculty',
      title: 'Faculty Pages',
      icon: <AcademicCapIcon className="h-5 w-5" />,
      color: 'bg-indigo-500',
      pages: [
        { name: 'Faculty Profile', path: '/faculty/profile', description: 'Faculty profile page (protected)' },
        { name: 'Faculty Events', path: '/faculty/events', description: 'Faculty event listing (protected)' },
        { name: 'Faculty QR Scanner', path: '/faculty/qr-scanner', description: 'Faculty QR scanner (protected)' }
      ]
    }
  ];

  const allAttendanceComponents = [
    'PhysicalAttendancePortal.jsx (Unified Portal)'
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🧪 CampusConnect Test Mode
          </h1>
          <p className="text-lg text-gray-600">
            Complete overview of all pages and components in the application
          </p>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Some pages are protected and may require authentication. 
              Pages marked with "(protected)" will redirect to login if not authenticated with the correct role.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {pageCategories.reduce((total, category) => total + category.pages.length, 0)}
                </p>
                <p className="text-sm text-gray-600">Total Pages</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClipboardDocumentCheckIcon className="h-8 w-8 text-teal-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{allAttendanceComponents.length}</p>
                <p className="text-sm text-gray-600">Attendance Components</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <QrCodeIcon className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {pageCategories.find(cat => cat.id === 'qr')?.pages.length || 0}
                </p>
                <p className="text-sm text-gray-600">QR/Scanner Pages</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {pageCategories.reduce((total, category) => 
                    total + category.pages.filter(page => page.description.includes('protected')).length, 0
                  )}
                </p>
                <p className="text-sm text-gray-600">Protected Pages</p>
              </div>
            </div>
          </div>
        </div>

        {/* Page Categories */}
        <div className="space-y-6">
          {pageCategories.map((category) => (
            <div key={category.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <button
                onClick={() => toggleSection(category.id)}
                className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${category.color} text-white`}>
                    {category.icon}
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-semibold text-gray-900">{category.title}</h2>
                    <p className="text-sm text-gray-500">{category.pages.length} pages</p>
                  </div>
                </div>
                {expandedSections[category.id] ? (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              {expandedSections[category.id] && (
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {category.pages.map((page, index) => (
                      <Link
                        key={index}
                        to={page.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 group-hover:text-blue-600 mb-1">
                              {page.name}
                            </h3>
                            <p className="text-sm text-gray-500 mb-2">{page.description}</p>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-600">
                              {page.path}
                            </code>
                          </div>
                          <ChevronRightIcon className="h-4 w-4 text-gray-400 ml-2 group-hover:text-blue-500" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Attendance Components Section */}
        <div className="mt-8 bg-white rounded-lg shadow-lg overflow-hidden">
          <button
            onClick={() => toggleSection('attendance-components')}
            className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-teal-500 text-white">
                <ClipboardDocumentCheckIcon className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-semibold text-gray-900">Attendance Components</h2>
                <p className="text-sm text-gray-500">{allAttendanceComponents.length} components</p>
              </div>
            </div>
            {expandedSections['attendance-components'] ? (
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>
          
          {expandedSections['attendance-components'] && (
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {allAttendanceComponents.map((component, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <h3 className="font-medium text-gray-900 mb-1">{component}</h3>
                    <p className="text-sm text-gray-500 mb-2">React Component</p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-600">
                      /src/components/admin/attendance/{component}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Testing Instructions</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• <strong>Public Pages:</strong> Can be accessed directly without authentication</p>
            <p>• <strong>Protected Pages:</strong> Require login with appropriate user role (student/faculty/admin)</p>
            <p>• <strong>Sample IDs:</strong> Pages using sample IDs may show mock data or error states</p>
            <p>• <strong>External Links:</strong> All page links open in new tabs for easy navigation</p>
            <p>• <strong>Mobile Testing:</strong> Use browser dev tools to test mobile responsiveness</p>
            <p>• <strong>QR Scanner Testing:</strong> Requires camera permissions and works best on HTTPS</p>
          </div>
        </div>

        {/* Quick Access Toolbar */}
        <div className="fixed bottom-6 right-6 flex flex-col space-y-2">
          <button
            onClick={() => {
              const allSections = Object.keys(pageCategories.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), { 'attendance-components': true }));
              const allExpanded = allSections.every(section => expandedSections[section]);
              
              if (allExpanded) {
                setExpandedSections({});
              } else {
                const newState = {};
                allSections.forEach(section => newState[section] = true);
                setExpandedSections(newState);
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
          >
            {Object.keys(expandedSections).length > 0 ? 'Collapse All' : 'Expand All'}
          </button>
          <Link
            to="/"
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium text-center transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TestMode;
