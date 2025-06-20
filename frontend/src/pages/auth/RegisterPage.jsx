import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

function RegisterPage() {
  const [formData, setFormData] = useState({
    full_name: '',
    enrollment_no: '',
    email: '',
    mobile_no: '',
    gender: '',
    date_of_birth: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirm_password: false,
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    specialChar: false,
    number: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { register, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/client/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    // Auto-format specific fields
    if (name === 'enrollment_no') {
      processedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    } else if (name === 'mobile_no') {
      processedValue = value.replace(/[^0-9]/g, '').slice(0, 10);
    } else if (name === 'email') {
      processedValue = value.toLowerCase();
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Clear specific validation error
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    clearError();

    // Real-time validation
    validateField(name, processedValue);

    // Password strength check
    if (name === 'password') {
      checkPasswordStrength(processedValue);
    }

    // Password match check
    if (name === 'confirm_password' || name === 'password') {
      const password = name === 'password' ? processedValue : formData.password;
      const confirmPassword = name === 'confirm_password' ? processedValue : formData.confirm_password;
      validatePasswordMatch(password, confirmPassword);
    }
  };

  const validateField = (name, value) => {
    let error = '';

    switch (name) {
      case 'enrollment_no':
        if (value && !/^\d{2}[A-Z]{2,4}\d{5}$/.test(value)) {
          error = 'Invalid format. Example: 21BECE40015';
        }
        break;
      case 'email':
        if (value && !value.includes('@')) {
          error = 'Could you double-check your email address?';
        }
        break;
      case 'mobile_no':
        if (value && !/^\d{10}$/.test(value)) {
          error = 'Mobile number must be exactly 10 digits';
        }
        break;
      case 'date_of_birth':
        if (value) {
          const birthDate = new Date(value);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          if (age < 15) {
            error = 'You must be at least 15 years old';
          } else if (age > 100) {
            error = 'Please enter a valid date of birth';
          }
        }
        break;
    }

    if (error) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };

  const checkPasswordStrength = (password) => {
    setPasswordStrength({
      length: password.length >= 6,
      specialChar: /[!@#$%^&*]/.test(password),
      number: /\d/.test(password),
    });
  };

  const validatePasswordMatch = (password, confirmPassword) => {
    if (confirmPassword && password !== confirmPassword) {
      setValidationErrors(prev => ({
        ...prev,
        confirm_password: 'Passwords do not match'
      }));
    } else if (confirmPassword && password === confirmPassword) {
      setValidationErrors(prev => ({
        ...prev,
        confirm_password: ''
      }));
    }
  };

  const togglePassword = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Final validation
    const errors = [];
    
    // Required fields
    Object.keys(formData).forEach(key => {
      if (!formData[key] && key !== 'confirm_password') {
        errors.push(`${key.replace('_', ' ')} is required`);
      }
    });

    // Password validation
    if (formData.password !== formData.confirm_password) {
      errors.push('Passwords do not match');
    }

    if (!passwordStrength.length || !passwordStrength.specialChar || !passwordStrength.number) {
      errors.push('Password must meet all requirements');
    }

    // Check existing validation errors
    const hasValidationErrors = Object.values(validationErrors).some(error => error);
    
    if (errors.length > 0 || hasValidationErrors) {
      return;
    }

    setIsLoading(true);

    // Remove confirm_password from submission data
    const { confirm_password, ...submitData } = formData;
    
    const result = await register(submitData);
    
    if (result.success) {
      navigate('/client/dashboard', { replace: true });
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

      <div className="max-w-2xl w-full mx-auto space-y-8 mt-10">        {/* Header Section */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <img 
              src="/logo/ksv.png" 
              alt="KSV Logo" 
              className="h-16 w-16 object-contain"
            />
            <div className="h-20 w-20 flex items-center justify-center rounded-full bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg">
              <i className="fas fa-user-plus text-white text-3xl"></i>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Join CampusConnect</h1>
          <p className="text-lg text-gray-600">Create your student account to access events and opportunities</p>
        </div>
        
        {/* Registration Form */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-10">
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
            {/* Personal Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                <i className="fas fa-user mr-2 text-green-600"></i>
                Personal Information
              </h3>

              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className="block text-sm font-semibold text-gray-800 mb-2">
                  Full Name *
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  value={formData.full_name}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>

              {/* Enrollment Number */}
              <div>
                <label htmlFor="enrollment_no" className="block text-sm font-semibold text-gray-800 mb-2">
                  Enrollment Number *
                </label>
                <input
                  id="enrollment_no"
                  name="enrollment_no"
                  type="text"
                  required
                  placeholder="e.g., 21BECE40015"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    validationErrors.enrollment_no ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                  }`}
                  value={formData.enrollment_no}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                {validationErrors.enrollment_no && (
                  <p className="mt-1 text-sm text-red-600">
                    <i className="fas fa-times mr-1"></i>
                    {validationErrors.enrollment_no}
                  </p>
                )}
                {formData.enrollment_no && !validationErrors.enrollment_no && /^\d{2}[A-Z]{2,4}\d{5}$/.test(formData.enrollment_no) && (
                  <p className="mt-1 text-sm text-green-600">
                    <i className="fas fa-check mr-1"></i>
                    Valid format
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                  Email Address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="Enter your email address"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    validationErrors.email ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                  }`}
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                {validationErrors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    <i className="fas fa-times mr-1"></i>
                    {validationErrors.email}
                  </p>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label htmlFor="mobile_no" className="block text-sm font-semibold text-gray-800 mb-2">
                  Mobile Number *
                </label>
                <input
                  id="mobile_no"
                  name="mobile_no"
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    validationErrors.mobile_no ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                  }`}
                  value={formData.mobile_no}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                {validationErrors.mobile_no && (
                  <p className="mt-1 text-sm text-red-600">
                    <i className="fas fa-times mr-1"></i>
                    {validationErrors.mobile_no}
                  </p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="gender" className="block text-sm font-semibold text-gray-800 mb-2">
                  Gender *
                </label>
                <select
                  id="gender"
                  name="gender"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  value={formData.gender}
                  onChange={handleChange}
                  disabled={isLoading}
                >
                  <option value="">Select your gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="date_of_birth" className="block text-sm font-semibold text-gray-800 mb-2">
                  Date of Birth *
                </label>
                <input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    validationErrors.date_of_birth ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                  }`}
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                {validationErrors.date_of_birth && (
                  <p className="mt-1 text-sm text-red-600">
                    <i className="fas fa-times mr-1"></i>
                    {validationErrors.date_of_birth}
                  </p>
                )}
              </div>
            </div>

            {/* Security Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                <i className="fas fa-shield-alt mr-2 text-green-600"></i>
                Security Information
              </h3>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword.password ? "text" : "password"}
                    required
                    placeholder="Create a strong password"
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => togglePassword('password')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <i className={`fas ${showPassword.password ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                
                {/* Password Requirements */}
                <div className="mt-2 space-y-1">
                  <div className={`text-sm flex items-center ${passwordStrength.length ? 'text-green-600' : 'text-red-400'}`}>
                    <i className={`fas ${passwordStrength.length ? 'fa-check' : 'fa-times'} mr-2`}></i>
                    At least 6 characters
                  </div>
                  <div className={`text-sm flex items-center ${passwordStrength.specialChar ? 'text-green-600' : 'text-red-400'}`}>
                    <i className={`fas ${passwordStrength.specialChar ? 'fa-check' : 'fa-times'} mr-2`}></i>
                    At least one special character (!@#$%^&*)
                  </div>
                  <div className={`text-sm flex items-center ${passwordStrength.number ? 'text-green-600' : 'text-red-400'}`}>
                    <i className={`fas ${passwordStrength.number ? 'fa-check' : 'fa-times'} mr-2`}></i>
                    At least one number
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm_password" className="block text-sm font-semibold text-gray-800 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type={showPassword.confirm_password ? "text" : "password"}
                    required
                    placeholder="Re-enter your password"
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      validationErrors.confirm_password ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
                    }`}
                    value={formData.confirm_password}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => togglePassword('confirm_password')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <i className={`fas ${showPassword.confirm_password ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                
                {formData.confirm_password && (
                  <div className="mt-2">
                    {validationErrors.confirm_password ? (
                      <p className="text-sm text-red-600">
                        <i className="fas fa-times mr-2"></i>
                        {validationErrors.confirm_password}
                      </p>
                    ) : formData.password === formData.confirm_password && formData.confirm_password ? (
                      <p className="text-sm text-green-600">
                        <i className="fas fa-check mr-2"></i>
                        Passwords match!
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">Re-enter your password to confirm</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-lg shadow-sm text-lg font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus mr-2"></i>
                  Create Student Account
                </>
              )}
            </button>
          </form>
        </div>
        
        {/* Login Link */}
        <div className="text-center">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <p className="text-gray-600 mb-4">Already have an account?</p>
            <Link
              to="/auth/login"
              className="inline-flex items-center px-6 py-3 border-2 border-green-200 text-green-700 bg-green-50 rounded-lg text-sm font-semibold hover:bg-green-100 hover:border-green-300 transition-all duration-200"
            >
              <i className="fas fa-sign-in-alt mr-2"></i>
              Sign In to Student Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
