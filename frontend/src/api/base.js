import axios from 'axios';

// Function to get the API base URL - FIXED FOR CONSISTENCY
const getApiBaseUrl = () => {
  // Check for environment variable first
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  if (envApiUrl) {
    return envApiUrl;
  }
  
  // Always use localhost for development to maintain cookie consistency
  // This prevents 127.0.0.1 vs localhost cookie domain issues
  return 'http://localhost:8000';
};

// Create axios instance with base configuration - FIXED FOR CREDENTIALS
const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,  // Required for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // No need to add Authorization headers - we use session cookies
    // Ensure credentials are always sent for session-based auth
    config.withCredentials = true;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - clear auth data and redirect to login
      // For session-based auth, clear localStorage but don't manually clear cookies
      localStorage.removeItem('user_data');
      localStorage.removeItem('user_type');
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    if (error.response?.status === 403) {
      // Forbidden - user doesn't have permission
      console.error('Access denied. You do not have permission to perform this action.');
    }
    
    if (error.response?.status >= 500) {
      // Server error
      console.error('Server error. Please try again later.');
    }
    
    return Promise.reject(error);
  }
);

export default api;
