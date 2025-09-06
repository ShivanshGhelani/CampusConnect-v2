// Global admin event data cache to prevent duplicate API calls

let adminEventCache = {};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DUPLICATE_CALL_THRESHOLD = 1000; // 1 second

// Cache structure for each event:
// {
//   eventId: {
//     event: { data, fetchTime, isLoading, promise },
//     stats: { data, fetchTime, isLoading, promise },
//     participants: { data, fetchTime, isLoading, promise },
//     attendanceStats: { data, fetchTime, isLoading, promise }
//   }
// }

export const clearAdminEventCache = (eventId = null, dataType = null) => {
  if (eventId && dataType) {
    // Clear specific data type for specific event
    if (adminEventCache[eventId]?.[dataType]) {
      delete adminEventCache[eventId][dataType];
    }
  } else if (eventId) {
    // Clear all data for specific event
    delete adminEventCache[eventId];
  } else {
    // Clear all
    adminEventCache = {};
  }
  console.log('🗑️ Admin event cache cleared for:', eventId || 'all events', dataType || 'all data types');
};

const getCachedData = (eventId, dataType) => {
  const cache = adminEventCache[eventId]?.[dataType];
  if (!cache || !cache.data || !cache.fetchTime) {
    return null;
  }
  
  // Check if cache is expired
  const now = Date.now();
  if ((now - cache.fetchTime) > CACHE_DURATION) {
    console.log('📊 Admin event cache expired for:', eventId, dataType);
    if (adminEventCache[eventId]) {
      delete adminEventCache[eventId][dataType];
    }
    return null;
  }
  
  console.log('✅ Using cached admin event data for:', eventId, dataType);
  return cache.data;
};

const setCachedData = (eventId, dataType, data) => {
  if (!adminEventCache[eventId]) {
    adminEventCache[eventId] = {};
  }
  
  adminEventCache[eventId][dataType] = {
    data: data,
    fetchTime: Date.now(),
    isLoading: false,
    promise: null
  };
  console.log('💾 Cached admin event data for:', eventId, dataType);
};

// Fast cache check without validation (for immediate access)
export const getAnyAdminEventCache = (eventId, dataType) => {
  const cache = adminEventCache[eventId]?.[dataType];
  console.log('🔍 getAnyAdminEventCache check for:', eventId, dataType, 'Cache state:', {
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
    console.log('⏰ Admin event cache expired for:', eventId, dataType);
    if (adminEventCache[eventId]) {
      delete adminEventCache[eventId][dataType];
    }
    return null;
  }
  
  console.log('⚡ Fast admin event cache hit for:', eventId, dataType);
  return cache.data;
};

// Generic fetch function with cache
export const fetchAdminEventDataWithCache = async (eventId, dataType, fetchFunction) => {
  if (!adminEventCache[eventId]) {
    adminEventCache[eventId] = {};
  }
  
  const cache = adminEventCache[eventId][dataType];
  
  // Check if we have recent cached data (first priority)
  const cachedData = getCachedData(eventId, dataType);
  if (cachedData) {
    console.log('✅ Returning cached admin event data for:', eventId, dataType);
    return cachedData;
  }
  
  // Check if there's already a request in progress (prevent duplicate calls)
  if (cache?.isLoading && cache.promise) {
    console.log('⏳ Waiting for ongoing admin event request:', eventId, dataType);
    try {
      const result = await cache.promise;
      return result;
    } catch (error) {
      console.error('❌ Error in ongoing admin event request:', error);
      throw error;
    }
  }
  
  // Check for rapid successive calls (more aggressive prevention)
  const now = Date.now();
  if (cache?.fetchTime && (now - cache.fetchTime) < DUPLICATE_CALL_THRESHOLD) {
    console.log('🚫 Preventing rapid successive call for admin event:', eventId, dataType, 'Time since last:', now - cache.fetchTime, 'ms');
    if (cache.data) {
      return cache.data;
    }
    // If no data but recent call, wait a bit and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return getCachedData(eventId, dataType) || null;
  }
  
  // Make the API call (only if no cache and no ongoing request)
  console.log('🌐 Making fresh API call for admin event:', eventId, dataType);
  
  const fetchPromise = fetchFunction().then(response => {
    if (response.data.success) {
      setCachedData(eventId, dataType, response.data);
      // Reset loading state on success
      if (adminEventCache[eventId]?.[dataType]) {
        adminEventCache[eventId][dataType].isLoading = false;
        adminEventCache[eventId][dataType].promise = null;
      }
      return response.data;
    } else {
      throw new Error(response.data.message || `Failed to fetch admin event ${dataType}`);
    }
  }).catch(error => {
    // Reset loading state on error
    console.error('❌ Admin event fetch failed:', error);
    if (adminEventCache[eventId]?.[dataType]) {
      adminEventCache[eventId][dataType].isLoading = false;
      adminEventCache[eventId][dataType].promise = null;
    }
    throw error;
  });
  
  // Initialize cache entry if it doesn't exist
  if (!adminEventCache[eventId][dataType]) {
    adminEventCache[eventId][dataType] = {
      data: null,
      fetchTime: now,
      isLoading: true,
      promise: fetchPromise
    };
  } else {
    // Set loading state
    adminEventCache[eventId][dataType].isLoading = true;
    adminEventCache[eventId][dataType].promise = fetchPromise;
    adminEventCache[eventId][dataType].fetchTime = now;
  }
  
  return await fetchPromise;
};

// Specific cache functions for different data types
export const fetchEventDetailsWithCache = async (eventId, api) => {
  return fetchAdminEventDataWithCache(eventId, 'event', () => api.getEvent(eventId));
};

export const fetchEventStatsWithCache = async (eventId, api) => {
  return fetchAdminEventDataWithCache(eventId, 'stats', () => api.getEventStats(eventId));
};

export const fetchParticipantsWithCache = async (eventId, api, filters = {}) => {
  // Include filters in cache key for different filter combinations
  const cacheKey = `participants_${JSON.stringify(filters)}`;
  return fetchAdminEventDataWithCache(eventId, cacheKey, () => api.getParticipants(eventId, filters));
};

export const fetchAttendanceStatsWithCache = async (eventId, api) => {
  return fetchAdminEventDataWithCache(eventId, 'attendanceStats', () => api.getAttendanceStatistics(eventId));
};

// Batch fetch function to get all data at once with minimal duplicate calls
export const fetchAllEventDataWithCache = async (eventId, api, options = {}) => {
  const {
    includeStats = true,
    includeParticipants = true,
    includeAttendanceStats = true,
    participantFilters = { limit: 5 }
  } = options;
  
  console.log('🔄 Batch fetching admin event data for:', eventId);
  
  const promises = [
    fetchEventDetailsWithCache(eventId, api)
  ];
  
  if (includeStats) {
    promises.push(fetchEventStatsWithCache(eventId, api).catch(() => ({ success: false })));
  }
  
  if (includeParticipants) {
    promises.push(fetchParticipantsWithCache(eventId, api, participantFilters).catch(() => ({ success: false })));
  }
  
  if (includeAttendanceStats) {
    promises.push(fetchAttendanceStatsWithCache(eventId, api).catch(() => ({ success: false })));
  }
  
  const results = await Promise.all(promises);
  
  return {
    event: results[0],
    stats: includeStats ? results[1] : null,
    participants: includeParticipants ? results[includeStats ? 2 : 1] : null,
    attendanceStats: includeAttendanceStats ? results[promises.length - 1] : null
  };
};

// Cache invalidation for data updates
export const invalidateEventCache = (eventId, dataType = null) => {
  if (dataType) {
    // Invalidate specific data type
    if (adminEventCache[eventId]?.[dataType]) {
      delete adminEventCache[eventId][dataType];
      console.log('♻️ Invalidated admin event cache for:', eventId, dataType);
    }
  } else {
    // Invalidate all data for event
    delete adminEventCache[eventId];
    console.log('♻️ Invalidated all admin event cache for:', eventId);
  }
};

// Cache management utilities
export const getCacheStatus = (eventId = null) => {
  if (eventId) {
    const eventCache = adminEventCache[eventId];
    if (!eventCache) return null;
    
    const status = {};
    Object.keys(eventCache).forEach(dataType => {
      const cache = eventCache[dataType];
      status[dataType] = {
        hasData: !!cache.data,
        age: cache.fetchTime ? Date.now() - cache.fetchTime : null,
        isLoading: cache.isLoading,
        isExpired: cache.fetchTime ? (Date.now() - cache.fetchTime) > CACHE_DURATION : true
      };
    });
    
    return status;
  } else {
    // Return overview of all cached events
    const overview = {};
    Object.keys(adminEventCache).forEach(eventId => {
      overview[eventId] = getCacheStatus(eventId);
    });
    return overview;
  }
};

export const preloadEventData = async (eventId, api) => {
  console.log('🚀 Preloading admin event data for:', eventId);
  try {
    await fetchAllEventDataWithCache(eventId, api);
    console.log('✅ Preload complete for:', eventId);
  } catch (error) {
    console.error('❌ Preload failed for:', eventId, error);
  }
};
