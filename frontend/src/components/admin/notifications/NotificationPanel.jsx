import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../../context/NotificationContext';
import { 
  XMarkIcon, 
  CheckIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  EyeIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowLeftIcon,
  BellIcon
} from '@heroicons/react/24/outline';

const NotificationPanel = ({ isOpen, onClose }) => {
  const {
    notifications,
    isLoading,
    error,
    markAsRead,
    handleNotificationAction,
    clearError
  } = useNotifications();

  const [selectedNotification, setSelectedNotification] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [showDetailView, setShowDetailView] = useState(false);

  // Filter for approval requests only
  const approvalNotifications = notifications.filter(
    notification => notification.type === 'event_approval_request'
  );

  // Auto-cleanup: Remove notifications older than 7 days
  useEffect(() => {
    const cleanupOldNotifications = () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      approvalNotifications.forEach(notification => {
        const notificationDate = new Date(notification.created_at);
        if (notificationDate < sevenDaysAgo) {
          console.log(`Auto-deleting notification ${notification.id} (older than 7 days)`);
          // API call to delete from backend would go here
        }
      });
    };

    if (isOpen && approvalNotifications.length > 0) {
      cleanupOldNotifications();
    }
  }, [isOpen, approvalNotifications]);

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

  // Format relative time (Gmail-style)
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Handle notification click (Gmail-style)
  const handleNotificationClick = async (notification) => {
    if (notification.status === 'unread') {
      await markAsRead(notification.id, true);
    }
    setSelectedNotification(notification);
    setShowDetailView(true);
  };

  // Handle back to list
  const handleBackToList = () => {
    setShowDetailView(false);
    setSelectedNotification(null);
    setActionReason('');
  };

  // Handle action (approve/reject)
  const handleAction = async (action) => {
    if (!selectedNotification) return;
    
    if (action === 'reject' && !actionReason.trim()) {
      alert('Please provide a reason for rejecting this event.');
      return;
    }

    const result = await handleNotificationAction(
      selectedNotification.id, 
      action, 
      actionReason || null
    );

    if (result.success) {
      handleBackToList();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Backdrop with Blur Effect */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Gmail-style Modal - Centered and Rounded */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col border border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Bell Icon */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 rounded-t-2xl bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center space-x-3">
              {showDetailView && (
                <button
                  onClick={handleBackToList}
                  className="p-2 hover:bg-white/70 rounded-full transition-all duration-200"
                  title="Back to notifications"
                >
                  <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <div className="flex items-center space-x-3">
                {/* Notification Bell Icon */}
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <BellIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {showDetailView ? 'Event Details' : 'Event Approval Requests'}
                  </h2>
                  {!showDetailView && (
                    <p className="text-sm text-gray-600">
                      {approvalNotifications.length} {approvalNotifications.length === 1 ? 'request' : 'requests'} pending
                    </p>
                  )}
                </div>
                {!showDetailView && approvalNotifications.length > 0 && (
                  <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                    {approvalNotifications.length}
                  </span>
                )}
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/70 rounded-full transition-all duration-200"
              title="Close"
            >
              <XMarkIcon className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex justify-between items-center">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={clearError}
                  className="text-red-400 hover:text-red-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {!showDetailView ? (
              /* Gmail-style Notification List */
              <div className="h-full overflow-y-auto">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
                  </div>
                ) : approvalNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <CalendarDaysIcon className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="text-lg font-medium">No approval requests</p>
                    <p className="text-sm">All event requests have been processed</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {approvalNotifications.map((notification) => {
                      const priorityConfig = getPriorityConfig(notification.priority);
                      const IconComponent = priorityConfig.icon;
                      
                      return (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                            notification.status === 'unread' ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              {/* Header with creator name - Gmail style */}
                              <div className="flex items-center space-x-3 mb-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                  {notification.data?.event_created_by?.charAt(0) || 'U'}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    Event creation requested by{' '}
                                    <span className="text-blue-600 font-semibold">
                                      {notification.data?.event_created_by || 'Unknown User'}
                                    </span>
                                  </p>
                                  <p className="text-xs text-gray-500">{formatRelativeTime(notification.created_at)}</p>
                                </div>
                                {notification.status === 'unread' && (
                                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                )}
                              </div>

                              {/* Event details preview - Gmail style */}
                              <div className="space-y-1 ml-11">
                                <h3 className="text-lg font-semibold text-gray-900 truncate">
                                  {notification.data?.event_name || notification.title}
                                </h3>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {notification.data?.short_description || notification.message}
                                </p>
                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                  <span>📅 {notification.data?.start_date || 'TBD'}</span>
                                  <span>🏢 {notification.data?.organizing_department || 'N/A'}</span>
                                  <span>🎯 {notification.data?.event_type || 'N/A'}</span>
                                  {notification.data?.organizers?.some(org => org.isNew) && (
                                    <span className="text-amber-600 font-medium">⚠️ New Organizers</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Quick action buttons */}
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotificationClick(notification);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                              >
                                View
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedNotification(notification);
                                  handleAction('approve');
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedNotification(notification);
                                  setShowDetailView(true);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                              >
                                ✕ Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Gmail-style Detail View */
              <div className="h-full overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                  {/* Event header */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                          {selectedNotification?.data?.event_created_by?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <h1 className="text-2xl font-bold text-gray-900">
                            {selectedNotification?.data?.event_name || selectedNotification?.title || 'Untitled Event'}
                          </h1>
                          <p className="text-sm text-gray-600">
                            Event creation requested by{' '}
                            <span className="font-semibold text-blue-600">
                              {selectedNotification?.data?.event_created_by || 'Unknown User'}
                            </span>
                            {' on '}{formatRelativeTime(selectedNotification?.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          selectedNotification?.data?.organizers?.some(org => org.isNew)
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {selectedNotification?.data?.organizers?.some(org => org.isNew) ? '⚠️ New Organizers' : '📋 Standard Request'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Long message display - Gmail style */}
                  {selectedNotification?.message && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Message</h3>
                      <div className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-md">
                        {selectedNotification.message}
                      </div>
                    </div>
                  )}

                  {/* Event details grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Basic Information */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <InformationCircleIcon className="w-5 h-5 text-blue-500 mr-2" />
                        Basic Information
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Event ID</label>
                          <p className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
                            {selectedNotification?.data?.event_id || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Event Type</label>
                          <p className="text-sm text-gray-900 capitalize">
                            {selectedNotification?.data?.event_type || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Target Audience</label>
                          <p className="text-sm text-gray-900 capitalize">
                            {selectedNotification?.data?.target_audience || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Department</label>
                          <p className="text-sm text-gray-900">
                            {selectedNotification?.data?.organizing_department || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Schedule Information */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <CalendarDaysIcon className="w-5 h-5 text-green-500 mr-2" />
                        Schedule & Venue
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Event Date</label>
                          <p className="text-sm text-gray-900">
                            {selectedNotification?.data?.start_date} to {selectedNotification?.data?.end_date}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Mode</label>
                          <p className="text-sm text-gray-900 capitalize">
                            {selectedNotification?.data?.mode || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Venue</label>
                          <p className="text-sm text-gray-900">
                            {selectedNotification?.data?.venue || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Registration Type</label>
                          <p className="text-sm text-gray-900 capitalize">
                            {selectedNotification?.data?.registration_type || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Description</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Short Description</label>
                        <p className="text-sm text-gray-900 mt-1">
                          {selectedNotification?.data?.short_description || 'No description provided'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Detailed Description</label>
                        <div className="text-sm text-gray-900 mt-1 whitespace-pre-wrap bg-gray-50 p-4 rounded-md">
                          {selectedNotification?.data?.detailed_description || 'No detailed description provided'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Organizers - Gmail style */}
                  {selectedNotification?.data?.organizers && selectedNotification.data.organizers.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <UserGroupIcon className="w-5 h-5 text-purple-500 mr-2" />
                        Event Organizers
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedNotification.data.organizers.map((organizer, index) => (
                          <div 
                            key={index} 
                            className={`p-4 rounded-lg border-2 ${
                              organizer.isNew 
                                ? 'border-amber-200 bg-amber-50' 
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                                organizer.isNew 
                                  ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                                  : 'bg-gradient-to-r from-gray-400 to-gray-600'
                              }`}>
                                {organizer.name?.charAt(0) || 'U'}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{organizer.name}</p>
                                <p className="text-sm text-gray-500">{organizer.email}</p>
                                <p className="text-xs text-gray-400">ID: {organizer.employee_id}</p>
                                {organizer.isNew && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 mt-1">
                                    ⚠️ New Organizer
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Decision section */}
                  {selectedNotification?.status !== 'processed' && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Decision & Reason</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reason (Optional for approval, Required for rejection)
                          </label>
                          <textarea
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            placeholder="Enter reason for your decision..."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons - Gmail style */}
                  {selectedNotification?.status !== 'processed' && (
                    <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-end space-x-4">
                      <button
                        onClick={() => handleAction('reject')}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <XMarkIcon className="w-5 h-5" />
                        <span>Decline Request</span>
                      </button>
                      <button
                        onClick={() => handleAction('approve')}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <CheckIcon className="w-5 h-5" />
                        <span>Approve Event</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;
