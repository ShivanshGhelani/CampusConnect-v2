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
      const redirectPath = userRole === 'faculty' ? '/faculty/profile' : '/client/profile';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, userRole]);

  // Auto-dismiss error messages after 5 seconds
  useEffect(() => {
    if (error || validationErrors.step) {
      const timer = setTimeout(() => {
        clearError();
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.step;
          return newErrors;
        });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error, validationErrors.step, clearError]);

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
      // Clear errors when moving to next step
      setValidationErrors({});
      clearError();
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    // Clear errors when going back
    setValidationErrors({});
    clearError();
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Validation for current step
  const validateCurrentStep = () => {
    const errors = [];
    
    if (currentStep === 1) {
      // Step 1: Personal Information (Role, Name, Email, Mobile)
      if (!userRole) {
        errors.push('Please select your role');
        return false;
      }
      
      const requiredFields = ['full_name', 'email'];
      const mobileField = userRole === 'student' ? 'mobile_no' : 'contact_no';
      requiredFields.push(mobileField);
      
      requiredFields.forEach(field => {
        if (!formData[field]?.trim()) {
          const fieldName = field === 'contact_no' ? 'contact number' : field.replace('_', ' ');
          errors.push(`${fieldName} is required`);
        }
      });

      // Check if validation is still in progress
      if (validationLoading.email || validationLoading[mobileField]) {
        errors.push('Please wait while we verify your information...');
      }

      // Check validation errors for email and mobile
      if (validationErrors.email && formData.email) {
        errors.push('Please enter a valid email address');
      }
      
      const mobileError = validationErrors[mobileField];
      if (mobileError && formData[mobileField]) {
        errors.push('Please enter a valid mobile number');
      }

      // Check if email/mobile are available (not already registered)
      if (fieldValidation.email?.available === false) {
        errors.push('This email is already registered');
      }
      
      if (fieldValidation[mobileField]?.available === false) {
        errors.push('This mobile number is already registered');
      }

    } else if (currentStep === 2) {
      // Step 2: Academic/Professional Information (Department + Enrollment/Employee ID)
      const idField = userRole === 'student' ? 'enrollment_no' : 'employee_id';
      
      if (!formData[idField]?.trim()) {
        const fieldName = userRole === 'student' ? 'enrollment number' : 'employee ID';
        errors.push(`${fieldName} is required`);
      }

      // Check validation errors for ID
      if (validationErrors[idField] && formData[idField]) {
        errors.push(`Please enter a valid ${userRole === 'student' ? 'enrollment number' : 'employee ID'}`);
      }

      // Check if ID is available (not already registered)
      if (fieldValidation[idField]?.available === false) {
        errors.push(`This ${userRole === 'student' ? 'enrollment number' : 'employee ID'} is already registered`);
      }

      if (userRole === 'student') {
        if (!formData.department) errors.push('Department is required');
        if (!formData.semester) errors.push('Semester is required');
      } else {
        if (!formData.department) errors.push('Department is required');
        if (!formData.designation) errors.push('Designation is required');
        if (!formData.qualification) errors.push('Qualification is required');
        if (!formData.experience_years) errors.push('Experience years is required');
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
        title: 'Who Are You?',
        description: 'Basic personal information',
        icon: 'fas fa-user-circle'
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
    if (name === 'full_name') {
      // Allow only letters, spaces, hyphens, apostrophes, and dots (for names like O'Brien, Mary-Jane, Dr. Smith)
      processedValue = value.replace(/[^a-zA-Z\s'-\.]/g, '');
    } else if (name === 'enrollment_no') {
      // Allow alphanumeric, hyphens, slashes, underscores, and dots (flexible enrollment formats)
      processedValue = value.toUpperCase().replace(/[^A-Z0-9\-\/\_\.]/g, '');
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
    if (fieldsToValidateRealTime.includes(name)) {
      // Clear previous validation state when user starts typing
      if (processedValue.length > 0) {
        setFieldValidation(prev => ({
          ...prev,
          [name]: { available: null, message: '' }
        }));
      }
      
      // Only trigger API validation for sufficient length
      if ((name === 'email' && processedValue.length >= 5) ||
          ((name === 'mobile_no' || name === 'contact_no') && processedValue.length >= 10) ||
          ((name === 'enrollment_no' || name === 'employee_id') && processedValue.length >= 3)) {
        debouncedValidation(name, processedValue);
      }
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
      case 'full_name': {
        // Check if name contains only letters, spaces, hyphens, apostrophes, and dots
        if (!/^[a-zA-Z\s'-\.]+$/.test(value)) {
          error = 'Name should contain only letters and common name characters';
        } else if (value.trim().length < 2) {
          error = 'Name must be at least 2 characters long';
        } else if (value.trim().length > 100) {
          error = 'Name must not exceed 100 characters';
        }
        break;
      }
      case 'enrollment_no': {
        // Flexible validation - just check basic requirements
        if (value.length < 3) {
          error = 'Enrollment number must be at least 3 characters';
        } else if (value.length > 30) {
          error = 'Enrollment number must not exceed 30 characters';
        } else if (!/^[A-Z0-9\-\/\_\.]+$/.test(value)) {
          error = 'Enrollment number can only contain letters, numbers, and separators (- / _ .)';
        }
        break;
      }
      case 'employee_id': {
        if (!validators.facultyId(value)) {
          error = 'Faculty ID must be 3-8 characters (letters, numbers, or both)';
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
        
        // Shorter debounce for email/mobile (Step 1) - faster feedback
        const step1Fields = ['email', 'mobile_no', 'contact_no'];
        const step2Fields = ['enrollment_no', 'employee_id'];
        
        let debounceTime = 800; // Default
        if (step1Fields.includes(fieldName)) {
          debounceTime = 600; // Faster for Step 1 fields
        } else if (step2Fields.includes(fieldName)) {
          debounceTime = 800; // Standard for Step 2
        }
        
        // Check minimum length before making API calls to avoid unnecessary requests
        const shouldValidate = () => {
          if (!fieldValue || fieldValue.trim().length === 0) return false;
          if (fieldName === 'email' && fieldValue.length < 5) return false;
          if ((fieldName === 'mobile_no' || fieldName === 'contact_no') && fieldValue.length < 10) return false;
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
      // Required fields for student (gender and date_of_birth are optional - can be added in profile)
      const requiredFields = [
        'full_name', 'enrollment_no', 'email', 'mobile_no',
        'department', 'semester', 'password'
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
      // Required fields for faculty (gender and date_of_birth are optional - can be added in profile)
      const requiredFields = [
        'employee_id', 'full_name', 'email', 'contact_no',
        'department', 'designation',
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
        gender, date_of_birth, // Remove optional fields
        ...submitData
      } = formData;

      // Convert semester to integer
      const registrationData = {
        ...submitData,
        semester: parseInt(submitData.semester, 10)
      };

      // Add optional fields only if they have values
      if (gender) registrationData.gender = gender;
      if (date_of_birth) registrationData.date_of_birth = date_of_birth;

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
        date_of_joining: submitData.date_of_joining || '',
        password: submitData.faculty_password
      };

      // Add optional fields only if they have values
      if (submitData.gender) registrationData.gender = submitData.gender;
      if (submitData.date_of_birth) registrationData.date_of_birth = submitData.date_of_birth;

      result = await register(registrationData, 'faculty');
    }

    if (result.success) {
      const redirectPath = userRole === 'faculty' ? '/faculty/profile' : '/client/profile';
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
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8 lg:py-12 px-4 sm:px-6">
      {/* Top Banner */}
      <div className="bg-blue-900 text-white py-3 fixed top-0 left-0 right-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <i className="fas fa-bullhorn mr-2"></i>
          Stay updated with the latest campus events!
          <Link to="/client/events?filter=upcoming" className="underline hover:text-blue-200 ml-2 font-medium">
            View Events
          </Link>
        </div>
      </div>

      <div className="max-w-xl mx-auto space-y-6 mt-16 sm:mt-20">        
        {/* Header Section */}
        <div className="text-center">
          {userRole && (
            <div className="mb-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <i className="fas fa-info-circle"></i>
              <span>Registering as <strong>{userRole === 'faculty' ? 'Faculty Member' : 'Student'}</strong></span>
            </div>
          )}
          <div className="flex items-center justify-center mb-4">
            <div className={`h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center rounded-lg shadow-md ${
              userRole === 'faculty'
                ? 'bg-blue-600'
                : userRole === 'student'
                ? 'bg-green-600'
                : 'bg-gray-700'
              }`}>
              <i className={`${
                userRole === 'faculty' 
                  ? 'fas fa-chalkboard-teacher' 
                  : userRole === 'student'
                  ? 'fas fa-user-graduate'
                  : 'fas fa-users'
                } text-white text-2xl sm:text-3xl`}></i>
            </div>
          </div>
          {userRole ? (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                {userRole === 'faculty' ? 'Faculty Registration' : 'Student Registration'}
              </h1>
              <p className="text-sm text-gray-600 max-w-2xl mx-auto">
                {userRole === 'faculty'
                  ? 'Complete the registration form to create your faculty account'
                  : 'Complete the registration form to create your student account'}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                CampusConnect Registration
              </h1>
              <p className="text-sm text-gray-600 max-w-2xl mx-auto">
                Welcome! Please select your role to begin the registration process
              </p>
            </>
          )}
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            {/* Step Progress Indicator */}
            <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-center gap-2 sm:gap-4 max-w-md mx-auto">
                {[1, 2, 3].map((step) => {
                  const stepInfo = getStepInfo(step);
                  const isActive = currentStep === step;
                  const isCompleted = currentStep > step;
                  
                  return (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center">
                        <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-all duration-200 ${
                          isCompleted
                            ? `${userRole === 'faculty' ? 'bg-blue-600 border-blue-600' : userRole === 'student' ? 'bg-green-600 border-green-600' : 'bg-gray-600 border-gray-600'} text-white`
                            : isActive
                            ? `${userRole === 'faculty' ? 'border-blue-600 bg-blue-50 text-blue-600' : userRole === 'student' ? 'border-green-600 bg-green-50 text-green-600' : 'border-gray-600 bg-gray-50 text-gray-600'}`
                            : 'border-gray-300 bg-white text-gray-400'
                        }`}>
                          {isCompleted ? (
                            <i className="fas fa-check text-sm"></i>
                          ) : (
                            <span className="text-sm font-bold">{step}</span>
                          )}
                        </div>
                        <p className={`text-xs font-medium mt-1.5 whitespace-nowrap ${
                          isActive 
                            ? (userRole === 'faculty' ? 'text-blue-600' : userRole === 'student' ? 'text-green-600' : 'text-gray-600') 
                            : isCompleted
                            ? 'text-gray-500'
                            : 'text-gray-400'
                        }`}>
                          {stepInfo.title}
                        </p>
                      </div>
                      {step < 3 && (
                        <div className={`flex-shrink-0 w-8 sm:w-12 h-0.5 mb-6 rounded-full ${
                          currentStep > step 
                            ? (userRole === 'faculty' ? 'bg-blue-600' : userRole === 'student' ? 'bg-green-600' : 'bg-gray-600')
                            : 'bg-gray-200'
                        }`}></div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6 sm:p-8">
              {/* Current Step Header */}
              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-lg shadow-md mb-3 ${
                  userRole === 'faculty' 
                    ? 'bg-blue-600 text-white' 
                    : userRole === 'student'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-white'
                }`}>
                  <i className={`${getStepInfo(currentStep).icon} text-xl sm:text-2xl`}></i>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {getStepInfo(currentStep).title}
                </h2>
                <p className="text-sm text-gray-600">
                  {getStepInfo(currentStep).description}
                </p>
              </div>

              {/* Error Messages */}
              {(error || validationErrors.step) && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-4 rounded-r-md animate-shake">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <i className="fas fa-exclamation-triangle text-red-400 mt-0.5"></i>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm leading-relaxed">{error || validationErrors.step}</p>
                        <p className="text-xs text-red-500 mt-1 opacity-75">This message will disappear in 5 seconds</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        clearError();
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.step;
                          return newErrors;
                        });
                      }}
                      className="flex-shrink-0 ml-4 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* Form Steps */}
              <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
                {/* Step 1: Who Are You? */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    {/* Role Selection */}
                    <div className="mb-6">
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

                    {/* Personal Information - Only show when role is selected */}
                    {userRole && (
                      <>
                        <div className="grid grid-cols-1 gap-6">
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
                      </>
                    )}
                  </div>
                )}

                {/* Step 2: Academic/Professional Information */}
                {currentStep === 2 && userRole && (
                  <div className="space-y-6">
                    {/* ID Field First */}
                    <div className="grid grid-cols-1 gap-6">
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
                      <>
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Dropdown
                            label="Qualification"
                            placeholder="Select your highest qualification"
                            options={dropdownOptionsService.getOptions('faculty', 'qualifications')}
                            value={formData.qualification}
                            onChange={(value) => setFormData(prev => ({ ...prev, qualification: value }))}
                            required={true}
                            disabled={isLoading}
                            searchable={true}
                            error={!!validationErrors.qualification}
                            helperText={validationErrors.qualification}
                            size="lg"
                          />

                          <TextInput
                            id="experience_years"
                            name="experience_years"
                            type="number"
                            required
                            placeholder="Years of experience"
                            label="Experience (Years)"
                            value={formData.experience_years}
                            onChange={handleChange}
                            disabled={isLoading}
                            error={!!validationErrors.experience_years}
                            helperText={validationErrors.experience_years}
                            size="lg"
                            min="0"
                            max="50"
                          />
                        </div>
                      </>
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
                <div className="flex flex-col sm:flex-row justify-between gap-3 pt-8 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className={`w-full sm:w-auto px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-sm ${
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
                      disabled={currentStep === 1 && !userRole}
                      className={`w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-xl ${
                        (currentStep === 1 && !userRole)
                          ? 'bg-gray-300 cursor-not-allowed opacity-50'
                          : userRole === 'faculty'
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                          : userRole === 'student'
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                      }`}
                    >
                      Next Step
                      <i className="fas fa-arrow-right ml-2"></i>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
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

        {/* Login Link */}
        <div className="text-center">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-5">
            <p className="text-sm text-gray-600 mb-4">Already have an account?</p>
            <Link
              to={`/auth/login?tab=${userRole}`}
              className={`inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 border-2 rounded-lg text-sm font-semibold transition-colors ${
                userRole === 'faculty'
                  ? 'border-blue-600 text-blue-700 hover:bg-blue-50'
                  : userRole === 'student'
                  ? 'border-green-600 text-green-700 hover:bg-green-50'
                  : 'border-gray-600 text-gray-700 hover:bg-gray-50'
                }`}
            >
              <i className="fas fa-sign-in-alt mr-2"></i>
              {userRole === 'faculty' 
                ? 'Sign In as Faculty' 
                : userRole === 'student'
                ? 'Sign In as Student'
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
