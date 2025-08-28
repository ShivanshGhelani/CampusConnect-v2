import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import api from '../api/base';
import { 
  getGlobalAvatarState, 
  setGlobalAvatarState, 
  addAvatarListener, 
  removeAvatarListener, 
  updateAllAvatarListeners 
} from '../utils/avatarUtils';

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
    const { isFetching: currentlyFetching, isAvatarFetched: alreadyFetched, currentUserId: cachedUserId } = getGlobalAvatarState();
    
    if ((alreadyFetched && cachedUserId === userIdToFetch) || currentlyFetching) {
      return;
    }
    
    console.log('useAvatar: Fetching avatar for user:', userIdToFetch);
    setGlobalAvatarState({ isFetching: true });
    
    try {
      const endpoint = userTypeToFetch === 'faculty' 
        ? '/api/v1/client/profile/faculty/info' 
        : '/api/v1/client/profile/info';
      
      const response = await api.get(endpoint);
      if (response.data.success && response.data.profile?.avatar_url) {
        const avatarUrl = response.data.profile.avatar_url;
        updateAllAvatarListeners(avatarUrl);
        setGlobalAvatarState({ 
          globalAvatarUrl: avatarUrl,
          isAvatarFetched: true, 
          currentUserId: userIdToFetch, 
          isFetching: false 
        });
      } else {
        updateAllAvatarListeners(null);
        setGlobalAvatarState({ 
          globalAvatarUrl: null,
          isAvatarFetched: true, 
          currentUserId: userIdToFetch, 
          isFetching: false 
        });
      }
    } catch (error) {
      console.error('Error fetching avatar:', error);
      updateAllAvatarListeners(null);
      setGlobalAvatarState({ 
        globalAvatarUrl: null,
        isAvatarFetched: true, 
        currentUserId: userIdToFetch, 
        isFetching: false 
      });
    }
  }, []);
  
  useEffect(() => {
    // Add this component to listeners with stable function
    addAvatarListener(stableListener);
    
    // Only run initialization logic once per component instance
    if (!hasInitialized.current && userId && stableUserType) {
      hasInitialized.current = true;
      
      const { currentUserId: cachedUserId, isAvatarFetched: alreadyFetched, globalAvatarUrl: cachedAvatar, isFetching } = getGlobalAvatarState();
      
      if (userId !== cachedUserId) {
        console.log('🔄 User changed detected:', { previousUser: cachedUserId, newUser: userId });
        
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
        // Fetch if not cached and not currently fetching
        fetchAvatarInternal(userId, stableUserType);
      } else if (alreadyFetched && cachedUserId === userId) {
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
    console.log('useAvatar: Force refresh requested');
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
