// Avatar utilities - separated to avoid circular imports

// Global avatar state variables
let globalAvatarUrl = null;
let avatarListeners = [];
let isAvatarFetched = false;
let isFetching = false;
let currentUserId = null;

// Export function to reset global avatar state (for logout/user change)
export const resetAvatarGlobalState = () => {
  console.log('🔄 Resetting global avatar state (logout/user change)');
  globalAvatarUrl = null;
  isAvatarFetched = false;
  isFetching = false;
  currentUserId = null;
  // Notify all listeners to clear their avatar state
  avatarListeners.forEach(listener => listener(null));
};

// Export getters and setters for the global state
export const getGlobalAvatarState = () => ({
  globalAvatarUrl,
  isAvatarFetched,
  isFetching,
  currentUserId
});

export const setGlobalAvatarState = (state) => {
  if (state.globalAvatarUrl !== undefined) globalAvatarUrl = state.globalAvatarUrl;
  if (state.isAvatarFetched !== undefined) isAvatarFetched = state.isAvatarFetched;
  if (state.isFetching !== undefined) isFetching = state.isFetching;
  if (state.currentUserId !== undefined) currentUserId = state.currentUserId;
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
};
