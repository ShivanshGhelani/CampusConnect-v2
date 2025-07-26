import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clientAPI } from '../../api/axios';
import ClientLayout from '../client/Layout';
import LoadingSpinner from '../LoadingSpinner';

const TeamRegistration = ({ userType = 'student' }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  // State management
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registrationBlocked, setRegistrationBlocked] = useState(false);
  const [isCheckingEnrollment, setIsCheckingEnrollment] = useState(false);

  // Configuration based on user type
  const userConfig = {
    student: {
      routes: {
        login: '/auth/login',
        events: '/student/events',
        success: `/student/events/${eventId}/registration-success`
      },
      leaderFields: {
        enrollment_no: user?.enrollment_no || '',
        full_name: user?.full_name || user?.name || '',
        email: user?.email || '',
        mobile_no: user?.mobile_no || user?.phone || '',
        department: user?.department || '',
        semester: user?.semester || '',
        year_of_study: user?.year_of_study || ''
      },
      participantFields: {
        enrollment_no: '',
        full_name: '',
        email: '',
        mobile_no: '',
        department: '',
        semester: '',
        year_of_study: ''
      },
      targetAudience: ['students', 'both'],
      title: 'Student Team Registration',
      subtitle: 'Register your team for this event',
      identifierField: 'enrollment_no',
      identifierLabel: 'Enrollment Number'
    },
    faculty: {
      routes: {
        login: '/auth/login',
        events: '/faculty/events',
        success: `/faculty/events/${eventId}/registration-success`
      },
      leaderFields: {
        employee_id: user?.employee_id || user?.faculty_id || '',
        full_name: user?.full_name || user?.name || user?.faculty_name || '',
        email: user?.email || '',
        mobile_no: user?.mobile_no || user?.phone || '',
        department: user?.department || '',
        designation: user?.designation || '',
        experience_years: user?.experience_years || ''
      },
      participantFields: {
        employee_id: '',
        full_name: '',
        email: '',
        mobile_no: '',
        department: '',
        designation: '',
        experience_years: ''
      },
      targetAudience: ['faculty', 'both'],
      title: 'Faculty Team Registration',
      subtitle: 'Register your faculty team for this event',
      identifierField: 'employee_id',
      identifierLabel: 'Employee ID'
    }
  };

  const config = userConfig[userType];

  // Team data state
  const [teamData, setTeamData] = useState({
    team_name: '',
    team_leader: config.leaderFields,
    participants: [{ ...config.participantFields }],
    emergency_contact: '',
    special_requirements: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(config.routes.login, { state: { from: location } });
      return;
    }
    
    fetchEventData();
  }, [eventId, isAuthenticated, location]);

  const fetchEventData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch event details
      const eventResponse = await clientAPI.getEventDetails(eventId);
      if (eventResponse.data.success) {
        const eventData = eventResponse.data.event;
        setEvent(eventData);
        
        // Check if registration is allowed
        await validateRegistrationEligibility(eventData);
      } else {
        setError('Event not found or not accessible.');
        setRegistrationBlocked(true);
      }

    } catch (error) {
      console.error('Error fetching event data:', error);
      setError('Failed to load event details. Please try again.');
      setRegistrationBlocked(true);
    } finally {
      setIsLoading(false);
    }
  };

  const validateRegistrationEligibility = async (eventData) => {
    try {
      // Check if user is already registered
      const registrationResponse = await clientAPI.getRegistrationDetails(eventId);
      if (registrationResponse.data.success) {
        setError('You are already registered for this event.');
        setRegistrationBlocked(true);
        setTimeout(() => {
          navigate(config.routes.success);
        }, 2000);
        return;
      }
    } catch (regError) {
      // User is not registered, which is expected
    }

    // Check basic eligibility
    const now = new Date();
    const registrationDeadline = new Date(eventData.registration_deadline);
    
    if (now > registrationDeadline) {
      setError('Registration deadline has passed.');
      setRegistrationBlocked(true);
      return;
    }

    if (eventData.current_registrations >= eventData.max_participants) {
      setError('Event is full. No more registrations are accepted.');
      setRegistrationBlocked(true);
      return;
    }

    if (!config.targetAudience.includes(eventData.target_audience)) {
      setError(`This event is not available for ${userType} registration.`);
      setRegistrationBlocked(true);
      return;
    }

    if (eventData.registration_type === 'individual') {
      setError('This event allows individual registration only.');
      setRegistrationBlocked(true);
      return;
    }
  };

  const handleTeamDataChange = (field, value) => {
    setTeamData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLeaderChange = (field, value) => {
    setTeamData(prev => ({
      ...prev,
      team_leader: {
        ...prev.team_leader,
        [field]: value
      }
    }));
  };

  const handleParticipantChange = (index, field, value) => {
    setTeamData(prev => ({
      ...prev,
      participants: prev.participants.map((participant, i) =>
        i === index ? { ...participant, [field]: value } : participant
      )
    }));
  };

  const addParticipant = () => {
    if (teamData.participants.length < (event?.max_team_size || 5)) {
      setTeamData(prev => ({
        ...prev,
        participants: [...prev.participants, { ...config.participantFields }]
      }));
    }
  };

  const removeParticipant = (index) => {
    if (teamData.participants.length > 1) {
      setTeamData(prev => ({
        ...prev,
        participants: prev.participants.filter((_, i) => i !== index)
      }));
    }
  };

  const checkEnrollmentExists = async (identifier, index = null) => {
    if (!identifier || identifier.trim() === '') return;

    try {
      setIsCheckingEnrollment(true);
      
      const response = await clientAPI.checkUserExists({
        [config.identifierField]: identifier,
        user_type: userType
      });
      
      if (response.data.exists) {
        const userData = response.data.user;
        
        if (index !== null) {
          // Update participant data
          setTeamData(prev => ({
            ...prev,
            participants: prev.participants.map((participant, i) =>
              i === index ? {
                ...participant,
                [config.identifierField]: identifier,
                full_name: userData.full_name || userData.name,
                email: userData.email || '',
                mobile_no: userData.mobile_no || userData.phone || '',
                department: userData.department || '',
                ...(userType === 'student' ? {
                  semester: userData.semester || '',
                  year_of_study: userData.year_of_study || ''
                } : {
                  designation: userData.designation || '',
                  experience_years: userData.experience_years || ''
                })
              } : participant
            )
          }));
        }
      } else {
        setError(`${config.identifierLabel} ${identifier} not found in the system.`);
      }
    } catch (error) {
      console.error('Error checking enrollment:', error);
      setError(`Failed to verify ${config.identifierLabel}. Please try again.`);
    } finally {
      setIsCheckingEnrollment(false);
    }
  };

  const validateTeamForm = () => {
    // Team name validation
    if (!teamData.team_name || teamData.team_name.trim() === '') {
      return 'Please enter a team name.';
    }

    // Team leader validation
    const requiredLeaderFields = userType === 'student' 
      ? ['enrollment_no', 'full_name', 'email', 'mobile_no', 'department']
      : ['employee_id', 'full_name', 'email', 'mobile_no', 'department'];

    for (let field of requiredLeaderFields) {
      if (!teamData.team_leader[field] || teamData.team_leader[field].trim() === '') {
        return `Please fill in the team leader's ${field.replace('_', ' ')} field.`;
      }
    }

    // Participants validation
    if (teamData.participants.length < (event?.min_team_size || 1)) {
      return `Team must have at least ${event?.min_team_size || 1} members.`;
    }

    if (teamData.participants.length > (event?.max_team_size || 5)) {
      return `Team cannot have more than ${event?.max_team_size || 5} members.`;
    }

    // Check each participant
    for (let i = 0; i < teamData.participants.length; i++) {
      const participant = teamData.participants[i];
      const requiredFields = userType === 'student' 
        ? ['enrollment_no', 'full_name', 'email', 'department']
        : ['employee_id', 'full_name', 'email', 'department'];

      for (let field of requiredFields) {
        if (!participant[field] || participant[field].trim() === '') {
          return `Please fill in ${field.replace('_', ' ')} for participant ${i + 1}.`;
        }
      }
    }

    // Check for duplicate identifiers
    const identifiers = [
      teamData.team_leader[config.identifierField],
      ...teamData.participants.map(p => p[config.identifierField])
    ];
    
    const uniqueIdentifiers = new Set(identifiers);
    if (uniqueIdentifiers.size !== identifiers.length) {
      return `Duplicate ${config.identifierLabel.toLowerCase()}s found. Each team member must have a unique ${config.identifierLabel.toLowerCase()}.`;
    }

    // Email validation
    const emails = [
      teamData.team_leader.email,
      ...teamData.participants.map(p => p.email)
    ];
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (let email of emails) {
      if (email && !emailRegex.test(email)) {
        return 'Please enter valid email addresses for all team members.';
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (registrationBlocked) {
      return;
    }

    const validationError = validateTeamForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const registrationData = {
        event_id: eventId,
        registration_type: 'team',
        user_type: userType,
        team_data: teamData
      };

      const response = await clientAPI.registerTeamForEvent(registrationData);
      
      if (response.data.success) {
        setSuccess('Team registration submitted successfully! Redirecting...');
        setTimeout(() => {
          navigate(config.routes.success);
        }, 2000);
      } else {
        setError(response.data.message || 'Team registration failed. Please try again.');
      }

    } catch (error) {
      console.error('Team registration error:', error);
      setError(error.response?.data?.message || 'Team registration failed. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
              <i className="fas fa-users text-purple-600 text-3xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{config.title}</h1>
            <p className="text-lg text-gray-600">{config.subtitle}</p>
          </div>

          {/* Event Information Card */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200 bg-purple-50">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <i className="fas fa-calendar-alt text-purple-600 mr-3"></i>
                Event Details
              </h2>
            </div>
            <div className="p-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-purple-600 mb-2">{event?.title || event?.event_name}</h3>
                <p className="text-gray-600">{event?.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Event Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{event ? new Date(event.date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">{event?.time || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Venue:</span>
                      <span className="font-medium">{event?.venue || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Registration Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Deadline:</span>
                      <span className="font-medium">{event ? new Date(event.registration_deadline).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fee:</span>
                      <span className="font-medium">
                        {event?.registration_type === 'paid' ? `₹${event?.registration_fee || 0}` : 'Free'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Team Requirements</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Min Size:</span>
                      <span className="font-medium">{event?.min_team_size || 1} members</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Size:</span>
                      <span className="font-medium">{event?.max_team_size || 5} members</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current:</span>
                      <span className="font-medium">{teamData.participants.length + 1} members</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <i className="fas fa-exclamation-circle text-red-600 mr-3"></i>
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <i className="fas fa-check-circle text-green-600 mr-3"></i>
                <span className="text-green-700">{success}</span>
              </div>
            </div>
          )}

          {/* Team Registration Form */}
          {!registrationBlocked && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Team Name */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <i className="fas fa-tag text-blue-600 mr-3"></i>
                    Team Information
                  </h3>
                </div>
                <div className="p-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      value={teamData.team_name}
                      onChange={(e) => handleTeamDataChange('team_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Enter a unique team name"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Team Leader */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <i className="fas fa-crown text-yellow-600 mr-3"></i>
                    Team Leader (You)
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {config.identifierLabel} *
                      </label>
                      <input
                        type="text"
                        value={teamData.team_leader[config.identifierField]}
                        onChange={(e) => handleLeaderChange(config.identifierField, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder={`Enter your ${config.identifierLabel.toLowerCase()}`}
                        required
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={teamData.team_leader.full_name}
                        onChange={(e) => handleLeaderChange('full_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={teamData.team_leader.email}
                        onChange={(e) => handleLeaderChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        value={teamData.team_leader.mobile_no}
                        onChange={(e) => handleLeaderChange('mobile_no', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter your mobile number"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Department *
                      </label>
                      <input
                        type="text"
                        value={teamData.team_leader.department}
                        onChange={(e) => handleLeaderChange('department', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter your department"
                        required
                      />
                    </div>
                    {userType === 'student' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Semester
                        </label>
                        <input
                          type="text"
                          value={teamData.team_leader.semester}
                          onChange={(e) => handleLeaderChange('semester', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Current semester"
                        />
                      </div>
                    )}
                    {userType === 'faculty' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Designation
                        </label>
                        <input
                          type="text"
                          value={teamData.team_leader.designation}
                          onChange={(e) => handleLeaderChange('designation', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Your designation"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <i className="fas fa-users text-green-600 mr-3"></i>
                      Team Members ({teamData.participants.length})
                    </h3>
                    <button
                      type="button"
                      onClick={addParticipant}
                      disabled={teamData.participants.length >= (event?.max_team_size || 5)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center text-sm"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Add Member
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {teamData.participants.map((participant, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-gray-900">Member {index + 1}</h4>
                        {teamData.participants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeParticipant(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            <i className="fas fa-trash mr-1"></i>
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {config.identifierLabel} *
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={participant[config.identifierField]}
                              onChange={(e) => handleParticipantChange(index, config.identifierField, e.target.value)}
                              onBlur={(e) => checkEnrollmentExists(e.target.value, index)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              placeholder={`Enter ${config.identifierLabel.toLowerCase()}`}
                              required
                            />
                            {isCheckingEnrollment && (
                              <div className="absolute right-2 top-2">
                                <i className="fas fa-spinner fa-spin text-gray-400"></i>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={participant.full_name}
                            onChange={(e) => handleParticipantChange(index, 'full_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            placeholder="Enter full name"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            value={participant.email}
                            onChange={(e) => handleParticipantChange(index, 'email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            placeholder="Enter email address"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mobile Number
                          </label>
                          <input
                            type="tel"
                            value={participant.mobile_no}
                            onChange={(e) => handleParticipantChange(index, 'mobile_no', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            placeholder="Enter mobile number"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Department *
                          </label>
                          <input
                            type="text"
                            value={participant.department}
                            onChange={(e) => handleParticipantChange(index, 'department', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            placeholder="Enter department"
                            required
                          />
                        </div>
                        {userType === 'student' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Semester
                            </label>
                            <input
                              type="text"
                              value={participant.semester}
                              onChange={(e) => handleParticipantChange(index, 'semester', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              placeholder="Current semester"
                            />
                          </div>
                        )}
                        {userType === 'faculty' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Designation
                            </label>
                            <input
                              type="text"
                              value={participant.designation}
                              onChange={(e) => handleParticipantChange(index, 'designation', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              placeholder="Designation"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <i className="fas fa-info-circle text-gray-600 mr-3"></i>
                    Additional Information
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Emergency Contact
                    </label>
                    <input
                      type="tel"
                      value={teamData.emergency_contact}
                      onChange={(e) => handleTeamDataChange('emergency_contact', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Emergency contact number for the team"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Requirements
                    </label>
                    <textarea
                      value={teamData.special_requirements}
                      onChange={(e) => handleTeamDataChange('special_requirements', e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Any special requirements for the team (dietary, accessibility, etc.)"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting || registrationBlocked}
                  className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Registering Team...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-users mr-2"></i>
                      Register Team
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(config.routes.events)}
                  className="bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Back to Events
                </button>
              </div>
            </form>
          )}

          {/* Blocked Registration Message */}
          {registrationBlocked && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
              <div className="text-red-500 text-4xl mb-4">
                <i className="fas fa-ban"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Team Registration Not Available</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => navigate(config.routes.events)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Back to Events
              </button>
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
};

export default TeamRegistration;
