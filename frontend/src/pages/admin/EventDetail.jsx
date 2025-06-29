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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Fetch event details and statistics
      const [eventResponse, statsResponse] = await Promise.all([
        adminAPI.getEvent(eventId),
        adminAPI.getEventStats(eventId).catch(() => ({ data: { success: false } }))
      ]);

      if (eventResponse.data.success) {
        setEvent(eventResponse.data.event);
      } else {
        throw new Error(eventResponse.data.message || 'Failed to fetch event details');
      }

      if (statsResponse.data.success) {
        setEventStats(statsResponse.data.stats);
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
