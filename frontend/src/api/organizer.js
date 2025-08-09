import api from './base';

// Organizer API endpoints - Works with existing optimized unified organizer backend
export const organizerAPI = {
  // Faculty organizer access management - CORRECTED PATHS
  requestOrganizerAccess: () => api.post('/api/v1/organizer/request-access'),
  getOrganizerAccessStatus: () => api.get('/api/v1/organizer/access-status'),
  accessOrganizerPortal: () => api.post('/api/v1/organizer/access-portal'),
  
  // Organizer dashboard and statistics - CORRECTED PATHS
  getDashboardStats: () => api.get('/api/v1/organizer/dashboard-stats'),
  
  // Admin endpoints for organizer management (Super Admin only) - CORRECTED PATHS
  grantOrganizerAccess: (facultyEmployeeId, assignedEvents = []) => 
    api.post(`/api/v1/admin/organizer/grant-access/${facultyEmployeeId}`, { assigned_events: assignedEvents }),
  revokeOrganizerAccess: (facultyEmployeeId) => 
    api.post(`/api/v1/admin/organizer/revoke-access/${facultyEmployeeId}`),
  getOrganizerRequests: () => api.get('/api/v1/admin/organizer/requests'),
  
  // Event management for organizers (reuse existing optimized admin endpoints)
  // Note: Once faculty becomes organizer admin, they use the existing admin event APIs
  getMyEvents: (filters) => api.get('/api/v1/admin/events/list', { params: filters }),
  getMyEventDetails: (eventId) => api.get(`/api/v1/admin/events/details/${eventId}`),
  createEvent: (eventData) => api.post('/api/v1/admin/events/create', eventData),
  updateEvent: (eventId, eventData) => api.put(`/api/v1/admin/events/update/${eventId}`, eventData),
  deleteEvent: (eventId) => api.delete(`/api/v1/admin/events/delete/${eventId}`),
  getEventRegistrations: (eventId, filters) => api.get(`/api/v1/admin/events/registrations/${eventId}`, { params: filters }),
  
  // Venue access for organizers (reuse existing optimized admin endpoints)
  getAvailableVenues: (filters) => api.get('/api/v1/admin/venues/list', { params: filters }),
  getAllVenues: (filters) => api.get('/api/v1/admin/venues/all', { params: filters }),
  
  // Certificate management for organizers (reuse existing optimized admin endpoints)
  getCertificateTemplates: (filters) => api.get('/api/v1/admin/certificate-templates/', { params: filters }),
  
  // Asset management for organizers (reuse existing optimized admin endpoints)
  getAssets: (filters) => api.get('/api/v1/admin/assets/list', { params: filters }),
  uploadAsset: (assetData) => api.post('/api/v1/admin/assets/upload', assetData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // User management for organizers (reuse existing optimized admin endpoints)
  getStudents: (filters) => api.get('/api/v1/admin/users/list', { params: { ...filters, user_type: 'student' } }),
  
  // Utility functions
  checkOrganizerPermissions: () => api.get('/api/v1/auth/status', { params: { user_type: 'faculty' } }),
  
  // DESIGN PRINCIPLE: 
  // This API layer leverages your optimized backend by:
  // 1. Using existing admin endpoints once faculty becomes organizer admin
  // 2. Only adding minimal organizer-specific access management endpoints
  // 3. Not duplicating functionality - smart reuse of existing endpoints
  // 4. Maintaining the 62-endpoint optimization you worked hard to achieve
};
