import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/admin';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { Dropdown, SearchBox } from '../../components/ui';

function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [eventStats, setEventStats] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [attendeesList, setAttendeesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [registrationsModalOpen, setRegistrationsModalOpen] = useState(false);
  const [attendeesModalOpen, setAttendeesModalOpen] = useState(false);
  const [attendanceStatsModalOpen, setAttendanceStatsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedTeams, setExpandedTeams] = useState(new Set());
  const [presentDropdownOpen, setPresentDropdownOpen] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  // Manual refresh function to force reload data
  const refreshData = async () => {
    try {
      setIsLoading(true);
      setError('');
      // Clear existing data first
      setAttendanceStats(null);
      setEventStats(null);
      setRecentRegistrations([]);
      
      await fetchEventDetails();
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Add cache-busting timestamp to force fresh data
      const timestamp = Date.now();
      
      // Fetch event details, statistics, recent registrations, and attendance stats
      const [eventResponse, statsResponse, recentRegsResponse, attendanceStatsResponse] = await Promise.all([
        adminAPI.getEvent(eventId),
        adminAPI.getEventStats(eventId).catch(() => ({ data: { success: false } })),
        adminAPI.getEventRegistrations(eventId, { limit: 5 }).catch(() => ({ data: { success: false } })),
        adminAPI.getAttendanceStatistics(eventId).then(response => {
          // Add timestamp to verify fresh data
          if (response.data) {
            response.data._fetchedAt = timestamp;
          }
          return response;
        }).catch(() => ({ data: { success: false } }))
      ]);

      if (eventResponse.data.success) {
        setEvent(eventResponse.data.event);
        console.log('Event data loaded:', eventResponse.data.event);
        console.log('Organizers data:', eventResponse.data.event.organizer_details);
        console.log('Faculty organizers:', eventResponse.data.event.faculty_organizers);
      } else {
        throw new Error(eventResponse.data.message || 'Failed to fetch event details');
      }

      if (statsResponse.data.success) {
        setEventStats(statsResponse.data.stats);
      }

      if (attendanceStatsResponse.data && attendanceStatsResponse.data.event_id) {
        // Validate attendance statistics data
        const stats = attendanceStatsResponse.data;
        
        // Ensure all required fields are present and valid
        const validatedStats = {
          ...stats,
          total_registrations: Math.max(0, stats.total_registrations || 0),
          virtual_attendance_count: Math.max(0, stats.virtual_attendance_count || 0),
          physical_attendance_count: Math.max(0, stats.physical_attendance_count || 0),
          present_count: Math.max(0, stats.present_count || 0),
          virtual_only_count: Math.max(0, stats.virtual_only_count || 0),
          physical_only_count: Math.max(0, stats.physical_only_count || 0),
          absent_count: Math.max(0, stats.absent_count || 0),
          attendance_percentage: Math.min(100, Math.max(0, stats.attendance_percentage || 0))
        };
        
        // Validate data integrity
        const totalAccounted = validatedStats.present_count + 
                              validatedStats.virtual_only_count + 
                              validatedStats.physical_only_count + 
                              validatedStats.absent_count;
        
        if (totalAccounted !== validatedStats.total_registrations) {
          console.warn('Attendance statistics data integrity warning:', {
            totalRegistrations: validatedStats.total_registrations,
            totalAccounted: totalAccounted,
            difference: validatedStats.total_registrations - totalAccounted
          });
        }
        
        setAttendanceStats(validatedStats);
      } else {
        console.warn('Invalid attendance statistics response:', attendanceStatsResponse);
      }

      if (recentRegsResponse.data.success) {
        // Handle different possible data structures
        let registrations = [];
        if (recentRegsResponse.data.registrations) {
          registrations = Array.isArray(recentRegsResponse.data.registrations) 
            ? recentRegsResponse.data.registrations 
            : [recentRegsResponse.data.registrations];
        } else if (recentRegsResponse.data.data && Array.isArray(recentRegsResponse.data.data)) {
          registrations = recentRegsResponse.data.data;
        }
        
        setRecentRegistrations(registrations);
      } else {
        setRecentRegistrations([]);
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      setError('Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    try {
      const response = await adminAPI.deleteEvent(eventId);
      if (response.data.success) {
        navigate('/admin/events', { 
          state: { message: 'Event deleted successfully' }
        });
      } else {
        throw new Error(response.data.message || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      
      // Provide more user-friendly error messages
      let errorMessage = 'Failed to delete event: ';
      if (error.message.includes('existing registrations')) {
        errorMessage = 'Cannot delete this event because it has existing registrations. Please contact participants and cancel their registrations first, or consider marking the event as cancelled instead of deleting it.';
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
    }
    setDeleteModalOpen(false);
  };

  const fetchAllRegistrations = async () => {
    try {
      setModalLoading(true);
      const response = await adminAPI.getEventRegistrations(eventId);
      
      if (response.data.success) {
        const registrations = response.data.registrations || [];
        setAllRegistrations(registrations);
      } else {
        setAllRegistrations([]);
      }
    } catch (error) {
      console.error('Error fetching all registrations:', error);
      setAllRegistrations([]);
    } finally {
      setModalLoading(false);
    }
  };

  const fetchAttendees = async () => {
    try {
      setModalLoading(true);
      // Get registrations with attendance details instead of just attendance
      const response = await adminAPI.getEventRegistrationsWithAttendance(eventId);
      console.log('Attendees API response:', response.data); // Debug log
      
      if (response.data.success) {
        // The API returns data in response.data.data.registrations structure
        const allRegistrations = response.data.data?.registrations || [];
        console.log('All registrations:', allRegistrations); // Debug log
        console.log('Number of registrations:', allRegistrations.length); // Debug log
        
        // For now, let's show all attendees to debug the issue
        // Filter for students who have BOTH virtual and physical attendance (present status)
        const presentStudents = allRegistrations.filter(reg => {
          const hasVirtual = reg.virtual_attendance_id;
          const hasPhysical = reg.physical_attendance_id;
          const isPresent = reg.final_attendance_status === 'present';
          
          console.log('Registration:', reg.student_data?.full_name, {
            hasVirtual,
            hasPhysical,
            isPresent,
            finalStatus: reg.final_attendance_status
          });
          
          return isPresent || (hasVirtual && hasPhysical);
        });
        
        console.log('Present students after filtering:', presentStudents); // Debug log
        console.log('Number of present students:', presentStudents.length); // Debug log
        
        setAttendeesList(presentStudents);
      } else {
        console.error('API response not successful:', response.data);
        setAttendeesList([]);
      }
    } catch (error) {
      console.error('Error fetching attendees:', error);
      setAttendeesList([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleViewAllRegistrations = async () => {
    setRegistrationsModalOpen(true);
    if (allRegistrations.length === 0) {
      await fetchAllRegistrations();
    }
  };

  const handleViewAttendees = async () => {
    setAttendeesModalOpen(true);
    if (attendeesList.length === 0) {
      await fetchAttendees();
    }
  };

  const handleViewAttendanceBreakdown = async () => {
    setAttendanceStatsModalOpen(true);
    // Attendance stats are already loaded, no need to fetch again
  };

  const toggleTeamExpansion = (teamId) => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatCompactDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatOrdinalNumber = (number) => {
    if (!number || isNaN(number)) return 'N/A';
    const num = parseInt(number);
    const suffix = ['th', 'st', 'nd', 'rd'];
    const value = num % 100;
    const ordinal = suffix[(value - 20) % 10] || suffix[value] || suffix[0];
    return (
      <span>
        {num}<sup className="text-xs">{ordinal}</sup> Semester
      </span>
    );
  };

  const filteredRegistrations = allRegistrations.filter(reg => {
    const searchMatch = !searchTerm || 
      (reg.full_name && reg.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (reg.name && reg.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (reg.email && reg.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (reg.enrollment_no && reg.enrollment_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (reg.team_name && reg.team_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const statusMatch = statusFilter === 'all' || 
      (statusFilter === 'attended' && (reg.attended || reg.attendance_status === 'attended')) ||
      (statusFilter === 'not-attended' && (!reg.attended && reg.attendance_status !== 'attended'));
    
    return searchMatch && statusMatch;
  });

  const getStatusConfig = (status) => {
    const configs = {
      ongoing: { bg: 'bg-green-100', text: 'text-green-800', icon: 'fas fa-play-circle' },
      upcoming: { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'fas fa-clock' },
      completed: { bg: 'bg-gray-100', text: 'text-gray-800', icon: 'fas fa-check-circle' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: 'fas fa-times-circle' }
    };
    return configs[status] || configs.upcoming;
  };

  const canEdit = user && ['super_admin', 'executive_admin'].includes(user.role);
  const canDelete = user && user.role === 'super_admin';
  const isReadOnly = user && user.role === 'organizer_admin';

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-16 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
          <div className="w-20 h-20 bg-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-exclamation-triangle text-2xl text-red-600"></i>
          </div>
          <h3 className="text-xl font-bold text-red-700 mb-3">Error Loading Event</h3>
          <p className="text-red-600 mb-6 max-w-md mx-auto">{error}</p>
          <div className="space-x-3">
            <button
              onClick={fetchEventDetails}
              className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              <i className="fas fa-sync mr-2"></i>Try Again
            </button>
            <button
              onClick={() => navigate('/admin/events')}
              className="inline-block px-6 py-3 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-semibold"
            >
              <i className="fas fa-arrow-left mr-2"></i>Back to Events
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout>
      
      </AdminLayout>
    );
  }

  const statusConfig = getStatusConfig(event.status);

  return (
    <AdminLayout pageTitle={`${event.event_name} - Event Management`}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          
          {/* Header Section */}
          <div className="bg-white shadow-xl rounded-lg p-8 mb-8">
            {/* Breadcrumb and Status */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center space-x-2 text-gray-600">
                <button 
                  onClick={() => navigate('/admin/events')}
                  className="hover:text-blue-600 transition-colors"
                >
                  <i className="fas fa-arrow-left mr-1"></i>Back to Events
                </button>
               
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                  <i className={`${statusConfig.icon} mr-2`}></i>{event.status?.charAt(0).toUpperCase() + event.status?.slice(1)}
                </span>
                <span className="text-sm text-gray-500">Event ID: {event.event_id}</span>
              </div>
            </div>

            {/* Main Title and Actions */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                <i className="fas fa-calendar-check text-3xl text-blue-500"></i>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.event_name}</h1>
              <p className="text-lg text-gray-600">{event.event_type} - Event Management Dashboard</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={refreshData}
                disabled={isLoading}
                className="px-6 py-3 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg hover:from-blue-500 hover:to-blue-700 transition-all font-semibold shadow-lg disabled:opacity-50"
              >
                <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-sync-alt'} mr-2`}></i>
                {isLoading ? 'Refreshing...' : 'Refresh Data'}
              </button>
              
              <button 
                onClick={() => navigate(`/admin/events/${eventId}/export`)}
                className="px-6 py-3 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-lg hover:from-green-500 hover:to-green-700 transition-all font-semibold shadow-lg"
              >
                <i className="fas fa-download mr-2"></i>Export Data
              </button>
              
              <button 
                onClick={() => navigate(`/admin/events/${eventId}/attendance`)}
                className="px-6 py-3 bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-lg hover:from-purple-500 hover:to-purple-700 transition-all font-semibold shadow-lg"
              >
                <i className="fas fa-user-check mr-2"></i>Attendance Portal
              </button>
              
              {canEdit && (
                <button 
                  onClick={() => navigate(`/admin/events/${eventId}/edit`)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg"
                >
                  <i className="fas fa-edit mr-2"></i>Edit Event
                </button>
              )}
              
              {canDelete && (
                <button 
                  onClick={() => setDeleteModalOpen(true)}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold shadow-lg"
                >
                  <i className="fas fa-trash mr-2"></i>Delete Event
                </button>
              )}
              
              <button 
                onClick={() => window.print()} 
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold shadow-lg"
              >
                <i className="fas fa-print mr-2"></i>Print Summary
              </button>
            </div>
          </div>

          {/* Read-only notice for Event Admins */}
          {isReadOnly && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8 shadow-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <i className="fas fa-info-circle text-yellow-600 text-xl"></i>
                </div>
                <div className="ml-4">
                  <h3 className="text-yellow-800 font-semibold text-lg">Read-Only Access</h3>
                  <p className="text-yellow-700 mt-1">You have read-only access to this event. You can view and export data but cannot make changes.</p>
                </div>
              </div>
            </div>
          )}

          {/* Statistics Cards */}
          {eventStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg stats-card border-l-4 border-blue-500 p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-users text-blue-500 text-xl"></i>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-500 text-sm font-medium">Total Registrations</p>
                      <p className="text-2xl font-bold text-gray-800">{eventStats.registrations_count || 0}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {eventStats.is_team_based ? 
                          `Teams: ${eventStats.total_team_registrations || 0} • Participants: ${eventStats.total_participants || 0}` :
                          `Individual Registrations: ${eventStats.total_individual_registrations || 0}`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div 
                className="bg-white rounded-lg stats-card border-l-4 border-purple-500 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer hover:bg-purple-50"
                onClick={handleViewAttendanceBreakdown}
                title="Click to view detailed attendance breakdown"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-check-circle text-purple-500 text-xl"></i>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-500 text-sm font-medium">
                        Present Count
                        {attendanceStats && (
                          <i className="fas fa-shield-check text-green-500 ml-1 text-xs" title="Dual-layer verified attendance"></i>
                        )}
                      </p>
                      <p className="text-2xl font-bold text-gray-800">
                        {attendanceStats ? attendanceStats.present_count : (eventStats?.attendance_count || 0)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {attendanceStats ? (
                          <>
                            {attendanceStats.attendance_percentage}% attendance rate
                            <br />
                            <span className="text-green-600 font-medium">Virtual + Physical verified</span>
                          </>
                        ) : (
                          <>
                            {eventStats?.registrations_count > 0 ? 
                              `${Math.round((eventStats.attendance_count / eventStats.registrations_count) * 100)}% attendance rate` :
                              '0% attendance rate'
                            }
                            <br />
                            <span className="text-yellow-600 text-xs">Legacy data (click for details)</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-purple-500">
                    <i className="fas fa-chart-pie text-lg"></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg stats-card border-l-4 border-yellow-500 p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-comments text-yellow-500 text-xl"></i>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-500 text-sm font-medium">Total Feedbacks</p>
                      <p className="text-2xl font-bold text-gray-800">{eventStats.feedback_count || 0}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {eventStats.attendance_count > 0 ? 
                          `${Math.round((eventStats.feedback_count / eventStats.attendance_count) * 100)}% feedback rate` :
                          '0% feedback rate'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg stats-card border-l-4 border-green-500 p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-certificate text-green-500 text-xl"></i>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-500 text-sm font-medium">Certificates Issued</p>
                      <p className="text-2xl font-bold text-gray-800">{eventStats.certificates_count || 0}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {eventStats.feedback_count > 0 ? 
                          `${Math.round((eventStats.certificates_count / eventStats.feedback_count) * 100)}% completion rate` :
                          '0% completion rate'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Team Event Statistics */}
          {eventStats && eventStats.total_team_members > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                <i className="fas fa-users-cog mr-2"></i>Team Event Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{eventStats.total_team_registrations || 0}</p>
                  <p className="text-sm text-blue-700">Total Teams</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{eventStats.total_team_members || 0}</p>
                  <p className="text-sm text-blue-700">Team Members</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{eventStats.total_individual_registrations || 0}</p>
                  <p className="text-sm text-blue-700">Individual Registrations</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{eventStats.total_participants || 0}</p>
                  <p className="text-sm text-blue-700">Total Participants</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Statistics */}
          {eventStats && (eventStats.payments_completed > 0 || eventStats.payments_pending > 0) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                <i className="fas fa-credit-card mr-2"></i>Payment Statistics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{eventStats.payments_completed || 0}</p>
                  <p className="text-sm text-green-700">Payments Complete</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{eventStats.payments_pending || 0}</p>
                  <p className="text-sm text-yellow-700">Payments Pending</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">
                    {((eventStats.payments_completed || 0) + (eventStats.payments_pending || 0)) > 0 ? 
                      Math.round(((eventStats.payments_completed || 0) / ((eventStats.payments_completed || 0) + (eventStats.payments_pending || 0))) * 100) :
                      0
                    }%
                  </p>
                  <p className="text-sm text-gray-700">Payment Success Rate</p>
                </div>
              </div>
            </div>
          )}

          {/* Latest Registrations Section */}
          <div className="bg-white shadow-lg rounded-lg p-8 mb-8">
            <div className="border-b border-gray-200 pb-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <i className="fas fa-user-check text-blue-500"></i>
                    Latest Registrations
                  </h2>
                  <p className="text-gray-600 mt-2">Showing the most recent {Math.min(recentRegistrations.length, 5)} registrations</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-lg font-semibold text-gray-700">
                    Total: <span className="text-blue-600">{eventStats?.registrations_count || 0}</span>
                  </div>
                  <button
                    onClick={handleViewAllRegistrations}
                    className="px-6 py-3 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg hover:from-blue-500 hover:to-blue-700 transition-all font-semibold shadow-lg flex items-center gap-2"
                  >
                    <i className="fas fa-list"></i>View All Registrations
                  </button>
                </div>
              </div>
            </div>
            
            {/* Registration Cards */}
            <div className="space-y-4">
              {console.log('Rendering registrations, count:', recentRegistrations.length, 'data:', recentRegistrations)}
              {recentRegistrations && recentRegistrations.length > 0 ? (
                eventStats?.is_team_based ? (
                  // Team Registrations Display
                  recentRegistrations.map((reg, index) => (
                    <div key={index} className="bg-white border border-blue-200 rounded-lg shadow-sm overflow-hidden">
                      {/* Team Header */}
                      <div className="grid grid-cols-6 gap-4 p-4 bg-blue-50 border-b border-blue-100">
                        <div className="col-span-2">
                          <div className="font-medium text-blue-900 flex items-center gap-2">
                            <i className="fas fa-users text-blue-500"></i>{reg.team_name}
                          </div>
                          <div className="text-sm text-blue-700">{reg.member_count} members</div>
                        </div>
                        <div className="col-span-2">
                          <div className="font-medium text-gray-900">{reg.name}</div>
                          <div className="text-sm text-gray-600">Team Leader</div>
                        </div>
                        <div className="col-span-1 text-gray-700">
                          <div className="text-gray-900">{formatDateTime(reg.registration_date)}</div>
                        </div>
                        <div className="col-span-1 text-right">
                          <button
                            onClick={() => toggleTeamExpansion(`recent-${index}`)}
                            className="px-3 py-1 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <i className={`fas ${expandedTeams.has(`recent-${index}`) ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                            <span className="ml-1">{expandedTeams.has(`recent-${index}`) ? 'Hide' : 'Show'} Details</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Team Members - Hidden by default */}
                      {expandedTeams.has(`recent-${index}`) && reg.team_members && (
                        <div className="p-4 bg-gray-50">
                          <div className="text-sm font-medium text-gray-700 mb-3">Team Members:</div>
                          <div className="space-y-2">
                            {reg.team_members.map((member, memberIndex) => (
                              <div key={memberIndex} className="grid grid-cols-12 gap-2 py-2 px-3 border-b border-gray-200 last:border-0 hover:bg-white rounded transition-colors">
                                <div className="col-span-3 font-medium text-gray-900 text-sm min-w-0 pr-1">
                                  <div className="break-words leading-tight whitespace-normal" title={member.full_name}>
                                    {member.full_name}
                                    {member.registration_type === "team_leader" && (
                                      <span className="ml-1 text-xs bg-blue-100 text-blue-800 py-0.5 px-1.5 rounded-full">Leader</span>
                                    )}
                                  </div>
                                </div>
                                <div className="col-span-2 text-gray-700 text-sm font-mono min-w-0 pr-1">
                                  <div className="break-words leading-tight whitespace-normal" title={member.enrollment_no}>
                                    {member.enrollment_no}
                                  </div>
                                </div>
                                <div className="col-span-3 text-gray-700 text-sm min-w-0 pr-1">
                                  <div className="break-words leading-tight whitespace-normal" title={member.department}>
                                    {member.department}
                                  </div>
                                </div>
                                <div className="col-span-1 text-gray-700 text-xs text-center font-medium min-w-0">
                                  <div className="break-words leading-tight whitespace-normal">
                                    {formatOrdinalNumber(member.semester)}
                                  </div>
                                </div>
                                <div className="col-span-3 text-gray-700 text-sm min-w-0 pr-1">
                                  <div className="break-words leading-tight whitespace-normal" title={member.email}>
                                    {(member.email || '').trim()}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  // Individual Registrations Display
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    {/* Table Headers */}
                    <div className="grid grid-cols-12 gap-1 py-4 px-4 border-b-2 border-gray-200 bg-gray-50 font-semibold text-gray-700">
                      <div className="col-span-2 flex items-center gap-2 min-w-0">
                        <i className="fas fa-user text-gray-500 text-xs flex-shrink-0"></i>
                        <span className="text-sm truncate">Name</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-2 min-w-0">
                        <i className="fas fa-id-card text-gray-500 text-xs flex-shrink-0"></i>
                        <span className="text-sm truncate">Enrollment</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-2 min-w-0">
                        <i className="fas fa-building text-gray-500 text-xs flex-shrink-0"></i>
                        <span className="text-sm truncate">Department</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-center gap-1 min-w-0">
                        <i className="fas fa-layer-group text-gray-500 text-xs flex-shrink-0"></i>
                        <span className="text-xs">Semester</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-2 min-w-0">
                        <i className="fas fa-envelope text-gray-500 text-xs flex-shrink-0"></i>
                        <span className="text-sm truncate">Email</span>
                      </div>
                      <div className="col-span-1 flex items-center gap-1 min-w-0">
                        <i className="fas fa-calendar text-gray-500 text-xs flex-shrink-0"></i>
                        <span className="text-xs">Date</span>
                      </div>
                    </div>
                    
                    {/* Registration Rows */}
                    <div className="bg-white">
                      {recentRegistrations.slice(0, 5).map((reg, index) => (
                        <div key={index} className="grid grid-cols-12 gap-1 py-3 px-4 border-b border-gray-100 hover:bg-gray-50 transition-colors last:border-0">
                          <div className="col-span-2 font-medium text-gray-900 text-sm min-w-0 pr-2">
                            <div className="break-words leading-tight" title={reg.full_name || reg.name}>
                              {reg.full_name || reg.name || 'N/A'}
                            </div>
                          </div>
                          <div className="col-span-2 text-gray-700 text-sm font-mono min-w-0 pr-2">
                            <div className="break-words leading-tight" title={reg.enrollment_no}>
                              {reg.enrollment_no || 'N/A'}
                            </div>
                          </div>
                          <div className="col-span-2 text-gray-700 text-sm min-w-0 pr-2">
                            <div className="break-words leading-tight" title={reg.department}>
                              {reg.department || 'N/A'}
                            </div>
                          </div>
                          <div className="col-span-2 text-gray-700 text-xs text-center font-medium min-w-0">
                            <div className="break-words leading-tight whitespace-normal">
                              {formatOrdinalNumber(reg.semester) || 'N/A'}
                            </div>
                          </div>
                          <div className="col-span-2 text-gray-700 text-sm min-w-0 pr-2">
                            <div className="break-words leading-tight whitespace-normal" title={reg.email}>
                              {(reg.email || 'N/A').trim()}
                            </div>
                          </div>
                          <div className="col-span-1 text-gray-700 text-xs  font-medium min-w-0">
                            <div className="text-nowrap text-right leading-tight" title={formatDateTime(reg.registration_date)}>
                              {formatDateTime(reg.registration_date) || 'N/A'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <i className="fas fa-users text-2xl text-gray-400"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recent Registrations</h3>
                  <p className="text-gray-600 mb-4">
                    {eventStats?.registrations_count > 0 
                      ? `There are ${eventStats.registrations_count} total registrations, but none showing in recent list.`
                      : 'No one has registered for this event yet.'
                    }
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => fetchEventDetails()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <i className="fas fa-sync mr-2"></i>Refresh Data
                    </button>
                    {eventStats?.registrations_count > 0 && (
                      <button
                        onClick={handleViewAllRegistrations}
                        className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <i className="fas fa-list mr-2"></i>View All Registrations
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Event Details Section */}
          

          {/* Detailed Event Information - Copied from EventCreatedSuccess */}
          <div className="bg-white shadow-lg rounded-lg p-8 mb-8">
            <div className="border-b border-gray-200 pb-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <i className="fas fa-info-circle text-blue-500"></i>
                Event Details
              </h2>
              <p className="text-gray-600 mt-2">Comprehensive event information and configuration</p>
            </div>

            {/* Event Header with Enhanced Badges */}
            <div className="text-center mb-8 p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl border-2 border-blue-200 shadow-lg">
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{event.event_name}</h3>
                <p className="text-gray-600 text-lg">Event ID: <span className="font-mono font-semibold text-blue-700">{event.event_id}</span></p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-2 border-blue-300 shadow-sm">
                  <i className="fas fa-tag mr-2"></i>
                  {event.event_type?.charAt(0).toUpperCase() + event.event_type?.slice(1) || 'N/A'}
                </span>
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-2 border-green-300 shadow-sm">
                  <i className="fas fa-users mr-2"></i>
                  {event.target_audience?.charAt(0).toUpperCase() + event.target_audience?.slice(1) || 'N/A'}
                </span>
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-2 border-purple-300 shadow-sm">
                  <i className="fas fa-globe mr-2"></i>
                  {event.mode?.charAt(0).toUpperCase() + event.mode?.slice(1) || 'N/A'}
                </span>
                {event.is_xenesis_event && (
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border-2 border-amber-300 shadow-sm">
                    <i className="fas fa-star mr-2"></i>
                    Xenesis Event
                  </span>
                )}
                {event.status && (
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold shadow-sm ${
                    event.status === 'upcoming' ? 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border-2 border-emerald-300' :
                    event.status === 'ongoing' ? 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border-2 border-orange-300' :
                    event.status === 'completed' ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-2 border-gray-300' :
                    'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-2 border-red-300'
                  }`}>
                    <i className="fas fa-circle mr-2"></i>
                    {event.status?.charAt(0).toUpperCase() + event.status?.slice(1)}
                  </span>
                )}
              </div>
            </div>

            {/* Enhanced Two Column Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-8">
                {/* Basic Information - Enhanced */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200 shadow-lg">
                  <h4 className="text-xl font-bold text-blue-900 mb-6 flex items-center">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                      <i className="fas fa-clipboard-list text-white"></i>
                    </div>
                    1. Basic Information
                  </h4>
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-blue-700">Event Type:</span>
                        <span className="text-sm text-blue-900 text-right max-w-[60%] font-medium">
                          {event.event_type?.charAt(0).toUpperCase() + event.event_type?.slice(1) || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-blue-700">Target Audience:</span>
                        <span className="text-sm text-blue-900 text-right max-w-[60%] font-medium">
                          {event.target_audience?.charAt(0).toUpperCase() + event.target_audience?.slice(1) || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-blue-700">Short Description:</span>
                        <span className="text-sm text-blue-900 text-right max-w-[60%] font-medium">
                          {event.short_description || 'N/A'}
                        </span>
                      </div>
                    </div>
                    {event.detailed_description && (
                      <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                        <span className="text-sm font-bold text-blue-700 block mb-3">Detailed Description:</span>
                        <p className="text-sm text-blue-900 whitespace-pre-line leading-relaxed">{event.detailed_description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Schedule - Enhanced */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200 shadow-lg">
                  <h4 className="text-xl font-bold text-green-900 mb-6 flex items-center">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                      <i className="fas fa-calendar-alt text-white"></i>
                    </div>
                    2. Schedule
                  </h4>
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-green-700">Event Start:</span>
                        <span className="text-sm text-green-900 text-right max-w-[60%] font-medium">
                          {formatDateTime(event.start_datetime)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-green-700">Event End:</span>
                        <span className="text-sm text-green-900 text-right max-w-[60%] font-medium">
                          {formatDateTime(event.end_datetime)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-green-700">Registration Opens:</span>
                        <span className="text-sm text-green-900 text-right max-w-[60%] font-medium">
                          {formatDateTime(event.registration_start_date)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-green-700">Registration Closes:</span>
                        <span className="text-sm text-green-900 text-right max-w-[60%] font-medium">
                          {formatDateTime(event.registration_end_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                {/* Venue & Location - Enhanced */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border-2 border-red-200 shadow-lg">
                  <h4 className="text-xl font-bold text-red-900 mb-6 flex items-center">
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center mr-3">
                      <i className="fas fa-map-marker-alt text-white"></i>
                    </div>
                    3. Venue & Location
                  </h4>
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-red-200 shadow-sm">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-red-700">Event Mode:</span>
                        <span className="text-sm text-red-900 text-right max-w-[60%] font-medium">
                          {event.mode?.charAt(0).toUpperCase() + event.mode?.slice(1) || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-red-200 shadow-sm">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-red-700">
                          {event.mode === 'online' ? 'Platform/Link:' : 'Venue/Location:'}
                        </span>
                        <span className="text-sm text-red-900 text-right max-w-[60%] font-medium">
                          {event.venue || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Organizer & Contact Information - Enhanced */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200 shadow-lg">
                  <h4 className="text-xl font-bold text-purple-900 mb-6 flex items-center">
                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                      <i className="fas fa-users text-white"></i>
                    </div>
                    4. Organizer & Contact Information
                  </h4>
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-purple-700">Organizing Department:</span>
                        <span className="text-sm text-purple-900 text-right max-w-[60%] font-medium">
                          {event.organizing_department || 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Event Organizers - Check multiple possible data sources */}
                    {((event.organizer_details && event.organizer_details.length > 0) || 
                      (event.organizers && event.organizers.length > 0) ||
                      (event.faculty_organizers && event.faculty_organizers.length > 0)) && (
                      <div className="mt-4">
                        <span className="text-sm font-medium text-gray-600 block mb-3">Event Organizers:</span>
                        <div className="space-y-3">
                          {/* First try organizer_details */}
                          {event.organizer_details && event.organizer_details.length > 0 ? (
                            event.organizer_details.map((organizer, index) => (
                              <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 shadow-sm">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="text-sm font-bold text-purple-900 flex items-center gap-2">
                                      <i className="fas fa-user-tie text-purple-600"></i>
                                      {index + 1}. {organizer.name || organizer.full_name || 'Unnamed Organizer'}
                                    </div>
                                    {organizer.email && (
                                      <div className="text-xs text-purple-700 mt-1 flex items-center gap-1">
                                        <i className="fas fa-envelope text-purple-500"></i>
                                        {organizer.email}
                                      </div>
                                    )}
                                    {organizer.employee_id && (
                                      <div className="text-xs text-purple-700 mt-1 flex items-center gap-1">
                                        <i className="fas fa-id-badge text-purple-500"></i>
                                        Employee ID: {organizer.employee_id}
                                      </div>
                                    )}
                                    {organizer.department && (
                                      <div className="text-xs text-purple-700 mt-1 flex items-center gap-1">
                                        <i className="fas fa-building text-purple-500"></i>
                                        {organizer.department}
                                      </div>
                                    )}
                                  </div>
                                  {organizer.isNew && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                      <i className="fas fa-star text-amber-600 mr-1"></i>
                                      New Organizer
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : event.organizers && event.organizers.length > 0 ? (
                            // Fallback to organizers array
                            event.organizers.map((organizer, index) => (
                              <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 shadow-sm">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="text-sm font-bold text-purple-900 flex items-center gap-2">
                                      <i className="fas fa-user-tie text-purple-600"></i>
                                      {index + 1}. {typeof organizer === 'string' ? organizer : organizer.name || organizer.email || 'Unknown Organizer'}
                                    </div>
                                    {typeof organizer === 'object' && organizer.email && (
                                      <div className="text-xs text-purple-700 mt-1 flex items-center gap-1">
                                        <i className="fas fa-envelope text-purple-500"></i>
                                        {organizer.email}
                                      </div>
                                    )}
                                    {typeof organizer === 'object' && organizer.employee_id && (
                                      <div className="text-xs text-purple-700 mt-1 flex items-center gap-1">
                                        <i className="fas fa-id-badge text-purple-500"></i>
                                        Employee ID: {organizer.employee_id}
                                      </div>
                                    )}
                                  </div>
                                  {typeof organizer === 'object' && organizer.isNew && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                      <i className="fas fa-star text-amber-600 mr-1"></i>
                                      New Organizer
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : event.faculty_organizers && event.faculty_organizers.length > 0 ? (
                            // Fallback to faculty_organizers array (just IDs)
                            event.faculty_organizers.map((facultyId, index) => (
                              <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 shadow-sm">
                                <div className="text-sm font-bold text-purple-900 flex items-center gap-2">
                                  <i className="fas fa-user-tie text-purple-600"></i>
                                  {index + 1}. Faculty Organizer
                                </div>
                                <div className="text-xs text-purple-700 mt-1 flex items-center gap-1">
                                  <i className="fas fa-id-badge text-purple-500"></i>
                                  Faculty ID: {facultyId}
                                </div>
                              </div>
                            ))
                          ) : null}
                        </div>
                      </div>
                    )}
                    
                    {/* Contact Information */}
                    {event.contacts && event.contacts.length > 0 && (
                      <div className="mt-6">
                        <span className="text-sm font-medium text-gray-600 block mb-3">Contact Information:</span>
                        <div className="space-y-2">
                          {event.contacts.map((contact, index) => (
                            <div key={index} className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-sm">
                              <div className="flex items-center gap-3">
                                <i className="fas fa-phone text-blue-600"></i>
                                <div className="flex-1">
                                  <span className="text-sm font-medium text-blue-900">{contact.name}</span>
                                  <span className="text-sm text-blue-700 ml-2">{contact.contact}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fallback if no organizers found */}
                    {!((event.organizer_details && event.organizer_details.length > 0) || 
                       (event.organizers && event.organizers.length > 0) ||
                       (event.faculty_organizers && event.faculty_organizers.length > 0)) && (
                      <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2 text-amber-800">
                          <i className="fas fa-exclamation-triangle"></i>
                          <span className="text-sm font-medium">No organizer information available</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Registration & Certificate Details - Enhanced */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border-2 border-amber-200 shadow-lg">
                  <h4 className="text-xl font-bold text-amber-900 mb-6 flex items-center">
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center mr-3">
                      <i className="fas fa-certificate text-white"></i>
                    </div>
                    5. Registration & Certificate Details
                  </h4>
                  
                  {/* Registration Settings */}
                  <div className="mb-6">
                    <span className="text-lg font-bold text-amber-800 block mb-4">Registration Settings:</span>
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg p-3 border border-amber-200 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-amber-700">Registration Type:</span>
                          <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                            event.is_paid ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {event.is_paid ? '💰 Paid' : '🆓 Free'}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-amber-200 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-amber-700">Registration Mode:</span>
                          <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                            event.is_team_based ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {event.is_team_based ? '👥 Team' : '👤 Individual'}
                          </span>
                        </div>
                      </div>
                      {event.registration_fee && (
                        <div className="bg-white rounded-lg p-3 border border-amber-200 shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-amber-700">Registration Fee:</span>
                            <span className="text-sm font-bold text-amber-900">₹{event.registration_fee}</span>
                          </div>
                        </div>
                      )}
                      <div className="bg-white rounded-lg p-3 border border-amber-200 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-amber-700">Min Participants:</span>
                          <span className="text-sm font-bold text-amber-900">{event.min_participants || 1}</span>
                        </div>
                      </div>
                      {event.max_participants && (
                        <div className="bg-white rounded-lg p-3 border border-amber-200 shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-amber-700">Max Participants:</span>
                            <span className="text-sm font-bold text-amber-900">{event.max_participants}</span>
                          </div>
                        </div>
                      )}
                      {event.is_team_based && (
                        <>
                          <div className="bg-white rounded-lg p-3 border border-amber-200 shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-amber-700">Min Team Size:</span>
                              <span className="text-sm font-bold text-amber-900">{event.team_size_min || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-amber-200 shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-amber-700">Max Team Size:</span>
                              <span className="text-sm font-bold text-amber-900">{event.team_size_max || 'N/A'}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Certificate & Resources */}
                  <div>
                    <span className="text-lg font-bold text-amber-800 block mb-4 pt-4 border-t-2 border-amber-300">
                      Certificate & Resources:
                    </span>
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg p-3 border border-amber-200 shadow-sm">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-bold text-amber-700">Certificate Template:</span>
                          <span className="text-sm font-bold text-amber-900 text-right max-w-[60%]">
                            {event.certificate_template?.name || 
                             event.certificate_template_name || 
                             (event.certificate_template && typeof event.certificate_template === 'string' ? event.certificate_template : null) ||
                             'No template selected'}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-amber-200 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-amber-700">Certificate Status:</span>
                          <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                            (event.certificate_template?.name || 
                             event.certificate_template_name || 
                             event.certificate_template) ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {(event.certificate_template?.name || 
                              event.certificate_template_name || 
                              event.certificate_template) ? '✅ Template Available' : '⚠️ Template Required'}
                          </span>
                        </div>
                      </div>
                      {event.assets && event.assets.length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-amber-200 shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-amber-700">Additional Assets:</span>
                            <span className="text-sm font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                              📎 {event.assets.length} file(s) uploaded
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="bg-white rounded-lg p-3 border border-amber-200 shadow-sm">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-bold text-amber-700">Certificate Available Until:</span>
                          <span className="text-sm font-bold text-amber-900 text-right max-w-[60%]">
                            {formatDateTime(event.certificate_end_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Requirements & Additional Information - Enhanced */}
            {(event.prerequisites || event.what_to_bring) && (
              <div className="mt-8 p-8 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border-2 border-indigo-200 shadow-lg">
                <h4 className="text-2xl font-bold text-indigo-900 mb-6 flex items-center">
                  <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center mr-4">
                    <i className="fas fa-clipboard-check text-white text-lg"></i>
                  </div>
                  6. Requirements & Additional Information
                </h4>
                <div className="space-y-6">
                  {event.prerequisites && (
                    <div className="bg-white rounded-xl p-6 border-2 border-indigo-200 shadow-md">
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center mr-3">
                          <i className="fas fa-check-circle text-white text-sm"></i>
                        </div>
                        <span className="text-lg font-bold text-indigo-800">Prerequisites</span>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                        <p className="text-sm text-indigo-900 whitespace-pre-line leading-relaxed font-medium">{event.prerequisites}</p>
                      </div>
                    </div>
                  )}
                  {event.what_to_bring && (
                    <div className="bg-white rounded-xl p-6 border-2 border-indigo-200 shadow-md">
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center mr-3">
                          <i className="fas fa-briefcase text-white text-sm"></i>
                        </div>
                        <span className="text-lg font-bold text-indigo-800">What to Bring</span>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                        <p className="text-sm text-indigo-900 whitespace-pre-line leading-relaxed font-medium">{event.what_to_bring}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {deleteModalOpen && (
            <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">
              <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Event</h3>
                  <p className="text-gray-600 mb-4">
                    Are you sure you want to delete "{event.event_name}"? This action cannot be undone.
                  </p>
                  
                  {/* Warning about registrations */}
                  {recentRegistrations && recentRegistrations.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center text-amber-800">
                        <i className="fas fa-exclamation-triangle mr-2"></i>
                        <span className="text-sm font-medium">Warning</span>
                      </div>
                      <p className="text-amber-700 text-sm mt-1">
                        This event has {recentRegistrations.length} registration(s). 
                        Deletion will fail if registrations exist.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setDeleteModalOpen(false)}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteEvent}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View All Registrations Modal */}
          {registrationsModalOpen && (
            <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900">{event?.event_name} - All Registrations</h3>
                  <button
                    onClick={() => setRegistrationsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>
                
                {/* Modal Content */}
                <div className="p-6 overflow-y-auto flex-grow">
                  <div className="mb-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <SearchBox
                        placeholder="Search registrations..."
                        value={searchTerm}
                        onChange={(value) => setSearchTerm(value)}
                        showFilters={false}
                        size="md"
                      />
                      <Dropdown
                        options={[
                          { value: "all", label: "All Registrations" },
                          { value: "attended", label: "Attended Only" },
                          { value: "not-attended", label: "Not Attended" }
                        ]}
                        value={statusFilter}
                        onChange={(value) => setStatusFilter(value)}
                        placeholder="Filter by status"
                      />
                    </div>
                    <div className="text-gray-600 font-medium">
                      Total: <span>{filteredRegistrations.length}</span>
                    </div>
                  </div>
                  
                  {/* Modal Table Container */}
                  <div className="overflow-x-auto">
                    {modalLoading ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-gray-600">Loading registrations...</p>
                      </div>
                    ) : filteredRegistrations.length > 0 ? (
                      eventStats?.is_team_based ? (
                        // Team Registrations in Modal
                        <div className="space-y-4">
                          {filteredRegistrations.map((team, index) => (
                            <div key={index} className="bg-white border border-blue-200 rounded-lg shadow-sm overflow-hidden">
                              <div className="grid grid-cols-5 gap-4 p-4 bg-blue-50 border-b border-blue-100">
                                <div className="col-span-1">
                                  <div className="font-medium text-blue-900 flex items-center gap-2">
                                    <i className="fas fa-users text-blue-500"></i>{team.team_name}
                                  </div>
                                  <div className="text-sm text-blue-700">{team.member_count} members</div>
                                </div>
                                <div className="col-span-2">
                                  <div className="font-medium text-gray-900">
                                    {team.members?.find(m => m.registration_type === 'team_leader')?.full_name || 'N/A'}
                                  </div>
                                  <div className="text-sm text-gray-600">Team Leader</div>
                                </div>
                                <div className="col-span-1 text-gray-700">
                                  {formatDateTime(team.registration_date)}
                                </div>
                                <div className="col-span-1 text-right">
                                  <button
                                    onClick={() => toggleTeamExpansion(`modal-${index}`)}
                                    className="px-3 py-1 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                  >
                                    <i className={`fas ${expandedTeams.has(`modal-${index}`) ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                                    <span className="ml-1">{expandedTeams.has(`modal-${index}`) ? 'Hide' : 'Show'} Details</span>
                                  </button>
                                </div>
                              </div>
                              
                              {expandedTeams.has(`modal-${index}`) && team.members && (
                                <div className="p-4 bg-gray-50">
                                  <div className="text-sm font-medium text-gray-700 mb-3">Team Members:</div>
                                  <div className="space-y-3">
                                    {team.members.map((member, memberIndex) => (
                                      <div key={memberIndex} className="grid grid-cols-6 gap-3 border-b border-gray-100 pb-2 last:border-0">
                                        <div className="col-span-2 font-medium text-gray-900">
                                          {member.full_name}
                                          {member.registration_type === 'team_leader' && (
                                            <span className="ml-1 text-xs bg-blue-100 text-blue-800 py-0.5 px-1.5 rounded-full">Leader</span>
                                          )}
                                        </div>
                                        <div className="col-span-1 text-gray-700">{member.enrollment_no}</div>
                                        <div className="col-span-1 text-gray-700">{member.department}</div>
                                        <div className="col-span-1 text-gray-700">{formatOrdinalNumber(member.semester)}</div>
                                        <div className="col-span-1 text-gray-700 truncate" title={member.email}>{member.email}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Individual Registrations in Modal
                        <div className="overflow-hidden">
                          <table className="w-full table-fixed border-collapse">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="w-[20%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <i className="fas fa-user text-xs"></i>Name
                                  </div>
                                </th>
                                <th className="w-[15%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <i className="fas fa-id-card text-xs"></i>Enrollment
                                  </div>
                                </th>
                                <th className="w-[18%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <i className="fas fa-building text-xs"></i>Department
                                  </div>
                                </th>
                                <th className="w-[15%] px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                  <div className="flex items-center  gap-1">
                                    <i className="fas fa-layer-group text-xs"></i>Semester
                                  </div>
                                </th>
                                <th className="w-[18%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <i className="fas fa-envelope text-xs"></i>Email
                                  </div>
                                </th>
                                <th className="w-[18%] px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  <div className="flex items-center  gap-1">
                                    <i className="fas fa-calendar text-xs"></i>Date
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filteredRegistrations.map((reg, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="w-[20%] px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-100">
                                    <div className="break-words leading-tight whitespace-normal" title={reg.full_name || reg.name}>
                                      {reg.full_name || reg.name}
                                    </div>
                                  </td>
                                  <td className="w-[15%] px-3 py-3 text-sm text-gray-700 font-mono border-r border-gray-100">
                                    <div className="break-words leading-tight whitespace-normal" title={reg.enrollment_no}>
                                      {reg.enrollment_no}
                                    </div>
                                  </td>
                                  <td className="w-[18%] px-3 py-3 text-sm text-gray-700 border-r border-gray-100">
                                    <div className="break-words leading-tight whitespace-normal" title={reg.department}>
                                      {reg.department}
                                    </div>
                                  </td>
                                  <td className="w-[8%] px-2 py-3 text-xs text-gray-700  font-medium border-r border-gray-100">
                                    <div className="break-words leading-tight whitespace-normal">
                                      {formatOrdinalNumber(reg.semester)}
                                    </div>
                                  </td>
                                  <td className="w-[28%] px-3 py-3 text-sm text-gray-700 border-r border-gray-100">
                                    <div className="break-words leading-tight whitespace-normal" title={reg.email}>
                                      {(reg.email || '').trim()}
                                    </div>
                                  </td>
                                  <td className="w-[11%] px-2 py-3 text-xs text-gray-700">
                                    <div className="leading-tight" title={formatDateTime(reg.registration_date)}>
                                      {formatDateTime(reg.registration_date)}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-8">
                        <i className="fas fa-search text-gray-400 text-3xl mb-3"></i>
                        <p className="text-gray-600">No registrations found matching your search criteria.</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() => setRegistrationsModalOpen(false)}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Attendees Modal */}
          {attendeesModalOpen && (
            <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <i className="fas fa-check-double text-green-500"></i>
                      Present Students
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {attendeesList.length} students with both virtual and physical attendance for {event?.event_name}
                    </p>
                  </div>
                  <button
                    onClick={() => setAttendeesModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                
                {/* Modal Content */}
                <div className="flex-1 p-6 overflow-auto">
                  {modalLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <i className="fas fa-spinner fa-spin text-3xl text-green-500 mr-3"></i>
                      <span className="text-lg text-gray-600">Loading present students...</span>
                    </div>
                  ) : attendeesList.length > 0 ? (
                    <div className="space-y-4">
                      {/* Attendees Table */}
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-green-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider min-w-[280px]">Student Details</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider min-w-[220px]">Contact Information</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Semester</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider min-w-[200px]">Attendance Timeline</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {attendeesList.map((attendee, index) => (
                              <tr key={index} className="hover:bg-green-50 transition-colors">
                                {/* Student Details Column */}
                                <td className="px-6 py-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                                      <span className="text-white font-semibold text-sm">
                                        {(attendee.student_data?.full_name || attendee.full_name || attendee.name)?.charAt(0)?.toUpperCase() || 'S'}
                                      </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-semibold text-gray-900 truncate leading-tight">
                                        {attendee.student_data?.full_name || attendee.full_name || attendee.name || 'N/A'}
                                      </div>
                                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                                        <span className="font-mono">{attendee.student_data?.enrollment_no || attendee.enrollment_no || 'N/A'}</span>
                                        <span className="truncate">{attendee.student_data?.department || attendee.department || 'No Dept'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                
                                {/* Contact Information Column */}
                                <td className="px-6 py-4">
                                  <div className="space-y-1">
                                    <div className="text-sm text-gray-700 truncate flex items-center" title={attendee.student_data?.email || attendee.email}>
                                      <i className="fas fa-envelope text-green-500 mr-2 w-4"></i>
                                      <span className="truncate">{attendee.student_data?.email || attendee.email || 'N/A'}</span>
                                    </div>
                                    <div className="text-sm text-gray-700 flex items-center" title={attendee.student_data?.mobile_no || attendee.mobile_no || attendee.phone}>
                                      <i className="fas fa-phone text-blue-500 mr-2 w-4"></i>
                                      <span>{attendee.student_data?.mobile_no || attendee.mobile_no || attendee.phone || 'N/A'}</span>
                                    </div>
                                  </div>
                                </td>
                                
                                {/* Semester Column */}
                                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {formatOrdinalNumber(attendee.student_data?.semester || attendee.semester) || 'N/A'}
                                  </span>
                                </td>
                                
                                {/* Attendance Timeline Column */}
                                <td className="px-6 py-4">
                                  <div className="space-y-2">
                                    {/* Virtual Attendance */}
                                    <div className="flex items-center text-sm">
                                      <div className="flex items-center min-w-[90px]">
                                        <i className="fas fa-desktop text-green-500 mr-2 w-4"></i>
                                        <span className="text-green-600 font-medium text-xs">Virtual:</span>
                                      </div>
                                      <span className="text-gray-700 ml-2">
                                        {attendee.virtual_attendance_timestamp ? formatCompactDateTime(attendee.virtual_attendance_timestamp) : 'Not marked'}
                                      </span>
                                    </div>
                                    
                                    {/* Physical Attendance */}
                                    <div className="flex items-center text-sm">
                                      <div className="flex items-center min-w-[90px]">
                                        <i className="fas fa-user-check text-blue-500 mr-2 w-4"></i>
                                        <span className="text-blue-600 font-medium text-xs">Physical:</span>
                                      </div>
                                      <span className="text-gray-700 ml-2">
                                        {attendee.physical_attendance_timestamp ? formatCompactDateTime(attendee.physical_attendance_timestamp) : 'Not marked'}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                        <i className="fas fa-check-double text-2xl text-green-500"></i>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Present Students Yet</h3>
                      <p className="text-gray-500">No students have completed both virtual and physical attendance verification yet.</p>
                    </div>
                  )}
                </div>
                
                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() => setAttendeesModalOpen(false)}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Breakdown Modal */}
          {attendanceStatsModalOpen && (
            <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <i className="fas fa-chart-pie text-purple-500"></i>
                      Attendance Breakdown
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Detailed dual-layer attendance statistics for {event?.event_name}
                    </p>
                  </div>
                  <button
                    onClick={() => setAttendanceStatsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                
                {/* Modal Content */}
                <div className="flex-1 p-6 overflow-auto">
                  {attendanceStats ? (
                    <div className="space-y-6">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">{attendanceStats.present_count}</div>
                          <div className="text-sm font-medium text-green-700">Present</div>
                          <div className="text-xs text-green-600 mt-1">Both Virtual & Physical</div>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">{attendanceStats.virtual_only_count}</div>
                          <div className="text-sm font-medium text-blue-700">Virtual Only</div>
                          <div className="text-xs text-blue-600 mt-1">Self-marked attendance</div>
                        </div>
                        
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-orange-600">{attendanceStats.physical_only_count}</div>
                          <div className="text-sm font-medium text-orange-700">Physical Only</div>
                          <div className="text-xs text-orange-600 mt-1">Admin verified only</div>
                        </div>
                        
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-red-600">{attendanceStats.absent_count}</div>
                          <div className="text-sm font-medium text-red-700">Absent</div>
                          <div className="text-xs text-red-600 mt-1">No attendance</div>
                        </div>
                      </div>

                      {/* Data Validation Status */}
                      {attendanceStats._fetchedAt && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                          <div className="flex items-center">
                            <i className="fas fa-shield-check text-green-600 mr-2"></i>
                            <div>
                              <div className="text-sm font-medium text-green-800">Data Validated & Current</div>
                              <div className="text-xs text-green-600">
                                Dual-layer attendance system • Fetched at {new Date(attendanceStats._fetchedAt).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Detailed Breakdown */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Analytics</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Total Statistics */}
                          <div className="space-y-4">
                            <h4 className="font-medium text-gray-700">Total Statistics</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                <span className="text-gray-600">Total Registrations:</span>
                                <span className="font-semibold text-gray-900">{attendanceStats.total_registrations}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                <span className="text-gray-600">Virtual Attendance:</span>
                                <span className="font-semibold text-blue-600">{attendanceStats.virtual_attendance_count}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                <span className="text-gray-600">Physical Attendance:</span>
                                <span className="font-semibold text-orange-600">{attendanceStats.physical_attendance_count}</span>
                              </div>
                              <div className="flex justify-between items-center py-2">
                                <span className="text-gray-600">Overall Attendance Rate:</span>
                                <span className="font-semibold text-purple-600">{attendanceStats.attendance_percentage}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Status Breakdown */}
                          <div className="space-y-4">
                            <h4 className="font-medium text-gray-700">Status Breakdown</h4>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 bg-green-100 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <i className="fas fa-check-double text-green-600"></i>
                                  <span className="font-medium text-green-700">Present (Both)</span>
                                </div>
                                <span className="font-bold text-green-600">{attendanceStats.present_count}</span>
                              </div>
                              
                              <div className="flex items-center justify-between p-3 bg-blue-100 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <i className="fas fa-laptop text-blue-600"></i>
                                  <span className="font-medium text-blue-700">Virtual Only</span>
                                </div>
                                <span className="font-bold text-blue-600">{attendanceStats.virtual_only_count}</span>
                              </div>
                              
                              <div className="flex items-center justify-between p-3 bg-orange-100 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <i className="fas fa-user-check text-orange-600"></i>
                                  <span className="font-medium text-orange-700">Physical Only</span>
                                </div>
                                <span className="font-bold text-orange-600">{attendanceStats.physical_only_count}</span>
                              </div>
                              
                              <div className="flex items-center justify-between p-3 bg-red-100 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <i className="fas fa-user-times text-red-600"></i>
                                  <span className="font-medium text-red-700">Absent</span>
                                </div>
                                <span className="font-bold text-red-600">{attendanceStats.absent_count}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Information Box */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <i className="fas fa-info-circle text-blue-500 text-lg mt-0.5"></i>
                          <div className="text-blue-800">
                            <h4 className="font-semibold mb-1">Understanding Attendance Status</h4>
                            <ul className="text-sm space-y-1">
                              <li><strong>Present:</strong> Students who have marked both virtual attendance (self-marked) and physical attendance (admin verified)</li>
                              <li><strong>Virtual Only:</strong> Students who self-marked attendance but haven't been physically verified</li>
                              <li><strong>Physical Only:</strong> Students who were verified by admin but didn't self-mark attendance</li>
                              <li><strong>Absent:</strong> Students who haven't marked any form of attendance</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-center gap-4 pt-4">
                        <button
                          onClick={handleViewAttendees}
                          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <i className="fas fa-users"></i>
                          View All Attendees
                        </button>                        
                        <button
                          onClick={() => navigate(`/admin/events/${eventId}/attendance`)}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <i className="fas fa-user-check"></i>
                          Attendance Portal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <i className="fas fa-chart-pie text-2xl text-gray-400"></i>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Data</h3>
                      <p className="text-gray-500">Attendance statistics are not available for this event yet.</p>
                    </div>
                  )}
                </div>
                
                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() => setAttendanceStatsModalOpen(false)}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default EventDetail;

