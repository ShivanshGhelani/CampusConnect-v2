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
      {/* Floating Oval Navigation - Glassmorphism Style */}
      <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-full shadow-2xl px-6 py-3">
          <div className="flex items-center justify-center space-x-8">
            {/* Logo - Compact Version */}
            <Link to="/" className="flex items-center space-x-2 group">
              <img
                src="/logo/ksv.png"
                alt="KSV Logo"
                className="h-8 w-8 object-contain group-hover:scale-110 transition-transform duration-300"
              />
              <span className="text-xl font-bold hidden lg:block">
                <span className="text-slate-800">Campus</span>
                <span className="bg-gradient-to-r from-teal-500 to-purple-500 bg-clip-text text-transparent">Connect</span>
              </span>
            </Link>

            {/* Desktop Navigation Pills - Compact */}
            <div className="hidden md:flex items-center space-x-2">
              <Link
                to="/client/events?filter=all"
                className={`group relative ${isActivePathNoFilter('/client/events')
                    ? 'bg-blue-500/90 text-white shadow-lg'
                    : 'bg-white/30 text-slate-700 hover:bg-white/50 hover:text-blue-600'
                  } px-4 py-2 rounded-full font-medium transition-all duration-300 flex items-center space-x-2 backdrop-blur-sm border border-white/20`}
              >
                <i className="fas fa-calendar text-sm group-hover:scale-110 transition-transform"></i>
                <span className="text-sm font-semibold">Events</span>
              </Link>

              <Link
                to="/client/events?filter=upcoming"
                className={`group relative ${isActivePath('/client/events', 'upcoming')
                    ? 'bg-blue-500/90 text-white shadow-lg'
                    : 'bg-white/30 text-slate-700 hover:bg-white/50 hover:text-blue-600'
                  } px-4 py-2 rounded-full font-medium transition-all duration-300 flex items-center space-x-2 backdrop-blur-sm border border-white/20`}
              >
                <i className="fas fa-clock text-sm group-hover:scale-110 transition-transform"></i>
                <span className="text-sm font-semibold">Upcoming</span>
              </Link>

              <Link
                to="/client/events?filter=ongoing"
                className={`group relative ${isActivePath('/client/events', 'ongoing')
                    ? 'bg-green-500/90 text-white shadow-lg'
                    : 'bg-white/30 text-green-600 hover:bg-white/50'
                  } px-4 py-2 rounded-full font-medium transition-all duration-300 flex items-center space-x-2 backdrop-blur-sm border border-white/20`}
              >
                <div className="flex items-center space-x-2">
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
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden">
              <button
                onClick={toggleMobileMenu}
                className="p-2 rounded-full bg-white/30 backdrop-blur-sm border border-white/20 text-slate-700 hover:bg-white/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <i className="fas fa-bars text-lg"></i>
              </button>
            </div>            {/* User Actions Section - Compact */}
            <div className="hidden md:flex items-center">
              {isAuthenticated ? (
                /* Enhanced User Menu Dropdown - Glassmorphism Style */
                <div className="relative group">
                  <div className={`flex items-center ${location.pathname === '/client/dashboard'
                      ? 'bg-gradient-to-r from-indigo-500/90 to-purple-600/90 text-white shadow-lg'
                      : 'bg-white/30 text-slate-700 hover:bg-white/50 border border-white/20'
                    } rounded-full transition-all duration-300 backdrop-blur-sm`}>
                    {/* Clickable Profile Section */}
                    <Link
                      to="/client/dashboard"
                      className="group flex items-center space-x-2 pl-4 pr-3 py-2 transition-all duration-300"
                    >
                      <div className={`w-7 h-7 ${location.pathname === '/client/dashboard'
                          ? 'bg-white/20'
                          : 'bg-gradient-to-br from-blue-500 to-purple-600'
                        } rounded-full flex items-center justify-center ${location.pathname === '/client/dashboard'
                          ? 'text-white'
                          : 'text-white'
                        } text-xs font-semibold shadow-sm group-hover:scale-105 transition-transform`}>
                        <i className="fas fa-user"></i>
                      </div>
                      <span className={`text-sm font-semibold ${location.pathname === '/client/dashboard'
                          ? 'text-white'
                          : 'group-hover:text-indigo-600'
                        }`}>Profile</span>
                    </Link>

                    {/* Vertical Divider */}
                    <div className={`h-4 w-px ${location.pathname === '/client/dashboard'
                        ? 'bg-white/30'
                        : 'bg-gray-300/50'
                      }`}></div>

                    {/* Dropdown Toggle Section */}
                    <button className="px-3 py-2 transition-all duration-300 focus:outline-none">
                      <i className="fas fa-chevron-down text-xs group-hover:rotate-180 transition-transform duration-300"></i>
                    </button>
                  </div>

                  {/* Enhanced Dropdown Menu - Glassmorphism */}
                  <div className="absolute right-0 mt-3 w-56 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                    {/* Profile Section */}
                    <div className="px-4 py-3 border-b border-gray-200/30">
                      <p className="text-sm font-medium text-gray-900">Student Portal</p>
                      <p className="text-xs text-gray-600">{user?.full_name || user?.enrollment_no || 'Guest User'}</p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        to="/client/profile"
                        className="group flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-purple-50/50 hover:text-purple-700 transition-all duration-200"
                      >
                        <i className="fas fa-cog text-purple-600"></i>
                        <span className="font-medium">Edit Profile</span>
                      </Link>

                      <Link
                        to="/client/certificates"
                        className="group flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-emerald-50/50 hover:text-emerald-700 transition-all duration-200"
                      >
                        <i className="fas fa-certificate text-emerald-600"></i>
                        <span className="font-medium">Certificates</span>
                      </Link>
                    </div>

                    {/* Logout Section */}
                    <div className="border-t border-gray-200/30 py-1">
                      <button
                        onClick={handleLogout}
                        className="group flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50/50 hover:text-red-700 transition-all duration-200 w-full text-left"
                      >
                        <i className="fas fa-sign-out-alt"></i>
                        <span className="font-medium">Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Not Logged In - Single Inviting Action Button - Glassmorphism Style */
                <div className="flex items-center">                  <Link
                    to="/auth/login"
                    className="inline-flex items-center justify-center px-6 py-3 bg-white/30 backdrop-blur-sm border border-white/30 text-white hover:bg-white/50 hover:text-slate-800 hover:border-white/50 rounded-full text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <i className="fas fa-sign-in-alt mr-2"></i>
                    Join Campus Connect
                  </Link>
                </div>
              )}
            </div>
          </div>        
        </div>
      </nav>

      {/* Mobile Navigation Menu - Enhanced Glassmorphism */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 md:hidden">
          <div className="fixed inset-y-0 right-0 w-80 bg-white/90 backdrop-blur-xl shadow-2xl border-l border-white/30">
            <div className="flex items-center justify-between p-6 border-b border-gray-200/30">
              <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
              <button
                onClick={closeMobileMenu}
                className="p-2 rounded-full bg-gray-100/50 text-gray-600 hover:bg-gray-200/50 hover:text-gray-900 transition-all duration-300"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Mobile Navigation Links - Glassmorphism Style */}
              <Link
                to="/client/events?filter=all"
                className={`flex items-center space-x-3 p-4 rounded-2xl backdrop-blur-sm border ${isActivePathNoFilter('/client/events')
                    ? 'bg-blue-500/90 text-white border-blue-400/50 shadow-lg'
                    : 'bg-white/50 text-slate-700 hover:bg-white/70 hover:text-blue-600 border-white/30'
                  } transition-all duration-300`}
              >
                <i className="fas fa-calendar text-lg"></i>
                <span className="font-medium">All Events</span>
              </Link>

              <Link
                to="/client/events?filter=upcoming"
                className={`flex items-center space-x-3 p-4 rounded-2xl backdrop-blur-sm border ${isActivePath('/client/events', 'upcoming')
                    ? 'bg-blue-500/90 text-white border-blue-400/50 shadow-lg'
                    : 'bg-white/50 text-slate-700 hover:bg-white/70 hover:text-blue-600 border-white/30'
                  } transition-all duration-300`}
              >
                <i className="fas fa-clock text-lg"></i>
                <span className="font-medium">Upcoming</span>
              </Link>

              <Link
                to="/client/events?filter=ongoing"
                className={`flex items-center space-x-3 p-4 rounded-2xl backdrop-blur-sm border ${isActivePath('/client/events', 'ongoing')
                    ? 'bg-green-500/90 text-white border-green-400/50 shadow-lg'
                    : 'bg-white/50 text-green-600 hover:bg-white/70 border-white/30'
                  } transition-all duration-300`}
              >
                <div className="flex items-center space-x-3">
                  {/* Blinking dot for mobile */}
                  <div className="relative flex items-center justify-center w-4 h-4">
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
                  <i className="fas fa-broadcast-tower text-lg"></i>
                </div>
                <span className="font-medium">Live Events</span>
              </Link>

              {isAuthenticated ? (
                <>
                  <hr className="my-6 border-gray-200/30" />

                  {/* Profile as main action - Enhanced */}
                  <Link
                    to="/client/dashboard"
                    className={`flex items-center space-x-3 p-4 rounded-2xl backdrop-blur-sm border ${location.pathname === '/client/dashboard'
                        ? 'bg-gradient-to-r from-indigo-500/90 to-purple-600/90 text-white border-indigo-400/50 shadow-lg'
                        : 'bg-white/50 text-slate-700 hover:bg-white/70 border-white/30'
                      } transition-all duration-300`}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <i className="fas fa-user text-lg"></i>
                    </div>
                    <div>
                      <div className="font-semibold">Profile</div>
                      <div className="text-xs opacity-70">Your student portal</div>
                    </div>
                  </Link>

                  {/* Other profile actions - Enhanced */}
                  <Link
                    to="/client/profile"
                    className="flex items-center space-x-3 p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/30 text-slate-700 hover:bg-white/70 transition-all duration-300"
                  >
                    <i className="fas fa-cog text-lg text-purple-600"></i>
                    <span className="font-medium">Edit Profile</span>
                  </Link>

                  <Link
                    to="/client/certificates"
                    className="flex items-center space-x-3 p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/30 text-slate-700 hover:bg-white/70 transition-all duration-300"
                  >
                    <i className="fas fa-certificate text-lg text-emerald-600"></i>
                    <span className="font-medium">Certificates</span>
                  </Link>

                  <hr className="my-6 border-gray-200/30" />

                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 p-4 rounded-2xl bg-red-50/50 backdrop-blur-sm border border-red-200/30 text-red-600 hover:bg-red-100/50 transition-all duration-300 w-full text-left"
                  >
                    <i className="fas fa-sign-out-alt text-lg"></i>
                    <span className="font-medium">Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <hr className="my-6 border-gray-200/30" />
                  
                  <Link
                    to="/auth/login"
                    className="inline-flex items-center justify-center px-6 py-4 bg-green-500/90 backdrop-blur-sm border border-green-400/50 text-white hover:bg-green-600/90 rounded-2xl text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl w-full"
                  >
                    <i className="fas fa-sign-in-alt mr-2"></i>
                    Join Campus Connect
                  </Link>
                  
                  <div className="text-center mt-3">
                    <p className="text-xs text-gray-600">
                      New here? You can register from the sign-in page
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ClientNavigation;
