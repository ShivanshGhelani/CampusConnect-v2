import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ClientLayout from '../../components/client/Layout';
import api from '../../api/axios';

function ProfilePage() {
  const { user } = useAuth();
  const [eventHistory, setEventHistory] = useState([]);
  const [profileData, setProfileData] = useState(null);
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

        // Fetch complete profile data
        const profileResponse = await api.get('/api/v1/client/profile/info');
        if (profileResponse.data.success) {
          setProfileData(profileResponse.data.profile || {});
        }

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
      organizing_department: item.category || 'N/A',
      start_datetime: item.event_date,
      venue: item.venue,
      status: item.status,
      category: item.category
    },
    registration: item.registration_data,
    participation_status: item.participation_status
  }));

  // Function to get user initials
  const getInitials = (userData) => {
    const currentUser = userData || profileData || user;
    if (currentUser?.full_name) {
      const names = currentUser.full_name.split(' ');
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    if (currentUser?.enrollment_no) {
      return currentUser.enrollment_no.substring(0, 2).toUpperCase();
    }
    return 'GU';
  };
  // Function to get academic year from semester
  const getAcademicYear = (semester) => {
    const currentUser = profileData || user;
    const semesterValue = semester || currentUser?.semester || currentUser?.current_semester || currentUser?.sem || currentUser?.semester_number;
    if (!semesterValue || semesterValue === 'N/A' || semesterValue === null || semesterValue === undefined) return 'N/A';
    const semInt = parseInt(semesterValue);
    if (isNaN(semInt) || semInt < 1 || semInt > 8) return 'N/A';
    return Math.floor((semInt - 1) / 2) + 1;
  };

  // Function to format semester display
  const formatSemester = (semester) => {
    const currentUser = profileData || user;
    const semesterValue = semester || currentUser?.semester || currentUser?.current_semester || currentUser?.sem || currentUser?.semester_number;
    if (!semesterValue || semesterValue === 'N/A' || semesterValue === null || semesterValue === undefined) return 'N/A';
    const semInt = parseInt(semesterValue);
    if (isNaN(semInt) || semInt < 1 || semInt > 8) return 'N/A';
    return semInt.toString();
  };

  // Function to get ordinal suffix (1st, 2nd, 3rd, 4th)
  const getSuffix = (num) => {
    if (num === 'N/A') return '';
    const number = parseInt(num);
    if (isNaN(number)) return '';
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const value = number % 100;
    return suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0];
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
  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      upcoming: {
        bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
        text: 'text-white',
        label: 'Upcoming',
        icon: '⏳'
      },
      ongoing: {
        bg: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
        text: 'text-white',
        label: 'Live',
        icon: '🔴'
      },
      completed: {
        bg: 'bg-gradient-to-r from-slate-500 to-slate-600',
        text: 'text-white',
        label: 'Completed',
        icon: '✅'
      }
    };

    const config = statusConfig[status] || statusConfig.upcoming;

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${config.bg} ${config.text}`}>
        <span>{config.icon}</span>
        {config.label}
      </span>
    );
  };  // Event card component
  const EventCard = ({ reg, showActions = true }) => (
    <div className="group bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-4 mb-4">
            {/* Event Icon */}
            <div className="w-12 h-12 bg-gradient-to-br from-seafoam-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 text-lg mb-2 truncate group-hover:text-seafoam-700 transition-colors duration-200">
                {reg.event.event_name}
              </h3>
              <p className="text-slate-600 text-sm mb-3 font-medium">
                {reg.event.organizing_department}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-2 bg-slate-50 rounded-full px-3 py-1.5">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">
                {reg.event.start_datetime ? new Date(reg.event.start_datetime).toLocaleDateString() : 'TBD'}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 rounded-full px-3 py-1.5">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium">{reg.event.venue}</span>
            </div>
          </div>
        </div>
        <StatusBadge status={reg.event.status} />
      </div>

      {showActions && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Link
            to={`/client/events/${reg.event_id}`}
            className="inline-flex items-center text-sm font-semibold text-seafoam-600 hover:text-seafoam-700 bg-seafoam-50 hover:bg-seafoam-100 px-4 py-2 rounded-xl transition-all duration-200 group"
          >
            View Details
            <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {reg.event.status === "upcoming" && reg.event.sub_status === "registration_open" && (
            <div className="flex items-center gap-2">
              {reg.registration?.registration_type === "team_leader" && (
                <>
                  <Link
                    to={`/client/events/${reg.event_id}/manage-team`}
                    className="text-xs px-3 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 font-semibold transition-colors duration-200"
                  >
                    Manage Team
                  </Link>
                  <button
                    onClick={() => confirmCancelRegistration(reg.event_id, reg.event.event_name)}
                    className="text-xs px-3 py-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 font-semibold transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </>
              )}

              {reg.registration?.registration_type === "individual" && (
                <button
                  onClick={() => confirmCancelRegistration(reg.event_id, reg.event.event_name)}
                  className="text-xs px-3 py-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 font-semibold transition-colors duration-200"
                >
                  Cancel
                </button>
              )}

              {reg.registration?.registration_type === "team_participant" && (
                <span className="text-xs px-3 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium">
                  Contact team leader
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center min-h-screen">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-2 border-seafoam-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-600 font-medium">Loading profile...</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!loading && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">            {/* Enhanced Profile Header */}
            <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl shadow-xl overflow-hidden mb-8">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-300 rounded-full -translate-y-48 translate-x-48"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full translate-y-32 -translate-x-32"></div>
              </div>              <div className="relative px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Profile Info with Avatar Card */}
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
                    <div className="flex flex-col items-center text-center text-white">
                      {/* Round Avatar */}
                      <div className="relative group flex-shrink-0 mb-4">
                        <div className="w-24 h-24 bg-white/90 rounded-full flex items-center justify-center shadow-lg border-2 border-white group-hover:scale-105 transition-transform duration-300">
                          <span className="text-3xl font-bold text-slate-800">
                            {getInitials()}
                          </span>
                        </div>
                        <div className="absolute bottom-0 right-2 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      {/* Name and Department */}
                      <div className='flex flex-col gap-1 items-center'>
                        <h1 className="text-xl lg:text-2xl font-bold mb-1">
                          {(profileData?.full_name || user?.full_name || user?.enrollment_no || 'Guest User')}
                        </h1>
                        <p className="text-blue-100 text-lg font-medium">
                          {(profileData?.department || user?.department || "Department not specified")}
                        </p>
                        <p className="text-blue-200 text-sm font-medium mt-1">
                          Member since {formatMemberSince(profileData?.profile_created_at || user?.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Event Stats Card */}
                  <div className="bg-white/90 rounded-2xl p-6 border border-white shadow-lg">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Event Statistics
                    </h3>
                    <div className="space-y-3">
                      {/* Row 1: Events, Complete */}
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <span className="text-sm text-slate-600 block">Events</span>
                          <span className="text-xl font-bold text-blue-600">
                            {dashboardStats.total_registrations || 0}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-sm text-slate-600 block">Complete</span>
                          <span className="text-xl font-bold text-emerald-600">
                            {registrations.filter(reg => reg.event?.status === 'completed').length}
                          </span>
                        </div>
                      </div>
                      
                      {/* Row 2: Upcoming, Live */}
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <span className="text-sm text-slate-600 block">Upcoming</span>
                          <span className="text-xl font-bold text-orange-600">
                            {registrations.filter(reg => reg.event?.status === 'upcoming').length}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-sm text-slate-600 block">Live</span>
                          <span className="text-xl font-bold text-purple-600">
                            {registrations.filter(reg => reg.event?.status === 'ongoing').length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>                  {/* User Details & Actions Card */}
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
                    <div className="space-y-6">
                      {/* Student Details */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                          Student Details
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-blue-100 text-sm">Enrollment Number</p>
                              <p className="text-white font-medium">
                                {profileData?.enrollment_no || user?.enrollment_no || 'Not provided'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-blue-100 text-sm">Current Semester</p>
                              <p className="text-white font-medium">
                                {formatSemester(profileData?.semester || user?.semester) !== 'N/A'
                                  ? `${formatSemester(profileData?.semester || user?.semester)}${getSuffix(formatSemester(profileData?.semester || user?.semester))} Semester`
                                  : 'Not specified'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-blue-100 text-sm">Email</p>
                              <p className="text-white font-medium truncate">
                                {profileData?.email || user?.email || 'Not provided'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Quick Actions
                        </h3>                        <div className="space-y-3">
                          <Link
                            to="/client/profile/edit"
                            className="flex items-center gap-3 w-full p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 group"
                          >
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-white font-medium">Edit Profile</p>
                              <p className="text-blue-100 text-sm">Update your information</p>
                            </div>
                            <svg className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>

                          <Link
                            to="/client/certificates"
                            className="flex items-center gap-3 w-full p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 group"
                          >
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-white font-medium">View Certificates</p>
                              <p className="text-blue-100 text-sm">Check your achievements</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                {dashboardStats.certificates_earned || 0}
                              </span>
                              <svg className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </Link>

                          <button
                            onClick={() => window.location.href = `mailto:${profileData?.email || user?.email}`}
                            className="flex items-center gap-3 w-full p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 group"
                            disabled={!profileData?.email && !user?.email}
                          >
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-white font-medium text-left">Contact Support</p>
                              <p className="text-blue-100 text-sm text-left">Get help or report issues</p>
                            </div>
                            <svg className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>

            {/* Enhanced Events Section */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
              {/* Section Header */}
              <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-seafoam-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">My Events</h2>
                  </div>
                  {registrations.length > 3 ? (
                    <button
                      onClick={openEventsModal}
                      className="inline-flex items-center gap-2 text-seafoam-600 hover:text-seafoam-700 text-sm font-semibold bg-seafoam-50 hover:bg-seafoam-100 px-4 py-2 rounded-xl transition-all duration-200"
                    >
                      View All ({registrations.length})
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <Link
                      to="/client/events"
                      className="inline-flex items-center gap-2 text-seafoam-600 hover:text-seafoam-700 text-sm font-semibold bg-seafoam-50 hover:bg-seafoam-100 px-4 py-2 rounded-xl transition-all duration-200"
                    >
                      Browse Events
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </div>
              </div>

              {/* Events List */}
              <div className="p-8">
                {registrations.length > 0 ? (
                  <div className="grid gap-6">
                    {registrations.slice(0, 3).map((reg, index) => (
                      <EventCard key={index} reg={reg} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center">
                      <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">No Events Yet</h3>
                    <p className="text-slate-600 mb-8 max-w-md mx-auto text-lg">
                      Ready to dive into campus life? Discover amazing events and start building your journey!
                    </p>
                    <Link
                      to="/client/events"
                      className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-seafoam-600 to-blue-600 text-white rounded-xl hover:from-seafoam-700 hover:to-blue-700 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl group"
                    >
                      <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>                      Explore Events                    </Link>                  </div>
                )}              </div>            </div>          </div>        </div>
        )}
      </div>      {/* All Events Modal */}
      {showEventsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl max-h-[90vh] overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-seafoam-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    All My Events ({registrations.length})
                  </h3>
                </div>
                <button
                  onClick={closeEventsModal}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all duration-200 group"
                >
                  <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>            {/* Modal Content */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)] bg-gray-50">
              <div className="grid gap-6">
                {registrations.map((reg, index) => (
                  <EventCard key={index} reg={reg} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Registration Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-200">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Cancel Registration</h3>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Are you sure you want to cancel your registration for <strong className="text-slate-900">"{currentEventName}"</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={closeCancelModal}
                  className="flex-1 px-6 py-3 text-slate-600 hover:text-slate-800 transition-colors font-semibold rounded-xl hover:bg-slate-50 border border-slate-200"
                >
                  Keep Registration
                </button>
                <button
                  onClick={() => {
                    // Handle cancel registration logic here
                    closeCancelModal();
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                >
                  Yes, Cancel
                </button>              </div>
            </div>          </div>
        </div>
      )}
    </ClientLayout>
  );
}

export default ProfilePage;