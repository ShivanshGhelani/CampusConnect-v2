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

// Role options for the dropdown
const ROLE_OPTIONS = [
  { 
    value: 'student', 
    label: 'Student',
    icon: <i className="fas fa-user-graduate"></i>,
    description: 'Register as a student to access events and opportunities'
  },
  { 
    value: 'faculty', 
    label: 'Faculty',
    icon: <i className="fas fa-chalkboard-teacher"></i>,
    description: 'Register as faculty to manage and participate in events'
  }
];

function RegisterPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [userRole, setUserRole] = useState(''); // Changed from activeTab to userRole
  const [currentStep, setCurrentStep] = useState(1); // Step tracking: 1, 2, 3
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
      const redirectPath = userRole === 'faculty' ? '/faculty/profile' : '/client/dashboard';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, userRole]);

  // Check URL for tab parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'faculty') {
      setUserRole('faculty');
    } else if (tabParam === 'student') {
      setUserRole('student');
    }
  }, [location.search]);

  const handleRoleChange = (role) => {
    setUserRole(role);
    setCurrentStep(1); // Reset to step 1 when role changes
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

  // Step navigation functions
  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Validation for current step
  const validateCurrentStep = () => {
    const errors = [];
    
    if (currentStep === 1) {
      // Step 1: Personal Information
      const requiredFields = userRole === 'student' 
        ? ['full_name', 'enrollment_no', 'email', 'mobile_no']
        : ['full_name', 'employee_id', 'email', 'contact_no'];
      
      requiredFields.forEach(field => {
        if (!formData[field]?.trim()) {
          errors.push(`${field.replace('_', ' ')} is required`);
        }
      });
    } else if (currentStep === 2) {
      // Step 2: Academic/Professional Information
      if (userRole === 'student') {
        if (!formData.department) errors.push('Department is required');
        if (!formData.semester) errors.push('Semester is required');
      } else {
        if (!formData.department) errors.push('Department is required');
        if (!formData.designation) errors.push('Designation is required');
      }
    } else if (currentStep === 3) {
      // Step 3: Password
      const passwordField = userRole === 'student' ? 'password' : 'faculty_password';
      const confirmField = userRole === 'student' ? 'confirm_password' : 'faculty_confirm_password';
      
      if (!formData[passwordField]) errors.push('Password is required');
      if (!formData[confirmField]) errors.push('Confirm password is required');
      if (formData[passwordField] !== formData[confirmField]) {
        errors.push('Passwords do not match');
      }
      if (!passwordStrength.length || !passwordStrength.specialChar || !passwordStrength.number) {
        errors.push('Password must meet all requirements');
      }
    }

    if (errors.length > 0) {
      setValidationErrors({ step: errors.join(', ') });
      return false;
    }
    
    setValidationErrors({});
    return true;
  };

  // Get step titles and descriptions
  const getStepInfo = (step) => {
    const stepInfo = {
      1: {
        title: 'Personal Information',
        description: 'Tell us about yourself',
        icon: 'fas fa-user'
      },
      2: {
        title: userRole === 'student' ? 'Academic Details' : 'Professional Details',
        description: userRole === 'student' ? 'Your academic information' : 'Your professional information',
        icon: userRole === 'student' ? 'fas fa-graduation-cap' : 'fas fa-briefcase'
      },
      3: {
        title: 'Security',
        description: 'Create your password',
        icon: 'fas fa-shield-alt'
      }
    };
    return stepInfo[step];
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
    if (userRole === 'student') {
      if (name === 'confirm_password' || name === 'password') {
        const password = name === 'password' ? processedValue : formData.password;
        const confirmPassword = name === 'confirm_password' ? processedValue : formData.confirm_password;
        validatePasswordMatch(password, confirmPassword);
      }
    } else if (userRole === 'faculty') {
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
        const response = await authAPI.validateField(fieldName, fieldValue, userRole);
        

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
    [userRole]
  );

  // Debounce the validation to avoid too many API calls
  const debouncedValidation = useCallback(
    (() => {
      const timers = {};
      return (fieldName, fieldValue) => {
        console.log(`🔄 Debouncing validation for ${fieldName}:`, fieldValue);
        clearTimeout(timers[fieldName]);
        
        // Define fields that need API validation with longer debounce
        const apiValidationFields = ['email', 'mobile_no', 'contact_no', 'enrollment_no', 'employee_id'];
        const debounceTime = apiValidationFields.includes(fieldName) ? 1500 : 800; // 1.5s for API fields, 800ms for others
        
        // Check minimum length before making API calls to avoid unnecessary requests
        const shouldValidate = () => {
          if (!fieldValue || fieldValue.trim().length === 0) return false;
          if (fieldName === 'email' && fieldValue.length < 5) return false;
          if ((fieldName === 'mobile_no' || fieldName === 'contact_no') && fieldValue.length < 7) return false;
          if ((fieldName === 'enrollment_no' || fieldName === 'employee_id') && fieldValue.length < 3) return false;
          return true;
        };
        
        timers[fieldName] = setTimeout(() => {
          if (shouldValidate()) {
            console.log(`✅ Triggering validation for ${fieldName} after ${debounceTime}ms delay`);
            validateFieldRealTime(fieldName, fieldValue);
          } else {
            console.log(`⏭️ Skipping validation for ${fieldName} - insufficient length`);
          }
        }, debounceTime);
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

    if (userRole === 'student') {
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
    } else if (userRole === 'faculty') {
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
    if (userRole === 'student') {
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
    } else if (userRole === 'faculty') {
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
      const redirectPath = userRole === 'faculty' ? '/faculty/profile' : '/client/dashboard';
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
            <div className={`h-20 w-20 flex items-center justify-center rounded-full shadow-lg ${
              userRole === 'faculty'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600'
                : userRole === 'student'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600'
              }`}>
              <i className={`${
                userRole === 'faculty' 
                  ? 'fas fa-chalkboard-teacher' 
                  : userRole === 'student'
                  ? 'fas fa-user-graduate'
                  : 'fas fa-users'
                } text-white text-3xl`}></i>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Join CampusConnect</h1>
          <p className="text-lg text-gray-600">
            {userRole === 'faculty'
              ? 'Create your faculty account to manage and participate in events'
              : userRole === 'student'
              ? 'Create your student account to access events and opportunities'
              : 'Select your role below to get started with your registration'
            }
          </p>
        </div>

        {/* Role Selection Dropdown */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <Dropdown
            label="Who are you?"
            placeholder="Select your role to continue"
            options={ROLE_OPTIONS}
            value={userRole}
            onChange={handleRoleChange}
            required={true}
            size="lg"
            icon={<i className="fas fa-user-shield text-purple-500"></i>}
            clearable={false}
            className="w-full"
          />
          {!userRole && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 flex items-center">
                <i className="fas fa-info-circle mr-2"></i>
                Please select your role to begin the registration process
              </p>
            </div>
          )}
        </div>

        {/* Registration Form - Only show when role is selected */}
        {userRole && (
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Step Progress Indicator */}
            <div className="bg-gray-50 px-8 py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                {[1, 2, 3].map((step) => {
                  const stepInfo = getStepInfo(step);
                  const isActive = currentStep === step;
                  const isCompleted = currentStep > step;
                  
                  return (
                    <div key={step} className="flex items-center flex-1">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                        isCompleted
                          ? `${userRole === 'faculty' ? 'bg-blue-600 border-blue-600' : 'bg-green-600 border-green-600'} text-white`
                          : isActive
                          ? `${userRole === 'faculty' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-green-600 bg-green-50 text-green-600'}`
                          : 'border-gray-300 bg-white text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <i className="fas fa-check text-sm"></i>
                        ) : (
                          <i className={`${stepInfo.icon} text-sm`}></i>
                        )}
                      </div>
                      <div className="ml-4 flex-1">
                        <p className={`text-sm font-semibold ${
                          isActive ? (userRole === 'faculty' ? 'text-blue-600' : 'text-green-600') : 'text-gray-500'
                        }`}>
                          Step {step}
                        </p>
                        <p className={`text-xs ${isActive ? 'text-gray-700' : 'text-gray-400'}`}>
                          {stepInfo.title}
                        </p>
                      </div>
                      {step < 3 && (
                        <div className={`w-8 h-0.5 mx-4 ${
                          currentStep > step 
                            ? (userRole === 'faculty' ? 'bg-blue-600' : 'bg-green-600')
                            : 'bg-gray-200'
                        }`}></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Content */}
            <div className="p-8">
              {/* Current Step Header */}
              <div className="text-center mb-8">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${
                  userRole === 'faculty' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                } mb-4`}>
                  <i className={`${getStepInfo(currentStep).icon} text-2xl`}></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {getStepInfo(currentStep).title}
                </h2>
                <p className="text-gray-600">
                  {getStepInfo(currentStep).description}
                </p>
              </div>

              {/* Error Messages */}
              {(error || validationErrors.step) && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-4 rounded-r-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <i className="fas fa-exclamation-triangle text-red-400"></i>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm">{error || validationErrors.step}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Steps */}
              <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
                {/* Step 1: Personal Information */}
                {currentStep === 1 && (
                  <div className="space-y-6">
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
                        size="lg"
                      />

                      <TextInput
                        id={userRole === 'student' ? 'enrollment_no' : 'employee_id'}
                        name={userRole === 'student' ? 'enrollment_no' : 'employee_id'}
                        type="text"
                        required
                        placeholder={userRole === 'student' ? 'e.g., 21BECE40015' : 'e.g., EMP001'}
                        label={userRole === 'student' ? 'Enrollment Number' : 'Employee ID'}
                        value={userRole === 'student' ? formData.enrollment_no : formData.employee_id}
                        onChange={handleChange}
                        disabled={isLoading}
                        loading={validationLoading[userRole === 'student' ? 'enrollment_no' : 'employee_id']}
                        error={!!validationErrors[userRole === 'student' ? 'enrollment_no' : 'employee_id'] || 
                               fieldValidation[userRole === 'student' ? 'enrollment_no' : 'employee_id']?.available === false}
                        success={fieldValidation[userRole === 'student' ? 'enrollment_no' : 'employee_id']?.available === true}
                        helperText={
                          validationErrors[userRole === 'student' ? 'enrollment_no' : 'employee_id'] ||
                          (fieldValidation[userRole === 'student' ? 'enrollment_no' : 'employee_id']?.available === false
                            ? fieldValidation[userRole === 'student' ? 'enrollment_no' : 'employee_id']?.message || 'Already registered'
                            : fieldValidation[userRole === 'student' ? 'enrollment_no' : 'employee_id']?.available === true
                            ? 'Available'
                            : '')
                        }
                        size="lg"
                      />
                    </div>

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
                          validationErrors.email ||
                          (fieldValidation.email?.available === true ? 'Email is available' : '')
                        }
                        size="lg"
                      />

                      <TextInput
                        id={userRole === 'student' ? 'mobile_no' : 'contact_no'}
                        name={userRole === 'student' ? 'mobile_no' : 'contact_no'}
                        type="tel"
                        required
                        placeholder="10-digit mobile number"
                        label={userRole === 'student' ? 'Mobile Number' : 'Contact Number'}
                        value={userRole === 'student' ? formData.mobile_no : formData.contact_no}
                        onChange={handleChange}
                        disabled={isLoading}
                        loading={validationLoading[userRole === 'student' ? 'mobile_no' : 'contact_no']}
                        error={!!validationErrors[userRole === 'student' ? 'mobile_no' : 'contact_no'] || 
                               fieldValidation[userRole === 'student' ? 'mobile_no' : 'contact_no']?.available === false}
                        success={fieldValidation[userRole === 'student' ? 'mobile_no' : 'contact_no']?.available === true}
                        helperText={
                          validationErrors[userRole === 'student' ? 'mobile_no' : 'contact_no'] ||
                          (fieldValidation[userRole === 'student' ? 'mobile_no' : 'contact_no']?.available === false
                            ? fieldValidation[userRole === 'student' ? 'mobile_no' : 'contact_no']?.message || 'Already registered'
                            : fieldValidation[userRole === 'student' ? 'mobile_no' : 'contact_no']?.available === true
                            ? 'Number is available'
                            : '')
                        }
                        size="lg"
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Academic/Professional Information */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    {userRole === 'student' ? (
                      // Student Academic Information
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          size="lg"
                        />

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
                          size="lg"
                        />
                      </div>
                    ) : (
                      // Faculty Professional Information
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Dropdown
                          label="Department"
                          placeholder="Select your department"
                          options={dropdownOptionsService.getOptions('faculty', 'departments')}
                          value={formData.department}
                          onChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                          required={true}
                          disabled={isLoading}
                          searchable={true}
                          error={!!validationErrors.department}
                          helperText={validationErrors.department}
                          size="lg"
                        />

                        <Dropdown
                          label="Designation"
                          placeholder="Select your designation"
                          options={dropdownOptionsService.getOptions('faculty', 'designations')}
                          value={formData.designation}
                          onChange={(value) => setFormData(prev => ({ ...prev, designation: value }))}
                          required={true}
                          disabled={isLoading}
                          searchable={true}
                          error={!!validationErrors.designation}
                          helperText={validationErrors.designation}
                          size="lg"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Password */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Password *
                        </label>
                        <div className="relative">
                          <input
                            name={userRole === 'student' ? 'password' : 'faculty_password'}
                            type={showPassword[userRole === 'student' ? 'password' : 'faculty_password'] ? "text" : "password"}
                            required
                            placeholder="Create a strong password"
                            className={`w-full px-4 py-4 pr-12 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                              userRole === 'faculty' ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500' : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                            }`}
                            value={userRole === 'student' ? formData.password : formData.faculty_password}
                            onChange={handleChange}
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => togglePassword(userRole === 'student' ? 'password' : 'faculty_password')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                          >
                            <i className={`fas ${showPassword[userRole === 'student' ? 'password' : 'faculty_password'] ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          </button>
                        </div>

                        {/* Password Strength Indicator */}
                        {(userRole === 'student' ? formData.password : formData.faculty_password) && (
                          <div className="mt-3 space-y-2">
                            <div className={`flex items-center text-sm ${passwordStrength.length ? 'text-green-600' : 'text-gray-400'}`}>
                              <i className={`fas ${passwordStrength.length ? 'fa-check-circle' : 'fa-circle'} mr-2`}></i>
                              At least 6 characters
                            </div>
                            <div className={`flex items-center text-sm ${passwordStrength.specialChar ? 'text-green-600' : 'text-gray-400'}`}>
                              <i className={`fas ${passwordStrength.specialChar ? 'fa-check-circle' : 'fa-circle'} mr-2`}></i>
                              Special character (!@#$%^&*)
                            </div>
                            <div className={`flex items-center text-sm ${passwordStrength.number ? 'text-green-600' : 'text-gray-400'}`}>
                              <i className={`fas ${passwordStrength.number ? 'fa-check-circle' : 'fa-circle'} mr-2`}></i>
                              At least one number
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Confirm Password *
                        </label>
                        <div className="relative">
                          <input
                            name={userRole === 'student' ? 'confirm_password' : 'faculty_confirm_password'}
                            type={showPassword[userRole === 'student' ? 'confirm_password' : 'faculty_confirm_password'] ? "text" : "password"}
                            required
                            placeholder="Re-enter your password"
                            className={`w-full px-4 py-4 pr-12 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                              validationErrors[userRole === 'student' ? 'confirm_password' : 'faculty_confirm_password'] 
                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                : userRole === 'faculty' 
                                ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500' 
                                : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                            }`}
                            value={userRole === 'student' ? formData.confirm_password : formData.faculty_confirm_password}
                            onChange={handleChange}
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => togglePassword(userRole === 'student' ? 'confirm_password' : 'faculty_confirm_password')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                          >
                            <i className={`fas ${showPassword[userRole === 'student' ? 'confirm_password' : 'faculty_confirm_password'] ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          </button>
                        </div>
                        
                        {/* Password Match Indicator */}
                        {(userRole === 'student' ? formData.confirm_password : formData.faculty_confirm_password) && (
                          <div className="mt-3">
                            {(userRole === 'student' ? formData.password : formData.faculty_password) !== (userRole === 'student' ? formData.confirm_password : formData.faculty_confirm_password) ? (
                              <p className="text-sm text-red-600 flex items-center">
                                <i className="fas fa-times mr-2"></i>
                                Passwords do not match
                              </p>
                            ) : (
                              <p className="text-sm text-green-600 flex items-center">
                                <i className="fas fa-check mr-2"></i>
                                Passwords match!
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                      currentStep === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <i className="fas fa-arrow-left mr-2"></i>
                    Previous
                  </button>

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className={`px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
                        userRole === 'faculty'
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                          : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                      }`}
                    >
                      Next Step
                      <i className="fas fa-arrow-right ml-2"></i>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                        userRole === 'faculty'
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                          : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-user-plus mr-2"></i>
                          Create {userRole === 'faculty' ? 'Faculty' : 'Student'} Account
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Login Link */}
        <div className="text-center">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <p className="text-gray-600 mb-4">Already have an account?</p>
            <Link
              to={`/auth/login?tab=${userRole}`}
              className={`inline-flex items-center px-6 py-3 border-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                userRole === 'faculty'
                  ? 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-300'
                  : userRole === 'student'
                  ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-300'
                  : 'border-gray-200 text-gray-700 bg-gray-50 hover:bg-gray-100 hover:border-gray-300'
                }`}
            >
              <i className="fas fa-sign-in-alt mr-2"></i>
              {userRole === 'faculty' 
                ? 'Sign In to Faculty Portal' 
                : userRole === 'student'
                ? 'Sign In to Student Portal'
                : 'Sign In'
              }
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
