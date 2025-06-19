import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ClientLayout from '../../components/client/Layout';
import api from '../../api/axios';

function ProfilePage() {
  const { user, logout } = useAuth();
  const [eventHistory, setEventHistory] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    total_registrations: 0,
    attendance_marked: 0,
    feedback_submitted: 0,
    certificates_earned: 0
  });
  const [loading, setLoading] = useState(true);
  const [showEventsModal, setShowEventsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [currentEventId, setCurrentEventId] = useState(null);
  const [currentEventName, setCurrentEventName] = useState('');

  // Fetch event history and dashboard stats on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch event history
        const historyResponse = await api.get('/api/v1/client/profile/event-history');
        if (historyResponse.data.success) {
          setEventHistory(historyResponse.data.event_history || []);
        }
        
        // Fetch dashboard stats
        const statsResponse = await api.get('/api/v1/client/profile/dashboard-stats');
        if (statsResponse.data.success) {
          setDashboardStats(statsResponse.data.stats || {});
        }
        
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  // Convert event history to match the existing format for compatibility
  const registrations = eventHistory.map(item => ({
    event_id: item.event_id,
    event: {
      event_name: item.event_name,
      organizing_department: item.category || 'N/A', // Use category as organizing department fallback
      start_datetime: item.event_date,
      venue: item.venue,
      status: item.status,
      category: item.category
    },
    registration: item.registration_data,
    participation_status: item.participation_status
  }));

  // Function to get user initials matching the backend template exactly
  const getInitials = (user) => {
    if (user?.full_name) {
      const names = user.full_name.split(' ');
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    if (user?.enrollment_no) {
      return user.enrollment_no.substring(0, 2).toUpperCase();
    }
    return 'GU';
  };

  // Function to get academic year from semester
  const getAcademicYear = (semester) => {
    if (!semester) return 'N/A';
    const semInt = parseInt(semester);
    if (semInt >= 1 && semInt <= 8) {
      return Math.floor((semInt - 1) / 2) + 1;
    }
    return 'N/A';
  };

  // Function to format member since date
  const formatMemberSince = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Modal functions
  const openEventsModal = () => setShowEventsModal(true);
  const closeEventsModal = () => setShowEventsModal(false);
  
  const confirmCancelRegistration = (eventId, eventName) => {
    setCurrentEventId(eventId);
    setCurrentEventName(eventName);
    setShowCancelModal(true);
  };
  
  const closeCancelModal = () => {
    setShowCancelModal(false);
    setCurrentEventId(null);
    setCurrentEventName('');
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ClientLayout>      {/* Top Banner */}
      <div className="bg-gradient-to-r from-seafoam-800 to-sky-900 text-white py-2">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <i className="fas fa-bullhorn text-white text-sm mr-2"></i>
          Stay updated with the latest campus events and activities!
          <Link to="/client/events?filter=upcoming" className="underline hover:text-seafoam-200 ml-2">
            Check upcoming events
          </Link>
        </div>
      </div>

      <div className="min-h-screen bg-gradient-to-br from-seafoam-50 to-sky-100">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center space-x-3 text-seafoam-600">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-seafoam-600"></div>
              <span className="text-lg font-medium">Loading your profile...</span>
            </div>
          </div>
        )}

        {/* Main Content - Only show when not loading */}
        {!loading && (
          <>            {/* Header */}
            <div className="bg-gradient-to-r from-seafoam-50 to-sky-50 shadow-lg border-b border-seafoam-200">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    {/* Profile with User Initials */}
                    <div className="relative">
                      <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-white">
                          {getInitials(user)}
                        </span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                        <i className="fas fa-check text-white text-xs"></i>
                      </div>
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-cool-gray-900">
                        {user?.full_name || user?.enrollment_no || 'Guest User'}
                      </h1>
                      <p className="text-cool-gray-600">Student Dashboard</p>
                    </div>
                  </div>

                  {/* Action Buttons with Text Labels */}
                  <div className="flex items-center space-x-4">
                    <Link
                      to="/client/events"
                      className="group flex items-center space-x-3 bg-white/90 hover:bg-white border border-blue-200 hover:border-blue-300 rounded-lg px-4 py-3 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <div className="w-10 h-10 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center">
                        <i className="fas fa-calendar-alt text-blue-600"></i>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-blue-700">Events</div>
                        <div className="text-xs text-blue-500">Browse & Register</div>
                      </div>
                    </Link>

                    <Link
                      to="/client/profile/edit"
                      className="group flex items-center space-x-3 bg-white/90 hover:bg-white border border-purple-200 hover:border-purple-300 rounded-lg px-4 py-3 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <div className="w-10 h-10 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-center">
                        <i className="fas fa-cog text-purple-600"></i>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-purple-700">Settings</div>
                        <div className="text-xs text-purple-500">Edit Profile</div>
                      </div>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="group flex items-center space-x-3 bg-white/90 hover:bg-white border border-red-200 hover:border-red-300 rounded-lg px-4 py-3 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <div className="w-10 h-10 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
                        <i className="fas fa-sign-out-alt text-red-600"></i>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-red-700">Logout</div>
                        <div className="text-xs text-red-500">Sign Out</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="group bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 border border-blue-200 rounded-xl flex items-center justify-center">
                        <i className="fas fa-chart-bar text-blue-600 text-xl"></i>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Events</p>
                        <p className="text-2xl font-bold text-gray-900">{dashboardStats.total_registrations || 0}</p>
                      </div>
                    </div>
                    <div className="text-blue-500 font-bold text-lg opacity-30">
                      <i className="fas fa-arrow-up"></i>
                    </div>
                  </div>
                </div>

                <div className="group bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-100 border border-green-200 rounded-xl flex items-center justify-center">
                        <i className="fas fa-check-circle text-green-600 text-xl"></i>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Completed</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {registrations.filter(reg => reg.event?.status === 'completed').length}
                        </p>
                      </div>
                    </div>
                    <div className="text-green-500 font-bold text-lg opacity-30">
                      <i className="fas fa-check"></i>
                    </div>
                  </div>
                </div>

                <div className="group bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-orange-100 border border-orange-200 rounded-xl flex items-center justify-center">
                        <i className="fas fa-clock text-orange-600 text-xl"></i>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Upcoming</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {registrations.filter(reg => reg.event?.status === 'upcoming').length}
                        </p>
                      </div>
                    </div>
                    <div className="text-orange-500 font-bold text-lg opacity-30">
                      <i className="fas fa-calendar-day"></i>
                    </div>
                  </div>
                </div>

                <div className="group bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-purple-100 border border-purple-200 rounded-xl flex items-center justify-center">
                        <i className="fas fa-user text-purple-600 text-xl"></i>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Member Since</p>
                        <p className="text-lg font-bold text-gray-900">
                          {formatMemberSince(user?.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-purple-500 font-bold text-lg opacity-30">
                      <i className="fas fa-graduation-cap"></i>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Personal Information */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 bg-indigo-100 border border-indigo-200 rounded-lg flex items-center justify-center">
                        <i className="fas fa-user text-indigo-600"></i>
                      </div>
                      <h3 className="text-lg font-semibold text-cool-gray-900">Personal Information</h3>
                    </div>

                    <div className="space-y-5">
                      <div className="flex items-start space-x-3 p-3.5 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <i className="fas fa-graduation-cap text-blue-600 text-sm"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</label>
                          <p className="text-gray-900 font-medium truncate">{user?.full_name || "Not provided"}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 p-3.5 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <i className="fas fa-address-book text-green-600 text-lg"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</label>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <i className="fas fa-envelope text-gray-400 text-xs"></i>
                              <p className="text-gray-900 font-medium text-sm truncate">{user?.email || "Not provided"}</p>
                            </div>
                            {user?.mobile_no && (
                              <div className="flex items-center space-x-2">
                                <i className="fas fa-mobile-alt text-gray-400 text-xs"></i>
                                <p className="text-gray-900 font-medium text-sm">{user.mobile_no}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 p-3.5 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <i className="fas fa-building text-orange-600 text-sm"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</label>
                          <p className="text-gray-900 font-medium">{user?.department || "Not specified"}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 p-3.5 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <i className="fas fa-book text-red-600 text-sm"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Academic Info</label>
                          <div className="flex items-center space-x-4">
                            <div>
                              <span className="text-xs text-gray-500 font-medium">Semester:</span>
                              <span className="text-gray-900 font-semibold ml-1">{user?.semester || "N/A"}</span>
                            </div>
                            <div className="w-px h-4 bg-gray-300"></div>
                            <div>
                              <span className="text-xs text-gray-500 font-medium">Year:</span>
                              <span className="text-gray-900 font-semibold ml-1">{getAcademicYear(user?.semester)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>                {/* Events List */}
                <div className="lg:col-span-2">
                  <div className="bg-[#f9f9f9] rounded-lg shadow-lg border border-seafoam-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-cool-gray-900">My Events</h3>
                      {registrations.length > 3 ? (
                        <button
                          onClick={openEventsModal}
                          className="text-seafoam-600 hover:text-seafoam-700 text-sm font-medium transition-colors"
                        >
                          View All ({registrations.length}) →
                        </button>
                      ) : (
                        <Link
                          to="/client/events"
                          className="text-seafoam-600 hover:text-seafoam-700 text-sm font-medium transition-colors"
                        >
                          Browse Events →
                        </Link>
                      )}
                    </div>

                    {registrations.length > 0 ? (
                      <div className="space-y-4">                        {registrations.slice(0, 3).map((reg, index) => (
                          <div
                            key={index}
                            className="border border-seafoam-200 rounded-lg p-4 bg-gradient-to-r from-seafoam-25 to-sky-25 hover:from-seafoam-50 hover:to-sky-50 hover:shadow-md transition-all duration-300"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-cool-gray-900">{reg.event.event_name}</h4>
                                <p className="text-sm text-cool-gray-600 mt-1">{reg.event.organizing_department}</p>
                                <div className="flex items-center text-sm text-cool-gray-500 mt-2">
                                  <i className="fas fa-calendar-alt text-seafoam-500 mr-2"></i>
                                  {reg.event.start_datetime ? new Date(reg.event.start_datetime).toLocaleDateString() : 'TBD'}
                                  <i className="fas fa-map-marker-alt text-seafoam-500 ml-4 mr-2"></i>
                                  {reg.event.venue}
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                {reg.event.status === "upcoming" && (
                                  <span className="px-3 py-1 text-xs font-medium bg-sky-100 text-sky-800 rounded-full">Upcoming</span>
                                )}
                                {reg.event.status === "ongoing" && (
                                  <span className="px-3 py-1 text-xs font-medium bg-mint-100 text-mint-800 rounded-full">Live Now</span>
                                )}
                                {reg.event.status === "completed" && (
                                  <span className="px-3 py-1 text-xs font-medium bg-cool-gray-100 text-cool-gray-800 rounded-full">Completed</span>
                                )}
                                <div className="flex flex-col space-y-2 mt-2">
                                  <Link
                                    to={`/client/events/${reg.event_id}`}
                                    className="inline-flex items-center px-3 py-1 bg-seafoam-100 text-seafoam-700 rounded-md hover:bg-seafoam-200 transition-colors font-medium text-sm"
                                  >
                                    <i className="fas fa-eye mr-1"></i>
                                    View Details
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (                      <div className="text-center py-12">
                        <div className="text-6xl text-seafoam-300 mb-4">
                          <i className="fas fa-clipboard-list"></i>
                        </div>
                        <h4 className="text-lg font-medium text-cool-gray-900 mb-2">No Events Yet</h4>
                        <p className="text-cool-gray-600 mb-6">
                          Start exploring campus events and register for activities you're interested in.
                        </p>
                        <Link
                          to="/client/events"
                          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-seafoam-500 to-sky-600 text-white rounded-lg hover:from-seafoam-600 hover:to-sky-700 transition-all duration-300 shadow-md hover:shadow-lg"
                        >
                          <i className="fas fa-compass mr-2"></i>
                          Explore Events
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* All Events Modal */}
      {showEventsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg max-w-4xl mx-4 shadow-xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">All My Events ({registrations.length})</h3>
              <button
                onClick={closeEventsModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {registrations.length > 0 && (
                <div className="space-y-4">                  {registrations.map((reg, index) => (
                    <div
                      key={index}
                      className="border border-seafoam-200 rounded-lg p-4 bg-gradient-to-r from-seafoam-25 to-sky-25 hover:from-seafoam-50 hover:to-sky-50 hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-cool-gray-900">{reg.event.event_name}</h4>
                          <p className="text-sm text-cool-gray-600 mt-1">{reg.event.organizing_department}</p>
                          <div className="flex items-center text-sm text-cool-gray-500 mt-2">
                            <i className="fas fa-calendar-alt text-seafoam-500 mr-2"></i>
                            {reg.event.start_datetime ? new Date(reg.event.start_datetime).toLocaleDateString() : 'TBD'}
                            <i className="fas fa-map-marker-alt text-seafoam-500 ml-4 mr-2"></i>
                            {reg.event.venue}
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          {reg.event.status === "upcoming" && (
                            <span className="px-3 py-1 text-xs font-medium bg-sky-100 text-sky-800 rounded-full">Upcoming</span>
                          )}
                          {reg.event.status === "ongoing" && (
                            <span className="px-3 py-1 text-xs font-medium bg-mint-100 text-mint-800 rounded-full">Live Now</span>
                          )}
                          {reg.event.status === "completed" && (
                            <span className="px-3 py-1 text-xs font-medium bg-cool-gray-100 text-cool-gray-800 rounded-full">Completed</span>
                          )}
                          <div className="flex flex-col space-y-2 mt-2">
                            <Link
                              to={`/client/events/${reg.event_id}`}
                              className="inline-flex items-center px-3 py-1 bg-seafoam-100 text-seafoam-700 rounded-md hover:bg-seafoam-200 transition-colors font-medium text-sm"
                            >
                              <i className="fas fa-eye mr-1"></i>
                              View Details
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={closeEventsModal}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Registration Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <i className="fas fa-exclamation-triangle text-yellow-500 text-2xl mr-3"></i>
              <h3 className="text-lg font-semibold text-gray-900">Cancel Registration</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel your registration for "{currentEventName}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeCancelModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Keep Registration
              </button>
              <button
                onClick={() => {
                  // Handle cancel registration logic here
                  closeCancelModal();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Yes, Cancel Registration
              </button>
            </div>
          </div>
        </div>
      )}
    </ClientLayout>
  );
}

export default ProfilePage;
