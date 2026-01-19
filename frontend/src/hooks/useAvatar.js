import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import api from '../api/base';
import { 
  getGlobalAvatarState, 
  setGlobalAvatarState, 
  addAvatarListener, 
  removeAvatarListener, 
  updateAllAvatarListeners 
} from '../utils/avatarUtils';
import { fetchProfileWithCache, getCachedProfile } from '../utils/profileCache';

export { resetAvatarGlobalState } from '../utils/avatarUtils';

export const useAvatar = (user, userType) => {
  // Create stable user ID for comparison
  const userId = useMemo(() => {
    return user?.enrollment_no || user?.employee_id || user?.username;
  }, [user?.enrollment_no, user?.employee_id, user?.username]);
  
  // Memoize stable user type
  const stableUserType = useMemo(() => userType, [userType]);
  
  // Get initial state from global cache
  const initialState = useMemo(() => {
    const { globalAvatarUrl, isAvatarFetched, currentUserId } = getGlobalAvatarState();
    return (isAvatarFetched && currentUserId === userId) ? globalAvatarUrl : null;
  }, [userId]);
  
  const [avatarUrl, setAvatarUrl] = useState(initialState);
  
  // Use useRef instead of useMemo for hasInitialized to prevent re-creation
  const hasInitialized = useRef(false);
  
  // Create stable listener function that doesn't change on re-renders
  const stableListener = useCallback((newAvatarUrl) => {
    setAvatarUrl(newAvatarUrl);
  }, []);
  
  // Internal fetch function - memoized to prevent re-creation
  const fetchAvatarInternal = useCallback(async (userIdToFetch, userTypeToFetch) => {
    const { 
      isAvatarFetched: alreadyFetched, 
      currentUserId: cachedUserId
    } = getGlobalAvatarState();
    
    // If already fetched for same user, skip
    if (alreadyFetched && cachedUserId === userIdToFetch) {
      return;
    }
    
    
    
    try {
      // OPTIMIZED: Try to get cached profile data first (no API call)
      const cachedData = getCachedProfile(userTypeToFetch, userIdToFetch);
      
      if (cachedData && cachedData.profile?.avatar_url) {
        // Use cached avatar data
        const avatarUrl = cachedData.profile.avatar_url;
        updateAllAvatarListeners(avatarUrl);
        setGlobalAvatarState({ 
          globalAvatarUrl: avatarUrl,
          isAvatarFetched: true, 
          currentUserId: userIdToFetch, 
          isFetching: false,
          lastFetchTime: Date.now(),
          ongoingFetchPromise: null
        });
        
        return;
      }
      
      // Only make API call if no cached data is available
      
      const data = await fetchProfileWithCache(userTypeToFetch, userIdToFetch, api);
      
      if (data && data.success && data.profile?.avatar_url) {
        const avatarUrl = data.profile.avatar_url;
        updateAllAvatarListeners(avatarUrl);
        setGlobalAvatarState({ 
          globalAvatarUrl: avatarUrl,
          isAvatarFetched: true, 
          currentUserId: userIdToFetch, 
          isFetching: false,
          lastFetchTime: Date.now(),
          ongoingFetchPromise: null
        });
      } else {
        updateAllAvatarListeners(null);
        setGlobalAvatarState({ 
          globalAvatarUrl: null,
          isAvatarFetched: true, 
          currentUserId: userIdToFetch, 
          isFetching: false,
          lastFetchTime: Date.now(),
          ongoingFetchPromise: null
        });
      }
    } catch (error) {
      
      updateAllAvatarListeners(null);
      setGlobalAvatarState({ 
        globalAvatarUrl: null,
        isAvatarFetched: true, 
        currentUserId: userIdToFetch, 
        isFetching: false,
        lastFetchTime: Date.now(),
        ongoingFetchPromise: null
      });
    }
  }, []);
  
  useEffect(() => {
    // Add this component to listeners with stable function
    addAvatarListener(stableListener);
    
    // Check global state FIRST - prioritize cached data
    const { 
      currentUserId: cachedUserId, 
      isAvatarFetched: alreadyFetched, 
      globalAvatarUrl: cachedAvatar, 
      isFetching 
    } = getGlobalAvatarState();
    
    // If we have a valid cached avatar for this user, use it immediately
    if (alreadyFetched && cachedUserId === userId && cachedAvatar) {
      console.log('✅ Using globally cached avatar for:', userId);
      setAvatarUrl(cachedAvatar);
      return () => {
        removeAvatarListener(stableListener);
      };
    }
    
    // Only run initialization logic once per component instance
    if (!hasInitialized.current && userId && stableUserType) {
      hasInitialized.current = true;
      
      if (userId !== cachedUserId) {
        console.log('👤 New user detected, fetching avatar for:', userId);
        
        // Reset for new user
        setGlobalAvatarState({
          globalAvatarUrl: null,
          isAvatarFetched: false,
          isFetching: false,
          currentUserId: userId
        });
        setAvatarUrl(null);
        
        // Fetch avatar for new user
        fetchAvatarInternal(userId, stableUserType);
      } else if (!alreadyFetched && !isFetching) {
        console.log('🔄 No cache found, fetching avatar for:', userId);
        // Fetch if not cached and not currently fetching
        fetchAvatarInternal(userId, stableUserType);
      } else if (alreadyFetched && cachedUserId === userId && cachedAvatar) {
        console.log('✅ Using cached avatar in initialization for:', userId);
        // Use cached value
        setAvatarUrl(cachedAvatar);
      }
    }

    // Cleanup with stable listener reference
    return () => {
      removeAvatarListener(stableListener);
    };
  }, [userId, stableUserType, stableListener, fetchAvatarInternal]); // Include stableListener in deps
  
  // Create stable functions that don't change on re-renders
  const refreshAvatar = useCallback(() => {
    if (userId && stableUserType) {
      fetchAvatarInternal(userId, stableUserType);
    }
  }, [userId, stableUserType, fetchAvatarInternal]);
  
  const forceRefreshAvatar = useCallback(() => {
    
    setGlobalAvatarState({ isAvatarFetched: false, isFetching: false });
    if (userId && stableUserType) {
      fetchAvatarInternal(userId, stableUserType);
    }
  }, [userId, stableUserType, fetchAvatarInternal]);

  return {
    avatarUrl,
    refreshAvatar,
    forceRefreshAvatar,
    updateAvatar: updateAllAvatarListeners,
    isLoading: false
  };
};
