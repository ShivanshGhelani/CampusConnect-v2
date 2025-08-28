import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { useAvatar } from '../../../../hooks/useAvatar';
import ProfileEventCard from '../../../../components/client/ProfileEventCard';
import AvatarUpload from '../../../../components/client/AvatarUpload';
import QRCodeDisplay from '../../../../components/client/QRCodeDisplay';
import api from '../../../../api/base';

function FacultyProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Memoize user object to prevent unnecessary re-renders
  // Only re-memoize if core user properties actually change
  const memoizedUser = useMemo(() => {
    if (!user) return null;
    return {
      employee_id: user.employee_id,
      user_type: user.user_type,
      full_name: user.full_name,
      email: user.email
    };
  }, [user?.employee_id, user?.user_type, user?.full_name, user?.email]);
  
  const { avatarUrl, updateAvatar, forceRefreshAvatar, isLoading: avatarLoading } = useAvatar(memoizedUser, 'faculty');
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
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [selectedEventDetail, setSelectedEventDetail] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showTeamDetailModal, setShowTeamDetailModal] = useState(false);
  const [selectedTeamDetail, setSelectedTeamDetail] = useState(null);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [selectedQRData, setSelectedQRData] = useState(null);
  const [currentEventId, setCurrentEventId] = useState(null);
  const [currentEventName, setCurrentEventName] = useState('');
  const [cancellingRegistration, setCancellingRegistration] = useState(false);

  // Fetch event history and dashboard stats on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch complete faculty profile data
        const profileResponse = await api.get('/api/v1/client/profile/faculty/info');
        if (profileResponse.data.success) {
          const profile = profileResponse.data.profile || {};
          setProfileData(profile);
        }

        // Fetch faculty event history
        try {
          const historyResponse = await api.get('/api/v1/client/profile/faculty/event-history');
          if (historyResponse.data.success) {
            setEventHistory(historyResponse.data.event_history || []);
          }
        } catch (error) {
          console.log('Faculty event history not available yet');
          setEventHistory([]);
        }

        // Fetch faculty dashboard stats
        try {
          const statsResponse = await api.get('/api/v1/client/profile/faculty/dashboard-stats');
          if (statsResponse.data.success) {
            setDashboardStats(statsResponse.data.stats || {});
          }
        } catch (error) {
          // If faculty dashboard stats endpoint is not available, use default values
          console.log('Faculty dashboard stats not available, using defaults');
          setDashboardStats({
            total_registrations: 0,
            attendance_marked: 0,
            feedback_submitted: 0,
            certificates_earned: 0
          });
        }

      } catch (error) {
        console.error('Error fetching faculty profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.user_type === 'faculty') {
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
      sub_status: item.sub_status,
      category: item.category
    },
    // FIXED: Ensure registration data has the proper structure for ProfileEventCard
    registration: {
      registration_id: item.registration_data?.registration_id || 'N/A',
      registration_type: item.registration_data?.registration_type || 'individual',
      registration_date: item.registration_data?.registration_date,
      status: item.registration_data?.status || 'confirmed',
      // Faculty-specific fields
      employee_id: user?.employee_id,
      registrar_id: item.registration_data?.registration_id, // For QR code compatibility
      team_name: item.registration_data?.team_name || null,
      team_registration_id: item.registration_data?.team_registration_id || null
    },
    participation_status: item.participation_status
  }));

  // Sort events by registration time, latest first
  const sortedRegistrations = [...registrations].sort((a, b) => {
    const getRegistrationTime = (reg) => {
      const regDate = reg.registration?.registration_date;
      if (!regDate) return new Date(0); // Default to epoch for missing dates

      try {
        return new Date(regDate);
      } catch {
        return new Date(0);
      }
    };

    const timeA = getRegistrationTime(a);
    const timeB = getRegistrationTime(b);
    return timeB - timeA; // Newest first
  });

  // Function to format experience display
  const formatExperience = (years) => {
    if (!years) return 'Not specified';
    return `${years} year${years !== 1 ? 's' : ''} experience`;
  };

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
    if (currentUser?.employee_id) {
      return currentUser.employee_id.substring(0, 2).toUpperCase();
    }
    return 'FA';
  };

  // Function to format member since date
  const formatMemberSince = (dateStr) => {
    if (!dateStr) return 'Not available';
    try {
      const date = new Date(dateStr);
      const options = { year: 'numeric', month: 'long' };
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      return 'Not available';
    }
  };

  // Modal functions
  const openEventsModal = () => setShowEventsModal(true);
  const closeEventsModal = () => setShowEventsModal(false);

  const openEventDetailModal = (eventDetail) => {
    setSelectedEventDetail(eventDetail);
    setShowEventDetailModal(true);
  };

  const closeEventDetailModal = () => {
    setShowEventDetailModal(false);
    setSelectedEventDetail(null);
  };

  const openTeamDetailModal = async (teamDetail) => {
    try {
      // Fetch team details if team_registration_id is available
      if (teamDetail.teamId) {
        const response = await api.get(`/api/v1/client/profile/team-details/${teamDetail.eventId}/${teamDetail.teamId}`);
        if (response.data.success) {
          setSelectedTeamDetail({
            ...teamDetail,
            teamMembers: response.data.data.team_members || [],
            teamName: response.data.data.team_name || teamDetail.teamName || 'Unknown Team'
          });
        } else {
          setSelectedTeamDetail({
            ...teamDetail,
            teamMembers: [],
            error: 'Unable to load team details'
          });
        }
      } else {
        setSelectedTeamDetail({
          ...teamDetail,
          teamMembers: [],
          error: 'Team information not available'
        });
      }
      setShowTeamDetailModal(true);
    } catch (error) {
      console.error('Error fetching team details:', error);
      setSelectedTeamDetail({
        ...teamDetail,
        teamMembers: [],
        error: 'Error loading team details'
      });
      setShowTeamDetailModal(true);
    }
  };

  const closeTeamDetailModal = () => {
    setShowTeamDetailModal(false);
    setSelectedTeamDetail(null);
  };

  const openQRCodeModal = (qrData) => {
    setSelectedQRData(qrData);
    setShowQRCodeModal(true);
  };

  const closeQRCodeModal = () => {
    setShowQRCodeModal(false);
    setSelectedQRData(null);
  };

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

  const handleCancelRegistration = async () => {
    if (!currentEventId) return;

    try {
      setCancellingRegistration(true);
      const response = await api.post('/api/v1/client/events/cancel-registration', {
        event_id: currentEventId
      });

      if (response.data.success) {
        // Refresh event history
        const historyResponse = await api.get('/api/v1/client/profile/faculty/event-history');
        if (historyResponse.data.success) {
          setEventHistory(historyResponse.data.event_history || []);
        }

        // Refresh dashboard stats
        const statsResponse = await api.get('/api/v1/client/profile/faculty/dashboard-stats');
        if (statsResponse.data.success) {
          setDashboardStats(statsResponse.data.stats || {});
        }

        closeCancelModal();
      } else {
        alert(response.data.message || 'Failed to cancel registration');
      }
    } catch (error) {
      console.error('Error cancelling registration:', error);
      alert('Error cancelling registration. Please try again.');
    } finally {
      setCancellingRegistration(false);
    }
  };

  const handleAvatarUpdate = (newAvatarUrl) => {
    updateAvatar(newAvatarUrl);
  };

  if (!user || user.user_type !== 'faculty') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Access denied. Faculty login required.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Loading State */}
      {loading && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-seafoam-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-slate-600 font-medium">Loading profile...</span>
          </div>
        </div>
      )}
      {/* Main Content */}
      {!loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-9">
          {/* Main 2-Column Layout */}
          <div className="flex gap-8">
            {/* Left Column */}
            <div className="space-y-3 sticky top-8 h-fit w-140 flex-shrink-0">
              {/* Profile Card with Faculty Info & Quick Actions */}
              <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
                {/* Profile Header Section */}
                <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-8 border-b border-slate-200 overflow-hidden">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-300 rounded-full -translate-y-20 translate-x-20"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400 rounded-full translate-y-16 -translate-x-16"></div>
                  </div>
                  <div className="relative flex items-center gap-6">
                    {/* Avatar */}
                    <AvatarUpload
                      currentAvatar={avatarUrl}
                      onAvatarUpdate={handleAvatarUpdate}
                      className="flex-shrink-0"
                    />
                    {/* Name and Basic Info */}
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold text-white mb-1">
                        {(profileData?.full_name || user?.full_name || 'Faculty User')}
                      </h1>
                      <p className="text-blue-100 text-sm font-medium mb-1">
                        {profileData?.employee_id || user?.employee_id || 'Employee ID not provided'}
                      </p>
                      <p className="text-blue-200 text-sm mb-4">
                        Member since {formatMemberSince(profileData?.profile_created_at || user?.created_at)}
                      </p>
                      {/* Quick Actions */}
                      <div className="flex gap-3">
                        <Link
                          to="/faculty/profile/edit"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl border border-blue-500 hover:border-blue-600 transition-all duration-200 text-sm font-semibold"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit Profile
                        </Link>
                        <Link
                          to="/client/certificates"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl border border-emerald-500 hover:border-emerald-600 transition-all duration-200 text-sm font-semibold"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                          My Certificates
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Information Grid Section */}
                <div className="p-8">
                  <div className="grid grid-cols-1 gap-3">
                    {/* Professional Info Card */}
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-500 text-sm mb-1">Department & Position</p>
                        <p className="text-sm font-semibold text-slate-900 mb-0.5">
                          {profileData?.designation || 'Faculty'}
                        </p>
                        <p className="text-xs text-slate-600">
                          {profileData?.department || user?.department || 'Department not specified'}
                        </p>
                      </div>
                    </div>

                    {/* Contact Details Card */}
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-500 text-sm mb-1">Contact Details</p>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3 h-3 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs font-medium text-slate-900 truncate">
                              {profileData?.email || user?.email || 'Email not provided'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3 h-3 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="text-xs font-medium text-slate-900">
                              {profileData?.contact_no || user?.contact_no || 'Phone not provided'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Experience & Qualification Card */}
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-500 text-sm mb-1">Qualification & Experience</p>
                        <p className="text-sm font-semibold text-slate-900 mb-0.5">
                          {profileData?.qualification || 'Qualification not specified'}
                        </p>
                        <p className="text-xs text-slate-600">
                          {formatExperience(profileData?.experience_years)}
                        </p>
                      </div>
                    </div>

                    {/* Date of Joining & Specialization Card */}
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-500 text-sm mb-1">Date of Joining & Specialization</p>
                        <p className="text-sm font-semibold text-slate-900 mb-0.5">
                          {profileData?.date_of_joining ? new Date(profileData.date_of_joining).toLocaleDateString() : 'Not provided'}
                        </p>
                        <p className="text-xs text-slate-600">
                          {profileData?.specialization || 'Specialization not specified'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Event Statistics Section Heading */}
                  <div className="mt-8 mb-4">
                    <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Event Statistics
                    </h4>
                  </div>

                  {/* Full-width edge-to-edge separator */}
                  <div className="-mx-8 border-t border-slate-200 mb-6"></div>

                  {/* Event Statistics Block */}
                  <div className="flex">
                    <div className="flex-1 text-center">
                      <span className="text-xs text-slate-600 block mb-1">Total</span>
                      <span className="text-sm font-bold text-blue-600">
                        {dashboardStats.total_registrations || 0}
                      </span>
                    </div>
                    <div className="w-px bg-slate-300 mx-2"></div>
                    <div className="flex-1 text-center">
                      <span className="text-xs text-slate-600 block mb-1">Attended</span>
                      <span className="text-sm font-bold text-emerald-600">
                        {dashboardStats.attendance_marked || 0}
                      </span>
                    </div>
                    <div className="w-px bg-slate-300 mx-2"></div>
                    <div className="flex-1 text-center">
                      <span className="text-xs text-slate-600 block mb-1">Feedback</span>
                      <span className="text-sm font-bold text-orange-600">
                        {dashboardStats.feedback_submitted || 0}
                      </span>
                    </div>
                    <div className="w-px bg-slate-300 mx-2"></div>
                    <div className="flex-1 text-center">
                      <span className="text-xs text-slate-600 block mb-1">Certificates</span>
                      <span className="text-sm font-bold text-purple-600">
                        {dashboardStats.certificates_earned || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex-1 space-y-8">
              {/* My Events Section */}
              <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
                {/* Section Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h2 className="text-xl font-bold text-slate-900">My Events</h2>
                    </div>
                    {registrations.length > 3 ? (
                      <button
                        onClick={() => setShowEventsModal(true)}
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-all duration-200"
                      >
                        View All ({registrations.length})
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ) : (
                      <Link
                        to="/client/events"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-all duration-200"
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
                <div className="p-6">
                  {sortedRegistrations.length > 0 ? (
                    <div className="space-y-4">
                      {sortedRegistrations.slice(0, 3).map((reg, index) => (
                        <ProfileEventCard
                          key={index}
                          reg={reg}
                          onCancelRegistration={confirmCancelRegistration}
                          onViewDetails={openEventDetailModal}
                          onViewTeam={openTeamDetailModal}
                          onViewQRCode={openQRCodeModal}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">No Events Yet</h3>
                      <p className="text-slate-600 mb-6 max-w-sm mx-auto">
                        Ready to participate in campus events? Discover amazing events and start building your journey!
                      </p>
                      <Link
                        to="/client/events"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-700 text-white rounded-xl hover:bg-blue-500 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl group"
                      >
                        <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Explore Events
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Events Modal */}
      {showEventsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl max-h-[90vh] overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">My Events</h2>
                    <p className="text-slate-600">All your event participations in one place</p>
                  </div>
                </div>
                <button
                  onClick={closeEventsModal}
                  className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center transition-colors duration-200"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Modal Content */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)] bg-gray-50">
              <div className="grid gap-6">
                {sortedRegistrations.map((reg, index) => (
                  <ProfileEventCard
                    key={index}
                    reg={reg}
                    onCancelRegistration={confirmCancelRegistration}
                    onViewDetails={openEventDetailModal}
                    onViewTeam={openTeamDetailModal}
                    onViewQRCode={openQRCodeModal}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )
      }

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
                  disabled={cancellingRegistration}
                  className="flex-1 px-6 py-3 text-slate-600 hover:text-slate-800 transition-colors font-semibold rounded-xl hover:bg-slate-50 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Keep Registration
                </button>
                <button
                  onClick={handleCancelRegistration}
                  disabled={cancellingRegistration}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancellingRegistration ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )
      }

      {/* QR Code Modal */}
      {showQRCodeModal && selectedQRData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-600 rounded-xl flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Event QR Code</h3>
                </div>
                <button
                  onClick={closeQRCodeModal}
                  className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors duration-200"
                >
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>


            
            {/* Modal Content */}
            <div className="p-6">
              <QRCodeDisplay
                registrationData={selectedQRData?.registration}
                eventData={selectedQRData?.event}
                size="large"
                showDownload={true}
                showDetails={true}
                style="blue"
              />
            </div>
          </div>
        </div>
      )
      }
      {/* Event Detail Modal */}
      {showEventDetailModal && selectedEventDetail && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 truncate">
                      {selectedEventDetail.event.event_name}
                    </h3>
                    <span className="text-sm text-slate-500 font-medium">Event Details & Status</span>
                  </div>
                </div>
                <button
                  onClick={closeEventDetailModal}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all duration-200 group"
                >
                  <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-6">
                {/* Event Information */}
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl p-6">
                  <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Event Information
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-medium text-slate-600">Date & Time</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedEventDetail.event.start_datetime ?
                          new Date(selectedEventDetail.event.start_datetime).toLocaleString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'TBD'
                        }
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm font-medium text-slate-600">Venue</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedEventDetail.event.venue && selectedEventDetail.event.venue !== 'N/A' ? selectedEventDetail.event.venue : 'TBD'}
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span className="text-sm font-medium text-slate-600">Category</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedEventDetail.event.category || 'General'}
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm font-medium text-slate-600">Registration ID</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 font-mono">
                        {selectedEventDetail.registration?.registrar_id || selectedEventDetail.registration?.registration_id || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Participation Status */}
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6">
                  <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Your Participation Status
                  </h4>

                  <div className="grid grid-cols-1 gap-4">
                    {/* Attendance Status */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          <span className="text-sm font-semibold text-slate-900">Attendance</span>
                        </div>
                        {selectedEventDetail.participation_status?.attended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Marked
                          </span>
                        ) : selectedEventDetail.event.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-lg text-xs font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Not Marked
                          </span>
                        ) : selectedEventDetail.event.status === 'ongoing' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-lg text-xs font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Available Soon
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Pending
                          </span>
                        )}
                      </div>

                      {selectedEventDetail.participation_status?.attended && (
                        <div className="space-y-3">
                          {/* Attendance Details */}
                          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-sm font-semibold text-emerald-800">Attendance Confirmed</span>
                            </div>
                            <div className="text-xs text-emerald-700 space-y-1">
                              <p><strong>Attendance ID:</strong> <span className="font-mono bg-white px-2 py-0.5 rounded border">{selectedEventDetail.participation_status.attendance_id}</span></p>
                              {selectedEventDetail.participation_status.attendance_date && (
                                <p><strong>Marked At:</strong> {new Date(selectedEventDetail.participation_status.attendance_date).toLocaleString('en-US', {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</p>
                              )}
                            </div>
                          </div>

                          {/* Attendance Type Indicators */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="text-xs font-medium text-blue-800">Physical Attendance</span>
                              <svg className="w-3 h-3 text-emerald-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                              <span className="text-xs font-medium text-purple-800">Virtual Attendance</span>
                              <svg className="w-3 h-3 text-emerald-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedEventDetail.event.status === 'ongoing' && !selectedEventDetail.participation_status?.attended && (
                        <div className="space-y-3 mt-3">
                          <p className="text-xs text-slate-600">
                            Attendance marking is now available! Choose your attendance method:
                          </p>

                          {/* Attendance Options */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="text-xs font-medium text-blue-800">Physical Attendance</span>
                              <svg className="w-3 h-3 text-orange-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                              <span className="text-xs font-medium text-purple-800">Virtual Attendance</span>
                              <svg className="w-3 h-3 text-orange-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>

                          <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                            <p><strong>Physical:</strong> Be present at the venue and use QR code or location-based marking.</p>
                            <p><strong>Virtual:</strong> Join online session and mark attendance through the platform.</p>
                          </div>
                        </div>
                      )}

                      {selectedEventDetail.event.status === 'upcoming' && (
                        <div className="mt-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200 opacity-75">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="text-xs font-medium text-blue-800">Physical Attendance</span>
                              <svg className="w-3 h-3 text-slate-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200 opacity-75">
                              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                              <span className="text-xs font-medium text-purple-800">Virtual Attendance</span>
                              <svg className="w-3 h-3 text-slate-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 mt-2">
                            Both physical and virtual attendance options will be available during the event.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Feedback Status */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span className="text-sm font-semibold text-slate-900">Feedback</span>
                        </div>
                        {selectedEventDetail.participation_status?.feedback_submitted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Submitted
                          </span>
                        ) : selectedEventDetail.event.status === 'completed' || selectedEventDetail.event.status === 'ongoing' ? (
                          <Link
                            to={`/client/events/${selectedEventDetail.event_id}/feedback`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors"
                            onClick={closeEventDetailModal}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Submit Now
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Not Available
                          </span>
                        )}
                      </div>
                      {selectedEventDetail.participation_status?.feedback_submitted && (
                        <div className="text-xs text-slate-600">
                          <p><strong>Feedback ID:</strong> {selectedEventDetail.participation_status.feedback_id}</p>
                          {selectedEventDetail.participation_status.feedback_date && (
                            <p><strong>Submitted At:</strong> {new Date(selectedEventDetail.participation_status.feedback_date).toLocaleString()}</p>
                          )}
                        </div>
                      )}
                      {(selectedEventDetail.event.status === 'completed' || selectedEventDetail.event.status === 'ongoing') && !selectedEventDetail.participation_status?.feedback_submitted && (
                        <p className="text-xs text-slate-600 mt-2">
                          Your feedback helps us improve future events. Please take a moment to share your experience.
                        </p>
                      )}
                    </div>

                    {/* Certificate Status */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                          <span className="text-sm font-semibold text-slate-900">Certificate</span>
                        </div>
                        {selectedEventDetail.participation_status?.certificate_earned ? (
                          <Link
                            to="/client/certificates"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 transition-colors"
                            onClick={closeEventDetailModal}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download
                          </Link>
                        ) : selectedEventDetail.event.status === 'completed' && selectedEventDetail.participation_status?.attended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-lg text-xs font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Processing
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Not Available
                          </span>
                        )}
                      </div>
                      {selectedEventDetail.participation_status?.certificate_earned && (
                        <div className="text-xs text-slate-600">
                          <p><strong>Certificate ID:</strong> {selectedEventDetail.participation_status.certificate_id}</p>
                        </div>
                      )}
                      {selectedEventDetail.event.status === 'completed' && selectedEventDetail.participation_status?.attended && !selectedEventDetail.participation_status?.certificate_earned && (
                        <p className="text-xs text-slate-600 mt-2">
                          Your certificate is being processed. It will be available in your certificates section once ready.
                        </p>
                      )}
                      {(!selectedEventDetail.participation_status?.attended && selectedEventDetail.event.status === 'completed') && (
                        <p className="text-xs text-slate-600 mt-2">
                          Attendance is required to receive a certificate for this event.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t border-slate-200">
                  <Link
                    to={`/client/events/${selectedEventDetail.event_id}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold"
                    onClick={closeEventDetailModal}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Full Event
                  </Link>
                  <button
                    onClick={closeEventDetailModal}
                    className="px-6 py-3 text-slate-600 hover:text-slate-800 transition-colors font-semibold rounded-xl hover:bg-slate-50 border border-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Detail Modal - Simplified for faculty (if needed) */}
      {showTeamDetailModal && selectedTeamDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Team Information</h3>
                </div>
                <button
                  onClick={closeTeamDetailModal}
                  className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors duration-200"
                >
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="text-center">
                <h4 className="text-lg font-bold text-slate-900 mb-2">
                  {selectedTeamDetail.teamName || 'Team Information'}
                </h4>
                <p className="text-slate-600 mb-4">
                  {selectedTeamDetail.eventName}
                </p>
                {selectedTeamDetail.error ? (
                  <p className="text-red-600 text-sm">{selectedTeamDetail.error}</p>
                ) : (
                  <p className="text-slate-600 text-sm">
                    Faculty team participation details would be displayed here.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FacultyProfilePage;
