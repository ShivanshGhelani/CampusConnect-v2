// Admin API endpoints - Split into separate chunk
import api from './base';

export const adminAPI = {
  // Analytics - CORRECTED to use actual backend endpoints
  getDashboardStats: () => api.get('/api/v1/admin/analytics/overview'),
  getEventsAnalytics: (filters) => api.get('/api/v1/admin/analytics/overview', { params: { ...filters, focus: 'events' } }),
  getStudentsAnalytics: () => api.get('/api/v1/admin/analytics/overview', { params: { focus: 'students' } }),
  getRegistrationsAnalytics: (filters) => api.get('/api/v1/admin/analytics/overview', { params: { ...filters, focus: 'registrations' } }),
  getCertificatesAnalytics: () => api.get('/api/v1/admin/analytics/overview', { params: { focus: 'certificates' } }),
  exportAnalyticsData: (filters) => api.get('/api/v1/admin/analytics/overview', { params: { ...filters, export: true } }),
  getDashboardRealTimeStats: () => api.get('/api/v1/admin/analytics/overview'),
  
  // Events Management - CORRECTED to use actual backend endpoints
  getEvents: (filters) => api.get('/api/v1/admin/events/list', { params: filters }),
  getEvent: (eventId) => api.get(`/api/v1/admin/events/details/${eventId}`),
  createEvent: (eventData) => api.post('/api/v1/admin/events/create', eventData),
  updateEvent: (eventId, eventData) => api.put(`/api/v1/admin/events/update/${eventId}`, eventData),
  deleteEvent: (eventId) => api.delete(`/api/v1/admin/events/delete/${eventId}`),
  getEventRegistrations: (eventId, filters) => api.get(`/api/v1/admin/events/registrations/${eventId}`, { params: filters }),
  
  // User Management - CONSOLIDATED
  getUsers: (filters) => api.get('/api/v1/admin/users/list', { params: filters }),
  getStudents: (filters) => api.get('/api/v1/admin/users/list', { params: { ...filters, user_type: 'student' } }),
  getStudentDetails: (enrollmentNo) => api.get('/api/v1/admin/users/list', { params: { user_id: enrollmentNo, user_type: 'student' } }),
  updateStudent: (enrollmentNo, studentData) => api.put('/api/v1/admin/users/list', { user_id: enrollmentNo, ...studentData }),
  createStudent: (studentData) => api.post('/api/v1/admin/users/list', { ...studentData, user_type: 'student' }),
  updateStudentStatus: (studentId, statusData) => api.put('/api/v1/admin/users/list', { user_id: studentId, user_type: 'student', ...statusData }),
  
  // Faculty Management
  getFaculty: (filters) => api.get('/api/v1/admin/users/list', { params: { ...filters, user_type: 'faculty' } }),
  updateFacultyStatus: (facultyId, statusData) => api.put('/api/v1/admin/users/list', { user_id: facultyId, user_type: 'faculty', ...statusData }),
  
  // Admin User Management
  getAdminUsers: (filters) => api.get('/api/v1/admin/users/list', { params: { ...filters, user_type: 'admin' } }),
  createAdminUser: (adminData) => api.post('/api/v1/admin/users/list', { ...adminData, user_type: 'admin' }),
  updateAdminUser: (username, adminData) => api.put('/api/v1/admin/users/list', { user_id: username, user_type: 'admin', ...adminData }),
  deleteAdminUser: (adminId) => api.delete(`/api/v1/admin/users/list/${adminId}?user_type=admin`),
  
  // Profile Management - FIXED to use correct auth endpoints
  getProfile: () => api.get('/auth/api/profile'),
  updateProfile: (profileData) => api.put('/auth/api/profile', profileData),
  updateUsername: (usernameData) => api.put('/auth/api/username', usernameData),
  updatePassword: (passwordData) => api.put('/auth/api/password', passwordData),
  
  // Venue Management - CORRECTED to use actual backend endpoints
  getVenues: (filters) => api.get('/api/v1/admin/venues/list', { params: filters }),
  getAllVenues: (filters) => api.get('/api/v1/admin/venues/all', { params: filters }),
  getVenue: (venueId) => api.get(`/api/v1/admin/venues/${venueId}`),
  createVenue: (venueData) => api.post('/api/v1/admin/venues/', venueData),
  updateVenue: (venueId, venueData) => api.put(`/api/v1/admin/venues/${venueId}`, venueData),
  deleteVenue: (venueId) => api.delete(`/api/v1/admin/venues/${venueId}`),
  restoreVenue: (venueId) => api.post(`/api/v1/admin/venues/${venueId}/restore`),
  deleteVenuePermanently: (venueId) => api.delete(`/api/v1/admin/venues/${venueId}/permanent`),
  
  // Certificate Templates Management
  getCertificateTemplatesList: (filters) => api.get('/api/v1/admin/certificate-templates/', { params: filters }),
  migrateCertificateTemplates: () => api.post('/api/v1/admin/certificate-templates/migrate'),
  deleteCertificateTemplate: (templateId) => api.delete(`/api/v1/admin/certificate-templates/${templateId}`),
  
  // Assets Management
  getAssets: (filters) => api.get('/api/v1/admin/assets/list', { params: filters }),
  getAssetDetails: (assetId) => api.get(`/api/v1/admin/assets/details/${assetId}`),
  uploadAsset: (assetData) => api.post('/api/v1/admin/assets/upload', assetData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteAsset: (assetId) => api.delete(`/api/v1/admin/assets/delete/${assetId}`),
  getAssetShortUrl: (assetId) => api.get(`/api/v1/admin/assets/short-url/${assetId}`),
  getAssetImageTag: (assetId) => api.get(`/api/v1/admin/assets/image-tag/${assetId}`),
  getAssetStatistics: () => api.get('/api/v1/admin/assets/statistics'),
  
  // System Management (using existing optimized endpoints with system parameters)
  getSystemHealth: () => api.get('/api/health'), // Direct health endpoint (not /api/v1/)
  getSchedulerHealth: () => api.get('/health/scheduler'), // Direct scheduler endpoint
  getSystemLogs: (filters) => api.get('/api/v1/admin/analytics/overview', { params: { ...filters, focus: 'system', include: 'logs' } }),
  getAuditLogs: (filters) => api.get('/api/v1/admin/analytics/overview', { params: { ...filters, focus: 'audit' } }),
  
  // Debug endpoints (development only)
  getDebugSession: () => api.get('/api/debug/session'), // Direct debug endpoint
  setTestSession: (sessionData) => api.post('/api/debug/set-session', sessionData), // Direct debug endpoint
  
  // Notification Management (using existing optimized endpoints)
  sendNotification: (notificationData) => api.post('/api/v1/admin/users/list', { 
    action: 'send_notification', 
    ...notificationData 
  }),
  getNotificationHistory: (filters) => api.get('/api/v1/admin/analytics/overview', { 
    params: { ...filters, focus: 'notifications' } 
  }),
  
  // Organizer Management (using existing optimized organizer endpoints)
  getOrganizerRequests: () => api.get('/api/v1/admin/organizer/requests'),
  grantOrganizerAccess: (facultyEmployeeId, assignedEvents = []) => 
    api.post(`/api/v1/admin/organizer/grant-access/${facultyEmployeeId}`, { assigned_events: assignedEvents }),
  revokeOrganizerAccess: (facultyEmployeeId) => 
    api.post(`/api/v1/admin/organizer/revoke-access/${facultyEmployeeId}`),
  
  // DESIGN PRINCIPLE: 
  // System management features implemented using existing optimized endpoints
  // with parameters to specify focus areas, maintaining your 62-endpoint optimization
};
