import axios from 'axios';

// Function to get the API base URL
const getApiBaseUrl = () => {
  // Check for environment variable first
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  if (envApiUrl) {
    return envApiUrl;
  }
  
  // If no env var, derive from current location for external access
  const currentHost = window.location.hostname;
  const currentProtocol = window.location.protocol;
  
  // If accessing via localhost, use localhost
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return 'http://localhost:8000';
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
  
  // Admin authentication
  adminLogin: (credentials) => api.post('/api/v1/auth/admin/login', credentials),
  adminLogout: () => api.post('/api/v1/auth/admin/logout'),
  adminStatus: () => api.get('/api/v1/auth/admin/status'),
};

export const clientAPI = {
  // Events
  getEvents: () => api.get('/api/v1/client/events/list'),
  getEventDetails: (eventId) => api.get(`/api/v1/client/events/details/${eventId}`),
  getEventStatus: (eventId) => api.get(`/api/v1/client/events/status/${eventId}`),
  
  // Registration
  registerForEvent: (eventId, registrationData) => api.post(`/client/events/${eventId}/register`, registrationData),
  getRegistrationStatus: (eventId) => api.get(`/api/v1/client/registration/status/${eventId}`),
  validateRegistration: (registrationId, eventId) => api.get(`/api/v1/client/registration/validate?registration_id=${registrationId}&event_id=${eventId}`),
  
  // Attendance
  markAttendance: (eventId, attendanceData) => api.post(`/client/events/${eventId}/mark-attendance`, attendanceData),
  getAttendanceStatus: (eventId) => api.get(`/api/v1/client/attendance/status/${eventId}`),
  
  // Feedback
  submitFeedback: (eventId, feedbackData) => api.post(`/client/events/${eventId}/feedback`, feedbackData),
  getFeedbackStatus: (eventId) => api.get(`/api/v1/client/feedback/status/${eventId}`),
  
  // Certificates
  getCertificateStatus: (eventId) => api.get(`/api/v1/client/certificates/status/${eventId}`),
  getCertificateTemplate: (eventId) => api.get(`/api/v1/client/certificates/template/${eventId}`),
  sendCertificateEmail: (certificateData) => api.post('/api/v1/client/certificates/send-email', certificateData),
  
  // Profile
  getProfile: () => api.get('/api/v1/client/profile/data'),
  updateProfile: (profileData) => api.put('/api/v1/client/profile/update', profileData),
};

export const adminAPI = {
  // Dashboard
  getDashboardStats: () => api.get('/api/v1/admin/analytics/dashboard-stats'),
  
  // Events
  getEvents: (filters) => api.get('/api/v1/admin/events/list', { params: filters }),
  createEvent: (eventData) => api.post('/api/v1/admin/events/create', eventData),
  updateEvent: (eventId, eventData) => api.put(`/api/v1/admin/events/update/${eventId}`, eventData),
  deleteEvent: (eventId) => api.delete(`/api/v1/admin/events/delete/${eventId}`),
  getEventStats: (eventId) => api.get(`/api/v1/admin/events/stats?event_id=${eventId}`),
  
  // Students
  getStudents: (filters) => api.get('/api/v1/admin/students/list', { params: filters }),
  searchStudents: (query) => api.get(`/api/v1/admin/students/search?q=${query}`),
  bulkImportStudents: (studentsData) => api.post('/api/v1/admin/students/bulk-import', studentsData),
  exportStudents: (filters) => api.get('/api/v1/admin/students/export', { params: filters }),
  
  // Analytics
  getEventAnalytics: (eventId) => api.get(`/api/v1/admin/analytics/event-analytics/${eventId}`),
  getRegistrationTrends: () => api.get('/api/v1/admin/analytics/registration-trends'),
  getAttendanceReports: () => api.get('/api/v1/admin/analytics/attendance-reports'),
  
  // Users
  getAdminUsers: () => api.get('/api/v1/admin/users/list'),
  createAdminUser: (userData) => api.post('/api/v1/admin/users/create', userData),
  updateAdminUser: (userId, userData) => api.put(`/api/v1/admin/users/update/${userId}`, userData),
  deleteAdminUser: (userId) => api.delete(`/api/v1/admin/users/delete/${userId}`),
};

export default api;
