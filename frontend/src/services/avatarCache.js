/**
 * Avatar Cache Service
 * Provides fast avatar loading by caching avatar URLs in localStorage
 */

const AVATAR_CACHE_KEY = 'campus_connect_avatar_cache';
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

class AvatarCacheService {
  constructor() {
    this.cache = this.loadCache();
  }

  loadCache() {
    try {
      const cached = localStorage.getItem(AVATAR_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cache is expired
        if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
          return parsed.data || {};
        }
      }
    } catch (error) {
      console.warn('Failed to load avatar cache:', error);
    }
    return {};
  }

  saveCache() {
    try {
      const cacheData = {
        data: this.cache,
        timestamp: Date.now()
      };
      localStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save avatar cache:', error);
    }
  }

  getUserKey(user) {
    return user?.enrollment_no || user?.employee_id || user?.username || 'unknown';
  }

  getCachedAvatar(user) {
    const userKey = this.getUserKey(user);
    return this.cache[userKey] || null;
  }

  setCachedAvatar(user, avatarUrl) {
    const userKey = this.getUserKey(user);
    this.cache[userKey] = avatarUrl;
    this.saveCache();
  }

  removeCachedAvatar(user) {
    const userKey = this.getUserKey(user);
    delete this.cache[userKey];
    this.saveCache();
  }

  clearCache() {
    this.cache = {};
    localStorage.removeItem(AVATAR_CACHE_KEY);
  }

  // Prefetch avatar for faster loading
  async prefetchAvatar(user, avatarUrl) {
    if (!avatarUrl) return;
    
    try {
      // Create a new image to trigger browser caching
      const img = new Image();
      img.onload = () => {
        console.log('✅ Avatar prefetched for user:', this.getUserKey(user));
      };
      img.onerror = () => {
        console.warn('⚠️ Failed to prefetch avatar for user:', this.getUserKey(user));
      };
      img.src = avatarUrl;
    } catch (error) {
      console.warn('Avatar prefetch error:', error);
    }
  }
}

// Export singleton instance
export const avatarCache = new AvatarCacheService();

export default avatarCache;
