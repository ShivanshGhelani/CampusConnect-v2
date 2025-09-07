// Admin API endpoints - Split into separate chunk
import axios from "axios";
import api from "./base.js";
import { 
  fetchActiveVenuesForSelection, 
  fetchAllVenuesForManagement, 
  invalidateVenueCache,
  updateVenueCacheAfterOperation 
} from '../utils/venueCache.js';
import { handleEventApproval, handleEventDecline } from '../utils/eventSchedulerUtils.js';

export const adminAPI = {
  // CONSOLIDATED: Single optimized dashboard endpoint (replaces 3+ individual calls)
  getDashboardStats: (period = 'month', activityLimit = 20) => 
    api.get('/api/v1/admin/dashboard/complete', { 
      params: { period, activity_limit: activityLimit } 
    }),
  
  // Events Management - CORRECTED to use actual backend endpoints
  getEvents: (filters) => api.get('/api/v1/admin/events/list', { params: filters }),
  getEvent: (eventId) => api.get(`/api/v1/admin/events/details/${eventId}`),
  getEventStats: (eventId) => api.get('/api/v1/admin/events/stats', { params: { event_id: eventId } }),
  createEvent: (eventData) => api.post('/api/v1/admin/events/create', eventData),
  updateEvent: (eventId, eventData) => api.put(`/api/v1/admin/events/update/${eventId}`, eventData),
  deleteEvent: (eventId) => api.delete(`/api/v1/admin/events/delete/${eventId}`),
  
  // Updated to use new participation API
  getEventRegistrations: (eventId, filters = {}) => api.get('/api/v1/admin/participation/participants', { 
    params: { event_id: eventId, ...filters } 
  }),
  getEventParticipants: (eventId, filters) => api.get(`/api/v1/admin/participation/event/${eventId}/participants`, { params: filters }),
  
  // Unified participants method for cache compatibility
  getParticipants: (eventId, filters = {}) => api.get('/api/v1/admin/participation/participants', { 
    params: { event_id: eventId, ...filters } 
  }),
  
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
          handleEventApproval(eventId, eventData);
          
        } else {
          // Fallback: fetch event data separately
          const eventResponse = await adminAPI.getEvent(eventId);
          if (eventResponse.data.success) {
            handleEventApproval(eventId, eventResponse.data.event);
            
          }
        }
      } catch (error) {
        
      }
    }
    
    return response;
  },
  
  declineEvent: async (eventId, declineData) => {
    const response = await api.post(`/api/v1/admin/events/decline/${eventId}`, declineData);
    
    // If decline successful, handle client-side trigger removal
    if (response.data.success) {
      try {
        handleEventDecline(eventId);
      } catch (error) {
        
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
  
  // Profile Management - UNIFIED: Single endpoint with update_type parameter
  getProfile: () => api.get('/api/v1/auth/admin/profile'),
  
  // Unified profile update method - handles all update types
  updateProfile: (profileData, updateType = 'profile') => 
    api.put('/api/v1/auth/admin/profile', { ...profileData, update_type: updateType }),
  
  // Convenience methods for specific update types
  updateProfileData: (profileData) => 
    api.put('/api/v1/auth/admin/profile', { ...profileData, update_type: 'profile' }),
    
  updatePassword: (passwordData) => 
    api.put('/api/v1/auth/admin/profile', { ...passwordData, update_type: 'password' }),
    
  updateUsername: (usernameData) => 
    api.put('/api/v1/auth/admin/profile', { ...usernameData, update_type: 'username' }),
  
  // Legacy compatibility aliases (for existing code)
  changePassword: (passwordData) => 
    api.put('/api/v1/auth/admin/profile', { ...passwordData, update_type: 'password' }),
    
  changeUsername: (usernameData) => 
    api.put('/api/v1/auth/admin/profile', { ...usernameData, update_type: 'username' }),
  
  // Venue Management - CONSOLIDATED: Single endpoint for all venue fetching
  getVenues: async (filters = {}) => {
    // Smart caching based on filter parameters
    const isManagementCall = filters.include_inactive === true;
    const isSelectionCall = !filters.include_inactive && !filters.search && !filters.venue_type;
    
    if (isSelectionCall) {
      // Active venues for dropdowns (cached)
      try {
        return await fetchActiveVenuesForSelection(api);
      } catch (error) {
        
        return api.get('/api/v1/admin/venues/', { params: filters });
      }
    } else if (isManagementCall && !filters.search && !filters.venue_type) {
      // All venues for management (cached)
      try {
        return await fetchAllVenuesForManagement(api);
      } catch (error) {
        
        return api.get('/api/v1/admin/venues/', { params: filters });
      }
    }
    
    // Filtered/searched venues - direct API call
    return api.get('/api/v1/admin/venues/', { params: filters });
  },
  
  // REMOVED: getAllVenues() - consolidated into getVenues()
  
  createVenue: async (venueData) => {
    try {
      const response = await api.post('/api/v1/admin/venues/', venueData);
      if (response.data) {
        updateVenueCacheAfterOperation(response.data.venue_id, 'create', response.data);
      }
      return response;
    } catch (error) {
      
      throw error;
    }
  },
  
  updateVenue: async (venueId, venueData) => {
    try {
      const response = await api.put(`/api/v1/admin/venues/${venueId}`, venueData);
      if (response.data) {
        updateVenueCacheAfterOperation(venueId, 'update', response.data);
      }
      return response;
    } catch (error) {
      
      throw error;
    }
  },
  
  // CONSOLIDATED: Single endpoint for all venue status operations
  manageVenueStatus: async (venueId, action) => {
    try {
      const response = await api.patch(`/api/v1/admin/venues/${venueId}/status?action=${action}`);
      updateVenueCacheAfterOperation(venueId, action);
      return response;
    } catch (error) {
      
      throw error;
    }
  },
  
  // COMPATIBILITY: Keep old method names as wrappers
  deleteVenue: async (venueId) => adminAPI.manageVenueStatus(venueId, 'delete'),
  restoreVenue: async (venueId) => adminAPI.manageVenueStatus(venueId, 'restore'),
  deleteVenuePermanently: async (venueId) => adminAPI.manageVenueStatus(venueId, 'permanent_delete'),
  
  // Certificate Templates Management - Streamlined to 4 essential endpoints
  getCertificateTemplatesList: (filters) => api.get('/api/v1/admin/certificate-templates/', { params: filters }),
  uploadCertificateTemplate: (templateData) => api.post('/api/v1/admin/certificate-templates/upload', templateData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  migrateCertificateTemplates: () => api.post('/api/v1/admin/certificate-templates/migrate'),
  deleteCertificateTemplate: (templateId) => api.delete(`/api/v1/admin/certificate-templates/${templateId}`),
  
  // Assets Management - Streamlined to 3 essential endpoints
  getAssetsData: (filters) => api.get('/api/v1/admin/assets/', { params: filters }),
  uploadAsset: (assetData) => api.post('/api/v1/admin/assets/', assetData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteAsset: (assetId, permanent = false) => api.delete(`/api/v1/admin/assets/${assetId}`, { 
    params: { permanent } 
  }),
  
  // System Management (using optimized dashboard endpoint with system parameters)
  getSystemHealth: () => api.get('/api/health'), // Direct health endpoint (not /api/v1/)
  getSchedulerHealth: () => api.get('/health/scheduler'), // Direct scheduler endpoint
  
  // Notification Management (integrated into dashboard endpoint)
  sendNotification: (notificationData) => api.post('/api/v1/admin/users/', { 
    action: 'send_notification', 
    ...notificationData 
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
  

  
  // UNIFIED ATTENDANCE MANAGEMENT - Only 3 essential endpoints
  getAttendanceConfigAndParticipants: (eventId) => api.get(`/api/v1/attendance/config/${eventId}`),
  markAttendance: (attendanceData) => api.post('/api/v1/attendance/mark', attendanceData),
  getAttendanceAnalytics: (eventId) => api.get(`/api/v1/attendance/analytics/${eventId}`),
  
  // Alias for cache compatibility
  getAttendanceStatistics: (eventId) => api.get(`/api/v1/attendance/analytics/${eventId}`),

  // QR SCANNER TOKEN MANAGEMENT
  generateScannerToken: (eventId, queryParams = '') => 
    api.post(`/api/v1/attendance/generate-scanner-token/${eventId}${queryParams ? '?' + queryParams : ''}`),

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