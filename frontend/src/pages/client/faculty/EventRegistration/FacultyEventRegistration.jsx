import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { clientAPI } from '../../../../api/client';
import Layout from '../../../../components/client/Layout';
import LoadingSpinner from '../../../../components/LoadingSpinner';
// Phase 1 Integration: Validation & ID Generation
import { validators, useValidation } from '../../../../utils/validators';
import {
  generateRegistrationId,      // FIXED: Use real ID instead of temp
  generateTeamRegistrationId,  // FIXED: Use real team ID instead of temp
  generateSessionId,
  idValidators
} from '../../../../utils/idGenerator';
// Import cache utilities for optimized data loading
import { fetchProfileWithCache, getAnyCache, refreshExpiredCache } from '../../../../utils/profileCache';
import { fetchEventWithCache, getAnyEventCache } from '../../../../utils/eventCache';

const FacultyEventRegistration = ({ forceTeamMode = false }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userType, isLoading: authLoading } = useAuth();

  // State management
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registrationBlocked, setRegistrationBlocked] = useState(false);

  // Form data state - Initialize with user data if available
  const [formData, setFormData] = useState(() => {
    const resolveContactNumber = (userData) => {
      if (!userData) return '';
      const possibleFields = ['contact_no', 'phone_number', 'mobile_no', 'phone', 'mobile', 'contact'];
      for (const field of possibleFields) {
        if (userData[field] && userData[field].trim()) {
          return userData[field];
        }
      }
      return '';
    };

    return {
      full_name: user?.full_name || '',
      employee_id: user?.employee_id || '',
      email: user?.email || '',
      contact_no: resolveContactNumber(user),
      department: user?.department || '',
      team_name: '',
      participants: []
    };
  });

  // Team registration state
  const [isTeamRegistration, setIsTeamRegistration] = useState(false);
  const [teamSizeMin, setTeamSizeMin] = useState(2);
  const [teamSizeMax, setTeamSizeMax] = useState(5);
  const [participantCount, setParticipantCount] = useState(0);

  // Phase 1 Integration: Validation & Session Management
  const { validationErrors: formValidationErrors, validateForm: validateFormData, clearValidationError } = useValidation();
  const [sessionId, setSessionId] = useState(null);
  const [tempRegistrationId, setTempRegistrationId] = useState(null);
  const [tempTeamId, setTempTeamId] = useState(null);
  const [formSession, setFormSession] = useState(null);

  // Initialize session and IDs for faculty
  useEffect(() => {
    const initializeSession = () => {
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);

      // Generate REAL registration ID for faculty (not temp)
      if (user?.employee_id && eventId) {
        const registrationId = generateRegistrationId(
          user.employee_id,
          eventId,
          user.full_name || 'Faculty'
        );
        setTempRegistrationId(registrationId);  // Variable name kept for compatibility

        // Store session data for persistence
        const sessionData = {
          sessionId: newSessionId,
          tempRegistrationId: registrationId,  // This is now a REAL ID
          eventId: eventId,
          userId: user.employee_id,
          userType: 'faculty',
          timestamp: Date.now()
        };
        localStorage.setItem(`faculty_registration_session_${eventId}`, JSON.stringify(sessionData));
        setFormSession(sessionData);
      }
    };

    if (user && eventId) {
      initializeSession();
    }
  }, [user, eventId]);

  // Generate team ID when team registration is enabled for faculty
  useEffect(() => {
    if (isTeamRegistration && formData.team_name && eventId) {
      const teamIdValue = generateTeamRegistrationId(
        formData.team_name,
        eventId,
        user?.employee_id || user?.full_name || 'Faculty Leader'
      );
      setTempTeamId(teamIdValue);
    }
  }, [isTeamRegistration, formData.team_name, eventId, user?.full_name]);

  // Update form data when user profile loads (e.g., after page refresh)
  useEffect(() => {
    if (user && user.employee_id) {
      const resolveContactNumber = (userData) => {
        if (!userData) return '';
        const possibleFields = ['contact_no', 'phone_number', 'mobile_no', 'phone', 'mobile', 'contact'];
        for (const field of possibleFields) {
          if (userData[field] && userData[field].trim()) {
            return userData[field];
          }
        }
        return '';
      };

      setFormData(prev => ({
        ...prev,
        full_name: user.full_name || prev.full_name,
        employee_id: user.employee_id || prev.employee_id,
        email: user.email || prev.email,
        contact_no: resolveContactNumber(user) || prev.contact_no,
        department: user.department || prev.department
      }));
    }
  }, [user?.full_name, user?.email, user?.contact_no, user?.phone_number, user?.mobile_no, user?.department]);

  // Load event details using cached data
  useEffect(() => {
    const loadEventDetails = async () => {
      if (!eventId) {
        setError('Event ID is required');
        setLoading(false);
        return;
      }

      try {
        
        let eventData = getAnyEventCache(eventId);
        
        if (!eventData) {
          
          // Fallback to API if not cached (should rarely happen)
          const cachedEventData = await fetchEventWithCache(eventId, clientAPI);
          eventData = cachedEventData?.event || cachedEventData;
        } else {
          
          eventData = eventData.event || eventData;
        }

        if (!eventData) {
          throw new Error('Event data not found');
        }

        setEvent(eventData);

        // Check if URL indicates team registration or use event setting
        const isTeamRoute = location.pathname.includes('/register-team');
        const shouldUseTeamMode = forceTeamMode || isTeamRoute || eventData.registration_mode === 'team';

        setIsTeamRegistration(shouldUseTeamMode);
        setTeamSizeMin(eventData.team_size_min || 2);
        setTeamSizeMax(eventData.team_size_max || 5);

        // Registration status checking is now handled by RegistrationRouter

        // Initialize participants for team registration
        if (shouldUseTeamMode) {
          const minParticipants = (eventData.team_size_min || 2) - 1; // Excluding leader
          initializeParticipants(minParticipants);
        }

        

      } catch (error) {
        
        setError('Failed to load event details');
      }
      // Loading state is now controlled by user data useEffect - don't set it here
    };

    loadEventDetails();
  }, [eventId, location.pathname, forceTeamMode]);

  // Use cached profile data for form initialization (OPTIMIZED - NO API CALLS)
  useEffect(() => {
    const loadProfileData = async () => {
      if (user) {
        console.log('👤 Loading faculty profile data...');

        // Get cached profile data (should already be loaded from login)
        const cachedProfile = getAnyCache('faculty');
        let profileData = user; // fallback to AuthContext user
        
        if (cachedProfile?.profile) {
          console.log('✅ Using cached faculty profile data');
          profileData = cachedProfile.profile;
        } else {
          console.log('❌ No cached faculty profile found, attempting to refresh...');
          // If no cache and user is logged in, try to refresh expired cache
          if (user?.employee_id) {
            try {
              const refreshedProfile = await refreshExpiredCache('faculty', user.employee_id, clientAPI);
              if (refreshedProfile?.profile) {
                console.log('🔄 Successfully refreshed expired faculty cache');
                profileData = refreshedProfile.profile;
              } else {
                console.log('⚠️ Faculty cache refresh failed, using fallback');
                // Try to fetch from session storage as backup
                try {
                  const sessionProfile = sessionStorage.getItem('complete_profile');
                  if (sessionProfile) {
                    const parsedProfile = JSON.parse(sessionProfile);
                    profileData = parsedProfile;
                    console.log('📦 Using session storage backup for faculty');
                  }
                } catch (e) {
                  console.error('❌ Session storage backup failed for faculty:', e);
                }
              }
            } catch (error) {
              console.error('❌ Failed to refresh expired faculty cache:', error);
              // Try to fetch from session storage as backup
              try {
                const sessionProfile = sessionStorage.getItem('complete_profile');
                if (sessionProfile) {
                  const parsedProfile = JSON.parse(sessionProfile);
                  profileData = parsedProfile;
                  console.log('📦 Using session storage backup after faculty error');
                }
              } catch (e) {
                console.error('❌ Session storage backup failed for faculty:', e);
              }
            }
          }
        }

        // Utility function to resolve contact number from various field names
        const resolveContactNumber = (userData) => {
          const possibleFields = ['contact_no', 'phone_number', 'mobile_no', 'phone', 'mobile', 'contact'];
          for (const field of possibleFields) {
            if (userData[field] && userData[field].trim()) {
              return userData[field];
            }
          }
          return '';
        };

        const contactNumber = resolveContactNumber(profileData);

        const newFormData = {
          ...formData,
          full_name: profileData.full_name || '',
          employee_id: profileData.employee_id || '',  // Changed from faculty_id
          email: profileData.email || '',
          contact_no: contactNumber,  // FIXED: Use resolved contact number
          department: profileData.department || ''
          // REMOVED: designation field (not needed per user request)
        };

        setFormData(newFormData);
        // CRITICAL: Set loading to false after successful profile load
        setLoading(false);
        console.log('✅ Faculty form data initialized:', newFormData);
      }
    };

    loadProfileData();
  }, [user, user?.contact_no, user?.phone_number, user?.full_name, user?.email]);

  // Initialize participants array for team registration
  const initializeParticipants = useCallback((count) => {
    const participants = Array(count).fill(null).map((_, index) => ({
      id: index + 1,
      employee_id: '',     // Changed from faculty_id
      full_name: '',
      email: '',
      contact_no: '',      // Changed from mobile_no
      department: '',
      // REMOVED: designation (not needed per user request)
      isValid: false,
      errors: {}
    }));

    setFormData(prev => ({
      ...prev,
      participants
    }));
    setParticipantCount(count);
  }, []);

  // Format date for input field
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      return '';
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear any existing error for this field
    if (error) {
      setError('');
    }
  };

  // Handle participant input changes
  const handleParticipantChange = (participantIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map((participant, index) =>
        index === participantIndex
          ? { ...participant, [field]: value, errors: { ...participant.errors, [field]: '' } }
          : participant
      )
    }));
  };

  // Validate participant data
  const validateParticipant = async (participant, index) => {
    if (!participant.employee_id.trim()) {
      return { isValid: false, errors: { employee_id: 'Employee ID is required' } };
    }

    try {
      const response = await clientAPI.lookupFaculty(participant.employee_id);
      if (response.data.success) {
        return {
          isValid: true,
          errors: {},
          // FIXED: Updated to use new unified API response structure
          data: response.data.user_data // Changed from faculty to user_data
        };
      } else {
        return {
          isValid: false,
          errors: { employee_id: response.data.message || 'Invalid Employee ID' }
        };
      }
    } catch (error) {
      return {
        isValid: false,
        errors: { employee_id: 'Error validating Employee ID' }
      };
    }
  };

  // Add participant
  const addParticipant = () => {
    if (participantCount >= teamSizeMax - 1) return;

    const newParticipant = {
      id: participantCount + 1,
      employee_id: '',     // Changed from faculty_id
      full_name: '',
      email: '',
      contact_no: '',      // Changed from mobile_no
      department: '',
      designation: '',
      isValid: false,
      errors: {}
    };

    setFormData(prev => ({
      ...prev,
      participants: [...prev.participants, newParticipant]
    }));
    setParticipantCount(prev => prev + 1);
  };

  // Remove participant
  const removeParticipant = () => {
    if (participantCount <= teamSizeMin - 1) return;

    setFormData(prev => ({
      ...prev,
      participants: prev.participants.slice(0, -1)
    }));
    setParticipantCount(prev => prev - 1);
  };

  // Legacy form validation (to be replaced by Phase 1)
  const validateFormLegacy = () => {
    const errors = [];

    // Basic validation
    if (!formData.full_name.trim()) errors.push('Full name is required');
    if (!formData.employee_id.trim()) errors.push('Employee ID is required');
    if (!formData.email.trim()) errors.push('Email is required');
    if (!formData.contact_no.trim()) errors.push('Contact number is required');
    if (!formData.department) errors.push('Department is required');
    // REMOVED: designation validation (not needed per user request)
    // Removed: gender, date_of_birth validation (not needed for faculty)

    // Team specific validation
    if (isTeamRegistration) {
      if (!formData.team_name.trim()) errors.push('Team name is required');

      // Validate participants
      const invalidParticipants = formData.participants.filter(p => !p.isValid);
      if (invalidParticipants.length > 0) {
        errors.push('Please ensure all team members have valid Employee IDs');
      }
    }

    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (registrationBlocked) {
      setError('Registration is currently blocked');
      return;
    }

    // Phase 1: Use enhanced validation
    const isFormValid = validateFormData(formData, {
      full_name: validators.required,
      employee_id: validators.faculty,
      email: validators.email,
      contact_no: validators.mobileNumber,
      department: validators.required
      // REMOVED: designation validation (not needed per user request)
      // Removed: gender, date_of_birth validation (not needed for faculty)
    });

    if (!isFormValid) {
      const errorMessages = Object.values(formValidationErrors);
      if (errorMessages.length > 0) {
        setError(`Validation failed: ${errorMessages.join(', ')}`);
      } else {
        setError('Please fill in all required fields correctly');
      }
      setSubmitting(false);
      return;
    }

    // Legacy validation as fallback
    const legacyValidationErrors = validateFormLegacy();
    if (legacyValidationErrors.length > 0) {
      setError(legacyValidationErrors.join(', '));
      setSubmitting(false);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const registrationData = {
        registration_type: isTeamRegistration ? 'team' : 'individual',
        faculty_data: {
          ...formData,
          registration_id: tempRegistrationId  // Include the generated registration ID
        },
        team_data: isTeamRegistration ? {
          team_name: formData.team_name,
          team_members: formData.participants.map(p => p.employee_id).filter(id => id.trim()),
          team_leader: user?.employee_id,
          // Generate individual registration IDs for each team member
          team_registration_ids: formData.participants
            .filter(p => p.employee_id && p.employee_id.trim())
            .map(participant => 
              generateRegistrationId(
                participant.employee_id,
                eventId,
                participant.full_name || 'Faculty Member'
              )
            )
        } : {},
        action: 'register'
      };

      // Remove empty participants
      if (isTeamRegistration) {
        registrationData.faculty_data.participants = formData.participants.filter(p => p.employee_id.trim());
      }

      const response = await clientAPI.registerForEvent(eventId, registrationData);

      if (response.data.success) {
        setSuccess('Registration successful! Redirecting...');
        setTimeout(() => {
          navigate(`/faculty/events/${eventId}/registration-success`);
        }, 2000);
      } else {
        setError(response.data.message || 'Registration failed');
      }
    } catch (error) {
      
      setError(error.response?.data?.message || 'An error occurred during registration');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading || authLoading || !user || !user.employee_id) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <LoadingSpinner size="lg" />
            </div>
            <p className="mt-4 text-gray-600 font-medium">Loading registration form...</p>
            <p className="mt-2 text-sm text-gray-500">Please wait while we prepare your information...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (!event) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
            <p className="text-gray-600 mb-4">The requested event could not be found.</p>
            <button
              onClick={() => navigate('/faculty/events')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Browse Events
            </button>
          </div>
        </div>
      </Layout>
    );
  }



  return (
    <Layout className = "noPadding={true}">
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl w-full mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-500 shadow-lg mb-8">
              <i className="fas fa-chalkboard-teacher text-white text-3xl"></i>
            </div>
          </div>
          <div className="max-w-xl w-full mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {event?.event_name || event?.title || event?.name || 'Unknown Event'}
              </h2>
              {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded">
                  <i className="fas fa-exclamation-triangle mr-2"></i>{error}
                </div>
              )}

              {success && (
                <div className="mb-4 bg-green-50 border-l-4 border-green-400 text-green-700 px-4 py-3 rounded">
                  <i className="fas fa-check-circle mr-2"></i>{success}
                </div>
              )}
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-8">


              <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-8 space-y-6">
                {isTeamRegistration ? (
                  <>
                    {/* Team Leader Information */}
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <i className="fas fa-user-tie mr-2 text-purple-600"></i>
                        Team Leader Information
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="full_name" className="block text-sm font-semibold text-gray-800 mb-2">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            name="full_name"
                            id="full_name"
                            className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                            value={formData.full_name}
                            onChange={handleInputChange}
                          />
                        </div>

                        <div>
                          <label htmlFor="employee_id" className="block text-sm font-semibold text-gray-800 mb-2">
                            Employee ID *
                          </label>
                          <input
                            type="text"
                            name="employee_id"
                            id="employee_id"
                            className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                            required
                            value={formData.employee_id}
                            onChange={handleInputChange}
                            readOnly
                          />
                        </div>

                        <div>
                          <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                            Email ID *
                          </label>
                          <input
                            type="email"
                            name="email"
                            id="email"
                            className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                            value={formData.email}
                            onChange={handleInputChange}
                          />
                        </div>

                        <div>
                          <label htmlFor="contact_no" className="block text-sm font-semibold text-gray-800 mb-2">
                            Contact No. *
                          </label>
                          <input
                            type="tel"
                            name="contact_no"
                            id="contact_no"
                            className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                            pattern="[0-9]{10}"
                            value={formData.contact_no}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Team Information */}
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <i className="fas fa-users mr-2 text-purple-600"></i>
                        Team Information
                      </h2>
                      <div>
                        <label htmlFor="team_name" className="block text-sm font-semibold text-gray-800 mb-2">
                          Team Name *
                        </label>
                        <input
                          type="text"
                          name="team_name"
                          id="team_name"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                          value={formData.team_name}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    {/* Team Participants */}
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <i className="fas fa-user-friends mr-2 text-purple-600"></i>
                        Team Participants
                        <span className="text-sm font-normal text-gray-600 ml-2">
                          ({teamSizeMin - 1} to {teamSizeMax - 1} participants)
                        </span>
                      </h2>

                      <div className="space-y-4">
                        {formData.participants.map((participant, index) => (
                          <div key={participant.id} className="border rounded-lg p-4 bg-gray-50">
                            <h3 className="font-medium text-gray-900 mb-3">
                              Participant {index + 1}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Employee ID *
                                </label>
                                <input
                                  type="text"
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  value={participant.employee_id}
                                  onChange={(e) => handleParticipantChange(index, 'employee_id', e.target.value)}
                                  required
                                />
                                {participant.errors?.employee_id && (
                                  <p className="text-red-500 text-xs mt-1">{participant.errors.employee_id}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Full Name
                                </label>
                                <input
                                  type="text"
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                                  value={participant.full_name}
                                  readOnly
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 mt-4">
                        <button
                          type="button"
                          onClick={addParticipant}
                          disabled={participantCount >= teamSizeMax - 1}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          <i className="fas fa-plus mr-2"></i>Add Participant
                        </button>
                        <button
                          type="button"
                          onClick={removeParticipant}
                          disabled={participantCount <= teamSizeMin - 1}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          <i className="fas fa-minus mr-2"></i>Remove Participant
                        </button>
                      </div>
                    </div>

                    {/* Academic Information for Team Leader */}
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Leader Academic Information</h2>
                      <div className="grid grid-cols-1 gap-6">
                        <div>
                          <label htmlFor="department" className="block text-sm font-semibold text-gray-800 mb-2">
                            Department *
                          </label>
                          <select
                            name="department"
                            id="department"
                            className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                            value={formData.department}
                            onChange={handleInputChange}
                          >
                            <option value="">Select Department</option>
                            <option value="Computer Engineering">Computer Engineering</option>
                            <option value="Information Technology">Information Technology</option>
                            <option value="Electronics & Communication">Electronics & Communication</option>
                            <option value="Mechanical Engineering">Mechanical Engineering</option>
                            <option value="Civil Engineering">Civil Engineering</option>
                            <option value="Electrical Engineering">Electrical Engineering</option>
                            <option value="Master of Computer Applications">Master of Computer Applications</option>
                            <option value="MBA">MBA</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Individual Registration Form */}
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                        <div>
                          <label htmlFor="full_name" className="block text-sm font-semibold text-gray-800 mb-2">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            name="full_name"
                            id="full_name"
                            className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                            value={formData.full_name}
                            onChange={handleInputChange}
                          />
                        </div>

                        <div>
                          <label htmlFor="employee_id" className="block text-sm font-semibold text-gray-800 mb-2">
                            Employee ID *
                          </label>
                          <input
                            type="text"
                            name="employee_id"
                            id="employee_id"
                            className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                            required
                            value={formData.employee_id}
                            onChange={handleInputChange}
                            readOnly
                          />
                        </div>

                        <div>
                          <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                            Email ID *
                          </label>
                          <input
                            type="email"
                            name="email"
                            id="email"
                            className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                            value={formData.email}
                            onChange={handleInputChange}
                          />
                        </div>

                        <div>
                          <label htmlFor="contact_no" className="block text-sm font-semibold text-gray-800 mb-2">
                            Contact No. *
                          </label>
                          <input
                            type="tel"
                            name="contact_no"
                            id="contact_no"
                            className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                            pattern="[0-9]{10}"
                            value={formData.contact_no}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Academic Information */}
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h2>
                      <div className="grid grid-cols-1 gap-6">
                        <div>
                          <label htmlFor="department" className="block text-sm font-semibold text-gray-800 mb-2">
                            Department *
                          </label>
                          <select
                            name="department"
                            id="department"
                            className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                            value={formData.department}
                            onChange={handleInputChange}
                          >
                            <option value="">Select Department</option>
                            <option value="Computer Engineering">Computer Engineering</option>
                            <option value="Information Technology">Information Technology</option>
                            <option value="Electronics & Communication">Electronics & Communication</option>
                            <option value="Mechanical Engineering">Mechanical Engineering</option>
                            <option value="Civil Engineering">Civil Engineering</option>
                            <option value="Electrical Engineering">Electrical Engineering</option>
                            <option value="Master of Computer Applications">Master of Computer Applications</option>
                            <option value="MBA">MBA</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={submitting || registrationBlocked}
                  className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Submitting...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane mr-2"></i>
                      {isTeamRegistration ? 'Submit Team Registration' : 'Submit Registration'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FacultyEventRegistration;
