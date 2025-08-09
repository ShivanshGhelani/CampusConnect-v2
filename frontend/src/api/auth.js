import api from './base';

// Auth API endpoints
export const authAPI = {
  // Student authentication
  studentLogin: (credentials) => api.post('/api/v1/auth/student/login', credentials),
  studentRegister: (userData) => api.post('/api/v1/auth/student/register', userData),
  studentLogout: () => api.post('/api/v1/auth/student/logout'),
  studentStatus: () => api.get('/api/v1/auth/student/status'),
  
  // Faculty authentication
  facultyLogin: (credentials) => api.post('/api/v1/auth/faculty/login', credentials),
  facultyRegister: (userData) => api.post('/api/v1/auth/faculty/register', userData),
  facultyLogout: () => api.post('/api/v1/auth/faculty/logout'),
  facultyStatus: () => api.get('/api/v1/auth/faculty/status'),
  
  // Admin authentication
  adminLogin: (credentials) => api.post('/api/v1/auth/admin/login', credentials),
  adminLogout: () => api.post('/api/v1/auth/admin/logout'),
  adminStatus: () => api.get('/api/v1/auth/admin/status'),

  // Password Reset APIs
  forgotPasswordStudent: (data) => api.post('/api/v1/auth/forgot-password/student', data),
  forgotPasswordFaculty: (data) => api.post('/api/v1/auth/forgot-password/faculty', data),
  validateResetToken: (token) => api.get(`/api/v1/auth/validate-reset-token/${token}`),
  resetPassword: (token, data) => api.post(`/api/v1/auth/reset-password/${token}`, data),
};
