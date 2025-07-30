import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { useAvatar } from '../../../../hooks/useAvatar';
import ClientLayout from '../../../../components/client/Layout';
import ProfileEventCard from '../../../../components/client/ProfileEventCard';
import AvatarUpload from '../../../../components/client/AvatarUpload';
import api from '../../../../api/axios';

function ProfilePage() {
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
  const [showEventsModal, setShowEventsModal] = useState(false);  const [showCancelModal, setShowCancelModal] = useState(false);
  const [currentEventId, setCurrentEventId] = useState(null);
  const [currentEventName, setCurrentEventName] = useState('');
  const [cancellingRegistration, setCancellingRegistration] = useState(false);

  // Fetch event history and dashboard stats on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);        // Fetch complete profile data
        const profileResponse = await api.get('/api/v1/client/profile/info');
        if (profileResponse.data.success) {
          const profile = profileResponse.data.profile || {};
          setProfileData(profile);
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
      sub_status: item.sub_status,
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
  };  const closeCancelModal = () => {
    setShowCancelModal(false);
    setCurrentEventId(null);
    setCurrentEventName('');
    setCancellingRegistration(false);
  };

  const handleCancelRegistration = async () => {
    try {
      setCancellingRegistration(true);
      const response = await api.post(`/api/v1/client/registration/cancel/${currentEventId}`);
      
      if (response.data.success) {
        // Remove the cancelled event from the local state
        setEventHistory(prev => prev.filter(event => event.event_id !== currentEventId));
        
        // Update dashboard stats
        setDashboardStats(prev => ({
          ...prev,
          total_registrations: Math.max(0, (prev.total_registrations || 0) - 1)
        }));
        
        // Close the modal
        closeCancelModal();
        
        // Show success message (you might want to add a toast notification here)
        console.log('Registration cancelled successfully');
      } else {
        console.error('Failed to cancel registration:', response.data.message);
        alert('Failed to cancel registration: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error cancelling registration:', error);
      alert('Error cancelling registration. Please try again.');
    } finally {
      setCancellingRegistration(false);
    }
  };  const handleAvatarUpdate = (newAvatarUrl) => {
    updateAvatar(newAvatarUrl);
  };

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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-9">            {/* Main 2-Column Layout */}
            <div className="flex gap-8">
              {/* Left Column */}
              <div className="space-y-3 sticky top-8 h-fit w-130 flex-shrink-3">
                {/* Profile Card with Student Info & Quick Actions */}
                <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">                  
                  {/* Profile Header Section */}
                  <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-8 border-b border-slate-200 overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-blue-300 rounded-full -translate-y-20 translate-x-20"></div>
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400 rounded-full translate-y-16 -translate-x-16"></div>
                    </div>                      <div className="relative flex items-center gap-6">                      {/* Avatar */}
                      <AvatarUpload 
                        currentAvatar={avatarUrl}
                        onAvatarUpdate={handleAvatarUpdate}
                        className="flex-shrink-0"
                      />
                        {/* Name and Basic Info */}
                      <div className="flex-1">                        <h1 className="text-2xl font-bold text-white mb-1">
                          {(profileData?.full_name || user?.full_name || 'Guest User')}
                        </h1>
                        <p className="text-blue-100 text-sm font-medium mb-1">
                          {profileData?.enrollment_no || user?.enrollment_no || 'Enrollment not provided'}
                        </p>
                        <p className="text-blue-200 text-sm mb-4">
                          Member since {formatMemberSince(profileData?.profile_created_at || user?.created_at)}
                        </p>
                          {/* Quick Actions */}
                        <div className="flex gap-3">
                          <Link
                            to="/client/profile/edit"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl border border-blue-500 hover:border-blue-600 transition-all duration-200 text-sm font-semibold"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Profile
                          </Link>                          <Link
                            to="/client/certificates"
                            className="relative inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl border border-orange-500 hover:border-orange-600 transition-all duration-200 text-sm font-semibold"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            Certificates
                            {dashboardStats.certificates_earned > 0 && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full border-2 border-blue-600 flex items-center justify-center">
                                <span className="text-white text-xs font-bold">{dashboardStats.certificates_earned}</span>
                              </div>
                            )}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>                  
                  {/* Student Details */}
                  <div className="p-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Student Details                    </h3>                      <div className="grid grid-cols-1 gap-6 items-start">
                        {/* Left Column - All Student Detail Cards Stacked */}
                        <div className="space-y-4">
                          {/* Academic Progress Card */}
                          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-slate-500 text-sm">Academic Progress</p>
                              <p className="text-slate-900 font-semibold">
                                {formatSemester(profileData?.semester || user?.semester) !== 'N/A'
                                  ? `Semester ${formatSemester(profileData?.semester || user?.semester)} • Year ${getAcademicYear(profileData?.semester || user?.semester)}`
                                  : 'Not specified'}
                              </p>
                            </div>
                          </div>

                          {/* Department Card */}
                          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-slate-500 text-sm">Department</p>
                              <p className="text-slate-900 font-semibold">
                                {profileData?.department || user?.department || 'Not specified'}
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
                                    {profileData?.phone_number || profileData?.contact_no || profileData?.mobile_no || profileData?.mobile || user?.phone_number || user?.contact_no || user?.mobile_no || user?.mobile || 'Phone not provided'}
                                  </span>
                                </div>
                              </div>                            
                            </div>
                          </div>                        </div>

                        {/* Event Statistics Section Heading */}
                        <div className="col-span-full">
                          <h4 className="text-base font-bold text-slate-800 -mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Event Statistics
                          </h4>
                        </div>

                        {/* Full-width edge-to-edge separator */}
                        <div className="col-span-full -mx-8 border-t border-slate-200"></div>

                        {/* Event Statistics Block */}
                        <div className="col-span-full mt-0">
                          <div className="flex">
                            <div className="flex-1 text-center">
                              <span className="text-xs text-slate-600 block mb-1">Total</span>
                              <span className="text-sm font-bold text-blue-600">
                                {dashboardStats.total_registrations || 0}
                              </span>
                            </div>
                            <div className="w-px bg-slate-300 mx-2"></div>
                            <div className="flex-1 text-center">
                              <span className="text-xs text-slate-600 block mb-1">Done</span>
                              <span className="text-sm font-bold text-emerald-600">
                                {registrations.filter(reg => reg.event?.status === 'completed').length}
                              </span>
                            </div>
                            <div className="w-px bg-slate-300 mx-2"></div>
                            <div className="flex-1 text-center">
                              <span className="text-xs text-slate-600 block mb-1">Coming</span>
                              <span className="text-sm font-bold text-orange-600">
                                {registrations.filter(reg => reg.event?.status === 'upcoming').length}
                              </span>
                            </div>
                            <div className="w-px bg-slate-300 mx-2"></div>
                            <div className="flex-1 text-center">
                              <span className="text-xs text-slate-600 block mb-1">Live</span>
                              <span className="text-sm font-bold text-purple-600">
                                {registrations.filter(reg => reg.event?.status === 'ongoing').length}
                              </span>
                            </div>
                          </div>
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
                        </div>                        {registrations.length > 3 ? (
                          <button
                            onClick={openEventsModal}
                            className="inline-flex items-center gap-2 text-seafoam-600 hover:text-seafoam-700 text-sm font-semibold bg-seafoam-50 hover:bg-seafoam-100 px-3 py-1.5 rounded-xl transition-all duration-200"
                          >
                            View All ({registrations.length})
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        ) : (
                          <Link
                            to="/client/events"
                            className="inline-flex items-center gap-2 text-seafoam-600 hover:text-seafoam-700 text-sm font-semibold bg-seafoam-50 hover:bg-seafoam-100 px-3 py-1.5 rounded-xl transition-all duration-200"
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
                    <div className="p-6">                      {registrations.length > 0 ? (                        <div className="space-y-4">
                          {registrations.slice(0, 3).map((reg, index) => (
                            <ProfileEventCard 
                              key={index} 
                              reg={reg} 
                              onCancelRegistration={confirmCancelRegistration}
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
                            Ready to dive into campus life? Discover amazing events and start building your journey!
                          </p>
                          <Link
                            to="/client/events"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-700 text-white rounded-xl hover:bg-blue-500 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl group"
                          >                            <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      {/* All Events Modal */}
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
              </div>            {/* Modal Content */}              <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)] bg-gray-50">
                <div className="grid gap-6">
                  {registrations.map((reg, index) => (
                    <ProfileEventCard 
                      key={index} 
                      reg={reg} 
                      onCancelRegistration={confirmCancelRegistration}
                    />
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
                  </button>              </div>
              </div>          </div>
          </div>
        )}
    </ClientLayout>
  );
}

export default ProfilePage;
