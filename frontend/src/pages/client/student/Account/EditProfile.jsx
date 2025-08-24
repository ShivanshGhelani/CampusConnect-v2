import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import api from '../../../../api/base';
import { authAPI } from '../../../../api/auth';
import Dropdown from '../../../../components/ui/Dropdown';
import TextInput from '../../../../components/ui/TextInput';
import dropdownOptionsService from '../../../../services/dropdownOptionsService';

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

function EditProfile() {
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
    mobile_no: '',
    gender: '',
    date_of_birth: '',
    enrollment_no: '',
    department: '',
    semester: '',
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
      console.log('🎯 validateFieldRealTime CALLED for profile edit:', { fieldName, fieldValue });
      
      // Only validate email and mobile_no for cross-validation
      const fieldsToValidate = ['email', 'mobile_no'];
      if (!fieldsToValidate.includes(fieldName) || !fieldValue || fieldValue.length < 3) {
        console.log('❌ Validation skipped - field not in list or too short');
        return;
      }

      console.log('✅ Validation proceeding for:', fieldName);
      setValidationLoading(prev => ({ ...prev, [fieldName]: true }));

      try {
        const response = await authAPI.validateField(fieldName, fieldValue, 'student', user?.enrollment_no);
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
    [user?.enrollment_no]
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
        const response = await api.get('/api/v1/client/profile/info');
        if (response.data.success) {
          const profile = response.data.profile;
          
          // Transform gender to match frontend options (capitalize first letter)
          const transformGender = (gender) => {
            if (!gender) return '';
            return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
          };
          
          setFormData({
            full_name: profile.full_name || '',
            email: profile.email || user?.email || '',
            mobile_no: profile.mobile_no || '',
            gender: transformGender(profile.gender) || '',
            date_of_birth: profile.date_of_birth ? formatDateForInput(profile.date_of_birth) : '',
            enrollment_no: profile.enrollment_no || user?.enrollment_no || '',
            department: profile.department || '',
            semester: profile.semester || '',
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
    if (name === 'mobile_no') {
      processedValue = value.replace(/[^0-9]/g, '').slice(0, 10);
    } else if (name === 'email') {
      processedValue = value.toLowerCase();
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

    // Trigger real-time database validation for email and mobile_no
    const fieldsToValidateRealTime = ['email', 'mobile_no'];
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
    
    // Check for validation errors before submission
    const hasValidationErrors = Object.keys(validationErrors).some(key => validationErrors[key]);
    if (hasValidationErrors) {
      setError('Please fix the validation errors before submitting');
      return;
    }
    
    // Check if password change is requested
    const hasPasswordChange = formData.new_password || formData.confirm_new_password;
    
    // Validate passwords if provided
    if (hasPasswordChange) {
      if (!formData.current_password) {
        setError('Current password is required to change password');
        return;
      }
      
      if (formData.new_password !== formData.confirm_new_password) {
        setError('New passwords do not match');
        return;
      }
      
      if (formData.new_password.length < 6) {
        setError('New password must be at least 6 characters long');
        return;
      }
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Prepare profile data for submission (exclude password fields)
      const profileData = { ...formData };
      delete profileData.current_password;
      delete profileData.new_password;
      delete profileData.confirm_new_password;

      // Update profile first
      const profileResponse = await api.put('/api/v1/client/profile/update', profileData);
      if (!profileResponse.data.success) {
        throw new Error(profileResponse.data.message || 'Failed to update profile');
      }

      // Handle password change separately if requested
      if (hasPasswordChange) {
        const passwordData = {
          current_password: formData.current_password,
          new_password: formData.new_password,
          confirm_password: formData.confirm_new_password
        };
        
        const passwordResponse = await api.post('/api/v1/client/profile/change-password', passwordData);
        if (!passwordResponse.data.success) {
          throw new Error(passwordResponse.data.message || 'Failed to change password');
        }
      }

      setSuccess('Profile updated successfully!');
      
      // Clear password fields on success
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_new_password: ''
      }));

    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Edit Profile</h1>
          <p className="text-lg text-gray-600">Update your personal information and account settings</p>
        </div>

          {/* Navigation */}
          <div className="mb-6">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                  <Link to="/client/dashboard" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-purple-600">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                    </svg>
                    Dashboard
                  </Link>
                </li>
                <li>
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                    </svg>
                    <span className="ml-1 text-sm font-medium text-purple-600 md:ml-2">Edit Profile</span>
                  </div>
                </li>
              </ol>
            </nav>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}
          
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Main Form */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              
              {/* Personal Information Section */}
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-6">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Full Name */}
                  <TextInput
                    id="full_name" 
                    name="full_name" 
                    type="text" 
                    required
                    placeholder="Enter your full name"
                    label="Full Name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    }
                  />

                  {/* Email */}
                  <TextInput
                    id="email" 
                    name="email" 
                    type="email" 
                    required
                    placeholder="Enter your email address"
                    label="Email Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    loading={validationLoading.email}
                    error={!!validationErrors.email}
                    helperText={validationErrors.email}
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    }
                  />

                  {/* Mobile Number */}
                  <TextInput
                    id="mobile_no" 
                    name="mobile_no" 
                    type="tel" 
                    required 
                    placeholder="10-digit mobile number"
                    label="Mobile Number"
                    value={formData.mobile_no}
                    onChange={handleInputChange}
                    loading={validationLoading.mobile_no}
                    error={!!validationErrors.mobile_no}
                    helperText={validationErrors.mobile_no || "Your active mobile number for notifications"}
                    pattern="[0-9]{10}"
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h5.5a2 2 0 012 2v6.5a1 1 0 01-1 1H10a1 1 0 01-1-1v-1M7 13h5.5a1 1 0 011 1v5.5a2 2 0 01-2 2H4a1 1 0 01-1-1V14a1 1 0 011-1h3z" />
                      </svg>
                    }
                  />

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
                    <input 
                      id="date_of_birth" 
                      name="date_of_birth" 
                      type="date"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Academic Information Section */}
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-6">Academic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Enrollment Number (Read-only) */}
                  <div>
                    <label htmlFor="enrollment_no" className="block text-sm font-semibold text-gray-800 mb-2">
                      Enrollment Number
                    </label>
                    <input 
                      id="enrollment_no" 
                      name="enrollment_no" 
                      type="text"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                      value={formData.enrollment_no}
                      readOnly
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">Enrollment number cannot be changed</p>
                  </div>

                  {/* Department */}
                  <div>
                    <Dropdown
                      label="Department"
                      placeholder="Select your department"
                      options={dropdownOptionsService.getOptions('student', 'departments')}
                      value={formData.department}
                      onChange={(value) => setFormData(prev => ({...prev, department: value}))}
                      searchable={true}
                      required={true}
                    />
                  </div>

                  {/* Semester */}
                  <div>
                    <Dropdown
                      label="Semester"
                      placeholder="Select your semester"
                      options={SEMESTER_OPTIONS}
                      value={formData.semester}
                      onChange={(value) => setFormData(prev => ({...prev, semester: value}))}
                      required={true}
                    />
                  </div>
                </div>
              </div>

              {/* Password Change Section */}
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-6">Change Password</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Current Password */}
                  <div>
                    <label htmlFor="current_password" className="block text-sm font-semibold text-gray-800 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input 
                        id="current_password" 
                        name="current_password" 
                        type={showPassword.current_password ? "text" : "password"}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                        placeholder="Enter current password"
                        value={formData.current_password}
                        onChange={handleInputChange}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        onClick={() => togglePasswordVisibility('current_password')}
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {showPassword.current_password ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.465 8.465M9.878 9.878l4.242 4.242m0 0L16.5 16.5M14.12 14.12L16.5 16.5m-2.38-2.38a3 3 0 01-4.243-4.243m4.243 4.243L9.878 9.878" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>

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
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                        placeholder="Enter new password"
                        value={formData.new_password}
                        onChange={handleInputChange}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        onClick={() => togglePasswordVisibility('new_password')}
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {showPassword.new_password ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.465 8.465M9.878 9.878l4.242 4.242m0 0L16.5 16.5M14.12 14.12L16.5 16.5m-2.38-2.38a3 3 0 01-4.243-4.243m4.243 4.243L9.878 9.878" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          )}
                        </svg>
                      </button>
                    </div>
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
                        placeholder="Confirm new password"
                        value={formData.confirm_new_password}
                        onChange={handleInputChange}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        onClick={() => togglePasswordVisibility('confirm_new_password')}
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {showPassword.confirm_new_password ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.465 8.465M9.878 9.878l4.242 4.242m0 0L16.5 16.5M14.12 14.12L16.5 16.5m-2.38-2.38a3 3 0 01-4.243-4.243m4.243 4.243L9.878 9.878" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          )}
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Leave blank to keep current password</p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <Link
                  to="/client/dashboard"
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-500/20 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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

  );
}

export default EditProfile;
