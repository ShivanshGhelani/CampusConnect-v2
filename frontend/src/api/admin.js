// Admin API endpoints - Split into separate chunk
import api from './base';

export const adminAPI = {
  // Analytics
  getDashboardStats: () => api.get('/api/v1/admin/analytics/dashboard'),
  getEventsAnalytics: (filters) => api.get('/api/v1/admin/analytics/events', { params: filters }),
  getStudentsAnalytics: () => api.get('/api/v1/admin/analytics/students'),
  getRegistrationsAnalytics: (filters) => api.get('/api/v1/admin/analytics/registrations', { params: filters }),
  getCertificatesAnalytics: () => api.get('/api/v1/admin/analytics/certificates'),
  exportAnalyticsData: (filters) => api.get('/api/v1/admin/analytics/export', { params: filters }),
  getDashboardRealTimeStats: () => api.get('/api/v1/admin/analytics/dashboard-stats'),
  
  // Events Management
  getEvents: (filters) => api.get('/api/v1/admin/events/list', { params: filters }),
  getEvent: (eventId) => api.get(`/api/v1/admin/events/details/${eventId}`),
  createEvent: (eventData) => api.post('/api/v1/admin/events/create', eventData),
  updateEvent: (eventId, eventData) => api.put(`/api/v1/admin/events/update/${eventId}`, eventData),
  deleteEvent: (eventId) => api.delete(`/api/v1/admin/events/delete/${eventId}`),
  getEventRegistrations: (eventId, filters) => api.get(`/api/v1/admin/events/registrations/${eventId}`, { params: filters }),
  
  // Student Management
  getStudents: (filters) => api.get('/api/v1/admin/students/list', { params: filters }),
  getStudentDetails: (enrollmentNo) => api.get(`/api/v1/admin/students/details/${enrollmentNo}`),
  updateStudent: (enrollmentNo, studentData) => api.put(`/api/v1/admin/students/update/${enrollmentNo}`, studentData),
  createStudent: (studentData) => api.post('/api/v1/admin/students/create', studentData),
  
  // Profile Management
  getProfile: () => api.get('/api/v1/admin/profile/data'),
  updateProfile: (profileData) => api.put('/api/v1/admin/profile/update', profileData),
  
  // Venue Management
  getVenues: (filters) => api.get('/api/v1/admin/venues', { params: filters }),
  getVenue: (venueId) => api.get(`/api/v1/admin/venues/${venueId}`),
  createVenue: (venueData) => api.post('/api/v1/admin/venues', venueData),
  updateVenue: (venueId, venueData) => api.put(`/api/v1/admin/venues/${venueId}`, venueData),
};
