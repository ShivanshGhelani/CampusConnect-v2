import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../api/axios';

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
        } else {
          // Clear invalid session data
          localStorage.removeItem('user_data');
          localStorage.removeItem('user_type');
          localStorage.removeItem('auth_token');
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
        
        // No need to store tokens - backend uses session cookies
        
        dispatch({
          type: authActions.LOGIN_SUCCESS,
          payload: {
            user: response.data.user,
            userType: userType,
          },
        });
        
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
    
    // Clear local storage
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_type');
    localStorage.removeItem('auth_token');
    
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

  const value = {
    ...state,
    login,
    logout,
    register,
    clearError,
    checkAuthStatus,
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
