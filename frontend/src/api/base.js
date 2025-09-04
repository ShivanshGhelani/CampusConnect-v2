import axios from 'axios';

// Function to get the API base URL - FIXED FOR VERCEL DEPLOYMENT
const getApiBaseUrl = () => {
  // Check for Vite environment variable first
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  if (envApiUrl) {
    console.log('Using API URL from environment:', envApiUrl);
    return envApiUrl;
  }
  
  // Fallback to localhost for development
  console.log('Using fallback localhost API URL');
  return 'http://localhost:8000';
};

// Create axios instance with base configuration - FIXED FOR CROSS-ORIGIN
const apiBaseUrl = getApiBaseUrl();
console.log('Initializing API with base URL:', apiBaseUrl);

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,  // Required for session cookies across domains
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',  // Skip ngrok browser warning
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Debug logging for cross-origin requests
    console.log('Making API request to:', config.baseURL + config.url);
    console.log('With credentials:', config.withCredentials);
    
    // Ensure credentials are always sent for session-based auth
    config.withCredentials = true;
    
    // Add ngrok bypass header for all requests
    config.headers['ngrok-skip-browser-warning'] = 'true';
    
    // Add Bearer token if available in localStorage (for cross-device compatibility)
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      console.log('Added Bearer token to request');
    }
    
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
      // Clear both localStorage tokens and user data for hybrid auth
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('user_type');
      
      // Check if user is on admin dashboard and redirect appropriately
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/admin')) {
        // Redirect admin to admin login - use window.location to navigate within SPA
        window.location.href = '/auth/login?tab=admin&reason=session_expired';
      } else if (currentPath.startsWith('/faculty')) {
        // Redirect faculty to faculty login
        window.location.href = '/auth/login?tab=faculty&reason=session_expired';
      } else if (!currentPath.includes('/login')) {
        // Redirect to general login for students or other users
        window.location.href = '/auth/login?tab=student&reason=session_expired';
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
