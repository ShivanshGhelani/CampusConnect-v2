// Admin API endpoints - Split into separate chunk
import api from './base';

export const adminAPI = {
  // Analytics - CORRECTED to use actual backend endpoints
  getDashboardStats: () => api.get('/api/v1/admin/analytics/overview'),
  getRecentActivity: (limit = 20) => api.get('/api/v1/admin/dashboard/recent-activity', { params: { limit } }),
  getActivitySummary: () => api.get('/api/v1/admin/dashboard/activity-summary'),
  getEventsAnalytics: (filters) => api.get('/api/v1/admin/analytics/overview', { params: { ...filters, focus: 'events' } }),
  getStudentsAnalytics: () => api.get('/api/v1/admin/analytics/overview', { params: { focus: 'students' } }),
  getRegistrationsAnalytics: (filters) => api.get('/api/v1/admin/analytics/overview', { params: { ...filters, focus: 'registrations' } }),
  getCertificatesAnalytics: () => api.get('/api/v1/admin/analytics/overview', { params: { focus: 'certificates' } }),
  exportAnalyticsData: (filters) => api.get('/api/v1/admin/analytics/overview', { params: { ...filters, export: true } }),
  getDashboardRealTimeStats: () => api.get('/api/v1/admin/analytics/overview'),
  
  // Events Management - CORRECTED to use actual backend endpoints
  getEvents: (filters) => api.get('/api/v1/admin/events/list', { params: filters }),
  getEvent: (eventId) => api.get(`/api/v1/admin/events/details/${eventId}`),
  getEventStats: (eventId) => api.get('/api/v1/admin/events/stats', { params: { event_id: eventId } }),
  getAttendanceStatistics: (eventId) => api.get('/api/v1/admin/events/stats', { params: { event_id: eventId } }),
  createEvent: (eventData) => api.post('/api/v1/admin/events/create', eventData),
  updateEvent: (eventId, eventData) => api.put(`/api/v1/admin/events/update/${eventId}`, eventData),
  deleteEvent: (eventId) => api.delete(`/api/v1/admin/events/delete/${eventId}`),
  
  // Updated to use new participation API
  getEventRegistrations: (eventId, filters) => api.get(`/api/v1/admin/participation/event/${eventId}/participants`, { params: filters }),
  getEventParticipants: (eventId, filters) => api.get(`/api/v1/admin/participation/event/${eventId}/participants`, { params: filters }),
  
  // Event Approval Management
  approveEvent: (eventId) => api.post(`/api/v1/admin/events/approve/${eventId}`),
  declineEvent: (eventId, declineData) => api.post(`/api/v1/admin/events/decline/${eventId}`, declineData),
  
  // User Management - CONSOLIDATED
  getUsers: (filters) => api.get('/api/v1/admin/users/list', { params: filters }),
  // Get all students with filtering and pagination
  getStudents: async (params = {}) => {
    // Add user_type=student to the parameters
    const queryParams = {
      ...params,
      user_type: 'student'
    };
    return await api.get('/api/v1/admin/users/list', { params: queryParams });
  },
  getStudentDetails: (enrollmentNo) => api.get('/api/v1/admin/users/list', { params: { user_id: enrollmentNo, user_type: 'student' } }),
  updateStudent: (enrollmentNo, studentData) => api.put('/api/v1/admin/users/list', { user_id: enrollmentNo, ...studentData }),
  createStudent: (studentData) => api.post('/api/v1/admin/users/list', { ...studentData, user_type: 'student' }),
  updateStudentStatus: (studentId, statusData) => {
    const requestData = { user_id: studentId, user_type: 'student', ...statusData };
    return api.put('/api/v1/admin/users/list', requestData);
  },
  
  // Faculty Management
  getFaculty: (filters) => api.get('/api/v1/admin/users/list', { params: { ...filters, user_type: 'faculty' } }),
  updateFacultyStatus: (facultyId, statusData) => {
    const requestData = { user_id: facultyId, user_type: 'faculty', ...statusData };
    return api.put('/api/v1/admin/users/list', requestData);
  },
  
  // Admin User Management
  getAdminUsers: (filters) => api.get('/api/v1/admin/users/list', { params: { ...filters, user_type: 'admin' } }),
  createAdminUser: (adminData) => api.post('/api/v1/admin/users/list', { ...adminData, user_type: 'admin' }),
  updateAdminUser: (username, adminData) => api.put('/api/v1/admin/users/list', { user_id: username, user_type: 'admin', ...adminData }),
  deleteAdminUser: (adminId) => api.delete(`/api/v1/admin/users/list/${adminId}?user_type=admin`),
  restoreAdminUser: (adminId) => api.patch(`/api/v1/admin/users/restore/${adminId}?user_type=admin`),
  hardDeleteAdminUser: (adminId) => api.delete(`/api/v1/admin/users/hard-delete/${adminId}?user_type=admin`),
  
  // Profile Management - FIXED to use correct auth endpoints
  getProfile: () => api.get('/api/auth/api/profile'),
  updateProfile: (profileData) => api.put('/api/auth/api/profile', profileData),
  updateUsername: (usernameData) => api.put('/api/auth/api/username', usernameData),
  updatePassword: (passwordData) => api.put('/api/auth/api/password', passwordData),
  
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
  
  // Enhanced Recent Activity - NEW ENDPOINT
  getRecentActivity: (limit = 20) => api.get('/api/v1/admin/dashboard/recent-activity', { params: { limit } }),
  getActivitySummary: () => api.get('/api/v1/admin/dashboard/activity-summary'),
  
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
  
  // Faculty Organizers (for event creation)
  getFacultyOrganizers: (params) => api.get('/api/v1/admin/events/faculty-organizers', { params }),
  
  // Attendance Preview (for event creation)
  previewAttendanceStrategy: (eventData) => api.post('/api/v1/admin/attendance-preview/preview-strategy', eventData),
  validateCustomStrategy: (strategyData) => api.post('/api/v1/admin/attendance-preview/validate-custom-strategy', strategyData),
  

  
  // UPDATED: Participation Management - Fixed endpoint paths to match backend mounting
  getEventParticipants: (eventId, options = {}) => {
    const { limit = 10, offset = 0, ...filters } = options;
    return api.get(`/api/v1/admin/participation/event/${eventId}/participants`, { 
      params: { limit, offset, ...filters } 
    });
  },
  
  markStudentAttendance: (attendanceData) => api.post('/api/v1/admin/participation/attendance/mark', attendanceData),
  
  bulkMarkAttendance: (eventId, attendanceList) => api.post('/api/v1/admin/participation/attendance/bulk-mark', {
    event_id: eventId,
    attendance_data: attendanceList
  }),
  
  issueStudentCertificate: (certificateData) => api.post('/api/v1/admin/participation/certificate/issue', certificateData),
  
  getStudentParticipations: (enrollmentNo, filters) => api.get(`/api/v1/admin/participation/student/${enrollmentNo}/participations`, { params: filters }),
  
  getEventStatistics: (eventId) => api.get(`/api/v1/admin/participation/statistics/event/${eventId}`),
  
  // UPDATED: Event Registration Management - Fixed to use correct admin events endpoint
  getEventRegistrations: (eventId, filters) => api.get(`/api/v1/admin/events/registrations/${eventId}`, { params: filters }),
  
  // LEGACY SUPPORT: Keep existing registration endpoints for backward compatibility
  getStudents: async (params = {}) => {
    const queryParams = {
      ...params,
      user_type: 'student'
    };
    return await api.get('/api/v1/admin/users/list', { params: queryParams });
  },

  // DESIGN PRINCIPLE: 
  // System management features implemented using existing optimized endpoints
  // with parameters to specify focus areas, maintaining your 62-endpoint optimization

  // SIMPLE REGISTRATION SYSTEM (event_lifecycle.txt implementation)
  // Fast, efficient endpoints as specified in the plan
  getEventRegistrationsSimple: (eventId, options = {}) => {
    const { limit = 50, offset = 0 } = options;
    return api.get(`/api/v1/registrations/event/${eventId}/registrations`, { 
      params: { limit, offset } 
    });
  },
  
  markAttendanceSimple: (eventId, attendanceData) => 
    api.post(`/api/v1/registrations/attendance/${eventId}/mark-bulk`, attendanceData),
  
  issueSimpleCertificates: (eventId, certificateData) => 
    api.post(`/api/v1/registrations/certificates/${eventId}/issue-bulk`, certificateData),
  
  getEventStatisticsSimple: (eventId) => 
    api.get(`/api/v1/registrations/statistics/${eventId}`),

  // FEEDBACK MANAGEMENT ENDPOINTS
  createFeedbackForm: (eventId, feedbackData) => 
    api.post(`/api/v1/admin/events/feedback/create/${eventId}`, feedbackData),
  
  getFeedbackForm: (eventId) => 
    api.get(`/api/v1/admin/events/feedback/form/${eventId}`),
  
  getFeedbackResponses: (eventId, options = {}) => {
    const { page = 1, limit = 50 } = options;
    return api.get(`/api/v1/admin/events/feedback/responses/${eventId}`, {
      params: { page, limit }
    });
  },
  
  getFeedbackAnalytics: (eventId) => 
    api.get(`/api/v1/admin/events/feedback/analytics/${eventId}`),
  
  deleteFeedbackForm: (eventId) => 
    api.delete(`/api/v1/admin/events/feedback/delete/${eventId}`),

};