import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clientAPI } from '../../api/axios';
import ClientLayout from '../client/Layout';
import LoadingSpinner from '../LoadingSpinner';

const RegistrationSuccess = ({ userType = 'student' }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [event, setEvent] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Configuration based on user type
  const userConfig = {
    student: {
      userInfoTitle: 'Student Information',
      userFields: {
        name: user?.full_name || user?.name,
        identifier: { label: 'Enrollment', value: user?.enrollment_no },
        department: user?.department,
        email: user?.email
      },
      routes: {
        events: '/student/events',
        dashboard: '/student/dashboard',
        payment: `/student/events/${eventId}/payment`,
        manageTeam: `/student/events/${eventId}/manage-team`
      },
      showTeamManagement: true,
      showPaymentOptions: true,
      successMessages: {
        individual: 'You have successfully registered for this event!',
        team: 'Your team has been successfully registered for this event!'
      }
    },
    faculty: {
      userInfoTitle: 'Faculty Information',
      userFields: {
        name: user?.full_name || user?.name || user?.faculty_name,
        identifier: { label: 'Employee ID', value: user?.employee_id || user?.faculty_id },
        department: user?.department,
        email: user?.email
      },
      routes: {
        events: '/faculty/events',
        dashboard: '/faculty/dashboard',
        eventDetails: `/faculty/events/${eventId}`,
        attendance: `/faculty/events/${eventId}/attendance`
      },
      showTeamManagement: false,
      showPaymentOptions: false,
      showFacultyActions: true,
      successMessages: {
        individual: 'You have successfully registered for this event!',
        team: 'Your faculty team has been successfully registered for this event!'
      }
    }
  };

  const config = userConfig[userType];

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login');
      return;
    }
    
    fetchDetails();
  }, [eventId, isAuthenticated]);

  const fetchDetails = async () => {
    try {
      setIsLoading(true);
      
      // Fetch event details
      const eventResponse = await clientAPI.getEventDetails(eventId);
      if (eventResponse.data.success) {
        setEvent(eventResponse.data.event);
      }

      // Fetch registration details
      const registrationResponse = await clientAPI.getRegistrationDetails(eventId);
      if (registrationResponse.data.success) {
        setRegistration(registrationResponse.data.registration);
        
        // If it's a team registration and user is student, fetch team info
        if (userType === 'student' && registrationResponse.data.registration?.registration_type?.includes('team')) {
          try {
            const teamResponse = await clientAPI.getTeamInfo(eventId);
            if (teamResponse.data.success) {
              setTeamInfo(teamResponse.data.team);
            }
          } catch (teamError) {
            console.warn('Team info not available yet:', teamError);
          }
        }
      }

    } catch (error) {
      console.error('Error fetching details:', error);
      setError('Failed to load registration details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getSuccessMessage = () => {
    const isTeamRegistration = registration?.registration_type?.includes('team');
    return isTeamRegistration 
      ? config.successMessages.team 
      : config.successMessages.individual;
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

  if (error) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-md mx-auto">
            <div className="bg-white shadow-lg rounded-lg p-6 text-center">
              <div className="text-red-500 text-5xl mb-4">❌</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Details</h2>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={() => navigate(config.routes.events)}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Back to Events
              </button>
            </div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
              <i className="fas fa-check-circle text-green-600 text-4xl"></i>
            </div>
            <h1 className="text-4xl font-bold text-green-600 mb-4">Registration Successful!</h1>
            <p className="text-xl text-gray-600 mb-2">{getSuccessMessage()}</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mx-auto max-w-lg">
              <p className="text-green-700 font-medium">
                <i className="fas fa-info-circle mr-2"></i>
                You will receive a confirmation email shortly with all the details.
              </p>
            </div>
          </div>

          {/* Registration Details Card */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                <i className="fas fa-ticket-alt text-green-600 mr-3"></i>
                Registration Confirmation
              </h2>
            </div>
            <div className="p-6">
              {/* Event Title */}
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-blue-600 mb-2">{event?.title || event?.event_name}</h3>
                <p className="text-gray-600 text-lg">{event?.description}</p>
              </div>

              {/* Registration ID Display */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-xl p-6 mb-8 text-center">
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  <i className="fas fa-id-card text-green-600 mr-2"></i>
                  {registration?.registration_type?.includes('team') 
                    ? 'Team Registration ID'
                    : 'Registration ID'
                  }
                </label>
                <div className="text-4xl font-mono font-bold text-green-600 bg-white border-3 border-green-400 rounded-lg py-4 px-6 inline-block shadow-lg">
                  {registration?.registration_id || registration?.registrar_id || "GENERATING..."}
                </div>
                <p className="text-sm text-gray-600 mt-3 font-medium">
                  <i className="fas fa-bookmark text-yellow-500 mr-1"></i>
                  Save this ID - you'll need it for attendance and future reference
                </p>
              </div>

              {/* Team Information (for team registrations) */}
              {userType === 'student' && registration?.registration_type?.includes('team') && teamInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <h4 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <i className="fas fa-users text-blue-600 mr-3"></i>
                    Team Registration Details
                  </h4>
                  
                  {/* Team Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white border border-blue-200 rounded-lg p-4 text-center">
                      <div className="text-sm font-medium text-gray-700">Team Name</div>
                      <div className="text-lg font-bold text-blue-600">{teamInfo.team_name}</div>
                    </div>
                    <div className="bg-white border border-blue-200 rounded-lg p-4 text-center">
                      <div className="text-sm font-medium text-gray-700">Team Size</div>
                      <div className="text-lg font-bold text-blue-600">{teamInfo.participant_count} members</div>
                    </div>
                    <div className="bg-white border border-blue-200 rounded-lg p-4 text-center">
                      <div className="text-sm font-medium text-gray-700">Team Leader</div>
                      <div className="text-lg font-bold text-blue-600">{teamInfo.leader_name}</div>
                    </div>
                  </div>

                  {/* Team Members */}
                  {teamInfo.participants && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Team Members</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {teamInfo.participants.map((participant, index) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="font-semibold text-gray-900">{participant.full_name}</div>
                            <div className="text-sm text-gray-600">{participant.enrollment_no}</div>
                            <div className="text-sm text-gray-600">{participant.department}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Team Role Display */}
                  <div className={`mt-4 p-3 rounded-lg ${
                    registration.registration_type === 'team_leader' 
                      ? 'bg-yellow-50 border border-yellow-200' 
                      : 'bg-green-50 border border-green-200'
                  }`}>
                    <div className="flex items-center justify-center">
                      <span className={`font-medium ${
                        registration.registration_type === 'team_leader' 
                          ? 'text-yellow-700' 
                          : 'text-green-700'
                      }`}>
                        Your Role: {registration.registration_type === 'team_leader' ? 'Team Leader' : 'Team Member'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* User and Event Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* User Information */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <i className="fas fa-user text-gray-600 mr-2"></i>
                    {config.userInfoTitle}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{config.userFields.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{config.userFields.identifier.label}:</span>
                      <span className="font-medium">{config.userFields.identifier.value}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium">{config.userFields.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{config.userFields.email}</span>
                    </div>
                  </div>
                </div>

                {/* Event Information */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <i className="fas fa-calendar text-gray-600 mr-2"></i>
                    Event Information
                  </h4>
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
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fee:</span>
                      <span className="font-medium">
                        {event?.registration_type === 'paid' ? `₹${event?.registration_fee || 0}` : 'Free'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Status (for paid events) */}
              {event?.registration_type === 'paid' && event?.registration_fee > 0 && (
                <div className="mb-6">
                  {registration?.payment_status === 'completed' ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-center">
                        <i className="fas fa-check-circle text-green-600 mr-3"></i>
                        <span className="text-green-700 font-medium">Payment Completed Successfully</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center justify-center">
                        <i className="fas fa-exclamation-triangle text-yellow-600 mr-3"></i>
                        <span className="text-yellow-700 font-medium">Payment Required to Complete Registration</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Registration Status */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-center">
                  <i className="fas fa-check-circle text-green-600 text-xl mr-3"></i>
                  <div>
                    <span className="text-green-700 font-medium">Registration Status: </span>
                    <span className="text-green-800 font-bold">Confirmed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <i className="fas fa-list-check text-blue-600 mr-3"></i>
              What's Next?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center">
                  <i className="fas fa-envelope text-blue-600 mr-2"></i>
                  <span>Check your email for confirmation details</span>
                </div>
                <div className="flex items-center">
                  <i className="fas fa-bookmark text-blue-600 mr-2"></i>
                  <span>Save your Registration ID</span>
                </div>
                {userType === 'student' && registration?.registration_type?.includes('team') && (
                  <div className="flex items-center">
                    <i className="fas fa-users text-blue-600 mr-2"></i>
                    <span>Coordinate with your team members</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <i className="fas fa-calendar-check text-blue-600 mr-2"></i>
                  <span>Mark the event date in your calendar</span>
                </div>
                <div className="flex items-center">
                  <i className="fas fa-clock text-blue-600 mr-2"></i>
                  <span>Arrive 15 minutes early</span>
                </div>
                {event?.registration_type === 'paid' && registration?.payment_status !== 'completed' && (
                  <div className="flex items-center">
                    <i className="fas fa-credit-card text-blue-600 mr-2"></i>
                    <span>Complete payment to confirm registration</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            {/* Student-specific buttons */}
            {config.showTeamManagement && registration?.registration_type === 'team_leader' && event?.status === 'upcoming' && event?.sub_status === 'registration_open' && (
              <Link
                to={config.routes.manageTeam}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors text-center flex items-center justify-center"
              >
                <i className="fas fa-users-cog mr-2"></i>
                Manage Team
              </Link>
            )}
            {config.showPaymentOptions && event?.registration_type === 'paid' && registration?.payment_status !== 'completed' && (
              <Link
                to={config.routes.payment}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors text-center flex items-center justify-center"
              >
                <i className="fas fa-credit-card mr-2"></i>
                Complete Payment
              </Link>
            )}

            {/* Faculty-specific buttons */}
            {config.showFacultyActions && (
              <Link
                to={config.routes.eventDetails}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center flex items-center justify-center"
              >
                <i className="fas fa-info-circle mr-2"></i>
                View Event Details
              </Link>
            )}

            {/* Common buttons */}
            <Link
              to={config.routes.dashboard}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center flex items-center justify-center"
            >
              <i className="fas fa-tachometer-alt mr-2"></i>
              Go to Dashboard
            </Link>
            <Link
              to={config.routes.events}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors text-center flex items-center justify-center"
            >
              <i className="fas fa-calendar mr-2"></i>
              Browse More Events
            </Link>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Support?</h3>
            <p className="text-gray-600 mb-4">If you have any questions about your registration or the event, feel free to contact us:</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm">
              <div className="flex items-center justify-center">
                <i className="fas fa-envelope text-blue-600 mr-2"></i>
                <span>events@college.edu</span>
              </div>
              <div className="flex items-center justify-center">
                <i className="fas fa-phone text-blue-600 mr-2"></i>
                <span>+91 XXXXX XXXXX</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default RegistrationSuccess;
