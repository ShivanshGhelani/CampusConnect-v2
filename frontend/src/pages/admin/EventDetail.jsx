import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/admin';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Clock, Users, MapPin, Mail, Phone, FileText, Award, CreditCard, ArrowLeft, RefreshCw, Download, UserCheck, Edit3, FileDown, Trash2,MoreHorizontal } from 'lucide-react';
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
  const [showMoreActions, setShowMoreActions] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

    const ActionButton = ({ onClick, variant = 'secondary', icon: Icon, children, disabled = false, className = "" }) => {
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
      secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300',
      success: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
      warning: 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600',
      danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600'
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          inline-flex items-center px-4 py-2 border rounded-lg font-medium text-sm
          transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variants[variant]} ${className}
        `}
      >
        {Icon && <Icon className={`w-4 h-4 ${children ? 'mr-2' : ''}`} />}
        {children}
      </button>
    );
  };

  const DropdownMenu = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
      <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
        <div className="py-1">
          {children}
        </div>
      </div>
    );
  };

  const DropdownItem = ({ onClick, icon: Icon, children, variant = 'default' }) => {
    const variants = {
      default: 'text-gray-700 hover:bg-gray-50',
      danger: 'text-red-700 hover:bg-red-50'
    };

    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center px-4 py-2 text-sm text-left ${variants[variant]}`}
      >
        {Icon && <Icon className="w-4 h-4 mr-3" />}
        {children}
      </button>
    );
  };

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



  const InfoCard = ({ icon: Icon, title, children, className = "" }) => (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );

  const InfoRow = ({ label, value, className = "" }) => (
    <div className={`flex justify-between items-start py-2 ${className}`}>
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <span className="text-sm text-gray-900 text-right max-w-[60%]">{value || 'N/A'}</span>
    </div>
  );

  const Badge = ({ children, variant = "default" }) => {
    const variants = {
      default: "bg-gray-100 text-gray-800",
      primary: "bg-blue-100 text-blue-800",
      success: "bg-green-100 text-green-800"
    };
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${variants[variant]}`}>
        {children}
      </span>
    );
  };


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
  // Compute a safe attendance percentage to display in the header
  const attendancePercent = attendanceStats
    ? attendanceStats.attendance_percentage
    : (eventStats && eventStats.registrations_count ? Math.round(((eventStats.attendance_count || 0) / eventStats.registrations_count) * 100) : 0);

  return (
    <AdminLayout pageTitle={`${event.event_name} - Event Management`}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      {/* Breadcrumb and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <button 
          onClick={() => navigate('/admin/events')}
          className="inline-flex items-center text-gray-600 hover:text-blue-600 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Events
        </button>
        
        <div className="flex items-center gap-3">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
            <div className={`${statusConfig.icon} mr-2`}></div>
            {event.status?.charAt(0).toUpperCase() + event.status?.slice(1)}
          </div>
          <span className="text-sm text-gray-500 font-mono">ID: {event.event_id}</span>
        </div>
      </div>

      {/* Main Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-blue-50 mb-4">
          <Calendar className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.event_name}</h1>
        <p className="text-gray-600">{event.event_type} • Event Management Dashboard</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-3">
        {/* Primary Actions - Always Visible */}
        <ActionButton
          onClick={refreshData}
          disabled={isLoading}
          variant="primary"
          icon={isLoading ? RefreshCw : RefreshCw}
          className={isLoading ? 'cursor-wait' : ''}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </ActionButton>

        <ActionButton
          onClick={() => navigate(`/admin/events/${eventId}/export`)}
          variant="success"
          icon={Download}
        >
          Export Data
        </ActionButton>

        <ActionButton
          onClick={() => navigate(`/admin/events/${eventId}/attendance`)}
          variant="warning"
          icon={UserCheck}
        >
          Attendance
        </ActionButton>

        {/* Desktop: Show all buttons */}
        <div className="hidden lg:flex gap-3">
          {canEdit && (
            <ActionButton
              onClick={() => navigate(`/admin/events/${eventId}/edit`)}
              variant="secondary"
              icon={Edit3}
            >
              Edit Event
            </ActionButton>
          )}

          <ActionButton
            onClick={() => window.print()}
            variant="secondary"
            icon={FileDown}
          >
            Download PDF
          </ActionButton>

          {canDelete && (
            <ActionButton
              onClick={() => setDeleteModalOpen(true)}
              variant="danger"
              icon={Trash2}
            >
              Cancel Event
            </ActionButton>
          )}
        </div>

        {/* Mobile/Tablet: More Actions Dropdown */}
        <div className="relative lg:hidden">
          <ActionButton
            onClick={() => setShowMoreActions(!showMoreActions)}
            variant="secondary"
            icon={MoreHorizontal}
          >
            More
          </ActionButton>

          <DropdownMenu isOpen={showMoreActions} onClose={() => setShowMoreActions(false)}>
            {canEdit && (
              <DropdownItem
                onClick={() => {
                  navigate(`/admin/events/${eventId}/edit`);
                  setShowMoreActions(false);
                }}
                icon={Edit3}
              >
                Edit Event
              </DropdownItem>
            )}
            
            <DropdownItem
              onClick={() => {
                window.print();
                setShowMoreActions(false);
              }}
              icon={FileDown}
            >
              Download PDF
            </DropdownItem>

            {canDelete && (
              <DropdownItem
                onClick={() => {
                  setDeleteModalOpen(true);
                  setShowMoreActions(false);
                }}
                icon={Trash2}
                variant="danger"
              >
                Cancel Event
              </DropdownItem>
            )}
          </DropdownMenu>
        </div>
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

          {/* Latest Registrations Section - simplified, sober UI */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
                  <i className="fas fa-user-check text-gray-700"></i>
                  Latest Registrations
                </h2>
                <p className="text-sm text-gray-600 mt-1">Showing the most recent {Math.min(recentRegistrations.length, 5)} registrations</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-700">Total: <span className="font-semibold text-gray-900">{eventStats?.registrations_count || 0}</span></div>
                <button
                  onClick={handleViewAllRegistrations}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                >
                  <i className="fas fa-list"></i>
                  <span>View All</span>
                </button>
              </div>
            </div>

            {/* Registration List */}
            <div className="space-y-3">
              {console.log('Rendering registrations, count:', recentRegistrations.length, 'data:', recentRegistrations)}
              {recentRegistrations && recentRegistrations.length > 0 ? (
                eventStats?.is_team_based ? (
                  // Team Registrations - compact, clear cards
                  recentRegistrations.map((reg, index) => (
                    <div key={index} className="border rounded-md bg-white shadow-sm">
                      <div className="flex items-center justify-between p-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            <i className="fas fa-users text-gray-600"></i>
                            <span className="truncate max-w-[36rem]">{reg.team_name || 'Unnamed Team'}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Leader: <span className="font-medium text-gray-700">{reg.name || 'N/A'}</span> • {reg.member_count} members</div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-xs text-gray-500">{formatCompactDateTime(reg.registration_date)}</div>
                          <button
                            onClick={() => toggleTeamExpansion(`recent-${index}`)}
                            className="text-sm text-blue-600 hover:bg-blue-50 px-2 py-1 rounded"
                          >
                            <i className={`fas ${expandedTeams.has(`recent-${index}`) ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                          </button>
                        </div>
                      </div>

                      {expandedTeams.has(`recent-${index}`) && reg.team_members && (
                        <div className="border-t px-3 py-2 bg-gray-50">
                          <div className="text-xs text-gray-600 mb-2">Team Members</div>
                          <div className="space-y-2">
                            {reg.team_members.map((member, memberIndex) => (
                              <div key={memberIndex} className="flex items-center justify-between text-sm text-gray-700 py-2">
                                <div className="min-w-0 pr-3">
                                  <div className="font-medium truncate">{member.full_name}</div>
                                  <div className="text-xs text-gray-500 truncate">{member.department} • {member.enrollment_no}</div>
                                </div>
                                <div className="text-right text-xs text-gray-500">
                                  <div>{formatOrdinalNumber(member.semester)}</div>
                                  <div className="truncate mt-1">{(member.email || '').trim()}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  // Individual registrations - clean table-like list
                  <div className="border rounded-md bg-white overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-100 text-xs text-gray-700 font-medium">
                      <div className="col-span-3">Name</div>
                      <div className="col-span-2">Enrollment</div>
                      <div className="col-span-3">Department</div>
                      <div className="col-span-1 text-center">Sem</div>
                      <div className="col-span-2">Email</div>
                      <div className="col-span-1 text-right">Date</div>
                    </div>
                    <div>
                      {recentRegistrations.slice(0, 5).map((reg, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 px-3 py-3 items-center hover:bg-gray-50 text-sm text-gray-800 border-b last:border-0">
                          <div className="col-span-3 truncate">{reg.full_name || reg.name || 'N/A'}</div>
                          <div className="col-span-2 font-mono truncate">{reg.enrollment_no || 'N/A'}</div>
                          <div className="col-span-3 truncate">{reg.department || 'N/A'}</div>
                          <div className="col-span-1 text-center text-xs">{formatOrdinalNumber(reg.semester) || 'N/A'}</div>
                          <div className="col-span-2 truncate">{(reg.email || 'N/A').trim()}</div>
                          <div className="col-span-1 text-right text-xs text-gray-500">{formatCompactDateTime(reg.registration_date) || 'N/A'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-3">
                    <i className="fas fa-users text-2xl text-gray-400"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No Recent Registrations</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {eventStats?.registrations_count > 0
                      ? `There are ${eventStats.registrations_count} total registrations, but none showing in recent list.`
                      : 'No one has registered for this event yet.'
                    }
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => fetchEventDetails()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      <i className="fas fa-sync mr-2"></i>Refresh
                    </button>
                    {eventStats?.registrations_count > 0 && (
                      <button
                        onClick={handleViewAllRegistrations}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                      >
                        <i className="fas fa-list mr-2"></i>View All
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Event Details Section */}
          

          <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Event Details</h1>
            <p className="text-sm text-gray-600 mt-1">Manage and view comprehensive event information</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Event ID</div>
            <div className="text-sm font-mono text-gray-900">{event.event_id}</div>
          </div>
        </div>

        {/* Event Summary */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{event.event_name}</h2>
            <p className="text-gray-600 mb-3">{event.short_description}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="primary">{event.event_type}</Badge>
              <Badge>{event.target_audience}</Badge>
              <Badge>{event.mode}</Badge>
              {event.is_xenesis_event && <Badge variant="success">Xenesis Event</Badge>}
              <Badge>{event.status}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Basic Information */}
          <InfoCard icon={FileText} title="Basic Information">
            <div className="space-y-0 divide-y divide-gray-100">
              <InfoRow label="Event Type" value={event.event_type?.charAt(0).toUpperCase() + event.event_type?.slice(1)} />
              <InfoRow label="Target Audience" value={event.target_audience?.charAt(0).toUpperCase() + event.target_audience?.slice(1)} />
              <InfoRow label="Mode" value={event.mode?.charAt(0).toUpperCase() + event.mode?.slice(1)} />
              <InfoRow label="Status" value={event.status?.charAt(0).toUpperCase() + event.status?.slice(1)} />
            </div>
            {event.detailed_description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-sm font-medium text-gray-600 mb-2">Description</div>
                <p className="text-sm text-gray-900 leading-relaxed">{event.detailed_description}</p>
              </div>
            )}
          </InfoCard>

          {/* Registration & Pricing */}
          <InfoCard icon={CreditCard} title="Registration & Pricing">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {event.is_paid ? `₹${event.registration_fee}` : 'FREE'}
                </div>
                <div className="text-xs text-gray-600">Registration Fee</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {event.is_team_based ? 'Team' : 'Individual'}
                </div>
                <div className="text-xs text-gray-600">Participation Mode</div>
              </div>
            </div>
            <div className="space-y-0 divide-y divide-gray-100">
              <InfoRow label="Min Participants" value={event.min_participants || 1} />
              <InfoRow label="Max Participants" value={event.max_participants || 'Unlimited'} />
            </div>
          </InfoCard>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Schedule */}
          <InfoCard icon={Clock} title="Schedule">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Registration Period</div>
                    <div className="text-xs text-gray-600">Opens → Closes</div>
                  </div>
                  <div className="text-right text-sm text-gray-900">
                    <div>{formatDateTime(event.registration_start_date)}</div>
                    <div className="text-gray-600">to</div>
                    <div>{formatDateTime(event.registration_end_date)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Event Period</div>
                    <div className="text-xs text-gray-600">Start → End</div>
                  </div>
                  <div className="text-right text-sm text-gray-900">
                    <div>{formatDateTime(event.start_datetime)}</div>
                    <div className="text-gray-600">to</div>
                    <div>{formatDateTime(event.end_datetime)}</div>
                  </div>
                </div>
                
              </div>
            </div>
          </InfoCard>

          {/* Venue & Location */}
          <InfoCard icon={MapPin} title="Venue & Location">
            <div className="space-y-0 divide-y divide-gray-100">
              <InfoRow label="Mode" value={event.mode?.charAt(0).toUpperCase() + event.mode?.slice(1)} />
              <InfoRow label="Venue" value={event.venue} />
            </div>
          </InfoCard>

          {/* Certificates */}
          <InfoCard icon={Award} title="Certificates">
            <div className="space-y-0 divide-y divide-gray-100">
              <InfoRow label="Template" value={event.certificate_template_name || 'Not configured'} />
              <InfoRow label="Available Until" value={formatDateTime(event.certificate_end_date)} />
              {event.assets && event.assets.length > 0 && (
                <InfoRow label="Assets" value={`${event.assets.length} file(s) attached`} />
              )}
            </div>
          </InfoCard>
        </div>
      </div>

      {/* Organizers & Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Organizers */}
        <InfoCard icon={Users} title="Organizers">
          <div className="space-y-3">
            {event.organizer_details && event.organizer_details.length > 0 ? (
              event.organizer_details.map((organizer, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{organizer.full_name || 'Unnamed'}</div>
                    <div className="text-sm text-gray-600">{organizer.email}</div>
                    {organizer.employee_id && (
                      <div className="text-xs text-gray-500">ID: {organizer.employee_id}</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-600 text-center py-4">No organizer information available</div>
            )}
          </div>
        </InfoCard>

        {/* Contacts */}
        <InfoCard icon={Phone} title="Contact Information">
          <div className="space-y-3">
            {event.contacts && event.contacts.length > 0 ? (
              event.contacts.map((contact, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    {contact.contact.includes('@') ? (
                      <Mail className="w-5 h-5 text-gray-600" />
                    ) : (
                      <Phone className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{contact.name}</div>
                    <div className="text-sm text-gray-600">{contact.contact}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-600 text-center py-4">No contact information available</div>
            )}
          </div>
        </InfoCard>
      </div>
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

