import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';
import { 
  BellIcon, 
  XMarkIcon, 
  CheckIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';

const NotificationCenter = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    archiveNotification,
    handleNotificationAction,
    triggerPendingNotifications,
    filters,
    updateFilters,
    clearError
  } = useNotifications();

  const [selectedNotification, setSelectedNotification] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isTriggeringNotifications, setIsTriggeringNotifications] = useState(false);



  // Priority colors and icons
  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'high':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: ExclamationTriangleIcon
        };
      case 'medium':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: InformationCircleIcon
        };
      case 'low':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          icon: InformationCircleIcon
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: InformationCircleIcon
        };
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Handle triggering pending notifications (Super Admin only)
  const handleTriggerNotifications = async () => {
    setIsTriggeringNotifications(true);
    try {
      const result = await triggerPendingNotifications();
      if (result.success) {
        alert(`Success: ${result.message}\nEvents processed: ${result.data?.events_processed || 0}\nNotifications sent: ${result.data?.notifications_sent || 0}`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Failed to trigger notifications: ${error.message}`);
    } finally {
      setIsTriggeringNotifications(false);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (notification.status === 'unread') {
      await markAsRead(notification.id, true);
    }
    
    const clonedNotification = JSON.parse(JSON.stringify(notification));
    setSelectedNotification(clonedNotification);
  };

  // Handle action (approve/reject)
  const handleAction = async (action) => {
    if (!selectedNotification) return;

    const result = await handleNotificationAction(
      selectedNotification.id, 
      action, 
      actionReason || null
    );

    if (result.success) {
      setSelectedNotification(null);
      setActionReason('');
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filters.type_filter && notification.type !== filters.type_filter) return false;
    if (filters.priority_filter && notification.priority !== filters.priority_filter) return false;
    if (filters.status_filter && notification.status !== filters.status_filter) return false;
    if (filters.unread_only && notification.status !== 'unread') return false;
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <BellSolidIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Notification Center</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* Trigger Notifications Button (Super Admin only) */}
            {user?.role === 'super_admin' && (
              <button
                onClick={handleTriggerNotifications}
                disabled={isTriggeringNotifications}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
                title="Trigger notifications for all pending approval events"
              >
                <ArrowPathIcon className={`h-4 w-4 ${isTriggeringNotifications ? 'animate-spin' : ''}`} />
                <span>{isTriggeringNotifications ? 'Triggering...' : 'Trigger Pending'}</span>
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Filters"
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <select
                value={filters.type_filter || ''}
                onChange={(e) => updateFilters({ type_filter: e.target.value || null })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Types</option>
                <option value="event_approval_request">Event Approval</option>
                <option value="venue_booking_request">Venue Booking</option>
                <option value="event_deletion_request">Event Deletion</option>
                <option value="admin_announcement">Announcement</option>
                <option value="system_notification">System</option>
              </select>

              <select
                value={filters.priority_filter || ''}
                onChange={(e) => updateFilters({ priority_filter: e.target.value || null })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>

              <select
                value={filters.status_filter || ''}
                onChange={(e) => updateFilters({ status_filter: e.target.value || null })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Status</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="archived">Archived</option>
              </select>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.unread_only}
                  onChange={(e) => updateFilters({ unread_only: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Unread only</span>
              </label>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex h-[600px]">
          {/* Notification List */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                <BellIcon className="h-12 w-12 mb-2" />
                <p>No notifications found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredNotifications.map((notification) => {
                  const priorityConfig = getPriorityConfig(notification.priority);
                  const PriorityIcon = priorityConfig.icon;
                  
                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`
                        p-4 cursor-pointer border-l-4 transition-colors
                        ${notification.status === 'unread' 
                          ? 'bg-blue-50 border-l-blue-400' 
                          : 'bg-white border-l-transparent hover:bg-gray-50'
                        }
                        ${selectedNotification?.id === notification.id ? 'bg-blue-100' : ''}
                        ${priorityConfig.borderColor}
                      `}
                    >
                      <div className="flex items-start space-x-3">
                        <PriorityIcon className={`h-5 w-5 mt-0.5 ${priorityConfig.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm font-medium truncate ${
                              notification.status === 'unread' ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h4>
                            <span className="text-xs text-gray-500 ml-2">
                              {formatRelativeTime(notification.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              priorityConfig.bgColor
                            } ${priorityConfig.color}`}>
                              {notification.priority}
                            </span>
                            {notification.action_required && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                Action Required
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notification Detail */}
          <div className="w-1/2 p-6 overflow-y-auto">
            {selectedNotification ? (
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedNotification.title}
                  </h3>
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                    <span>From: {selectedNotification.sender_username || 'System'}</span>
                    <span>•</span>
                    <span>{new Date(selectedNotification.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <p className="text-gray-700 leading-relaxed">
                    {selectedNotification.message}
                  </p>
                </div>

                {/* Event Details for Approval Requests */}
                {(selectedNotification.type === 'event_approval_request' || selectedNotification.action_data) && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-lg">📋</span>
                      </div>
                      <h4 className="text-lg font-medium text-gray-900">Event Request Details</h4>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 space-y-6 border border-blue-200">
                      
                      {/* Quick Overview Cards */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-green-600 font-semibold">👤</span>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Requested by</p>
                              <p className="font-semibold text-gray-900">
                                {selectedNotification?.action_data?.created_by || 
                                 selectedNotification?.sender_username || 
                                 'Unknown User'}
                              </p>
                              <p className="text-xs text-gray-500">{formatRelativeTime(selectedNotification.created_at)}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-purple-600 font-semibold">🎯</span>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Event Type</p>
                              <p className="font-semibold text-gray-900 capitalize">
                                {selectedNotification.action_data?.event_type || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-500 capitalize">
                                {selectedNotification.action_data?.target_audience || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Event Information */}
                      <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                        <h5 className="font-semibold text-gray-800 mb-4 flex items-center">
                          <span className="mr-2">ℹ️</span>
                          Basic Information
                        </h5>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Event ID</p>
                              <p className="text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                                {selectedNotification.action_data?.event_id || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Department</p>
                              <p className="text-gray-900">{selectedNotification.action_data?.organizing_department || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Event Name</p>
                              <p className="text-gray-900 font-medium">{selectedNotification.action_data?.event_name || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Status</p>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Pending Approval
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Schedule & Venue */}
                      <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                        <h5 className="font-semibold text-gray-800 mb-4 flex items-center">
                          <span className="mr-2">📅</span>
                          Schedule & Venue
                        </h5>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Event Period</p>
                              <div className="flex items-center space-x-2">
                                <p className="text-gray-900">
                                  {selectedNotification.action_data?.start_date 
                                    ? new Date(selectedNotification.action_data.start_date).toLocaleDateString('en-US', { 
                                        month: 'short', day: 'numeric', year: 'numeric'
                                      })
                                    : 'TBD'
                                  }
                                </p>
                                {selectedNotification.action_data?.end_date && selectedNotification.action_data.end_date !== selectedNotification.action_data.start_date && (
                                  <>
                                    <span className="text-gray-400">→</span>
                                    <p className="text-gray-900">
                                      {new Date(selectedNotification.action_data.end_date).toLocaleDateString('en-US', { 
                                        month: 'short', day: 'numeric', year: 'numeric'
                                      })}
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Mode</p>
                              <div className="flex items-center space-x-2">
                                <span className={`w-2 h-2 rounded-full ${
                                  selectedNotification.action_data?.mode === 'online' ? 'bg-blue-500' : 
                                  selectedNotification.action_data?.mode === 'offline' ? 'bg-green-500' : 'bg-gray-400'
                                }`}></span>
                                <p className="text-gray-900 capitalize">{selectedNotification.action_data?.mode || 'TBD'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Venue</p>
                              <p className="text-gray-900">{selectedNotification.action_data?.venue || 'TBD'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Registration Period</p>
                              <p className="text-gray-900 text-sm">
                                {selectedNotification.action_data?.registration_start_date && selectedNotification.action_data?.registration_end_date
                                  ? `${new Date(selectedNotification.action_data.registration_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(selectedNotification.action_data.registration_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                  : 'TBD'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Registration Details */}
                      <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                        <h5 className="font-semibold text-gray-800 mb-4 flex items-center">
                          <span className="mr-2">📝</span>
                          Registration Details
                        </h5>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">{selectedNotification.action_data?.registration_type || 'Free'}</p>
                            <p className="text-xs text-gray-600">Type</p>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-2xl font-bold text-green-600 capitalize">{selectedNotification.action_data?.registration_mode || 'Individual'}</p>
                            <p className="text-xs text-gray-600">Mode</p>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-2xl font-bold text-purple-600">{selectedNotification.action_data?.is_team_based ? 'Yes' : 'No'}</p>
                            <p className="text-xs text-gray-600">Team Based</p>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-2xl font-bold text-orange-600">
                              {selectedNotification.action_data?.min_participants || '∞'}
                              {selectedNotification.action_data?.max_participants ? `-${selectedNotification.action_data.max_participants}` : '+'}
                            </p>
                            <p className="text-xs text-gray-600">Participants</p>
                          </div>
                        </div>
                      </div>

                      {/* Team & Contacts */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Organizers */}
                        {selectedNotification.action_data?.organizers && selectedNotification.action_data.organizers.length > 0 && (
                          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                            <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                              <span className="mr-2">👥</span>
                              Organizers ({selectedNotification.action_data.organizers.length})
                            </h5>
                            <div className="space-y-3">
                              {selectedNotification.action_data.organizers.map((organizer, index) => (
                                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                    {organizer.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{organizer.name}</p>
                                    <p className="text-sm text-gray-600 truncate">{organizer.email}</p>
                                    {organizer.employee_id && <p className="text-xs text-gray-500">ID: {organizer.employee_id}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Contacts */}
                        {selectedNotification.action_data?.contacts && selectedNotification.action_data.contacts.length > 0 && (
                          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                            <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                              <span className="mr-2">📞</span>
                              Contacts ({selectedNotification.action_data.contacts.length})
                            </h5>
                            <div className="space-y-3">
                              {selectedNotification.action_data.contacts.map((contact, index) => (
                                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                    {contact.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                                    <p className="text-sm text-gray-600">{contact.contact}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                        <h5 className="font-semibold text-gray-800 mb-4 flex items-center">
                          <span className="mr-2">📄</span>
                          Event Description
                        </h5>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600 mb-2">Short Description</p>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-gray-900">{selectedNotification.action_data?.short_description || 'No description provided'}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600 mb-2">Detailed Description</p>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-gray-900">{selectedNotification.action_data?.detailed_description || 'No detailed description provided'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata (for non-event notifications or debugging) */}
                {selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0 && selectedNotification.type !== 'event_approval_request' && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Additional Information</h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(selectedNotification.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {selectedNotification.action_required && (
                  <div className="bg-white rounded-xl p-6 space-y-6 border-2 border-blue-200 shadow-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 text-lg">⚡</span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900">Action Required</h4>
                    </div>
                    
                    <div>
                      <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-3">
                        Reason/Notes (optional):
                      </label>
                      <textarea
                        id="reason"
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        rows={4}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                        placeholder="Add a reason or note for your decision... (This will be sent to the event creator)"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        💡 Your decision and reason will be logged and sent to the event creator.
                      </p>
                    </div>

                    <div className="flex space-x-4">
                      <button
                        onClick={() => handleAction('approve')}
                        className="flex-1 group relative overflow-hidden bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-green-300"
                      >
                        <span className="relative flex items-center justify-center space-x-2">
                          <CheckIcon className="h-5 w-5" />
                          <span>Approve Event</span>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-500 opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
                      </button>
                      
                      <button
                        onClick={() => handleAction('reject')}
                        className="flex-1 group relative overflow-hidden bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-red-300"
                      >
                        <span className="relative flex items-center justify-center space-x-2">
                          <XMarkIcon className="h-5 w-5" />
                          <span>Reject & Delete</span>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
                      </button>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <span className="text-yellow-600 text-lg">⚠️</span>
                        <div className="text-sm">
                          <p className="font-medium text-yellow-800">Important:</p>
                          <ul className="mt-1 text-yellow-700 space-y-1">
                            <li>• <strong>Approve:</strong> Event will be published and become active</li>
                            <li>• <strong>Reject:</strong> Event will be permanently deleted from the system</li>
                            <li>• The event creator will be notified of your decision</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => markAsRead(selectedNotification.id, selectedNotification.status === 'read')}
                      className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                    >
                      Mark as {selectedNotification.status === 'read' ? 'Unread' : 'Read'}
                    </button>
                    <span className="text-gray-300">•</span>
                    <button
                      onClick={() => {
                        archiveNotification(selectedNotification.id);
                        setSelectedNotification(null);
                      }}
                      className="text-sm text-red-600 hover:text-red-500 font-medium"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <BellIcon className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">Select a notification</p>
                <p className="text-sm">Choose a notification from the list to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
