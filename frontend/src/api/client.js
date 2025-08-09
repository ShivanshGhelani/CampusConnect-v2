import api from './base';

// Client API endpoints - Student/Faculty facing
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
  getTeamDetails: (eventId) => api.get(`/api/v1/client/registration/status/${eventId}`),
  validateRegistration: (filters) => api.get('/api/v1/client/registration/validate', { params: filters }),
  validateParticipant: (enrollmentNo, eventId, teamId) => api.get(`/api/v1/client/registration/validate-participant?enrollment_no=${enrollmentNo}&event_id=${eventId}&team_id=${teamId}`),
  validateFacultyParticipant: (facultyId) => api.get(`/api/v1/client/registration/validate-faculty-participant?faculty_id=${facultyId}`),
  checkRegistrationConflicts: (conflictData) => api.post('/api/v1/client/registration/check-conflicts', conflictData),
  cancelRegistration: (eventId) => api.post(`/api/v1/client/registration/cancel/${eventId}`),
  
  // Team Management
  addTeamParticipant: (eventId, teamId, enrollmentNo) => api.post(`/api/v1/client/registration/add-team-member`, { event_id: eventId, team_id: teamId, enrollment_no: enrollmentNo }),
  removeTeamParticipant: (eventId, teamId, enrollmentNo) => api.post(`/api/v1/client/registration/remove-team-member`, { event_id: eventId, team_id: teamId, enrollment_no: enrollmentNo }),
  
  // Attendance
  markAttendance: (eventId, attendanceData) => api.post(`/api/v1/client/attendance/mark/${eventId}`, attendanceData),
  getAttendanceStatus: (eventId) => api.get(`/api/v1/client/attendance/status/${eventId}`),
  validateAttendanceForm: (eventId) => api.get(`/api/v1/client/attendance/validate-form/${eventId}`),
  getAttendanceHistory: (filters) => api.get('/api/v1/client/attendance/history', { params: filters }),
  
  // Feedback
  submitFeedback: (eventId, feedbackData) => api.post(`/api/v1/client/feedback/submit/${eventId}`, feedbackData),
  submitEventFeedback: (eventId, feedbackData) => api.post(`/api/v1/client/feedback/submit/${eventId}`, feedbackData),
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
