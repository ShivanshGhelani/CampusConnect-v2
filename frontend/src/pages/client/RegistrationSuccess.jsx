import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ClientLayout from '../../components/client/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';

const RegistrationSuccess = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [registrationData, setRegistrationData] = useState(null);

  useEffect(() => {
    // Check if we're in development mode and accessing via /dev/ route
    const isDevelopmentMode = location.pathname.startsWith('/dev/');
    
    if (!isAuthenticated && !isDevelopmentMode) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }
    
    // Get registration data from location state or provide mock data
    const regData = location.state?.registrationData;
    
    if (isDevelopmentMode || regData) {
      const mockData = {
        event_name: 'Mock Event - Registration Success',
        registrar_id: 'REG123456789',
        is_team_registration: false,
        payment_completed: false,
        team_info: null,
        ...regData
      };
      
      // For team registration demo
      if (location.pathname.includes('team') || regData?.is_team_registration) {
        mockData.is_team_registration = true;
        mockData.team_info = {
          team_name: 'Tech Innovators',
          participant_count: 3,
          leader_name: 'John Doe',
          leader_enrollment: '21BECE40015',
          participants: [
            {
              full_name: 'Jane Smith',
              enrollment_no: '21BEIT40025',
              department: 'Information Technology'
            },
            {
              full_name: 'Mike Johnson',
              enrollment_no: '21BECS40035',
              department: 'Computer Science'
            }
          ]
        };
      }
      
      setRegistrationData(mockData);
    } else {
      // In real app, you would fetch registration details from API
      // For now, redirect to dashboard if no data available
      navigate('/client/dashboard');
      return;
    }
    
    setIsLoading(false);
  }, [eventId, isAuthenticated, location, navigate]);

  if (isLoading) {
    return (
      <ClientLayout>
        <LoadingSpinner />
      </ClientLayout>
    );
  }

  if (!registrationData) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <i className="fas fa-exclamation-triangle text-red-600 text-2xl mb-4"></i>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Registration Data Not Found</h1>
              <p className="text-gray-600">Unable to load registration details.</p>
            </div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
              <i className="fas fa-check-circle text-green-600 text-4xl"></i>
            </div>
            
            {/* Development Mode Notice */}
            {location.pathname.startsWith('/dev/') && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 max-w-2xl mx-auto">
                <i className="fas fa-code mr-2"></i>
                <strong>Development Mode:</strong> This is a test version with mock registration data.
              </div>
            )}
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Registration Successful!</h1>
            <p className="text-lg text-gray-600">You have successfully registered for the event</p>
          </div>

          {/* Payment Success Message (if applicable) */}
          {registrationData.payment_completed && (
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
                <h3 className="text-2xl font-bold text-blue-600 mb-2">{registrationData.event_name}</h3>
                {registrationData.is_team_registration ? (
                  <p className="text-lg text-gray-600">Team Registration</p>
                ) : (
                  <p className="text-lg text-gray-600">Individual Registration</p>
                )}
              </div>

              {/* Registration ID Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {registrationData.is_team_registration ? 'Team Registration ID' : 'Your Registration ID'}
                </label>
                <div className="text-3xl font-mono font-bold text-blue-600 bg-white border-2 border-blue-300 rounded-lg py-3 px-4 inline-block">
                  {registrationData.registrar_id}
                </div>
                <p className="text-sm text-gray-600 mt-2">Please save this ID for future reference</p>
              </div>

              {registrationData.is_team_registration && registrationData.team_info && (
                /* Team Information Section */
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <i className="fas fa-users mr-2 text-green-600"></i>
                    Team Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                      <p className="text-lg font-semibold text-gray-900">{registrationData.team_info.team_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Team Size</label>
                      <p className="text-lg font-semibold text-gray-900">{registrationData.team_info.participant_count} members</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Team Leader</label>
                    <div className="bg-white border border-gray-300 rounded-lg p-3">
                      <p className="font-semibold text-gray-900">{registrationData.team_info.leader_name}</p>
                      <p className="text-sm text-gray-600">{registrationData.team_info.leader_enrollment}</p>
                    </div>
                  </div>
                  
                  {registrationData.team_info.participants && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Team Participants</label>
                      <div className="space-y-2">
                        {registrationData.team_info.participants.map((participant, index) => (
                          <div key={index} className="bg-white border border-gray-300 rounded-lg p-3 flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-gray-900">{participant.full_name}</p>
                              <p className="text-sm text-gray-600">{participant.enrollment_no} | {participant.department}</p>
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
                      {registrationData.is_team_registration && (
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
            <Link
              to="/client/dashboard"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center flex items-center justify-center"
            >
              <i className="fas fa-tachometer-alt mr-2"></i>
              Go to Dashboard
            </Link>
            <Link
              to="/client/events"
              className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors text-center flex items-center justify-center"
            >
              <i className="fas fa-calendar mr-2"></i>
              Browse More Events
            </Link>
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

export default RegistrationSuccess;
