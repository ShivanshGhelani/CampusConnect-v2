import { useState, useEffect, useMemo } from 'react';
import { sessionAvatarCache } from '../services/sessionAvatarCache';
import { useAuth } from '../context/AuthContext';
import api from '../api/base';

/**
 * Session-based Avatar Hook
 * Fetches avatar only once per login session, then uses cached data
 */
export const useAvatarFast = (user) => {
  const { userType } = useAuth();
  
  // Initialize with session cached avatar for instant display
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  
  // Create stable user ID
  const userId = useMemo(() => {
    return user?.enrollment_no || user?.employee_id || user?.username;
  }, [user?.enrollment_no, user?.employee_id, user?.username]);

  // Initialize session cache and check for cached avatar
  useEffect(() => {
    if (!user || !userId) {
      setAvatarUrl(null);
      return;
    }

    console.log('🔍 Checking session avatar cache for user:', userId);
    
    // Initialize session for this user
    const cachedAvatar = sessionAvatarCache.initializeSession(user);
    
    if (cachedAvatar !== null) {
      // We have cached avatar, use it immediately
      setAvatarUrl(cachedAvatar);
      setIsLoading(false);
      console.log('⚡ Using session cached avatar:', cachedAvatar);
      
      // Prefetch for browser cache
      if (cachedAvatar) {
        sessionAvatarCache.prefetchAvatar(cachedAvatar);
      }
    } else {
      // No cached avatar, need to fetch
      console.log('📡 No session cache, fetching avatar from backend...');
      fetchAvatarFromBackend();
    }
  }, [userId, userType]);

  const fetchAvatarFromBackend = async () => {
    if (!user || !userType || isFetching) return;

    setIsFetching(true);
    setIsLoading(true);

    try {
      // Use different API endpoint based on user type
      const endpoint = userType === 'faculty' 
        ? '/api/v1/client/profile/faculty/info' 
        : '/api/v1/client/profile/info';
      
      console.log(`� Fetching avatar from ${endpoint} for user:`, userId);
      const response = await api.get(endpoint);
      
      let fetchedAvatarUrl = null;
      if (response.data.success && response.data.profile?.avatar_url) {
        fetchedAvatarUrl = response.data.profile.avatar_url;
        console.log('✅ Avatar fetched from backend:', fetchedAvatarUrl);
      } else {
        console.log('ℹ️ No avatar found in backend for user:', userId);
      }
      
      // Store in session cache for future use
      sessionAvatarCache.setSessionAvatar(user, fetchedAvatarUrl);
      
      // Update state
      setAvatarUrl(fetchedAvatarUrl);
      
      // Prefetch for browser cache
      if (fetchedAvatarUrl) {
        sessionAvatarCache.prefetchAvatar(fetchedAvatarUrl);
      }
      
    } catch (error) {
      console.error('❌ Avatar fetch error:', error);
      // Even on error, cache the null result to prevent repeated failed requests
      sessionAvatarCache.setSessionAvatar(user, null);
      setAvatarUrl(null);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  };

  const updateAvatar = (newAvatarUrl) => {
    console.log('🔄 Updating avatar in session cache:', newAvatarUrl);
    setAvatarUrl(newAvatarUrl);
    if (user) {
      sessionAvatarCache.updateSessionAvatar(user, newAvatarUrl);
      if (newAvatarUrl) {
        sessionAvatarCache.prefetchAvatar(newAvatarUrl);
      }
    }
  };

  const forceRefreshAvatar = async () => {
    console.log('🔄 Force refreshing avatar (clearing session cache)');
    if (user) {
      // Clear session cache to force fresh fetch
      sessionAvatarCache.clearSession();
    }
    await fetchAvatarFromBackend();
  };

  return {
    avatarUrl,
    isLoading,
    updateAvatar,
    forceRefreshAvatar
  };
};

export default useAvatarFast;
