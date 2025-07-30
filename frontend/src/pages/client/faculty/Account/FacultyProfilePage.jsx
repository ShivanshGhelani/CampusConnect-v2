import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { useAvatar } from '../../../../hooks/useAvatar';
import ClientLayout from '../../../../components/client/Layout';
import AvatarUpload from '../../../../components/client/AvatarUpload';
import api from '../../../../api/axios';

function FacultyProfilePage() {
  const { user } = useAuth();
  const { avatarUrl, updateAvatar, forceRefreshAvatar } = useAvatar(user);
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
        
        // Fetch complete faculty profile data
        const profileResponse = await api.get('/api/v1/client/profile/faculty/info');
        if (profileResponse.data.success) {
          const profile = profileResponse.data.profile || {};
          setProfileData(profile);
        }

        // Try to fetch faculty-specific dashboard stats, fallback to default values
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

        // TODO: Add faculty event history fetching when endpoint is available

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
    registration: item.registration_data,
    participation_status: item.participation_status
  }));

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

  const handleAvatarUpdate = (newAvatarUrl) => {
    updateAvatar(newAvatarUrl);
    forceRefreshAvatar();
  };

  if (!user || user.user_type !== 'faculty') {
    return (
      <ClientLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-red-500">Access denied. Faculty login required.</p>
        </div>
      </ClientLayout>
    );
  }

  if (loading) {
    return (
      <ClientLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
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
                    {registrations.length > 0 ? (
                      <div className="space-y-4">
                        {registrations.slice(0, 3).map((reg, index) => (
                          <div key={index} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">
                                  {reg.event?.event_name || 'Event Name'}
                                </h3>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span>{reg.event?.organizing_department || 'Department'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>
                                      {reg.event?.start_datetime ? new Date(reg.event.start_datetime).toLocaleDateString() : 'Date TBD'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>{reg.event?.venue || 'Venue TBD'}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="ml-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  reg.event?.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  reg.event?.status === 'ongoing' ? 'bg-purple-100 text-purple-800' :
                                  reg.event?.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {reg.event?.status ? reg.event.status.charAt(0).toUpperCase() + reg.event.status.slice(1) : 'Unknown'}
                                </span>
                              </div>
                            </div>
                          </div>
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
      </div>
    </ClientLayout>
  );
}

export default FacultyProfilePage;
