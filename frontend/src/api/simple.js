import api from './base';

/**
 * Simple Registration API Module - Updated for Event Lifecycle Implementation
 * ==========================================================================
 * Clean, fast API endpoints implementing the complete event lifecycle system
 * 
 * Features:
 * - Single collection queries to student_registrations
 * - Fast response times (< 2 seconds)
 * - Simple request/response format
 * - Complete lifecycle support (registration → attendance → feedback → certificate)
 * - Role-based dashboards
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
  // EVENT LIFECYCLE (Complete Implementation)
  // ============================================================================
  
  // Mark attendance - single update with session support
  markAttendance: (eventId, data = {}) => 
    api.post(`/api/v1/registrations/attendance/${eventId}/mark`, data),
  
  // Submit feedback - single update
  submitFeedback: (eventId, feedback) => 
    api.post(`/api/v1/registrations/feedback/${eventId}/submit`, feedback),
  
  // ============================================================================
  // DASHBOARD ENDPOINTS (Role-based Access)
  // ============================================================================
  
  // Student dashboard - complete participation overview
  getStudentDashboard: () => 
    api.get('/api/v1/registrations/student/dashboard'),
  
  // Organizer dashboard - event monitoring and analytics
  getOrganizerDashboard: (eventId) => 
    api.get(`/api/v1/registrations/organizer/event/${eventId}/dashboard`),
  
  // ============================================================================
  // ADMIN OPERATIONS (Fast Analytics)
  // ============================================================================
  
  // Get event registrations - indexed query with pagination
  getEventRegistrations: (eventId, options = {}) => 
    api.get(`/api/v1/registrations/event/${eventId}/registrations`, { params: options }),
  
  // Bulk attendance marking - efficient batch operation
  markBulkAttendance: (eventId, attendanceList) => 
    api.post(`/api/v1/registrations/attendance/${eventId}/mark-bulk`, attendanceList),
  
  // Get event statistics - fast aggregation
  getStatistics: (eventId) => 
    api.get(`/api/v1/registrations/statistics/${eventId}`),
  
  // ============================================================================
  // UTILITY FUNCTIONS (Enhanced)
  // ============================================================================
  
  // Check if student is registered
  isRegistered: async (eventId) => {
    try {
      const response = await api.get(`/api/v1/registrations/status/${eventId}`);
      return response.data?.registered || false;
    } catch (error) {
      
      return false;
    }
  },
  
  // Get registration details with completion status
  getRegistrationDetails: async (eventId) => {
    try {
      const response = await api.get(`/api/v1/registrations/status/${eventId}`);
      return response.data?.registration || null;
    } catch (error) {
      
      return null;
    }
  },
  
  // Get completion status with next steps
  getCompletionStatus: async (eventId) => {
    try {
      const response = await api.get(`/api/v1/registrations/status/${eventId}`);
      return response.data?.completion_status || null;
    } catch (error) {
      
      return null;
    }
  },
  
  // Calculate completion percentage (legacy support)
  calculateCompletionPercentage: (registration) => {
    if (!registration) return 0;
    
    let completed = 1; // Registration completed
    if (registration.attendance?.marked) completed++;
    if (registration.feedback?.submitted) completed++;
    if (registration.certificate?.issued) completed++;
    
    return (completed / 4) * 100; // 4 total stages
  },
  
  // ============================================================================
  // REAL-TIME FEATURES
  // ============================================================================
  
  // Get real-time event status (for organizers)
  getRealTimeEventStatus: async (eventId) => {
    try {
      const response = await api.get(`/api/v1/registrations/statistics/${eventId}`);
      return response.data || null;
    } catch (error) {
      
      return null;
    }
  },
  
  // Subscribe to real-time updates (WebSocket - placeholder for future implementation)
  subscribeToUpdates: (eventId, callback) => {
    // Placeholder for WebSocket implementation
    
    // TODO: Implement WebSocket connection
    return () => 
  }
};
