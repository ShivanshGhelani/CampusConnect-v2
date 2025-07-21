import React from 'react';
import { Link } from 'react-router-dom';
import ClientLayout from '../../components/client/Layout';

const TestIndex = () => {
  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-100 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl w-full mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-500 shadow-lg mb-6">
              <i className="fas fa-flask text-white text-3xl"></i>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Development Test Pages
            </h1>
            <p className="text-lg text-gray-600">
              Test various components and pages in development mode
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Event Registration Tests */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <i className="fas fa-clipboard-list text-blue-600 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Event Registration</h3>
              </div>
              <p className="text-gray-600 mb-4 text-sm">
                Test the event registration form with mock data
              </p>
              <div className="space-y-2">
                <Link
                  to="/dev/event-registration"
                  className="block w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center text-sm"
                >
                  Individual Registration
                </Link>
                <Link
                  to="/dev/event-registration-team"
                  className="block w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-center text-sm"
                >
                  Team Registration
                </Link>
              </div>
            </div>

            {/* Mark Attendance Tests */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <i className="fas fa-check-circle text-purple-600 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Mark Attendance</h3>
              </div>
              <p className="text-gray-600 mb-4 text-sm">
                Test the attendance marking form with mock data
              </p>
              <div className="space-y-2">
                <Link
                  to="/dev/mark-attendance"
                  className="block w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-center text-sm"
                >
                  Mark Attendance
                </Link>
              </div>
            </div>

            {/* Registration Success Tests */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mr-4">
                  <i className="fas fa-check-double text-emerald-600 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Registration Success</h3>
              </div>
              <p className="text-gray-600 mb-4 text-sm">
                Test the registration success page with confirmation details
              </p>
              <div className="space-y-2">
                <Link
                  to="/dev/registration-success"
                  className="block w-full bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-center text-sm"
                >
                  View Success Page
                </Link>
              </div>
            </div>

            {/* Attendance Success Tests */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <i className="fas fa-user-check text-green-600 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Attendance Success</h3>
              </div>
              <p className="text-gray-600 mb-4 text-sm">
                Test attendance marking success and confirmation pages
              </p>
              <div className="space-y-2">
                <Link
                  to="/dev/attendance-success"
                  className="block w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-center text-sm"
                >
                  Attendance Success
                </Link>
                <Link
                  to="/dev/attendance-success?already_marked=true"
                  className="block w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-center text-sm"
                >
                  Already Marked Version
                </Link>
                <Link
                  to="/dev/attendance-confirmation"
                  className="block w-full bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors text-center text-sm"
                >
                  Attendance Confirmation
                </Link>
              </div>
            </div>

            {/* Team Management Tests */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mr-4">
                  <i className="fas fa-users text-cyan-600 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Team Management</h3>
              </div>
              <p className="text-gray-600 mb-4 text-sm">
                Test team management interface with member operations and export features
              </p>
              <div className="space-y-2">
                <Link
                  to="/dev/team-management"
                  className="block w-full bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors text-center text-sm"
                >
                  Team Management
                </Link>
              </div>
            </div>

            {/* Error States Tests */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                  <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Error States</h3>
              </div>
              <p className="text-gray-600 mb-4 text-sm">
                Test error pages and notification states
              </p>
              <div className="space-y-2">
                <Link
                  to="/dev/not-registered"
                  className="block w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-center text-sm"
                >
                  Not Registered Page
                </Link>
              </div>
            </div>

            {/* Other Test Components */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <i className="fas fa-calendar-alt text-green-600 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Event Pages</h3>
              </div>
              <p className="text-gray-600 mb-4 text-sm">
                Test event-related pages and components
              </p>
              <div className="space-y-2">
                <Link
                  to="/client/events"
                  className="block w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-center text-sm"
                >
                  Event List
                </Link>
                <button 
                  className="block w-full bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed text-center text-sm"
                  disabled
                >
                  Event Detail (TBD)
                </button>
              </div>
            </div>

            {/* Add more test sections as needed */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <i className="fas fa-cogs text-purple-600 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Other Components</h3>
              </div>
              <p className="text-gray-600 mb-4 text-sm">
                Test other UI components and pages
              </p>
              <div className="space-y-2">
                <button 
                  className="block w-full bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed text-center text-sm"
                  disabled
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <i className="fas fa-info-circle text-yellow-400"></i>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-yellow-800">Development Notes</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>These test pages use mock data and bypass authentication</li>
                    <li>Form submissions in dev mode only log to console</li>
                    <li>Remove /dev/ routes in production build</li>
                    <li>Use browser dev tools to inspect form data and state</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <i className="fas fa-home mr-2"></i>
              Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default TestIndex;
