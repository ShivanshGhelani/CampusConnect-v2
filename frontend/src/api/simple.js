import api from './base';

/**
 * Simple Registration API Module
 * =============================
 * Clean, fast API endpoints implementing the simple system from event_lifecycle.txt
 * 
 * Features:
 * - Single collection queries
 * - Fast response times (< 2 seconds)
 * - Simple request/response format
 * - Proper error handling
 */

export const simpleAPI = {
  // ============================================================================
  // STUDENT REGISTRATION (Simple and Fast)
  // ============================================================================
  
  // Individual registration - single API call
  registerIndividual: (eventId, data) => 
    api.post(`/api/v1/registrations/individual/${eventId}`, data),
  
  // Team registration - single API call
  registerTeam: (eventId, teamData) => 
    api.post(`/api/v1/registrations/team/${eventId}`, teamData),
  
  // Get registration status - indexed query
  getStatus: (eventId) => 
    api.get(`/api/v1/registrations/status/${eventId}`),
  
  // Cancel registration - single update
  cancel: (eventId) => 
    api.delete(`/api/v1/registrations/cancel/${eventId}`),
  
  // ============================================================================
  // EVENT LIFECYCLE (Simple Operations)
  // ============================================================================
  
  // Mark attendance - single update
  markAttendance: (eventId, data = {}) => 
    api.post(`/api/v1/registrations/attendance/${eventId}/mark`, data),
  
  // Submit feedback - single update
  submitFeedback: (eventId, feedback) => 
    api.post(`/api/v1/registrations/feedback/${eventId}/submit`, feedback),
  
  // ============================================================================
  // ADMIN OPERATIONS (Fast Analytics)
  // ============================================================================
  
  // Get event registrations - indexed query
  getEventRegistrations: (eventId, options = {}) => 
    api.get(`/api/v1/registrations/event/${eventId}/registrations`, { params: options }),
  
  // Bulk attendance marking - efficient batch operation
  markBulkAttendance: (eventId, attendanceList) => 
    api.post(`/api/v1/registrations/attendance/${eventId}/mark-bulk`, attendanceList),
  
  // Bulk certificate issuance - efficient batch operation
  issueBulkCertificates: (eventId, certificateList) => 
    api.post(`/api/v1/registrations/certificates/${eventId}/issue-bulk`, certificateList),
  
  // Get event statistics - fast aggregation
  getStatistics: (eventId) => 
    api.get(`/api/v1/registrations/statistics/${eventId}`),
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  // Check if student is registered
  isRegistered: async (eventId) => {
    try {
      const response = await api.get(`/api/v1/registrations/status/${eventId}`);
      return response.data?.registered || false;
    } catch (error) {
      console.error('Error checking registration status:', error);
      return false;
    }
  },
  
  // Get registration details
  getRegistrationDetails: async (eventId) => {
    try {
      const response = await api.get(`/api/v1/registrations/status/${eventId}`);
      return response.data?.registration || null;
    } catch (error) {
      console.error('Error getting registration details:', error);
      return null;
    }
  },
  
  // Calculate completion percentage
  getCompletionStatus: (registration) => {
    if (!registration) return 0;
    
    let completed = 1; // Registration completed
    if (registration.attendance?.marked) completed++;
    if (registration.feedback?.submitted) completed++;
    if (registration.certificate?.issued) completed++;
    
    return (completed / 4) * 100; // 4 total stages
  }
};
