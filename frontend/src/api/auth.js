import api from './base';

// Auth API endpoints
export const authAPI = {
  // Unified authentication status (NEW - using optimized endpoint)
  getStatus: (userType = null) => api.get('/api/v1/auth/status', { params: userType ? { user_type: userType } : {} }),
  
  // ⚡ UNIFIED AUTHENTICATION ENDPOINTS (Phase 3B+ Consolidation)
  // Single login endpoint for all user types
  login: (credentials) => api.post('/api/v1/auth/login', credentials),
  // Single logout endpoint with auto-detection
  logout: () => api.post('/api/v1/auth/logout'),
  
  // 🔄 LEGACY COMPATIBILITY HELPERS (for existing frontend code)
  // These wrap the unified endpoints but maintain the old interface
  studentLogin: (credentials) => api.post('/api/v1/auth/login', {
    user_type: 'student',
    enrollment_no: credentials.enrollment_no,
    password: credentials.password,
    remember_me: credentials.remember_me || false
  }),
  facultyLogin: (credentials) => api.post('/api/v1/auth/login', {
    user_type: 'faculty', 
    employee_id: credentials.employee_id,
    password: credentials.password,
    remember_me: credentials.remember_me || false
  }),
  adminLogin: (credentials) => api.post('/api/v1/auth/login', {
    user_type: 'admin',
    username: credentials.username,
    password: credentials.password,
    remember_me: credentials.remember_me || false
  }),
  
  // Unified logout for all user types (auto-detects from session)
  studentLogout: () => api.post('/api/v1/auth/logout'),
  facultyLogout: () => api.post('/api/v1/auth/logout'),
  adminLogout: () => api.post('/api/v1/auth/logout'),
  
  // 📝 REGISTRATION ENDPOINTS (unchanged)
  studentRegister: (userData) => api.post('/api/v1/auth/student/register', userData),
  facultyRegister: (userData) => api.post('/api/v1/auth/faculty/register', userData),
  
  // 📊 STATUS ENDPOINTS (unchanged)  
  studentStatus: () => api.get('/api/v1/auth/status', { params: { user_type: 'student' } }),
  facultyStatus: () => api.get('/api/v1/auth/status', { params: { user_type: 'faculty' } }),
  adminStatus: () => api.get('/api/v1/auth/status', { params: { user_type: 'admin' } }),

  // 🔑 PASSWORD RESET APIs (unchanged)
  forgotPasswordStudent: (data) => api.post('/api/v1/auth/forgot-password/student', data),
  forgotPasswordFaculty: (data) => api.post('/api/v1/auth/forgot-password/faculty', data),
  validateResetToken: (token) => api.get(`/api/v1/auth/validate-reset-token/${token}`),
  resetPassword: (token, data) => api.post(`/api/v1/auth/reset-password/${token}`, data),
  
  // 🔍 FIELD VALIDATION (unchanged)
  validateField: (fieldName, fieldValue, userType = 'student', currentUserId = null) => 
    api.post('/api/v1/auth/validate-field', {
      field_name: fieldName,
      field_value: fieldValue,
      user_type: userType,
      current_user_id: currentUserId
    }),
  
  // 🔄 TOKEN MANAGEMENT (unchanged)
  refreshToken: (refreshToken) => api.post('/api/v1/auth/refresh-token', { refresh_token: refreshToken }),
};
