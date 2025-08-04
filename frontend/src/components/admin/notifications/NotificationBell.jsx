import React from 'react';
import { useNotifications } from '../../../context/NotificationContext';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';

const NotificationBell = ({ className = "", onTogglePanel }) => {
  const { unreadCount, isLoading } = useNotifications();

  const handleClick = () => {
    onTogglePanel();
  };

  return (
    <button
      onClick={handleClick}
      className={`relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200 ${className}`}
      title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      {/* Bell Icon */}
      {unreadCount > 0 ? (
        <BellSolidIcon className="h-6 w-6" />
      ) : (
        <BellIcon className="h-6 w-6" />
      )}
      
      {/* Enhanced Unread Count Badge */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      
      {/* Loading Indicator */}
      {isLoading && (
        <span className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full h-3 w-3 animate-pulse shadow-md"></span>
      )}
    </button>
  );
};

export default NotificationBell;
