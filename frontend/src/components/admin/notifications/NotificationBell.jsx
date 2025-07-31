import React, { useState } from 'react';
import { useNotifications } from '../../../context/NotificationContext';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import NotificationCenter from './NotificationCenter';

const NotificationBell = ({ className = "" }) => {
  const { unreadCount, isLoading } = useNotifications();
  const [showCenter, setShowCenter] = useState(false);

  const handleClick = () => {
    setShowCenter(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
        title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        {/* Bell Icon */}
        {unreadCount > 0 ? (
          <BellSolidIcon className="h-6 w-6" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        
        {/* Loading Indicator */}
        {isLoading && (
          <span className="absolute -top-1 -right-1 bg-blue-500 rounded-full h-3 w-3 animate-pulse"></span>
        )}
      </button>

      {/* Notification Center Modal */}
      <NotificationCenter 
        isOpen={showCenter} 
        onClose={() => setShowCenter(false)} 
      />
    </>
  );
};

export default NotificationBell;
