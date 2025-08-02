import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValidation, setTokenValidation] = useState({
    isValid: null,
    isLoading: true,
    userType: null,
    userInfo: null,
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Validate token on component mount
  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/auth/validate-reset-token/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setTokenValidation({
          isValid: true,
          isLoading: false,
          userType: data.user_type,
          userInfo: data.user_info,
        });
      } else {
        setTokenValidation({
          isValid: false,
          isLoading: false,
          userType: null,
          userInfo: null,
        });
        setError(data.detail || 'Invalid or expired reset token.');
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setTokenValidation({
        isValid: false,
        isLoading: false,
        userType: null,
        userInfo: null,
      });
      setError('Network error. Please check your connection and try again.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    // Validate passwords
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/auth/reset-password/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Password has been reset successfully! Logging you in...');
        
        // Auto-login after successful password reset
        setTimeout(async () => {
          try {
            let loginData;
            if (tokenValidation.userType === 'student') {
              loginData = {
                enrollment_no: tokenValidation.userInfo.enrollment_no,
                password: formData.password,
                remember_me: false,
              };
            } else if (tokenValidation.userType === 'faculty') {
              loginData = {
                employee_id: tokenValidation.userInfo.employee_id,
                password: formData.password,
                remember_me: false,
              };
            }

            const loginResult = await login(loginData, tokenValidation.userType);
            
            if (loginResult.success) {
              const redirectPath = tokenValidation.userType === 'faculty' 
                ? '/faculty/profile' 
                : '/client/dashboard';
              navigate(redirectPath, { replace: true });
            } else {
              // If auto-login fails, redirect to login page
              navigate('/auth/login', { 
                replace: true,
                state: { 
                  message: 'Password reset successful! Please log in with your new password.' 
                }
              });
            }
          } catch (loginError) {
            console.error('Auto-login error:', loginError);
            navigate('/auth/login', { 
              replace: true,
              state: { 
                message: 'Password reset successful! Please log in with your new password.' 
              }
            });
          }
        }, 2000);
      } else {
        setError(data.detail || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (tokenValidation.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Validating reset token...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValidation.isValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full mx-auto space-y-8 mt-10">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="h-20 w-20 flex items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-red-700 shadow-lg">
                <i className="fas fa-exclamation-triangle text-white text-3xl"></i>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Invalid Reset Link
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              This password reset link is invalid or has expired.
            </p>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-4 rounded-r-md mb-6">
                <p className="text-sm">{error}</p>
              </div>
            )}
            <div className="space-y-4">
              <Link
                to="/forgot-password"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <i className="fas fa-redo mr-2"></i>
                Request New Reset Link
              </Link>
              <div className="block">
                <Link
                  to="/auth/login"
                  className="text-sm font-medium text-red-600 hover:text-red-500 transition-colors"
                >
                  <i className="fas fa-arrow-left mr-1"></i>
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-sky-900 text-white py-2 fixed top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <i className="fas fa-bullhorn mr-2"></i>
          Stay updated with the latest campus events and activities!
          <Link to="/client/events?filter=upcoming" className="underline hover:text-teal-200 ml-2">
            Check upcoming events
          </Link>
        </div>
      </div>

      <div className="max-w-md w-full mx-auto space-y-8 mt-10">
        {/* Header Section */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className={`h-20 w-20 flex items-center justify-center rounded-full ${
              tokenValidation.userType === 'faculty'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600'
                : 'bg-gradient-to-r from-green-600 to-emerald-600'
            } shadow-lg`}>
              <i className={`${
                tokenValidation.userType === 'faculty' ? 'fas fa-chalkboard-teacher' : 'fas fa-user-graduate'
              } text-white text-3xl`}></i>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Reset Your Password
          </h1>
          <p className="text-lg text-gray-600">
            {tokenValidation.userType === 'faculty' 
              ? `Welcome ${tokenValidation.userInfo?.full_name || 'Faculty Member'}`
              : `Welcome ${tokenValidation.userInfo?.full_name || 'Student'}`
            }
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Enter your new password below
          </p>
        </div>

        {/* Reset Form */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-8">
          {/* Success Message */}
          {message && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-400 text-green-700 px-4 py-4 rounded-r-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <i className="fas fa-check-circle text-green-400"></i>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-4 rounded-r-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <i className="fas fa-exclamation-triangle text-red-400"></i>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
                <i className={`fas fa-lock mr-2 ${
                  tokenValidation.userType === 'faculty' ? 'text-blue-600' : 'text-green-600'
                }`}></i>
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your new password"
                  minLength="6"
                  className={`w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${
                    tokenValidation.userType === 'faculty' 
                      ? 'focus:ring-blue-500' 
                      : 'focus:ring-green-500'
                  } focus:border-transparent transition-all duration-200`}
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Password must be at least 6 characters long</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-800 mb-2">
                <i className={`fas fa-lock mr-2 ${
                  tokenValidation.userType === 'faculty' ? 'text-blue-600' : 'text-green-600'
                }`}></i>
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="Confirm your new password"
                  minLength="6"
                  className={`w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${
                    tokenValidation.userType === 'faculty' 
                      ? 'focus:ring-blue-500' 
                      : 'focus:ring-green-500'
                  } focus:border-transparent transition-all duration-200`}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={toggleConfirmPassword}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Re-enter your password to confirm</p>
            </div>

            {/* Password Match Indicator */}
            {formData.password && formData.confirmPassword && (
              <div className={`text-sm ${
                formData.password === formData.confirmPassword 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                <i className={`fas ${
                  formData.password === formData.confirmPassword 
                    ? 'fa-check-circle' 
                    : 'fa-times-circle'
                } mr-1`}></i>
                {formData.password === formData.confirmPassword 
                  ? 'Passwords match' 
                  : 'Passwords do not match'
                }
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || formData.password !== formData.confirmPassword || !formData.password}
              className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white transition-all duration-200 ${
                tokenValidation.userType === 'faculty'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 focus:ring-blue-500'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:ring-green-500'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Resetting Password...
                </>
              ) : (
                <>
                  <i className="fas fa-key mr-2"></i>
                  Reset Password
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
