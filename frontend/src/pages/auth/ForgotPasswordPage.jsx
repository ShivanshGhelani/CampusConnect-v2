import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import LoadingSpinner from '../../components/LoadingSpinner';

function ForgotPasswordPage() {
  const location = useLocation();
  const [formData, setFormData] = useState({
    identifier: '', // Single field for enrollment_no or employee_id
    email: '',
  });
  const [detectedUserType, setDetectedUserType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Function to detect user type based on identifier format (same as LoginPage)
  const detectUserType = (identifier) => {
    if (!identifier) return null;
    
    // Student enrollment pattern (e.g., 21BECE40015, 22BTECH12345)
    const enrollmentPattern = /^\d{2}[A-Z]{3,6}\d{4,6}$/;
    
    // Faculty employee ID pattern (e.g., EMP001, FAC123, PROF456)
    const employeePattern = /^(EMP|FAC|PROF|TEACH)\d{3,6}$/i;
    
    if (enrollmentPattern.test(identifier)) {
      return 'student';
    } else if (employeePattern.test(identifier)) {
      return 'faculty';
    }
    
    // If no specific pattern matches, try to guess based on length and content
    if (/^\d+[A-Z]+\d+$/.test(identifier) && identifier.length >= 8) {
      return 'student'; // Likely enrollment number
    } else if (identifier.length <= 10 && /^[A-Z0-9]+$/i.test(identifier)) {
      return 'faculty'; // Likely employee ID
    }
    
    return null; // Cannot determine type
  };

  // Auto-detect user type when identifier changes
  useEffect(() => {
    const userType = detectUserType(formData.identifier);
    setDetectedUserType(userType);
  }, [formData.identifier]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'identifier' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') : value
    }));
    setError('');
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    // Detect user type from identifier
    const userType = detectUserType(formData.identifier);
    
    if (!userType) {
      setError('Please enter a valid enrollment number or employee ID.');
      setIsLoading(false);
      return;
    }

    try {
      let response;
      let requestData;

      if (userType === 'student') {
        requestData = {
          enrollment_no: formData.identifier,
          email: formData.email,
        };
        response = await authAPI.forgotPassword('student', requestData);
      } else { // faculty
        requestData = {
          employee_id: formData.identifier,
          email: formData.email,
        };
        response = await authAPI.forgotPassword('faculty', requestData);
      }

      setMessage(response.data.message || 'Password reset link has been sent to your email address. Please check your inbox and follow the instructions.');
      setFormData({
        identifier: '',
        email: '',
      });
    } catch (error) {
      setError(error.response?.data?.detail || 'Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
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
              <i className="fas fa-key text-white text-2xl"></i>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Reset Password
          </h1>
          <p className="text-slate-600">
            Enter your credentials to receive a reset link
          </p>
        </div>

        {/* Reset Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {/* Success Message */}
          {message && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl">
              <div className="flex items-center">
                <i className="fas fa-check-circle mr-3 text-green-500"></i>
                <p className="text-sm font-medium">{message}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
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
                Username or ID
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
                  placeholder="Enter your enrollment number or employee ID"
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

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  placeholder="your.email@ldrp.ac.in"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-slate-400"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <i className="fas fa-envelope text-slate-400"></i>
                </div>
              </div>
            </div>

            {/* Send Reset Link Button */}
            <button
              type="submit"
              disabled={isLoading || !formData.identifier || !formData.email}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  Sending reset link...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <i className="fas fa-paper-plane mr-2"></i>
                  Send Reset Link
                </div>
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="text-center">
              <p className="text-slate-600 mb-4">
                Remember your password?
              </p>
              <Link
                to="/auth/login"
                className="inline-flex items-center justify-center px-6 py-2.5 border-2 border-green-600 text-green-600 bg-white hover:bg-green-600 hover:text-white font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
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
