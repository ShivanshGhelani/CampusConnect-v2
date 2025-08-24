import { useState, useEffect, useMemo } from 'react';
import { getAvatarUrl } from '../services/unifiedStorage';
import { avatarCache } from '../services/avatarCache';
import { useAuth } from '../context/AuthContext';

/**
 * Optimized Avatar Hook
 * Provides fast avatar loading with localStorage cache and prefetching
 */
export const useAvatarFast = (user) => {
  const { userType } = useAuth();
  
  // Initialize with cached avatar for instant display
  const cachedAvatar = useMemo(() => avatarCache.getCachedAvatar(user), [user]);
  const [avatarUrl, setAvatarUrl] = useState(cachedAvatar);
  const [isLoading, setIsLoading] = useState(!cachedAvatar);
  
  // Create stable user ID
  const userId = useMemo(() => {
    return user?.enrollment_no || user?.employee_id || user?.username;
  }, [user?.enrollment_no, user?.employee_id, user?.username]);
  
  const fetchAvatar = async () => {
    if (!user || !userId) {
      setAvatarUrl(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Get avatar URL from service
      const fetchedAvatarUrl = await getAvatarUrl(user, userType);
      
      // Update cache
      avatarCache.setCachedAvatar(user, fetchedAvatarUrl);
      
      // Prefetch image for browser cache
      if (fetchedAvatarUrl) {
        avatarCache.prefetchAvatar(user, fetchedAvatarUrl);
      }
      
      setAvatarUrl(fetchedAvatarUrl);
      console.log('✅ Avatar loaded for user:', userId);
      
    } catch (error) {
      console.error('❌ Avatar fetch error:', error);
      setAvatarUrl(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to load avatar
  useEffect(() => {
    if (!userId) return;

    // If we have cached avatar, show it immediately and optionally refresh in background
    if (cachedAvatar) {
      setAvatarUrl(cachedAvatar);
      setIsLoading(false);
      
      // Optional: Refresh in background after a short delay
      const backgroundRefresh = setTimeout(() => {
        fetchAvatar();
      }, 2000);
      
      return () => clearTimeout(backgroundRefresh);
    } else {
      // No cache, fetch immediately
      fetchAvatar();
    }
  }, [userId, userType]);

  const updateAvatar = (newAvatarUrl) => {
    setAvatarUrl(newAvatarUrl);
    if (user) {
      avatarCache.setCachedAvatar(user, newAvatarUrl);
      if (newAvatarUrl) {
        avatarCache.prefetchAvatar(user, newAvatarUrl);
      }
    }
  };

  const forceRefreshAvatar = async () => {
    if (user) {
      avatarCache.removeCachedAvatar(user);
    }
    await fetchAvatar();
  };

  return {
    avatarUrl,
    isLoading,
    updateAvatar,
    forceRefreshAvatar
  };
};

export default useAvatarFast;
