// Admin API endpoints - Split into separate chunk
import api from './base';

export const adminAPI = {
  // UPDATED: Use consolidated dashboard endpoint instead of separate calls
  getDashboardStats: (period = 'month', activityLimit = 20) => 
    api.get('/api/v1/admin/dashboard/complete', { 
      params: { period, activity_limit: activityLimit } 
    }),
  
  // Legacy endpoints (now redirect to consolidated dashboard but kept for compatibility)
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
  approveEvent: async (eventId) => {
    const response = await api.post(`/api/v1/admin/events/approve/${eventId}`);
    
    // If approval successful, handle client-side trigger addition
    if (response.data.success) {
      try {
        // Use event data from approval response if available, otherwise fetch
        const eventData = response.data.event;
        if (eventData) {
          // Use the event data directly from approval response
          const { handleEventApproval } = await import('../utils/eventSchedulerUtils.js');
          handleEventApproval(eventId, eventData);
          console.log('✅ Client scheduler updated with approved event data:', eventId);
        } else {
          // Fallback: fetch event data separately
          const eventResponse = await adminAPI.getEvent(eventId);
          if (eventResponse.data.success) {
            const { handleEventApproval } = await import('../utils/eventSchedulerUtils.js');
            handleEventApproval(eventId, eventResponse.data.event);
            console.log('✅ Client scheduler updated after fetching event data:', eventId);
          }
        }
      } catch (error) {
        console.warn('Failed to update client scheduler after approval:', error);
      }
    }
    
    return response;
  },
  
  declineEvent: async (eventId, declineData) => {
    const response = await api.post(`/api/v1/admin/events/decline/${eventId}`, declineData);
    
    // If decline successful, handle client-side trigger removal
    if (response.data.success) {
      try {
        const { handleEventDecline } = await import('../utils/eventSchedulerUtils.js');
        handleEventDecline(eventId);
      } catch (error) {
        console.warn('Failed to update client scheduler after decline:', error);
      }
    }
    
    return response;
  },
  
  // ===================================================================
  // USER MANAGEMENT - CONSOLIDATED & OPTIMIZED (3 core endpoints + 2 compatibility)
  // ===================================================================
  
  // Main Users Endpoint (replaces all other user listing endpoints)
  getUsers: (filters) => api.get('/api/v1/admin/users/', { params: filters }),
  
  // Consolidated User Type Getters - all use same endpoint with different filters
  getStudents: (params = {}) => api.get('/api/v1/admin/users/', { params: { ...params, user_type: 'student' } }),
  getFaculty: (filters = {}) => api.get('/api/v1/admin/users/', { params: { ...filters, user_type: 'faculty' } }),
  getAdminUsers: (filters = {}) => api.get('/api/v1/admin/users/', { params: { ...filters, user_type: 'admin', include_inactive: true } }),
  
  // Single user details (uses same endpoint with user_id parameter)
  getStudentDetails: (enrollmentNo) => api.get('/api/v1/admin/users/', { params: { user_id: enrollmentNo, user_type: 'student' } }),
  getUserDetails: (userId, userType) => api.get('/api/v1/admin/users/', { params: { user_id: userId, user_type: userType } }),
  
  // Create Users (supports single and bulk creation)
  createUser: (userData) => api.post('/api/v1/admin/users/', userData),
  createStudent: (studentData) => api.post('/api/v1/admin/users/', { ...studentData, user_type: 'student' }),
  createAdminUser: (adminData) => api.post('/api/v1/admin/users/', { ...adminData, user_type: 'admin' }),
  
  // Update Users
  updateUser: (userId, userData) => api.put('/api/v1/admin/users/', { user_id: userId, ...userData }),
  updateStudent: (enrollmentNo, studentData) => api.put('/api/v1/admin/users/', { user_id: enrollmentNo, user_type: 'student', ...studentData }),
  updateStudentStatus: (studentId, statusData) => api.put('/api/v1/admin/users/', { user_id: studentId, user_type: 'student', ...statusData }),
  updateFacultyStatus: (facultyId, statusData) => api.put('/api/v1/admin/users/', { user_id: facultyId, user_type: 'faculty', ...statusData }),
  updateAdminUser: (username, adminData) => api.put('/api/v1/admin/users/', { user_id: username, user_type: 'admin', ...adminData }),
  
  // CONSOLIDATED Status Management (delete/restore/permanent_delete) - Uses new PATCH /status endpoint
  deleteUser: (userId, userType) => api.patch(`/api/v1/admin/users/${userId}/status?user_type=${userType}&action=permanent_delete`), // Hard delete for students/faculty
  deleteStudent: (studentId) => api.patch(`/api/v1/admin/users/${studentId}/status?user_type=student&action=permanent_delete`),
  deleteFaculty: (facultyId) => api.patch(`/api/v1/admin/users/${facultyId}/status?user_type=faculty&action=permanent_delete`),
  deleteAdminUser: (adminId) => api.patch(`/api/v1/admin/users/${adminId}/status?user_type=admin&action=delete`), // Soft delete for admin users
  
  // Restore Users  
  restoreUser: (userId, userType) => api.patch(`/api/v1/admin/users/${userId}/status?user_type=${userType}&action=restore`),
  restoreAdminUser: (adminId) => api.patch(`/api/v1/admin/users/${adminId}/status?user_type=admin&action=restore`),
  
  // Hard Delete (permanent - Super Admin only)
  hardDeleteUser: (userId, userType) => api.patch(`/api/v1/admin/users/${userId}/status?user_type=${userType}&action=permanent_delete`),
  hardDeleteAdminUser: (adminId) => api.patch(`/api/v1/admin/users/${adminId}/status?user_type=admin&action=permanent_delete`),
  
  // Profile Management - FIXED to use correct auth endpoints
  getProfile: () => api.get('/api/auth/api/profile'),
  updateProfile: (profileData) => api.put('/api/auth/api/profile', profileData),
  updateUsername: (usernameData) => api.put('/api/auth/api/username', usernameData),
  updatePassword: (passwordData) => api.put('/api/auth/api/password', passwordData),
  
  // Venue Management - UPDATED: Use correct backend endpoints
  getVenues: (filters) => api.get('/api/v1/admin/venues/', { params: filters }),
  getAllVenues: (filters) => api.get('/api/v1/admin/venues/all', { params: filters }),
  getVenue: (venueId) => api.get(`/api/v1/admin/venues/${venueId}`),
  createVenue: (venueData) => api.post('/api/v1/admin/venues/', venueData),
  updateVenue: (venueId, venueData) => api.put(`/api/v1/admin/venues/${venueId}`, venueData),
  deleteVenue: (venueId) => api.delete(`/api/v1/admin/venues/${venueId}`),
  restoreVenue: (venueId) => api.post(`/api/v1/admin/venues/${venueId}/restore`),
  deleteVenuePermanently: (venueId) => api.delete(`/api/v1/admin/venues/${venueId}/permanent`),
  
  // Certificate Templates Management - UPDATED: Now available
  getCertificateTemplatesList: (filters) => api.get('/api/v1/admin/certificate-templates/', { params: filters }),
  uploadCertificateTemplate: (templateData) => api.post('/api/v1/admin/certificate-templates/upload', templateData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getCertificateTemplateStatistics: () => api.get('/api/v1/admin/certificate-templates/statistics'),
  previewCertificateTemplate: (templateId) => api.get(`/api/v1/admin/certificate-templates/${templateId}/preview`),
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
  
  // Enhanced Recent Activity - Use consolidated dashboard endpoint
  getRecentActivity: (limit = 20) => api.get('/api/v1/admin/dashboard/recent-activity', { params: { limit } }),
  getActivitySummary: () => api.get('/api/v1/admin/dashboard/activity-summary'),
  
  // Notification Management (using existing optimized endpoints)
  sendNotification: (notificationData) => api.post('/api/v1/admin/users/', { 
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
  
  // UPDATED: Event Registration Management - CONSOLIDATED
  getEventRegistrations: (eventId, filters) => api.get(`/api/v1/admin/participation/event/${eventId}/participants`, { params: filters }),
  getEventParticipants: (eventId, filters) => api.get(`/api/v1/admin/participation/event/${eventId}/participants`, { params: filters }),

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