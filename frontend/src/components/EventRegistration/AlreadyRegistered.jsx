import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clientAPI } from '../../api/axios';
import ClientLayout from '../../components/client/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';

const AlreadyRegistered = ({ userType = 'student' }) => {
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
        manageTeam: `/student/events/${eventId}/manage-team`,
        payment: `/student/events/${eventId}/payment`
      },
      showTeamManagement: true,
      showPaymentOptions: true
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
        attendance: `/faculty/events/${eventId}/attendance`,
        certificate: `/faculty/events/${eventId}/certificate`
      },
      showTeamManagement: false,
      showPaymentOptions: false,
      showFacultyActions: true
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

      // Fetch existing registration details
      const registrationResponse = await clientAPI.getRegistrationDetails(eventId);
      if (registrationResponse.data.success) {
        setRegistration(registrationResponse.data.registration);
        
        // If it's a team registration and user is student, fetch team info
        if (userType === 'student' && registrationResponse.data.registration?.registration_type?.includes('team')) {
          const teamResponse = await clientAPI.getTeamInfo(eventId);
          if (teamResponse.data.success) {
            setTeamInfo(teamResponse.data.team);
          }
        }
      }

    } catch (error) {
      console.error('Error fetching details:', error);
      setError('Failed to load details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRegistrationDate = () => {
    if (registration?.created_at) {
      return new Date(registration.created_at).toLocaleDateString();
    }
    return 'N/A';
  };

  const getRegistrationStatus = () => {
    if (registration?.status) {
      return registration.status;
    }
    return 'Confirmed';
  };

  const canModifyRegistration = () => {
    if (!event) return false;
    
    const eventDate = new Date(event.date);
    const now = new Date();
    const daysDifference = (eventDate - now) / (1000 * 60 * 60 * 24);
    
    // Allow modifications if event is more than 1 day away
    return daysDifference > 1;
  };

  const handleCancelRegistration = async () => {
    if (!window.confirm('Are you sure you want to cancel your registration? This action cannot be undone.')) {
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await clientAPI.cancelRegistration(eventId);
      
      if (response.data.success) {
        alert('Registration cancelled successfully.');
        navigate(config.routes.events);
      } else {
        setError(response.data.message || 'Failed to cancel registration.');
      }
      
    } catch (error) {
      console.error('Error cancelling registration:', error);
      setError('Failed to cancel registration. Please try again.');
    } finally {
      setIsLoading(false);
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
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <i className="fas fa-check-circle text-green-600 text-3xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Registration Confirmed</h1>
            <p className="text-lg text-gray-600">You are successfully registered for this event</p>
          </div>

          {/* Registration Status Card */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <i className="fas fa-clipboard-check text-green-600 mr-3"></i>
                Registration Details
              </h2>
            </div>
            <div className="p-6">
              {/* Event Name */}
              <div className="mb-6 text-center">
                <h3 className="text-2xl font-bold text-green-600 mb-2">{event?.title || event?.event_name}</h3>
              </div>

              {/* Registration ID Section */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {registration?.registration_type?.includes('team') 
                    ? 'Team Registration ID'
                    : 'Registration ID'
                  }
                </label>
                <div className="text-3xl font-mono font-bold text-green-600 bg-white border-2 border-green-300 rounded-lg py-3 px-4 inline-block">
                  {registration?.registration_id || registration?.registrar_id || "N/A"}
                </div>
                <p className="text-sm text-gray-600 mt-2">Keep this ID safe for attendance marking</p>
              </div>

              {/* Payment Status Section (for paid events) */}
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
                        <span className="text-yellow-700 font-medium">Payment Pending</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Team Information Section (for students with team registrations) */}
              {userType === 'student' && registration?.registration_type?.includes('team') && teamInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <h4 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <i className="fas fa-users text-blue-600 mr-3"></i>
                    Team Information
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

                  {/* Team Members List */}
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

              {/* User & Event Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">{event?.event_type || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Confirmation */}
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-center">
                  <i className="fas fa-check-circle text-green-600 text-xl mr-3"></i>
                  <div>
                    <span className="text-green-700 font-medium">Registration Status: </span>
                    <span className="text-green-800 font-bold">{getRegistrationStatus()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Important Information */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <i className="fas fa-info-circle text-yellow-600 text-lg mt-1 mr-3 flex-shrink-0"></i>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Important Information</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Keep your Registration ID safe for attendance marking</li>
                  {userType === 'student' && registration?.registration_type?.includes('team') && (
                    <>
                      <li>• All team members must be present on the event day</li>
                      <li>• The team leader is responsible for team coordination</li>
                      {registration.registration_type === 'team_leader' ? (
                        <li>• As team leader, you can manage your team during registration phase</li>
                      ) : (
                        <li>• Contact your team leader for any team-related queries</li>
                      )}
                      <li>• Team composition cannot be changed after registration closes</li>
                    </>
                  )}
                  {event?.registration_type === 'paid' && registration?.payment_status !== 'completed' && (
                    <li>• Complete payment to confirm your registration</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
              <>
                <Link
                  to={config.routes.eventDetails}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center flex items-center justify-center"
                >
                  <i className="fas fa-info-circle mr-2"></i>
                  View Event Details
                </Link>
                {event?.status === 'ongoing' || event?.status === 'completed' ? (
                  <>
                    <Link
                      to={config.routes.attendance}
                      className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors text-center flex items-center justify-center"
                    >
                      <i className="fas fa-check-square mr-2"></i>
                      Mark Attendance
                    </Link>
                    {event?.status === 'completed' && (
                      <Link
                        to={config.routes.certificate}
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors text-center flex items-center justify-center"
                      >
                        <i className="fas fa-certificate mr-2"></i>
                        Generate Certificate
                      </Link>
                    )}
                  </>
                ) : null}
              </>
            )}

            {/* Common buttons */}
            <Link
              to={config.routes.dashboard || config.routes.events}
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
            {canModifyRegistration() && (
              <button
                onClick={handleCancelRegistration}
                disabled={isLoading}
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <i className="fas fa-times mr-2"></i>
                {isLoading ? 'Cancelling...' : 'Cancel Registration'}
              </button>
            )}
          </div>

          {/* Contact Information */}
          <div className="mt-8 bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h3>
            <p className="text-gray-600 mb-4">If you have any questions about your registration, please contact us:</p>
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

export default AlreadyRegistered;
