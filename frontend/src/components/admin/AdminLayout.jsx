import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api/admin';
import NotificationBell from './notifications/NotificationBell';
import NotificationPanel from './notifications/NotificationPanel';

function AdminLayout({ children, pageTitle = "Admin Dashboard" }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // State management
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [showNotificationPanel, setShowNotificationPanel] = useState(false);
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

    // Close profile dropdown when clicking outside (but not on hover leave)
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isProfileDropdownOpen && !event.target.closest('.profile-dropdown-container')) {
                setIsProfileDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProfileDropdownOpen]);
    // Fetch real stats from backend
    useEffect(() => {
        const fetchStats = async () => {
            try {
                setIsLoading(true);
                console.log('Fetching dashboard stats...');
                const response = await adminAPI.getDashboardStats();
                console.log('Dashboard stats response:', response.data);

                if (response.data) {
                    // Handle the analytics response structure from /api/v1/admin/analytics/dashboard
                    const data = response.data.analytics?.overview || response.data.data || response.data;
                    console.log('Dashboard stats data:', data);

                    // Extract stats with the correct field names from backend
                    const newStats = {
                        totalEvents: parseInt(data.total_events || data.totalEvents || 0),
                        liveEvents: parseInt(data.ongoing_events || data.live_events || data.liveEvents || 0),
                        upcomingEvents: parseInt(data.upcoming_events || data.upcomingEvents || 0),
                        totalStudents: parseInt(data.total_students || data.totalStudents || 0),
                        allEventsCount: parseInt(data.total_events || data.totalEvents || 0),
                        ongoingEventsCount: parseInt(data.ongoing_events || data.live_events || 0),
                        upcomingEventsCount: parseInt(data.upcoming_events || data.upcomingEvents || 0),
                        completedEventsCount: parseInt(data.completed_events || data.completedEvents || 0)
                    };

                    console.log('Setting stats:', newStats);
                    setStats(newStats);
                    setError('');
                } else {
                    throw new Error('No data received from server');
                }
            } catch (error) {
                console.error('Error fetching admin layout stats:', error);
                setError('Failed to load dashboard stats');

                // Try to fetch individual counts as fallback
                try {
                    const [eventsResponse, studentsResponse] = await Promise.all([
                        adminAPI.getEvents({}),
                        adminAPI.getStudents({})
                    ]);

                    const eventsCount = eventsResponse.data?.events?.length || eventsResponse.data?.length || 0;
                    const studentsCount = studentsResponse.data?.students?.length || studentsResponse.data?.length || 0;

                    console.log('Fallback stats - Events:', eventsCount, 'Students:', studentsCount);

                    setStats({
                        totalEvents: eventsCount,
                        liveEvents: 0,
                        upcomingEvents: 0,
                        totalStudents: studentsCount,
                        allEventsCount: eventsCount,
                        ongoingEventsCount: 0,
                        upcomingEventsCount: 0,
                        completedEventsCount: 0
                    });
                } catch (fallbackError) {
                    console.error('Fallback stats fetch failed:', fallbackError);
                    // Set absolute fallback values
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
                }
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
        if (!user?.fullname) return 'A';
        const names = user.fullname.split(' ');
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

    const formatFullDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/auth/login?tab=admin');
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
        } else if (user.role === 'organizer_admin') {
            return stats.totalEvents || 0;
        }
        return 0;
    };

    // Determine if sidebar should be hidden (only executive admins have no sidebar)
    const showSidebar = user && user.role !== 'executive_admin';

    return (
        <div className={`h-screen w-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 ${showSidebar ? 'grid grid-cols-[250px_1fr] grid-rows-1' : 'grid grid-cols-1 grid-rows-1'}`}
            style={{ gridTemplateAreas: showSidebar ? '"sidebar main"' : '"main"' }}>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] lg:hidden transition-all duration-300"
                    onClick={closeMobileMenu}
                />
            )}

            {/* Professional Enterprise Sidebar */}
            {showSidebar && (
                <aside
                    className={`bg-white/95 backdrop-blur-xl flex flex-col shadow-2xl shadow-slate-900/10 border-r border-slate-200/50 transition-all duration-300 lg:relative fixed inset-y-0 left-0 z-[1000] w-[250px] ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                        }`}
                    style={{ gridArea: 'sidebar' }}
                >
                    {/* Premium Logo Section */}
                    <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20"></div>
                        <div className="relative flex items-center justify-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
                                <img
                                    src="/logo/ksv.png"
                                    alt="KSV Logo"
                                    className="h-8 w-8 object-contain"
                                />
                            </div>
                            <div className="flex flex-col text-center">
                                <span className="text-lg font-bold text-white tracking-tight">
                                    Campus<span className="text-blue-400">Connect</span>
                                </span>
                                <span className="text-xs text-left text-slate-300 font-medium uppercase tracking-widest">
                                    {user?.role === 'organizer_admin' ? 'Organizer Portal' : 'Admin Portal'}
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Navigation Container */}
                    <div className="flex-1 overflow-y-auto py-3 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">

                        {/* Clock Section */}
                        <div className="mb-3">
                            <div className="mx-4 p-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl border border-blue-200/30">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-slate-800 font-mono mb-1">
                                        {formatTime(currentTime)}
                                    </div>
                                    <div className="text-xs font-medium text-slate-600 mb-1">
                                        {formatFullDate(currentTime)}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Dashboard */}
                        {user?.role === 'super_admin' && (
                            <div className="mb-1">
                                <div className="mx-2 space-y-1">
                                    <Link
                                        to="/admin/dashboard"
                                        className={`group flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:text-white-700 hover:bg-blue-50/80 rounded-xl transition-all duration-200 hover:scale-[1.02] ${isActive('/admin/dashboard') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25' : ''
                                            }`}
                                        onClick={closeMobileMenu}
                                    >
                                        <div className="w-5 h-5 flex items-center justify-center">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold text-sm">Dashboard</span>
                                        {isActive('/admin/dashboard') && (
                                            <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                                        )}
                                    </Link>
                                </div>
                            </div>
                        )}



                        {/* Events */}
                        {user?.role && ['super_admin', 'executive_admin', 'organizer_admin'].includes(user.role) && (
                            <div className="mb-1">
                                <div className="mx-2 space-y-1">
                                    <Link
                                        to="/admin/events"
                                        className={`group flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:text-white-700 hover:bg-blue-50/80 rounded-xl transition-all duration-200 hover:scale-[1.02] ${isActive('/admin/events') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25' : ''
                                            }`}
                                        onClick={closeMobileMenu}
                                    >
                                        <div className="w-5 h-5 flex items-center justify-center">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold text-sm flex-1">Events</span>
                                        {isActive('/admin/events') && (
                                            <div className="ml-2 w-2 h-2 bg-white rounded-full"></div>
                                        )}
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* Create Event */}
                        {user?.role && ['super_admin', 'organizer_admin'].includes(user.role) && (
                            <div className="mb-1">
                                <div className="mx-2 space-y-1">
                                    <Link
                                        to="/admin/create-event"
                                        className="group flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/80 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                                        onClick={closeMobileMenu}
                                    >
                                        <div className="w-5 h-5 flex items-center justify-center">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold text-sm">Create Event</span>
                                    </Link>
                                </div>
                            </div>
                        )}
                        {/* Students */}
                        {user?.role && ['super_admin', 'executive_admin', 'organizer_admin'].includes(user.role) && (
                            <div className="mb-1">
                                <div className="mx-2 space-y-1">
                                    <Link
                                        to="/admin/students"
                                        className={`group flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:text-white-700 hover:bg-blue-50/80 rounded-xl transition-all duration-200 hover:scale-[1.02] ${isActive('/admin/students') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25' : ''
                                            }`}
                                        onClick={closeMobileMenu}
                                    >
                                        <div className="w-5 h-5 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                            </svg>

                                        </div>
                                        <span className="font-semibold text-sm flex-1">Students</span>
                                        {isActive('/admin/students') && (
                                            <div className="ml-2 w-2 h-2 bg-white rounded-full"></div>
                                        )}
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* Faculty */}
                        {user?.role && ['super_admin', 'executive_admin'].includes(user.role) && (
                            <div className="mb-1">
                                <div className="mx-2 space-y-1">
                                    <Link
                                        to="/admin/faculty"
                                        className={`group flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:text-white-700 hover:bg-blue-50/80 rounded-xl transition-all duration-200 hover:scale-[1.02] ${isActive('/admin/faculty') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25' : ''
                                            }`}
                                        onClick={closeMobileMenu}
                                    >
                                        <div className="w-5 h-5 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443a55.381 55.381 0 0 1 5.25 2.882V15" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold text-sm flex-1">Faculty</span>
                                        {isActive('/admin/faculty') && (
                                            <div className="ml-2 w-2 h-2 bg-white rounded-full"></div>
                                        )}
                                    </Link>
                                </div>
                            </div>
                        )}


                        {/* Venues */}
                        {user?.role && ['super_admin', 'executive_admin', 'organizer_admin'].includes(user.role) && (
                            <div className="mb-1">
                                <div className="mx-2 space-y-1">
                                    <Link
                                        to="/admin/venues"
                                        className={`group flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:text-teal-700 hover:bg-teal-50/80 rounded-xl transition-all duration-200 hover:scale-[1.02] ${isActive('/admin/venues') ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg hover:text-white shadow-teal-500/25' : ''
                                            }`}
                                        onClick={closeMobileMenu}
                                    >
                                        <div className="w-5 h-5 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold text-sm">Venues</span>
                                        {isActive('/admin/venues') && (
                                            <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                                        )}
                                    </Link>
                                </div>
                            </div>
                        )}
                        {/* Assets */}
                        {user?.role && ['super_admin', 'executive_admin', 'organizer_admin'].includes(user.role) && (
                            <div className="mb-1">
                                <div className="mx-2 space-y-1">
                                    <Link
                                        to="/admin/assets"
                                        className={`group flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:text-amber-700 hover:bg-amber-50/80 rounded-xl transition-all duration-200 hover:scale-[1.02] ${isActive('/admin/assets') ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:text-white shadow-lg shadow-amber-500/25' : ''
                                            }`}
                                        onClick={closeMobileMenu}
                                    >
                                        <div className="w-5 h-5 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold text-sm">Assets</span>
                                        {isActive('/admin/assets') && (
                                            <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                                        )}
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* Manage Certificates */}
                        {user?.role && ['super_admin', 'executive_admin', 'organizer_admin'].includes(user.role) && (
                            <div className="mb-1">
                                <div className="mx-2 space-y-1">
                                    <Link
                                        to="/admin/certificates"
                                        className={`group flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:text-purple-700 hover:bg-purple-50/80 rounded-xl transition-all duration-200 hover:scale-[1.02] ${isActive('/admin/certificates') ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25 hover:text-white' : ''
                                            }`}
                                        onClick={closeMobileMenu}
                                    >
                                        <div className="w-5 h-5 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold text-sm">Certificates</span>
                                        {isActive('/admin/certificates') && (
                                            <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                                        )}
                                    </Link>
                                </div>
                            </div>
                        )}
                        {/* Admin Management */}
                        {user?.role === 'super_admin' && (
                            <div className="mb-2">
                                <div className="mx-2 space-y-1">
                                    <Link
                                        to="/admin/manage-admins"
                                        className="group flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:text-violet-700 hover:bg-violet-50/80 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                                        onClick={closeMobileMenu}
                                    >
                                        <div className="w-5 h-5 flex items-center justify-center">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold text-sm">Manage Admins</span>
                                    </Link>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* User Profile Section */}
                    <div
                        className="p-3 border-t border-slate-200/50 bg-slate-50/50 relative profile-dropdown-container"
                        onMouseEnter={() => setIsProfileDropdownOpen(true)}
                        onMouseLeave={() => setIsProfileDropdownOpen(false)}
                    >
                        <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-white/70 border border-slate-200/50">
                            {/* Profile Avatar with Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                    className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                                >
                                    {getUserInitials(user)}
                                </button>

                                {/* Profile Dropdown Menu */}
                                {isProfileDropdownOpen && (
                                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200/50 z-[999] py-2 transform translate-y-[-8px]">
                                        <div className="px-4 py-2 border-b border-slate-100">
                                            <div className="text-sm font-semibold text-slate-900 truncate">
                                                {user?.fullname || 'Admin User'}
                                            </div>
                                            <div className="text-xs text-slate-500 capitalize">
                                                {user?.role?.replace('_', ' ') || 'admin'}
                                            </div>
                                        </div>
                                        <Link
                                            to={user?.role === 'organizer_admin' ? "/faculty/profile" : "/admin/settings"}
                                            onClick={() => {
                                                setIsProfileDropdownOpen(false);
                                                closeMobileMenu();
                                            }}
                                            className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors duration-200"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                {user?.role === 'organizer_admin' ? (
                                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                ) : (
                                                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                                )}
                                            </svg>
                                            <span className="text-sm font-medium">{user?.role === 'organizer_admin' ? 'Profile' : 'Settings'}</span>
                                        </Link>
                                        <button
                                            onClick={() => {
                                                setIsProfileDropdownOpen(false);
                                                handleLogout();
                                            }}
                                            className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors duration-200 w-full text-left"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-sm font-medium">Logout</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-slate-900 truncate">
                                    {user?.fullname || 'Admin User'}
                                </div>
                                <div className="text-xs text-slate-500 capitalize">
                                    {user?.role?.replace('_', ' ') || 'admin'}
                                </div>
                            </div>

                            {/* Notifications with Enhanced Styling */}
                            <div className="relative">
                                <NotificationBell
                                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 rounded-xl transition-all duration-200 hover:scale-105 shadow-sm"
                                    onTogglePanel={() => setShowNotificationPanel(!showNotificationPanel)}
                                />
                            </div>
                        </div>
                    </div>
                </aside>
            )}
            {/* Main Content */}
            <main
                className="overflow-y-auto bg-gradient-to-br from-slate-50/50 to-blue-50/30" style={{ gridArea: 'main' }}
            >
                {/* Simple Header for Executive Admin (no sidebar) */}
                {!showSidebar && (
                    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <img
                                src="/logo/ksv.png"
                                alt="KSV Logo"
                                className="h-8 w-8 object-contain"
                            />
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">
                                    Campus<span className="text-blue-600">Connect</span>
                                </h1>
                                <p className="text-sm text-gray-500">
                                    {user?.role === 'organizer_admin' ? 'Organizer Portal' :
                                        user?.role === 'executive_admin' ? 'Executive Admin Panel' : 'Admin Panel'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* User Info */}
                            <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">
                                    {user?.fullname || 'Executive Admin'}
                                </div>
                                <div className="text-xs text-gray-500 capitalize">
                                    {user?.role?.replace('_', ' ') || 'executive admin'}
                                </div>
                            </div>

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                            >
                                <i className="fas fa-sign-out-alt mr-2"></i>
                                Logout
                            </button>
                        </div>
                    </header>
                )}

                {/* Content Area */}
                <div className="flex h-full">
                    {/* Main Content */}
                    <div className={`flex-1 ${showSidebar ? "p-6" : "p-0"}`}>
                        {children}
                    </div>
                </div>

                {/* Gmail-style Notification Modal */}
                <NotificationPanel
                    isOpen={showNotificationPanel}
                    onClose={() => setShowNotificationPanel(false)}
                />
            </main>
        </div>
    );
};

export default AdminLayout;
