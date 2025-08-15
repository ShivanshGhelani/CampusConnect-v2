import { useState, useEffect } from 'react';
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
  
  useEffect(() => {
    // Add this component to listeners
    avatarListeners.push(setAvatarUrl);

    // Check if user has changed (critical for fixing the logout bug)
    const newUserId = user?.enrollment_no || user?.employee_id || user?.username;
    
    if (newUserId !== currentUserId) {
      console.log('🔄 User changed detected:', {
        previousUser: currentUserId,
        newUser: newUserId
      });
      
      // Reset avatar state for new user
      globalAvatarUrl = null;
      isAvatarFetched = false;
      isFetching = false;
      currentUserId = newUserId;
      
      // Immediately update current component with null avatar
      setAvatarUrl(null);
    }

    // Fetch avatar on mount if we haven't fetched it yet and user exists
    if (!isAvatarFetched && user && userType && !isFetching) {
      console.log('useAvatar: Initial fetch triggered for user:', newUserId);
      fetchAvatar();
    } else if (isAvatarFetched && globalAvatarUrl !== null) {
      console.log('useAvatar: Avatar already fetched, using cached value for same user');
      setAvatarUrl(globalAvatarUrl);
    }

    // Cleanup listener on unmount
    return () => {
      avatarListeners = avatarListeners.filter(listener => listener !== setAvatarUrl);
    };
  }, [user, userType]); // Re-run when user or userType changes
  const fetchAvatar = async () => {
    if (!user || !userType || isFetching) return;
    
    const userId = user.enrollment_no || user.employee_id || user.username;
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
