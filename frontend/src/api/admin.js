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
  
  // Profile Management (using user management endpoints)
  updateProfile: (profileData) => api.put('/api/v1/admin/users/list', { user_type: 'admin', ...profileData }),
  updateUsername: (usernameData) => api.put('/api/v1/admin/users/list', { user_type: 'admin', ...usernameData }),
  updatePassword: (passwordData) => api.put('/api/v1/admin/users/list', { user_type: 'admin', ...passwordData }),
  
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
};
