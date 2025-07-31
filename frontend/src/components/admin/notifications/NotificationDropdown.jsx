import React from 'react';
import { useNotifications } from '../../../context/NotificationContext';
import { 
  BellIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';

const NotificationDropdown = ({ isOpen, onClose }) => {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    archiveNotification 
  } = useNotifications();

  // Get recent notifications (top 5)
  const recentNotifications = notifications.slice(0, 5);

  // Priority icons
  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return ExclamationTriangleIcon;
      case 'medium':
        return InformationCircleIcon;
      case 'low':
        return CheckCircleIcon;
      default:
        return InformationCircleIcon;
    }
  };

  // Priority colors
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  // Format time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        {unreadCount > 0 && (
          <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
            {unreadCount} unread
          </span>
        )}
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <BellIcon className="h-12 w-12 mb-2" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentNotifications.map((notification) => {
              const PriorityIcon = getPriorityIcon(notification.priority);
              const priorityColor = getPriorityColor(notification.priority);
              
              return (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    notification.status === 'unread' ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => markAsRead(notification.id, true)}
                >
                  <div className="flex items-start space-x-3">
                    <PriorityIcon className={`h-5 w-5 mt-0.5 ${priorityColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-medium truncate ${
                          notification.status === 'unread' ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h4>
                        <span className="text-xs text-gray-500 ml-2">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {notification.message}
                      </p>
                      {notification.action_required && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mt-2">
                          Action Required
                        </span>
                      )}
                    </div>
                    {notification.status === 'unread' && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {recentNotifications.length > 0 && (
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-500 font-medium"
          >
            View All Notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
