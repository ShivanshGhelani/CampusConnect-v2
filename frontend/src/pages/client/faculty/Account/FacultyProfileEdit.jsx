import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import ClientLayout from '../../../../components/client/Layout';
import api from '../../../../api/base';
import { authAPI } from '../../../../api/auth';
import Dropdown from '../../../../components/ui/Dropdown';
import TextInput from '../../../../components/ui/TextInput';
import dropdownOptionsService from '../../../../services/dropdownOptionsService';

// Hardcoded options for genders
const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' }
];

function FacultyProfileEdit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [validationLoading, setValidationLoading] = useState({});
  const [showPassword, setShowPassword] = useState({
    current_password: false,
    new_password: false,
    confirm_new_password: false
  });

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    contact_no: '',
    gender: '',
    date_of_birth: '',
    employee_id: '',
    department: '',
    designation: '',
    qualification: '',
    specialization: '',
    experience_years: '',
    seating: '',
    date_of_joining: '',
    current_password: '',
    new_password: '',
    confirm_new_password: ''
  });

  // Format date for input field
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  };

  // Real-time field validation for database checks
  const validateFieldRealTime = useCallback(
    async (fieldName, fieldValue) => {
      console.log('🎯 validateFieldRealTime CALLED for faculty profile edit:', { fieldName, fieldValue });
      
      // Only validate email and contact_no for cross-validation
      const fieldsToValidate = ['email', 'contact_no'];
      if (!fieldsToValidate.includes(fieldName) || !fieldValue || fieldValue.length < 3) {
        console.log('❌ Validation skipped - field not in list or too short');
        return;
      }

      console.log('✅ Validation proceeding for:', fieldName);
      setValidationLoading(prev => ({ ...prev, [fieldName]: true }));

      try {
        const response = await authAPI.validateField(fieldName, fieldValue, 'faculty', user?.employee_id);
        console.log('🔍 Validation response for', fieldName, ':', response);
        
        if (response.data.success) {
          // Update validation errors with the real-time check
          if (!response.data.available) {
            setValidationErrors(prev => ({
              ...prev,
              [fieldName]: response.data.message
            }));
          } else {
            // Clear the error if field is available
            setValidationErrors(prev => {
              const newErrors = { ...prev };
              if (newErrors[fieldName]?.includes('already registered')) {
                delete newErrors[fieldName];
              }
              return newErrors;
            });
          }
        }
      } catch (error) {
        console.error('Field validation error:', error);
        // Don't show errors for network issues during real-time validation
      } finally {
        setValidationLoading(prev => ({ ...prev, [fieldName]: false }));
      }
    },
    [user?.employee_id]
  );

  // Debounce the validation to avoid too many API calls
  const debouncedValidation = useCallback(
    (() => {
      const timers = {};
      return (fieldName, fieldValue) => {
        console.log('⏰ Debouncing validation for:', fieldName, 'value:', fieldValue);
        clearTimeout(timers[fieldName]);
        timers[fieldName] = setTimeout(() => {
          console.log('✅ Executing debounced validation for:', fieldName);
          validateFieldRealTime(fieldName, fieldValue);
        }, 800); // Wait 800ms after user stops typing
      };
    })(),
    [validateFieldRealTime]
  );

  // Fetch current profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/v1/client/profile/faculty/info');
        if (response.data.success) {
          const profile = response.data.profile;
          setFormData({
            full_name: profile.full_name || '',
            email: profile.email || user?.email || '',
            contact_no: profile.contact_no || '',
            gender: profile.gender || '',
            date_of_birth: profile.date_of_birth ? formatDateForInput(profile.date_of_birth) : '',
            employee_id: profile.employee_id || user?.employee_id || '',
            department: profile.department || '',
            designation: profile.designation || '',
            qualification: profile.qualification || '',
            specialization: profile.specialization || '',
            experience_years: profile.experience_years || '',
            seating: profile.seating || '',
            date_of_joining: profile.date_of_joining ? formatDateForInput(profile.date_of_joining) : '',
            current_password: '',
            new_password: '',
            confirm_new_password: ''
          });
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfileData();
    }
  }, [user]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Process the value based on field type
    let processedValue = value;
    if (name === 'contact_no') {
      processedValue = value.replace(/[^0-9]/g, '').slice(0, 10);
    } else if (name === 'email') {
      processedValue = value.toLowerCase();
    } else if (name === 'experience_years') {
      processedValue = value.replace(/[^0-9]/g, '').slice(0, 2);
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Clear messages when user starts typing
    if (success) setSuccess('');
    if (error) setError('');
    
    // Clear specific validation error
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Trigger real-time database validation for email and contact_no
    const fieldsToValidateRealTime = ['email', 'contact_no'];
    if (fieldsToValidateRealTime.includes(name) && processedValue.length >= 3) {
      console.log('🚀 Triggering real-time validation for:', name, 'value:', processedValue);
      debouncedValidation(name, processedValue);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (fieldName) => {
    setShowPassword(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Check for validation errors before submission
      const hasValidationErrors = Object.keys(validationErrors).some(key => validationErrors[key]);
      if (hasValidationErrors) {
        setError('Please fix the validation errors before submitting');
        setSaving(false);
        return;
      }

      // Validate password fields if any password is provided
      if (formData.new_password || formData.current_password || formData.confirm_new_password) {
        if (!formData.current_password) {
          setError('Current password is required to change password');
          setSaving(false);
          return;
        }
        if (!formData.new_password) {
          setError('New password is required');
          setSaving(false);
          return;
        }
        if (formData.new_password !== formData.confirm_new_password) {
          setError('New passwords do not match');
          setSaving(false);
          return;
        }
        if (formData.new_password.length < 6) {
          setError('New password must be at least 6 characters long');
          setSaving(false);
          return;
        }
      }

      // Prepare update data (excluding empty passwords)
      const updateData = { ...formData };
      if (!updateData.new_password) {
        delete updateData.current_password;
        delete updateData.new_password;
        delete updateData.confirm_new_password;
      }

      const response = await api.put('/api/v1/client/profile/faculty/update', updateData);
      
      if (response.data.success) {
        setSuccess('Profile updated successfully!');
        // Clear password fields after successful update
        setFormData(prev => ({
          ...prev,
          current_password: '',
          new_password: '',
          confirm_new_password: ''
        }));
        
        // Redirect after a short delay
        setTimeout(() => {
          navigate('/faculty/profile');
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(
        error.response?.data?.message || 
        error.response?.data?.detail || 
        'Failed to update profile. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.user_type !== 'faculty') {
    return (
      <ClientLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-red-500">Access denied. Faculty login required.</p>
        </div>
      </ClientLayout>
    );
  }

  if (loading) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-slate-600 font-medium">Loading profile...</span>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 shadow-lg border-b border-purple-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Faculty Profile</h1>
                <p className="text-gray-600">Update your personal and professional information</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-400 text-green-700 px-4 py-4 rounded-r-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{success}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-4 rounded-r-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Profile Edit Form */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              
              {/* Personal Information Section */}
              <div className="border-b border-gray-200 pb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  <svg className="w-5 h-5 text-purple-500 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="md:col-span-2">
                    <TextInput
                      id="full_name" 
                      name="full_name" 
                      type="text" 
                      required
                      placeholder="Enter your full name as per official records"
                      label="Full Name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      }
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <input 
                        id="email" 
                        name="email" 
                        type="email" 
                        required
                        className={`w-full px-4 py-3 border-2 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-4 transition-all duration-200 ${
                          validationErrors.email 
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' 
                            : 'border-gray-200 focus:ring-purple-500/20 focus:border-purple-500'
                        }`}
                        placeholder="Enter your email address"
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                        {validationLoading.email ? (
                          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                        ) : (
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                    </div>
                    {validationErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Your email will be used for important notifications</p>
                  </div>

                  {/* Contact Number */}
                  <div>
                    <label htmlFor="contact_no" className="block text-sm font-semibold text-gray-800 mb-2">
                      Contact Number
                    </label>
                    <div className="relative">
                      <input 
                        id="contact_no" 
                        name="contact_no" 
                        type="tel" 
                        pattern="[0-9]{10}"
                        className={`w-full px-4 py-3 border-2 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-4 transition-all duration-200 ${
                          validationErrors.contact_no 
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' 
                            : 'border-gray-200 focus:ring-purple-500/20 focus:border-purple-500'
                        }`}
                        placeholder="10-digit mobile number"
                        value={formData.contact_no}
                        onChange={handleInputChange}
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                        {validationLoading.contact_no ? (
                          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                        ) : (
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        )}
                      </div>
                    </div>
                    {validationErrors.contact_no && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.contact_no}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Your active contact number for notifications</p>
                  </div>

                  {/* Gender */}
                  <div>
                    <Dropdown
                      label="Gender"
                      placeholder="Select your gender"
                      options={GENDER_OPTIONS}
                      value={formData.gender}
                      onChange={(value) => setFormData(prev => ({...prev, gender: value}))}
                      required={true}
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label htmlFor="date_of_birth" className="block text-sm font-semibold text-gray-800 mb-2">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <input 
                        id="date_of_birth" 
                        name="date_of_birth" 
                        type="date"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                        max={new Date().toISOString().split('T')[0]}
                        value={formData.date_of_birth}
                        onChange={handleInputChange}
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information Section */}
              <div className="border-b border-gray-200 pb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  <svg className="w-5 h-5 text-purple-500 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Professional Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Employee ID */}
                  <div>
                    <label htmlFor="employee_id" className="block text-sm font-semibold text-gray-800 mb-1">
                      Employee ID
                    </label>
                    <div className="relative">
                      <input 
                        id="employee_id" 
                        name="employee_id" 
                        type="text"
                        readOnly
                        className="w-full px-4 py-2.5 border-2 shadow-md border-gray-200 rounded-lg placeholder-gray-400 bg-gray-100 text-gray-600 cursor-not-allowed focus:outline-none"
                        placeholder="Employee ID (Cannot be changed)"
                        value={formData.employee_id}
                        title="Employee ID cannot be modified"
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Employee ID cannot be modified for security reasons</p>
                  </div>

                  {/* Department */}
                  <div>
                    <Dropdown
                      label="Department"
                      placeholder="Select your department"
                      options={dropdownOptionsService.getOptions('faculty', 'departments')}
                      value={formData.department}
                      onChange={(value) => setFormData(prev => ({...prev, department: value}))}
                      searchable={true}
                      required={true}
                      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>}
                    />
                  </div>

                  {/* Designation */}
                  <div>
                    <Dropdown
                      label="Designation"
                      placeholder="Select your designation"
                      options={dropdownOptionsService.getOptions('faculty', 'designations')}
                      value={formData.designation}
                      onChange={(value) => setFormData(prev => ({...prev, designation: value}))}
                      searchable={true}
                      required={true}
                      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>}
                    />
                  </div>

                  {/* Qualification */}
                  <div>
                    <Dropdown
                      label="Qualification"
                      placeholder="Select your highest qualification"
                      options={dropdownOptionsService.getOptions('faculty', 'qualifications')}
                      value={formData.qualification}
                      onChange={(value) => setFormData(prev => ({...prev, qualification: value}))}
                      searchable={true}
                      required={true}
                      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>}
                    />
                  </div>

                  {/* Experience */}
                  <div>
                    <label htmlFor="experience_years" className="block text-sm font-semibold text-gray-800 mb-2">
                      Experience (Years)
                    </label>
                    <div className="relative">
                      <input 
                        id="experience_years" 
                        name="experience_years" 
                        type="number"
                        min="0"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                        placeholder="Years of experience"
                        value={formData.experience_years}
                        onChange={handleInputChange}
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Office/Seating */}
                  <div>
                    <label htmlFor="seating" className="block text-sm font-semibold text-gray-800 mb-2">
                      Office/Seating
                    </label>
                    <div className="relative">
                      <input 
                        id="seating" 
                        name="seating" 
                        type="text"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                        placeholder="e.g., Room 101, Building A"
                        value={formData.seating}
                        onChange={handleInputChange}
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Date of Joining */}
                  <div>
                    <label htmlFor="date_of_joining" className="block text-sm font-semibold text-gray-800 mb-2">
                      Date of Joining
                    </label>
                    <div className="relative">
                      <input 
                        id="date_of_joining" 
                        name="date_of_joining" 
                        type="date"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                        max={new Date().toISOString().split('T')[0]}
                        value={formData.date_of_joining}
                        onChange={handleInputChange}
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Specialization */}
                  <div className="md:col-span-2">
                    <label htmlFor="specialization" className="block text-sm font-semibold text-gray-800 mb-2">
                      Specialization/Research Interests
                    </label>
                    <div className="relative">
                      <textarea 
                        id="specialization" 
                        name="specialization" 
                        rows="4"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 resize-none"
                        placeholder="Your area of specialization or research interests"
                        value={formData.specialization}
                        onChange={handleInputChange}
                      />
                      <div className="absolute top-3 right-0 pr-4 flex items-start">
                        <svg className="w-4 h-4 text-gray-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Change Section */}
              <div className="pb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  <svg className="w-5 h-5 text-purple-500 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Change Password
                </h3>
                
                <div className="space-y-6">
                  {/* Current Password - Full Width */}
                  <div className="max-w-full">
                    <label htmlFor="current_password" className="block text-sm font-semibold text-gray-800 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input 
                        id="current_password" 
                        name="current_password" 
                        type={showPassword.current_password ? "text" : "password"}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                        placeholder="Enter your current password"
                        value={formData.current_password}
                        onChange={handleInputChange}
                      />
                      <button 
                        type="button" 
                        onClick={() => togglePasswordVisibility('current_password')}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {showPassword.current_password ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          )}
                        </svg>
                      </button>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-1">Required only if changing password</p>
                  </div>

                  {/* New Password Fields - Side by Side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* New Password */}
                    <div>
                      <label htmlFor="new_password" className="block text-sm font-semibold text-gray-800 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input 
                          id="new_password" 
                          name="new_password" 
                          type={showPassword.new_password ? "text" : "password"}
                          minLength="6"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                          placeholder="Leave blank to keep current password"
                          value={formData.new_password}
                          onChange={handleInputChange}
                        />
                        <button 
                          type="button" 
                          onClick={() => togglePasswordVisibility('new_password')}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {showPassword.new_password ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            )}
                          </svg>
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Minimum 6 characters required</p>
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <label htmlFor="confirm_new_password" className="block text-sm font-semibold text-gray-800 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input 
                          id="confirm_new_password" 
                          name="confirm_new_password" 
                          type={showPassword.confirm_new_password ? "text" : "password"}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                          placeholder="Confirm your new password"
                          value={formData.confirm_new_password}
                          onChange={handleInputChange}
                        />
                        <button 
                          type="button" 
                          onClick={() => togglePasswordVisibility('confirm_new_password')}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {showPassword.confirm_new_password ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            )}
                          </svg>
                        </button>
                      </div>
                      <div className="mt-2 text-xs">
                        {(formData.new_password || formData.confirm_new_password) && !formData.current_password && (
                          <div className="text-orange-600 mb-1">⚠ Current password is required to change password</div>
                        )}
                        {formData.new_password && formData.confirm_new_password && (
                          formData.new_password === formData.confirm_new_password ? (
                            <span className="text-green-600">✓ Passwords match</span>
                          ) : (
                            <span className="text-red-600">✗ Passwords do not match</span>
                          )
                        )}
                        {(!formData.new_password || !formData.confirm_new_password) && (
                          <span className="text-gray-500">Re-enter your new password to confirm</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <Link 
                  to="/faculty/profile" 
                  className="inline-flex items-center px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Profile
                </Link>
                
                <button 
                  type="submit" 
                  disabled={saving}
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

export default FacultyProfileEdit;
