import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function ClientNavigation() {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    // Prevent body scrolling when mobile menu is open
    if (!isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    document.body.style.overflow = '';
  };

  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]);

  // Clean up body overflow on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const isActivePath = (path, filter = null) => {
    if (filter) {
      const urlParams = new URLSearchParams(location.search);
      return location.pathname === path && urlParams.get('filter') === filter;
    }
    return location.pathname === path;
  };

  const isActivePathNoFilter = (path) => {
    const urlParams = new URLSearchParams(location.search);
    return location.pathname === path && (!urlParams.get('filter') || urlParams.get('filter') === 'all');
  };

  return (
    <>
      <nav className="bg-white shadow-lg sticky top-8 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3">
                <img
                  src="/logo/ksv.png"
                  alt="KSV Logo"
                  className="h-10 w-10 object-contain"
                />
                <span className="text-3xl font-bold">
                  <span className="text-slate-800">Campus</span>
                  <span className="bg-gradient-to-r from-teal-500 to-purple-500 bg-clip-text text-transparent">Connect</span>
                </span>
              </Link>
            </div>            {/* Mobile Menu Toggle - Hidden since we use bottom nav */}
            <div className="md:hidden hidden">
              <button
                onClick={toggleMobileMenu}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <i className="fas fa-bars text-xl"></i>
              </button>
            </div>{/* Desktop Navigation - moved to empty middle section */}
            <div className="hidden md:flex items-center space-x-1">
              {/* Empty middle section for better layout */}
            </div>

            {/* User Actions Section with Events Tabs */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Main Navigation Pills */}
              <div className="flex items-center backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 p-1">
                <Link
                  to="/client/events?filter=all"
                  className={`group relative ${isActivePathNoFilter('/client/events')
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-white text-black hover:text-blue-600'
                    } px-4 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2`}
                >
                  <i className="fas fa-calendar text-sm group-hover:scale-110 transition-transform"></i>
                  <span className="text-sm font-semibold">All Events</span>
                </Link>

                <Link
                  to="/client/events?filter=upcoming"
                  className={`group relative ${isActivePath('/client/events', 'upcoming')
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-white text-black hover:text-blue-600'
                    } px-4 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2`}
                >
                  <i className="fas fa-clock text-sm group-hover:scale-110 transition-transform"></i>
                  <span className="text-sm font-semibold">Upcoming</span>
                </Link>

                <Link
                  to="/client/events?filter=ongoing"
                  className={`group relative ${isActivePath('/client/events', 'ongoing')
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-white text-green-600'
                    } px-4 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2`}
                >
                  <div className="flex items-center space-x-2">
                    {/* Improved blinking dot with better positioning */}
                    <div className="relative flex items-center justify-center w-3 h-3">
                      {isActivePath('/client/events', 'ongoing') ? (
                        <>
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                          <span className="absolute w-2 h-2 bg-white/40 rounded-full animate-ping"></span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          <span className="absolute w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                        </>
                      )}
                    </div>
                    <span className="text-sm font-semibold">Live</span>
                  </div>
                </Link>
              </div>              {isAuthenticated ? (
                /* User Profile Button */
                <div className="flex items-center space-x-4 ml-6 pl-6 border-l border-gray-300">                  <Link
                    to="/client/dashboard"
                    className="flex items-center space-x-2 hover:bg-gray-100 rounded-md px-2 py-1 transition-colors min-w-0"
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                      {user?.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm">
                          {user?.full_name ? 
                            user.full_name.split(' ').map(name => name[0]).join('').substring(0, 2).toUpperCase()
                            : (user?.enrollment_no ? user.enrollment_no.substring(0, 2).toUpperCase() : 'GU')
                          }
                        </div>
                      )}
                    </div>
                    <div className="text-gray-700 text-sm text-left flex-grow whitespace-nowrap">
                      <div className="font-medium">
                        {user?.full_name || user?.enrollment_no || 'Guest User'}
                      </div>
                      <div className="text-xs text-gray-500">Student</div>
                    </div>
                  </Link><button
                    onClick={handleLogout}
                    className="inline-flex items-center bg-white border-2 border-red-500 text-red-500 hover:bg-red-50 hover:border-red-600 hover:text-red-600 px-3 py-2 rounded-md text-sm font-sans font-medium transition-colors"
                  >
                    <i className="fas fa-sign-out-alt mr-1 text-sm"></i>
                    Logout
                  </button>
                </div>
              ) : (
                /* Not Logged In - Single Inviting Action Button */
                <div className="flex items-center">
                  <Link
                    to="/auth/login"
                    className="inline-flex items-center justify-center px-6 py-3 border border-green-600 text-green-600 bg-white hover:bg-green-600 hover:text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <i className="fas fa-sign-in-alt mr-2"></i>
                    Join Campus Connect
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>      {/* Proper Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="grid grid-cols-5 h-16">
          {/* Upcoming Button */}
          <Link
            to="/client/events?filter=upcoming"
            className={`flex flex-col items-center justify-center ${isActivePath('/client/events', 'upcoming')
              ? 'text-blue-600'
              : 'text-gray-500'
              } transition-colors`}
          >
            <i className="fas fa-clock text-lg mb-1"></i>
            <span className="text-xs font-medium">Upcoming</span>
          </Link>

          {/* Live Button */}
          <Link
            to="/client/events?filter=ongoing"
            className={`flex flex-col items-center justify-center relative ${isActivePath('/client/events', 'ongoing')
              ? 'text-green-600'
              : 'text-gray-500'
              } transition-colors`}
          >
            <div className="relative">
              <i className="fas fa-broadcast-tower text-lg mb-1"></i>
              {/* Live indicator dot */}
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            </div>
            <span className="text-xs font-medium">Live</span>
          </Link>

          {/* Center Logo - Elevated */}
          <Link to="/" className="flex flex-col items-center justify-center relative -mt-6">
            <div className="w-14 h-14 bg-gradient-to-r from-teal-500 to-purple-500 rounded-full flex items-center justify-center shadow-xl border-4 border-white">
              <img
                src="/logo/ksv.png"
                alt="Logo"
                className="w-8 h-8 object-contain"
              />
            </div>
            <span className="text-xs font-bold text-slate-800 mt-1">Campus</span>
          </Link>

          {/* Profile/Join Button */}
          {isAuthenticated ? (
            <Link
              to="/client/dashboard"
              className={`flex flex-col items-center justify-center ${location.pathname === '/client/dashboard'
                ? 'text-indigo-600'
                : 'text-gray-500'
                } transition-colors`}
            >
              <i className="fas fa-user text-lg mb-1"></i>
              <span className="text-xs font-medium">Profile</span>
            </Link>
          ) : (
            <Link
              to="/auth/login"
              className="flex flex-col items-center justify-center text-green-600"
            >
              <i className="fas fa-sign-in-alt text-lg mb-1"></i>
              <span className="text-xs font-medium">Join</span>
            </Link>
          )}

          {/* Settings/Logout */}
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="flex flex-col items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
            >
              <i className="fas fa-sign-out-alt text-lg mb-1"></i>
              <span className="text-xs font-medium">Logout</span>
            </button>
          ) : (
            <Link
              to="/client/events?filter=all"
              className={`flex flex-col items-center justify-center ${isActivePathNoFilter('/client/events')
                ? 'text-blue-600'
                : 'text-gray-500'
                } transition-colors`}
            >
              <i className="fas fa-calendar text-lg mb-1"></i>
              <span className="text-xs font-medium">Events</span>
            </Link>
          )}
        </div>
      </div>

      {/* Add bottom padding to prevent content being hidden behind bottom nav */}
      <div className="md:hidden h-16"></div>
    </>
  );
}

export default ClientNavigation;
