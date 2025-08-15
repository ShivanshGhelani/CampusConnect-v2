import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import LoadingSpinner from '../../components/LoadingSpinner';

function ForgotPasswordPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('student');
  const [formData, setFormData] = useState({
    // Student form data
    enrollment_no: '',
    email: '',
    // Faculty form data
    employee_id: '',
    faculty_email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Check URL for tab parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'faculty') {
      setActiveTab('faculty');
    } else if (tabParam === 'student') {
      setActiveTab('student');
    }
  }, [location.search]);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError('');
    setMessage('');
    setFormData({
      enrollment_no: '',
      email: '',
      employee_id: '',
      faculty_email: '',
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'enrollment_no' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') : value
    }));
    setError('');
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      let response;

      if (activeTab === 'student') {
        const requestData = {
          enrollment_no: formData.enrollment_no,
          email: formData.email,
        };
        response = await authAPI.forgotPasswordStudent(requestData);
      } else {
        const requestData = {
          employee_id: formData.employee_id,
          email: formData.faculty_email,
        };
        response = await authAPI.forgotPasswordFaculty(requestData);
      }

      setMessage(response.data.message || 'Password reset link has been sent to your email address. Please check your inbox and follow the instructions.');
      setFormData({
        enrollment_no: '',
        email: '',
        employee_id: '',
        faculty_email: '',
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      setError(error.response?.data?.detail || 'Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
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

      <div className="max-w-md w-full mx-auto space-y-8 mt-10">
        {/* Header Section */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className={`h-20 w-20 flex items-center justify-center rounded-full ${
              activeTab === 'faculty'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600'
                : 'bg-gradient-to-r from-green-600 to-emerald-600'
            } shadow-lg`}>
              <i className={`${
                activeTab === 'faculty' ? 'fas fa-chalkboard-teacher' : 'fas fa-user-graduate'
              } text-white text-3xl`}></i>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Reset Your Password
          </h1>
          <p className="text-lg text-gray-600">
            Enter your credentials to receive a password reset link
          </p>
        </div>

        {/* User Type Selector */}
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
          </div>
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

          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            {activeTab === 'student' ? (
              <>
                {/* Student Reset Fields */}
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
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                    <i className="fas fa-envelope mr-2 text-green-600"></i>
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="your.email@ldrp.ac.in"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <i className="fas fa-at text-gray-400"></i>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Enter your registered email address</p>
                </div>
              </>
            ) : (
              <>
                {/* Faculty Reset Fields */}
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
                  <label htmlFor="faculty_email" className="block text-sm font-semibold text-gray-800 mb-2">
                    <i className="fas fa-envelope mr-2 text-blue-600"></i>
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="faculty_email"
                      name="faculty_email"
                      type="email"
                      required
                      placeholder="faculty.email@ldrp.ac.in"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      value={formData.faculty_email}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <i className="fas fa-at text-gray-400"></i>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Enter your registered email address</p>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white transition-all duration-200 ${
                activeTab === 'faculty'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 focus:ring-blue-500'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:ring-green-500'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Sending Reset Link...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2"></i>
                  Send Reset Link
                </>
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6">
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500">Remember your password?</span>
              </div>
            </div>
            <div className="text-center">
              <Link
                to={`/auth/login?tab=${activeTab}`}
                className={`inline-flex items-center justify-center px-6 py-3 border rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md ${
                  activeTab === 'faculty'
                    ? 'border-blue-600 text-blue-600 bg-white hover:bg-blue-600 hover:text-white'
                    : 'border-green-600 text-green-600 bg-white hover:bg-green-600 hover:text-white'
                }`}
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
