import { useState, useEffect } from 'react';
import { getAvatarUrl } from '../services/unifiedStorage';
import api from '../api/base';
import { useAuth } from '../context/AuthContext';

// Global avatar state
let globalAvatarUrl = null;
let avatarListeners = [];
let isAvatarFetched = false; // Track if we've already fetched the avatar
let isFetching = false; // Prevent multiple simultaneous fetches

export const useAvatar = (user) => {
  const { userType } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(globalAvatarUrl);
  useEffect(() => {
    // Add this component to listeners
    avatarListeners.push(setAvatarUrl);

    // Fetch avatar on mount if we haven't fetched it yet and user exists
    if (!isAvatarFetched && user && userType && !isFetching) {
      console.log('useAvatar: Initial fetch triggered for user:', user.enrollment_no || user.employee_id);
      fetchAvatar();
    } else if (isAvatarFetched) {
      console.log('useAvatar: Avatar already fetched, using cached value:', globalAvatarUrl ? 'has avatar' : 'no avatar');
    }

    // Cleanup listener on unmount
    return () => {
      avatarListeners = avatarListeners.filter(listener => listener !== setAvatarUrl);
    };
  }, [user, userType]);
  const fetchAvatar = async () => {
    if (!user || !userType || isFetching) return;
    
    console.log('useAvatar: Fetching avatar for user:', user.enrollment_no || user.employee_id);
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
        
        console.log('useAvatar: Avatar found, updating global state');
        updateGlobalAvatar(avatarUrl);
      } else {
        console.log('useAvatar: No avatar found, setting to null');
        updateGlobalAvatar(null);
      }
      
      // Mark as fetched regardless of result
      isAvatarFetched = true;
      console.log('useAvatar: Fetch completed, marked as fetched');
    } catch (error) {
      console.error('Error fetching avatar:', error);
      updateGlobalAvatar(null);
      isAvatarFetched = true; // Even on error, mark as fetched to prevent retry loops
      console.log('useAvatar: Fetch failed, marked as fetched to prevent retries');
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
    globalAvatarUrl = null;
    isAvatarFetched = false;
    isFetching = false;
    avatarListeners.forEach(listener => listener(null));
  };
  return {
    avatarUrl,
    refreshAvatar,
    forceRefreshAvatar,
    resetAvatarState,
    updateAvatar: updateGlobalAvatar
  };
};
