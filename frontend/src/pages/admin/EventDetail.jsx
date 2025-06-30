import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/axios';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [eventStats, setEventStats] = useState(null);
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [registrationsModalOpen, setRegistrationsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedTeams, setExpandedTeams] = useState(new Set());

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Fetch event details, statistics, and recent registrations
      const [eventResponse, statsResponse, recentRegsResponse] = await Promise.all([
        adminAPI.getEvent(eventId),
        adminAPI.getEventStats(eventId).catch(() => ({ data: { success: false } })),
        adminAPI.getEventRegistrations(eventId, { limit: 5 }).catch(() => ({ data: { success: false } }))
      ]);

      if (eventResponse.data.success) {
        setEvent(eventResponse.data.event);
      } else {
        throw new Error(eventResponse.data.message || 'Failed to fetch event details');
      }

      if (statsResponse.data.success) {
        setEventStats(statsResponse.data.stats);
      }

      if (recentRegsResponse.data.success) {
        setRecentRegistrations(recentRegsResponse.data.registrations || []);
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
      alert('Failed to delete event: ' + error.message);
    }
    setDeleteModalOpen(false);
  };

  const fetchAllRegistrations = async () => {
    try {
      setModalLoading(true);
      const response = await adminAPI.getEventRegistrations(eventId);
      if (response.data.success) {
        setAllRegistrations(response.data.registrations || []);
      }
    } catch (error) {
      console.error('Error fetching all registrations:', error);
      setAllRegistrations([]);
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

  const toggleTeamExpansion = (teamId) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
  };

  const filteredRegistrations = allRegistrations.filter(reg => {
    const searchMatch = !searchTerm || 
      (reg.name && reg.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (reg.email && reg.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (reg.enrollment_no && reg.enrollment_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (reg.team_name && reg.team_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const statusMatch = statusFilter === 'all' || 
      (statusFilter === 'attended' && reg.attended) ||
      (statusFilter === 'not-attended' && !reg.attended);
    
    return searchMatch && statusMatch;
  });

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not Set';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

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
  const isReadOnly = user && user.role === 'event_admin';

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
        <div className="text-center py-16">
          <h3 className="text-xl font-bold text-gray-700 mb-3">Event Not Found</h3>
          <button
            onClick={() => navigate('/admin/events')}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            <i className="fas fa-arrow-left mr-2"></i>Back to Events
          </button>
        </div>
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
                  <i className="fas fa-arrow-left mr-1"></i>Events
                </button>
                <span className="text-gray-400">→</span>
                <span className="text-gray-800 font-medium">{event.event_name}</span>
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
              <button className="px-6 py-3 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-lg hover:from-green-500 hover:to-green-700 transition-all font-semibold shadow-lg">
                <i className="fas fa-download mr-2"></i>Export Data
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
              
              <div className="bg-white rounded-lg stats-card border-l-4 border-purple-500 p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-check-circle text-purple-500 text-xl"></i>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-500 text-sm font-medium">Attendance Count</p>
                      <p className="text-2xl font-bold text-gray-800">{eventStats.attendance_count || 0}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {eventStats.registrations_count > 0 ? 
                          `${Math.round((eventStats.attendance_count / eventStats.registrations_count) * 100)}% attendance rate` :
                          '0% attendance rate'
                        }
                      </p>
                    </div>
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

          {/* Event Details Section */}
          <div className="bg-white shadow-lg rounded-lg p-8 mb-8">
            {/* Section Header */}
            <div className="border-b border-gray-200 pb-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <i className="fas fa-info-circle text-blue-500"></i>
                Event Details
              </h2>
              <p className="text-gray-600 mt-2">Complete information about this event</p>
            </div>

            {/* Event Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Basic Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <i className="fas fa-tag text-blue-500 mr-2"></i>Basic Information
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-700 w-1/3">Event Type:</span>
                      <span className="text-gray-900 font-medium w-2/3 text-right">{event.event_type}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-700 w-1/3">Department:</span>
                      <span className="text-gray-900 font-medium w-2/3 text-right">{event.organizing_department}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-700 w-1/3">Mode:</span>
                      <span className="text-gray-900 font-medium w-2/3 text-right">{event.mode}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-700 w-1/3">Venue:</span>
                      <span className="text-gray-900 font-medium w-2/3 text-right">{event.venue}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <i className="fas fa-clock text-green-500 mr-2"></i>Schedule Details
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-700 w-1/3">Start Date:</span>
                      <span className="text-gray-900 font-medium w-2/3 text-right">{formatDateTime(event.start_datetime)}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-700 w-1/3">End Date:</span>
                      <span className="text-gray-900 font-medium w-2/3 text-right">{formatDateTime(event.end_datetime)}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-700 w-1/3">Registration Start:</span>
                      <span className="text-gray-900 font-medium w-2/3 text-right">{formatDateTime(event.registration_start_date)}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-700 w-1/3">Registration End:</span>
                      <span className="text-gray-900 font-medium w-2/3 text-right">{formatDateTime(event.registration_end_date)}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-700 w-1/3">Certificate End:</span>
                      <span className="text-gray-900 font-medium w-2/3 text-right">{formatDateTime(event.certificate_end_date)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <i className="fas fa-align-left text-purple-500 mr-2"></i>Description
              </h3>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-800 leading-relaxed">{event.detailed_description}</p>
                </div>
                {event.short_description && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Short Description:</h4>
                    <p className="text-blue-800">{event.short_description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Target Outcomes / Goals */}
            {event.target_outcomes && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <i className="fas fa-bullseye text-orange-500 mr-2"></i>Target Outcomes & Goals
                </h3>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-gray-900 whitespace-pre-line">{event.target_outcomes}</p>
                </div>
              </div>
            )}

            {/* Prerequisites & Requirements */}
            {(event.prerequisites || event.what_to_bring) && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <i className="fas fa-list-check text-yellow-500 mr-2"></i>Prerequisites & Requirements
                </h3>
                <div className="space-y-4">
                  {event.prerequisites && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-900 mb-2 flex items-center">
                        <i className="fas fa-check-circle text-yellow-600 mr-2"></i>Prerequisites
                      </h4>
                      <p className="text-gray-900 whitespace-pre-line">{event.prerequisites}</p>
                    </div>
                  )}
                  {event.what_to_bring && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-900 mb-2 flex items-center">
                        <i className="fas fa-briefcase text-yellow-600 mr-2"></i>What to Bring
                      </h4>
                      <p className="text-gray-900 whitespace-pre-line">{event.what_to_bring}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Registration Information */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <i className="fas fa-user-plus text-teal-500 mr-2"></i>Registration Details
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                    <span className="text-sm font-medium text-teal-800">Type:</span>
                    <p className="text-teal-900 font-medium">{event.registration_type ? event.registration_type.charAt(0).toUpperCase() + event.registration_type.slice(1) : 'Not Set'}</p>
                  </div>
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                    <span className="text-sm font-medium text-teal-800">Mode:</span>
                    <p className="text-teal-900 font-medium">{event.registration_mode ? event.registration_mode.charAt(0).toUpperCase() + event.registration_mode.slice(1) : 'Individual'}</p>
                  </div>
                </div>
                
                {event.registration_type === 'paid' && event.registration_fee && (
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                    <span className="text-sm font-medium text-teal-800">Registration Fee:</span>
                    <p className="text-teal-900 font-semibold">₹{event.registration_fee}</p>
                    {event.fee_description && (
                      <p className="text-sm text-teal-700 mt-1">{event.fee_description}</p>
                    )}
                  </div>
                )}
                
                {event.registration_mode === 'team' && (event.team_size_min || event.team_size_max) && (
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                    <span className="text-sm font-medium text-teal-800">Team Requirements:</span>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {event.team_size_min && (
                        <div>
                          <span className="text-xs text-gray-600">Min Team Size:</span>
                          <p className="text-teal-900 font-medium">{event.team_size_min}</p>
                        </div>
                      )}
                      {event.team_size_max && (
                        <div>
                          <span className="text-xs text-gray-600">Max Team Size:</span>
                          <p className="text-teal-900 font-medium">{event.team_size_max}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {event.min_participants && (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                      <span className="text-sm font-medium text-teal-800">Min Participants:</span>
                      <p className="text-teal-900 font-medium">{event.min_participants}</p>
                    </div>
                  )}
                  {event.max_participants && (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                      <span className="text-sm font-medium text-teal-800">Max Participants:</span>
                      <p className="text-teal-900 font-medium">{event.max_participants}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Organizers and Contacts */}
            {(event.organizers?.length > 0 || event.event_contacts?.length > 0) && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <i className="fas fa-users text-indigo-500 mr-2"></i>Organizers & Contacts
                </h3>
                <div className="space-y-4">
                  {event.organizers && event.organizers.length > 0 && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <h4 className="font-medium text-indigo-900 mb-2">Event Organizers</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {event.organizers.map((organizer, index) => (
                          <div key={index} className="text-indigo-800">• {organizer}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {event.event_contacts && event.event_contacts.length > 0 && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <h4 className="font-medium text-indigo-900 mb-2">Contact Information</h4>
                      <div className="space-y-2">
                        {event.event_contacts.map((contact, index) => (
                          <div key={index} className="flex justify-between text-indigo-800">
                            <span className="font-medium">{contact.name}</span>
                            <span>{contact.contact}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

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
              {recentRegistrations.length > 0 ? (
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
                          <div className="space-y-3">
                            {reg.team_members.map((member, memberIndex) => (
                              <div key={memberIndex} className="grid grid-cols-6 gap-3 border-b border-gray-100 pb-2 last:border-0">
                                <div className="col-span-2 font-medium text-gray-900">
                                  {member.full_name}
                                  {member.registration_type === "team_leader" && (
                                    <span className="ml-1 text-xs bg-blue-100 text-blue-800 py-0.5 px-1.5 rounded-full">Leader</span>
                                  )}
                                </div>
                                <div className="col-span-1 text-gray-700">{member.enrollment_no}</div>
                                <div className="col-span-1 text-gray-700">{member.department}</div>
                                <div className="col-span-1 text-gray-700">{member.semester}</div>
                                <div className="col-span-1 text-gray-700 truncate">{member.email}</div>
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
                    <div className="grid grid-cols-6 gap-4 py-3 px-4 border-b-2 border-gray-200 bg-gray-50 font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <i className="fas fa-user text-gray-500"></i>Name
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="fas fa-id-card text-gray-500"></i>Enrollment
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="fas fa-building text-gray-500"></i>Department
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="fas fa-layer-group text-gray-500"></i>Semester
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="fas fa-envelope text-gray-500"></i>Email
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="fas fa-calendar text-gray-500"></i>Registration Date
                      </div>
                    </div>
                    
                    {/* Registration Rows */}
                    <div className="bg-white">
                      {recentRegistrations.slice(0, 5).map((reg, index) => (
                        console.log(reg, 'Recent Registration Data'),
                        <div key={index} className="grid grid-cols-6 gap-4 py-4 px-4 border-b border-gray-100 hover:bg-gray-50 transition-colors last:border-0">
                          <div className="font-medium text-gray-900">{reg.full_name}</div>
                          <div className="text-gray-700">{reg.enrollment_no}</div>
                          <div className="text-gray-700 text-nowrap">{reg.department}</div>
                          <div className="text-gray-700">{reg.semester}</div>
                          <div className="text-gray-700 truncate" title={reg.email}>{reg.email}</div>
                          <div className="text-gray-700">{formatDateTime(reg.registration_date)}</div>
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Registrations Yet</h3>
                  <p className="text-gray-500">No registrations have been found for this event.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Event</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{event.event_name}"? This action cannot be undone.
              </p>
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
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto">
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
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search registrations..."
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Registrations</option>
                    <option value="attended">Attended Only</option>
                    <option value="not-attended">Not Attended</option>
                  </select>
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
                                    <div className="col-span-1 text-gray-700">{member.semester}</div>
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
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRegistrations.map((reg, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900">{reg.full_name || reg.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">{reg.enrollment_no}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">{reg.department}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">{reg.semester}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700 truncate max-w-[200px]" title={reg.email}>{reg.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">{formatDateTime(reg.registration_date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

      {/* Enhanced Styling */}
      <style jsx>{`
        .stats-card {
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .stats-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        
        @media print {
          .print-hide {
            display: none;
          }
        }
      `}</style>
    </AdminLayout>
  );
}

export default EventDetail;
