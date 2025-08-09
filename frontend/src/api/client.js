import api from './base';

// Client API endpoints - Student/Faculty facing
export const clientAPI = {
  // Events - CORRECTED to match actual backend endpoints  
  getEvents: (filters) => api.get('/api/v1/client/events/list', { params: filters }),
  getEventDetails: (eventId) => api.get(`/api/v1/client/events/details/${eventId}`),
  // NOTE: Following endpoints don't exist in optimized backend - removed or use alternatives
  // getEventCategories: () => api.get('/api/v1/client/events/categories'),
  // searchEvents: (query, filters) => api.get('/api/v1/client/events/search', { params: { query, ...filters } }),
  // getUpcomingEvents: (filters) => api.get('/api/v1/client/events/upcoming', { params: filters }),
  
  // Registration - CORRECTED to match actual backend endpoints
  registerIndividual: (eventId, registrationData) => api.post('/api/v1/client/registration/individual', { event_id: eventId, ...registrationData }),
  registerTeam: (eventId, registrationData) => api.post('/api/v1/client/registration/team', { event_id: eventId, ...registrationData }),
  getRegistrationStatus: (eventId) => api.get(`/api/v1/client/registration/status/${eventId}`),
  // NOTE: Many validation endpoints removed in optimization
  
  // Attendance - CORRECTED
  markAttendance: (eventId, attendanceData) => api.post('/api/v1/client/attendance/mark', { event_id: eventId, ...attendanceData }),
  // NOTE: Other attendance endpoints removed in optimization
  
  // Feedback - CORRECTED
  submitFeedback: (eventId, feedbackData) => api.post('/api/v1/client/feedback/submit', { event_id: eventId, ...feedbackData }),
  // NOTE: Other feedback endpoints removed in optimization
  
  // Certificates - CORRECTED to match actual backend endpoints
  getCertificates: () => api.get('/api/v1/client/certificates/available'),
  downloadCertificate: (certificateId) => api.get(`/api/v1/client/certificates/download/${certificateId}`),
  // NOTE: Certificate generation moved to frontend, only email sending uses backend
  
  // Profile - CORRECTED to match actual backend endpoints  
  getProfile: () => api.get('/api/v1/client/profile/dashboard'),
  updateProfile: (profileData) => api.put('/api/v1/client/profile/update', profileData),
  getMyRegistrations: (filters) => api.get('/api/v1/client/events/my-registrations', { params: filters }),
  
  // Advanced Team Management (using existing optimized endpoints with team parameters)
  getTeamDetails: (teamId) => api.get('/api/v1/client/registration/status/team', { params: { team_id: teamId } }),
  getTeamMembers: (teamId) => api.get('/api/v1/client/registration/status/team', { params: { team_id: teamId, details: 'members' } }),
  updateTeamInformation: (teamId, teamData) => api.put('/api/v1/client/registration/team', { team_id: teamId, ...teamData }),
  leaveTeam: (teamId) => api.delete(`/api/v1/client/registration/team/leave`, { data: { team_id: teamId } }),
  
  // Registration Conflict Resolution (using existing endpoints with conflict parameters)
  checkRegistrationConflicts: (eventId, userData) => api.post('/api/v1/client/registration/individual', { 
    event_id: eventId, 
    check_conflicts_only: true, 
    ...userData 
  }),
  resolveRegistrationConflict: (conflictId, resolution) => api.put('/api/v1/client/registration/individual', { 
    conflict_id: conflictId, 
    resolution: resolution 
  }),
  
  // Notification Management (using existing optimized backend endpoints)
  getMyNotifications: (filters) => api.get('/api/v1/client/profile/dashboard', { params: { ...filters, include: 'notifications' } }),
  markNotificationRead: (notificationId) => api.put('/api/v1/client/profile/update', { 
    action: 'mark_notification_read', 
    notification_id: notificationId 
  }),
  
  // NOTE: Advanced features implemented using existing endpoints with parameters
  // This maintains your 62-endpoint optimization while providing full functionality
};
