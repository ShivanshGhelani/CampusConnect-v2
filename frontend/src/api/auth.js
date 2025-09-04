import api from './base';

// Auth API endpoints
export const authAPI = {
  // Unified authentication status (NEW - using optimized endpoint)
  getStatus: (userType = null) => api.get('/api/v1/auth/status', { params: userType ? { user_type: userType } : {} }),
  
  // Student authentication
  studentLogin: (credentials) => api.post('/api/v1/auth/student/login', credentials),
  studentRegister: (userData) => api.post('/api/v1/auth/student/register', userData),
  studentLogout: () => api.post('/api/v1/auth/student/logout'),
  studentStatus: () => api.get('/api/v1/auth/status', { params: { user_type: 'student' } }),
  
  // Faculty authentication
  facultyLogin: (credentials) => api.post('/api/v1/auth/faculty/login', credentials),
  facultyRegister: (userData) => api.post('/api/v1/auth/faculty/register', userData),
  facultyLogout: () => api.post('/api/v1/auth/faculty/logout'),
  facultyStatus: () => api.get('/api/v1/auth/status', { params: { user_type: 'faculty' } }),
  
  // Admin authentication
  adminLogin: (credentials) => api.post('/api/v1/auth/admin/login', credentials),
  adminLogout: () => api.post('/api/v1/auth/admin/logout'),
  adminStatus: () => api.get('/api/v1/auth/status', { params: { user_type: 'admin' } }),

  // Password Reset APIs
  forgotPasswordStudent: (data) => api.post('/api/v1/auth/forgot-password/student', data),
  forgotPasswordFaculty: (data) => api.post('/api/v1/auth/forgot-password/faculty', data),
  validateResetToken: (token) => api.get(`/api/v1/auth/validate-reset-token/${token}`),
  resetPassword: (token, data) => api.post(`/api/v1/auth/reset-password/${token}`, data),
  
  // Field validation for real-time checks
  validateField: (fieldName, fieldValue, userType = 'student', currentUserId = null) => 
    api.post('/api/v1/auth/validate-field', {
      field_name: fieldName,
      field_value: fieldValue,
      user_type: userType,
      current_user_id: currentUserId
    }),
  
  // Token management (using optimized backend endpoints)
  refreshToken: (refreshToken) => api.post('/api/v1/auth/refresh-token', { refresh_token: refreshToken }),
};
