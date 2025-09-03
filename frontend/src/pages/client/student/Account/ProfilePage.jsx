import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { useAvatar } from '../../../../hooks/useAvatar';
import ProfileEventCard from '../../../../components/client/ProfileEventCard';
import AvatarUpload from '../../../../components/client/AvatarUpload';
import QRCodeDisplay from '../../../../components/client/QRCodeDisplay';
import MessageBox from '../../../../components/client/MessageBox';
import TeamViewModal from '../../../../components/client/TeamViewModal';
import { clientAPI } from '../../../../api/client';
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
        console.log('📱 ProfilePage: Received user data update, refreshing profile data');
        
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

  // Also listen for changes to the user from AuthContext
  useEffect(() => {
    if (user && profileData && user.full_name !== profileData.full_name) {
      console.log('📱 ProfilePage: User context changed, updating profile data');
      setProfileData(prevProfileData => ({
        ...prevProfileData,
        ...user
      }));
    }
  }, [user?.full_name, user?.email, user?.mobile_no, user?.department, user?.semester]);

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
    console.log('=== TEAM DETAIL MODAL DEBUG ===');
    console.log('Opening team detail modal with:', teamDetail);
    console.log('Current QR modal state:', showQRCodeModal);
    console.log('==============================');

    // Close QR modal if it's open to prevent stacking
    if (showQRCodeModal) {
      closeQRCodeModal();
    }

    setSelectedTeamDetail(teamDetail);
    setShowTeamDetailModal(true);
    setTeamDataLoading(true);

    try {
      // For now, use mock data since the team-tools API endpoints don't exist yet
      // Later these can be replaced with actual API calls

      // Mock team tasks data
      const mockTasks = [
        {
          title: "Design Team Logo",
          description: "Create a unique logo for the team that represents our project theme",
          assigned_to: "Design Team Member",
          priority: "high",
          status: "in_progress",
          due_date: "2025-09-02"
        },
        {
          title: "Prepare Presentation",
          description: "Create slides and prepare final presentation for the event",
          assigned_to: "Team Leader",
          priority: "medium",
          status: "pending",
          due_date: "2025-09-05"
        }
      ];

      // Mock team roles data
      const mockRoles = [
        {
          role_name: "Team Leader",
          assigned_to: teamDetail.userRole === 'team_leader' ? "You" : "Team Leader",
          description: "Lead the team, coordinate activities, and ensure project completion",
          status: "active"
        },
        {
          role_name: "Technical Lead",
          assigned_to: "Technical Member",
          description: "Handle technical implementation and code reviews",
          status: "active"
        },
        {
          role_name: "Designer",
          assigned_to: "Design Member",
          description: "Create UI/UX designs and visual assets",
          status: "in_progress"
        }
      ];

      setTeamTasks(mockTasks);
      setTeamRoles(mockRoles);

      // Use actual API calls now
      try {
        const [tasksResponse, rolesResponse] = await Promise.all([
          clientAPI.getTeamTasks(teamDetail.eventId),
          clientAPI.getTeamRoles(teamDetail.eventId)
        ]);

        if (tasksResponse.data.success) {
          setTeamTasks(tasksResponse.data.data || []);
        }

        if (rolesResponse.data.success) {
          setTeamRoles(rolesResponse.data.data || []);
        }
      } catch (apiError) {
        console.log('API not available, using mock data');
        // Keep mock data as fallback
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
      setTeamTasks([]);
      setTeamRoles([]);
    } finally {
      setTeamDataLoading(false);
    }
  }, [showQRCodeModal, closeQRCodeModal]);

  const closeTeamDetailModal = useCallback(() => {
    setShowTeamDetailModal(false);
    setSelectedTeamDetail(null);
    setShowMessageBox(false);
    setTeamTasks([]);
    setTeamRoles([]);
    setTeamDataLoading(false);
  }, []);

  const openQRCodeModal = useCallback(async (qrData) => {
    console.log('=== QR CODE DATA DEBUG ===');
    console.log('Full QR Data received:', qrData);
    console.log('Registration ID:', qrData?.registration?.reg_id);
    console.log('Event ID:', qrData?.eventId);
    console.log('Event Name:', qrData?.eventName);
    console.log('Registration Type:', qrData?.registrationType);
    console.log('Team Name:', qrData?.teamName);
    console.log('Registration Object:', qrData?.registration);
    console.log('Event Object:', qrData?.event);
    console.log('========================');

    // Close team modal if it's open to prevent stacking
    if (showTeamDetailModal) {
      closeTeamDetailModal();
    }

    let enhancedQRData = { ...qrData };

    // If this is a team registration, try to fetch full team details with members
    if (qrData?.registrationType === 'team' && qrData?.eventId) {
      try {
        console.log('Fetching full team data for QR code generation...');
        const teamResponse = await clientAPI.getTeamRegistrationDetails(qrData.eventId);

        if (teamResponse.data?.success && teamResponse.data?.team_registration) {
          console.log('Enhanced team data received:', teamResponse.data.team_registration);

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

          console.log('Enhanced QR data with mapped team members:', enhancedQRData.registration);
          console.log('Team members mapped for QR service:', mappedTeamMembers);
        }
      } catch (error) {
        console.warn('Could not fetch full team data for QR code, using basic data:', error);
        // Continue with basic data if team fetch fails
      }
    }

    setSelectedQRData(enhancedQRData);
    setShowQRCodeModal(true);
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

  {/* Removed duplicate mobile cancel modal previously rendered outside mobile layout */}

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
          <div className="hidden lg:flex fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 items-center justify-center p-4 z-[99999]">
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
