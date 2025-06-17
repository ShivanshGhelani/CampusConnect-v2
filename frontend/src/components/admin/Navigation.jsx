import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function AdminNavigation() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-primary-800 text-white shadow-lg">
      <div className="container-custom">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/admin/dashboard" className="text-xl font-bold">
              CampusConnect Admin
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/admin/dashboard"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                isActive('/admin/dashboard')
                  ? 'text-primary-100 bg-primary-700 rounded-md'
                  : 'text-primary-200 hover:text-white hover:bg-primary-700 rounded-md'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/admin/events"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                isActive('/admin/events')
                  ? 'text-primary-100 bg-primary-700 rounded-md'
                  : 'text-primary-200 hover:text-white hover:bg-primary-700 rounded-md'
              }`}
            >
              Events
            </Link>
            <Link
              to="/admin/students"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                isActive('/admin/students')
                  ? 'text-primary-100 bg-primary-700 rounded-md'
                  : 'text-primary-200 hover:text-white hover:bg-primary-700 rounded-md'
              }`}
            >
              Students
            </Link>
            <Link
              to="/admin/analytics"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                isActive('/admin/analytics')
                  ? 'text-primary-100 bg-primary-700 rounded-md'
                  : 'text-primary-200 hover:text-white hover:bg-primary-700 rounded-md'
              }`}
            >
              Analytics
            </Link>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-primary-200">
              {user?.fullname || user?.username}
            </span>
            <button
              onClick={handleLogout}
              className="bg-primary-700 hover:bg-primary-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to="/admin/dashboard"
              className={`block px-3 py-2 text-sm font-medium rounded-md ${
                isActive('/admin/dashboard')
                  ? 'text-white bg-primary-700'
                  : 'text-primary-200 hover:text-white hover:bg-primary-700'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/admin/events"
              className={`block px-3 py-2 text-sm font-medium rounded-md ${
                isActive('/admin/events')
                  ? 'text-white bg-primary-700'
                  : 'text-primary-200 hover:text-white hover:bg-primary-700'
              }`}
            >
              Events
            </Link>
            <Link
              to="/admin/students"
              className={`block px-3 py-2 text-sm font-medium rounded-md ${
                isActive('/admin/students')
                  ? 'text-white bg-primary-700'
                  : 'text-primary-200 hover:text-white hover:bg-primary-700'
              }`}
            >
              Students
            </Link>
            <Link
              to="/admin/analytics"
              className={`block px-3 py-2 text-sm font-medium rounded-md ${
                isActive('/admin/analytics')
                  ? 'text-white bg-primary-700'
                  : 'text-primary-200 hover:text-white hover:bg-primary-700'
              }`}
            >
              Analytics
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default AdminNavigation;
