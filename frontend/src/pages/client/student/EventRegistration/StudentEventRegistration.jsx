import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { clientAPI } from '../../../../api/client';
import Layout from '../../../../components/client/Layout';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { validators, useValidation, validateForm } from '../../../../utils/validators';
import { 
  generateRegistrationId,
  generateTeamRegistrationId,
  generateSessionId,
  idValidators 
} from '../../../../utils/idGenerator';

const StudentEventRegistration = ({ forceTeamMode = false }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userType } = useAuth();

  // Refs to track execution state  
  const dataLoadingRef = useRef(false);
  const mountedRef = useRef(true);

  // State management
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registrationBlocked, setRegistrationBlocked] = useState(false);

  // Debug loading state changes
  useEffect(() => {
    console.log('📊 Loading state changed to:', loading);
  }, [loading]);

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
      
      if (user?.enrollment_no && eventId) {
        const registrationId = generateRegistrationId(
          user.enrollment_no,
          eventId,
          user.full_name || 'Student'
        );
        setTempRegistrationId(registrationId);
        
        const sessionData = {
          sessionId: newSessionId,
          tempRegistrationId: registrationId,
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

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

  // CLEAN & OPTIMIZED: Simple data loading using existing AuthContext
  useEffect(() => {
    const loadData = async () => {
      console.log('🔄 useEffect triggered with dependencies:', {
        hasUser: !!user,
        userEnrollment: user?.enrollment_no,
        eventId,
        dataLoadingRefCurrent: dataLoadingRef.current,
        pathname: location.pathname
      });
      
      if (!user || !user.enrollment_no || !eventId || dataLoadingRef.current) {
        console.log('⚠️ Skipping data load due to missing conditions');
        return;
      }
      
      dataLoadingRef.current = true;
      console.log('🚀 Loading registration data (optimized - single API call)...');
      
      try {
        // Step 1: Use AuthContext user data (already complete from login)
        console.log('✅ Using AuthContext profile data (already available)');
        
        // Step 2: Load event data (only API call we need)
        console.log('📋 Loading event data...');
        const eventResponse = await clientAPI.getEventDetails(eventId);
        const eventData = eventResponse.data.success ? eventResponse.data.event : eventResponse.data;
        
        if (!eventData) {
          throw new Error('Event data not found');
        }
        
        setEvent(eventData);

        // Step 3: Check registration constraints
        const now = new Date();
        const registrationStart = eventData.registration_start_date ? new Date(eventData.registration_start_date) : null;
        const registrationEnd = eventData.registration_end_date ? new Date(eventData.registration_end_date) : null;
        
        let shouldBlockRegistration = false;
        
        if (registrationStart && now < registrationStart) {
          shouldBlockRegistration = true;
          setError(`Registration opens on ${registrationStart.toLocaleDateString()} at ${registrationStart.toLocaleTimeString()}`);
        }
        
        if (registrationEnd && now > registrationEnd) {
          shouldBlockRegistration = true;
          setError(`Registration closed on ${registrationEnd.toLocaleDateString()} at ${registrationEnd.toLocaleTimeString()}`);
        }
        
        if (eventData.status !== 'upcoming' || eventData.sub_status !== 'registration_open') {
          shouldBlockRegistration = true;
          setError('Registration is currently not available for this event');
        }
        
        setRegistrationBlocked(shouldBlockRegistration);

        // Step 4: Determine team registration mode
        const isTeamRoute = location.pathname.includes('/register-team');
        const shouldUseTeamMode = forceTeamMode || isTeamRoute || eventData.registration_mode === 'team';
        
        setIsTeamRegistration(shouldUseTeamMode);
        setTeamSizeMin(eventData.team_size_min || 2);
        setTeamSizeMax(eventData.team_size_max || 5);

        // Initialize participants array for team registration
        if (shouldUseTeamMode && (!formData.participants || formData.participants.length === 0)) {
          const minParticipants = (eventData.team_size_min || 2) - 1; // Subtract 1 for team leader
          initializeParticipants(minParticipants);
        }

        // Step 5: Initialize form with complete profile data
        console.log('📝 Initializing form with user data...');
        
        // Get complete profile from session storage (set during login)
        let completeProfile = null;
        try {
          const sessionProfile = sessionStorage.getItem('complete_profile');
          if (sessionProfile) {
            completeProfile = JSON.parse(sessionProfile);
            console.log('✅ Using complete profile from session storage');
          }
        } catch (e) {
          console.warn('Could not parse session profile data');
        }
        
        // Use complete profile if available, otherwise use AuthContext user
        const sourceData = completeProfile || user;
        
        const transformGender = (gender) => {
          if (!gender) return '';
          return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
        };

        const formInitData = {
          full_name: sourceData.full_name || '',
          enrollment_no: sourceData.enrollment_no || sourceData.enrollment_number || '',
          email: sourceData.email || '',
          mobile_no: sourceData.mobile_no || sourceData.phone_number || '',
          department: sourceData.department || '',
          semester: sourceData.semester || '',
          gender: transformGender(sourceData.gender) || '',
          date_of_birth: sourceData.date_of_birth ? formatDateForInput(sourceData.date_of_birth) : '',
          team_name: '',
          participants: []
        };

        // Only update if component is still mounted
        console.log('🔍 Checking if component is still mounted:', mountedRef.current);
        if (mountedRef.current) {
          console.log('📝 Setting form data and clearing loading state...');
          setFormData(formInitData);
          setLoading(false);
          console.log('✅ Loading state set to false');
          
          // Update year display after setting form data
          setTimeout(() => {
            const yearElement = document.getElementById('year');
            if (yearElement && formInitData.semester) {
              const year = calculateYear(formInitData.semester);
              yearElement.textContent = year || '-';
            }
          }, 100);

          // Initialize participants for team registration
          if (shouldUseTeamMode) {
            const minParticipants = (eventData.team_size_min || 2) - 1; // Excluding leader
            initializeParticipants(minParticipants);
          }

          console.log('✅ Registration form loaded successfully (1 API call only)');
        } else {
          console.log('❌ Component unmounted, skipping state updates');
        }

      } catch (error) {
        console.error('❌ Error loading registration data:', error);
        if (mountedRef.current) {
          setError('Failed to load registration data. Please refresh the page.');
          setLoading(false);
        }
      } finally {
        dataLoadingRef.current = false;
      }
    };

    loadData();
  }, [user?.enrollment_no, eventId, location.pathname, forceTeamMode, initializeParticipants]);

  // Enhanced form field changes with validation
  const handleFieldChange = (field, value) => {
    clearValidationError(field);
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Real-time validation
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
      
      if (validationResult && !validationResult.isValid) {
        setTimeout(() => {
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

  // Enhanced participant field changes with validation
  const handleParticipantChange = (participantId, field, value) => {
    // Real-time duplicate check for enrollment numbers
    if (field === 'enrollment_no' && value && value.trim()) {
      const enrollmentNo = value.trim().toUpperCase();
      
      // Check against team leader
      const leaderEnrollment = formData.enrollment_no?.trim()?.toUpperCase() || '';
      
      // Check against other participants
      const otherParticipants = formData.participants
        ?.filter(p => p.id !== participantId && p.enrollment_no?.trim())
        ?.map(p => p.enrollment_no.trim().toUpperCase()) || [];
      
      let duplicateError = '';
      if (enrollmentNo === leaderEnrollment) {
        duplicateError = 'Team leader cannot be added as participant';
      } else if (otherParticipants.includes(enrollmentNo)) {
        duplicateError = 'Duplicate enrollment number in team';
      }
      
      setFormData(prev => ({
        ...prev,
        participants: prev.participants.map(p => 
          p.id === participantId 
            ? { 
                ...p, 
                [field]: value, 
                validationError: duplicateError,
                isValid: !duplicateError && p.isValid,
                // Clear auto-filled data if it's a duplicate
                ...(duplicateError ? {
                  full_name: '',
                  email: '',
                  mobile_no: '',
                  department: '',
                  semester: '',
                  year: ''
                } : {})
              }
            : p
        )
      }));
      
      // Only proceed with API validation if no duplicate
      if (!duplicateError) {
        setTimeout(() => {
          validateParticipantEnrollment(participantId, value.trim());
        }, 500);
      }
    } else {
      // For non-enrollment fields, just update normally
      setFormData(prev => ({
        ...prev,
        participants: prev.participants.map(p => 
          p.id === participantId 
            ? { ...p, [field]: value, validationError: '' }
            : p
        )
      }));
      
      // Real-time validation for other fields
      if (field === 'email' && value && value.trim()) {
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
    }
  };

  // Frontend-only participant validation
  const validateParticipantEnrollment = async (participantId, enrollmentNo) => {
    if (!enrollmentNo || !enrollmentNo.trim()) {
      return;
    }

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

    // Use frontend validation for format check
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

    // Check for duplicates FIRST
    const currentFormData = formData;
    const leaderEnrollment = currentFormData.enrollment_no?.trim()?.toUpperCase() || '';
    const otherParticipants = currentFormData.participants
      ?.filter(p => p.id !== participantId && p.enrollment_no?.trim())
      ?.map(p => p.enrollment_no.trim().toUpperCase()) || [];

    // Check if this enrollment number is the team leader
    if (enrollmentNo.toUpperCase() === leaderEnrollment) {
      setFormData(prev => ({
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
      }));
      return;
    }

    // Check if this enrollment number already exists in other participants
    if (otherParticipants.includes(enrollmentNo.toUpperCase())) {
      setFormData(prev => ({
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
      }));
      return;
    }

    // Fetch student data from API for auto-fill and eligibility check
    try {
      const response = await clientAPI.checkStudentEligibility(enrollmentNo, eventId);
      
      if (response.data.success && response.data.found) {
        const studentData = response.data.student_data;
        const isEligible = response.data.eligible;
        const eligibilityMessage = response.data.message;
        const alreadyRegistered = response.data.already_registered;
        const registrationType = response.data.registration_type;
        
        // Check if student is already registered for this event
        if (alreadyRegistered && !isEligible) {
          // Student is already registered and NOT eligible for multiple teams
          let registrationMessage = '';
          if (registrationType === 'team') {
            // Check if they're team leader or member
            if (eligibilityMessage.includes('team leader')) {
              registrationMessage = 'Student is already registered as team leader for this event';
            } else {
              registrationMessage = 'Student is already registered as team member for this event';
            }
          } else {
            registrationMessage = 'Student is already registered individually for this event';
          }
          
          setFormData(prev => ({
            ...prev,
            participants: prev.participants.map(p => 
              p.id === participantId 
                ? { 
                    ...p, 
                    isValidating: false, 
                    isValid: false,
                    validationError: registrationMessage,
                    // Clear auto-filled data since student can't be added
                    full_name: '',
                    email: '',
                    mobile_no: '',
                    department: '',
                    semester: '',
                    year: ''
                  }
                : p
            )
          }));
          return;
        }
        
        // Student is either not already registered OR is eligible for multiple teams
        // Proceed with normal validation
        setFormData(prev => ({
          ...prev,
          participants: prev.participants.map(p => 
            p.id === participantId 
              ? { 
                  ...p, 
                  isValidating: false, 
                  isValid: isEligible,
                  validationError: isEligible ? '' : eligibilityMessage,
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
    const maxParticipants = teamSizeMax - 1;
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
    const minParticipants = teamSizeMin - 1;
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

  // Enhanced form submission with frontend validation
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (registrationBlocked) {
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Frontend validation before submission
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

      // Prepare registration data
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
        session_id: sessionId,
        registration_id: tempRegistrationId,
        frontend_validated: true,
        validation_timestamp: Date.now()
      };

      // Add team-specific data
      if (isTeamRegistration) {
        if (!formData.team_name || !formData.team_name.trim()) {
          throw new Error('Please enter a team name');
        }

        const validParticipants = (formData.participants || []).filter(p => p.enrollment_no && p.enrollment_no.trim());
        const totalTeamSize = validParticipants.length + 1;

        if (totalTeamSize < teamSizeMin) {
          throw new Error(`Team must have at least ${teamSizeMin} members including leader`);
        }

        if (totalTeamSize > teamSizeMax) {
          throw new Error(`Team cannot exceed ${teamSizeMax} members including leader`);
        }

        // Check for duplicate enrollment numbers in team
        const allEnrollmentNumbers = [
          formData.enrollment_no.trim().toUpperCase(),
          ...validParticipants.map(p => p.enrollment_no.trim().toUpperCase())
        ];
        
        const duplicates = allEnrollmentNumbers.filter((item, index) => allEnrollmentNumbers.indexOf(item) !== index);
        if (duplicates.length > 0) {
          throw new Error(`Duplicate enrollment numbers found in team: ${duplicates.join(', ')}`);
        }

        // Check for participants with validation errors
        const invalidParticipants = validParticipants.filter(p => {
          const enrollmentValidation = validators.validationResult.enrollment(p.enrollment_no);
          return !p.isValid || !enrollmentValidation.isValid || p.validationError;
        });
        
        if (invalidParticipants.length > 0) {
          const errorMessages = invalidParticipants.map(p => 
            `${p.enrollment_no}: ${p.validationError || 'Invalid enrollment number'}`
          );
          throw new Error(`Please fix the following participant errors:\n${errorMessages.join('\n')}`);
        }

        registrationData.team_name = formData.team_name.trim();
        registrationData.temp_team_id = tempTeamId;
        
        // Include team leader + participants in team_members array
        const teamLeader = {
          enrollment_no: formData.enrollment_no.trim(),
          name: formData.full_name,
          email: formData.email,
          mobile_no: formData.mobile_no
        };
        
        registrationData.team_members = [
          teamLeader,
          ...validParticipants.map(p => ({
            enrollment_no: p.enrollment_no.trim(),
            name: p.full_name,
            email: p.email,
            mobile_no: p.mobile_no
          }))
        ];
      }

      // Submit registration
      let response;
      if (isTeamRegistration) {
        response = await clientAPI.registerTeam(eventId, registrationData);
      } else {
        response = await clientAPI.registerIndividual(eventId, registrationData);
      }
      
      console.log('Registration API response:', response);
      
      // FIXED: Handle invitation information in team registration response
      const hasInvitations = response.data.data?.pending_invitations > 0;
      const invitationsSent = response.data.data?.invitations_sent || [];
      const invitationErrors = response.data.data?.invitation_errors || [];
      
      let successMessage = 'Registration submitted successfully!';
      if (hasInvitations) {
        successMessage += ` Invitations sent to ${invitationsSent.length} already-registered students.`;
        if (invitationErrors.length > 0) {
          successMessage += ` Note: ${invitationErrors.length} invitations failed to send.`;
        }
      }
      
      setSuccess(successMessage);
      
      // Clean up session data
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
          registration_id: tempRegistrationId,
          session_id: sessionId,
          team_info: isTeamRegistration ? {
            team_name: registrationData.team_name,
            team_registration_id: tempTeamId,
            participant_count: (registrationData.team_members?.length || 0) + 1,
            leader_name: registrationData.full_name,
            leader_enrollment: registrationData.enrollment_no,
            participants: registrationData.team_members || [],
            // FIXED: Include invitation information
            invitations_sent: invitationsSent,
            invitation_errors: invitationErrors,
            pending_invitations: hasInvitations
          } : null
        },
        event: event
      };
      
      // Redirect to success page
      setTimeout(() => {
        navigate(`/client/events/${eventId}/registration-success`, {
          state: successData
        });
      }, 2000);

    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response?.status === 409) {
        navigate(`/client/events/${eventId}/registration-success`, {
          replace: true
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
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Loading registration form...</p>
            <p className="mt-2 text-sm text-gray-500">Optimized loading - just one moment!</p>
          </div>
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

            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                {error}
              </div>
            )}

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
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
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
