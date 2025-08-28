/**
 * Comprehensive Data Caching Service for CampusConnect
 * Reduces API calls by caching user profile and event data
 */

class DataCacheService {
  constructor() {
    this.caches = {
      profile: 'cc_profile_cache',
      events: 'cc_events_cache',
      registrations: 'cc_registrations_cache',
      dashboardStats: 'cc_dashboard_stats_cache'
    };
    
    // Cache expiry times (in milliseconds)
    this.expiryTimes = {
      profile: 30 * 60 * 1000, // 30 minutes - profile data doesn't change often
      events: 5 * 60 * 1000,   // 5 minutes - event data might change
      registrations: 2 * 60 * 1000, // 2 minutes - registration status changes
      dashboardStats: 10 * 60 * 1000 // 10 minutes - stats don't change often
    };
  }

  /**
   * Generic cache methods
   */
  _getCacheItem(cacheKey) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache has expired
      if (data.expiry && now > data.expiry) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      console.log(`✅ Cache hit for ${cacheKey}`);
      return data.value;
    } catch (error) {
      console.error(`Cache read error for ${cacheKey}:`, error);
      return null;
    }
  }

  _setCacheItem(cacheKey, value, expiryTime) {
    try {
      const cacheData = {
        value,
        timestamp: Date.now(),
        expiry: Date.now() + expiryTime
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`📦 Cached data for ${cacheKey}`);
    } catch (error) {
      console.error(`Cache write error for ${cacheKey}:`, error);
    }
  }

  _removeCacheItem(cacheKey) {
    try {
      localStorage.removeItem(cacheKey);
      console.log(`🗑️ Removed cache for ${cacheKey}`);
    } catch (error) {
      console.error(`Cache remove error for ${cacheKey}:`, error);
    }
  }

  /**
   * Profile Data Caching
   */
  getCachedProfile(userId) {
    return this._getCacheItem(`${this.caches.profile}_${userId}`);
  }

  setCachedProfile(userId, profileData) {
    this._setCacheItem(
      `${this.caches.profile}_${userId}`, 
      profileData, 
      this.expiryTimes.profile
    );
  }

  invalidateProfileCache(userId) {
    this._removeCacheItem(`${this.caches.profile}_${userId}`);
  }

  /**
   * Event Data Caching
   */
  getCachedEvent(eventId) {
    return this._getCacheItem(`${this.caches.events}_${eventId}`);
  }

  setCachedEvent(eventId, eventData) {
    this._setCacheItem(
      `${this.caches.events}_${eventId}`, 
      eventData, 
      this.expiryTimes.events
    );
  }

  invalidateEventCache(eventId) {
    this._removeCacheItem(`${this.caches.events}_${eventId}`);
  }

  /**
   * Registration Status Caching
   */
  getCachedRegistrationStatus(userId, eventId) {
    return this._getCacheItem(`${this.caches.registrations}_${userId}_${eventId}`);
  }

  setCachedRegistrationStatus(userId, eventId, statusData) {
    this._setCacheItem(
      `${this.caches.registrations}_${userId}_${eventId}`, 
      statusData, 
      this.expiryTimes.registrations
    );
  }

  invalidateRegistrationCache(userId, eventId) {
    this._removeCacheItem(`${this.caches.registrations}_${userId}_${eventId}`);
  }

  /**
   * Dashboard Stats Caching
   */
  getCachedDashboardStats(userId) {
    return this._getCacheItem(`${this.caches.dashboardStats}_${userId}`);
  }

  setCachedDashboardStats(userId, statsData) {
    this._setCacheItem(
      `${this.caches.dashboardStats}_${userId}`, 
      statsData, 
      this.expiryTimes.dashboardStats
    );
  }

  invalidateDashboardStatsCache(userId) {
    this._removeCacheItem(`${this.caches.dashboardStats}_${userId}`);
  }

  /**
   * Session Data Management
   */
  getSessionData(key) {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Session read error for ${key}:`, error);
      return null;
    }
  }

  setSessionData(key, data) {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
      console.log(`💾 Session data saved for ${key}`);
    } catch (error) {
      console.error(`Session write error for ${key}:`, error);
    }
  }

  removeSessionData(key) {
    try {
      sessionStorage.removeItem(key);
      console.log(`🗑️ Session data removed for ${key}`);
    } catch (error) {
      console.error(`Session remove error for ${key}:`, error);
    }
  }

  /**
   * Enhanced Profile Data with Session Backup
   */
  getCompleteProfileData(userId) {
    // First try cache
    let profileData = this.getCachedProfile(userId);
    
    // If not in cache, try session storage
    if (!profileData) {
      profileData = this.getSessionData(`profile_session_${userId}`);
      if (profileData) {
        // Move from session to cache
        this.setCachedProfile(userId, profileData);
        console.log(`♻️ Moved profile data from session to cache for user ${userId}`);
      }
    }
    
    return profileData;
  }

  setCompleteProfileData(userId, profileData) {
    // Store in both cache and session for redundancy
    this.setCachedProfile(userId, profileData);
    this.setSessionData(`profile_session_${userId}`, profileData);
  }

  /**
   * Bulk Data Operations
   */
  clearUserCache(userId) {
    // Clear all user-specific cached data
    this.invalidateProfileCache(userId);
    this.invalidateDashboardStatsCache(userId);
    this.removeSessionData(`profile_session_${userId}`);
    console.log(`🧹 Cleared all cache for user ${userId}`);
  }

  clearAllCaches() {
    // Clear all cached data (useful on logout)
    Object.values(this.caches).forEach(cachePrefix => {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(cachePrefix));
      keys.forEach(key => localStorage.removeItem(key));
    });
    
    // Clear session storage
    sessionStorage.clear();
    
    console.log('🧹 All caches cleared');
  }

  /**
   * Cache Statistics and Debugging
   */
  getCacheStats() {
    const stats = {};
    
    Object.entries(this.caches).forEach(([type, prefix]) => {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix));
      stats[type] = {
        count: keys.length,
        keys: keys
      };
    });
    
    return stats;
  }

  // Force refresh - invalidates all caches and forces fresh data
  forceRefresh() {
    this.clearAllCaches();
    console.log('🔄 Force refresh - all caches cleared');
  }
}

// Export singleton instance
export const dataCache = new DataCacheService();

/**
 * Enhanced Client API with Caching
 */
export class CachedClientAPI {
  constructor(originalAPI, cacheService) {
    this.api = originalAPI;
    this.cache = cacheService;
  }

  async getProfileWithCache(userId, forceRefresh = false) {
    if (!forceRefresh) {
      const cached = this.cache.getCompleteProfileData(userId);
      if (cached) {
        console.log('📋 Using cached profile data');
        return { data: { success: true, profile: cached } };
      }
    }

    console.log('🌐 Fetching fresh profile data from API');
    const response = await this.api.getProfile();
    
    if (response.data.success) {
      const profileData = response.data.student || response.data.profile;
      if (profileData) {
        this.cache.setCompleteProfileData(userId, profileData);
      }
    }
    
    return response;
  }

  async getEventDetailsWithCache(eventId, forceRefresh = false) {
    if (!forceRefresh) {
      const cached = this.cache.getCachedEvent(eventId);
      if (cached) {
        console.log('🎫 Using cached event data');
        return { data: { success: true, event: cached } };
      }
    }

    console.log('🌐 Fetching fresh event data from API');
    const response = await this.api.getEventDetails(eventId);
    
    if (response.data.success) {
      const eventData = response.data.event;
      if (eventData) {
        this.cache.setCachedEvent(eventId, eventData);
      }
    }
    
    return response;
  }

  async getRegistrationStatusWithCache(userId, eventId, forceRefresh = false) {
    if (!forceRefresh) {
      const cached = this.cache.getCachedRegistrationStatus(userId, eventId);
      if (cached) {
        console.log('📝 Using cached registration status');
        return { data: cached };
      }
    }

    console.log('🌐 Fetching fresh registration status from API');
    const response = await this.api.getRegistrationStatus(eventId);
    
    if (response.data) {
      this.cache.setCachedRegistrationStatus(userId, eventId, response.data);
    }
    
    return response;
  }

  // Invalidate relevant caches after registration
  invalidateAfterRegistration(userId, eventId) {
    this.cache.invalidateRegistrationCache(userId, eventId);
    this.cache.invalidateDashboardStatsCache(userId);
    console.log('♻️ Invalidated registration-related caches');
  }

  // Pass through other API methods
  async registerIndividual(eventId, registrationData) {
    const response = await this.api.registerIndividual(eventId, registrationData);
    
    // Invalidate relevant caches after successful registration
    if (response.data.success) {
      const userId = registrationData.enrollment_no;
      this.invalidateAfterRegistration(userId, eventId);
    }
    
    return response;
  }

  async registerTeam(eventId, registrationData) {
    const response = await this.api.registerTeam(eventId, registrationData);
    
    // Invalidate relevant caches after successful registration
    if (response.data.success) {
      const userId = registrationData.enrollment_no;
      this.invalidateAfterRegistration(userId, eventId);
    }
    
    return response;
  }

  // Forward all other methods to original API
  lookupStudent(...args) { return this.api.lookupStudent(...args); }
  validateParticipant(...args) { return this.api.validateParticipant(...args); }
}

export default DataCacheService;
