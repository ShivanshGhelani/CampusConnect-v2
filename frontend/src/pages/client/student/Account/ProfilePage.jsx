import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { useAvatar } from '../../../../hooks/useAvatar';
import ProfileEventCard from '../../../../components/client/ProfileEventCard';
import AvatarUpload from '../../../../components/client/AvatarUpload';
import QRCodeDisplay from '../../../../components/client/QRCodeDisplay';
import MessageBox from '../../../../components/client/MessageBox';
import TeamViewModal from '../../../../components/client/TeamViewModal';
import EventDetailModal from '../../../../components/client/EventDetailModal';
import { clientAPI } from '../../../../api/client';
import { fetchProfileWithCache, getAnyCache } from '../../../../utils/profileCache';
import { qrCodeService } from '../../../../services/QRCodeService';
import api from '../../../../api/base';

function ProfilePage() {
  const { user } = useAuth();

  // Create truly stable user object that only changes when core properties change
  const memoizedUser = useMemo(() => {
    if (!user) return null;

    // Only include properties that actually matter for avatar fetching
    // This prevents unnecessary re-memoization due to unrelated user data changes
    return {
      enrollment_no: user.enrollment_no,
      user_type: user.user_type,
      // Only include display properties if they're actually used by useAvatar
      ...(user.full_name && { full_name: user.full_name }),
      ...(user.email && { email: user.email })
    };
  }, [
    user?.enrollment_no,
    user?.user_type,
    user?.full_name,
    user?.email
  ]);

  // Memoize userType as well to prevent string re-creation
  const userType = useMemo(() => 'student', []);

  const {
    avatarUrl,
    updateAvatar,
    forceRefreshAvatar,
    isLoading: avatarLoading
  } = useAvatar(memoizedUser, userType);

  const [eventHistory, setEventHistory] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({
    total_registrations: 0,
    attendance_marked: 0,
    feedback_submitted: 0,
    certificates_earned: 0
  });
  const [loading, setLoading] = useState(true);

  // Make sure modal state doesn't affect the user object
  // These should be separate from user-related state
  const [showEventsModal, setShowEventsModal] = useState(false);
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [selectedEventDetail, setSelectedEventDetail] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showTeamDetailModal, setShowTeamDetailModal] = useState(false);
  const [selectedTeamDetail, setSelectedTeamDetail] = useState(null);
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [teamTasks, setTeamTasks] = useState([]);
  const [teamRoles, setTeamRoles] = useState([]);
  const [teamDataLoading, setTeamDataLoading] = useState(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [selectedQRData, setSelectedQRData] = useState(null);
  const [currentEventId, setCurrentEventId] = useState(null);
  const [currentEventName, setCurrentEventName] = useState('');
  const [cancellingRegistration, setCancellingRegistration] = useState(false);

  // Create stable callback for avatar updates
  const handleAvatarUpdate = useCallback((newAvatarUrl) => {
    updateAvatar(newAvatarUrl);
  }, [updateAvatar]);

  // Listen for user data updates and refresh profile data
  useEffect(() => {
    const handleUserDataUpdate = (event) => {
      const updatedUserData = event.detail;

      if (updatedUserData && profileData) {
        

        // Update the profile data with the new user data
        setProfileData(prevProfileData => ({
          ...prevProfileData,
          ...updatedUserData
        }));
      }
    };

    // Listen for custom userDataUpdated events
    window.addEventListener('userDataUpdated', handleUserDataUpdate);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate);
    };
  }, [profileData]);

  // Also listen for changes to the user from AuthContext (minimal updates only)
  useEffect(() => {
    if (user && profileData && user.full_name !== profileData.full_name) {
      
      setProfileData(prevProfileData => ({
        ...prevProfileData,
        ...user
      }));
    }
  }, [user?.enrollment_no, profileData?.enrollment_no]); // OPTIMIZED: Only depend on stable IDs

  // Fetch event history and dashboard stats on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // OPTIMIZED: Check for immediate cache hit first
        
        let data = getAnyCache('student');
        
        if (!data) {
          
          // OPTIMIZED: Use global cache to prevent duplicate API calls
          data = await fetchProfileWithCache('student', user?.enrollment_no, api);
        } else {
          
        }
        
        
        
        if (data && data.success) {
          const { profile, stats, event_history } = data;
          
          
          
          // Update all state with the combined response
          setProfileData(profile || {});
          setDashboardStats(stats || {});
          setEventHistory(event_history || []);
        } else {
          
        }

      } catch (error) {
        
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if user exists and we haven't fetched profile data yet (prevent duplicate calls)
    if (user?.enrollment_no && !profileData?.enrollment_no) {
      
      fetchData();
    } else if (profileData?.enrollment_no) {
      
      setLoading(false); // Ensure loading is false if data is already available
    }
  }, [user?.enrollment_no, user?.name]); // Wait for user to be fully loaded before fetching

  // Convert event history to match the existing format for compatibility
  const registrations = eventHistory.map(item => {
    return {
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
    };
  });

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

    return timeB.getTime() - timeA.getTime(); // Latest first
  });

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

  // Modal handlers should be memoized to prevent unnecessary re-renders
  const openEventsModal = useCallback(() => setShowEventsModal(true), []);
  const closeEventsModal = useCallback(() => setShowEventsModal(false), []);

  const openEventDetailModal = useCallback((eventDetail) => {
    setSelectedEventDetail(eventDetail);
    setShowEventDetailModal(true);
  }, []);

  const closeEventDetailModal = useCallback(() => {
    setShowEventDetailModal(false);
    setSelectedEventDetail(null);
  }, []);

  const closeQRCodeModal = useCallback(() => {
    setShowQRCodeModal(false);
    setSelectedQRData(null);
  }, []);

  const openTeamDetailModal = useCallback(async (teamDetail) => {
    
    
    
    
    

    // Close QR modal if it's open to prevent stacking
    if (showQRCodeModal) {
      closeQRCodeModal();
      // Wait a bit for QR modal to close
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Reset any previous state
    setTeamTasks([]);
    setTeamRoles([]);
    setTeamDataLoading(false);

    // Set team detail and open modal
    setSelectedTeamDetail(teamDetail);
    setShowTeamDetailModal(true);

    
  }, [showQRCodeModal, closeQRCodeModal, showTeamDetailModal]);

  const closeTeamDetailModal = useCallback(() => {
    setShowTeamDetailModal(false);
    setSelectedTeamDetail(null);
    setShowMessageBox(false);
    setTeamTasks([]);
    setTeamRoles([]);
    setTeamDataLoading(false);
  }, []);

  const openQRCodeModal = useCallback(async (qrData) => {
    
    
    
    
    
    
    
    
    
    

    // Close team modal if it's open to prevent stacking
    if (showTeamDetailModal) {
      closeTeamDetailModal();
    }

    try {
      // Generate QR code with backend data
      
      
      const registrationData = qrData.registration;
      // Ensure event data has event_id properly set
      const eventData = {
        ...qrData.event,
        event_id: qrData.eventId || qrData.event?.event_id || qrData.event?.id,
        id: qrData.eventId || qrData.event?.event_id || qrData.event?.id,
        eventId: qrData.eventId || qrData.event?.event_id || qrData.event?.id
      };
      
      
      
      
      // Generate QR data using backend endpoint
      const backendQRData = await qrCodeService.generateQRData(registrationData, eventData);
      
      // Create enhanced QR data with backend response
      const enhancedQRData = {
        ...qrData,
        backendQRData, // This contains the proper QR data from backend
        registration: registrationData,
        event: eventData
      };

      
      
      setSelectedQRData(enhancedQRData);
      setShowQRCodeModal(true);
      
    } catch (error) {
      
      
      // Fallback to original implementation with team enhancement
      let enhancedQRData = { ...qrData };

      // If this is a team registration, try to fetch full team details with members
      if (qrData?.registrationType === 'team' && qrData?.eventId) {
        try {
          
          const teamResponse = await clientAPI.getTeamRegistrationDetails(qrData.eventId);

          if (teamResponse.data?.success && teamResponse.data?.team_registration) {
            

            // Map the team members to the expected format for QR service
            const mappedTeamMembers = teamResponse.data.team_registration.members?.map(member => ({
              name: member.student?.name || member.name,
              enrollment_no: member.student?.enrollment_no || member.enrollment_no,
              email: member.student?.email || member.email,
              phone: member.student?.phone || member.phone,
              department: member.student?.department || member.department,
              semester: member.student?.semester || member.semester,
              is_leader: member.is_team_leader || false,
              registration_id: member.registration_id
            })) || [];

            // Enhance the registration data with full team member details
            enhancedQRData.registration = {
              ...qrData.registration,
              team_members: mappedTeamMembers,
              team_details: {
                team_name: teamResponse.data.team_registration.team_name,
                team_leader: teamResponse.data.team_registration.team_leader,
                team_registration_id: teamResponse.data.team_registration.team_registration_id
              },
              // Add any other relevant team data
              team_size: teamResponse.data.team_registration.team_size || mappedTeamMembers.length || 1
            };

            // Also enhance event data with event_id if available
            if (teamResponse.data.team_registration.event?.event_id) {
              enhancedQRData.event = {
                ...qrData.event,
                event_id: teamResponse.data.team_registration.event.event_id
              };
            }

            
            
          }
        } catch (teamError) {
          
          // Continue with basic data if team fetch fails
        }
      }

      setSelectedQRData(enhancedQRData);
      setShowQRCodeModal(true);
    }
  }, [showTeamDetailModal, closeTeamDetailModal]);

  const confirmCancelRegistration = useCallback((eventId, eventName) => {
    setCurrentEventId(eventId);
    setCurrentEventName(eventName);
    setShowCancelModal(true);
  }, []);

  const closeCancelModal = useCallback(() => {
    setShowCancelModal(false);
    setCurrentEventId(null);
    setCurrentEventName('');
  }, []);

  const handleCancelRegistration = async () => {
    try {
      setCancellingRegistration(true);
      const response = await api.delete(`/api/v1/client/registration/cancel/${currentEventId}`);

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
        
      } else {
        
        alert('Failed to cancel registration: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      
      alert('Error cancelling registration. Please try again.');
    } finally {
      setCancellingRegistration(false);
    }
  };

  return (
    <div className="min-h-screen lg:bg-gradient-to-br lg:from-slate-50 lg:to-blue-50">
      {/* Mobile/Tablet Layout - Edge to Edge */}
      <div
        className="lg:hidden bg-white fixed inset-0 z-10 overflow-y-auto w-full min-h-[100dvh]"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Profile Header - Mobile/Tablet */}
        {loading || !profileData ? (
          <div className="bg-white animate-pulse pt-26">
            {/* Header Skeleton */}
            <div className="relative bg-gradient-to-r from-slate-300 to-slate-400 px-4 sm:px-6 py-8 overflow-hidden">
              <div className="relative flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <div className="w-20 h-20 rounded-full bg-slate-200"></div>
                <div className="flex-1 text-center sm:text-left space-y-3">
                  <div className="h-6 bg-slate-200 rounded w-3/4 mx-auto sm:mx-0"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto sm:mx-0"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/3 mx-auto sm:mx-0"></div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                    <div className="h-8 bg-slate-200 rounded-xl w-24 mx-auto sm:mx-0"></div>
                    <div className="h-8 bg-slate-200 rounded-xl w-24 mx-auto sm:mx-0"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-200"></div>

            {/* Stats Skeleton */}
            <div className="px-4 sm:px-6 py-6">
              <div className="bg-slate-100 rounded-2xl p-4">
                <div className="h-6 bg-slate-200 rounded w-32 mb-4"></div>
                <div className="bg-white rounded-xl p-3">
                  <div className="flex">
                    <div className="flex-1 text-center space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-8 mx-auto"></div>
                      <div className="h-4 bg-slate-200 rounded w-6 mx-auto"></div>
                    </div>
                    <div className="w-px bg-slate-200 mx-2"></div>
                    <div className="flex-1 text-center space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-8 mx-auto"></div>
                      <div className="h-4 bg-slate-200 rounded w-6 mx-auto"></div>
                    </div>
                    <div className="w-px bg-slate-200 mx-2"></div>
                    <div className="flex-1 text-center space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-8 mx-auto"></div>
                      <div className="h-4 bg-slate-200 rounded w-6 mx-auto"></div>
                    </div>
                    <div className="w-px bg-slate-200 mx-2"></div>
                    <div className="flex-1 text-center space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-8 mx-auto"></div>
                      <div className="h-4 bg-slate-200 rounded w-6 mx-auto"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-200"></div>

            {/* Events Skeleton */}
            <div className="px-4 sm:px-6 py-6">
              <div className="bg-slate-100 rounded-2xl p-4">
                <div className="bg-white p-4 rounded-xl mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-200 rounded-xl"></div>
                      <div className="h-6 bg-slate-200 rounded w-24"></div>
                    </div>
                    <div className="h-6 bg-slate-200 rounded w-20"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-white rounded-xl p-4 h-24"></div>
                  <div className="bg-white rounded-xl p-4 h-24"></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white pt-26">
            {/* Profile Header Section */}
            <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 px-4 sm:px-6 py-6 overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-300 rounded-full -translate-y-20 translate-x-20"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400 rounded-full translate-y-16 -translate-x-16"></div>
              </div>

              <div className="relative flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                {/* Avatar */}
                <AvatarUpload
                  currentAvatar={avatarUrl}
                  onAvatarUpdate={handleAvatarUpdate}
                  className="flex-shrink-0"
                />

                {/* Name and Basic Info */}
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
                    {(profileData?.full_name || user?.full_name || 'Guest User')}
                  </h1>
                  <p className="text-blue-100 text-sm font-medium mb-1">
                    {profileData?.enrollment_no || user?.enrollment_no || 'Enrollment not provided'}
                  </p>
                  <p className="text-blue-200 text-sm mb-4">
                    Member since {formatMemberSince(profileData?.profile_created_at || user?.created_at)}
                  </p>

                  {/* Quick Actions */}
                  <div className="flex flex-row sm:flex-row gap-2 sm:gap-3">
                    <Link
                      to="/client/profile/edit"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl border border-blue-500 hover:border-blue-600 transition-all duration-200 text-sm font-semibold"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Profile
                    </Link>

                    <Link
                      to="/client/certificates"
                      className="relative inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl border border-orange-500 hover:border-orange-600 transition-all duration-200 text-sm font-semibold"
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
          </div>
        )}

        {/* Subtle divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

        {/* Event Statistics - Mobile/Tablet */}
        <div className="bg-white">
          <div className="px-4 sm:px-6 py-6">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-4">
              <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                My Event Statistics
              </h4>

              <div className="flex bg-white rounded-xl p-3 shadow-sm">
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
                    {sortedRegistrations.filter(reg => reg.event?.status === 'completed').length}
                  </span>
                </div>
                <div className="w-px bg-slate-300 mx-2"></div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-slate-600 block mb-1">Coming</span>
                  <span className="text-sm font-bold text-orange-600">
                    {sortedRegistrations.filter(reg => reg.event?.status === 'upcoming').length}
                  </span>
                </div>
                <div className="w-px bg-slate-300 mx-2"></div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-slate-600 block mb-1">Live</span>
                  <span className="text-sm font-bold text-purple-600">
                    {sortedRegistrations.filter(reg => reg.event?.status === 'ongoing').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>        {/* Subtle divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

        {/* My Events Section - Mobile/Tablet */}
        <div className="bg-white">
          <div className="px-4 sm:px-6 py-6">
            <div className="rounded-2xl overflow-hidden">
              {/* Section Header */}
              <div className="px-4 py-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">My Events</h2>
                  </div>

                  {sortedRegistrations.length > 3 ? (
                    <button
                      onClick={openEventsModal}
                      className="inline-flex items-center gap-2 text-seafoam-600 hover:text-seafoam-700 text-sm font-semibold bg-seafoam-50 hover:bg-seafoam-100 px-3 py-1.5 rounded-xl transition-all duration-200"
                    >
                      View All ({sortedRegistrations.length})
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
              <div className="p-1 pt-2 pb-4">
                {sortedRegistrations.length > 0 ? (
                  <div className="space-y-3">
                    {sortedRegistrations.slice(0, 3).map((reg, index) => (
                      <ProfileEventCard
                        key={`${reg.event_id}-${index}`}
                        reg={reg}
                        onCancelRegistration={confirmCancelRegistration}
                        onViewDetails={openEventDetailModal}
                        onViewTeam={openTeamDetailModal}
                        onViewQRCode={openQRCodeModal}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl">
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
                    >
                      <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Explore Events
                    </Link>
                  </div>
                )}
              </div>

              {/* Extra padding at bottom for mobile scrolling */}
              <div className="pb-20"></div>
            </div>
          </div>
        </div>
        {/* Mobile Cancel Registration Modal (rendered within mobile layout to ensure visibility) */}
        {showCancelModal && (
          <div
            className="lg:hidden fixed inset-0 bg-green-500/90 z-[99999] flex flex-col w-full h-[100dvh] overscroll-y-none"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Mobile Header */}
            <div
              className="flex items-center justify-between p-4 border-b border-gray-200 bg-white sticky top-0 z-10"
              style={{ paddingTop: 'env(safe-area-inset-top)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Cancel Registration</h2>
                  <p className="text-xs text-gray-600">Mobile View</p>
                </div>
              </div>
              <button
                onClick={closeCancelModal}
                disabled={cancellingRegistration}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mobile Content */}
            <div className="flex-1 min-h-0 flex flex-col justify-center p-6 pb-24 bg-white overflow-y-auto">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Cancel Registration</h3>
                <p className="text-slate-600 mb-8 leading-relaxed px-4">
                  Are you sure you want to cancel your registration for <strong className="text-slate-900">"{currentEventName}"</strong>? This action cannot be undone.
                </p>
                <div className="space-y-3 px-4">
                  <button
                    onClick={handleCancelRegistration}
                    disabled={cancellingRegistration}
                    className="w-full px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancellingRegistration ? 'Cancelling...' : 'Yes, Cancel Registration'}
                  </button>
                  <button
                    onClick={closeCancelModal}
                    disabled={cancellingRegistration}
                    className="w-full px-6 py-4 text-slate-600 hover:text-slate-800 transition-colors font-semibold rounded-xl hover:bg-slate-50 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Keep Registration
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile QR Code Modal - edge-to-edge */}
        {showQRCodeModal && selectedQRData && (
          <div className="lg:hidden fixed inset-x-0 z-[99999] flex flex-col bg-white w-full overflow-hidden"
            style={{
              top: '104px', // TopBanner (40px) + Navigation (64px) = 104px
              bottom: '72px', // Bottom navigation height (h-18 = 72px)
              height: 'calc(100vh - 176px)' // 104px (top) + 72px (bottom) = 176px
            }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white z-10 min-h-[60px] flex-shrink-0">

              <div className="flex-1 min-w-0 pr-3">
                <h3 className="text-base font-semibold text-gray-900 leading-tight">Attendance QR Code</h3>
                <p className="text-xs text-gray-600 mt-0.5 truncate">
                  {selectedQRData?.eventName}
                </p>
              </div>
              <button
                onClick={closeQRCodeModal}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-4 sm:p-6 flex flex-col items-center justify-start">
                <div className="w-full max-w-sm">
                  {/* Debug Info */}
                  <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
                    <div>Event ID: {selectedQRData?.eventId || selectedQRData?.event?.event_id || 'MISSING'}</div>
                    <div>Reg ID: {selectedQRData?.registration?.registration_id || 'MISSING'}</div>
                    <div>Registration Data: {selectedQRData?.registration ? 'Present' : 'Missing'}</div>
                    <div>Event Data: {selectedQRData?.event ? 'Present' : 'Missing'}</div>
                    <div>Backend QR Data: {selectedQRData?.backendQRData ? 'Present' : 'Missing'}</div>
                  </div>
                  
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
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-9">
          {/* Main 2-Column Layout */}
          <div className="flex gap-8">
            {/* Left Column */}
            <div className="space-y-3 sticky top-8 h-fit w-130 flex-shrink-3">
              {/* ✅ FIX: Conditionally render Profile Card or Skeleton */}
              {loading || !profileData ? (
                <ProfileCardSkeleton />
              ) : (
                /* This is your existing Profile Card JSX */
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
                              {sortedRegistrations.filter(reg => reg.event?.status === 'completed').length}
                            </span>
                          </div>
                          <div className="w-px bg-slate-300 mx-2"></div>
                          <div className="flex-1 text-center">
                            <span className="text-xs text-slate-600 block mb-1">Coming</span>
                            <span className="text-sm font-bold text-orange-600">
                              {sortedRegistrations.filter(reg => reg.event?.status === 'upcoming').length}
                            </span>
                          </div>
                          <div className="w-px bg-slate-300 mx-2"></div>
                          <div className="flex-1 text-center">
                            <span className="text-xs text-slate-600 block mb-1">Live</span>
                            <span className="text-sm font-bold text-purple-600">
                              {sortedRegistrations.filter(reg => reg.event?.status === 'ongoing').length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                    </div>                        {sortedRegistrations.length > 3 ? (
                      <button
                        onClick={openEventsModal}
                        className="inline-flex items-center gap-2 text-seafoam-600 hover:text-seafoam-700 text-sm font-semibold bg-seafoam-50 hover:bg-seafoam-100 px-3 py-1.5 rounded-xl transition-all duration-200"
                      >
                        View All ({sortedRegistrations.length})
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
                <div className="p-6">
                  {sortedRegistrations.length > 0 ? (<div className="space-y-4">
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
                      All My Events ({sortedRegistrations.length})
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
        )}

        {/* Cancel Registration Modal */}
        {showCancelModal && (
          <div className="hidden sm:flex fixed inset-0 bg-black/50 items-center justify-center z-[99999] p-4">
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
        )}

        {/* Event Detail Modal */}
        <EventDetailModal
          isOpen={showEventDetailModal}
          onClose={closeEventDetailModal}
          selectedEventDetail={selectedEventDetail}
        />

        {/* Team Detail Modal */}
        <TeamViewModal
          isOpen={showTeamDetailModal}
          onClose={closeTeamDetailModal}
          eventId={selectedTeamDetail?.eventId}
          teamId={selectedTeamDetail?.teamId}
          teamData={selectedTeamDetail}
        />
        {/* QR Code Modal (Desktop) */}
        {showQRCodeModal && selectedQRData && (
          <div className="hidden lg:flex fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 items-center justify-center p-4 z-[9998]">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Attendance QR Code
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedQRData?.eventName}
                  </p>
                </div>
                <button
                  onClick={closeQRCodeModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
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
        )}

        {/* MessageBox Component */}
        {showMessageBox && selectedTeamDetail && (
          <MessageBox
            teamData={selectedTeamDetail}
            eventId={selectedTeamDetail?.eventId}
            onBack={() => setShowMessageBox(false)}
            isVisible={showMessageBox}
          />
        )}
      </div>
    </div>
  );
}

// Add this at the bottom of ProfilePage.jsx, outside the main component
const ProfileCardSkeleton = () => (
  <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden animate-pulse">
    {/* Header Skeleton */}
    <div className="px-8 py-8">
      <div className="flex items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-slate-200"></div>
        <div className="flex-1 space-y-3">
          <div className="h-6 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
        </div>
      </div>
    </div>
    {/* Body Skeleton */}
    <div className="p-8 space-y-3">
      <div className="h-10 bg-slate-100 rounded-xl"></div>
      <div className="h-10 bg-slate-100 rounded-xl"></div>
      <div className="h-10 bg-slate-100 rounded-xl"></div>
      <div className="h-10 bg-slate-100 rounded-xl"></div>
    </div>
  </div>
);

export default ProfilePage;
