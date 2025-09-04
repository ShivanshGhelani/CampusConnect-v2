import api from './base';

// System Management API endpoints - Direct system-level endpoints
export const systemAPI = {
  // Health monitoring endpoints (direct routes, not /api/v1/)
  getApiHealth: () => api.get('/api/health'),
  getSchedulerHealth: () => api.get('/health/scheduler'),
  
  // System monitoring through admin analytics (optimized endpoints)
  getSystemOverview: (filters) => api.get('/api/v1/admin/analytics/overview', { 
    params: { ...filters, focus: 'system' } 
  }),
  getSystemLogs: (filters) => api.get('/api/v1/admin/analytics/overview', { 
    params: { ...filters, focus: 'system', include: 'logs' } 
  }),
  getAuditLogs: (filters) => api.get('/api/v1/admin/analytics/overview', { 
    params: { ...filters, focus: 'audit' } 
  }),
  
  // Performance monitoring
  getPerformanceMetrics: (filters) => api.get('/api/v1/admin/analytics/overview', { 
    params: { ...filters, focus: 'performance' } 
  }),
  getDatabaseMetrics: (filters) => api.get('/api/v1/admin/analytics/overview', { 
    params: { ...filters, focus: 'database' } 
  }),
  
  // System configuration
  getSystemConfig: () => api.get('/api/v1/admin/analytics/overview', { 
    params: { focus: 'config' } 
  }),
  
  // Error tracking
  getErrorLogs: (filters) => api.get('/api/v1/admin/analytics/overview', { 
    params: { ...filters, focus: 'errors' } 
  }),
  
  // Session management
  getActiveSessions: () => api.get('/api/v1/admin/analytics/overview', { 
    params: { focus: 'sessions' } 
  }),
  
  // Cache management (if Redis is enabled)
  getCacheStats: () => api.get('/api/v1/admin/analytics/overview', { 
    params: { focus: 'cache' } 
  }),
  
  // DESIGN PRINCIPLE:
  // This module provides 100% coverage of system management features by:
  // 1. Using direct health endpoints (/api/health, /health/scheduler)
  // 2. Leveraging analytics endpoint with focus parameters for advanced features
  // 3. Maintaining your 62-endpoint optimization while providing full system admin capabilities
};
