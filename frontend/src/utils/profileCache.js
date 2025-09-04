// Global profile data cache to prevent duplicate API calls

let profileCache = {
  student: {
    data: null,
    fetchTime: null,
    isLoading: false,
    promise: null
  },
  faculty: {
    data: null,
    fetchTime: null,
    isLoading: false,
    promise: null
  }
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DUPLICATE_CALL_THRESHOLD = 1000; // 1 second

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
  console.log('🗑️ Profile cache cleared for:', userType || 'all');
};

export const getCachedProfile = (userType, userId) => {
  const cache = profileCache[userType];
  if (!cache || !cache.data || !cache.fetchTime) {
    return null;
  }
  
  // Check if cache is expired
  const now = Date.now();
  if ((now - cache.fetchTime) > CACHE_DURATION) {
    console.log('📊 Profile cache expired for:', userType);
    return null;
  }
  
  // Check if cached data is for the same user
  const cachedUserId = cache.data.profile?.enrollment_no || cache.data.profile?.employee_id;
  if (cachedUserId !== userId) {
    console.log('📊 Profile cache user mismatch:', cachedUserId, '!==', userId);
    return null;
  }
  
  console.log('✅ Using cached profile for:', userType, userId);
  return cache.data;
};

export const setCachedProfile = (userType, data) => {
  profileCache[userType] = {
    data: data,
    fetchTime: Date.now(),
    isLoading: false,
    promise: null
  };
  console.log('💾 Cached profile for:', userType);
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
    console.log('⏰ Cache expired for:', userType);
    return null;
  }
  
  console.log('⚡ Fast cache hit for:', userType);
  return cache.data;
};

export const fetchProfileWithCache = async (userType, userId, api) => {
  const cache = profileCache[userType];
  
  // Check if we have recent cached data (first priority)
  const cachedData = getCachedProfile(userType, userId);
  if (cachedData) {
    console.log('✅ Returning cached profile for:', userType, userId);
    return cachedData;
  }
  
  // Check if there's already a request in progress (prevent duplicate calls)
  if (cache.isLoading && cache.promise) {
    console.log('⏳ Waiting for ongoing profile request:', userType, userId);
    try {
      const result = await cache.promise;
      return result;
    } catch (error) {
      console.error('❌ Error in ongoing request:', error);
      throw error;
    }
  }
  
  // Check for rapid successive calls (more aggressive prevention)
  const now = Date.now();
  if (cache.fetchTime && (now - cache.fetchTime) < DUPLICATE_CALL_THRESHOLD) {
    console.log('🚫 Preventing rapid successive call for:', userType, userId, 'Time since last:', now - cache.fetchTime, 'ms');
    if (cache.data) {
      return cache.data;
    }
    // If no data but recent call, wait a bit and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return getCachedProfile(userType, userId) || null;
  }
  
  // Make the API call (only if no cache and no ongoing request)
  console.log('🌐 Making fresh API call for profile:', userType, userId);
  
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
    console.error('❌ Profile fetch failed:', error);
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
