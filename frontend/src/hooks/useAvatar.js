import { useState, useEffect, useMemo } from 'react';
import { getAvatarUrl } from '../services/unifiedStorage';
import api from '../api/base';
import { useAuth } from '../context/AuthContext';

// Global avatar state
let globalAvatarUrl = null;
let avatarListeners = [];
let isAvatarFetched = false; // Track if we've already fetched the avatar
let isFetching = false; // Prevent multiple simultaneous fetches
let currentUserId = null; // Track current user to detect user changes

// Export function to reset global avatar state (for logout/user change)
export const resetAvatarGlobalState = () => {
  console.log('🔄 Resetting global avatar state (logout/user change)');
  globalAvatarUrl = null;
  isAvatarFetched = false;
  isFetching = false;
  currentUserId = null;
  // Notify all listeners to clear their avatar state
  avatarListeners.forEach(listener => listener(null));
};

export const useAvatar = (user) => {
  const { userType } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(globalAvatarUrl);
  
  // Create stable user ID for comparison (prevent unnecessary re-renders)
  const userId = useMemo(() => {
    return user?.enrollment_no || user?.employee_id || user?.username;
  }, [user?.enrollment_no, user?.employee_id, user?.username]);
  
  // Memoize user type to prevent re-renders
  const stableUserType = useMemo(() => userType, [userType]);
  
  useEffect(() => {
    // Add this component to listeners
    avatarListeners.push(setAvatarUrl);

    // Check if user has ACTUALLY changed (more stable detection)
    if (userId && userId !== currentUserId) {
      console.log('🔄 User changed detected:', {
        previousUser: currentUserId,
        newUser: userId
      });
      
      // Reset avatar state for new user
      globalAvatarUrl = null;
      isAvatarFetched = false;
      isFetching = false;
      currentUserId = userId;
      
      // Immediately update current component with null avatar
      setAvatarUrl(null);
    }

    // Set current user if not set but user exists
    if (userId && !currentUserId) {
      currentUserId = userId;
    }

    // Fetch avatar on mount if we haven't fetched it yet and user exists
    if (!isAvatarFetched && user && stableUserType && !isFetching && userId) {
      console.log('useAvatar: Initial fetch triggered for user:', userId);
      fetchAvatar();
    } else if (isAvatarFetched && globalAvatarUrl !== null) {
      console.log('useAvatar: Avatar already fetched, using cached value for same user');
      setAvatarUrl(globalAvatarUrl);
    } else if (isAvatarFetched && globalAvatarUrl === null) {
      // Even if avatar is null, set it to prevent flicker
      setAvatarUrl(null);
    }

    // Cleanup listener on unmount
    return () => {
      avatarListeners = avatarListeners.filter(listener => listener !== setAvatarUrl);
    };
  }, [userId, stableUserType, user]); // More stable dependencies
  const fetchAvatar = async () => {
    if (!user || !userType || isFetching) return;
    
    const userId = user.enrollment_no || user.employee_id || user.username;
    
    // Skip fetch if already fetched for the same user
    if (isAvatarFetched && currentUserId === userId) {
      console.log('useAvatar: Avatar already fetched for current user, skipping');
      return;
    }
    
    console.log('useAvatar: Fetching avatar for user:', userId);
    isFetching = true;
    
    try {
      // Use different API endpoint based on user type
      const endpoint = userType === 'faculty' 
        ? '/api/v1/client/profile/faculty/info' 
        : '/api/v1/client/profile/info';
      
      const response = await api.get(endpoint);
      if (response.data.success && response.data.profile?.avatar_url) {
        // Use the stored avatar_url directly
        const avatarUrl = response.data.profile.avatar_url;
        
        console.log('useAvatar: Avatar found for user', userId);
        updateGlobalAvatar(avatarUrl);
      } else {
        console.log('useAvatar: No avatar found for user', userId);
        updateGlobalAvatar(null);
      }
      
      // Mark as fetched regardless of result
      isAvatarFetched = true;
      console.log('useAvatar: Fetch completed for user', userId);
    } catch (error) {
      console.error('Error fetching avatar for user', userId, ':', error);
      updateGlobalAvatar(null);
      isAvatarFetched = true; // Even on error, mark as fetched to prevent retry loops
    } finally {
      isFetching = false;
    }
  };

  const updateGlobalAvatar = (newAvatarUrl) => {
    globalAvatarUrl = newAvatarUrl;
    // Notify all listeners
    avatarListeners.forEach(listener => listener(newAvatarUrl));
  };  const refreshAvatar = () => {
    // Reset the fetched state to allow fresh fetch
    console.log('useAvatar: Refresh requested, resetting cache');
    isAvatarFetched = false;
    fetchAvatar();
  };
  // Force refresh function that bypasses all caching
  const forceRefreshAvatar = () => {
    console.log('useAvatar: Force refresh requested, resetting all states');
    isAvatarFetched = false;
    isFetching = false; // Reset fetching state too
    fetchAvatar();
  };

  // Reset function for logout or user change
  const resetAvatarState = () => {
    console.log('useAvatar: Resetting avatar state');
    resetAvatarGlobalState();
  };
  return {
    avatarUrl,
    refreshAvatar,
    forceRefreshAvatar,
    resetAvatarState,
    updateAvatar: updateGlobalAvatar
  };
};
