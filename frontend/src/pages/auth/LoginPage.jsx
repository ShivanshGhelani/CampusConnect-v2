import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    identifier: '', // Single field for enrollment_no, employee_id, or username
    password: '',
    remember_me: false,
  });
  const [detectedUserType, setDetectedUserType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/client/dashboard';

  // Function to detect user type based on identifier format
  const detectUserType = (identifier) => {
    if (!identifier) return null;
    
    // Student enrollment pattern (e.g., 21BECE40015, 22BTECH12345)
    const enrollmentPattern = /^\d{2}[A-Z]{3,6}\d{4,6}$/;
    
    // Faculty employee ID pattern (e.g., EMP001, FAC123, PROF456)
    const employeePattern = /^(EMP|FAC|PROF|TEACH)\d{3,6}$/i;
    
    // Admin username pattern (typically shorter strings without specific format)
    const adminPattern = /^[a-zA-Z][a-zA-Z0-9_]{2,20}$/;
    
    if (enrollmentPattern.test(identifier)) {
      return 'student';
    } else if (employeePattern.test(identifier)) {
      return 'faculty';
    } else if (adminPattern.test(identifier)) {
      return 'admin';
    }
    
    // If no specific pattern matches, try to guess based on length and content
    if (/^\d+[A-Z]+\d+$/.test(identifier) && identifier.length >= 8) {
      return 'student'; // Likely enrollment number
    } else if (identifier.length <= 10 && /^[A-Z0-9]+$/i.test(identifier)) {
      return 'faculty'; // Likely employee ID
    } else {
      return 'admin'; // Default to admin for other formats
    }
  };

  // Function to get default redirect based on user type
  const getDefaultRedirect = (userType) => {
    switch (userType) {
      case 'student':
        return '/client/dashboard';
      case 'faculty':
        return '/faculty/profile'; // Always go to faculty dashboard first
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/client/dashboard';
    }
  };

  // Check if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Auto-detect user type when identifier changes
  useEffect(() => {
    const userType = detectUserType(formData.identifier);
    setDetectedUserType(userType);
  }, [formData.identifier]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (
        name === 'identifier' 
          ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') // Clean identifier input
          : value
      )
    }));
    clearError();
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Detect user type from identifier
    const userType = detectUserType(formData.identifier);
    
    if (!userType) {
      // Handle case where user type cannot be determined
      setIsLoading(false);
      // You might want to show an error or provide guidance
      return;
    }

    // Prepare login data based on detected user type
    let loginData;
    if (userType === 'student') {
      loginData = {
        enrollment_no: formData.identifier,
        password: formData.password,
        remember_me: formData.remember_me,
      };
    } else if (userType === 'faculty') {
      loginData = {
        employee_id: formData.identifier,
        password: formData.password,
        remember_me: formData.remember_me,
      };
    } else { // admin
      loginData = {
        username: formData.identifier,
        password: formData.password,
        remember_me: formData.remember_me,
      };
    }

    const result = await login(loginData, userType);
    
    if (result.success) {
      // Use the redirect URL from backend response, or fallback to user type default
      const redirectPath = result.redirectUrl || getDefaultRedirect(userType);
      navigate(redirectPath, { replace: true });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
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

      <div className="w-full max-w-md mt-16">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="h-16 w-16 flex items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
              <i className="fas fa-university text-white text-2xl"></i>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back
          </h1>
          <p className="text-slate-600">
            Sign in to your CampusConnect account
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
              <div className="flex items-center">
                <i className="fas fa-exclamation-circle mr-3 text-red-500"></i>
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            {/* Username/ID Field */}
            <div className="space-y-2">
              <label htmlFor="identifier" className="block text-sm font-semibold text-slate-700">
                Username
              </label>
              <div className="relative">
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-form-type="other"
                  placeholder="Enter your username or ID"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-slate-400"
                  value={formData.identifier}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <i className="fas fa-user text-slate-400"></i>
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-form-type="other"
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-slate-400"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            {/* Remember me and Forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember_me"
                  type="checkbox"
                  checked={formData.remember_me}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded transition-colors"
                  disabled={isLoading}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600">
                  Remember me
                </label>
              </div>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading || !formData.identifier || !formData.password}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Sign In
                </div>
              )}
            </button>
          </form>

          {/* Registration Section */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="text-center">
              <p className="text-slate-600 mb-4">
                New to CampusConnect?
              </p>
              <Link
                to="/auth/register"
                className="inline-flex items-center justify-center px-6 py-2.5 border-2 border-green-600 text-green-600 bg-white hover:bg-green-600 hover:text-white font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <i className="fas fa-user-plus mr-2"></i>
                Create Account
              </Link>
              <p className="mt-3 text-xs text-slate-500">
                Join the campus community today!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
