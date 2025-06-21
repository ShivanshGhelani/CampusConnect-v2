import { useState, useEffect } from 'react';
import { getAvatarUrl } from '../lib/supabase';
import api from '../api/axios';

// Global avatar state
let globalAvatarUrl = null;
let avatarListeners = [];
let isAvatarFetched = false; // Track if we've already fetched the avatar
let isFetching = false; // Prevent multiple simultaneous fetches

export const useAvatar = (user) => {
  const [avatarUrl, setAvatarUrl] = useState(globalAvatarUrl);
  useEffect(() => {
    // Add this component to listeners
    avatarListeners.push(setAvatarUrl);

    // Fetch avatar on mount if we haven't fetched it yet and user exists
    if (!isAvatarFetched && user && !isFetching) {
      console.log('useAvatar: Initial fetch triggered for user:', user.enrollment_no);
      fetchAvatar();
    } else if (isAvatarFetched) {
      console.log('useAvatar: Avatar already fetched, using cached value:', globalAvatarUrl ? 'has avatar' : 'no avatar');
    }

    // Cleanup listener on unmount
    return () => {
      avatarListeners = avatarListeners.filter(listener => listener !== setAvatarUrl);
    };
  }, [user]);
  const fetchAvatar = async () => {
    if (!user || isFetching) return;
    
    console.log('useAvatar: Fetching avatar for user:', user.enrollment_no);
    isFetching = true;
    
    try {      const response = await api.get('/api/v1/client/profile/info');
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
