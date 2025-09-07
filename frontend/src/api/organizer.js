import api from './base';

// Organizer API endpoints - OPTIMIZED: Only endpoints actually being used
export const organizerAPI = {
  // ✅ ACTIVE: Faculty organizer access management 
  accessOrganizerPortal: () => api.post('/api/v1/organizer/access-portal'),
  
  // ✅ ACTIVE: Admin endpoints for organizer management (used in admin.js)
  grantOrganizerAccess: (facultyEmployeeId, assignedEvents = []) => 
    api.post(`/api/v1/admin/organizer/grant-access/${facultyEmployeeId}`, { assigned_events: assignedEvents }),
  revokeOrganizerAccess: (facultyEmployeeId) => 
    api.post(`/api/v1/admin/organizer/revoke-access/${facultyEmployeeId}`),
  getOrganizerRequests: () => api.get('/api/v1/admin/organizer/requests'),
  
  // 🔄 REUSE STRATEGY: Once faculty becomes organizer admin via accessOrganizerPortal(),
  // they use existing optimized admin endpoints (adminAPI) for all other operations:
  // - Events: adminAPI.getEvents(), adminAPI.createEvent(), etc.
  // - Venues: adminAPI.getVenues(), adminAPI.createVenue(), etc. 
  // - Users: adminAPI.getStudents(), adminAPI.getFaculty(), etc.
  // - Assets: adminAPI.getAssetsData(), adminAPI.uploadAsset(), etc.
  // 
  // This maintains your 62-endpoint optimization by avoiding endpoint duplication.
};
