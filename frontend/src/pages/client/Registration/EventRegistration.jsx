import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { clientAPI } from '../../../api/axios';
import ClientLayout from '../../../components/client/Layout';
import LoadingSpinner from '../../../components/LoadingSpinner';

const EventRegistration = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  // State management
  const [event, setEvent] = useState(null);
  const [student, setStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registrationBlocked, setRegistrationBlocked] = useState(false);
  const [formData, setFormData] = useState({});
  const [participants, setParticipants] = useState([]);
  const [participantCount, setParticipantCount] = useState(0);

  // Team registration state
  const [isTeamRegistration, setIsTeamRegistration] = useState(false);
  const [teamSizeMin, setTeamSizeMin] = useState(2);
  const [teamSizeMax, setTeamSizeMax] = useState(5);

  useEffect(() => {
    // Check if we're in development mode and accessing via /dev/ route
    const isDevelopmentMode = location.pathname.startsWith('/dev/');
    
    if (!isAuthenticated && !isDevelopmentMode) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }
    
    fetchEventData();
  }, [eventId, isAuthenticated, location]);

  const fetchEventData = async () => {
    try {
      setIsLoading(true);
      
      // Check if we're in development mode
      const isDevelopmentMode = location.pathname.startsWith('/dev/');
      
      if (isDevelopmentMode && (!eventId || location.pathname.includes('event-registration-team'))) {
        // Provide mock data for development testing
        const isTeamTest = location.pathname.includes('event-registration-team');
        
        const mockEventData = {
          event_name: isTeamTest ? 'Mock Team Event for Testing' : 'Mock Individual Event for Testing',
          event_id: 'mock-event-123',
          registration_type: isTeamTest ? 'team' : 'individual',
          is_team_registration: isTeamTest,
          team_size_min: 2,
          team_size_max: 5
        };
        
        setEvent(mockEventData);
        setIsTeamRegistration(isTeamTest);
        
        if (isTeamTest) {
          setTeamSizeMin(2);
          setTeamSizeMax(5);
          // Initialize participants for minimum team size
          const minParticipants = 1; // Excluding leader
          const initialParticipants = Array.from({ length: minParticipants }, (_, i) => ({
            id: i + 1,
            enrollment: '',
            name: '',
            email: '',
            mobile: '',
            department: '',
            semester: '',
            year: '',
            isValid: false,
            error: ''
          }));
          setParticipants(initialParticipants);
          setParticipantCount(minParticipants);
        }
        
        // Set mock student data
        const mockStudent = {
          full_name: 'John Doe',
          enrollment_no: '21BECE40015',
          email: 'john.doe@example.com',
          mobile_no: '9876543210',
          department: 'Computer Engineering',
          semester: '6',
          gender: 'Male',
          date_of_birth: '2003-01-15'
        };
        
        setStudent(mockStudent);
        setFormData({
          full_name: mockStudent.full_name,
          enrollment_no: mockStudent.enrollment_no,
          email: mockStudent.email,
          mobile_no: mockStudent.mobile_no,
          department: mockStudent.department,
          semester: mockStudent.semester,
          gender: mockStudent.gender,
          date_of_birth: mockStudent.date_of_birth,
          team_name: ''
        });
        
        setIsLoading(false);
        return;
      }
      
      const response = await clientAPI.getEventDetails(eventId);
      
      if (response.data.success) {
        const eventData = response.data.event;
        setEvent(eventData);
        
        // Check if it's team registration
        const isTeam = eventData.registration_type === 'team' || eventData.is_team_registration;
        setIsTeamRegistration(isTeam);
        
        if (isTeam) {
          setTeamSizeMin(eventData.team_size_min || 2);
          setTeamSizeMax(eventData.team_size_max || 5);
          // Initialize participants for minimum team size
          const minParticipants = (eventData.team_size_min || 2) - 1; // Excluding leader
          const initialParticipants = Array.from({ length: minParticipants }, (_, i) => ({
            id: i + 1,
            enrollment: '',
            name: '',
            email: '',
            mobile: '',
            department: '',
            semester: '',
            year: '',
            isValid: false,
            error: ''
          }));
          setParticipants(initialParticipants);
          setParticipantCount(minParticipants);
        }

        // Set student data if available
        if (user) {
          setStudent(user);
          setFormData({
            full_name: user.full_name || '',
            enrollment_no: user.enrollment_no || '',
            email: user.email || '',
            mobile_no: user.mobile_no || '',
            department: user.department || '',
            semester: user.semester || '',
            gender: user.gender || '',
            date_of_birth: user.date_of_birth ? formatDateForInput(user.date_of_birth) : '',
            team_name: ''
          });
        }
      } else {
        setError('Failed to load event details');
      }
    } catch (error) {
      console.error('Event fetch error:', error);
      setError('Failed to load event details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const calculateYear = (semester) => {
    const sem = parseInt(semester);
    if (sem >= 1 && sem <= 8) {
      return Math.floor((sem - 1) / 2) + 1;
    }
    return '';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-calculate year when semester changes
    if (name === 'semester') {
      const year = calculateYear(value);
      setFormData(prev => ({
        ...prev,
        year: year
      }));
    }
  };

  const addParticipant = () => {
    if (participantCount >= teamSizeMax - 1) {
      showAlert('Maximum team size reached!', 'error');
      return;
    }

    const newParticipant = {
      id: participantCount + 1,
      enrollment: '',
      name: '',
      email: '',
      mobile: '',
      department: '',
      semester: '',
      year: '',
      isValid: false,
      error: ''
    };

    setParticipants(prev => [...prev, newParticipant]);
    setParticipantCount(prev => prev + 1);
  };

  const removeParticipant = () => {
    const minParticipants = teamSizeMin - 1;
    if (participantCount <= minParticipants) {
      showAlert(`Minimum ${minParticipants} participants required!`, 'error');
      return;
    }

    setParticipants(prev => prev.slice(0, -1));
    setParticipantCount(prev => prev - 1);
  };

  const validateParticipantEnrollment = async (participantId, enrollmentNo) => {
    if (!enrollmentNo.trim()) return;

    // Format enrollment number
    const formattedEnrollment = enrollmentNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Validate format
    const enrollmentPattern = /^\d{2}[A-Z]{2,4}\d{5}$/;
    if (!enrollmentPattern.test(formattedEnrollment)) {
      updateParticipantError(participantId, 'Invalid enrollment number format');
      return;
    }

    // Check for duplicates
    const leaderEnrollment = formData.enrollment_no?.toUpperCase();
    const existingEnrollments = participants
      .filter(p => p.id !== participantId && p.enrollment.trim())
      .map(p => p.enrollment.toUpperCase());

    if (formattedEnrollment === leaderEnrollment) {
      updateParticipantError(participantId, 'Team leader cannot be added as participant');
      return;
    }

    if (existingEnrollments.includes(formattedEnrollment)) {
      updateParticipantError(participantId, 'Duplicate enrollment number in team');
      return;
    }

    try {
      updateParticipantStatus(participantId, 'Validating...');
      
      const response = await clientAPI.validateParticipant(formattedEnrollment);
      
      if (response.data.success) {
        const studentData = response.data.student;
        updateParticipant(participantId, {
          enrollment: formattedEnrollment,
          name: studentData.full_name || '',
          email: studentData.email || '',
          mobile: studentData.mobile_no || '',
          department: studentData.department || '',
          semester: studentData.semester || '',
          year: calculateYear(studentData.semester),
          isValid: true,
          error: '',
          status: 'Valid'
        });

        // Check for conflicts
        if (response.data.has_conflict && response.data.conflicts) {
          updateParticipantStatus(participantId, 'Already registered');
          let conflictMessage = 'This student is already registered for:\n';
          
          if (response.data.conflicts.individual_registrations?.length > 0) {
            conflictMessage += '\nIndividual registrations:\n';
            response.data.conflicts.individual_registrations.forEach(reg => {
              conflictMessage += `  • ${reg.event_name} (ID: ${reg.registrar_id})\n`;
            });
          }
          
          if (response.data.conflicts.team_registrations?.length > 0) {
            conflictMessage += '\nTeam registrations:\n';
            response.data.conflicts.team_registrations.forEach(reg => {
              if (reg.role === 'team_leader') {
                conflictMessage += `  • ${reg.event_name} - Team Leader of '${reg.team_name}' (ID: ${reg.registrar_id})\n`;
              } else {
                conflictMessage += `  • ${reg.event_name} - Team Participant in '${reg.team_name}' (Leader: ${reg.team_leader})\n`;
              }
            });
          }
          
          updateParticipantError(participantId, conflictMessage.trim());
        }
      } else {
        updateParticipant(participantId, {
          enrollment: formattedEnrollment,
          isValid: false,
          error: response.data.message || 'Student not found in system',
          status: 'Not found'
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      updateParticipant(participantId, {
        enrollment: formattedEnrollment,
        isValid: false,
        error: 'Unable to validate enrollment number',
        status: 'Error'
      });
    }
  };

  const updateParticipant = (participantId, updates) => {
    setParticipants(prev => 
      prev.map(p => p.id === participantId ? { ...p, ...updates } : p)
    );
  };

  const updateParticipantError = (participantId, error) => {
    updateParticipant(participantId, { error, isValid: false });
  };

  const updateParticipantStatus = (participantId, status) => {
    updateParticipant(participantId, { status });
  };

  const handleParticipantEnrollmentChange = (participantId, value) => {
    const formattedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    updateParticipant(participantId, { 
      enrollment: formattedValue,
      error: '',
      status: ''
    });
  };

  const handleParticipantEnrollmentBlur = (participantId, value) => {
    validateParticipantEnrollment(participantId, value);
  };

  const showAlert = (message, type) => {
    if (type === 'error') {
      setError(message);
    } else {
      setSuccess(message);
    }
    
    // Clear after 5 seconds
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 5000);
  };

  const validateForm = () => {
    // Check required fields
    const requiredFields = ['full_name', 'enrollment_no', 'email', 'mobile_no', 'department', 'semester', 'gender', 'date_of_birth'];
    
    for (const field of requiredFields) {
      if (!formData[field]?.trim()) {
        showAlert('Could you help us complete all required details?', 'error');
        return false;
      }
    }

    if (isTeamRegistration) {
      // Check team name
      if (!formData.team_name?.trim()) {
        showAlert('Please enter a team name', 'error');
        return false;
      }

      // Check team size
      const validParticipants = participants.filter(p => p.enrollment.trim());
      const totalTeamSize = validParticipants.length + 1; // +1 for leader

      if (totalTeamSize < teamSizeMin) {
        showAlert(`Team must have at least ${teamSizeMin} members including leader`, 'error');
        return false;
      }

      if (totalTeamSize > teamSizeMax) {
        showAlert(`Team cannot exceed ${teamSizeMax} members including leader`, 'error');
        return false;
      }

      // Check for invalid participants
      const invalidParticipants = validParticipants.filter(p => !p.name.trim());
      if (invalidParticipants.length > 0) {
        showAlert('Please ensure all participants have valid enrollment numbers', 'error');
        return false;
      }

      // Check for duplicates
      const allEnrollments = [formData.enrollment_no.toUpperCase()]
        .concat(validParticipants.map(p => p.enrollment.toUpperCase()));
      
      const duplicates = allEnrollments.filter((item, index) => allEnrollments.indexOf(item) !== index);
      if (duplicates.length > 0) {
        showAlert('Duplicate enrollment numbers found in team', 'error');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Check if we're in development mode
    const isDevelopmentMode = location.pathname.startsWith('/dev/');
    
    if (isDevelopmentMode) {
      // Mock successful submission for development
      setSuccess('Mock registration submitted successfully! (Development Mode)');
      console.log('Mock registration data:', {
        ...formData,
        event_id: eventId || 'mock-event-123',
        participants: isTeamRegistration ? participants.filter(p => p.enrollment.trim()) : undefined
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const registrationData = {
        ...formData,
        event_id: eventId
      };

      if (isTeamRegistration) {
        registrationData.participants = participants
          .filter(p => p.enrollment.trim())
          .map(p => ({
            enrollment_no: p.enrollment,
            full_name: p.name,
            email: p.email,
            mobile_no: p.mobile,
            department: p.department,
            semester: p.semester
          }));
      }

      const response = await clientAPI.registerForEvent(eventId, registrationData);
      
      if (response.data.success) {
        setSuccess(response.data.message || 'Registration submitted successfully!');
        // Redirect to event details or dashboard after a delay
        setTimeout(() => {
          navigate(`/events/${eventId}`);
        }, 2000);
      } else {
        setError(response.data.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Registration failed. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'submit') {
      e.preventDefault();
      // Move to next input field
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
      const currentIndex = inputs.indexOf(e.target);
      if (currentIndex > -1 && currentIndex < inputs.length - 1) {
        inputs[currentIndex + 1].focus();
      }
    }
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <LoadingSpinner />
      </ClientLayout>
    );
  }

  if (!event) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-100 py-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl w-full mx-auto text-center">
            <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              Event not found or could not be loaded.
            </div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-100 py-10 px-4 sm:px-6 lg:px-8" onKeyDown={handleKeyDown}>
        <div className="max-w-2xl w-full mx-auto space-y-8">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-green-500 shadow-lg mb-8">
              <i className="fas fa-clipboard-list text-white text-3xl"></i>
            </div>
            
            {/* Development Mode Notice */}
            {location.pathname.startsWith('/dev/') && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                <i className="fas fa-code mr-2"></i>
                <strong>Development Mode:</strong> This is a test version of the registration page with mock data.
              </div>
            )}
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Register for {event.event_name}
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Please fill out the form below to participate in this event.
            </p>
            
            {student && (
              <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
                <i className="fas fa-user mr-2"></i>
                Logged in as: <strong>{student.full_name}</strong> ({student.enrollment_no})
              </div>
            )}
            
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

          <form 
            onSubmit={handleSubmit} 
            className="space-y-8" 
            autoComplete="off"
            style={registrationBlocked ? { pointerEvents: 'none', opacity: 0.6 } : {}}
          >
            {/* Registration Mode Display */}
            <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
              <i className="fas fa-info-circle mr-2"></i>
              <strong>Registration Mode:</strong>{' '}
              {isTeamRegistration 
                ? `Team Registration (${teamSizeMin}-${teamSizeMax} members including leader)`
                : 'Individual Registration'
              }
            </div>

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
                          name="full_name"
                          id="full_name"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          value={formData.full_name || ''}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div>
                        <label htmlFor="enrollment_no" className="block text-sm font-semibold text-gray-800 mb-2">
                          Enrollment No. *
                        </label>
                        <input
                          type="text"
                          name="enrollment_no"
                          id="enrollment_no"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                          required
                          placeholder="e.g., 21BECE40015"
                          value={formData.enrollment_no || ''}
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
                          name="email"
                          id="email"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          placeholder="Institute email"
                          value={formData.email || ''}
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
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          pattern="[0-9]{10}"
                          placeholder="10 digit mobile number"
                          value={formData.mobile_no || ''}
                          onChange={handleInputChange}
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
                          name="team_name"
                          id="team_name"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          placeholder="Enter your team name"
                          value={formData.team_name || ''}
                          onChange={handleInputChange}
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
                      {participants.map((participant) => (
                        <div key={participant.id} className="border rounded-lg p-4 bg-gray-50">
                          <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                            <i className="fas fa-user mr-2 text-blue-600"></i>
                            Participant {participant.id}
                            {participant.status && (
                              <span className={`ml-2 text-sm font-normal ${
                                participant.status === 'Valid' ? 'text-green-600' :
                                participant.status === 'Validating...' ? 'text-blue-600' :
                                'text-red-600'
                              }`}>
                                ({participant.status})
                              </span>
                            )}
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Enrollment No. *
                              </label>
                              <input
                                type="text"
                                className="block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                placeholder="e.g., 21BECE40015"
                                pattern="^\d{2}[A-Z]{2,4}\d{5}$"
                                value={participant.enrollment}
                                onChange={(e) => handleParticipantEnrollmentChange(participant.id, e.target.value)}
                                onBlur={(e) => handleParticipantEnrollmentBlur(participant.id, e.target.value)}
                              />
                              {participant.error && (
                                <div className="text-red-500 text-sm mt-1">
                                  {participant.error}
                                </div>
                              )}
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Full Name
                              </label>
                              <input
                                type="text"
                                className="block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                                readOnly
                                placeholder="Will be auto-filled"
                                value={participant.name}
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Email ID
                              </label>
                              <input
                                type="email"
                                className="block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                                readOnly
                                placeholder="Will be auto-filled"
                                value={participant.email}
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Mobile No.
                              </label>
                              <input
                                type="tel"
                                className="block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                                readOnly
                                placeholder="Will be auto-filled"
                                value={participant.mobile}
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Department
                              </label>
                              <input
                                type="text"
                                className="block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                                readOnly
                                placeholder="Will be auto-filled"
                                value={participant.department}
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Semester & Year
                              </label>
                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  className="block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                                  readOnly
                                  placeholder="Semester"
                                  value={participant.semester}
                                />
                                <input
                                  type="text"
                                  className="block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                                  readOnly
                                  placeholder="Year"
                                  value={participant.year}
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
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Team Leader Academic Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="department" className="block text-sm font-semibold text-gray-800 mb-2">
                          Department *
                        </label>
                        <select
                          name="department"
                          id="department"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          value={formData.department || ''}
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
                        <label htmlFor="semester" className="block text-sm font-semibold text-gray-800 mb-2">
                          Semester *
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <select
                            name="semester"
                            id="semester"
                            className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                            value={formData.semester || ''}
                            onChange={handleInputChange}
                          >
                            <option value="">Select</option>
                            {[1,2,3,4,5,6,7,8].map(sem => (
                              <option key={sem} value={sem}>{sem}</option>
                            ))}
                          </select>
                          <div className="flex items-center">
                            <span className="text-sm text-gray-800 font-medium">
                              Year: <span className="text-lg font-semibold text-blue-600 ml-1">
                                {formData.semester ? calculateYear(formData.semester) : '-'}
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
                          name="gender"
                          id="gender"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          value={formData.gender || ''}
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
                          className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          max={new Date().toISOString().split('T')[0]}
                          value={formData.date_of_birth || ''}
                          onChange={handleInputChange}
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
                          name="full_name"
                          id="full_name"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          value={formData.full_name || ''}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div>
                        <label htmlFor="enrollment_no" className="block text-sm font-semibold text-gray-800 mb-2">
                          Enrollment No. *
                        </label>
                        <input
                          type="text"
                          name="enrollment_no"
                          id="enrollment_no"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                          required
                          placeholder="e.g., 21BECE40015"
                          value={formData.enrollment_no || ''}
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
                          name="email"
                          id="email"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          placeholder="Institute email"
                          value={formData.email || ''}
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
                          className="block w-full px-4 py-2 mt-1 text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          pattern="[0-9]{10}"
                          placeholder="10 digit mobile number"
                          value={formData.mobile_no || ''}
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
                          className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          value={formData.department || ''}
                          onChange={handleInputChange}
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
                            name="semester"
                            id="semester"
                            className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                            value={formData.semester || ''}
                            onChange={handleInputChange}
                          >
                            <option value="">Select</option>
                            {[1,2,3,4,5,6,7,8].map(sem => (
                              <option key={sem} value={sem}>{sem}</option>
                            ))}
                          </select>
                          <div className="flex items-center">
                            <span className="text-sm text-gray-800 font-medium">
                              Year: <span className="text-lg font-semibold text-blue-600 ml-1">
                                {formData.semester ? calculateYear(formData.semester) : '-'}
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
                          name="gender"
                          id="gender"
                          className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          value={formData.gender || ''}
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
                          className="block w-full px-4 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          max={new Date().toISOString().split('T')[0]}
                          value={formData.date_of_birth || ''}
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
                  disabled={isLoading}
                  className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
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
    </ClientLayout>
  );
};

export default EventRegistration;
