// Global event details cache to prevent duplicate API calls

let eventCache = {};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DUPLICATE_CALL_THRESHOLD = 1000; // 1 second

export const clearEventCache = (eventId = null) => {
  if (eventId) {
    delete eventCache[eventId];
  } else {
    // Clear all
    eventCache = {};
  }
  
};

export const getCachedEvent = (eventId) => {
  const cache = eventCache[eventId];
  if (!cache || !cache.data || !cache.fetchTime) {
    return null;
  }
  
  // Check if cache is expired
  const now = Date.now();
  if ((now - cache.fetchTime) > CACHE_DURATION) {
    
    delete eventCache[eventId];
    return null;
  }
  
  
  return cache.data;
};

export const setCachedEvent = (eventId, data) => {
  eventCache[eventId] = {
    data: data,
    fetchTime: Date.now(),
    isLoading: false,
    promise: null
  };
  
};

// Fast cache check without validation (for immediate access)
export const getAnyEventCache = (eventId) => {
  const cache = eventCache[eventId];
  console.log('🔍 getAnyEventCache check for:', eventId, 'Cache state:', {
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
    
    delete eventCache[eventId];
    return null;
  }
  
  
  return cache.data;
};

export const fetchEventWithCache = async (eventId, api) => {
  const cache = eventCache[eventId];
  
  // Check if we have recent cached data (first priority)
  const cachedData = getCachedEvent(eventId);
  if (cachedData) {
    
    return cachedData;
  }
  
  // Check if there's already a request in progress (prevent duplicate calls)
  if (cache?.isLoading && cache.promise) {
    
    try {
      const result = await cache.promise;
      return result;
    } catch (error) {
      
      throw error;
    }
  }
  
  // Check for rapid successive calls (more aggressive prevention)
  const now = Date.now();
  if (cache?.fetchTime && (now - cache.fetchTime) < DUPLICATE_CALL_THRESHOLD) {
    
    if (cache.data) {
      return cache.data;
    }
    // If no data but recent call, wait a bit and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return getCachedEvent(eventId) || null;
  }
  
  // Make the API call (only if no cache and no ongoing request)
  
  
  const fetchPromise = api.getEventDetails(eventId).then(response => {
    if (response.data.success) {
      setCachedEvent(eventId, response.data);
      // Reset loading state on success
      if (eventCache[eventId]) {
        eventCache[eventId].isLoading = false;
        eventCache[eventId].promise = null;
      }
      return response.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch event details');
    }
  }).catch(error => {
    // Reset loading state on error
    
    if (eventCache[eventId]) {
      eventCache[eventId].isLoading = false;
      eventCache[eventId].promise = null;
    }
    throw error;
  });
  
  // Initialize cache entry if it doesn't exist
  if (!eventCache[eventId]) {
    eventCache[eventId] = {
      data: null,
      fetchTime: now,
      isLoading: true,
      promise: fetchPromise
    };
  } else {
    // Set loading state
    eventCache[eventId].isLoading = true;
    eventCache[eventId].promise = fetchPromise;
    eventCache[eventId].fetchTime = now;
  }
  
  return await fetchPromise;
};
