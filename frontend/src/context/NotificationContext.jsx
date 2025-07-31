import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { adminAPI } from '../api/axios';
import { useAuth } from './AuthContext';

// Notification context
const NotificationContext = createContext();

// Initial state
const initialState = {
  notifications: [],
  unreadCount: 0,
  totalCount: 0,
  isLoading: false,
  error: null,
  stats: null,
  filters: {
    page: 1,
    per_page: 20,
    status_filter: null,
    type_filter: null,
    priority_filter: null,
    unread_only: false
  }
};

// Actions
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  FETCH_SUCCESS: 'FETCH_SUCCESS',
  FETCH_ERROR: 'FETCH_ERROR',
  UPDATE_FILTERS: 'UPDATE_FILTERS',
  MARK_AS_READ: 'MARK_AS_READ',
  ARCHIVE_NOTIFICATION: 'ARCHIVE_NOTIFICATION',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  UPDATE_STATS: 'UPDATE_STATS',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer
function notificationReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case ACTIONS.FETCH_SUCCESS:
      return {
        ...state,
        notifications: action.payload.notifications,
        unreadCount: action.payload.unread_count,
        totalCount: action.payload.total_count,
        isLoading: false,
        error: null
      };

    case ACTIONS.FETCH_ERROR:
      return {
        ...state,
        isLoading: false,
        error: action.payload
      };

    case ACTIONS.UPDATE_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload
        }
      };

    case ACTIONS.MARK_AS_READ:
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload.notificationId
            ? { ...notification, status: action.payload.isRead ? 'read' : 'unread' }
            : notification
        ),
        unreadCount: action.payload.isRead 
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount + 1
      };

    case ACTIONS.ARCHIVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload
        ),
        totalCount: Math.max(0, state.totalCount - 1)
      };

    case ACTIONS.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        totalCount: state.totalCount + 1,
        unreadCount: state.unreadCount + 1
      };

    case ACTIONS.UPDATE_STATS:
      return {
        ...state,
        stats: action.payload
      };

    case ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
}

// NotificationProvider Component
export function NotificationProvider({ children }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { user, userType, isAuthenticated } = useAuth();

  // Fetch notifications
  const fetchNotifications = useCallback(async (customFilters = {}) => {
    if (!isAuthenticated || userType !== 'admin') return;

    dispatch({ type: ACTIONS.SET_LOADING, payload: true });

    try {
      const filters = { ...state.filters, ...customFilters };
      const response = await adminAPI.getNotifications(filters);

      if (response.data) {
        dispatch({
          type: ACTIONS.FETCH_SUCCESS,
          payload: response.data
        });
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      dispatch({
        type: ACTIONS.FETCH_ERROR,
        payload: error.response?.data?.message || 'Failed to fetch notifications'
      });
    }
  }, [isAuthenticated, userType, state.filters]);

  // Update filters and fetch
  const updateFilters = useCallback((newFilters) => {
    dispatch({ type: ACTIONS.UPDATE_FILTERS, payload: newFilters });
  }, []);

  // Mark notification as read/unread
  const markAsRead = useCallback(async (notificationId, isRead = true) => {
    try {
      await adminAPI.markNotificationAsRead(notificationId, isRead);
      dispatch({
        type: ACTIONS.MARK_AS_READ,
        payload: { notificationId, isRead }
      });
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to update notification' 
      };
    }
  }, []);

  // Archive notification
  const archiveNotification = useCallback(async (notificationId) => {
    try {
      await adminAPI.archiveNotification(notificationId);
      dispatch({
        type: ACTIONS.ARCHIVE_NOTIFICATION,
        payload: notificationId
      });
      return { success: true };
    } catch (error) {
      console.error('Error archiving notification:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to archive notification'
      };
    }
  }, []);

  // Handle notification action (approve/reject)
  const handleNotificationAction = useCallback(async (notificationId, action, reason = null) => {
    try {
      const actionData = { action };
      if (reason) actionData.reason = reason;

      await adminAPI.handleNotificationAction(notificationId, actionData);
      
      // Mark as read after action
      dispatch({
        type: ACTIONS.MARK_AS_READ,
        payload: { notificationId, isRead: true }
      });

      // Refresh notifications to get updated data
      fetchNotifications();

      return { success: true };
    } catch (error) {
      console.error('Error handling notification action:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to handle notification action'
      };
    }
  }, [fetchNotifications]);

  // Create notification
  const createNotification = useCallback(async (notificationData) => {
    try {
      const response = await adminAPI.createNotification(notificationData);
      
      if (response.data.success) {
        // Optionally add to local state if it's for current user
        // This would require checking if recipient matches current user
        return { success: true, notificationId: response.data.notification_id };
      }
      
      return { success: false, error: response.data.message };
    } catch (error) {
      console.error('Error creating notification:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create notification'
      };
    }
  }, []);

  // Fetch notification stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await adminAPI.getNotificationStats();
      dispatch({
        type: ACTIONS.UPDATE_STATS,
        payload: response.data
      });
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ERROR });
  }, []);

  // Auto-refresh notifications
  useEffect(() => {
    if (isAuthenticated && userType === 'admin') {
      fetchNotifications();
      fetchStats();

      // Set up polling for new notifications (every 30 seconds)
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, userType, fetchNotifications, fetchStats]);

  // Refetch when filters change
  useEffect(() => {
    if (isAuthenticated && userType === 'admin') {
      fetchNotifications();
    }
  }, [state.filters, isAuthenticated, userType, fetchNotifications]);

  const value = {
    // State
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    totalCount: state.totalCount,
    isLoading: state.isLoading,
    error: state.error,
    stats: state.stats,
    filters: state.filters,

    // Actions
    fetchNotifications,
    updateFilters,
    markAsRead,
    archiveNotification,
    handleNotificationAction,
    createNotification,
    fetchStats,
    clearError
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Custom hook to use notification context
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
