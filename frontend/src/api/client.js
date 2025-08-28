import api from './base';

// Client API endpoints - Updated for unified participation system
export const clientAPI = {
  // Events - Keep existing event endpoints
  getEvents: (filters) => api.get('/api/v1/client/events/list', { params: filters }),
  getEventDetails: (eventId) => api.get(`/api/v1/client/events/details/${eventId}`),
  
  // UPDATED: Registration - Now using unified participation endpoints
  registerForEvent: (eventId, registrationData) => api.post('/api/v1/client/registration/register', {
    event_id: eventId,
    registration_type: registrationData.type || 'individual',
    team_info: registrationData.team_info,
    additional_data: registrationData.additional_data || {}
  }),
  
  getMyRegistrations: (filters) => api.get('/api/v1/client/registration/my-registrations', { params: filters }),
  
  getRegistrationStatus: (eventId) => api.get(`/api/v1/client/registration/event/${eventId}/status`),
  
  unregisterFromEvent: (eventId) => api.delete(`/api/v1/client/registration/unregister/${eventId}`),
  
  // FIXED: Updated to match new backend API structure
  registerIndividual: (eventId, registrationData) => api.post('/api/v1/client/registration/register', {
    event_id: eventId,
    registration_type: 'individual',
    student_data: registrationData  // Changed from additional_data to student_data
  }),
  
  registerTeam: (eventId, registrationData) => api.post('/api/v1/client/registration/register', {
    event_id: eventId,
    registration_type: 'team',
    team_data: registrationData.team_info || {},
    student_data: registrationData  // Changed from additional_data to student_data
  }),
  
  cancelRegistration: (eventId) => api.delete(`/api/v1/client/registration/cancel/${eventId}`),
  
  // Student lookup and validation (keep existing for form validation)
  lookupStudent: (enrollmentNo) => api.get(`/api/v1/client/registration/lookup/student/${enrollmentNo}`),
  validateParticipant: (enrollmentNo, eventId) => api.get('/api/v1/client/registration/validate-participant', { 
    params: { enrollment_no: enrollmentNo, event_id: eventId } 
  }),
  
  // Faculty lookup and validation
  lookupFaculty: (employeeId) => api.get(`/api/v1/client/registration/lookup/faculty/${employeeId}`),
  validateFacultyParticipant: (employeeId, eventId) => api.get('/api/v1/client/registration/validate-faculty-participant', { 
    params: { employee_id: employeeId, event_id: eventId } 
  }),
  
  // Faculty registration methods
  registerFacultyIndividual: (eventId, registrationData) => api.post('/api/v1/client/registration/register', {
    event_id: eventId,
    registration_type: 'individual',
    faculty_data: registrationData
  }),
  
  registerFacultyTeam: (eventId, registrationData) => api.post('/api/v1/client/registration/register', {
    event_id: eventId,
    registration_type: 'team',
    team_data: registrationData.team_info || {},
    faculty_data: registrationData
  }),
  
  // Team management (using new participation system)
  getTeamDetails: (eventId) => api.get(`/api/v1/client/registration/event/${eventId}/status`),
  addTeamParticipant: (eventId, teamData) => api.post('/api/v1/client/registration/register', {
    event_id: eventId,
    registration_type: 'team',
    team_info: { ...teamData, action: 'add_member' }
  }),
  removeTeamParticipant: (eventId, teamData) => api.post('/api/v1/client/registration/register', {
    event_id: eventId,
    registration_type: 'team',
    team_info: { ...teamData, action: 'remove_member' }
  }),
  
  // Attendance - Updated endpoints
  markAttendance: (eventId, attendanceData) => api.post('/api/v1/client/attendance/mark', { 
    event_id: eventId, 
    ...attendanceData 
  }),
  
  // Feedback - Keep existing
  submitFeedback: (eventId, feedbackData) => api.post('/api/v1/client/feedback/submit', { 
    event_id: eventId, 
    ...feedbackData 
  }),
  
  // Certificates - Keep existing
  getCertificates: () => api.get('/api/v1/client/certificates/available'),
  downloadCertificate: (certificateId) => api.get(`/api/v1/client/certificates/download/${certificateId}`),
  
  // Profile - FIXED: Use correct endpoint for complete profile data
  getProfile: () => api.get('/api/v1/client/profile/info'),
  getDashboardStats: () => api.get('/api/v1/client/profile/dashboard-stats'), // Separate endpoint for stats
  updateProfile: (profileData) => api.put('/api/v1/client/profile/update', profileData),
  
  // Notification Management - Keep existing
  getMyNotifications: (filters) => api.get('/api/v1/client/profile/dashboard-stats', { 
    params: { ...filters, include: 'notifications' } 
  }),
  markNotificationRead: (notificationId) => api.put('/api/v1/client/profile/update', { 
    action: 'mark_notification_read', 
    notification_id: notificationId 
  }),
  
  // Registration Conflict Resolution - Updated
  checkRegistrationConflicts: (eventId, userData) => api.get(`/api/v1/client/registration/event/${eventId}/status`, {
    params: { check_conflicts: true, ...userData }
  }),
  
  resolveRegistrationConflict: (eventId, resolution) => api.post('/api/v1/client/registration/register', {
    event_id: eventId,
    conflict_resolution: resolution
  }),

  // ENHANCED REGISTRATION ENDPOINTS 
  // Get recent registrations for an event (for EventDetail.jsx)
  getRecentRegistrations: (eventId, limit = 10) => 
    api.get(`/api/v1/registrations/event/${eventId}/recent`, { params: { limit } }),

  // SIMPLE REGISTRATION ENDPOINTS (event_lifecycle.txt implementation)
  // Individual registration
  registerIndividualSimple: (eventId, registrationData) => 
    api.post(`/api/v1/registrations/individual/${eventId}`, registrationData),
  
  // Team registration
  registerTeamSimple: (eventId, teamData) => 
    api.post(`/api/v1/registrations/team/${eventId}`, teamData),
  
  // Registration status
  getRegistrationStatusSimple: (eventId) => 
    api.get(`/api/v1/registrations/status/${eventId}`),
  
  // Cancel registration
  cancelRegistrationSimple: (eventId) => 
    api.delete(`/api/v1/registrations/cancel/${eventId}`),
  
  // Mark attendance
  markAttendanceSimple: (eventId, attendanceData) => 
    api.post(`/api/v1/registrations/attendance/${eventId}/mark`, attendanceData),
  
  // Submit feedback
  submitFeedbackSimple: (eventId, feedbackData) => 
    api.post(`/api/v1/registrations/feedback/${eventId}/submit`, feedbackData),

};