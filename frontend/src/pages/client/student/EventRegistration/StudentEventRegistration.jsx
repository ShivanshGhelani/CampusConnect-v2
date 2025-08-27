import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { clientAPI } from '../../../../api/client';
import Layout from '../../../../components/client/Layout';
import LoadingSpinner from '../../../../components/LoadingSpinner';
// Phase 1 Integration: Validation & ID Generation
import { validators, useValidation, validateForm } from '../../../../utils/validators';
import { 
  generateRegistrationId,      // FIXED: Use real ID instead of temp
  generateTeamRegistrationId,  // FIXED: Use real team ID instead of temp
  generateSessionId,
  idValidators 
} from '../../../../utils/idGenerator';

const StudentEventRegistration = ({ forceTeamMode = false }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userType } = useAuth();

  // Refs to track execution state
  const eventLoadingRef = useRef(false);
  const profileLoadingRef = useRef(false);

  // State management
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registrationBlocked, setRegistrationBlocked] = useState(false);
  const [eventLoaded, setEventLoaded] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    full_name: '',
    enrollment_no: '',
    email: '',
    mobile_no: '',
    department: '',
    semester: '',
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
  const { validationErrors, validateForm: validateHookForm, clearValidationError } = useValidation();
  const [sessionId, setSessionId] = useState(null);
  const [tempRegistrationId, setTempRegistrationId] = useState(null);
  const [tempTeamId, setTempTeamId] = useState(null);
  const [formSession, setFormSession] = useState(null);

  // Initialize session and IDs
  useEffect(() => {
    const initializeSession = () => {
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);
      
      // Generate REAL registration ID (not temp)
      if (user?.enrollment_no && eventId) {
        const registrationId = generateRegistrationId(
          user.enrollment_no,
          eventId,
          user.full_name || 'Student'
        );
        setTempRegistrationId(registrationId);  // Variable name kept for compatibility
        
        // Store session data for persistence
        const sessionData = {
          sessionId: newSessionId,
          tempRegistrationId: registrationId,  // This is now a REAL ID
          eventId: eventId,
          userId: user.enrollment_no,
          timestamp: Date.now()
        };
        localStorage.setItem(`registration_session_${eventId}`, JSON.stringify(sessionData));
        setFormSession(sessionData);
      }
    };
    
    if (user && eventId) {
      initializeSession();
    }
  }, [user, eventId]);

  // Generate team ID when team registration is enabled
  useEffect(() => {
    if (isTeamRegistration && formData.team_name && eventId) {
      const teamIdValue = generateTeamRegistrationId(
        formData.team_name,
        eventId,
        user?.enrollment_no || user?.full_name || 'Leader'
      );
      setTempTeamId(teamIdValue);
    }
  }, [isTeamRegistration, formData.team_name, eventId, user?.full_name]);

  // Utility functions
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const calculateYear = (semester) => {
    const sem = parseInt(semester);
    if (sem >= 1 && sem <= 8) {
      return Math.floor((sem - 1) / 2) + 1;
    }
    return '';
  };

  // Debug formData changes - only for important fields
  useEffect(() => {
    if (formData.mobile_no || formData.gender || formData.semester) {
      console.log('Form data updated:', {
        mobile_no: formData.mobile_no,
        gender: formData.gender,
        semester: formData.semester,
        profileLoaded: profileLoaded,
        eventLoaded: eventLoaded
      });
    }
  }, [formData.mobile_no, formData.gender, formData.semester, profileLoaded, eventLoaded]); // Track loading states too

  // Load complete profile data - SEPARATE FROM EVENT LOADING
  useEffect(() => {
    if (!user || !user.enrollment_no || profileLoaded || profileLoadingRef.current) return;
    
    profileLoadingRef.current = true; // Prevent multiple executions
    
    const loadProfileData = async () => {
      try {
        console.log('Loading complete profile data...');
        const response = await clientAPI.getProfile();
        
        if (response.data.success && response.data.student) {
          const profileData = response.data.student;
          console.log('Profile data loaded:', profileData);
          
          // Transform gender to match frontend options (capitalize first letter)
          const transformGender = (gender) => {
            if (!gender) return '';
            return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
          };
          
          setFormData(prev => ({
            ...prev,
            full_name: profileData.full_name || prev.full_name,
            enrollment_no: profileData.enrollment_number || prev.enrollment_no,
            email: profileData.email || prev.email,
            mobile_no: profileData.phone_number || profileData.mobile_no || prev.mobile_no,
            department: profileData.department || prev.department,
            semester: profileData.semester || prev.semester,
            gender: transformGender(profileData.gender) || prev.gender,
            date_of_birth: profileData.date_of_birth ? formatDateForInput(profileData.date_of_birth) : prev.date_of_birth,
          }));
          
          setProfileLoaded(true);
          
          // Update year display after profile load
          setTimeout(() => {
            const yearElement = document.getElementById('year');
            if (yearElement && profileData.semester) {
              const year = calculateYear(profileData.semester);
              yearElement.textContent = year || '-';
            }
          }, 100);
        } else {
          console.log('No profile data in response, using AuthContext data');
          setProfileLoaded(true);
        }
      } catch (error) {
        console.warn('Failed to load complete profile data:', error);
        // Fallback to user data from AuthContext
        setProfileLoaded(true);
      } finally {
        profileLoadingRef.current = false;
      }
    };

    loadProfileData();
  }, [user?.enrollment_no]); // Only depend on user enrollment to avoid unnecessary calls

  // Load event details and initialize form - ONLY ONCE
  useEffect(() => {
    if (eventLoaded || !eventId || eventLoadingRef.current) return;
    
    eventLoadingRef.current = true; // Prevent multiple executions
    console.log('Loading event details for eventId:', eventId);
    
    const loadEventDetails = async () => {
      try {
        setEventLoaded(true); // Set immediately to prevent multiple calls
        
        const response = await clientAPI.getEventDetails(eventId);
        
        // Correctly access the event data from the API response
        const eventData = response.data.success ? response.data.event : response.data;
        
        if (!eventData) {
          throw new Error('Event data not found in response');
        }
        
        setEvent(eventData);
        
        // Check registration deadline and block if necessary
        const now = new Date();
        const registrationStart = eventData.registration_start_date ? new Date(eventData.registration_start_date) : null;
        const registrationEnd = eventData.registration_end_date ? new Date(eventData.registration_end_date) : null;
        
        let shouldBlockRegistration = false;
        
        // Check if registration is not yet open
        if (registrationStart && now < registrationStart) {
          shouldBlockRegistration = true;
          setError(`Registration opens on ${registrationStart.toLocaleDateString()} at ${registrationStart.toLocaleTimeString()}`);
        }
        
        // Check if registration has closed
        if (registrationEnd && now > registrationEnd) {
          shouldBlockRegistration = true;
          setError(`Registration closed on ${registrationEnd.toLocaleDateString()} at ${registrationEnd.toLocaleTimeString()}`);
        }
        
        // Check event status
        if (eventData.status !== 'upcoming' || eventData.sub_status !== 'registration_open') {
          shouldBlockRegistration = true;
          setError('Registration is currently not available for this event');
        }
        
        setRegistrationBlocked(shouldBlockRegistration);
        
        // Check if URL indicates team registration or use event setting
        const isTeamRoute = location.pathname.includes('/register-team');
        const shouldUseTeamMode = forceTeamMode || isTeamRoute || eventData.registration_mode === 'team';
        
        setIsTeamRegistration(shouldUseTeamMode);
        setTeamSizeMin(eventData.team_size_min || 2);
        setTeamSizeMax(eventData.team_size_max || 5);

        // Initialize form with user data (only if profile not already loaded)        
        if (user && !profileLoaded) {
          // Transform gender to match frontend options (capitalize first letter)
          const transformGender = (gender) => {
            if (!gender) return '';
            return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
          };
          
          const newFormData = {
            full_name: user.full_name || '',
            enrollment_no: user.enrollment_no || '',
            email: user.email || '',
            mobile_no: user.mobile_no || user.phone_number || '',
            department: user.department || '',
            semester: user.semester || '',
            gender: transformGender(user.gender) || '',
            date_of_birth: user.date_of_birth ? formatDateForInput(user.date_of_birth) : '',
            team_name: '',
            participants: []
          };
          
          setFormData(newFormData);
          
          // Also update the year display immediately after setting form data
          setTimeout(() => {
            const yearElement = document.getElementById('year');
            if (yearElement && newFormData.semester) {
              const year = calculateYear(newFormData.semester);
              yearElement.textContent = year || '-';
            }
          }, 100);
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
        eventLoadingRef.current = false; // Reset ref
      }
    };

    loadEventDetails();
  }, [eventId]); // Only depend on eventId

  // Reset flags when eventId changes
  useEffect(() => {
    setEventLoaded(false);
    setLoading(true);
    eventLoadingRef.current = false;
    // Don't reset profile data when changing events - it's user-specific, not event-specific
  }, [eventId]);

  // Update loading state when event loads (don't wait for profile)
  useEffect(() => {
    if (eventLoaded) {
      setLoading(false);
    }
  }, [eventLoaded]);

  // Initialize participants array for team registration
  const initializeParticipants = useCallback((count) => {
    const participants = Array(count).fill(null).map((_, index) => ({
      id: index + 1,
      enrollment_no: '',
      full_name: '',
      email: '',
      mobile_no: '',
      department: '',
      semester: '',
      year: '',
      isValid: false,
      isValidating: false,
      validationError: ''
    }));
    
    setFormData(prev => ({ ...prev, participants }));
    setParticipantCount(count);
  }, []);

  // Phase 1 Integration: Enhanced form field changes with validation
  const handleFieldChange = (field, value) => {
    // Clear any existing validation error for this field
    clearValidationError(field);
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Phase 1: Real-time validation
    if (value && value.trim()) {
      let validationResult = null;
      
      switch(field) {
        case 'enrollment_no':
          validationResult = validators.enrollmentNumber(value);
          break;
        case 'email':
          validationResult = validators.email(value);
          break;
        case 'mobile_no':
          validationResult = validators.mobileNumber(value);
          break;
        case 'full_name':
          validationResult = validators.required(value, 'Full name');
          break;
        case 'team_name':
          if (isTeamRegistration) {
            validationResult = validators.required(value, 'Team name');
          }
          break;
        default:
          break;
      }
      
      // If validation failed, show error
      if (validationResult && !validationResult.isValid) {
        setTimeout(() => {
          // Use a small delay to avoid race conditions
          const fieldErrors = {};
          fieldErrors[field] = validationResult.message;
          Object.keys(fieldErrors).forEach(errorField => {
            if (fieldErrors[errorField]) {
              document.getElementById(errorField)?.setCustomValidity?.(fieldErrors[errorField]);
            }
          });
        }, 100);
      }
    }

    // Auto-calculate year when semester changes
    if (field === 'semester') {
      const year = calculateYear(value);
      // Update year display if element exists
      const yearElement = document.getElementById('year');
      if (yearElement) {
        yearElement.textContent = year || '-';
      }
    }
    
    // Update session data for persistence
    if (formSession) {
      const updatedSession = {
        ...formSession,
        formData: { ...formData, [field]: value },
        lastUpdated: Date.now()
      };
      localStorage.setItem(`registration_session_${eventId}`, JSON.stringify(updatedSession));
    }
  };

  // Phase 1 Integration: Enhanced participant field changes with validation
  const handleParticipantChange = (participantId, field, value) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map(p => 
        p.id === participantId 
          ? { ...p, [field]: value, validationError: '' }
          : p
      )
    }));
    
    // Phase 1: Real-time validation for participant fields
    if (field === 'enrollment_no' && value && value.trim()) {
      // Debounce validation to avoid too many calls
      setTimeout(() => {
        validateParticipantEnrollment(participantId, value.trim());
      }, 500);
    } else if (field === 'email' && value && value.trim()) {
      const emailValidation = validators.validationResult.email(value);
      if (!emailValidation.isValid) {
        setFormData(prev => ({
          ...prev,
          participants: prev.participants.map(p => 
            p.id === participantId 
              ? { ...p, validationError: emailValidation.message }
              : p
          )
        }));
      }
    } else if (field === 'mobile_no' && value && value.trim()) {
      const phoneValidation = validators.validationResult.phone(value);
      if (!phoneValidation.isValid) {
        setFormData(prev => ({
          ...prev,
          participants: prev.participants.map(p => 
            p.id === participantId 
              ? { ...p, validationError: phoneValidation.message }
              : p
          )
        }));
      }
    }
  };

  // Phase 1 Integration: Frontend-only participant validation
  const validateParticipantEnrollment = async (participantId, enrollmentNo) => {
    if (!enrollmentNo || !enrollmentNo.trim()) {
      return;
    }

    // Safety check to ensure formData is initialized
    if (!formData || !formData.participants) {
      console.error('FormData not properly initialized');
      return;
    }

    // Update validation state
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map(p => 
        p.id === participantId 
          ? { ...p, isValidating: true, validationError: '' }
          : p
      )
    }));

    // Phase 1: Use frontend validation for format check
    const enrollmentValidation = validators.validationResult.enrollment(enrollmentNo);
    if (!enrollmentValidation.isValid) {
      setFormData(prev => ({
        ...prev,
        participants: prev.participants.map(p => 
          p.id === participantId 
            ? { 
                ...p, 
                isValidating: false, 
                isValid: false,
                validationError: enrollmentValidation.message
              }
            : p
        )
      }));
      return;
    }

    // Check for duplicates using the current state
    setFormData(prev => {
      const leaderEnrollment = prev.enrollment_no?.trim()?.toUpperCase() || '';
      const otherParticipants = prev.participants
        ?.filter(p => p.id !== participantId && p.enrollment_no?.trim())
        ?.map(p => p.enrollment_no.trim().toUpperCase()) || [];

      if (enrollmentNo.toUpperCase() === leaderEnrollment) {
        return {
          ...prev,
          participants: prev.participants.map(p => 
            p.id === participantId 
              ? { 
                  ...p, 
                  isValidating: false, 
                  isValid: false,
                  validationError: 'Team leader cannot be added as participant' 
                }
              : p
          )
        };
      }

      if (otherParticipants.includes(enrollmentNo.toUpperCase())) {
        return {
          ...prev,
          participants: prev.participants.map(p => 
            p.id === participantId 
              ? { 
                  ...p, 
                  isValidating: false, 
                  isValid: false,
                  validationError: 'Duplicate enrollment number in team' 
                }
              : p
          )
        };
      }

      // If format is valid and no duplicates, fetch student data from API
      return prev;
    });

    // Fetch student data from API for auto-fill
    try {
      const response = await clientAPI.lookupStudent(enrollmentNo);
      
      if (response.data.success && response.data.found) {
        const studentData = response.data.student_data;
        
        // Update participant with fetched data
        setFormData(prev => ({
          ...prev,
          participants: prev.participants.map(p => 
            p.id === participantId 
              ? { 
                  ...p, 
                  isValidating: false, 
                  isValid: true,
                  validationError: '',
                  // Auto-fill with fetched data
                  full_name: studentData.full_name || '',
                  email: studentData.email || '',
                  mobile_no: studentData.mobile_no || '',
                  department: studentData.department || '',
                  semester: studentData.semester || '',
                  year: studentData.semester ? calculateYear(studentData.semester) : ''
                }
              : p
          )
        }));
      } else {
        // Student not found in database
        setFormData(prev => ({
          ...prev,
          participants: prev.participants.map(p => 
            p.id === participantId 
              ? { 
                  ...p, 
                  isValidating: false, 
                  isValid: false,
                  validationError: 'Student not found in database'
                }
              : p
          )
        }));
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
      setFormData(prev => ({
        ...prev,
        participants: prev.participants.map(p => 
          p.id === participantId 
            ? { 
                ...p, 
                isValidating: false, 
                isValid: false,
                validationError: 'Error validating enrollment number'
              }
            : p
        )
      }));
    }
  };

  // Add participant
  const addParticipant = () => {
    const maxParticipants = teamSizeMax - 1; // Excluding leader
    if (participantCount >= maxParticipants) {
      setError('Maximum team size reached!');
      return;
    }

    const newParticipant = {
      id: participantCount + 1,
      enrollment_no: '',
      full_name: '',
      email: '',
      mobile_no: '',
      department: '',
      semester: '',
      year: '',
      isValid: false,
      isValidating: false,
      validationError: ''
    };

    setFormData(prev => ({
      ...prev,
      participants: [...(prev.participants || []), newParticipant]
    }));
    setParticipantCount(prev => prev + 1);
  };

  // Remove participant
  const removeParticipant = () => {
    const minParticipants = teamSizeMin - 1; // Excluding leader
    if (participantCount <= minParticipants) {
      setError(`Minimum ${minParticipants} participants required!`);
      return;
    }

    setFormData(prev => ({
      ...prev,
      participants: (prev.participants || []).slice(0, -1)
    }));
    setParticipantCount(prev => prev - 1);
  };

  // Phase 1 Integration: Enhanced form submission with frontend validation and temporary IDs
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (registrationBlocked) {
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Phase 1: Frontend validation before submission
      const formValidation = validateForm(formData, {
        full_name: ['required', 'name'],
        enrollment_no: ['required', 'enrollmentNumber'],
        email: ['required', 'email'],
        mobile_no: ['required', 'mobileNumber'],
        department: ['required'],
        semester: ['required', 'semester'],
        gender: ['required'],
        date_of_birth: ['required', 'dateFormat']
      });

      if (!formValidation.isValid) {
        const errors = formValidation.errors || {};
        const errorMessages = Object.entries(errors).map(([field, error]) => `${field}: ${error}`);
        throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
      }

      // Validate required fields
      const requiredFields = ['full_name', 'enrollment_no', 'email', 'mobile_no', 'department', 'semester', 'gender', 'date_of_birth'];
      
      for (const field of requiredFields) {
        if (!formData[field] || !formData[field].toString().trim()) {
          throw new Error('Please fill in all required fields');
        }
      }

      // Prepare registration data with Phase 1 enhancements
      const registrationData = {
        registration_type: isTeamRegistration ? 'team' : 'individual',
        full_name: formData.full_name.trim(),
        enrollment_no: formData.enrollment_no.trim(),
        email: formData.email.trim(),
        mobile_no: formData.mobile_no.trim(),
        department: formData.department,
        semester: parseInt(formData.semester),
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
        // FIXED: Send real registration_id generated by frontend
        session_id: sessionId,
        registration_id: tempRegistrationId,  // This is now a REAL ID, not temp
        frontend_validated: true, // Flag to indicate frontend validation passed
        validation_timestamp: Date.now()
      };

      // Add team-specific data with Phase 1 enhancements
      if (isTeamRegistration) {
        if (!formData.team_name || !formData.team_name.trim()) {
          throw new Error('Please enter a team name');
        }

        const validParticipants = (formData.participants || []).filter(p => p.enrollment_no && p.enrollment_no.trim());
        const totalTeamSize = validParticipants.length + 1; // +1 for leader

        if (totalTeamSize < teamSizeMin) {
          throw new Error(`Team must have at least ${teamSizeMin} members including leader`);
        }

        if (totalTeamSize > teamSizeMax) {
          throw new Error(`Team cannot exceed ${teamSizeMax} members including leader`);
        }

        // Phase 1: Enhanced participant validation
        const invalidParticipants = validParticipants.filter(p => {
          // Check both frontend validation and enrollment format
          const enrollmentValidation = validators.validationResult.enrollment(p.enrollment_no);
          return !p.isValid || !enrollmentValidation.isValid;
        });
        
        if (invalidParticipants.length > 0) {
          throw new Error('Please ensure all participants have valid enrollment numbers');
        }

        registrationData.team_name = formData.team_name.trim();
        registrationData.temp_team_id = tempTeamId; // Phase 1: Include temporary team ID
        registrationData.team_members = validParticipants.map(p => ({
          enrollment_no: p.enrollment_no.trim(),
          name: p.full_name,
          email: p.email,
          mobile_no: p.mobile_no
        }));
      }

      // Submit registration using appropriate API method
      let response;
      if (isTeamRegistration) {
        response = await clientAPI.registerTeam(eventId, registrationData);
      } else {
        response = await clientAPI.registerIndividual(eventId, registrationData);
      }
      
      console.log('Registration API response:', response);
      
      setSuccess('Registration submitted successfully!');
      
      // Phase 1: Clean up session data after successful submission
      if (formSession) {
        localStorage.removeItem(`registration_session_${eventId}`);
        setFormSession(null);
      }
      
      // Prepare data for success page
      const successData = {
        registrationData: {
          registration_id: response.data.registration_id || response.data.registrar_id,
          registration_type: registrationData.registration_type,
          full_name: registrationData.full_name,
          enrollment_no: registrationData.enrollment_no,
          payment_status: response.data.payment_status || 'free',
          team_name: registrationData.team_name,
          registration_id: tempRegistrationId, // FIXED: Real registration ID from frontend
          session_id: sessionId, // Session ID for tracking
          team_info: isTeamRegistration ? {
            team_name: registrationData.team_name,
            team_registration_id: tempTeamId, // FIXED: Real team ID from frontend
            participant_count: (registrationData.team_members?.length || 0) + 1,
            leader_name: registrationData.full_name,
            leader_enrollment: registrationData.enrollment_no,
            participants: registrationData.team_members || []
          } : null
        },
        event: event
      };
      
      // Redirect to success page with data
      setTimeout(() => {
        navigate(`/client/events/${eventId}/registration-success`, {
          state: successData
        });
      }, 2000);

    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response?.status === 409) {
        // User is already registered - redirect to already registered page
        console.log('User already registered, redirecting to already registered page');
        navigate(`/student/events/${eventId}/already-registered`, {
          state: { event: event }
        });
        return;
      } else if (error.response?.status === 400) {
        setError(error.response.data.message || 'Invalid registration data');
      } else if (error.message) {
        setError(error.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  // Render error state if no event
  if (!event) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
            <p className="text-gray-600 mb-4">The requested event could not be found.</p>
            <button
              onClick={() => navigate('/client/events')}
              className="btn-primary"
            >
              Back to Events
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-100 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-green-500 shadow-lg mb-8">
              <i className="fas fa-clipboard-list text-white text-3xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Register for {event?.event_name || event?.title || event?.name || 'Unknown Event'}
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Please fill out the form below to participate in this event.
            </p>

            {/* Error message */}
            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                {error}
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="mb-4 bg-green-50 border-l-4 border-green-400 text-green-700 px-4 py-3 rounded">
                <i className="fas fa-check-circle mr-2"></i>
                {success}
              </div>
            )}
          </div>

          {/* Registration Form */}
          <form 
            onSubmit={handleSubmit} 
            className={`space-y-8 ${registrationBlocked ? 'pointer-events-none opacity-60' : ''}`}
          >

            <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-8 space-y-6">
              {isTeamRegistration ? (
                <>
                  {/* Team Leader Information */}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <i className="fas fa-user-tie mr-2 text-blue-600"></i>
                      Team Leader Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="full_name" className="block text-sm font-semibold text-gray-800 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => handleFieldChange('full_name', e.target.value)}
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="enrollment_no" className="block text-sm font-semibold text-gray-800 mb-2">
                          Enrollment No. *
                        </label>
                        <input
                          type="text"
                          id="enrollment_no"
                          value={formData.enrollment_no}
                          onChange={(e) => handleFieldChange('enrollment_no', e.target.value)}
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                          required
                          placeholder="e.g., 21BECE40015"
                          pattern="^\d{2}[A-Z]{2,4}\d{5}$"
                          readOnly
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                          Email ID *
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={formData.email}
                          onChange={(e) => handleFieldChange('email', e.target.value)}
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          placeholder="Institute email"
                        />
                      </div>

                      <div>
                        <label htmlFor="mobile_no" className="block text-sm font-semibold text-gray-800 mb-2">
                          Mobile No. *
                        </label>
                        <input
                          type="tel"
                          id="mobile_no"
                          value={formData.mobile_no}
                          onChange={(e) => handleFieldChange('mobile_no', e.target.value)}
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          pattern="[0-9]{10}"
                          placeholder="10 digit mobile number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Team Information */}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <i className="fas fa-users mr-2 text-blue-600"></i>
                      Team Information
                    </h2>
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label htmlFor="team_name" className="block text-sm font-semibold text-gray-800 mb-2">
                          Team Name *
                        </label>
                        <input
                          type="text"
                          id="team_name"
                          value={formData.team_name}
                          onChange={(e) => handleFieldChange('team_name', e.target.value)}
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          placeholder="Enter your team name"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Team Participants */}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <i className="fas fa-user-friends mr-2 text-blue-600"></i>
                      Team Participants
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        ({teamSizeMin - 1} to {teamSizeMax - 1} participants)
                      </span>
                    </h2>
                    
                    <div className="space-y-4">
                      {(formData.participants || []).map((participant) => (
                        <div key={participant.id} className="border rounded-lg p-4 bg-gray-50">
                          <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                            <i className="fas fa-user mr-2 text-blue-600"></i>
                            Participant {participant.id}
                            <span className="ml-2 text-sm font-normal text-gray-600">
                              {participant.isValidating && <span className="text-blue-600">(Validating...)</span>}
                              {participant.isValid && !participant.validationError && <span className="text-green-600">(✓ Valid)</span>}
                              {participant.validationError && <span className="text-red-600">(⚠ {participant.validationError})</span>}
                            </span>
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Enrollment No. *
                              </label>
                              <input
                                type="text"
                                value={participant.enrollment_no}
                                onChange={(e) => {
                                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                  handleParticipantChange(participant.id, 'enrollment_no', value);
                                }}
                                onBlur={(e) => {
                                  if (e.target.value.trim()) {
                                    validateParticipantEnrollment(participant.id, e.target.value.trim());
                                  }
                                }}
                                className="block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                placeholder="e.g., 21BECE40015"
                                pattern="^\d{2}[A-Z]{2,4}\d{5}$"
                              />
                              {participant.validationError && (
                                <div className="text-red-500 text-sm mt-1">
                                  {participant.validationError}
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                              <input
                                type="text"
                                value={participant.full_name}
                                className="block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                                readOnly
                                placeholder="Will be auto-filled"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Email ID</label>
                              <input
                                type="email"
                                value={participant.email}
                                className="block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                                readOnly
                                placeholder="Will be auto-filled"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile No.</label>
                              <input
                                type="tel"
                                value={participant.mobile_no}
                                className="block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                                readOnly
                                placeholder="Will be auto-filled"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                              <input
                                type="text"
                                value={participant.department}
                                className="block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                                readOnly
                                placeholder="Will be auto-filled"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Semester & Year</label>
                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  value={participant.semester}
                                  className="block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                                  readOnly
                                  placeholder="Semester"
                                />
                                <input
                                  type="text"
                                  value={participant.year}
                                  className="block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                                  readOnly
                                  placeholder="Year"
                                />
                              </div>
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
                        className={`bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center ${
                          participantCount >= teamSizeMax - 1 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <i className="fas fa-plus mr-2"></i>Add Participant
                      </button>
                      <button
                        type="button"
                        onClick={removeParticipant}
                        disabled={participantCount <= teamSizeMin - 1}
                        className={`bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center ${
                          participantCount <= teamSizeMin - 1 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <i className="fas fa-minus mr-2"></i>Remove Participant
                      </button>
                    </div>
                    
                    <div className="text-sm text-gray-600 mt-2">
                      <i className="fas fa-info-circle mr-1"></i>
                      Enter enrollment numbers of your team members. Their details will be validated automatically.
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
                          id="department"
                          value={formData.department}
                          onChange={(e) => handleFieldChange('department', e.target.value)}
                          className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
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
                        <label htmlFor="semester" className="block text-sm font-semibold text-gray-800 mb-2">
                          Semester *
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <select
                            id="semester"
                            value={formData.semester}
                            onChange={(e) => handleFieldChange('semester', e.target.value)}
                            className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Select</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                              <option key={sem} value={sem}>{sem}</option>
                            ))}
                          </select>
                          <div className="flex items-center">
                            <span className="text-sm text-gray-800 font-medium">
                              Year: <span id="year" className="text-lg font-semibold text-blue-600 ml-1">
                                {calculateYear(formData.semester) || '-'}
                              </span>
                            </span>
                          </div>
                        </div>
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
                          id="gender"
                          value={formData.gender}
                          onChange={(e) => handleFieldChange('gender', e.target.value)}
                          className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
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
                          id="date_of_birth"
                          value={formData.date_of_birth}
                          onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
                          className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Individual Registration Form */}
                  {/* Personal Information */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                      {!profileLoaded && user && (
                        <div className="flex items-center text-sm text-blue-600">
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Loading complete profile...
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="full_name" className="block text-sm font-semibold text-gray-800 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => handleFieldChange('full_name', e.target.value)}
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="enrollment_no" className="block text-sm font-semibold text-gray-800 mb-2">
                          Enrollment No. *
                        </label>
                        <input
                          type="text"
                          id="enrollment_no"
                          value={formData.enrollment_no}
                          onChange={(e) => handleFieldChange('enrollment_no', e.target.value)}
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                          required
                          placeholder="e.g., 21BECE40015"
                          pattern="^\d{2}[A-Z]{2,4}\d{5}$"
                          readOnly
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                          Email ID *
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={formData.email}
                          onChange={(e) => handleFieldChange('email', e.target.value)}
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          placeholder="Institute email"
                        />
                      </div>

                      <div>
                        <label htmlFor="mobile_no" className="block text-sm font-semibold text-gray-800 mb-2">
                          Mobile No. *
                        </label>
                        <input
                          type="tel"
                          id="mobile_no"
                          value={formData.mobile_no}
                          onChange={(e) => handleFieldChange('mobile_no', e.target.value)}
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          pattern="[0-9]{10}"
                          placeholder="10 digit mobile number"
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
                          id="department"
                          value={formData.department}
                          onChange={(e) => handleFieldChange('department', e.target.value)}
                          className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        >
                          <option value="">Select Department</option>
                          <option value="Computer Engineering">Computer Engineering</option>
                          <option value="Information Technology">Information Technology</option>
                          <option value="Electronics & Communication">Electronics & Communication</option>
                          <option value="Mechanical Engineering">Mechanical Engineering</option>
                          <option value="Civil Engineering">Civil Engineering</option>
                          <option value="Electrical Engineering">Electrical Engineering</option>
                          <option value="Chemical Engineering">Chemical Engineering</option>
                          <option value="Master of Computer Applications">Master of Computer Applications</option>
                          <option value="MBA">MBA</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="semester" className="block text-sm font-semibold text-gray-800 mb-2">
                          Semester *
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <select
                            id="semester"
                            value={formData.semester}
                            onChange={(e) => handleFieldChange('semester', e.target.value)}
                            className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Select</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                              <option key={sem} value={sem}>{sem}</option>
                            ))}
                          </select>
                          <div className="flex items-center">
                            <span className="text-sm text-gray-800 font-medium">
                              Year: <span id="year" className="text-lg font-semibold text-blue-600 ml-1">
                                {calculateYear(formData.semester) || '-'}
                              </span>
                            </span>
                          </div>
                        </div>
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
                          id="gender"
                          value={formData.gender}
                          onChange={(e) => handleFieldChange('gender', e.target.value)}
                          className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
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
                          id="date_of_birth"
                          value={formData.date_of_birth}
                          onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
                          className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              {registrationBlocked ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-gray-400 bg-gray-200 cursor-not-allowed shadow-lg"
                >
                  <i className="fas fa-ban mr-2"></i>
                  Registration Blocked
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Submitting...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check-circle mr-2"></i>
                      {isTeamRegistration ? 'Submit Team Registration' : 'Submit Registration'}
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default StudentEventRegistration;
