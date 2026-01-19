import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/base';  // Import the axios instance
import { organizerAPI } from '../../api/organizer';  // Import organizer API
import { useAvatar } from '../../hooks/useAvatar';
import Avatar from '../common/Avatar';

function ClientNavigation() {
  const { user, userType, logout, isAuthenticated, transitionToOrganizerAdmin } = useAuth();
  
  // Memoize avatar hook to prevent unnecessary calls
  const { avatarUrl } = useAvatar(user, userType);
  
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  // Memoize user display info to prevent re-renders
  const userDisplayInfo = useMemo(() => {
    const userName = user?.full_name || user?.enrollment_no || user?.faculty_id || 'Guest User';
    const userId = user?.enrollment_no || user?.employee_id || 'No ID';
    const userTypeLabel = userType === 'faculty' ? 'Faculty' : 'Student';
    
    return {
      name: typeof userName === 'string' ? userName : 'Guest User',
      id: typeof userId === 'string' ? userId : 'No ID', 
      type: userTypeLabel
    };
  }, [user?.full_name, user?.enrollment_no, user?.faculty_id, user?.employee_id, userType]);

  // Fixed hover handlers to prevent avatar flickering
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsProfileDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsProfileDropdownOpen(false);
    }, 100); // Shorter delay
  };

  const handleLogout = async () => {
    // Determine appropriate login tab based on current user type
    const loginTab = userType === 'faculty' ? 'faculty' : 'student';
    await logout();
    navigate(`/auth/login?tab=${loginTab}`);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]);

  // Clean up body overflow and timeout on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
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
      <nav className="bg-white shadow-lg fixed top-10 left-0 right-0 z-40 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 ml-3 mr-3">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <Link to="/" className="flex items-center space-x-2 sm:space-x-3">
                <img
                  src="/logo/ksv.png"
                  alt="KSV Logo"
                  className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
                />
                <span className="text-xl sm:text-2xl lg:text-3xl font-bold">
                  <span className="text-slate-800">Campus</span>
                  <span className="bg-gradient-to-r from-teal-500 to-purple-500 bg-clip-text text-transparent">Connect</span>
                </span>
              </Link>
            </div>

            {/* Desktop Navigation - Hidden on mobile */}
            <div className="hidden lg:flex items-center space-x-3">
              {/* Main Navigation Pills */}
              <div className="flex items-center backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 p-1">
                <Link
                  to={userType === 'faculty' ? '/faculty/events?filter=all' : '/client/events?filter=all'}
                  className={`group relative ${isActivePathNoFilter(userType === 'faculty' ? '/faculty/events' : '/client/events')
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-white text-black hover:text-blue-600'
                    } px-3 lg:px-4 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2`}
                >
                  <i className="fas fa-calendar text-sm group-hover:scale-110 transition-transform"></i>
                  <span className="text-sm font-semibold">All Events</span>
                </Link>

                <Link
                  to={userType === 'faculty' ? '/faculty/events?filter=upcoming' : '/client/events?filter=upcoming'}
                  className={`group relative ${isActivePath(userType === 'faculty' ? '/faculty/events' : '/client/events', 'upcoming')
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-white text-black hover:text-blue-600'
                    } px-3 lg:px-4 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2`}
                >
                  <i className="fas fa-clock text-sm group-hover:scale-110 transition-transform"></i>
                  <span className="text-sm font-semibold">Upcoming</span>
                </Link>

                <Link
                  to={userType === 'faculty' ? '/faculty/events?filter=ongoing' : '/client/events?filter=ongoing'}
                  className={`group relative ${isActivePath(userType === 'faculty' ? '/faculty/events' : '/client/events', 'ongoing')
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-white text-green-600'
                    } px-3 lg:px-4 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2`}
                >
                  <div className="flex items-center space-x-2">
                    {/* Improved blinking dot with better positioning */}
                    <div className="relative flex items-center justify-center w-3 h-3">
                      {isActivePath(userType === 'faculty' ? '/faculty/events' : '/client/events', 'ongoing') ? (
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

              {isAuthenticated ? (
                /* User Profile Button */
                <div className="relative flex items-center space-x-4 ml-2 pl-2 h-10 border-l border-gray-300" ref={dropdownRef}>
                  {/* Profile Button with Optimized Hover Card */}
                  <div
                    className="relative"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <Link
                      to={userType === 'faculty' ? '/faculty/profile' : '/client/profile'}
                      className="flex items-center space-x-2 lg:space-x-3 rounded-lg px-3 lg:px-4 py-2.5 transition-colors min-w-0 hover:bg-gray-50"
                    >
                      {/* Optimized avatar container - fixed flickering */}
                      <div className="flex-shrink-0">
                        <Avatar
                          src={avatarUrl}
                          size="md"
                          name={userDisplayInfo.name}
                          className="stable-avatar"
                        />
                      </div>
                      <div className="text-gray-700 text-sm text-left flex-grow whitespace-nowrap hidden xl:block">
                        <div className="font-medium">
                          {userDisplayInfo.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {userDisplayInfo.type}
                        </div>
                      </div>
                    </Link>
                    
                    {/* Fixed Hover Dropdown */}
                    <div
                      className={`absolute -left-4 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 transition-all duration-150 z-50 ${
                        isProfileDropdownOpen 
                          ? 'opacity-100 visible translate-y-0' 
                          : 'opacity-0 invisible translate-y-2 pointer-events-none'
                      }`}
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    >
                      {/* Header */}
                      <div className="pl-4 pr-8 py-3 border-b border-gray-100">
                        <div className="text-sm font-medium text-gray-900">{userDisplayInfo.name}</div>
                        <div className="text-xs text-gray-500">{userDisplayInfo.id}</div>
                      </div>
                      
                      {/* Menu Items */}
                      <div className="py-2">
                        {/* Organize Event - Faculty Only */}
                        {userType === 'faculty' && (
                          <button
                            onClick={async () => {
                              try {
                                const response = await organizerAPI.accessOrganizerPortal();

                                if (response.data.success) {
                                  // Update auth context to reflect organizer admin role
                                  await transitionToOrganizerAdmin(response.data);

                                  // Navigate to organizer portal (use the redirect URL from response)
                                  navigate(response.data.redirect_url || '/admin/events');
                                } else {
                                  // Show specific error message
                                  
                                  alert(response.data.message || 'Unable to access organizer portal');
                                }
                              } catch (error) {
                                
                                if (error.response?.data?.message) {
                                  alert(error.response.data.message);
                                } else {
                                  alert('Network error. Please try again.');
                                }
                              }
                            }}
                            className="flex w-full items-center pl-4 py-3 text-sm text-white hover:bg-blue-600 transition-colors cursor-pointer relative overflow-hidden"
                            style={{
                              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                            }}
                          >
                            {/* Blue bubble background decorations */}
                            <div className="absolute inset-0 opacity-20">
                              <div className="absolute top-0 left-0 w-12 h-12 bg-white rounded-full -translate-x-6 -translate-y-6"></div>
                              <div className="absolute top-1/2 right-0 w-8 h-8 bg-white rounded-full translate-x-4 -translate-y-4"></div>
                              <div className="absolute bottom-0 left-1/3 w-6 h-6 bg-white rounded-full translate-y-3"></div>
                            </div>
                            <div className="w-8 h-8 bg-blue-300 bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center mr-4 flex-shrink-0 relative z-10">
                              <i className="fas fa-plus text-white text-sm"></i>
                            </div>
                            <div className="relative z-10">
                              <div className="font-medium">Organize Event</div>
                              <div className="text-xs text-blue-100 whitespace-nowrap">Create new events</div>
                            </div>
                          </button>
                        )}
                        <Link
                          to={userType === 'faculty' ? '/faculty/profile/edit' : '/client/profile/edit'}
                          className="flex items-center pl-4 pr-8 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                            <i className="fas fa-cog text-purple-600 text-sm"></i>
                          </div>
                          <div>
                            <div className="font-medium">Edit Profile</div>
                            <div className="text-xs text-gray-500 whitespace-nowrap">Update your information</div>
                          </div>
                        </Link>

                        {/* Team Invitations - Student Only */}
                        {userType === 'student' && (
                          <Link
                            to="/client/invitations"
                            className="flex items-center pl-4 pr-8 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                              <i className="fas fa-user-friends text-blue-600 text-sm"></i>
                            </div>
                            <div>
                              <div className="font-medium">Team Invitations</div>
                              <div className="text-xs text-gray-500 whitespace-nowrap">Join team requests</div>
                            </div>
                          </Link>
                        )}

                        <Link
                          to="/client/certificates"
                          className="flex items-center pl-4 pr-8 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                            <i className="fas fa-certificate text-emerald-600 text-sm"></i>
                          </div>
                          <div>
                            <div className="font-medium">Certificates</div>
                            <div className="text-xs text-gray-500 whitespace-nowrap">Download achievements</div>
                          </div>
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full pl-4 pr-8 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                            <i className="fas fa-sign-out-alt text-red-600 text-sm"></i>
                          </div>
                          <div>
                            <div className="font-medium text-left">Sign Out</div>
                            <div className="text-xs text-gray-500">End your session</div>
                          </div>
                        </button>                      
                        </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Not Logged In - Single Inviting Action Button */
                <div className="flex items-center">
                  <Link
                    to="/auth/login?tab=student"
                    className="inline-flex items-center justify-center px-4 lg:px-6 py-3 border border-green-600 text-green-600 bg-white hover:bg-green-600 hover:text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <i className="fas fa-sign-in-alt mr-2"></i>
                    <span className="hidden xl:inline">Join Campus Connect</span>
                    <span className="xl:hidden">Join</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile/Tablet Menu Button */}
            <div className="lg:hidden flex items-center">
              {isAuthenticated ? (
                <Link
                  to={userType === 'faculty' ? '/faculty/profile' : '/client/profile'}
                  className="flex items-center space-x-2 p-2 rounded-lg"
                >
                  <Avatar
                    src={avatarUrl}
                    size="sm"
                    name={userDisplayInfo.name}
                    className="flex-shrink-0"
                  />
                </Link>
              ) : (
                <Link
                  to="/auth/login?tab=student"
                  className="inline-flex items-center justify-center px-3 py-2 border border-green-600 text-green-600 bg-white hover:bg-green-600 hover:text-white rounded-lg text-sm font-semibold transition-all duration-200"
                >
                  <i className="fas fa-sign-in-alt mr-1"></i>
                  Join
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Tablet Navigation - Visible only on md/lg screens */}
      <div className="hidden md:block lg:hidden fixed top-24 left-0 right-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center space-x-2 py-3">
            <Link
              to={userType === 'faculty' ? '/faculty/events?filter=all' : '/client/events?filter=all'}
              className={`${isActivePathNoFilter(userType === 'faculty' ? '/faculty/events' : '/client/events')
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:text-blue-600'
                } px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2`}
            >
              <i className="fas fa-calendar text-sm"></i>
              <span className="text-sm font-semibold">All Events</span>
            </Link>

            <Link
              to={userType === 'faculty' ? '/faculty/events?filter=upcoming' : '/client/events?filter=upcoming'}
              className={`${isActivePath(userType === 'faculty' ? '/faculty/events' : '/client/events', 'upcoming')
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:text-blue-600'
                } px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2`}
            >
              <i className="fas fa-clock text-sm"></i>
              <span className="text-sm font-semibold">Upcoming</span>
            </Link>

            <Link
              to={userType === 'faculty' ? '/faculty/events?filter=ongoing' : '/client/events?filter=ongoing'}
              className={`${isActivePath(userType === 'faculty' ? '/faculty/events' : '/client/events', 'ongoing')
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-gray-100 text-green-600'
                } px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2`}
            >
              <div className="flex items-center space-x-2">
                <div className="relative flex items-center justify-center w-3 h-3">
                  {isActivePath(userType === 'faculty' ? '/faculty/events' : '/client/events', 'ongoing') ? (
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
        </div>
      </div>

      {/* Proper Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className={`grid h-18 ${isAuthenticated ? 'grid-cols-5' : 'grid-cols-3'}`}>
          {/* Events Button */}
          <Link
            to={userType === 'faculty' ? '/faculty/events?filter=all' : '/client/events?filter=all'}
            className={`flex flex-col items-center justify-center py-1 ${isActivePathNoFilter(userType === 'faculty' ? '/faculty/events' : '/client/events')
              ? 'text-blue-600'
              : 'text-gray-500'
              } transition-colors`}
          >
            <i className="fas fa-calendar text-base mb-0.5"></i>
            <span className="text-xs font-medium">Events</span>
          </Link>

          {/* Organize Event Button - Only show for faculty */}
          {isAuthenticated && userType === 'faculty' && (
            <button
              onClick={async () => {
                try {
                  const response = await organizerAPI.accessOrganizerPortal();

                  if (response.data.success) {
                    // Update auth context to reflect organizer admin role
                    await transitionToOrganizerAdmin(response.data);

                    // Navigate to organizer portal (use the redirect URL from response)
                    navigate(response.data.redirect_url || '/admin/events');
                  } else {
                    // Show specific error message
                    
                    alert(response.data.message || 'Unable to access organizer portal');
                  }
                } catch (error) {
                  
                  if (error.response?.data?.message) {
                    alert(error.response.data.message);
                  } else {
                    alert('Network error. Please try again.');
                  }
                }
              }}
              className="flex flex-col items-center justify-center py-1 text-blue-600 transition-colors"
            >
              <i className="fas fa-plus text-base mb-0.5"></i>
              <span className="text-xs font-medium">Organize</span>
            </button>
          )}

          {/* Teams Button - Only show when authenticated and student */}
          {isAuthenticated && userType === 'student' && (
            <Link
              to="/client/invitations"
              className={`flex flex-col items-center justify-center py-1 ${location.pathname === '/client/invitations'
                ? 'text-blue-600'
                : 'text-gray-500'
                } transition-colors`}
            >
              <i className="fas fa-user-friends text-base mb-0.5"></i>
              <span className="text-xs font-medium">Teams</span>
            </Link>
          )}

          {/* Center Logo - Simplified */}
          <Link to="/" className="flex flex-col items-center justify-center py-1">
            <div className="w-8 h-8 bg-transparent rounded-full flex items-center justify-center">
              <img
                src="/logo/ksv.png"
                alt="Logo"
                className="w-6 h-6 object-contain"
              />
            </div>
            <span className="text-xs font-bold text-slate-800 -mt-0.5">Campus</span>
          </Link>

          {/* Join Button - Show when not authenticated */}
          {!isAuthenticated && (
            <Link
              to="/auth/login?tab=student"
              className="flex flex-col items-center justify-center py-1 text-green-600 transition-colors"
            >
              <i className="fas fa-sign-in-alt text-base mb-0.5"></i>
              <span className="text-xs font-medium">Join</span>
            </Link>
          )}

          {/* Profile Button - Show when authenticated */}
          {isAuthenticated && (
            <Link
              to={userType === 'faculty' ? '/faculty/profile' : '/client/profile'}
              className={`flex flex-col items-center justify-center py-1 ${(userType === 'faculty' && location.pathname === '/faculty/profile') ||
                (userType === 'student' && location.pathname === '/client/profile')
                ? 'text-indigo-600'
                : 'text-gray-500'
                } transition-colors`}
            >
              <i className="fas fa-user text-base mb-0.5"></i>
              <span className="text-xs font-medium">Profile</span>
            </Link>
          )}

          {/* Logout Button - Show when authenticated */}
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="flex flex-col items-center justify-center py-1 text-gray-500 hover:text-red-500 transition-colors"
            >
              <i className="fas fa-sign-out-alt text-base mb-0.5"></i>
              <span className="text-xs font-medium">Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* Add bottom padding to prevent content being hidden behind bottom nav */}
      <div className="md:hidden h-14"></div>
    </>
  );
}

export default React.memo(ClientNavigation);
