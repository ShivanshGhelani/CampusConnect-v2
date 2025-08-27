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

const FacultyEventRegistration = ({ forceTeamMode = false }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userType } = useAuth();

  // State management
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registrationBlocked, setRegistrationBlocked] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    full_name: '',
    faculty_id: '',
    email: '',
    mobile_no: '',
    department: '',
    designation: '',
    gender: '',
    date_of_birth: '',
    team_name: '',
    participants: []
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
      if (user?.faculty_id && eventId) {
        const registrationId = generateRegistrationId(
          user.faculty_id,
          eventId,
          user.full_name || 'Faculty'
        );
        setTempRegistrationId(registrationId);  // Variable name kept for compatibility
        
        // Store session data for persistence
        const sessionData = {
          sessionId: newSessionId,
          tempRegistrationId: registrationId,  // This is now a REAL ID
          eventId: eventId,
          userId: user.faculty_id,
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

  // Load event details and initialize form
  useEffect(() => {
    const loadEventDetails = async () => {
      if (!eventId) {
        setError('Event ID is required');
        setLoading(false);
        return;
      }

      try {
        const response = await clientAPI.getEventDetails(eventId);
        
        console.log('=== FACULTY API RESPONSE DEBUGGING ===');
        console.log('Full API response:', response);
        console.log('Response.data structure:', response.data);
        
        // Correctly access the event data from the API response
        const eventData = response.data.success ? response.data.event : response.data;
        
        console.log('=== FACULTY EVENT DATA DEBUGGING ===');
        console.log('Extracted eventData:', eventData);
        console.log('Event name fields:', {
          event_name: eventData?.event_name,
          title: eventData?.title,
          name: eventData?.name
        });
        console.log('Registration mode:', eventData?.registration_mode);
        console.log('Team settings:', {
          team_size_min: eventData?.team_size_min,
          team_size_max: eventData?.team_size_max
        });
        
        if (!eventData) {
          throw new Error('Event data not found in response');
        }
        
        setEvent(eventData);
        
        // Check if URL indicates team registration or use event setting
        const isTeamRoute = location.pathname.includes('/register-team');
        const shouldUseTeamMode = forceTeamMode || isTeamRoute || eventData.registration_mode === 'team';
        
        console.log('=== FACULTY REGISTRATION TYPE DEBUGGING ===');
        console.log('URL pathname:', location.pathname);
        console.log('isTeamRoute (URL contains /register-team):', isTeamRoute);
        console.log('forceTeamMode prop:', forceTeamMode);
        console.log('eventData.registration_mode:', eventData.registration_mode);
        console.log('Final shouldUseTeamMode:', shouldUseTeamMode);
        
        setIsTeamRegistration(shouldUseTeamMode);
        setTeamSizeMin(eventData.team_size_min || 2);
        setTeamSizeMax(eventData.team_size_max || 5);

        // Registration status checking is now handled by RegistrationRouter

        // Initialize form with user data (using cached data for now)
        // TODO: Fix fresh API data fetching later
        if (user) {
          // Transform gender to match frontend options (capitalize first letter)
          const transformGender = (gender) => {
            if (!gender) return '';
            return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
          };
          
          const newFormData = {
            ...formData,
            full_name: user.full_name || '',
            faculty_id: user.faculty_id || user.employee_id || '',
            email: user.email || '',
            mobile_no: user.mobile_no || user.phone_number || '',
            department: user.department || '',
            designation: user.designation || '',
            gender: transformGender(user.gender) || '',
            date_of_birth: user.date_of_birth ? formatDateForInput(user.date_of_birth) : ''
          };
          
          console.log('Setting faculty form data with cached data:', newFormData);
          setFormData(newFormData);
        } else {
          console.log('No cached faculty data available');
        }

        // Initialize participants for team registration
        if (shouldUseTeamMode) {
          const minParticipants = (eventData.team_size_min || 2) - 1; // Excluding leader
          initializeParticipants(minParticipants);
        }

      } catch (error) {
        console.error('Error loading event:', error);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    loadEventDetails();
  }, [eventId, user, location.pathname, forceTeamMode]);

  // Initialize participants array for team registration
  const initializeParticipants = useCallback((count) => {
    const participants = Array(count).fill(null).map((_, index) => ({
      id: index + 1,
      faculty_id: '',
      full_name: '',
      email: '',
      mobile_no: '',
      department: '',
      designation: '',
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
    if (!participant.faculty_id.trim()) {
      return { isValid: false, errors: { faculty_id: 'Faculty ID is required' } };
    }

    try {
      const response = await clientAPI.validateFacultyParticipant(participant.faculty_id);
      if (response.data.valid) {
        return {
          isValid: true,
          errors: {},
          data: response.data.faculty
        };
      } else {
        return {
          isValid: false,
          errors: { faculty_id: response.data.message || 'Invalid Faculty ID' }
        };
      }
    } catch (error) {
      return {
        isValid: false,
        errors: { faculty_id: 'Error validating Faculty ID' }
      };
    }
  };

  // Add participant
  const addParticipant = () => {
    if (participantCount >= teamSizeMax - 1) return;
    
    const newParticipant = {
      id: participantCount + 1,
      faculty_id: '',
      full_name: '',
      email: '',
      mobile_no: '',
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
    if (!formData.faculty_id.trim()) errors.push('Faculty ID is required');
    if (!formData.email.trim()) errors.push('Email is required');
    if (!formData.mobile_no.trim()) errors.push('Mobile number is required');
    if (!formData.department) errors.push('Department is required');
    if (!formData.designation) errors.push('Designation is required');
    if (!formData.gender) errors.push('Gender is required');
    if (!formData.date_of_birth) errors.push('Date of birth is required');
    
    // Team specific validation
    if (isTeamRegistration) {
      if (!formData.team_name.trim()) errors.push('Team name is required');
      
      // Validate participants
      const invalidParticipants = formData.participants.filter(p => !p.isValid);
      if (invalidParticipants.length > 0) {
        errors.push('Please ensure all team members have valid Faculty IDs');
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
    const validationResult = validateFormData(formData, {
      full_name: validators.required,
      faculty_id: validators.faculty,
      email: validators.email,
      mobile_no: validators.mobileNumber,
      department: validators.required,
      designation: validators.required,
      gender: validators.required,
      date_of_birth: validators.required
    });

    if (!validationResult.isValid) {
      setError(`Validation failed: ${validationResult.errors.join(', ')}`);
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
        ...formData,
        event_id: eventId,
        registration_type: isTeamRegistration ? 'team' : 'individual',
        user_type: 'faculty'
      };
      
      // Remove empty participants
      if (isTeamRegistration) {
        registrationData.participants = formData.participants.filter(p => p.faculty_id.trim());
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
      console.error('Registration error:', error);
      setError(error.response?.data?.message || 'An error occurred during registration');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" />
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
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-500 shadow-lg mb-8">
              <i className="fas fa-chalkboard-teacher text-white text-3xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Faculty Registration for {event?.event_name || event?.title || event?.name || 'Unknown Event'}
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Please fill out the form below to participate in this event.
            </p>
            
            {user && (
              <div className="bg-purple-50 border-l-4 border-purple-400 text-purple-700 px-4 py-3 rounded mb-4">
                <i className="fas fa-user mr-2"></i>
                Logged in as: <strong>{user.full_name}</strong> ({user.faculty_id || user.employee_id})
              </div>
            )}
            
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
            {/* Registration Mode Display */}
            <div className="bg-purple-50 border-l-4 border-purple-400 text-purple-700 px-4 py-3 rounded mb-4">
              <i className="fas fa-info-circle mr-2"></i>
              <strong>Registration Mode:</strong> 
              {isTeamRegistration ? (
                ` Team Registration (${teamSizeMin}-${teamSizeMax} members including leader)`
              ) : (
                ' Individual Registration'
              )}
            </div>

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
                        <label htmlFor="faculty_id" className="block text-sm font-semibold text-gray-800 mb-2">
                          Faculty ID *
                        </label>
                        <input
                          type="text"
                          name="faculty_id"
                          id="faculty_id"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                          required
                          value={formData.faculty_id}
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
                        <label htmlFor="mobile_no" className="block text-sm font-semibold text-gray-800 mb-2">
                          Mobile No. *
                        </label>
                        <input
                          type="tel"
                          name="mobile_no"
                          id="mobile_no"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                          pattern="[0-9]{10}"
                          value={formData.mobile_no}
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
                                Faculty ID *
                              </label>
                              <input
                                type="text"
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                value={participant.faculty_id}
                                onChange={(e) => handleParticipantChange(index, 'faculty_id', e.target.value)}
                                required
                              />
                              {participant.errors?.faculty_id && (
                                <p className="text-red-500 text-xs mt-1">{participant.errors.faculty_id}</p>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                      <div>
                        <label htmlFor="designation" className="block text-sm font-semibold text-gray-800 mb-2">
                          Designation *
                        </label>
                        <select
                          name="designation"
                          id="designation"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                          value={formData.designation}
                          onChange={handleInputChange}
                        >
                          <option value="">Select Designation</option>
                          <option value="Professor">Professor</option>
                          <option value="Associate Professor">Associate Professor</option>
                          <option value="Assistant Professor">Assistant Professor</option>
                          <option value="Lecturer">Lecturer</option>
                          <option value="Lab Assistant">Lab Assistant</option>
                          <option value="HOD">HOD</option>
                          <option value="Principal">Principal</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information for Team Leader */}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="gender" className="block text-sm font-semibold text-gray-800 mb-2">
                          Gender *
                        </label>
                        <select
                          name="gender"
                          id="gender"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                          value={formData.gender}
                          onChange={handleInputChange}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="date_of_birth" className="block text-sm font-semibold text-gray-800 mb-2">
                          Date of Birth *
                        </label>
                        <input
                          type="date"
                          name="date_of_birth"
                          id="date_of_birth"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                          value={formData.date_of_birth}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Individual Registration Form */}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
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
                        <label htmlFor="faculty_id" className="block text-sm font-semibold text-gray-800 mb-2">
                          Faculty ID *
                        </label>
                        <input
                          type="text"
                          name="faculty_id"
                          id="faculty_id"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                          required
                          value={formData.faculty_id}
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
                        <label htmlFor="mobile_no" className="block text-sm font-semibold text-gray-800 mb-2">
                          Mobile No. *
                        </label>
                        <input
                          type="tel"
                          name="mobile_no"
                          id="mobile_no"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                          pattern="[0-9]{10}"
                          value={formData.mobile_no}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Academic Information */}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                      <div>
                        <label htmlFor="designation" className="block text-sm font-semibold text-gray-800 mb-2">
                          Designation *
                        </label>
                        <select
                          name="designation"
                          id="designation"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                          value={formData.designation}
                          onChange={handleInputChange}
                        >
                          <option value="">Select Designation</option>
                          <option value="Professor">Professor</option>
                          <option value="Associate Professor">Associate Professor</option>
                          <option value="Assistant Professor">Assistant Professor</option>
                          <option value="Lecturer">Lecturer</option>
                          <option value="Lab Assistant">Lab Assistant</option>
                          <option value="HOD">HOD</option>
                          <option value="Principal">Principal</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="gender" className="block text-sm font-semibold text-gray-800 mb-2">
                          Gender *
                        </label>
                        <select
                          name="gender"
                          id="gender"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                          value={formData.gender}
                          onChange={handleInputChange}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="date_of_birth" className="block text-sm font-semibold text-gray-800 mb-2">
                          Date of Birth *
                        </label>
                        <input
                          type="date"
                          name="date_of_birth"
                          id="date_of_birth"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                          value={formData.date_of_birth}
                          onChange={handleInputChange}
                        />
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
    </Layout>
  );
};

export default FacultyEventRegistration;
