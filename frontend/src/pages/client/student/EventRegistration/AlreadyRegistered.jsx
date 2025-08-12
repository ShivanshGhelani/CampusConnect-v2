import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { clientAPI } from '../../../../api/client';
import Layout from '../../../../components/client/Layout';
import LoadingSpinner from '../../../../components/LoadingSpinner';

/**
 * AlreadyRegistered - Page shown when user is already registered for an event
 * Replicates the existing_registration.html template
 */
const AlreadyRegistered = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadRegistrationDetails = async () => {
      if (!eventId) {
        setError('Event ID is required');
        setLoading(false);
        return;
      }

      try {
        // Load event details
        const eventResponse = await clientAPI.getEventDetails(eventId);
        
        // Correctly access the event data from the API response
        const eventData = eventResponse.data.success ? eventResponse.data.event : eventResponse.data;
        setEvent(eventData);

        // Load registration details
        const registrationResponse = await clientAPI.getRegistrationStatus(eventId);
        if (registrationResponse.data.registered) {
          const regData = registrationResponse.data.full_registration_data;
          
          // Add the top-level fields to the registration data for compatibility
          regData.registration_id = registrationResponse.data.registration_id;
          regData.registration_type = registrationResponse.data.registration_type;
          regData.registration_datetime = registrationResponse.data.registration_datetime;
          
          // Flatten student_data to top level for frontend compatibility
          if (regData.student_data) {
            Object.assign(regData, regData.student_data);
          }
          
          setRegistration(regData);
          
          // If team registration, load team info
          if (regData.registration_type === 'team' ||
              regData.registration_type === 'team_leader' ||
              regData.registration_type === 'team_participant') {
            try {
              const teamResponse = await clientAPI.getTeamDetails(eventId);
              setTeamInfo(teamResponse.data);
            } catch (teamError) {
              console.error('Error loading team details:', teamError);
            }
          }
        } else {
          // If not registered, redirect to registration
          navigate(`/student/events/${eventId}/register`);
          return;
        }
      } catch (error) {
        console.error('Error loading registration details:', error);
        setError('Failed to load registration details');
      } finally {
        setLoading(false);
      }
    };

    loadRegistrationDetails();
  }, [eventId, navigate]);

  const formatVenue = (venue) => {
    if (typeof venue === 'string') return venue;
    if (venue && venue.name) return venue.name;
    return 'TBD';
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'TBD';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'TBD';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateString;
    }
  };

  const handleManageTeam = () => {
    navigate(`/client/events/${eventId}/manage-team`);
  };

  const handleCompletePayment = () => {
    navigate(`/client/events/${eventId}/payment`);
  };

  const handleGoToDashboard = () => {
    navigate('/client/dashboard');
  };

  const handleBrowseEvents = () => {
    navigate('/client/events');
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (error || !event || !registration) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-gray-600 mb-4">{error || 'Registration not found'}</p>
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

  const isTeamRegistration = ['team', 'team_leader', 'team_participant'].includes(registration.registration_type);
  const isTeamLeader = registration.registration_type === 'team_leader';
  const isPaidEvent = event.registration_type === 'paid' && event.registration_fee > 0;
  const isPaymentCompleted = registration.payment_status === 'completed';

  return (
    <Layout>
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
                <h3 className="text-2xl font-bold text-green-600 mb-2">{event.event_name || event.title}</h3>
              </div>

              {/* Registration ID Section */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isTeamRegistration ? 'Team Registration ID' : 'Registration ID'}
                </label>
                <div className="text-3xl font-mono font-bold text-green-600 bg-white border-2 border-green-300 rounded-lg py-3 px-4 inline-block">
                  {registration.registrar_id || registration.registration_id || 'N/A'}
                </div>
                <p className="text-sm text-gray-600 mt-2">Keep this ID safe for attendance marking</p>
              </div>

              {/* Payment Status Section */}
              {isPaidEvent && (
                <div className="mb-6">
                  {isPaymentCompleted ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-center">
                        <i className="fas fa-check-circle text-green-600 text-xl mr-3"></i>
                        <div className="text-center">
                          <h4 className="font-semibold text-green-700 text-lg">Payment Successful!</h4>
                          <p className="text-sm text-green-700 mt-1">
                            Amount Paid: ₹{(event.registration_fee * (teamInfo?.participant_count || 1)).toFixed(2)}
                            {registration.payment_completed_datetime && (
                              <span> | Paid on {formatDateTime(registration.payment_completed_datetime)}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center justify-center">
                        <i className="fas fa-exclamation-triangle text-yellow-600 text-xl mr-3"></i>
                        <div className="text-center">
                          <h4 className="font-semibold text-yellow-700 text-lg">Payment Pending</h4>
                          <p className="text-sm text-yellow-700 mt-1">Complete your payment to confirm registration</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Team Information Section */}
              {isTeamRegistration && teamInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <h4 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <i className="fas fa-users text-blue-600 mr-3"></i>
                    Team Information
                  </h4>
                  
                  {/* Team Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white border border-blue-200 rounded-lg p-4 text-center">
                      <i className="fas fa-flag text-blue-600 text-2xl mb-2"></i>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                      <p className="text-lg font-bold text-gray-900">{teamInfo.team_name}</p>
                    </div>
                    <div className="bg-white border border-blue-200 rounded-lg p-4 text-center">
                      <i className="fas fa-user-tie text-blue-600 text-2xl mb-2"></i>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Team Leader</label>
                      <p className="text-lg font-semibold text-gray-900">{teamInfo.leader_name}</p>
                      <p className="text-sm text-gray-600">{teamInfo.leader_enrollment}</p>
                    </div>
                    <div className="bg-white border border-blue-200 rounded-lg p-4 text-center">
                      <i className="fas fa-users text-blue-600 text-2xl mb-2"></i>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Team Size</label>
                      <p className="text-lg font-bold text-gray-900">{teamInfo.participant_count} members</p>
                    </div>
                  </div>

                  {/* Team Members List */}
                  {teamInfo.participants && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Team Members</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Team Leader Card */}
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4 flex items-center">
                          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                            <i className="fas fa-crown"></i>
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{teamInfo.leader_name}</h3>
                            <p className="text-blue-100 text-sm">{teamInfo.leader_enrollment}</p>
                            <p className="text-blue-100 text-xs">Team Leader</p>
                          </div>
                        </div>
                        
                        {/* Team Participants Cards */}
                        {teamInfo.participants.map((participant, index) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-lg mr-4">
                              {participant.full_name ? participant.full_name[0].toUpperCase() : participant.enrollment_no[0]}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{participant.full_name || 'Name not available'}</h3>
                              <p className="text-gray-600 text-sm">{participant.enrollment_no}</p>
                              {participant.department && (
                                <p className="text-gray-500 text-xs">{participant.department}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Team Role Display */}
                  <div className={`mt-4 p-3 rounded-lg ${
                    isTeamLeader 
                      ? 'bg-yellow-50 border border-yellow-200' 
                      : 'bg-green-50 border border-green-200'
                  }`}>
                    <div className="flex items-center justify-center">
                      {isTeamLeader ? (
                        <>
                          <i className="fas fa-crown text-yellow-600 mr-2"></i>
                          <span className="font-semibold text-yellow-700">You are the Team Leader</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-user-friends text-green-600 mr-2"></i>
                          <span className="font-semibold text-green-700">You are a Team Member</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Student & Event Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student Information */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <i className="fas fa-user text-blue-600 mr-2"></i>
                    Student Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{registration.full_name || user?.full_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Enrollment:</span>
                      <span className="font-medium font-mono">{registration.enrollment_no || user?.enrollment_no}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium">{registration.department || user?.department || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Semester:</span>
                      <span className="font-medium">{registration.semester || user?.semester || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Event Information */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <i className="fas fa-calendar text-blue-600 mr-2"></i>
                    Event Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">{event.event_type || event.category || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mode:</span>
                      <span className="font-medium">{event.mode || 'N/A'}</span>
                    </div>
                    {event.venue && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Venue:</span>
                        <span className="font-medium text-right">{formatVenue(event.venue)}</span>
                      </div>
                    )}
                    {event.start_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium">{formatDateTime(event.start_date)}</span>
                      </div>
                    )}
                    {event.start_time && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time:</span>
                        <span className="font-medium">{event.start_time}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Confirmation */}
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-center">
                  <i className="fas fa-check-circle text-green-600 text-xl mr-3"></i>
                  <div>
                    <h4 className="font-semibold text-green-700">Registration Confirmed</h4>
                    <p className="text-sm text-green-700">
                      Registered on {registration.registration_datetime ? formatDateTime(registration.registration_datetime) : 'N/A'}
                    </p>
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
                  {isTeamRegistration && (
                    <>
                      <li>• All team members must be present on the event day</li>
                      <li>• The team leader is responsible for team coordination</li>
                      {isTeamLeader ? (
                        <>
                          <li>• As team leader, you can manage your team during registration phase</li>
                          <li>• Team composition cannot be changed after registration closes</li>
                        </>
                      ) : (
                        <li>• Contact your team leader for any team-related queries</li>
                      )}
                    </>
                  )}
                  {isPaidEvent && !isPaymentCompleted && (
                    <li>• Complete payment to confirm your registration</li>
                  )}
                  <li>• Bring a valid ID card on the event day</li>
                  <li>• Check your dashboard for event status updates</li>
                  <li>• Contact event organizers if you need to make changes</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isTeamLeader && event.status === 'upcoming' && event.sub_status === 'registration_open' && (
              <button
                onClick={handleManageTeam}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center"
              >
                <i className="fas fa-users-cog mr-2"></i>
                Manage Team
              </button>
            )}
            
            {isPaidEvent && !isPaymentCompleted && (
              <button
                onClick={handleCompletePayment}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <i className="fas fa-credit-card mr-2"></i>
                Complete Payment
              </button>
            )}
            
            <button
              onClick={handleGoToDashboard}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <i className="fas fa-tachometer-alt mr-2"></i>
              Go to Dashboard
            </button>
            
            <button
              onClick={handleBrowseEvents}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center"
            >
              <i className="fas fa-calendar mr-2"></i>
              Browse More Events
            </button>
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
    </Layout>
  );
};

export default AlreadyRegistered;
