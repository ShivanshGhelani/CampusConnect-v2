import { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { authAPI } from '../api/auth';

// Auth context split for performance
const AuthStateContext = createContext();
const AuthDispatchContext = createContext();

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

// Auth reducer with performance optimizations
function authReducer(state, action) {
  switch (action.type) {
    case authActions.SET_LOADING:
      if (state.isLoading === action.payload) return state; // Prevent unnecessary re-renders
      return { ...state, isLoading: action.payload };
    
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
      if (state.error === action.payload) return state;
      return { ...state, error: action.payload, isLoading: false };
    
    case authActions.CLEAR_ERROR:
      if (!state.error) return state;
      return { ...state, error: null };
    
    default:
      return state;
  }
}

// Optimized Auth Provider Component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Memoized dispatch functions to prevent recreation on every render
  const authFunctions = useMemo(() => ({
    checkAuthStatus: async () => {
      dispatch({ type: authActions.SET_LOADING, payload: true });
      
      try {
        // Check if there's stored user data
        const storedUserData = localStorage.getItem('user_data');
        const storedUserType = localStorage.getItem('user_type');
        
        if (storedUserData && storedUserType) {
          // Verify with server based on user type
          let statusResponse;
          try {
            switch (storedUserType) {
              case 'admin':
                statusResponse = await authAPI.adminStatus();
                break;
              case 'student':
                statusResponse = await authAPI.studentStatus();
                break;
              case 'faculty':
                statusResponse = await authAPI.facultyStatus();
                break;
              default:
                throw new Error('Invalid user type');
            }
            
            if (statusResponse.data.isAuthenticated) {
              dispatch({ 
                type: authActions.LOGIN_SUCCESS, 
                payload: { 
                  user: JSON.parse(storedUserData), 
                  userType: storedUserType 
                } 
              });
            } else {
              throw new Error('Authentication invalid');
            }
          } catch (error) {
            // Clear invalid stored data
            localStorage.removeItem('user_data');
            localStorage.removeItem('user_type');
            dispatch({ type: authActions.LOGIN_FAILURE, payload: 'Session expired' });
          }
        } else {
          dispatch({ type: authActions.SET_LOADING, payload: false });
        }
      } catch (error) {
        dispatch({ type: authActions.SET_ERROR, payload: 'Failed to check authentication status' });
      }
    },

    login: async (credentials, userType) => {
      dispatch({ type: authActions.SET_LOADING, payload: true });
      
      try {
        let response;
        switch (userType) {
          case 'admin':
            response = await authAPI.adminLogin(credentials);
            break;
          case 'student':
            response = await authAPI.studentLogin(credentials);
            break;
          case 'faculty':
            response = await authAPI.facultyLogin(credentials);
            break;
          default:
            throw new Error('Invalid user type');
        }
        
        if (response.data.success) {
          // Store user data
          localStorage.setItem('user_data', JSON.stringify(response.data.user));
          localStorage.setItem('user_type', userType);
          
          dispatch({ 
            type: authActions.LOGIN_SUCCESS, 
            payload: { 
              user: response.data.user, 
              userType: userType 
            } 
          });
          
          return { success: true, user: response.data.user };
        } else {
          dispatch({ type: authActions.LOGIN_FAILURE, payload: response.data.message || 'Login failed' });
          return { success: false, message: response.data.message || 'Login failed' };
        }
      } catch (error) {
        const message = error.response?.data?.message || 'Login failed';
        dispatch({ type: authActions.LOGIN_FAILURE, payload: message });
        return { success: false, message };
      }
    },

    logout: async () => {
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
        console.error('Logout API error:', error);
      } finally {
        // Clear local storage regardless of API success
        localStorage.removeItem('user_data');
        localStorage.removeItem('user_type');
        dispatch({ type: authActions.LOGOUT });
      }
    },

    register: async (userData, userType = 'student') => {
      dispatch({ type: authActions.SET_LOADING, payload: true });
      
      try {
        let response;
        switch (userType) {
          case 'student':
            response = await authAPI.studentRegister(userData);
            break;
          case 'faculty':
            response = await authAPI.facultyRegister(userData);
            break;
          default:
            throw new Error('Invalid user type for registration');
        }
        
        if (response.data.success) {
          dispatch({ type: authActions.SET_LOADING, payload: false });
          return { success: true, message: response.data.message };
        } else {
          dispatch({ type: authActions.SET_ERROR, payload: response.data.message || 'Registration failed' });
          return { success: false, message: response.data.message || 'Registration failed' };
        }
      } catch (error) {
        const message = error.response?.data?.message || 'Registration failed';
        dispatch({ type: authActions.SET_ERROR, payload: message });
        return { success: false, message };
      }
    },

    clearError: () => {
      dispatch({ type: authActions.CLEAR_ERROR });
    }
  }), [state.userType]); // Only recreate when userType changes

  // Check authentication status on app load
  useEffect(() => {
    authFunctions.checkAuthStatus();
  }, []); // Empty dependency array - only run once

  // Memoize state to prevent unnecessary re-renders
  const memoizedState = useMemo(() => state, [
    state.isAuthenticated,
    state.user,
    state.userType,
    state.isLoading,
    state.error
  ]);

  return (
    <AuthStateContext.Provider value={memoizedState}>
      <AuthDispatchContext.Provider value={authFunctions}>
        {children}
      </AuthDispatchContext.Provider>
    </AuthStateContext.Provider>
  );
}

// Optimized hooks with error handling
export const useAuth = () => {
  const state = useContext(AuthStateContext);
  const actions = useContext(AuthDispatchContext);
  
  if (state === undefined || actions === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return { ...state, ...actions };
};

export const useAuthState = () => {
  const context = useContext(AuthStateContext);
  if (context === undefined) {
    throw new Error('useAuthState must be used within an AuthProvider');
  }
  return context;
};

export const useAuthActions = () => {
  const context = useContext(AuthDispatchContext);
  if (context === undefined) {
    throw new Error('useAuthActions must be used within an AuthProvider');
  }
  return context;
};
