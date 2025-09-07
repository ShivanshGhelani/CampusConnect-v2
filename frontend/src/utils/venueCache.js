/**
 * Venue Cache System
 * Optimizes venue API calls by caching active venues for selection dropdowns
 * and all venues for management operations
 */

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DUPLICATE_CALL_THRESHOLD = 1000; // 1 second

// Cache storage
let venueCache = {
  active: null,    // Active venues for selection dropdowns
  all: null,       // All venues for management
  fetchTime: null, // Last fetch timestamp
  isLoading: false,
  promise: null    // Ongoing request promise
};

// Helper to check if cache is valid
const isCacheValid = (cacheKey) => {
  const cache = venueCache[cacheKey];
  if (!cache || !venueCache.fetchTime) return false;
  
  const now = Date.now();
  return (now - venueCache.fetchTime) < CACHE_DURATION;
};

// Get cached data if valid
export const getCachedVenues = (activeOnly = false) => {
  const cacheKey = activeOnly ? 'active' : 'all';
  
  if (isCacheValid(cacheKey)) {
    
    return venueCache[cacheKey];
  }
  
  
  return null;
};

// Set cached data
const setCachedVenues = (venues, activeOnly = false) => {
  const now = Date.now();
  
  if (activeOnly) {
    venueCache.active = venues.filter(v => v.is_active);
    venueCache.all = null; // Clear all cache when we only have active
  } else {
    venueCache.all = venues;
    venueCache.active = venues.filter(v => v.is_active);
  }
  
  venueCache.fetchTime = now;
  venueCache.isLoading = false;
  venueCache.promise = null;
  
  
};

// Generic fetch with cache - Updated to use single getVenues endpoint
export const fetchVenuesWithCache = async (api, includeInactive = false) => {
  const cacheKey = includeInactive ? 'all' : 'active';
  
  // Check cache first
  const cached = getCachedVenues(!includeInactive);
  if (cached) {
    return { success: true, data: cached };
  }
  
  // Prevent duplicate calls
  if (venueCache.isLoading && venueCache.promise) {
    
    try {
      const result = await venueCache.promise;
      return result;
    } catch (error) {
      
      throw error;
    }
  }
  
  // Check for rapid successive calls
  const now = Date.now();
  if (venueCache.fetchTime && (now - venueCache.fetchTime) < DUPLICATE_CALL_THRESHOLD) {
    
    const existing = getCachedVenues(!includeInactive);
    if (existing) return { success: true, data: existing };
    
    // Wait a bit and try cache again
    await new Promise(resolve => setTimeout(resolve, 100));
    const retryCache = getCachedVenues(!includeInactive);
    if (retryCache) return { success: true, data: retryCache };
  }
  
  // Make API call directly to avoid circular dependency
  const params = includeInactive ? { include_inactive: true } : {};
  
  
  const fetchPromise = api.get('/api/v1/admin/venues/', { params })
    .then(response => {
      const venueData = response.data?.data || response.data || [];
      if (Array.isArray(venueData)) {
        setCachedVenues(venueData, !includeInactive);
        return { success: true, data: includeInactive ? venueCache.all : venueCache.active };
      } else {
        throw new Error('Invalid venue data format');
      }
    })
    .catch(error => {
      
      venueCache.isLoading = false;
      venueCache.promise = null;
      throw error;
    });
  
  venueCache.isLoading = true;
  venueCache.promise = fetchPromise;
  
  return fetchPromise;
};

// Specific functions for different use cases - Updated for single endpoint
export const fetchActiveVenuesForSelection = async (apiInstance) => {
  return fetchVenuesWithCache(apiInstance, false); // includeInactive = false
};

export const fetchAllVenuesForManagement = async (apiInstance) => {
  return fetchVenuesWithCache(apiInstance, true); // includeInactive = true
};

// Invalidate cache (call after CRUD operations)
export const invalidateVenueCache = () => {
  
  venueCache = {
    active: null,
    all: null,
    fetchTime: null,
    isLoading: false,
    promise: null
  };
};

// Clear cache completely
export const clearVenueCache = () => {
  invalidateVenueCache();
  
};

// Optimistic update - update cache immediately after successful operations
export const updateVenueCacheAfterOperation = (venueId, operation, venueData = null) => {
  if (!venueCache.all && !venueCache.active) return;
  
  
  
  try {
    if (operation === 'create' && venueData) {
      if (venueCache.all) {
        venueCache.all.push(venueData);
      }
      if (venueCache.active && venueData.is_active) {
        venueCache.active.push(venueData);
      }
    } else if (operation === 'update' && venueData) {
      [venueCache.all, venueCache.active].forEach(cache => {
        if (cache) {
          const index = cache.findIndex(v => v.venue_id === venueId);
          if (index !== -1) {
            cache[index] = venueData;
          }
        }
      });
    } else if (operation === 'delete') {
      // Soft delete - mark as inactive
      [venueCache.all, venueCache.active].forEach(cache => {
        if (cache) {
          const venue = cache.find(v => v.venue_id === venueId);
          if (venue) {
            venue.is_active = false;
          }
        }
      });
      // Remove from active cache
      if (venueCache.active) {
        venueCache.active = venueCache.active.filter(v => v.venue_id !== venueId);
      }
    } else if (operation === 'restore') {
      // Restore - mark as active
      [venueCache.all, venueCache.active].forEach(cache => {
        if (cache) {
          const venue = cache.find(v => v.venue_id === venueId);
          if (venue) {
            venue.is_active = true;
          }
        }
      });
    } else if (operation === 'permanent_delete') {
      // Remove completely from all caches
      [venueCache.all, venueCache.active].forEach(cache => {
        if (cache) {
          const index = cache.findIndex(v => v.venue_id === venueId);
          if (index !== -1) {
            cache.splice(index, 1);
          }
        }
      });
    }
  } catch (error) {
    
    // If optimistic update fails, invalidate cache to force refresh
    invalidateVenueCache();
  }
};
