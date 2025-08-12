import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../../../../components/client/Layout';
import LoadingSpinner from '../../../../components/LoadingSpinner';
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
            
            console.log('=== BACKEND DATA CHECK ===');
            console.log('Leader department from backend:', regData.department);
            console.log('Team members from backend:', regData.team_members);
            if (regData.team_members && regData.team_members.length > 0) {
              console.log('First team member department:', regData.team_members[0].department);
            }
            setRegistrationData(regData);
          } else {
            // Not registered, redirect to registration page
            navigate(`/student/events/${eventId}/register`);
            return;
          }
        }
      } catch (error) {
        console.error('Error loading registration data:', error);
        setError('Failed to load registration details');
      } finally {
        setLoading(false);
      }
    };

    loadRegistrationData();
  }, [eventId, location.state, navigate]);

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
  if (error || !registrationData || !event) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Registration Not Found</h1>
            <p className="text-gray-600 mb-4">{error || 'Unable to find registration details.'}</p>
            <button
              onClick={() => navigate('/client/events')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Back to Events
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const isTeamRegistration = registrationData.registration_type === 'team' || registrationData.registration_type === 'team_leader';
  const paymentCompleted = registrationData.payment_status === 'completed';

  // Extract team members from various possible data structures
  const getTeamMembers = () => {
    // Check multiple possible locations for team member data
    if (registrationData.team_members) return registrationData.team_members;
    if (registrationData.student_data?.team_members) return registrationData.student_data.team_members;
    if (registrationData.team_info?.participants) return registrationData.team_info.participants;
    return [];
  };

  const getTeamName = () => {
    return registrationData.team_name || 
           registrationData.student_data?.team_name || 
           registrationData.team_info?.team_name || 
           'N/A';
  };

  const getDepartment = (data) => {
    // Check multiple possible locations for department data
    return data?.department || 
           data?.student_data?.department ||
           data?.dept ||
           data?.branch ||
           'N/A';
  };

  const teamMembers = getTeamMembers();
  const teamName = getTeamName();

  // Debug logging
  console.log('=== REGISTRATION SUCCESS DEBUG ===');
  console.log('Registration data:', registrationData);
  console.log('Team members:', teamMembers);
  console.log('Team name:', teamName);
  console.log('Leader department check:', {
    'registrationData.department': registrationData.department,
    'registrationData.student_data?.department': registrationData.student_data?.department,
    'getDepartment result': getDepartment(registrationData)
  });
  if (teamMembers.length > 0) {
    console.log('First team member department check:', {
      'participant.department': teamMembers[0].department,
      'getDepartment result': getDepartment(teamMembers[0])
    });
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
              <i className="fas fa-check-circle text-green-600 text-4xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Registration Successful!</h1>
            <p className="text-lg text-gray-600">You have successfully registered for the event</p>
          </div>

          {/* Payment Success Message (if applicable) */}
          {paymentCompleted && (
            <div className="bg-green-50 border-l-4 border-green-400 text-green-700 px-6 py-4 rounded mb-6">
              <div className="flex items-center">
                <i className="fas fa-check-circle text-green-600 mr-3 text-xl"></i>
                <div>
                  <h3 className="font-semibold text-lg">Payment Completed Successfully!</h3>
                  <p className="text-sm mt-1">Your registration is now confirmed and payment has been processed.</p>
                </div>
              </div>
            </div>
          )}

          {/* Registration Details Card */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
              <h2 className="text-xl font-semibold text-gray-900">Registration Details</h2>
            </div>
            <div className="p-6">
              {/* Event Name */}
              <div className="mb-6 text-center">
                <h3 className="text-2xl font-bold text-blue-600 mb-2">
                  {event?.event_name || event?.title || event?.name || 'Event'}
                </h3>
                {isTeamRegistration ? (
                  <p className="text-lg text-gray-600">Team Registration</p>
                ) : (
                  <p className="text-lg text-gray-600">Individual Registration</p>
                )}
              </div>

              {/* Registration ID Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isTeamRegistration ? 'Team Registration ID' : 'Your Registration ID'}
                </label>
                <div className="text-3xl font-mono font-bold text-blue-600 bg-white border-2 border-blue-300 rounded-lg py-3 px-4 inline-block">
                  {registrationData.registration_id || registrationData.registrar_id || 'N/A'}
                </div>
                <p className="text-sm text-gray-600 mt-2">Please save this ID for future reference</p>
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
                        {/* Calculate team size: leader + team members */}
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
                        {teamMembers.map((participant, index) => (
                          <div key={index} className="bg-white border border-gray-300 rounded-lg p-3 flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {participant.name || participant.full_name || 'N/A'}
                              </p>
                              <p className="text-sm text-gray-600">
                                {participant.enrollment_no || 'N/A'} | {getDepartment(participant)}
                              </p>
                            </div>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Verified</span>
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
                      <li>• Keep your Registration ID safe for attendance marking</li>
                      {isTeamRegistration && (
                        <>
                          <li>• All team members must be present on the event day</li>
                          <li>• Team leader is responsible for team communication</li>
                          <li>• Changes to team composition are not allowed after registration</li>
                        </>
                      )}
                      <li>• You will receive event updates via email</li>
                      <li>• Bring a valid ID card on the event day</li>
                      <li>• Check your dashboard for event status updates</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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

export default RegistrationSuccess;
