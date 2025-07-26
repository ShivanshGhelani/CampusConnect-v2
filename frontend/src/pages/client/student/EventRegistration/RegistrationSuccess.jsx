import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { clientAPI } from '../../../../api/axios';
import ClientLayout from '../../../../components/client/Layout';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { CheckIcon } from '@heroicons/react/24/solid';

const StudentRegistrationSuccess = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const [event, setEvent] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }
    
    fetchRegistrationDetails();
  }, [eventId, isAuthenticated, location]);

  const fetchRegistrationDetails = async () => {
    try {
      setIsLoading(true);
      
      // Fetch event details
      const eventResponse = await clientAPI.getEventDetails(eventId);
      if (eventResponse.data.success) {
        setEvent(eventResponse.data.event);
      }

      // Fetch registration details (if available)
      try {
        const registrationResponse = await clientAPI.getRegistrationDetails(eventId);
        if (registrationResponse.data.success) {
          setRegistration(registrationResponse.data.registration);
        }
      } catch (regError) {
        // Registration details might not be available immediately
        console.log('Registration details not yet available');
      }

    } catch (error) {
      console.error('Error fetching details:', error);
      setError('Failed to load event details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRegistrationId = () => {
    if (registration?.registration_id) {
      return registration.registration_id;
    }
    // Generate a temporary ID based on event and user
    return `REG-${eventId}-${user?.enrollment_no || user?.id || 'TEMP'}-${Date.now().toString().slice(-6)}`;
  };

  const getNextSteps = () => {
    const steps = [
      'Check your email for confirmation details',
      'Add the event to your calendar',
      'Prepare any required materials'
    ];

    if (event?.has_attendance) {
      steps.push('Mark your attendance on the event day');
    }

    if (event?.has_certificate) {
      steps.push('Download your certificate after event completion');
    }

    return steps;
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
                onClick={() => navigate('/student/events')}
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-4">
                <CheckIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Registration Successful!</h1>
              <p className="text-green-100">
                You have successfully registered for the event
              </p>
            </div>

            {/* Event Details */}
            <div className="p-6">
              {event && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Date:</span> {new Date(event.date).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Time:</span> {event.time}
                    </div>
                    <div>
                      <span className="font-medium">Venue:</span> {event.venue}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span> {event.event_type}
                    </div>
                  </div>
                </div>
              )}

              {/* Registration Details */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Registration Details</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Registration ID:</span>
                    <span className="text-sm font-mono text-blue-600 bg-white px-2 py-1 rounded">
                      {getRegistrationId()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Student:</span>
                    <span className="text-sm text-gray-900">{user?.full_name || user?.name}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Enrollment No:</span>
                    <span className="text-sm text-gray-900">{user?.enrollment_no}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Registration Date:</span>
                    <span className="text-sm text-gray-900">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Next Steps</h3>
                <div className="space-y-3">
                  {getNextSteps().map((step, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                        {index + 1}
                      </div>
                      <p className="text-gray-700">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Link
                    to={`/student/events/${eventId}`}
                    className="bg-blue-600 text-white text-center py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    View Event Details
                  </Link>
                  <Link
                    to="/student/events"
                    className="bg-gray-600 text-white text-center py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    Browse More Events
                  </Link>
                </div>

                {event?.has_attendance && (
                  <Link
                    to={`/student/events/${eventId}/attendance`}
                    className="w-full bg-green-600 text-white text-center py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium block"
                  >
                    Mark Attendance (Available on Event Day)
                  </Link>
                )}

                <Link
                  to="/student/dashboard"
                  className="w-full border border-gray-300 text-gray-700 text-center py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium block"
                >
                  Go to Dashboard
                </Link>
              </div>

              {/* Additional Information */}
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Important Note</h4>
                <p className="text-sm text-yellow-700">
                  Please keep your registration ID for future reference. You may need it for attendance marking or certificate generation.
                  Check your email for detailed event information and any updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default StudentRegistrationSuccess;
