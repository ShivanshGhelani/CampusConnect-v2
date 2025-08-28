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
      console.warn('Cannot initialize session: user is null or undefined');
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
      console.log('✅ Session avatar cache initialized for user:', this.getUserKey(user));
    } catch (error) {
      console.error('Failed to initialize session avatar cache:', error);
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
      console.log('✅ Session avatar cache cleared');
    } catch (error) {
      console.error('Failed to clear session avatar cache:', error);
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
        console.log('Session avatar cache data found for:', parsed.userKey);
      }
    } catch (error) {
      console.warn('Failed to load session avatar cache:', error);
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
      console.warn('No active session for avatar cache');
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
      console.warn('No active session to cache avatar');
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
      console.error('Failed to persist session avatar cache:', error);
    }
  }

  /**
   * Remove cached avatar for the current session user
   */
  removeCachedAvatar() {
    if (!this.sessionUser) {
      console.warn('No active session to remove avatar from');
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
      console.error('Failed to update session avatar cache:', error);
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
        console.log('✅ Avatar prefetched for session user:', this.getUserKey(this.sessionUser));
        this.setCachedAvatar(avatarUrl);
      };
      img.onerror = () => {
        console.warn('⚠️ Failed to prefetch avatar for session user:', this.getUserKey(this.sessionUser));
      };
      img.src = avatarUrl;
    } catch (error) {
      console.warn('Session avatar prefetch error:', error);
    }
  }
}

// Export singleton instance
export const sessionAvatarCache = new SessionAvatarCacheService();

export default sessionAvatarCache;
