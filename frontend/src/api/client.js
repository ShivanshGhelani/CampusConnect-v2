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
    team_data: {
      team_name: registrationData.team_name,
      team_members: registrationData.team_members?.map(member => member.enrollment_no) || [],
      team_registration_ids: registrationData.team_registration_ids || [],
      additional_data: registrationData
    },
    student_data: registrationData  // Changed from additional_data to student_data
  }),
  
  cancelRegistration: (eventId) => api.delete(`/api/v1/client/registration/cancel/${eventId}`),
  
  // UNIFIED: User lookup and validation (3→1 endpoint consolidation)
  lookupUser: (userType, userId, action = 'basic', eventId = null) => {
    const params = { user_type: userType, user_id: userId, action };
    if (eventId) params.event_id = eventId;
    return api.get('/api/v1/client/registration/lookup', { params });
  },
  
  // Convenience methods using unified endpoint
  lookupStudent: (enrollmentNo) => 
    api.get('/api/v1/client/registration/lookup', { 
      params: { user_type: 'student', user_id: enrollmentNo, action: 'basic' } 
    }),
  
  lookupFaculty: (employeeId) => 
    api.get('/api/v1/client/registration/lookup', { 
      params: { user_type: 'faculty', user_id: employeeId, action: 'basic' } 
    }),
  
  checkStudentEligibility: (enrollmentNo, eventId) => 
    api.get('/api/v1/client/registration/lookup', { 
      params: { user_type: 'student', user_id: enrollmentNo, action: 'eligibility', event_id: eventId } 
    }),
  
  checkFacultyEligibility: (employeeId, eventId) => 
    api.get('/api/v1/client/registration/lookup', { 
      params: { user_type: 'faculty', user_id: employeeId, action: 'eligibility', event_id: eventId } 
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
  
  // Updated team member management methods
  addTeamMember: (eventId, teamRegistrationId, newMemberEnrollment) => api.post('/api/v1/client/registration/register', {
    event_id: eventId,
    action: 'add_member',
    team_data: {
      team_registration_id: teamRegistrationId,
      new_member_enrollment: newMemberEnrollment
    }
  }),
  
  removeTeamMember: (eventId, teamRegistrationId, removeMemberEnrollment) => api.post('/api/v1/client/registration/register', {
    event_id: eventId,
    action: 'remove_member',
    team_data: {
      team_registration_id: teamRegistrationId,
      remove_member_enrollment: removeMemberEnrollment
    }
  }),
  
  // Legacy methods for backward compatibility
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
  
  // Team invitation methods
  sendTeamInvitation: (eventId, teamRegistrationId, inviteeEnrollment) => api.post('/api/v1/client/registration/register', {
    event_id: eventId,
    action: 'send_invitation',
    team_data: {
      team_registration_id: teamRegistrationId,
      invitee_enrollment: inviteeEnrollment
    }
  }),
  
  getMyInvitations: (status = 'pending') => api.get('/api/v1/client/registration/invitations', {
    params: { status }
  }),
  
  respondToInvitation: (invitationId, response) => api.post(`/api/v1/client/registration/invitations/${invitationId}/respond`, {
    response: response  // "accept" or "decline"
  }),
  
  getTeamDetailsByRegistrationId: (teamRegistrationId) => api.get(`/api/v1/client/registration/team/${teamRegistrationId}/details`),
  
  // Get team by member registration ID
  getTeamByMemberRegistration: (eventId, memberRegistrationId) => api.get(`/api/v1/client/registration/event/${eventId}/team-by-member/${memberRegistrationId}`),
  
  // ===== PHASE 3A: UNIFIED TEAM MANAGEMENT API =====
  
  // NEW: Unified Team Data Retrieval
  getUnifiedTeamData: (eventId, mode = 'overview', options = {}) => {
    const params = { mode, ...options };
    return api.get(`/api/v1/client/profile/team/${eventId}/unified`, { params });
  },
  
  // NEW: Unified Team Actions
  executeTeamAction: (eventId, actionData) => 
    api.post(`/api/v1/client/profile/team/${eventId}/actions`, actionData),

  // ===== LEGACY TEAM MANAGEMENT TOOLS API (Backward Compatible) =====
  
  // Task Management - Updated to use unified endpoints
  createTask: (eventId, taskData) => api.post(`/api/v1/client/profile/team/${eventId}/actions`, {
    action: 'create_task',
    title: taskData.title,
    description: taskData.description,
    priority: taskData.priority || 'medium',
    deadline: taskData.deadline,
    assigned_to: taskData.assigned_to,
    category: taskData.category || 'general'
  }),
  
  getTeamTasks: (eventId, status = null) => api.get(`/api/v1/client/profile/team/${eventId}/unified`, {
    params: { mode: 'tasks', status }
  }),
  
  submitTask: (eventId, taskId, submissionData) => api.post(`/api/v1/client/profile/team/${eventId}/actions`, {
    action: 'submit_task',
    task_id: taskId,
    submission_link: submissionData.submission_link,
    submission_notes: submissionData.submission_notes
  }),
  
  reviewTask: (eventId, taskId, reviewData) => api.post(`/api/v1/client/profile/team/${eventId}/actions`, {
    action: 'review_task',
    task_id: taskId,
    review_status: reviewData.review_status,
    review_feedback: reviewData.review_feedback,
    reviewer_notes: reviewData.reviewer_notes
  }),
  
  completeTask: (eventId, taskId, reviewData = {}) => api.post(`/api/v1/client/profile/team/${eventId}/actions`, {
    action: 'complete_task',
    task_id: taskId,
    ...reviewData
  }),
  
  // Role Assignment - Updated to use unified endpoints
  assignRole: (eventId, roleData) => api.post(`/api/v1/client/profile/team/${eventId}/actions`, {
    action: 'assign_role',
    member_enrollment: roleData.member_enrollment,
    role: roleData.role,
    permissions: roleData.permissions,
    description: roleData.description
  }),
  
  getTeamRoles: (eventId) => api.get(`/api/v1/client/profile/team/${eventId}/unified`, {
    params: { mode: 'roles' }
  }),
  
  // Team Communication - Updated to use unified endpoints  
  postMessage: (eventId, messageData) => api.post(`/api/v1/client/profile/team/${eventId}/actions`, {
    action: 'post_message',
    content: messageData.content,
    priority: messageData.priority || 'normal',
    mentions: messageData.mentions,
    category: messageData.category || 'general'
  }),
  
  getTeamMessages: (eventId, limit = 50, skip = 0) => api.get(`/api/v1/client/profile/team/${eventId}/unified`, {
    params: { mode: 'messages', limit, skip }
  }),
  
  // Report Generation - Updated to use unified endpoints
  generateReport: (eventId, reportData) => api.post(`/api/v1/client/profile/team/${eventId}/actions`, {
    action: 'generate_report',
    report_type: reportData.report_type,
    date_range: reportData.date_range,
    include_tasks: reportData.include_tasks !== false,
    include_messages: reportData.include_messages !== false
  }),
  
  // Team Overview - Updated to use unified endpoints  
  getTeamOverview: (eventId) => api.get(`/api/v1/client/profile/team/${eventId}/unified`, {
    params: { mode: 'overview' }
  }),

  // ===== LEGACY TEAM MANAGEMENT TOOLS API (FALLBACK - will be removed in Phase 4) =====
  
  // Keep original endpoints as fallback for now
  createTaskLegacy: (eventId, taskData) => api.post(`/api/v1/client/profile/team-tools/create-task/${eventId}`, taskData),
  
  getTeamTasksLegacy: (eventId, status = null) => api.get(`/api/v1/client/profile/team-tools/tasks/${eventId}`, {
    params: status ? { status } : {}
  }),
  
  submitTaskLegacy: (eventId, taskId, submissionData) => api.put(`/api/v1/client/profile/team-tools/task/${eventId}/${taskId}/submit`, submissionData),
  
  reviewTaskLegacy: (eventId, taskId, reviewData) => api.put(`/api/v1/client/profile/team-tools/task/${eventId}/${taskId}/review`, reviewData),
  
  completeTaskLegacy: (eventId, taskId, reviewData = {}) => api.put(`/api/v1/client/profile/team-tools/task/${eventId}/${taskId}/complete`, reviewData),
  
  // Role Assignment
  assignRoleLegacy: (eventId, roleData) => api.post(`/api/v1/client/profile/team-tools/assign-role/${eventId}`, roleData),
  
  getTeamRolesLegacy: (eventId) => api.get(`/api/v1/client/profile/team-tools/roles/${eventId}`),
  
  // Team Communication
  postMessageLegacy: (eventId, messageData) => api.post(`/api/v1/client/profile/team-tools/post-message/${eventId}`, messageData),
  
  getTeamMessagesLegacy: (eventId, limit = 50, skip = 0) => api.get(`/api/v1/client/profile/team-tools/messages/${eventId}`, {
    params: { limit, skip }
  }),
  
  // Report Generation
  generateReportLegacy: (eventId, reportData) => api.post(`/api/v1/client/profile/team-tools/generate-report/${eventId}`, reportData),
  
  // Team Overview  
  getTeamOverviewLegacy: (eventId) => api.get(`/api/v1/client/profile/team-tools/team-overview/${eventId}`),

  // ===== UNIFIED TEAM DETAILS API (Phase 3A) =====
  
  // Team Details - Updated to use unified endpoints
  getTeamDetails: (eventId, teamId) => api.get(`/api/v1/client/profile/team/${eventId}/unified`, {
    params: { mode: 'details', team_id: teamId }
  }),
  
  getTeamInfo: (eventId, teamId) => api.get(`/api/v1/client/profile/team/${eventId}/unified`, {
    params: { mode: 'info', team_id: teamId }
  }),
  
  getTeamDebugInfo: (eventId, teamId) => api.get(`/api/v1/client/profile/team/${eventId}/unified`, {
    params: { mode: 'debug', team_id: teamId }  
  }),
  
  getTeamRegistrationDetails: (eventId) => api.get(`/api/v1/client/profile/team/${eventId}/unified`, {
    params: { mode: 'registration' }
  }),

  // ===== LEGACY TEAM DETAILS API (FALLBACK - will be removed in Phase 4) =====
  
  getTeamDetailsLegacy: (eventId, teamId) => api.get(`/api/v1/client/profile/team-details/${eventId}/${teamId}`),
  getTeamInfoLegacy: (eventId, teamId) => api.get(`/api/v1/client/profile/team-info/${eventId}/${teamId}`),
  getTeamRegistrationDetailsLegacy: (eventId) => api.get(`/api/v1/client/profile/team-registration-details/${eventId}`),
  
  // Attendance - Updated endpoints
  markAttendance: (eventId, attendanceData) => api.post('/api/v1/client/attendance/mark', { 
    event_id: eventId, 
    ...attendanceData 
  }),
  getAttendanceStatus: (eventId) => api.get(`/api/v1/client/attendance/status/${eventId}`),
  
  // Feedback - Keep existing
  submitFeedback: (eventId, feedbackData) => api.post('/api/v1/client/feedback/submit', { 
    event_id: eventId, 
    ...feedbackData 
  }),
  
  // FEEDBACK ENDPOINTS
  getFeedbackForm: (eventId) => api.get(`/api/v1/client/feedback/form/${eventId}`),
  submitEventFeedback: (eventId, feedbackResponses) => api.post('/api/v1/client/feedback/submit', {
    event_id: eventId,
    feedback_responses: feedbackResponses
  }),
  checkFeedbackEligibility: (eventId) => api.get(`/api/v1/client/feedback/eligibility/${eventId}`),
  
  // Certificates - Keep existing
  getCertificates: () => api.get('/api/v1/client/certificates/available'),
  downloadCertificate: (certificateId) => api.get(`/api/v1/client/certificates/download/${certificateId}`),
  
  // Profile - OPTIMIZED: Combined endpoint to reduce API calls
  getCompleteProfile: () => api.get('/api/v1/client/profile/complete-profile'), // NEW: All profile data in one call
  
  // Legacy endpoints (kept for backward compatibility)
  getProfile: () => api.get('/api/v1/client/profile/info'),
  getDashboardStats: () => api.get('/api/v1/client/profile/dashboard-stats'),
  getEventHistory: () => api.get('/api/v1/client/profile/event-history'),
  
  updateProfile: (profileData) => api.put('/api/v1/client/profile/update', profileData),
  
  // Team Registration Details - Enhanced for QR code generation
  getTeamRegistrationDetails: (eventId) => api.get(`/api/v1/client/profile/team-registration-details/${eventId}`),
  
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

  // Team Management Tools
  getTeamDetails: (eventId, teamId) => 
    api.get(`/api/v1/client/profile/team-tools/team-overview/${eventId}`),
  
  getTeamByMemberRegistration: (eventId, memberRegId) => 
    api.get(`/api/v1/client/profile/team-tools/team-overview/${eventId}`, { 
      params: { member_registration_id: memberRegId } 
    }),
  
  getTeamTasks: (eventId) => 
    api.get(`/api/v1/client/profile/team-tools/tasks/${eventId}`),
  
  getTeamRoles: (eventId) => 
    api.get(`/api/v1/client/profile/team-tools/roles/${eventId}`),
  
  submitTask: (eventId, taskId, submissionData) => 
    api.put(`/api/v1/client/profile/team-tools/task/${eventId}/${taskId}/submit`, submissionData),
  
  reviewTask: (eventId, taskId, reviewData) => 
    api.put(`/api/v1/client/profile/team-tools/task/${eventId}/${taskId}/review`, reviewData),
  
  completeTask: (eventId, taskId) => 
    api.put(`/api/v1/client/profile/team-tools/task/${eventId}/${taskId}/complete`),

};