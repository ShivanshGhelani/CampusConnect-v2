// Optimized API exports with lazy loading support
// Only load what you need to reduce initial bundle size

// Re-export base axios instance
export { default as api } from './base';

// Lazy-loaded API modules
export const loadAuthAPI = () => import('./auth').then(m => m.authAPI);
export const loadClientAPI = () => import('./client').then(m => m.clientAPI);
export const loadAdminAPI = () => import('./admin').then(m => m.adminAPI);
export const loadOrganizerAPI = () => import('./organizer').then(m => m.organizerAPI);
export const loadSystemAPI = () => import('./system').then(m => m.systemAPI);

// Direct exports for most commonly used APIs (smaller bundle impact)
export { authAPI } from './auth';
export { clientAPI } from './client';
export { adminAPI } from './admin';
export { organizerAPI } from './organizer';
export { systemAPI } from './system'; // NEW - System management
export { simpleAPI } from './simple';
