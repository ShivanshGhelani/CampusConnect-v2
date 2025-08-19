import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../../../../components/client/Layout';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import QRCodeDisplay from '../../../../components/client/QRCodeDisplay';
import { clientAPI } from '../../../../api/client';

const RegistrationSuccess = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [registrationData, setRegistrationData] = useState(null);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');

  // Get registration data from location state or API
  useEffect(() => {
    const loadRegistrationData = async () => {
      try {
        // ALWAYS fetch fresh data from API to get updated department information
        // Don't use cached navigation state data as it may be outdated
        
        // If no state data, try to fetch from API
        if (eventId) {
          const [eventResponse, statusResponse] = await Promise.all([
            clientAPI.getEventDetails(eventId),
            clientAPI.getRegistrationStatus(eventId)
          ]);

          const eventData = eventResponse.data.success ? eventResponse.data.event : eventResponse.data;
          setEvent(eventData);

          console.log('Registration status API response:', statusResponse.data);
          console.log('Registration data structure:', JSON.stringify(statusResponse.data.full_registration_data, null, 2));

          if (statusResponse.data.success && statusResponse.data.registered) {
            const regData = statusResponse.data.full_registration_data;
            
            // Add the top-level fields to the registration data for compatibility
            regData.registration_id = statusResponse.data.registration_id;
            regData.registration_type = statusResponse.data.registration_type;
            regData.registration_datetime = statusResponse.data.registration_datetime;
            
            // Flatten student_data to top level for frontend compatibility
            if (regData.student_data) {
              Object.assign(regData, regData.student_data);
            }
            
            setRegistrationData(regData);
          } else {
            setError('Registration not found or invalid');
          }
        } else {
          setError('Event ID not provided');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading registration data:', err);
        setError('Failed to load registration data');
        setLoading(false);
      }
    };

    loadRegistrationData();
  }, [eventId]);

  // Helper functions
  const getDepartment = (data) => {
    return data?.department || 
           data?.student_data?.department ||
           data?.dept ||
           data?.branch ||
           'N/A';
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  if (error || !registrationData || !event) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Registration Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'Unable to load registration data'}</p>
            <button
              onClick={() => navigate('/client/dashboard')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Check registration type
  const isTeamRegistration = registrationData.registration_type === 'team_leader' || 
                            registrationData.registration_type === 'team';
  
  // Get team data
  const teamName = registrationData.team_name || registrationData.student_data?.team_name;
  const teamMembers = registrationData.team_members || registrationData.student_data?.team_members || [];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
        <div className="container mx-auto px-4 py-8">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <i className="fas fa-check text-white text-2xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Registration Successful!</h1>
            <p className="text-lg text-gray-600">
              You have successfully registered for{' '}
              <span className="font-semibold text-blue-600">
                {event?.event_name || event?.title || event?.name || 'the event'}
              </span>
            </p>
          </div>

          {/* Registration Details Card */}
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Registration Confirmed</h2>
                  <h3 className="text-xl text-blue-100">
                    {event?.event_name || event?.title || event?.name || 'Event'}
                  </h3>
                  {isTeamRegistration ? (
                    <p className="text-lg text-blue-100">Team Registration</p>
                  ) : (
                    <p className="text-lg text-blue-100">Individual Registration</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* QR Code Section - Single QR for both individual and team */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 text-center flex items-center justify-center">
                  <i className="fas fa-qrcode mr-2 text-blue-600"></i>
                  {isTeamRegistration ? 'Team Attendance QR Code' : 'Your Attendance QR Code'}
                </h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* QR Code Display */}
                  <div className="flex justify-center">
                    <QRCodeDisplay 
                      registrationData={registrationData}
                      eventData={event}
                      size="medium"
                      showDownload={true}
                      showDetails={false}
                      style="blue"
                    />
                  </div>
                  
                  {/* Registration Details */}
                  <div className="space-y-4">
                    <div className="bg-white border border-blue-300 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Registration ID
                      </label>
                      <div className="text-2xl font-mono font-bold text-blue-600 break-all">
                        {registrationData.registration_id || registrationData.registrar_id || 'N/A'}
                      </div>
                      <p className="text-xs text-gray-600 mt-2">Keep this ID for backup verification</p>
                    </div>

                    {isTeamRegistration && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Team Information
                        </label>
                        <div className="text-lg font-bold text-purple-600">
                          {registrationData.team_name || 'Team Name'}
                        </div>
                        <p className="text-sm text-purple-700 mt-1">
                          Size: {((registrationData.team_members || []).length + 1)} members
                        </p>
                      </div>
                    )}

                    <div className={`border rounded-lg p-4 ${isTeamRegistration ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                      <div className={`flex items-start gap-3 ${isTeamRegistration ? 'text-blue-800' : 'text-green-800'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isTeamRegistration ? 'bg-blue-100' : 'bg-green-100'}`}>
                          <svg className={`w-3 h-3 ${isTeamRegistration ? 'text-blue-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h5 className={`font-medium mb-2 ${isTeamRegistration ? 'text-blue-900' : 'text-green-900'}`}>
                            {isTeamRegistration ? 'Team Attendance Instructions' : 'Attendance Instructions'}
                          </h5>
                          {isTeamRegistration ? (
                            <ul className="text-sm space-y-1">
                              <li>• Present this QR code to event organizers</li>
                              <li>• Organizers can mark attendance for individual team members</li>
                              <li>• Team members don't need to be together for attendance</li>
                              <li>• One QR code covers your entire team</li>
                            </ul>
                          ) : (
                            <p className="text-sm">
                              Present this QR code to event organizers for attendance marking. 
                              Keep it saved on your device or download a copy.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Information Section */}
              {isTeamRegistration && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <i className="fas fa-users mr-2 text-green-600"></i>
                    Team Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                      <p className="text-lg font-semibold text-gray-900">
                        {teamName}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Team Size</label>
                      <p className="text-lg font-semibold text-gray-900">
                        {teamMembers.length + 1} members
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Team Leader</label>
                    <div className="bg-white border border-gray-300 rounded-lg p-3">
                      <p className="font-semibold text-gray-900">
                        {registrationData.full_name || registrationData.student_data?.full_name || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {registrationData.enrollment_no || registrationData.student_data?.enrollment_no || 'N/A'} | {getDepartment(registrationData)}
                      </p>
                    </div>
                  </div>
                  
                  {teamMembers.length > 0 && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Team Participants</label>
                      <div className="space-y-2">
                        {teamMembers.map((member, index) => (
                          <div key={index} className="bg-white border border-gray-300 rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{member.name || member.full_name}</p>
                              <p className="text-sm text-gray-600">
                                {member.enrollment_no} | {getDepartment(member)}
                              </p>
                            </div>
                            <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                              Member {index + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Important Information */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <i className="fas fa-info-circle text-yellow-600 text-lg mt-1 mr-3 flex-shrink-0"></i>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Important Information</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Present your QR code or Registration ID for attendance marking</li>
                      {isTeamRegistration && (
                        <>
                          <li>• Team attendance is managed individually using the single team QR code</li>
                          <li>• Team leader is responsible for team communication</li>
                          <li>• Changes to team composition are not allowed after registration</li>
                        </>
                      )}
                      <li>• You will receive event updates via email and dashboard notifications</li>
                      <li>• Bring a valid college ID card on the event day</li>
                      <li>• Download and save your QR code for quick access during the event</li>
                      <li>• Check your dashboard regularly for event status updates</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button
              onClick={() => navigate('/client/dashboard')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center flex items-center justify-center"
            >
              <i className="fas fa-tachometer-alt mr-2"></i>
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate('/client/events')}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors text-center flex items-center justify-center"
            >
              <i className="fas fa-calendar-alt mr-2"></i>
              Browse More Events
            </button>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h3>
            <p className="text-gray-600 mb-4">
              If you have any questions about your registration, please contact us or check your dashboard for updates.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="mailto:support@campusconnect.edu"
                className="text-blue-600 hover:text-blue-700 font-medium underline"
              >
                Contact Support
              </a>
              <span className="hidden sm:inline text-gray-400">•</span>
              <button
                onClick={() => navigate('/client/events/help')}
                className="text-blue-600 hover:text-blue-700 font-medium underline"
              >
                Event Guidelines
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RegistrationSuccess;
