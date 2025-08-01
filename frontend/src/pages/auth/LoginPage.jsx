import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

function LoginPage() {
  const [activeTab, setActiveTab] = useState('student');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    // Student form data
    enrollment_no: '',
    password: '',
    remember_me: false,
    // Admin form data
    username: '',
    admin_password: '',
    admin_remember_me: false,
    // Faculty form data
    employee_id: '',
    faculty_password: '',
    faculty_remember_me: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { login, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || (
    activeTab === 'admin' ? '/admin/dashboard' : 
    activeTab === 'faculty' ? '/faculty/profile' : 
    '/client/dashboard'
  );

  // Check if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Check URL for active tab
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const mode = urlParams.get('mode');
    if (mode === 'admin') {
      setActiveTab('admin');
    } else if (mode === 'faculty') {
      setActiveTab('faculty');
    }
  }, [location.search]);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    clearError();
    setFormData({
      enrollment_no: '',
      password: '',
      remember_me: false,
      username: '',
      admin_password: '',
      admin_remember_me: false,
      employee_id: '',
      faculty_password: '',
      faculty_remember_me: false,
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'enrollment_no' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') : value)
    }));
    clearError();
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    let loginData;
    if (activeTab === 'student') {
      loginData = {
        enrollment_no: formData.enrollment_no,
        password: formData.password,
        remember_me: formData.remember_me,
      };
    } else if (activeTab === 'faculty') {
      loginData = {
        employee_id: formData.employee_id,
        password: formData.faculty_password,
        remember_me: formData.faculty_remember_me,
      };
    } else {
      loginData = {
        username: formData.username,
        password: formData.admin_password,
        remember_me: formData.admin_remember_me,
      };
    }

    const result = await login(loginData, activeTab);
    
    if (result.success) {
      // Use the redirect URL from backend response, or fallback to default
      const redirectPath = result.redirectUrl || from;
      navigate(redirectPath, { replace: true });
    }
    
    setIsLoading(false);
  };

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

      <div className="max-w-md w-full mx-auto space-y-8 mt-10">        {/* Header Section */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className={`h-20 w-20 flex items-center justify-center rounded-full ${
              activeTab === 'admin' 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600' 
                : activeTab === 'faculty'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600'
                : 'bg-gradient-to-r from-green-600 to-emerald-600'
            } shadow-lg`}>
              <i className={`${
                activeTab === 'admin' ? 'fas fa-user-shield' : 
                activeTab === 'faculty' ? 'fas fa-chalkboard-teacher' :
                'fas fa-user-graduate'
              } text-white text-3xl`}></i>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            {activeTab === 'admin' ? 'Admin Portal' : 
             activeTab === 'faculty' ? 'Faculty Portal' :
             'Student Portal'}
          </h1>
          <p className="text-lg text-gray-600">
            {activeTab === 'admin' 
              ? 'Administrative access to CampusConnect' 
              : activeTab === 'faculty'
              ? 'Faculty portal for event management and participation'
              : 'Sign in to register for events and activities'
            }
          </p>
        </div>

        {/* Login Type Selector */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-2">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => handleTabSwitch('student')}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md text-sm font-semibold transition-all duration-200 ${
                activeTab === 'student'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <i className="fas fa-user-graduate mr-2"></i>
              Student
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('faculty')}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md text-sm font-semibold transition-all duration-200 ${
                activeTab === 'faculty'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <i className="fas fa-chalkboard-teacher mr-2"></i>
              Faculty
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('admin')}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md text-sm font-semibold transition-all duration-200 ${
                activeTab === 'admin'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <i className="fas fa-user-shield mr-2"></i>
              Admin
            </button>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-8">
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
            {activeTab === 'student' ? (
              <>
                {/* Student Login Fields */}
                <div>
                  <label htmlFor="enrollment_no" className="block text-sm font-semibold text-gray-800 mb-2">
                    <i className="fas fa-id-card mr-2 text-green-600"></i>
                    Enrollment Number
                  </label>
                  <div className="relative">
                    <input
                      id="enrollment_no"
                      name="enrollment_no"
                      type="text"
                      required
                      placeholder="e.g., 21BECE40015"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      value={formData.enrollment_no}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <i className="fas fa-user text-gray-400"></i>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Enter your university enrollment number</p>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
                    <i className="fas fa-lock mr-2 text-green-600"></i>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
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
                </div>
              </>
            ) : activeTab === 'faculty' ? (
              <>
                {/* Faculty Login Fields */}
                <div>
                  <label htmlFor="employee_id" className="block text-sm font-semibold text-gray-800 mb-2">
                    <i className="fas fa-id-badge mr-2 text-blue-600"></i>
                    Employee ID
                  </label>
                  <div className="relative">
                    <input
                      id="employee_id"
                      name="employee_id"
                      type="text"
                      required
                      placeholder="e.g., EMP001"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      value={formData.employee_id}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <i className="fas fa-chalkboard-teacher text-gray-400"></i>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Enter your faculty employee ID</p>
                </div>

                <div>
                  <label htmlFor="faculty_password" className="block text-sm font-semibold text-gray-800 mb-2">
                    <i className="fas fa-lock mr-2 text-blue-600"></i>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="faculty_password"
                      name="faculty_password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      value={formData.faculty_password}
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
                </div>
              </>
            ) : (
              <>
                {/* Admin Login Fields */}
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold text-gray-800 mb-2">
                    <i className="fas fa-user-shield mr-2 text-purple-600"></i>
                    Admin Username
                  </label>
                  <div className="relative">
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      placeholder="Enter admin username"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      value={formData.username}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <i className="fas fa-shield-alt text-gray-400"></i>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="admin_password" className="block text-sm font-semibold text-gray-800 mb-2">
                    <i className="fas fa-key mr-2 text-purple-600"></i>
                    Admin Password
                  </label>
                  <div className="relative">
                    <input
                      id="admin_password"
                      name="admin_password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Enter admin password"
                      className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      value={formData.admin_password}
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
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id={`remember-me-${activeTab}`}
                  name={activeTab === 'student' ? 'remember_me' : activeTab === 'faculty' ? 'faculty_remember_me' : 'admin_remember_me'}
                  type="checkbox"
                  checked={activeTab === 'student' ? formData.remember_me : activeTab === 'faculty' ? formData.faculty_remember_me : formData.admin_remember_me}
                  onChange={handleChange}
                  className={`h-4 w-4 border-gray-300 rounded focus:ring-2 focus:ring-offset-2 transition-colors ${
                    activeTab === 'admin'
                      ? 'text-purple-600 focus:ring-purple-500'
                      : activeTab === 'faculty'
                      ? 'text-blue-600 focus:ring-blue-500'
                      : 'text-green-600 focus:ring-green-500'
                  }`}
                  disabled={isLoading}
                />
                <label htmlFor={`remember-me-${activeTab}`} className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              {(activeTab === 'student' || activeTab === 'faculty') && (
                <Link
                  to="/forgot-password"
                  className={`text-sm font-medium transition-colors ${
                    activeTab === 'faculty' 
                      ? 'text-blue-600 hover:text-blue-500'
                      : 'text-green-600 hover:text-green-500'
                  }`}
                >
                  Forgot password?
                </Link>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white transition-all duration-200 ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:ring-purple-500'
                  : activeTab === 'faculty'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 focus:ring-blue-500'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:ring-green-500'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Signing in...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Sign In to {activeTab === 'admin' ? 'Admin Panel' : 
                           activeTab === 'faculty' ? 'Faculty Portal' :
                           'Student Portal'}
                </>
              )}
            </button>
          </form>

          {/* Registration Link (only visible in student and faculty mode) */}
          {(activeTab === 'student' || activeTab === 'faculty') && (
            <div className="mt-6">
              {/* Registration Call-to-Action */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-gray-500">New to Campus Connect?</span>
                </div>
              </div>
              {/* Create Account Link */}
              <div className="text-center">
                <Link
                  to="/auth/register"
                  className={`inline-flex items-center justify-center px-6 py-3 border rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md ${
                    activeTab === 'faculty'
                      ? 'border-blue-600 text-blue-600 bg-white hover:bg-blue-600 hover:text-white'
                      : 'border-green-600 text-green-600 bg-white hover:bg-green-600 hover:text-white'
                  }`}
                >
                  <i className="fas fa-user-plus mr-2"></i>
                  Create Account
                </Link>
                <p className="mt-3 text-xs text-gray-500">
                  Join the campus community and never miss an event!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
