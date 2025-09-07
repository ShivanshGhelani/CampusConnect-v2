import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast, ToastContainer } from '../../components/ui/Alert';
// Phase 1 Integration: Enhanced Validation
import { validators } from '../../utils/validators';
import Dropdown from '../../components/ui/Dropdown';
import TextInput from '../../components/ui/TextInput';
import dropdownOptionsService from '../../services/dropdownOptionsService';

// Hardcoded options for genders and semesters
const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' }
];

const SEMESTER_OPTIONS = [
  { value: 1, label: 'Semester 1' },
  { value: 2, label: 'Semester 2' },
  { value: 3, label: 'Semester 3' },
  { value: 4, label: 'Semester 4' },
  { value: 5, label: 'Semester 5' },
  { value: 6, label: 'Semester 6' },
  { value: 7, label: 'Semester 7' },
  { value: 8, label: 'Semester 8' }
];

function RegisterPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('student');
  const [formData, setFormData] = useState({
    // Student form data
    full_name: '',
    enrollment_no: '',
    email: '',
    mobile_no: '',
    gender: '',
    date_of_birth: '',
    department: '',
    semester: '',
    password: '',
    confirm_password: '',
    // Faculty form data
    employee_id: '',
    contact_no: '',
    seating: '',
    designation: '',
    qualification: '',
    specialization: '',
    experience_years: '',
    date_of_joining: '',
    address: '',
    faculty_password: '',
    faculty_confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirm_password: false,
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [fieldValidation, setFieldValidation] = useState({}); // For real-time field validation
  const [validationLoading, setValidationLoading] = useState({}); // Loading states for fields
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    specialChar: false,
    number: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { register, error, clearError, isAuthenticated } = useAuth();
  const { addToast, toasts, removeToast } = useToast();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const redirectPath = activeTab === 'faculty' ? '/faculty/profile' : '/client/dashboard';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, activeTab]);

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
    clearError();
    setValidationErrors({});
    setFormData({
      // Student form data
      full_name: '',
      enrollment_no: '',
      email: '',
      mobile_no: '',
      gender: '',
      date_of_birth: '',
      department: '',
      semester: '',
      password: '',
      confirm_password: '',
      // Faculty form data
      employee_id: '',
      contact_no: '',
      seating: '',
      designation: '',
      qualification: '',
      specialization: '',
      experience_years: '',
      date_of_joining: '',
      faculty_password: '',
      faculty_confirm_password: '',
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    let processedValue = value;

    // Auto-format specific fields
    if (name === 'enrollment_no') {
      processedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    } else if (name === 'mobile_no' || name === 'contact_no') {
      processedValue = value.replace(/[^0-9]/g, '').slice(0, 10);
    } else if (name === 'email') {
      processedValue = value.toLowerCase();
    } else if (name === 'employee_id') {
      processedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    } else if (name === 'experience_years') {
      processedValue = value.replace(/[^0-9]/g, '').slice(0, 2);
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

    // Real-time validation
    validateField(name, processedValue);

    // Trigger real-time database validation for specific fields
    const fieldsToValidateRealTime = ['email', 'mobile_no', 'contact_no', 'enrollment_no', 'employee_id'];
    if (fieldsToValidateRealTime.includes(name) && processedValue.length >= 3) {
      
      debouncedValidation(name, processedValue);
    }

    // Password strength check
    if (name === 'password' || name === 'faculty_password') {
      checkPasswordStrength(processedValue);
    }

    // Password match check
    if (activeTab === 'student') {
      if (name === 'confirm_password' || name === 'password') {
        const password = name === 'password' ? processedValue : formData.password;
        const confirmPassword = name === 'confirm_password' ? processedValue : formData.confirm_password;
        validatePasswordMatch(password, confirmPassword);
      }
    } else if (activeTab === 'faculty') {
      if (name === 'faculty_confirm_password' || name === 'faculty_password') {
        const password = name === 'faculty_password' ? processedValue : formData.faculty_password;
        const confirmPassword = name === 'faculty_confirm_password' ? processedValue : formData.faculty_confirm_password;
        validatePasswordMatch(password, confirmPassword, 'faculty');
      }
    }
  };
  // Phase 1 Integration: Enhanced validation using centralized validators
  const validateField = (name, value) => {
    let error = '';

    if (!value || !value.trim()) {
      return error; // Don't validate empty fields for real-time validation
    }

    switch (name) {
      case 'enrollment_no': {
        if (!validators.enrollmentNumber(value)) {
          error = 'Invalid enrollment number format (e.g., 21BECE40015)';
        }
        break;
      }
      case 'employee_id': {
        if (!validators.facultyId(value)) {
          error = 'Faculty ID must be 6-12 alphanumeric characters';
        }
        break;
      }
      case 'email': {
        if (!validators.email(value)) {
          error = 'Please enter a valid email address';
        }
        break;
      }
      case 'mobile_no':
      case 'contact_no': {
        if (!validators.mobileNumber(value)) {
          error = 'Mobile number must be exactly 10 digits';
        }
        if (!validators.mobileNumber(value)) {
          error = 'Mobile number must be exactly 10 digits';
        }
        break;
      }
      case 'date_of_birth':
        if (value) {
          const birthDate = new Date(value);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();

          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }

          if (age < 16) {
            error = 'Must be at least 16 years old';
          } else if (age > 100) {
            error = 'Please enter a valid birth date';
          }
        }
        break;
      case 'department':
        if (!value) {
          error = 'Please select your department';
        }
        break;
      case 'designation':
        if (!value) {
          error = 'Please select your designation';
        }
        break;
      case 'qualification':
        if (!value) {
          error = 'Please select your qualification';
        }
        break;
      case 'experience_years':
        if (value && (isNaN(value) || value < 0 || value > 50)) {
          error = 'Experience must be between 0-50 years';
        }
        break;
      case 'semester':
        if (value && (isNaN(value) || value < 1 || value > 8)) {
          error = 'Semester must be between 1-8';
        }
        break;
      default:
        break;
    }

    setValidationErrors(prev => ({
      ...prev,
      [name]: error
    }));

    return error;
  };

  const checkPasswordStrength = (password) => {
    setPasswordStrength({
      length: password.length >= 6,
      specialChar: /[!@#$%^&*]/.test(password),
      number: /\d/.test(password),
    });
  };

  // Debounced real-time field validation for database checks
  const validateFieldRealTime = useCallback(
    async (fieldName, fieldValue) => {
      

      // Only validate specific fields that need database checks
      const fieldsToValidate = ['email', 'mobile_no', 'contact_no', 'enrollment_no', 'employee_id'];
      if (!fieldsToValidate.includes(fieldName) || !fieldValue || fieldValue.length < 3) {
        
        return;
      }

      
      setValidationLoading(prev => ({ ...prev, [fieldName]: true }));

      try {
        const response = await authAPI.validateField(fieldName, fieldValue, activeTab);
        

        if (response.data.success) {
          setFieldValidation(prev => ({
            ...prev,
            [fieldName]: {
              available: response.data.available,
              message: response.data.message
            }
          }));

          // Update validation errors with the real-time check
          if (!response.data.available) {
            setValidationErrors(prev => ({
              ...prev,
              [fieldName]: response.data.message
            }));
          } else {
            // Clear the error if field is available and no other validation errors
            setValidationErrors(prev => {
              const newErrors = { ...prev };
              if (newErrors[fieldName] === response.data.message ||
                newErrors[fieldName]?.includes('already registered')) {
                delete newErrors[fieldName];
              }
              return newErrors;
            });
          }
        }
      } catch (error) {
        
        // Don't show errors for network issues during real-time validation
      } finally {
        setValidationLoading(prev => ({ ...prev, [fieldName]: false }));
      }
    },
    [activeTab]
  );

  // Debounce the validation to avoid too many API calls
  const debouncedValidation = useCallback(
    (() => {
      const timers = {};
      return (fieldName, fieldValue) => {
        
        clearTimeout(timers[fieldName]);
        timers[fieldName] = setTimeout(() => {
          
          validateFieldRealTime(fieldName, fieldValue);
        }, 800); // Wait 800ms after user stops typing
      };
    })(),
    [validateFieldRealTime]
  );

  const validatePasswordMatch = (password, confirmPassword, userType = 'student') => {
    const confirmField = userType === 'faculty' ? 'faculty_confirm_password' : 'confirm_password';

    if (confirmPassword && password !== confirmPassword) {
      setValidationErrors(prev => ({
        ...prev,
        [confirmField]: 'Passwords do not match'
      }));
    } else if (confirmPassword && password === confirmPassword) {
      setValidationErrors(prev => ({
        ...prev,
        [confirmField]: ''
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

    if (activeTab === 'student') {
      // Required fields for student
      const requiredFields = [
        'full_name', 'enrollment_no', 'email', 'mobile_no',
        'gender', 'date_of_birth', 'department', 'semester', 'password'
      ];

      requiredFields.forEach(key => {
        if (!formData[key]) {
          const fieldName = key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
          errors.push(`${fieldName} is required`);
        }
      });

      // Password validation for student
      if (formData.password !== formData.confirm_password) {
        errors.push('Passwords do not match');
      }
    } else if (activeTab === 'faculty') {
      // Required fields for faculty
      const requiredFields = [
        'employee_id', 'full_name', 'email', 'contact_no',
        'gender', 'date_of_birth', 'department', 'designation',
        'qualification', 'experience_years', 'faculty_password'
      ];

      requiredFields.forEach(key => {
        if (!formData[key]) {
          const fieldName = key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
          errors.push(`${fieldName} is required`);
        }
      });

      // Password validation for faculty
      if (formData.faculty_password !== formData.faculty_confirm_password) {
        errors.push('Passwords do not match');
      }
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

    let result;
    if (activeTab === 'student') {
      // Remove confirm_password from submission data and format for API
      const {
        confirm_password,
        employee_id, contact_no, seating, faculty_password, faculty_confirm_password,
        ...submitData
      } = formData;

      // Convert semester to integer
      const registrationData = {
        ...submitData,
        semester: parseInt(submitData.semester, 10)
      };

      result = await register(registrationData, 'student');
    } else if (activeTab === 'faculty') {
      // Remove confirm_password and student fields from submission data
      const {
        faculty_confirm_password,
        enrollment_no, mobile_no, semester, password, confirm_password,
        ...submitData
      } = formData;

      // Map faculty fields to API format
      const registrationData = {
        employee_id: submitData.employee_id,
        full_name: submitData.full_name,
        email: submitData.email,
        contact_no: submitData.contact_no,
        department: submitData.department,
        designation: submitData.designation,
        qualification: submitData.qualification,
        specialization: submitData.specialization || '',
        experience_years: parseInt(submitData.experience_years, 10),
        seating: submitData.seating || '',
        gender: submitData.gender,
        date_of_birth: submitData.date_of_birth,
        date_of_joining: submitData.date_of_joining || '',
        password: submitData.faculty_password
      };

      result = await register(registrationData, 'faculty');
    }

    if (result.success) {
      const redirectPath = activeTab === 'faculty' ? '/faculty/profile' : '/client/dashboard';
      navigate(redirectPath, { replace: true });
      addToast({
        type: 'success',
        title: 'Registration Successful!',
        message: 'Welcome to CampusConnect. You have been automatically logged in.',
        duration: 5000
      });
    } else {
      // Don't clear form data on error - let user fix the issue
      
      addToast({
        type: 'error',
        title: 'Registration Failed',
        message: result.error || 'Please check your information and try again.',
        duration: 8000
      });
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
          <div className="flex items-center justify-center mb-6">
            <div className={`h-20 w-20 flex items-center justify-center rounded-full shadow-lg ${activeTab === 'faculty'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600'
              : 'bg-gradient-to-r from-green-600 to-emerald-600'
              }`}>
              <i className={`${activeTab === 'faculty' ? 'fas fa-chalkboard-teacher' : 'fas fa-user-plus'
                } text-white text-3xl`}></i>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Join CampusConnect</h1>
          <p className="text-lg text-gray-600">
            {activeTab === 'faculty'
              ? 'Create your faculty account to manage and participate in events'
              : 'Create your student account to access events and opportunities'
            }
          </p>
        </div>

        {/* Registration Type Selector */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-2">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => handleTabSwitch('student')}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md text-sm font-semibold transition-all duration-200 ${activeTab === 'student'
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              <i className="fas fa-user-graduate mr-2"></i>
              Student Registration
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('faculty')}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md text-sm font-semibold transition-all duration-200 ${activeTab === 'faculty'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              <i className="fas fa-chalkboard-teacher mr-2"></i>
              Faculty Registration
            </button>
          </div>
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

          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            {activeTab === 'student' ? (
              <>
                {/* Student Registration Form */}
                {/* Personal Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                    <i className="fas fa-user mr-2 text-green-600"></i>
                    Personal Information
                  </h3>              {/* Full Name and Enrollment Number Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TextInput
                      id="full_name"
                      name="full_name"
                      type="text"
                      required
                      placeholder="Enter your full name"
                      label="Full Name"
                      value={formData.full_name}
                      onChange={handleChange}
                      disabled={isLoading}
                    />

                    <TextInput
                      id="enrollment_no"
                      name="enrollment_no"
                      type="text"
                      required
                      placeholder="e.g., 21BECE40015"
                      label="Enrollment Number"
                      value={formData.enrollment_no}
                      onChange={handleChange}
                      disabled={isLoading}
                      loading={validationLoading.enrollment_no}
                      error={!!validationErrors.enrollment_no || fieldValidation.enrollment_no?.available === false}
                      success={fieldValidation.enrollment_no?.available === true}
                      helperText={
                        validationErrors.enrollment_no
                          ? validationErrors.enrollment_no
                          : fieldValidation.enrollment_no?.available === false
                            ? fieldValidation.enrollment_no?.message || 'This enrollment number is already registered'
                            : fieldValidation.enrollment_no?.available === true
                              ? 'Enrollment number is available'
                              : !validationErrors.enrollment_no && !validationLoading.enrollment_no && formData.enrollment_no && !fieldValidation.enrollment_no && /^\d{2}[A-Z]{2,4}\d{5}$/.test(formData.enrollment_no)
                                ? 'Valid format'
                                : ''
                      }
                    />
                  </div>              {/* Email and Mobile Number Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TextInput
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="Enter your email address"
                      label="Email Address"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={isLoading}
                      loading={validationLoading.email}
                      error={!!validationErrors.email || fieldValidation.email?.available === false}
                      success={fieldValidation.email?.available === true}
                      helperText={
                        validationErrors.email
                          ? validationErrors.email
                          : fieldValidation.email?.available === true
                            ? 'Email is available'
                            : ''
                      }
                    />

                    <TextInput
                      id="mobile_no"
                      name="mobile_no"
                      type="tel"
                      required
                      placeholder="10-digit mobile number"
                      label="Mobile Number"
                      value={formData.mobile_no}
                      onChange={handleChange}
                      disabled={isLoading}
                      loading={validationLoading.mobile_no}
                      error={!!validationErrors.mobile_no || fieldValidation.mobile_no?.available === false}
                      success={fieldValidation.mobile_no?.available === true}
                      helperText={
                        validationErrors.mobile_no
                          ? validationErrors.mobile_no
                          : fieldValidation.mobile_no?.available === false
                            ? fieldValidation.mobile_no?.message || 'This mobile number is already registered'
                            : fieldValidation.mobile_no?.available === true
                              ? 'Mobile number is available'
                              : ''
                      }
                    />
                  </div>              {/* Gender and Date of Birth Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Dropdown
                        label="Gender"
                        placeholder="Select your gender"
                        options={GENDER_OPTIONS}
                        value={formData.gender}
                        onChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                        required={true}
                        disabled={isLoading}
                        error={!!validationErrors.gender}
                        helperText={validationErrors.gender}
                      />
                    </div>

                    <TextInput
                      id="date_of_birth"
                      name="date_of_birth"
                      type="date"
                      required
                      label="Date of Birth"
                      value={formData.date_of_birth}
                      onChange={handleChange}
                      disabled={isLoading}
                      error={!!validationErrors.date_of_birth}
                      helperText={validationErrors.date_of_birth}
                    />
                  </div>
                </div>

                {/* Security Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                    <i className="fas fa-shield-alt mr-2 text-green-600"></i>
                    Security Information
                  </h3>              {/* Password and Confirm Password Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
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
                      </div>                  {/* Password Requirements - Only show after user starts typing */}
                      {formData.password && (
                        <div className="mt-2 space-y-1">
                          {!passwordStrength.length && (
                            <div className="text-sm flex items-center text-red-400">
                              <i className="fas fa-times mr-2"></i>
                              At least 6 characters
                            </div>
                          )}
                          {!passwordStrength.specialChar && (
                            <div className="text-sm flex items-center text-red-400">
                              <i className="fas fa-times mr-2"></i>
                              At least one special character (!@#$%^&*)
                            </div>
                          )}
                          {!passwordStrength.number && (
                            <div className="text-sm flex items-center text-red-400">
                              <i className="fas fa-times mr-2"></i>
                              At least one number
                            </div>
                          )}
                          {passwordStrength.length && passwordStrength.specialChar && passwordStrength.number && (
                            <div className="text-sm flex items-center text-green-600">
                              <i className="fas fa-check mr-2"></i>
                              Password meets all requirements
                            </div>
                          )}
                        </div>
                      )}
                    </div>

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
                          className={`w-full px-4 py-3 pr-12 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${validationErrors.confirm_password ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
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
                          {formData.password !== formData.confirm_password ? (
                            <p className="text-sm text-red-600">
                              <i className="fas fa-times mr-2"></i>
                              Passwords do not match
                            </p>
                          ) : (
                            <p className="text-sm text-green-600">
                              <i className="fas fa-check mr-2"></i>
                              Passwords match!
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Academic Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                    <i className="fas fa-graduation-cap mr-2 text-green-600"></i>
                    Academic Information
                  </h3>              {/* Department and Current Semester Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Dropdown
                        label="Department"
                        placeholder="Select your department"
                        options={dropdownOptionsService.getOptions('student', 'departments')}
                        value={formData.department}
                        onChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                        required={true}
                        disabled={isLoading}
                        searchable={true}
                        error={!!validationErrors.department}
                        helperText={validationErrors.department}
                      />
                    </div>

                    <div>
                      <Dropdown
                        label="Current Semester"
                        placeholder="Select your current semester"
                        options={SEMESTER_OPTIONS}
                        value={formData.semester}
                        onChange={(value) => setFormData(prev => ({ ...prev, semester: value }))}
                        required={true}
                        disabled={isLoading}
                        error={!!validationErrors.semester}
                        helperText={validationErrors.semester}
                      />
                    </div>
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
              </>
            ) : (
              <>
                {/* Faculty Registration Form */}
                {/* Personal Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                    <i className="fas fa-chalkboard-teacher mr-2 text-blue-600"></i>
                    Faculty Information
                  </h3>

                  {/* Employee ID and Full Name Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="employee_id" className="block text-sm font-semibold text-gray-800 mb-2">
                        Employee ID *
                      </label>
                      <input
                        id="employee_id"
                        name="employee_id"
                        type="text"
                        required
                        placeholder="e.g., EMP001"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${validationErrors.employee_id
                            ? 'border-red-400 focus:ring-red-500'
                            : fieldValidation.employee_id?.available === false
                              ? 'border-red-400 focus:ring-red-500'
                              : fieldValidation.employee_id?.available === true
                                ? 'border-green-400 focus:ring-green-500'
                                : 'border-gray-200 focus:ring-blue-500'
                          }`}
                        value={formData.employee_id}
                        onChange={handleChange}
                        disabled={isLoading}
                      />
                      {validationLoading.employee_id && (
                        <p className="mt-1 text-sm text-blue-600">
                          <i className="fas fa-spinner fa-spin mr-1"></i>
                          Checking availability...
                        </p>
                      )}
                      {validationErrors.employee_id && (
                        <p className="mt-1 text-sm text-red-600">
                          <i className="fas fa-times mr-1"></i>
                          {validationErrors.employee_id}
                        </p>
                      )}
                      {!validationErrors.employee_id && !validationLoading.employee_id && fieldValidation.employee_id?.available === true && formData.employee_id && (
                        <p className="mt-1 text-sm text-green-600">
                          <i className="fas fa-check mr-1"></i>
                          Employee ID is available
                        </p>
                      )}
                    </div>

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
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${validationErrors.email
                            ? 'border-red-400 focus:ring-red-500'
                            : fieldValidation.email?.available === false
                              ? 'border-red-400 focus:ring-red-500'
                              : fieldValidation.email?.available === true
                                ? 'border-green-400 focus:ring-green-500'
                                : 'border-gray-200 focus:ring-blue-500'
                          }`}
                        value={formData.full_name}
                        onChange={handleChange}
                        disabled={isLoading}
                      />
                      {validationErrors.full_name && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.full_name}</p>
                      )}
                    </div>
                  </div>

                  {/* Email and Contact Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                        Email Address *
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="your.email@example.com"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${validationErrors.email
                            ? 'border-red-400 focus:ring-red-500'
                            : fieldValidation.email?.available === false
                              ? 'border-red-400 focus:ring-red-500'
                              : fieldValidation.email?.available === true
                                ? 'border-green-400 focus:ring-green-500'
                                : 'border-gray-200 focus:ring-blue-500'
                          }`}
                        value={formData.email}
                        onChange={handleChange}
                        disabled={isLoading}
                      />
                      {validationLoading.email && (
                        <p className="mt-1 text-sm text-blue-600">
                          <i className="fas fa-spinner fa-spin mr-1"></i>
                          Checking availability...
                        </p>
                      )}
                      {validationErrors.email && (
                        <p className="mt-1 text-sm text-red-600">
                          <i className="fas fa-times mr-1"></i>
                          {validationErrors.email}
                        </p>
                      )}
                      {!validationErrors.email && !validationLoading.email && fieldValidation.email?.available === true && formData.email && (
                        <p className="mt-1 text-sm text-green-600">
                          <i className="fas fa-check mr-1"></i>
                          Email is available
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="contact_no" className="block text-sm font-semibold text-gray-800 mb-2">
                        Contact Number *
                      </label>
                      <input
                        id="contact_no"
                        name="contact_no"
                        type="tel"
                        required
                        placeholder="1234567890"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${validationErrors.contact_no
                            ? 'border-red-400 focus:ring-red-500'
                            : fieldValidation.contact_no?.available === false
                              ? 'border-red-400 focus:ring-red-500'
                              : fieldValidation.contact_no?.available === true
                                ? 'border-green-400 focus:ring-green-500'
                                : 'border-gray-200 focus:ring-blue-500'
                          }`}
                        value={formData.contact_no}
                        onChange={handleChange}
                        disabled={isLoading}
                      />
                      {validationLoading.contact_no && (
                        <p className="mt-1 text-sm text-blue-600">
                          <i className="fas fa-spinner fa-spin mr-1"></i>
                          Checking availability...
                        </p>
                      )}
                      {validationErrors.contact_no && (
                        <p className="mt-1 text-sm text-red-600">
                          <i className="fas fa-times mr-1"></i>
                          {validationErrors.contact_no}
                        </p>
                      )}
                      {!validationErrors.contact_no && !validationLoading.contact_no && fieldValidation.contact_no?.available === true && formData.contact_no && (
                        <p className="mt-1 text-sm text-green-600">
                          <i className="fas fa-check mr-1"></i>
                          Contact number is available
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Department and Seating Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="department" className="block text-sm font-semibold text-gray-800 mb-2">
                        Department
                      </label>
                      <Dropdown
                        
                        placeholder="Select Department"
                        options={dropdownOptionsService.getOptions('faculty', 'departments')}
                        value={formData.department}
                        onChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                        required={true}
                        disabled={isLoading}
                        searchable={true}
                        error={!!validationErrors.department}
                        helperText={validationErrors.department}
                        className={'mt-2 w-full'}
                      />
                    </div>

                    <div>
                      <label htmlFor="seating" className="block text-sm font-semibold text-gray-800 mb-2">
                        Seating/Room
                      </label>
                      <input
                        id="seating"
                        name="seating"
                        type="text"
                        placeholder="e.g., Room 301, Block A"
                        className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${validationErrors.email
                            ? 'border-red-400 focus:ring-red-500'
                            : fieldValidation.email?.available === false
                              ? 'border-red-400 focus:ring-red-500'
                              : fieldValidation.email?.available === true
                                ? 'border-green-400 focus:ring-green-500'
                                : 'border-gray-200 focus:ring-blue-500'
                          }`}
                        onChange={handleChange}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Designation and Qualification Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="designation" className="block text-sm font-semibold text-gray-800 mb-2">
                        Designation
                      </label>
                      <Dropdown
                        placeholder="Select Designation"
                        options={dropdownOptionsService.getOptions('faculty', 'designations')}
                        value={formData.designation}
                        onChange={(value) => setFormData(prev => ({ ...prev, designation: value }))}
                        required={true}
                        disabled={isLoading}
                        searchable={true}
                        error={!!validationErrors.designation}
                        helperText={validationErrors.designation}
                      />
                    </div>
                    <div>
                      <label htmlFor="highest_qualification" className="block text-sm font-semibold text-gray-800 mb-2">
                        Highest Qualification
                      </label>
                      <Dropdown
                        placeholder="Select Qualification"
                        options={dropdownOptionsService.getOptions('faculty', 'qualifications')}
                        value={formData.qualification}
                        onChange={(value) => setFormData(prev => ({ ...prev, qualification: value }))}
                        required={true}
                        disabled={isLoading}
                        searchable={true}
                        error={!!validationErrors.qualification}
                        helperText={validationErrors.qualification}
                      />
                    </div>
                  </div>

                  {/* Date of Joining Row */}
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label htmlFor="specialization" className="block text-sm font-semibold text-gray-800 mb-2">
                        Specialization/Area of Expertise
                      </label>
                      <input
                        id="specialization"
                        name="specialization"
                        type="text"
                        placeholder="e.g., Machine Learning, Data Structures, etc."
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${validationErrors.email
                            ? 'border-red-400 focus:ring-red-500'
                            : fieldValidation.email?.available === false
                              ? 'border-red-400 focus:ring-red-500'
                              : fieldValidation.email?.available === true
                                ? 'border-green-400 focus:ring-green-500'
                                : 'border-gray-200 focus:ring-blue-500'
                          }`}
                        value={formData.specialization}
                        onChange={handleChange}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Specialization and Experience Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="date_of_joining" className="block text-sm font-semibold text-gray-800 mb-2">
                        Date of Joining
                      </label>
                      <input
                        id="date_of_joining"
                        name="date_of_joining"
                        type="date"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${validationErrors.email
                            ? 'border-red-400 focus:ring-red-500'
                            : fieldValidation.email?.available === false
                              ? 'border-red-400 focus:ring-red-500'
                              : fieldValidation.email?.available === true
                                ? 'border-green-400 focus:ring-green-500'
                                : 'border-gray-200 focus:ring-blue-500'
                          }`}
                        value={formData.date_of_joining}
                        onChange={handleChange}
                        disabled={isLoading}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label htmlFor="experience_years" className="block text-sm font-semibold text-gray-800 mb-2">
                        Years of Experience *
                      </label>
                      <input
                        id="experience_years"
                        name="experience_years"
                        type="number"
                        required
                        min="0"
                        max="50"
                        placeholder="e.g., 5"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${validationErrors.email
                            ? 'border-red-400 focus:ring-red-500'
                            : fieldValidation.email?.available === false
                              ? 'border-red-400 focus:ring-red-500'
                              : fieldValidation.email?.available === true
                                ? 'border-green-400 focus:ring-green-500'
                                : 'border-gray-200 focus:ring-blue-500'
                          }`}
                        value={formData.experience_years}
                        onChange={handleChange}
                        disabled={isLoading}
                      />
                      {validationErrors.experience_years && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.experience_years}</p>
                      )}
                    </div>
                  </div>

                  {/* Gender and Date of Birth Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="gender" className="block text-sm font-semibold text-gray-800 mb-2">
                        Gender
                      </label>
                      <Dropdown

                        placeholder="Select Gender"
                        options={GENDER_OPTIONS}
                        value={formData.gender}
                        onChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                        required={true}
                        disabled={isLoading}
                        error={!!validationErrors.gender}
                        helperText={validationErrors.gender}
                      />
                    </div>

                    <div>
                      <label htmlFor="date_of_birth" className="block text-sm font-semibold text-gray-800 mb-2">
                        Date of Birth *
                      </label>
                      <input
                        id="date_of_birth"
                        name="date_of_birth"
                        type="date"
                        required
                        className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${validationErrors.email
                            ? 'border-red-400 focus:ring-red-500'
                            : fieldValidation.email?.available === false
                              ? 'border-red-400 focus:ring-red-500'
                              : fieldValidation.email?.available === true
                                ? 'border-green-400 focus:ring-green-500'
                                : 'border-gray-200 focus:ring-blue-500'
                          }`}
                        value={formData.date_of_birth}
                        onChange={handleChange}
                        disabled={isLoading}
                        max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                      />
                      {validationErrors.date_of_birth && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.date_of_birth}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Security Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                    <i className="fas fa-shield-alt mr-2 text-blue-600"></i>
                    Security Information
                  </h3>

                  {/* Password and Confirm Password Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="faculty_password" className="block text-sm font-semibold text-gray-800 mb-2">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          id="faculty_password"
                          name="faculty_password"
                          type={showPassword.faculty_password ? "text" : "password"}
                          required
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${validationErrors.email
                            ? 'border-red-400 focus:ring-red-500'
                            : fieldValidation.email?.available === false
                              ? 'border-red-400 focus:ring-red-500'
                              : fieldValidation.email?.available === true
                                ? 'border-green-400 focus:ring-green-500'
                                : 'border-gray-200 focus:ring-blue-500'
                          }`}
                          value={formData.faculty_password}
                          onChange={handleChange}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => togglePassword('faculty_password')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          <i className={`fas ${showPassword.faculty_password ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>

                      {/* Password Strength Indicator */}
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center space-x-1 text-xs">
                          <span className={`flex items-center ${passwordStrength.length ? 'text-green-600' : 'text-gray-400'}`}>
                            <i className={`fas ${passwordStrength.length ? 'fa-check-circle' : 'fa-circle'} mr-1`}></i>
                            At least 6 characters
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs">
                          <span className={`flex items-center ${passwordStrength.specialChar ? 'text-green-600' : 'text-gray-400'}`}>
                            <i className={`fas ${passwordStrength.specialChar ? 'fa-check-circle' : 'fa-circle'} mr-1`}></i>
                            Special character (!@#$%^&*)
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs">
                          <span className={`flex items-center ${passwordStrength.number ? 'text-green-600' : 'text-gray-400'}`}>
                            <i className={`fas ${passwordStrength.number ? 'fa-check-circle' : 'fa-circle'} mr-1`}></i>
                            At least one number
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="faculty_confirm_password" className="block text-sm font-semibold text-gray-800 mb-2">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <input
                          id="faculty_confirm_password"
                          name="faculty_confirm_password"
                          type={showPassword.faculty_confirm_password ? "text" : "password"}
                          required
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${validationErrors.email
                            ? 'border-red-400 focus:ring-red-500'
                            : fieldValidation.email?.available === false
                              ? 'border-red-400 focus:ring-red-500'
                              : fieldValidation.email?.available === true
                                ? 'border-green-400 focus:ring-green-500'
                                : 'border-gray-200 focus:ring-blue-500'
                          }`}
                          value={formData.faculty_confirm_password}
                          onChange={handleChange}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => togglePassword('faculty_confirm_password')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          <i className={`fas ${showPassword.faculty_confirm_password ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                      {validationErrors.faculty_confirm_password && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.faculty_confirm_password}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-lg shadow-sm text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-chalkboard-teacher mr-2"></i>
                      Create Faculty Account
                    </>
                  )}
                </button>
              </>
            )}
          </form>
        </div>

        {/* Login Link */}
        <div className="text-center">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <p className="text-gray-600 mb-4">Already have an account?</p>
            <Link
              to={`/auth/login?tab=${activeTab}`}
              className={`inline-flex items-center px-6 py-3 border-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'faculty'
                  ? 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-300'
                  : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-300'
                }`}
            >
              <i className="fas fa-sign-in-alt mr-2"></i>
              {activeTab === 'faculty' ? 'Sign In to Faculty Portal' : 'Sign In to Student Portal'}
            </Link>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
        position="top-right"
      />
    </div>
  );
}

export default RegisterPage;
