import React, { useState } from 'react';
import { useNotifications } from '../../../context/NotificationContext';
import { 
  BellIcon, 
  XMarkIcon, 
  CheckIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';

const NotificationCenter = ({ isOpen, onClose }) => {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    archiveNotification,
    handleNotificationAction,
    filters,
    updateFilters,
    clearError
  } = useNotifications();

  const [selectedNotification, setSelectedNotification] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (notification.status === 'unread') {
      await markAsRead(notification.id, true);
    }
    setSelectedNotification(notification);
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

                {/* Metadata */}
                {selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0 && (
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
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-900">Required Action</h4>
                    
                    <div>
                      <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                        Reason/Notes (optional):
                      </label>
                      <textarea
                        id="reason"
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        rows={3}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Add a reason or note for your decision..."
                      />
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleAction('approve')}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                      >
                        <CheckIcon className="h-4 w-4 mr-2" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction('reject')}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4 mr-2" />
                        Reject
                      </button>
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
