import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { clientAPI } from '../../../../api/axios';
import Layout from '../../../../components/client/Layout';
import LoadingSpinner from '../../../../components/LoadingSpinner';

const StudentEventRegistration = ({ forceTeamMode = false }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userType } = useAuth();

  // Refs to track execution state
  const eventLoadingRef = useRef(false);

  // State management
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registrationBlocked, setRegistrationBlocked] = useState(false);
  const [eventLoaded, setEventLoaded] = useState(false);

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
        semester: formData.semester
      });
    }
  }, [formData.mobile_no, formData.gender, formData.semester]); // Only trigger for specific fields

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
        
        // Check if URL indicates team registration or use event setting
        const isTeamRoute = location.pathname.includes('/register-team');
        const shouldUseTeamMode = forceTeamMode || isTeamRoute || eventData.registration_mode === 'team';
        
        setIsTeamRegistration(shouldUseTeamMode);
        setTeamSizeMin(eventData.team_size_min || 2);
        setTeamSizeMax(eventData.team_size_max || 5);

        // Initialize form with user data (using cached data from AuthContext)        
        if (user) {
          const newFormData = {
            full_name: user.full_name || '',
            enrollment_no: user.enrollment_no || '',
            email: user.email || '',
            mobile_no: user.mobile_no || user.phone_number || '',
            department: user.department || '',
            semester: user.semester || '',
            gender: user.gender || '',
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
  }, [eventId]);

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

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-calculate year when semester changes
    if (field === 'semester') {
      const year = calculateYear(value);
      // Update year display if element exists
      const yearElement = document.getElementById('year');
      if (yearElement) {
        yearElement.textContent = year || '-';
      }
    }
  };

  // Handle participant field changes
  const handleParticipantChange = (participantId, field, value) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map(p => 
        p.id === participantId 
          ? { ...p, [field]: value, validationError: '' }
          : p
      )
    }));
  };

  // Validate participant enrollment number
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

    // Validate enrollment format
    const enrollmentPattern = /^\d{2}[A-Z]{2,4}\d{5}$/;
    if (!enrollmentPattern.test(enrollmentNo.toUpperCase())) {
      setFormData(prev => ({
        ...prev,
        participants: prev.participants.map(p => 
          p.id === participantId 
            ? { 
                ...p, 
                isValidating: false, 
                isValid: false,
                validationError: 'Invalid enrollment number format' 
              }
            : p
        )
      }));
      return;
    }

    // Check for duplicates using the current state
    setFormData(prev => {
      // Use the current state from the callback to avoid stale state issues
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

      // If no duplicates, continue with API validation
      return prev;
    });

    // Get current form data for duplicate checking
    const currentFormData = formData;
    const leaderEnrollment = currentFormData?.enrollment_no?.trim()?.toUpperCase() || '';
    const otherParticipants = currentFormData?.participants
      ?.filter(p => p.id !== participantId && p.enrollment_no?.trim())
      ?.map(p => p.enrollment_no.trim().toUpperCase()) || [];

    // Early return if duplicates found
    if (enrollmentNo.toUpperCase() === leaderEnrollment || 
        otherParticipants.includes(enrollmentNo.toUpperCase())) {
      return;
    }

    try {
      const response = await clientAPI.validateParticipant(enrollmentNo);
      
      console.log('=== PARTICIPANT VALIDATION API RESPONSE ===');
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      console.log('Response success:', response.data?.success);
      console.log('Response student:', response.data?.student);
      
      if (response.data.success) {
        // The API returns student_data, not student
        const student = response.data.student_data || response.data.student;
        
        // Safety check for student data
        if (!student) {
          console.error('Student data is null/undefined in successful response');
          setFormData(prev => ({
            ...prev,
            participants: prev.participants.map(p => 
              p.id === participantId 
                ? { 
                    ...p, 
                    isValidating: false, 
                    isValid: false,
                    validationError: 'Invalid response from server - no student data'
                  }
                : p
            )
          }));
          return;
        }
        
        console.log('Student data found:', {
          full_name: student.full_name,
          email: student.email,
          mobile_no: student.mobile_no,
          department: student.department,
          semester: student.semester
        });
        
        // Update participant with validated data
        setFormData(prev => ({
          ...prev,
          participants: prev.participants.map(p => 
            p.id === participantId 
              ? { 
                  ...p,
                  full_name: student?.full_name || '',
                  email: student?.email || '',
                  mobile_no: student?.mobile_no || '',
                  department: student?.department || '',
                  semester: student?.semester || '',
                  year: calculateYear(student?.semester),
                  isValid: true,
                  isValidating: false,
                  validationError: response.data.has_conflict ? 'Already registered for another event' : ''
                }
              : p
          )
        }));
      } else {
        console.log('Validation failed:', response.data.message);
        setFormData(prev => ({
          ...prev,
          participants: prev.participants.map(p => 
            p.id === participantId 
              ? { 
                  ...p, 
                  isValidating: false, 
                  isValid: false,
                  validationError: response.data.message || 'Student not found in system'
                }
              : p
          )
        }));
      }
    } catch (error) {
      console.error('Validation error:', error);
      setFormData(prev => ({
        ...prev,
        participants: prev.participants.map(p => 
          p.id === participantId 
            ? { 
                ...p, 
                isValidating: false, 
                isValid: false,
                validationError: 'Unable to validate enrollment number'
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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (registrationBlocked) {
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
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
        date_of_birth: formData.date_of_birth
      };

      // Add team-specific data
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

        // Check for invalid participants
        const invalidParticipants = validParticipants.filter(p => !p.isValid);
        if (invalidParticipants.length > 0) {
          throw new Error('Please ensure all participants have valid enrollment numbers');
        }

        registrationData.team_name = formData.team_name.trim();
        registrationData.team_members = validParticipants.map(p => ({
          enrollment_no: p.enrollment_no.trim(),
          name: p.full_name,
          email: p.email,
          mobile_no: p.mobile_no
        }));
      }

      // Submit registration
      const response = await clientAPI.registerForEvent(eventId, registrationData);
      
      console.log('Registration API response:', response);
      
      setSuccess('Registration submitted successfully!');
      
      // Prepare data for success page
      const successData = {
        registrationData: {
          registration_id: response.data.registration_id || response.data.registrar_id,
          registration_type: registrationData.registration_type,
          full_name: registrationData.full_name,
          enrollment_no: registrationData.enrollment_no,
          payment_status: response.data.payment_status || 'free',
          team_name: registrationData.team_name,
          team_info: isTeamRegistration ? {
            team_name: registrationData.team_name,
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
