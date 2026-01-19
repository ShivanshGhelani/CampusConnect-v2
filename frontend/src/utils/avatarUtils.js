// Avatar utilities - separated to avoid circular imports
// CRITICAL: Now persisting avatar state to localStorage for page refresh survival

const AVATAR_STATE_STORAGE_KEY = 'avatar_global_state_v1';

// Initialize from localStorage if available
const initializeAvatarState = () => {
  try {
    const storedState = localStorage.getItem(AVATAR_STATE_STORAGE_KEY);
    if (storedState) {
      const parsed = JSON.parse(storedState);
      console.log('🔄 Restored avatar state from localStorage:', parsed);
      return parsed;
    }
  } catch (error) {
    console.error('❌ Failed to restore avatar state:', error);
  }
  
  return {
    globalAvatarUrl: null,
    isAvatarFetched: false,
    isFetching: false,
    currentUserId: null,
    lastFetchTime: null,
    ongoingFetchPromise: null
  };
};

// Initialize state from localStorage
const initialState = initializeAvatarState();

// Global avatar state variables
let globalAvatarUrl = initialState.globalAvatarUrl;
let avatarListeners = [];
let isAvatarFetched = initialState.isAvatarFetched;
let isFetching = false; // Never persist this
let currentUserId = initialState.currentUserId;
let lastFetchTime = initialState.lastFetchTime;
let ongoingFetchPromise = null; // Never persist this

// Helper to sync avatar state to localStorage
const syncAvatarStateToStorage = () => {
  try {
    const storableState = {
      globalAvatarUrl,
      isAvatarFetched,
      currentUserId,
      lastFetchTime
    };
    localStorage.setItem(AVATAR_STATE_STORAGE_KEY, JSON.stringify(storableState));
  } catch (error) {
    console.error('❌ Failed to sync avatar state to localStorage:', error);
  }
};

// Export function to reset global avatar state (for logout/user change)
export const resetAvatarGlobalState = () => {
  console.log('🗑️ Resetting avatar global state');
  globalAvatarUrl = null;
  isAvatarFetched = false;
  isFetching = false;
  currentUserId = null;
  lastFetchTime = null;
  ongoingFetchPromise = null;
  
  // Clear from localStorage
  try {
    localStorage.removeItem(AVATAR_STATE_STORAGE_KEY);
  } catch (error) {
    console.error('❌ Failed to clear avatar state from storage:', error);
  }
  
  // Notify all listeners to clear their avatar state
  avatarListeners.forEach(listener => listener(null));
};

// Export getters and setters for the global state
export const getGlobalAvatarState = () => ({
  globalAvatarUrl,
  isAvatarFetched,
  isFetching,
  currentUserId,
  lastFetchTime,
  ongoingFetchPromise
});

export const setGlobalAvatarState = (state) => {
  if (state.globalAvatarUrl !== undefined) globalAvatarUrl = state.globalAvatarUrl;
  if (state.isAvatarFetched !== undefined) isAvatarFetched = state.isAvatarFetched;
  if (state.isFetching !== undefined) isFetching = state.isFetching;
  if (state.currentUserId !== undefined) currentUserId = state.currentUserId;
  if (state.lastFetchTime !== undefined) lastFetchTime = state.lastFetchTime;
  if (state.ongoingFetchPromise !== undefined) ongoingFetchPromise = state.ongoingFetchPromise;
  
  // Sync to localStorage (but not isFetching or ongoingFetchPromise)
  syncAvatarStateToStorage();
};

export const addAvatarListener = (listener) => {
  avatarListeners.push(listener);
};

export const removeAvatarListener = (listener) => {
  avatarListeners = avatarListeners.filter(l => l !== listener);
};

export const updateAllAvatarListeners = (avatarUrl) => {
  globalAvatarUrl = avatarUrl;
  avatarListeners.forEach(listener => listener(avatarUrl));
  
  // Sync to localStorage
  syncAvatarStateToStorage();
};
