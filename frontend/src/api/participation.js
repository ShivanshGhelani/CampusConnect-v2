import api from './base';

// Participation API - Dedicated module for unified participation system
export const participationAPI = {
  // Student Participation
  registerStudentForEvent: (registrationData) => api.post('/api/v1/client/registration/register', registrationData),
  
  getStudentRegistrations: (filters) => api.get('/api/v1/client/registration/my-registrations', { params: filters }),
  
  getStudentRegistrationStatus: (eventId) => api.get(`/api/v1/client/registration/event/${eventId}/status`),
  
  unregisterStudentFromEvent: (eventId) => api.delete(`/api/v1/client/registration/unregister/${eventId}`),
  
  // Admin Participation Management
  getEventParticipants: (eventId, filters) => api.get(`/api/v1/admin/participation/event/${eventId}/participants`, { params: filters }),
  
  markAttendance: (attendanceData) => api.post('/api/v1/admin/participation/attendance/mark', attendanceData),
  
  bulkMarkAttendance: (bulkData) => api.post('/api/v1/admin/participation/attendance/bulk-mark', bulkData),
  
  issueCertificate: (certificateData) => api.post('/api/v1/admin/participation/certificate/issue', certificateData),
  
  getStudentHistory: (enrollmentNo, filters) => api.get(`/api/v1/admin/participation/student/${enrollmentNo}/participations`, { params: filters }),
  
  getEventStatistics: (eventId) => api.get(`/api/v1/admin/participation/statistics/event/${eventId}`),
  
  // Advanced Participation Queries
  searchParticipations: (searchParams) => {
    if (searchParams.student_id) {
      return api.get(`/api/v1/admin/participation/student/${searchParams.student_id}/participations`, { 
        params: searchParams 
      });
    } else if (searchParams.event_id) {
      return api.get(`/api/v1/admin/participation/event/${searchParams.event_id}/participants`, { 
        params: searchParams 
      });
    } else {
      // General participation search would need to be implemented in backend
      throw new Error('Either student_id or event_id must be provided for participation search');
    }
  },
  
  // Participation Analytics
  getParticipationTrends: (filters) => api.get('/api/v1/admin/participation/statistics/trends', { params: filters }),
  
  getCompletionRates: (filters) => api.get('/api/v1/admin/participation/statistics/completion', { params: filters }),
  
  // Team Participation (if needed)
  getTeamParticipations: (teamId, filters) => api.get('/api/v1/admin/participation/team/' + teamId, { params: filters }),
  
  // Export functionality
  exportParticipationData: (filters) => api.get('/api/v1/admin/participation/export', { 
    params: filters,
    responseType: 'blob'
  })
};
