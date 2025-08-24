/**
 * Session-based Avatar Cache Service
 * Stores avatar in sessionStorage and cookies for instant loading
 * Fetches avatar only once per login session
 */

const SESSION_AVATAR_KEY = 'campus_connect_session_avatar';
const COOKIE_AVATAR_KEY = 'cc_avatar_url';
const SESSION_USER_KEY = 'campus_connect_session_user';

class SessionAvatarCacheService {
  constructor() {
    this.currentSessionUser = null;
    this.sessionAvatarUrl = null;
    this.isInitialized = false;
  }

  // Initialize session cache on app start
  initializeSession(user) {
    if (!user) return;

    const userId = this.getUserId(user);
    console.log('🚀 Initializing session avatar cache for user:', userId);

    // Check if we have session data for this user
    const sessionData = this.getSessionData();
    if (sessionData && sessionData.userId === userId) {
      // Same user, use cached avatar
      this.currentSessionUser = userId;
      this.sessionAvatarUrl = sessionData.avatarUrl;
      this.isInitialized = true;
      console.log('✅ Session avatar cache initialized from storage:', this.sessionAvatarUrl);
      return this.sessionAvatarUrl;
    } else {
      // Different user or no cache, clear old data
      this.clearSession();
      this.currentSessionUser = userId;
      console.log('🔄 New user session detected, cache cleared');
      return null;
    }
  }

  // Get user identifier
  getUserId(user) {
    return user?.enrollment_no || user?.employee_id || user?.username || 'unknown';
  }

  // Get session data from storage
  getSessionData() {
    try {
      // Try sessionStorage first (survives page refreshes but not browser close)
      const sessionData = sessionStorage.getItem(SESSION_AVATAR_KEY);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        if (parsed.timestamp && (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000)) { // 24 hours
          return parsed;
        }
      }

      // Fallback to cookie (survives browser close)
      const cookieAvatar = this.getCookie(COOKIE_AVATAR_KEY);
      const cookieUser = this.getCookie(SESSION_USER_KEY);
      if (cookieAvatar && cookieUser) {
        return {
          userId: cookieUser,
          avatarUrl: cookieAvatar,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      console.warn('Failed to load session avatar cache:', error);
    }
    return null;
  }

  // Store avatar in session (called after successful fetch/upload)
  setSessionAvatar(user, avatarUrl) {
    if (!user) return;

    const userId = this.getUserId(user);
    const sessionData = {
      userId,
      avatarUrl,
      timestamp: Date.now()
    };

    this.currentSessionUser = userId;
    this.sessionAvatarUrl = avatarUrl;
    this.isInitialized = true;

    try {
      // Store in sessionStorage
      sessionStorage.setItem(SESSION_AVATAR_KEY, JSON.stringify(sessionData));
      
      // Store in cookie as backup (expires in 7 days)
      this.setCookie(COOKIE_AVATAR_KEY, avatarUrl || '', 7);
      this.setCookie(SESSION_USER_KEY, userId, 7);
      
      console.log('✅ Avatar stored in session cache:', avatarUrl);
    } catch (error) {
      console.warn('Failed to store session avatar cache:', error);
    }
  }

  // Get cached avatar for current session
  getSessionAvatar(user) {
    if (!user) return null;

    const userId = this.getUserId(user);
    
    // If we have it in memory and it's for the same user
    if (this.isInitialized && this.currentSessionUser === userId) {
      console.log('⚡ Using in-memory session avatar cache');
      return this.sessionAvatarUrl;
    }

    // Try to load from storage
    const sessionData = this.getSessionData();
    if (sessionData && sessionData.userId === userId) {
      this.currentSessionUser = userId;
      this.sessionAvatarUrl = sessionData.avatarUrl;
      this.isInitialized = true;
      console.log('⚡ Using storage session avatar cache');
      return this.sessionAvatarUrl;
    }

    return null;
  }

  // Check if avatar is already cached for this user
  hasSessionAvatar(user) {
    if (!user) return false;
    return this.getSessionAvatar(user) !== null;
  }

  // Clear session cache (on logout or user change)
  clearSession() {
    this.currentSessionUser = null;
    this.sessionAvatarUrl = null;
    this.isInitialized = false;

    try {
      sessionStorage.removeItem(SESSION_AVATAR_KEY);
      this.setCookie(COOKIE_AVATAR_KEY, '', -1); // Expire cookie
      this.setCookie(SESSION_USER_KEY, '', -1); // Expire cookie
      console.log('🧹 Session avatar cache cleared');
    } catch (error) {
      console.warn('Failed to clear session avatar cache:', error);
    }
  }

  // Update avatar in session cache (after upload/delete)
  updateSessionAvatar(user, newAvatarUrl) {
    this.setSessionAvatar(user, newAvatarUrl);
  }

  // Cookie helper methods
  setCookie(name, value, days) {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + (value || '') + expires + '; path=/; SameSite=Strict';
  }

  getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  // Prefetch avatar for browser cache
  async prefetchAvatar(avatarUrl) {
    if (!avatarUrl) return;
    
    try {
      const img = new Image();
      img.onload = () => console.log('🖼️ Avatar prefetched for browser cache');
      img.onerror = () => console.warn('⚠️ Failed to prefetch avatar');
      img.src = avatarUrl;
    } catch (error) {
      console.warn('Avatar prefetch error:', error);
    }
  }
}

// Export singleton instance
export const sessionAvatarCache = new SessionAvatarCacheService();
export default sessionAvatarCache;
