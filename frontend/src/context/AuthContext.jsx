import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../api/auth';
import { clientAPI } from '../api/client';

// Import avatar reset function
import { resetAvatarGlobalState } from '../utils/avatarUtils';

// Import session avatar cache
import { sessionAvatarCache } from '../services/sessionAvatarCache';

// Import data cache manager to clear caches on logout
import { DataCacheManager } from '../utils/dataFilteringUtils';

// Auth context
const AuthContext = createContext();

// Auth states
const initialState = {
  user: null,
  userType: null, // 'admin' | 'student' | 'faculty' | null
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Auth actions
const authActions = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Auth reducer
function authReducer(state, action) {
  switch (action.type) {
    case authActions.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
    
    case authActions.LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        userType: action.payload.userType,
        isLoading: false,
        error: null,
      };
    
    case authActions.LOGIN_FAILURE:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        userType: null,
        isLoading: false,
        error: action.payload,
      };
    
    case authActions.LOGOUT:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        userType: null,
        isLoading: false,
        error: null,
      };
    
    case authActions.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    
    case authActions.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    
    default:
      return state;
  }
}

// Auth Provider Component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Listen for custom userDataUpdated events to immediately update UI
  useEffect(() => {
    const handleUserDataUpdate = (event) => {
      const updatedUserData = event.detail;
      
      if (state.isAuthenticated && updatedUserData) {
        console.log('🔄 Received userDataUpdated event, updating auth state immediately');
        
        // Update the auth context state immediately
        dispatch({
          type: authActions.LOGIN_SUCCESS,
          payload: {
            user: updatedUserData,
            userType: state.userType,
          },
        });
      }
    };

    // Add event listener for custom userDataUpdated events
    window.addEventListener('userDataUpdated', handleUserDataUpdate);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate);
    };
  }, [state.isAuthenticated, state.userType]);

  const checkAuthStatus = async () => {
    dispatch({ type: authActions.SET_LOADING, payload: true });
    
    try {
      // Check if there's stored user data
      const storedUserData = localStorage.getItem('user_data');
      const storedUserType = localStorage.getItem('user_type');
      
      if (storedUserData && storedUserType) {
        // Verify with server
        let response;
        if (storedUserType === 'admin') {
          response = await authAPI.adminStatus();
        } else if (storedUserType === 'student') {
          response = await authAPI.studentStatus();
        } else if (storedUserType === 'faculty') {
          response = await authAPI.facultyStatus();
        }
        
        if (response && response.data.authenticated) {
          dispatch({
            type: authActions.LOGIN_SUCCESS,
            payload: {
              user: response.data.user,
              userType: storedUserType,
            },
          });
          
          // Initialize session avatar cache on successful auth check
          console.log('🚀 Initializing session avatar cache on auth check');
          sessionAvatarCache.initializeSession(response.data.user);
          
        } else {
          // Clear invalid session data
          localStorage.removeItem('user_data');
          localStorage.removeItem('user_type');
          localStorage.removeItem('auth_token');
          
          // Clear avatar cache when session is invalid
          try {
            resetAvatarGlobalState();
            sessionAvatarCache.clearSession();
            console.log('✅ Avatar caches cleared due to invalid session');
          } catch (error) {
            console.error('Failed to clear avatar cache:', error);
          }
          
          dispatch({ type: authActions.LOGOUT });
        }
      } else {
        dispatch({ type: authActions.SET_LOADING, payload: false });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear any invalid session data
      localStorage.removeItem('user_data');
      localStorage.removeItem('user_type');
      
      // Clear avatar cache on auth failure
      try {
        resetAvatarGlobalState();
        console.log('✅ Avatar cache cleared due to auth failure');
      } catch (avatarError) {
        console.error('Failed to clear avatar cache:', avatarError);
      }
      
      dispatch({ type: authActions.LOGOUT });
    }
  };
  const login = async (credentials, userType = 'student') => {
    dispatch({ type: authActions.SET_LOADING, payload: true });
    dispatch({ type: authActions.CLEAR_ERROR });
    
    try {
      let response;
      
      if (userType === 'admin') {
        response = await authAPI.adminLogin(credentials);
      } else if (userType === 'faculty') {
        console.log('Faculty login attempt with credentials:', { employee_id: credentials.employee_id });
        response = await authAPI.facultyLogin(credentials);
        console.log('Faculty login response:', response.data);
      } else {
        response = await authAPI.studentLogin(credentials);
      }
      
      if (response.data.success) {
        console.log('Login successful, storing user data:', response.data.user);
        
        // Store user data locally for UI state (session is handled by cookies)
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        localStorage.setItem('user_type', userType);
        
        // Store complete profile data for students (simple sessionStorage approach)
        if (userType === 'student' && response.data.user?.enrollment_no) {
          try {
            console.log('🔄 Fetching complete profile data on login...');
            const profileResponse = await clientAPI.getProfile();
            
            if (profileResponse.data.success) {
              const completeProfile = profileResponse.data.student || profileResponse.data.profile;
              if (completeProfile) {
                console.log('✅ Complete profile data stored in session');
                sessionStorage.setItem('complete_profile', JSON.stringify(completeProfile));
              }
            }
          } catch (profileError) {
            console.warn('⚠️ Failed to fetch profile data on login:', profileError);
            // Don't fail login if profile fetch fails
          }
        }
        
        dispatch({
          type: authActions.LOGIN_SUCCESS,
          payload: {
            user: response.data.user,
            userType: userType,
          },
        });
        
        // Initialize session avatar cache on successful login
        console.log('🚀 Initializing session avatar cache on login');
        sessionAvatarCache.initializeSession(response.data.user);
        
        return { success: true, redirectUrl: response.data.redirect_url };
      } else {
        dispatch({
          type: authActions.LOGIN_FAILURE,
          payload: response.data.message || 'Login failed',
        });
        return { success: false, error: response.data.message };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      dispatch({
        type: authActions.LOGIN_FAILURE,
        payload: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  };
  const logout = async () => {
    dispatch({ type: authActions.SET_LOADING, payload: true });
    
    try {
      // Call logout API based on user type
      if (state.userType === 'admin') {
        await authAPI.adminLogout();
      } else if (state.userType === 'student') {
        await authAPI.studentLogout();
      } else if (state.userType === 'faculty') {
        await authAPI.facultyLogout();
      }
    } catch (error) {
      console.error('Logout API failed:', error);
      // Continue with logout even if API fails
    }
    
    // Clear Executive Admin session if user is executive admin
    if (state.user?.role === 'executive_admin') {
      const sessionKey = `eventCreatorSession_${state.user.username || state.user.id || 'default'}`;
      sessionStorage.removeItem(sessionKey);
      console.log('Executive Admin session cleared on logout for user:', state.user.username);
    }
    
    // Clear local storage
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_type');
    localStorage.removeItem('auth_token');
    
    // Clear any additional cached data that might contain user-specific info
    localStorage.removeItem('profileData');
    localStorage.removeItem('avatarCache');
    localStorage.removeItem('userProfile');
    
    // Clear session storage as well
    sessionStorage.clear();
    
    // Clear all cached data on logout
    try {
      // Clear localStorage items
      localStorage.removeItem('user_data');
      localStorage.removeItem('user_type');
      sessionStorage.removeItem('complete_profile');
      console.log('✅ All local storage cleared on logout');
    } catch (error) {
      console.error('Failed to clear local storage:', error);
    }
    
    // CRITICAL FIX: Clear avatar cache to prevent showing previous user's avatar
    try {
      resetAvatarGlobalState();
      sessionAvatarCache.clearSession();
      console.log('✅ All avatar caches cleared on logout');
    } catch (error) {
      console.error('Failed to clear avatar cache:', error);
    }
    
    // Clear data cache manager to prevent cross-user data leaks
    try {
      const cacheManager = new DataCacheManager();
      cacheManager.clear();
      console.log('✅ Data cache cleared on logout');
    } catch (error) {
      console.error('Failed to clear data cache:', error);
    }
    
    dispatch({ type: authActions.LOGOUT });
  };

  const register = async (userData, userType = 'student') => {
    dispatch({ type: authActions.SET_LOADING, payload: true });
    dispatch({ type: authActions.CLEAR_ERROR });
    
    try {
      let response;
      
      if (userType === 'faculty') {
        response = await authAPI.facultyRegister(userData);
      } else {
        response = await authAPI.studentRegister(userData);
      }
      
      if (response.data.success) {
        // Auto-login after successful registration
        let loginData;
        
        if (userType === 'faculty') {
          loginData = {
            employee_id: userData.employee_id,
            password: userData.password
          };
        } else {
          loginData = {
            enrollment_no: userData.enrollment_no,
            password: userData.password
          };
        }
        
        const loginResult = await login(loginData, userType);
        return loginResult;
      } else {
        dispatch({
          type: authActions.SET_ERROR,
          payload: response.data.message || 'Registration failed',
        });
        return { success: false, error: response.data.message };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      dispatch({
        type: authActions.SET_ERROR,
        payload: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  };

  const clearError = () => {
    dispatch({ type: authActions.CLEAR_ERROR });
  };

  // Function to transition faculty to organizer admin
  const transitionToOrganizerAdmin = async (organizerData) => {
    // Update user data to reflect organizer admin role
    const adminUser = {
      username: organizerData.data.employee_id,
      fullname: organizerData.data.organizer_name,
      role: organizerData.data.role, // Should be "organizer_admin"
      user_type: 'admin',
      employee_id: organizerData.data.employee_id,
      assigned_events: organizerData.data.assigned_events || []
    };
    
    dispatch({
      type: authActions.LOGIN_SUCCESS,
      payload: {
        user: adminUser,
        userType: 'admin',
      },
    });
    
    // Update localStorage
    localStorage.setItem('user_data', JSON.stringify(adminUser));
    localStorage.setItem('user_type', 'admin');
    
    // Force refresh from backend to ensure session sync
    try {
      const response = await authAPI.adminStatus();
      if (response && response.data.authenticated) {
        dispatch({
          type: authActions.LOGIN_SUCCESS,
          payload: {
            user: response.data.user,
            userType: 'admin',
          },
        });
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        localStorage.setItem('user_type', 'admin');
      }
    } catch (error) {
      console.error('Failed to sync admin status after transition:', error);
    }
  };

  // Function to refresh user data (especially assigned_events for organizer admins)
  const refreshUserData = async () => {
    if (!state.user || !state.isAuthenticated) {
      return;
    }

    try {
      let response;
      if (state.userType === 'admin') {
        response = await authAPI.adminStatus();
      } else if (state.userType === 'faculty') {
        response = await authAPI.facultyStatus();
      } else if (state.userType === 'student') {
        response = await authAPI.studentStatus();
      }

      if (response?.data?.success && response.data.user) {
        // Update user data in state
        dispatch({
          type: authActions.LOGIN_SUCCESS,
          payload: {
            user: response.data.user,
            userType: state.userType,
          },
        });
        
        // Update localStorage
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        console.log('✅ User data refreshed successfully');
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const value = {
    ...state,
    login,
    logout,
    register,
    clearError,
    checkAuthStatus,
    transitionToOrganizerAdmin,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
