import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api/axios';

function AdminLayout({ children, pageTitle = "Admin Dashboard" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State management
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    totalEvents: 0,
    liveEvents: 0,
    upcomingEvents: 0,
    totalStudents: 0,
    allEventsCount: 0,
    ongoingEventsCount: 0,
    upcomingEventsCount: 0,
    completedEventsCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const response = await adminAPI.getDashboardStats();
        
        if (response.data.success) {
          const data = response.data.data;
          setStats({
            totalEvents: data.totalEvents || data.total_events_count || 0,
            liveEvents: data.liveEvents || data.ongoing_events || 0,
            upcomingEvents: data.upcomingEvents || data.upcoming_events || 0,
            totalStudents: data.totalStudents || data.student_count || 0,
            allEventsCount: data.all_events_count || data.total_events_count || 0,
            ongoingEventsCount: data.ongoing_events_count || data.ongoing_events || 0,
            upcomingEventsCount: data.upcoming_events_count || data.upcoming_events || 0,
            completedEventsCount: data.completed_events_count || data.completed_events || 0
          });
          setError('');
        } else {
          throw new Error(response.data.message || 'Failed to fetch stats');
        }
      } catch (error) {
        console.error('Error fetching admin layout stats:', error);
        setError('Failed to load dashboard stats');
        // Set fallback values on error
        setStats({
          totalEvents: 0,
          liveEvents: 0,
          upcomingEvents: 0,
          totalStudents: 0,
          allEventsCount: 0,
          ongoingEventsCount: 0,
          upcomingEventsCount: 0,
          completedEventsCount: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if user is authenticated admin
    if (user && user.is_admin) {
      fetchStats();
      
      // Set up auto-refresh every 30 seconds
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Helper functions
  const isActive = (path) => location.pathname === path;
  
  const getUserInitials = (user) => {
    if (!user?.full_name) return 'A';
    const names = user.full_name.split(' ');
    return names.length > 1 
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : names[0][0].toUpperCase();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric'
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Calculate notification count based on role
  const getNotificationCount = () => {
    if (!user) return 0;
    
    if (user.role === 'super_admin') {
      return (stats.upcomingEventsCount || 0) + (stats.totalStudents > 0 ? 1 : 0);
    } else if (user.role === 'executive_admin') {
      return stats.upcomingEventsCount || 0;
    } else if (user.role === 'event_admin') {
      return stats.totalEvents || 0;
    }
    return 0;
  };
  // Determine if sidebar should be hidden (for event admins)
  const showSidebar = user && user.role !== 'event_admin';
  
  return (
    <div className={`h-screen w-screen bg-slate-100 ${showSidebar ? 'grid grid-cols-[280px_1fr] grid-rows-[70px_1fr]' : 'grid grid-cols-1 grid-rows-[70px_1fr]'}`} 
         style={{ gridTemplateAreas: showSidebar ? '"sidebar header" "sidebar main"' : '"header" "main"' }}>
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[999] lg:hidden"
          onClick={closeMobileMenu}
        />
      )}
      
      {/* Professional Sidebar */}
      {showSidebar && (
        <aside 
          className={`bg-white flex flex-col shadow-2xl transition-all duration-300 lg:relative fixed inset-y-0 left-0 z-[1000] w-[280px] ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
          style={{ gridArea: 'sidebar' }}
        >          {/* Logo Section */}
          <div className="p-4 bg-blue bg-opacity-10 backdrop-blur-lg border-b border-blue-500 border-opacity-10">
            <div className="flex items-center gap-3">
                <img
                  src="/logo/ksv.png"
                  alt="KSV Logo"
                  className="h-10 w-10 object-contain"
                />
                <span className="text-xl italic font-bold">
                  <span className="text-slate-800">Campus</span>
                  <span className="bg-gradient-to-r from-teal-500 to-purple-500 bg-clip-text text-transparent">Connect</span>
                </span>
            </div>
          </div>          
          {/* Navigation Container */}
          <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-white scrollbar-thumb-opacity-20 scrollbar-track-transparent">
            
            {/* Overview Section (Super Admin Only) */}
            {user?.role === 'super_admin' && (
              <div className="mb-6">
                <div className="text-xs font-medium text-black text-opacity-60 uppercase tracking-wider mb-2 px-6">
                  Overview
                </div>
                <div className="mx-3">
                  <Link
                    to="/admin/dashboard"
                    className={`group flex items-center gap-3 px-4 py-3 text-black text-opacity-80 hover:text-white hover:bg-blue-400 hover:bg-opacity-10 rounded-lg transition-all duration-300 hover:translate-x-1 ${
                      isActive('/admin/dashboard') ? 'bg-blue-500 bg-opacity-20 text-white shadow-lg backdrop-blur-sm' : ''
                    }`}
                    onClick={closeMobileMenu}
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="fas fa-chart-line text-base"></i>
                    </div>
                    <span className="font-medium">Dashboard</span>
                  </Link>
                </div>
              </div>
            )}            
            {/* Student Management Section (Content Admin+ Only) */}
            {user?.role && ['super_admin', 'executive_admin', 'content_admin'].includes(user.role) && (
              <div className="mb-6">
                <div className="text-xs font-medium text-black text-opacity-60 uppercase tracking-wider mb-2 px-6">
                  Management
                </div>
                <div className="mx-3">
                  <Link
                    to="/admin/students"
                    className={`group flex items-center gap-3 px-4 py-3 text-black text-opacity-80 hover:text-white hover:bg-blue-400 hover:bg-opacity-10 rounded-lg transition-all duration-300 hover:translate-x-1 ${
                      isActive('/admin/students') ? 'bg-blue-500 bg-opacity-20 text-white shadow-lg backdrop-blur-sm' : ''
                    }`}
                    onClick={closeMobileMenu}
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="fas fa-user-graduate text-base"></i>
                    </div>
                    <span className="font-medium flex-1">Students</span>                    <span className="bg-cyan-300 bg-opacity-80 text-black text-xs font-semibold px-2 py-1 rounded-full min-w-6 text-center backdrop-blur-sm border border-cyan-200 border-opacity-50 transition-all duration-300 group-hover:scale-105">
                      {isLoading ? '...' : (stats.totalStudents || 0)}
                    </span>
                  </Link>
                </div>
              </div>
            )}            
            {/* Event Management Section (Hidden for Event Admins) */}
            {user?.role !== 'event_admin' && (
              <div className="mb-6">
                <div className="text-xs font-medium text-black text-opacity-60 uppercase tracking-wider mb-2 px-6">
                  Events
                </div>
                <div className="mx-3">
                  <Link
                    to="/admin/events"
                    className={`group flex items-center gap-3 px-4 py-3 text-black text-opacity-80 hover:text-white hover:bg-blue-400 hover:bg-opacity-10 rounded-lg transition-all duration-300 hover:translate-x-1 ${
                      isActive('/admin/events') ? 'bg-blue-500 bg-opacity-20 text-white shadow-lg backdrop-blur-sm' : ''
                    }`}
                    onClick={closeMobileMenu}
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="fas fa-calendar-alt text-base"></i>
                    </div>
                    <span className="font-medium flex-1">Events</span>
                    <span className="bg-blue-400 bg-opacity-30 text-black text-xs font-semibold px-2 py-1 rounded-full min-w-6 text-center backdrop-blur-sm border border-blue-300 border-opacity-50 transition-all duration-300 group-hover:scale-105">
                      {isLoading ? '...' : (stats.totalEvents || 0)}
                    </span>
                  </Link>
                </div>
              </div>
            )}            
            {/* Assets Management Section (Content Admin+ Only) */}
            {user?.role && ['super_admin', 'executive_admin', 'content_admin'].includes(user.role) && (
              <div className="mb-6">
                <div className="text-xs font-medium text-black text-opacity-60 uppercase tracking-wider mb-2 px-6">
                  Assets
                </div>
                <div className="mx-3">
                  <Link
                    to="/admin/assets"
                    className={`group flex items-center gap-3 px-4 py-3 text-black text-opacity-80 hover:text-white hover:bg-blue-400 hover:bg-opacity-10 rounded-lg transition-all duration-300 hover:translate-x-1 ${
                      isActive('/admin/assets') ? 'bg-blue-500 bg-opacity-20 text-white shadow-lg backdrop-blur-sm' : ''
                    }`}
                    onClick={closeMobileMenu}
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="fas fa-folder text-base"></i>
                    </div>
                    <span className="font-medium">Assets</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Simple Event Access for Event Admins */}
            {user?.role === 'event_admin' && (
              <div className="mb-6">
                <div className="text-xs font-medium text-black text-opacity-60 uppercase tracking-wider mb-2 px-6">
                  My Events
                </div>
                <div className="mx-3">
                  <Link
                    to="/admin/events"
                    className={`group flex items-center gap-3 px-4 py-3 text-black text-opacity-80 hover:text-white hover:bg-blue-400 hover:bg-opacity-10 rounded-lg transition-all duration-300 hover:translate-x-1 ${
                      isActive('/admin/events') ? 'bg-blue-500 bg-opacity-20 text-white shadow-lg backdrop-blur-sm' : ''
                    }`}
                    onClick={closeMobileMenu}
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="fas fa-calendar-check text-base"></i>
                    </div>
                    <span className="font-medium">Assigned Events</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Admin Management Section (Super Admins Only) */}
            {user?.role === 'super_admin' && (
              <>
                <div className="mb-6">
                  <div className="text-xs font-medium text-black text-opacity-60 uppercase tracking-wider mb-2 px-6">
                    Administration
                  </div>
                  <div className="mx-3">
                    <Link
                      to="/admin/manage-admins"
                      className={`group flex items-center gap-3 px-4 py-3 text-black text-opacity-80 hover:text-white hover:bg-blue-400 hover:bg-opacity-10 rounded-lg transition-all duration-300 hover:translate-x-1 ${
                        isActive('/admin/manage-admins') ? 'bg-blue-500 bg-opacity-20 text-white shadow-lg backdrop-blur-sm' : ''
                      }`}
                      onClick={closeMobileMenu}
                    >
                      <div className="w-5 h-5 flex items-center justify-center">
                        <i className="fas fa-users-cog text-base"></i>
                      </div>
                      <span className="font-medium">Admin Management</span>
                    </Link>
                  </div>
                </div>
                <div className="mb-6">
                  <div className="mx-3">
                    <Link
                      to="/admin/events/create"
                      className={`group flex items-center gap-3 px-4 py-3 text-black text-opacity-80 hover:text-white hover:bg-blue-400 hover:bg-opacity-10 rounded-lg transition-all duration-300 hover:translate-x-1 ${
                        isActive('/admin/events/create') ? 'bg-blue-500 bg-opacity-20 text-white shadow-lg backdrop-blur-sm' : ''
                      }`}
                      onClick={closeMobileMenu}
                    >
                      <div className="w-5 h-5 flex items-center justify-center">
                        <i className="fas fa-plus text-base"></i>
                      </div>
                      <span className="font-medium">Create Event</span>
                    </Link>
                  </div>
                </div>
              </>
            )}

            {/* System Section */}
            <div className="mb-6">
              <div className="text-xs font-medium text-black text-opacity-60 uppercase tracking-wider mb-2 px-6">
                System
              </div>
              <div className="mx-3">
                <Link
                  to="/admin/settings"
                  className={`group flex items-center gap-3 px-4 py-3 text-black text-opacity-80 hover:text-white hover:bg-blue-400 hover:bg-opacity-10 rounded-lg transition-all duration-300 hover:translate-x-1 ${
                    isActive('/admin/settings') ? 'bg-blue-500 bg-opacity-20 text-white shadow-lg backdrop-blur-sm' : ''
                  }`}
                  onClick={closeMobileMenu}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className="fas fa-cog text-base"></i>
                  </div>
                  <span className="font-medium">Settings</span>
                </Link>
              </div>
            </div>
          </div>
        </aside>
      )}      
      {/* Professional Header */}
      <header 
        className="bg-white h-18 flex items-center justify-between px-6 shadow-lg drop-shadow-9xl shadow-blue-50 border-b border-blue-200 relative z-50"
        style={{ gridArea: 'header' }}
      >
        <div className="flex items-center gap-6">
          {showSidebar && (
            <button
              className="md:hidden bg-blue-500 bg-opacity-10 border-none text-blue-600 text-lg cursor-pointer p-3 rounded-lg transition-all duration-300 hover:bg-opacity-20 hover:scale-105"
              onClick={toggleMobileMenu}
            >
              <i className="fas fa-bars"></i>
            </button>
          )}
          
          <h1 className="text-2xl font-bold text-black">
            {pageTitle}
          </h1>
          
          {/* Real-time Statistics Dashboard Widget */}
          {user && (
            <div className="hidden lg:flex items-center gap-6 ml-8">
              {(user.role === 'super_admin' || user.role === 'executive_admin') && (
                <>
                  {/* Total Events */}
                  <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-300 hover:bg-gray-100 hover:-translate-y-0.5 hover:shadow-md min-w-20">
                    <div className="text-lg font-bold text-blue-600 leading-none">
                      {isLoading ? <i className="fas fa-spinner fa-spin"></i> : (stats.allEventsCount || 0)}
                    </div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-0.5">
                      Events
                    </div>
                  </div>
                  
                  {/* Live Events */}
                  <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-300 hover:bg-gray-100 hover:-translate-y-0.5 hover:shadow-md min-w-20">
                    <div className="text-lg font-bold text-green-500 leading-none animate-pulse">
                      {isLoading ? <i className="fas fa-spinner fa-spin"></i> : (stats.ongoingEventsCount || 0)}
                    </div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-0.5">
                      Live
                    </div>
                  </div>
                  
                  {/* Upcoming Events */}
                  <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-300 hover:bg-gray-100 hover:-translate-y-0.5 hover:shadow-md min-w-20">
                    <div className="text-lg font-bold text-yellow-500 leading-none">
                      {isLoading ? <i className="fas fa-spinner fa-spin"></i> : (stats.upcomingEventsCount || 0)}
                    </div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-0.5">
                      Upcoming
                    </div>
                  </div>
                  
                  {/* Students Count */}
                  <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-300 hover:bg-gray-100 hover:-translate-y-0.5 hover:shadow-md min-w-20">
                    <div className="text-lg font-bold text-blue-600 leading-none">
                      {isLoading ? <i className="fas fa-spinner fa-spin"></i> : (stats.totalStudents || 0)}
                    </div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-0.5">
                      Students
                    </div>
                  </div>
                </>
              )}
              
              {user.role === 'content_admin' && (
                <>
                  {/* Content Admin focused stats */}
                  <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-300 hover:bg-gray-100 hover:-translate-y-0.5 hover:shadow-md min-w-20">
                    <div className="text-lg font-bold text-blue-600 leading-none">
                      {isLoading ? <i className="fas fa-spinner fa-spin"></i> : (stats.totalStudents || 0)}
                    </div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-0.5">
                      Students
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-300 hover:bg-gray-100 hover:-translate-y-0.5 hover:shadow-md min-w-20">
                    <div className="text-lg font-bold text-blue-600 leading-none">
                      {isLoading ? <i className="fas fa-spinner fa-spin"></i> : (stats.totalEvents || 0)}
                    </div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-0.5">
                      Events
                    </div>
                  </div>
                </>
              )}
              
              {user.role === 'event_admin' && (
                <>
                  {/* Event Admin focused stats */}
                  <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-300 hover:bg-gray-100 hover:-translate-y-0.5 hover:shadow-md min-w-20">
                    <div className="text-lg font-bold text-blue-600 leading-none">3</div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-0.5">
                      My Events
                    </div>
                  </div>
                </>
              )}
              
              {/* Error indicator */}
              {error && (
                <div className="flex flex-col items-center px-4 py-2 bg-red-50 rounded-lg border border-red-200 transition-all duration-300 hover:bg-red-100 hover:-translate-y-0.5 hover:shadow-md min-w-20" title={`Error: ${error}`}>
                  <div className="text-lg font-bold text-red-500 leading-none">
                    <i className="fas fa-exclamation-triangle"></i>
                  </div>
                  <div className="text-xs text-red-500 font-medium uppercase tracking-wide mt-0.5">
                    Error
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Time Widget */}
          <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 mr-4">
            <div className="text-sm font-semibold text-gray-800 leading-none">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              {formatDate(currentTime)}
            </div>
          </div>
          
          {/* User Info Widget */}
          {user && (
            <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 mr-4">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                {getUserInitials(user)}
              </div>
              <div className="flex flex-col">
                <div className="text-sm font-semibold text-gray-800 leading-none">
                  {user.full_name || 'Admin User'}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {user.role?.replace('_', ' ') || 'admin'}
                </div>
              </div>
            </div>
          )}
          
          {/* Notification Bell */}
          <div className="relative mr-2">
            <Link
              to="/admin/notifications"
              className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gray-50 text-gray-500 hover:bg-blue-500 hover:text-white hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 border border-gray-200"
              title="Notifications"
            >
              <i className="fas fa-bell"></i>
              {getNotificationCount() > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-lg min-w-5 text-center border-2 border-white animate-bounce">
                  {getNotificationCount() < 100 ? getNotificationCount() : '99+'}
                </span>
              )}
            </Link>
          </div>
          
          {/* Logout Action */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-50 text-gray-500 hover:bg-red-500 hover:text-white hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 border border-gray-200"
            title="Logout"
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </header>      
      {/* Main Content */}
      <main 
        className="overflow-y-auto p-8 bg-gray-50"
        style={{ gridArea: 'main' }}
      >
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
