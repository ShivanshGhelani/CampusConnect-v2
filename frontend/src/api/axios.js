import axios from 'axios';

/*
 * BACKEND API ENDPOINTS REFERENCE (v1) - COMPLETE IMPLEMENTATION
 * ================================================================
 * 
 * This file contains ALL API endpoints available in the CampusConnect backend.
 * Endpoints are organized by category and access level for easy reference.
 * 
 * AUTH API (/api/v1/auth/):
 * - GET  /api/v1/auth/admin/status       - Check admin authentication status
 * - GET  /api/v1/auth/student/status     - Check student authentication status
 * - POST /api/v1/auth/admin/login        - Admin login
 * - POST /api/v1/auth/student/login      - Student login
 * - POST /api/v1/auth/admin/logout       - Admin logout
 * - POST /api/v1/auth/student/logout     - Student logout
 * - POST /api/v1/auth/student/register   - Student registration
 * 
 * ADMIN API (/api/v1/admin/):
 * 
 * Analytics:
 *   - GET  /api/v1/admin/analytics/dashboard        - Dashboard analytics
 *   - GET  /api/v1/admin/analytics/events           - Event-specific analytics
 *   - GET  /api/v1/admin/analytics/students         - Student analytics
 *   - GET  /api/v1/admin/analytics/registrations    - Registration analytics
 *   - GET  /api/v1/admin/analytics/certificates     - Certificate analytics
 *   - GET  /api/v1/admin/analytics/export           - Export analytics data
 *   - GET  /api/v1/admin/analytics/dashboard-stats  - Real-time dashboard stats
 * 
 * Certificate Management:
 *   - GET  /api/v1/admin/certificates/list          - List all certificates
 *   - GET  /api/v1/admin/certificates/event/{id}    - Event certificates
 *   - POST /api/v1/admin/certificates/bulk-issue    - Bulk issue certificates
 *   - POST /api/v1/admin/certificates/revoke/{id}   - Revoke certificate
 *   - GET  /api/v1/admin/certificates/templates     - Certificate templates
 *   - GET  /api/v1/admin/certificates/statistics    - Certificate statistics
 * 
 * Events:
 *   - GET    /api/v1/admin/events/list              - List events with filters
 *   - GET    /api/v1/admin/events/details/{id}      - Get event details
 *   - POST   /api/v1/admin/events/create            - Create new event
 *   - PUT    /api/v1/admin/events/update/{id}       - Update event
 *   - DELETE /api/v1/admin/events/delete/{id}       - Delete event
 *   - GET    /api/v1/admin/events/registrations/{id} - Event registrations
 *   - POST   /api/v1/admin/events/bulk-update-status - Bulk update statuses
 * 
 * Students:
 *   - GET  /api/v1/admin/students/list              - List students with filters
 *   - GET  /api/v1/admin/students/details/{enrollment} - Student details
 *   - PUT  /api/v1/admin/students/update/{enrollment} - Update student
 *   - POST /api/v1/admin/students/create            - Create student
 *   - POST /api/v1/admin/students/bulk-import       - Bulk import students
 *   - GET  /api/v1/admin/students/statistics        - Student statistics
 *   - PUT  /api/v1/admin/students/toggle-status/{enrollment} - Toggle status
 *   - PUT  /api/v1/admin/students/update-status/{id} - Update student status
 * 
 * Users (Admin Management):
 *   - GET    /api/v1/admin/users/list               - List admin users
 *   - GET    /api/v1/admin/users/details/{username} - Admin user details
 *   - POST   /api/v1/admin/users/create             - Create admin user
 *   - PUT    /api/v1/admin/users/update/{username}  - Update admin user
 *   - DELETE /api/v1/admin/users/delete/{username}  - Delete admin user
 *   - POST   /api/v1/admin/users/assign-events/{username} - Assign events
 *   - PUT    /api/v1/admin/users/toggle-status/{username} - Toggle status
 *   - GET    /api/v1/admin/users/roles              - Get admin roles
 *   - GET    /api/v1/admin/users/statistics         - Admin statistics
 * 
 * Profile:
 *   - GET  /api/v1/admin/profile/data               - Get admin profile data
 *   - PUT  /api/v1/admin/profile/update             - Update admin profile
 *   - PUT  /api/v1/admin/profile/update-username    - Update admin username
 *   - PUT  /api/v1/admin/profile/update-password    - Update admin password
 *   - PUT  /api/v1/admin/profile/update-settings    - Update admin settings
 * 
 * Venues:
 *   - GET    /api/v1/admin/venues                   - List all venues
 *   - GET    /api/v1/admin/venues/{id}              - Get venue details
 *   - POST   /api/v1/admin/venues                   - Create new venue
 *   - PUT    /api/v1/admin/venues/{id}              - Update venue
 *   - DELETE /api/v1/admin/venues/{id}              - Delete venue
 *   - GET    /api/v1/admin/venues/stats/overview    - Venue statistics
 *   - GET    /api/v1/admin/venues/{id}/bookings     - Get venue bookings
 *   - POST   /api/v1/admin/venues/{id}/book         - Book venue
 *   - GET    /api/v1/admin/venues/{id}/availability - Check availability
 * 
 * CLIENT API (/api/v1/client/):
 * 
 * Events:
 *   - GET  /api/v1/client/events/list               - List available events
 *   - GET  /api/v1/client/events/details/{id}       - Event details
 *   - GET  /api/v1/client/events/categories         - Event categories
 *   - GET  /api/v1/client/events/search             - Search events
 *   - GET  /api/v1/client/events/upcoming           - Upcoming events
 * 
 * Registration:
 *   - POST /api/v1/client/registration/register/{id} - Register for event
 *   - GET  /api/v1/client/registration/status/{id}   - Registration status
 *   - GET  /api/v1/client/registration/validate      - Validate registration
 *   - GET  /api/v1/client/registration/validate-participant - Validate participant
 *   - POST /api/v1/client/registration/check-conflicts - Check conflicts
 *   - POST /api/v1/client/registration/cancel/{id}   - Cancel registration
 * 
 * Attendance:
 *   - POST /api/v1/client/attendance/mark/{id}       - Mark attendance
 *   - GET  /api/v1/client/attendance/status/{id}     - Attendance status
 *   - GET  /api/v1/client/attendance/validate-form/{id} - Validate form
 *   - GET  /api/v1/client/attendance/history         - Attendance history
 * 
 * Feedback:
 *   - POST /api/v1/client/feedback/submit/{id}       - Submit feedback
 *   - GET  /api/v1/client/feedback/status/{id}       - Feedback status
 *   - GET  /api/v1/client/feedback/form-data/{id}    - Feedback form data
 *   - GET  /api/v1/client/feedback/history           - Feedback history
 *   - GET  /api/v1/client/feedback/analytics/{id}    - Feedback analytics
 * 
 * Certificates:
 *   - POST /api/v1/client/certificates/data          - Get certificate data
 *   - GET  /api/v1/client/certificates/status/{id}   - Certificate status
 *   - GET  /api/v1/client/certificates/template/{id} - Certificate template
 *   - POST /api/v1/client/certificates/send-email    - Send certificate email
 *   - POST /api/v1/client/certificates/validate-access - Validate access
 *   - GET  /api/v1/client/certificates/debug/{id}/{enrollment} - Debug certificate
 * 
 * Profile:
 *   - GET  /api/v1/client/profile/info               - Get student profile
 *   - PUT  /api/v1/client/profile/update             - Update student profile
 *   - GET  /api/v1/client/profile/dashboard-stats    - Dashboard statistics
 *   - GET  /api/v1/client/profile/event-history      - Event history
 *   - POST /api/v1/client/profile/change-password    - Change password
 * 
 * TOTAL ENDPOINTS: 87+ (Complete implementation of backend API)
 * LAST UPDATED: June 29, 2025
 */

// Function to get the API base URL
const getApiBaseUrl = () => {
  // Check for environment variable first
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  if (envApiUrl) {
    return envApiUrl;
  }
  
  // Get current location details
  const currentHost = window.location.hostname;
  const currentProtocol = window.location.protocol;
  
  // For local development, always use 127.0.0.1 for consistency with backend CORS
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return 'http://127.0.0.1:8000';
  }
  
  // For external hosts (ngrok, --host, etc.), assume API is on port 8000
  return `${currentProtocol}//${currentHost}:8000`;
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log the API base URL for debugging
console.log('API Base URL:', getApiBaseUrl());

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - clear auth data and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    if (error.response?.status === 403) {
      // Forbidden - user doesn't have permission
      console.error('Access denied. You do not have permission to perform this action.');
    }
    
    if (error.response?.status >= 500) {
      // Server error
      console.error('Server error. Please try again later.');
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  // Student authentication
  studentLogin: (credentials) => api.post('/api/v1/auth/student/login', credentials),
  studentRegister: (userData) => api.post('/api/v1/auth/student/register', userData),
  studentLogout: () => api.post('/api/v1/auth/student/logout'),
  studentStatus: () => api.get('/api/v1/auth/student/status'),
  
  // Faculty authentication
  facultyLogin: (credentials) => api.post('/api/v1/auth/faculty/login', credentials),
  facultyRegister: (userData) => api.post('/api/v1/auth/faculty/register', userData),
  facultyLogout: () => api.post('/api/v1/auth/faculty/logout'),
  facultyStatus: () => api.get('/api/v1/auth/faculty/status'),
  
  // Admin authentication
  adminLogin: (credentials) => api.post('/api/v1/auth/admin/login', credentials),
  adminLogout: () => api.post('/api/v1/auth/admin/logout'),
  adminStatus: () => api.get('/api/v1/auth/admin/status'),
};

export const clientAPI = {
  // Events
  getEvents: (filters) => api.get('/api/v1/client/events/list', { params: filters }),
  getEventDetails: (eventId) => api.get(`/api/v1/client/events/details/${eventId}`),
  getEventCategories: () => api.get('/api/v1/client/events/categories'),
  searchEvents: (query, filters) => api.get('/api/v1/client/events/search', { params: { query, ...filters } }),
  getUpcomingEvents: (filters) => api.get('/api/v1/client/events/upcoming', { params: filters }),
  
  // Registration
  registerForEvent: (eventId, registrationData) => api.post(`/api/v1/client/registration/register/${eventId}`, registrationData),
  getRegistrationStatus: (eventId) => api.get(`/api/v1/client/registration/status/${eventId}`),
  validateRegistration: (filters) => api.get('/api/v1/client/registration/validate', { params: filters }),
  validateParticipant: (enrollmentNo) => api.get(`/api/v1/client/registration/validate-participant?enrollment_no=${enrollmentNo}`),
  checkRegistrationConflicts: (conflictData) => api.post('/api/v1/client/registration/check-conflicts', conflictData),
  cancelRegistration: (eventId) => api.post(`/api/v1/client/registration/cancel/${eventId}`),
  
  // Attendance
  markAttendance: (eventId, attendanceData) => api.post(`/api/v1/client/attendance/mark/${eventId}`, attendanceData),
  getAttendanceStatus: (eventId) => api.get(`/api/v1/client/attendance/status/${eventId}`),
  validateAttendanceForm: (eventId) => api.get(`/api/v1/client/attendance/validate-form/${eventId}`),
  getAttendanceHistory: (filters) => api.get('/api/v1/client/attendance/history', { params: filters }),
  
  // Feedback
  submitFeedback: (eventId, feedbackData) => api.post(`/api/v1/client/feedback/submit/${eventId}`, feedbackData),
  getFeedbackStatus: (eventId) => api.get(`/api/v1/client/feedback/status/${eventId}`),
  getFeedbackFormData: (eventId) => api.get(`/api/v1/client/feedback/form-data/${eventId}`),
  getFeedbackHistory: (filters) => api.get('/api/v1/client/feedback/history', { params: filters }),
  getFeedbackAnalytics: (eventId) => api.get(`/api/v1/client/feedback/analytics/${eventId}`),
  
  // Certificates
  getCertificateData: (certificateData) => api.post('/api/v1/client/certificates/data', certificateData),
  getCertificateStatus: (eventId) => api.get(`/api/v1/client/certificates/status/${eventId}`),
  getCertificateTemplate: (eventId) => api.get(`/api/v1/client/certificates/template/${eventId}`),
  sendCertificateEmail: (certificateData) => api.post('/api/v1/client/certificates/send-email', certificateData),
  validateCertificateAccess: (accessData) => api.post('/api/v1/client/certificates/validate-access', accessData),
  debugCertificate: (eventId, enrollmentNo) => api.get(`/api/v1/client/certificates/debug/${eventId}/${enrollmentNo}`),
  
  // Profile
  getProfile: () => api.get('/api/v1/client/profile/info'),
  updateProfile: (profileData) => api.put('/api/v1/client/profile/update', profileData),
  getDashboardStats: () => api.get('/api/v1/client/profile/dashboard-stats'),
  getEventHistory: (filters) => api.get('/api/v1/client/profile/event-history', { params: filters }),
  changePassword: (passwordData) => api.post('/api/v1/client/profile/change-password', passwordData),
};

export const adminAPI = {
  // Analytics
  getDashboardStats: () => api.get('/api/v1/admin/analytics/dashboard'),
  getEventsAnalytics: (filters) => api.get('/api/v1/admin/analytics/events', { params: filters }),
  getStudentsAnalytics: () => api.get('/api/v1/admin/analytics/students'),
  getRegistrationsAnalytics: (filters) => api.get('/api/v1/admin/analytics/registrations', { params: filters }),
  getCertificatesAnalytics: () => api.get('/api/v1/admin/analytics/certificates'),
  exportAnalyticsData: (filters) => api.get('/api/v1/admin/analytics/export', { params: filters }),
  getDashboardRealTimeStats: () => api.get('/api/v1/admin/analytics/dashboard-stats'),
  // Legacy analytics endpoints (for backward compatibility)
  getEventAnalytics: (eventId) => api.get(`/api/v1/admin/analytics/event-analytics/${eventId}`),
  getRegistrationTrends: () => api.get('/api/v1/admin/analytics/registration-trends'),
  getAttendanceReports: () => api.get('/api/v1/admin/analytics/attendance-reports'),
  
  // Certificate Management
  getCertificatesList: (filters) => api.get('/api/v1/admin/certificates/list', { params: filters }),
  getEventCertificates: (eventId) => api.get(`/api/v1/admin/certificates/event/${eventId}`),
  bulkIssueCertificates: (issueData) => api.post('/api/v1/admin/certificates/bulk-issue', issueData),
  revokeCertificate: (certificateId) => api.post(`/api/v1/admin/certificates/revoke/${certificateId}`),
  getCertificateTemplates: () => api.get('/api/v1/admin/certificates/templates'),
  getCertificateStatistics: () => api.get('/api/v1/admin/certificates/statistics'),
  
  // Events Management
  getEvents: (filters) => api.get('/api/v1/admin/events/list', { params: filters }),
  getEvent: (eventId) => api.get(`/api/v1/admin/events/details/${eventId}`),
  createEvent: (eventData) => api.post('/api/v1/admin/events/create', eventData),
  updateEvent: (eventId, eventData) => api.put(`/api/v1/admin/events/update/${eventId}`, eventData),
  deleteEvent: (eventId) => api.delete(`/api/v1/admin/events/delete/${eventId}`),
  getEventRegistrations: (eventId, filters) => api.get(`/api/v1/admin/events/registrations/${eventId}`, { params: filters }),
  getEventAttendance: (eventId, filters) => api.get(`/api/v1/admin/events/attendance/${eventId}`, { params: filters }),
  exportEventData: (eventId, exportData) => api.post(`/api/v1/admin/events/export/${eventId}`, exportData, { responseType: 'blob' }),
  bulkUpdateEventStatus: (updateData) => api.post('/api/v1/admin/events/bulk-update-status', updateData),
  // Legacy endpoint
  getEventStats: (eventId) => api.get(`/api/v1/admin/events/stats?event_id=${eventId}`),
  
  // Student Management
  getStudents: (filters) => api.get('/api/v1/admin/students/list', { params: filters }),
  getStudentDetails: (enrollmentNo) => api.get(`/api/v1/admin/students/details/${enrollmentNo}`),
  updateStudent: (enrollmentNo, studentData) => api.put(`/api/v1/admin/students/update/${enrollmentNo}`, studentData),
  createStudent: (studentData) => api.post('/api/v1/admin/students/create', studentData),
  bulkImportStudents: (studentsData) => api.post('/api/v1/admin/students/bulk-import', studentsData),
  getStudentStatistics: () => api.get('/api/v1/admin/students/statistics'),
  toggleStudentStatus: (enrollmentNo) => api.put(`/api/v1/admin/students/toggle-status/${enrollmentNo}`),
  updateStudentStatus: (studentId, statusData) => api.put(`/api/v1/admin/students/update-status/${studentId}`, statusData),
  // Legacy endpoints
  searchStudents: (query) => api.get(`/api/v1/admin/students/search?q=${query}`),
  exportStudents: (filters) => api.get('/api/v1/admin/students/export', { params: filters }),
  
  // User Management (Admin Users)
  getAdminUsers: (filters) => api.get('/api/v1/admin/users/list', { params: filters }),
  getAdminUserDetails: (username) => api.get(`/api/v1/admin/users/details/${username}`),
  createAdminUser: (userData) => api.post('/api/v1/admin/users/create', userData),
  updateAdminUser: (username, userData) => api.put(`/api/v1/admin/users/update/${username}`, userData),
  deleteAdminUser: (username) => api.delete(`/api/v1/admin/users/delete/${username}`),
  assignEventsToAdmin: (username, eventData) => api.post(`/api/v1/admin/users/assign-events/${username}`, eventData),
  toggleAdminStatus: (username) => api.put(`/api/v1/admin/users/toggle-status/${username}`),
  getAdminRoles: () => api.get('/api/v1/admin/users/roles'),
  getAdminStatistics: () => api.get('/api/v1/admin/users/statistics'),
  
  // Admin Profile Management
  getProfile: () => api.get('/api/v1/admin/profile/data'),
  updateProfile: (profileData) => api.put('/api/v1/admin/profile/update', profileData),
  updateUsername: (usernameData) => api.put('/api/v1/admin/profile/update-username', usernameData),
  updatePassword: (passwordData) => api.put('/api/v1/admin/profile/update-password', passwordData),
  updateSettings: (settingsData) => api.put('/api/v1/admin/profile/update-settings', settingsData),
  
  // Faculty Management
  getFaculty: (filters) => api.get('/api/v1/admin/faculty/list', { params: filters }),
  getFacultyDetails: (facultyId) => api.get(`/api/v1/admin/faculty/details/${facultyId}`),
  createFaculty: (facultyData) => api.post('/api/v1/admin/faculty/create', facultyData),
  updateFaculty: (facultyId, facultyData) => api.put(`/api/v1/admin/faculty/update/${facultyId}`, facultyData),
  deleteFaculty: (facultyId) => api.delete(`/api/v1/admin/faculty/delete/${facultyId}`),
  toggleFacultyStatus: (facultyId) => api.put(`/api/v1/admin/faculty/toggle-status/${facultyId}`),
  updateFacultyStatus: (facultyId, statusData) => api.put(`/api/v1/admin/faculty/update-status/${facultyId}`, statusData),
  getFacultyStatistics: () => api.get('/api/v1/admin/faculty/statistics'),
  bulkImportFaculty: (facultyData) => api.post('/api/v1/admin/faculty/bulk-import', facultyData),
  exportFaculty: (filters) => api.get('/api/v1/admin/faculty/export', { params: filters }),
  
  // Asset Management
  getAssets: (assetType) => api.get('/api/v1/admin/assets/list', { params: assetType ? { asset_type: assetType } : {} }),
  getAssetStatistics: () => api.get('/api/v1/admin/assets/statistics'),
  deleteAsset: (assetId, assetPath) => api.delete(`/api/v1/admin/assets/${assetId}`, { data: { asset_path: assetPath } }),
  uploadAsset: (formData, config) => api.post('/api/v1/admin/assets/upload', formData, config),
  
  // Venue Management
  getVenues: (filters) => api.get('/api/v1/admin/venues', { params: filters }),
  getVenue: (venueId) => api.get(`/api/v1/admin/venues/${venueId}`),
  createVenue: (venueData) => api.post('/api/v1/admin/venues', venueData),
  updateVenue: (venueId, venueData) => api.put(`/api/v1/admin/venues/${venueId}`, venueData),
  deleteVenue: (venueId) => api.delete(`/api/v1/admin/venues/${venueId}`),
  getVenueStatistics: () => api.get('/api/v1/admin/venues/stats/overview'),
  getVenueBookings: (venueId, filters) => api.get(`/api/v1/admin/venues/${venueId}/bookings`, { params: filters }),
  bookVenue: (venueId, bookingData) => api.post(`/api/v1/admin/venues/${venueId}/book`, bookingData),
  checkVenueAvailability: (venueId, startDateTime, endDateTime, excludeBookingId) => {
    const params = { start_datetime: startDateTime, end_datetime: endDateTime };
    if (excludeBookingId) params.exclude_booking_id = excludeBookingId;
    return api.get(`/api/v1/admin/venues/${venueId}/availability`, { params });
  },
};

// Dedicated asset API object for easier use
export const assetApi = {
  list: (params = {}) => {
    if (params.asset_type && params.asset_type !== 'all') {
      return api.get(`/admin/assets/list?asset_type=${params.asset_type}`);
    }
    return api.get('/admin/assets/list', { params });
  },
  stats: () => api.get('/admin/assets/statistics'),
  upload: (formData, config) => api.post('/admin/assets/upload', formData, config),
  delete: (filename) => api.delete(`/admin/assets/delete/${filename}`)
};

// Dedicated venue API object for easier use
export const venueApi = {
  // Basic CRUD operations
  list: (filters = {}) => api.get('/api/v1/admin/venues', { params: filters }),
  get: (venueId) => api.get(`/api/v1/admin/venues/${venueId}`),
  create: (venueData) => api.post('/api/v1/admin/venues', venueData),
  update: (venueId, venueData) => api.put(`/api/v1/admin/venues/${venueId}`, venueData),
  delete: (venueId) => api.delete(`/api/v1/admin/venues/${venueId}`),
  
  // Statistics and analytics
  getStatistics: () => api.get('/api/v1/admin/venues/stats/overview'),
  
  // Booking operations
  getBookings: (venueId, filters = {}) => api.get(`/api/v1/admin/venues/${venueId}/bookings`, { params: filters }),
  book: (venueId, bookingData) => api.post(`/api/v1/admin/venues/${venueId}/book`, bookingData),
  checkAvailability: (venueId, startDateTime, endDateTime, excludeBookingId = null) => {
    const params = { 
      start_datetime: startDateTime, 
      end_datetime: endDateTime 
    };
    if (excludeBookingId) {
      params.exclude_booking_id = excludeBookingId;
    }
    return api.get(`/api/v1/admin/venues/${venueId}/availability`, { params });
  },
  
  // Utility methods
  searchByType: (venueType) => api.get('/api/v1/admin/venues', { params: { venue_type: venueType } }),
  getActive: () => api.get('/api/v1/admin/venues', { params: { is_active: true } }),
  getByStatus: (status) => api.get('/api/v1/admin/venues', { params: { status } })
};

export default api;
