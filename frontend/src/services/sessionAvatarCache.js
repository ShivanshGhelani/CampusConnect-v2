/**
 * Session Avatar Cache Service
 * Manages user-specific avatar caching with session-based lifecycle
 */

const SESSION_AVATAR_CACHE_KEY = 'campus_connect_session_avatar_cache';
const SESSION_USER_KEY = 'campus_connect_session_user';

class SessionAvatarCacheService {
  constructor() {
    this.sessionUser = null;
    this.avatarCache = new Map();
    this.loadSession();
  }

  /**
   * Initialize session for a specific user
   * @param {Object} user - User object with identifier
   */
  initializeSession(user) {
    if (!user) {
      
      return;
    }

    this.sessionUser = user;
    this.avatarCache.clear(); // Clear any previous session data
    
    // Store session user info
    try {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify({
        userKey: this.getUserKey(user),
        timestamp: Date.now()
      }));
      
    } catch (error) {
      
    }
  }

  /**
   * Clear the entire session and all cached data
   */
  clearSession() {
    this.sessionUser = null;
    this.avatarCache.clear();
    
    try {
      sessionStorage.removeItem(SESSION_USER_KEY);
      sessionStorage.removeItem(SESSION_AVATAR_CACHE_KEY);
      
    } catch (error) {
      
    }
  }

  /**
   * Load session data from sessionStorage
   */
  loadSession() {
    try {
      const sessionData = sessionStorage.getItem(SESSION_USER_KEY);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        // Session data exists, but we don't restore the user object
        // as it should be provided by the auth context
        
      }
    } catch (error) {
      
    }
  }

  /**
   * Generate a unique key for the user
   * @param {Object} user - User object
   * @returns {string} - Unique user key
   */
  getUserKey(user) {
    if (!user) return 'anonymous';
    return user.enrollment_no || user.employee_id || user.username || user.id || 'unknown';
  }

  /**
   * Get cached avatar URL for the current session user
   * @returns {string|null} - Cached avatar URL or null
   */
  getCachedAvatar() {
    if (!this.sessionUser) {
      
      return null;
    }

    const userKey = this.getUserKey(this.sessionUser);
    return this.avatarCache.get(userKey) || null;
  }

  /**
   * Cache avatar URL for the current session user
   * @param {string} avatarUrl - Avatar URL to cache
   */
  setCachedAvatar(avatarUrl) {
    if (!this.sessionUser) {
      
      return;
    }

    const userKey = this.getUserKey(this.sessionUser);
    this.avatarCache.set(userKey, avatarUrl);
    
    // Persist to sessionStorage
    try {
      const cacheData = Object.fromEntries(this.avatarCache);
      sessionStorage.setItem(SESSION_AVATAR_CACHE_KEY, JSON.stringify({
        data: cacheData,
        timestamp: Date.now()
      }));
    } catch (error) {
      
    }
  }

  /**
   * Remove cached avatar for the current session user
   */
  removeCachedAvatar() {
    if (!this.sessionUser) {
      
      return;
    }

    const userKey = this.getUserKey(this.sessionUser);
    this.avatarCache.delete(userKey);
    
    // Update sessionStorage
    try {
      const cacheData = Object.fromEntries(this.avatarCache);
      sessionStorage.setItem(SESSION_AVATAR_CACHE_KEY, JSON.stringify({
        data: cacheData,
        timestamp: Date.now()
      }));
    } catch (error) {
      
    }
  }

  /**
   * Check if user has an active session
   * @returns {boolean} - True if session is active
   */
  hasActiveSession() {
    return this.sessionUser !== null;
  }

  /**
   * Get current session user
   * @returns {Object|null} - Current session user or null
   */
  getSessionUser() {
    return this.sessionUser;
  }

  /**
   * Prefetch avatar for the current session user
   * @param {string} avatarUrl - Avatar URL to prefetch
   */
  async prefetchAvatar(avatarUrl) {
    if (!avatarUrl || !this.sessionUser) return;
    
    try {
      const img = new Image();
      img.onload = () => {
        
        this.setCachedAvatar(avatarUrl);
      };
      img.onerror = () => {
        
      };
      img.src = avatarUrl;
    } catch (error) {
      
    }
  }
}

// Export singleton instance
export const sessionAvatarCache = new SessionAvatarCacheService();

export default sessionAvatarCache;
