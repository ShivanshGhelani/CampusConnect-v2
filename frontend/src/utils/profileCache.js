// Global profile data cache to prevent duplicate API calls
// CRITICAL: Now using localStorage for persistence across page refreshes

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DUPLICATE_CALL_THRESHOLD = 1000; // 1 second
const CACHE_STORAGE_KEY = 'profile_cache_v2';

// Initialize cache from localStorage if available
const initializeCacheFromStorage = () => {
  try {
    const storedCache = localStorage.getItem(CACHE_STORAGE_KEY);
    if (storedCache) {
      const parsed = JSON.parse(storedCache);
      console.log('🔄 Restored profile cache from localStorage');
      return parsed;
    }
  } catch (error) {
    console.error('❌ Failed to restore cache from localStorage:', error);
  }
  
  // Return empty cache structure
  return {
    student: { data: null, fetchTime: null, isLoading: false, promise: null },
    faculty: { data: null, fetchTime: null, isLoading: false, promise: null }
  };
};

// Initialize cache (will restore from localStorage if available)
let profileCache = initializeCacheFromStorage();

// Helper to sync cache to localStorage
const syncCacheToStorage = () => {
  try {
    // Don't store promises or isLoading state
    const storableCache = {
      student: {
        data: profileCache.student.data,
        fetchTime: profileCache.student.fetchTime,
        isLoading: false,
        promise: null
      },
      faculty: {
        data: profileCache.faculty.data,
        fetchTime: profileCache.faculty.fetchTime,
        isLoading: false,
        promise: null
      }
    };
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(storableCache));
  } catch (error) {
    console.error('❌ Failed to sync cache to localStorage:', error);
  }
};

export const clearProfileCache = (userType = null) => {
  if (userType) {
    profileCache[userType] = {
      data: null,
      fetchTime: null,
      isLoading: false,
      promise: null
    };
  } else {
    // Clear all
    profileCache.student = { data: null, fetchTime: null, isLoading: false, promise: null };
    profileCache.faculty = { data: null, fetchTime: null, isLoading: false, promise: null };
  }
  
  // Sync to localStorage
  syncCacheToStorage();
  console.log('🗑️ Profile cache cleared for:', userType || 'all users');
};

export const getCachedProfile = (userType, userId) => {
  const cache = profileCache[userType];
  if (!cache || !cache.data || !cache.fetchTime) {
    return null;
  }
  
  // Check if cache is expired
  const now = Date.now();
  if ((now - cache.fetchTime) > CACHE_DURATION) {
    console.log('⏰ Cache expired for:', userType, 'Clearing cache');
    // Clear expired cache
    clearProfileCache(userType);
    return null;
  }
  
  // Check if cached data is for the same user
  const cachedUserId = cache.data.profile?.enrollment_no || cache.data.profile?.employee_id;
  if (cachedUserId !== userId) {
    console.log('👤 Different user detected, clearing cache');
    clearProfileCache(userType);
    return null;
  }
  
  console.log('✅ Valid cache found for:', userType, userId);
  return cache.data;
};

export const setCachedProfile = (userType, data) => {
  profileCache[userType] = {
    data: data,
    fetchTime: Date.now(),
    isLoading: false,
    promise: null
  };
  
  // Sync to localStorage for persistence
  syncCacheToStorage();
  console.log('💾 Profile cached for:', userType);
};

// Update cache with new profile data (for profile updates)
export const updateCachedProfile = (userType, updatedProfileData) => {
  const cache = profileCache[userType];
  if (cache && cache.data) {
    // Update the profile data while keeping the same structure
    cache.data = {
      ...cache.data,
      profile: {
        ...cache.data.profile,
        ...updatedProfileData
      }
    };
    cache.fetchTime = Date.now();
    
    // Sync to localStorage
    syncCacheToStorage();
    console.log('🔄 Profile cache updated for:', userType);
    return true;
  }
  console.log('⚠️ No existing cache to update for:', userType);
  return false;
};

// Fast cache check without userId validation (for immediate access)
export const getAnyCache = (userType) => {
  const cache = profileCache[userType];
  console.log('🔍 getAnyCache check for:', userType, 'Cache state:', {
    hasCache: !!cache,
    hasData: !!cache?.data,
    hasTime: !!cache?.fetchTime,
    age: cache?.fetchTime ? Date.now() - cache?.fetchTime : 'N/A'
  });
  
  if (!cache || !cache.data || !cache.fetchTime) {
    return null;
  }
  
  // Check if cache is expired
  const now = Date.now();
  if ((now - cache.fetchTime) > CACHE_DURATION) {
    console.log('⏰ Cache expired in getAnyCache, clearing cache');
    clearProfileCache(userType);
    return null;
  }
  
  console.log('✅ Valid cache found in getAnyCache for:', userType);
  return cache.data;
};

export const fetchProfileWithCache = async (userType, userId, api) => {
  const cache = profileCache[userType];
  
  // CRITICAL: Validate API parameter
  if (!api || typeof api.get !== 'function') {
    console.error('❌ Invalid API object passed to fetchProfileWithCache:', api);
    throw new Error('API object is required and must have a .get() method');
  }
  
  // Check if we have recent cached data (first priority)
  const cachedData = getCachedProfile(userType, userId);
  if (cachedData) {
    console.log('🎯 Using cached data for:', userType, userId);
    return cachedData;
  }
  
  // Check if there's already a request in progress (prevent duplicate calls)
  if (cache.isLoading && cache.promise) {
    console.log('⏳ Request already in progress for:', userType);
    try {
      const result = await cache.promise;
      return result;
    } catch (error) {
      console.error('❌ Failed to wait for existing request:', error);
      throw error;
    }
  }
  
  // Check for rapid successive calls (more aggressive prevention)
  const now = Date.now();
  if (cache.fetchTime && (now - cache.fetchTime) < DUPLICATE_CALL_THRESHOLD) {
    console.log('🚫 Preventing duplicate call within threshold for:', userType);
    if (cache.data) {
      return cache.data;
    }
    // If no data but recent call, wait a bit and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return getCachedProfile(userType, userId) || null;
  }
  
  // Make the API call (only if no cache and no ongoing request)
  console.log('🌐 Making fresh API call for:', userType, userId);
  
  const endpoint = userType === 'faculty' 
    ? '/api/v1/client/profile/faculty/complete-profile'
    : '/api/v1/client/profile/complete-profile';
  
  const fetchPromise = api.get(endpoint).then(response => {
    if (response.data.success) {
      setCachedProfile(userType, response.data);
      // Reset loading state on success
      profileCache[userType].isLoading = false;
      profileCache[userType].promise = null;
      return response.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch profile');
    }
  }).catch(error => {
    // Reset loading state on error
    console.error('❌ Profile fetch failed for:', userType, error);
    profileCache[userType].isLoading = false;
    profileCache[userType].promise = null;
    throw error;
  });
  
  // Set loading state
  profileCache[userType].isLoading = true;
  profileCache[userType].promise = fetchPromise;
  profileCache[userType].fetchTime = now;
  
  return await fetchPromise;
};

// Check if cache is expired and refresh for active sessions
export const refreshExpiredCache = async (userType, userId, api, forceRefresh = false) => {
  // CRITICAL: Validate API parameter
  if (!api || typeof api.get !== 'function') {
    console.error('❌ Invalid API object passed to refreshExpiredCache:', api);
    return null; // Return null instead of throwing to prevent blocking UI
  }
  
  const cache = profileCache[userType];
  const now = Date.now();
  
  // If no cache or cache is expired, fetch fresh data
  if (!cache || !cache.data || !cache.fetchTime || 
      (now - cache.fetchTime) > CACHE_DURATION || forceRefresh) {
    console.log('🔄 Refreshing expired cache for active session:', userType, userId);
    try {
      return await fetchProfileWithCache(userType, userId, api);
    } catch (error) {
      console.error('❌ Failed to refresh expired cache:', error);
      return null;
    }
  }
  
  return cache.data;
};
