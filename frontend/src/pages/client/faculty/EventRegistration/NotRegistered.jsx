import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { clientAPI } from '../../../../api/axios';
import ClientLayout from '../../../../components/client/Layout';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { XCircleIcon } from '@heroicons/react/24/solid';

const FacultyNotRegistered = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [registrationError, setRegistrationError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login');
      return;
    }
    
    fetchEventDetails();
  }, [eventId, isAuthenticated]);

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      
      const response = await clientAPI.getEventDetails(eventId);
      if (response.data.success) {
        setEvent(response.data.event);
        
        // Check why registration is not available
        await checkRegistrationStatus(response.data.event);
      } else {
        setError('Event not found or not available.');
      }

    } catch (error) {
      console.error('Error fetching event details:', error);
      setError('Failed to load event details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkRegistrationStatus = async (eventData) => {
    try {
      // Check if registration is still open
      const now = new Date();
      const registrationDeadline = new Date(eventData.registration_deadline);
      
      if (now > registrationDeadline) {
        setRegistrationError('Registration deadline has passed.');
        return;
      }

      // Check if event is full
      if (eventData.current_registrations >= eventData.max_participants) {
        setRegistrationError('Event is full. No more registrations are accepted.');
        return;
      }

      // Check if user is eligible
      if (eventData.target_audience !== 'faculty' && eventData.target_audience !== 'both') {
        setRegistrationError('This event is not available for faculty registration.');
        return;
      }

      // Check if user already tried to register but was rejected
      try {
        const registrationResponse = await clientAPI.checkRegistrationStatus(eventId);
        if (registrationResponse.data.status === 'rejected') {
          setRegistrationError('Your previous registration was rejected. Please contact the organizers for more information.');
          return;
        }
      } catch (regError) {
        // User is not registered, which is expected
      }

      // If we reach here, registration should be available
      setRegistrationError('Registration is available but you are not currently registered.');
      
    } catch (error) {
      console.error('Error checking registration status:', error);
      setRegistrationError('Unable to determine registration status.');
    }
  };

  const getRegistrationOptions = () => {
    if (!event) return [];

    const options = [];
    
    if (event.registration_type === 'both' || event.registration_type === 'individual') {
      options.push({
        type: 'individual',
        title: 'Individual Registration',
        description: 'Register as an individual faculty member',
        link: `/faculty/events/${eventId}/register/individual`,
        color: 'green'
      });
    }

    if (event.registration_type === 'both' || event.registration_type === 'team') {
      options.push({
        type: 'team',
        title: 'Team Registration',
        description: `Register as a faculty team (${event.team_size_min || 2}-${event.team_size_max || 5} members)`,
        link: `/faculty/events/${eventId}/register/team`,
        color: 'blue'
      });
    }

    return options;
  };

  const canRegister = () => {
    if (!event) return false;
    
    const now = new Date();
    const registrationDeadline = new Date(event.registration_deadline);
    
    return (
      now <= registrationDeadline &&
      event.current_registrations < event.max_participants &&
      (event.target_audience === 'faculty' || event.target_audience === 'both') &&
      !registrationError.includes('rejected') &&
      !registrationError.includes('deadline') &&
      !registrationError.includes('full')
    );
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
              <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Event</h2>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={() => navigate('/faculty/events')}
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
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
            {/* Warning Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-4">
                <XCircleIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Not Registered</h1>
              <p className="text-red-100">
                You are not registered for this event
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
                    <div>
                      <span className="font-medium">Deadline:</span> {new Date(event.registration_deadline).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Spots:</span> {event.current_registrations}/{event.max_participants}
                    </div>
                  </div>
                </div>
              )}

              {/* Registration Status */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Registration Status</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <XCircleIcon className="w-5 h-5 text-red-500 mr-2" />
                    <span className="text-sm font-medium text-red-800">Not Registered</span>
                  </div>
                  <p className="text-sm text-red-700">
                    {registrationError || 'You have not registered for this event yet.'}
                  </p>
                </div>
              </div>

              {/* Registration Options */}
              {canRegister() && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Registration Options</h3>
                  <div className="space-y-3">
                    {getRegistrationOptions().map((option) => (
                      <Link
                        key={option.type}
                        to={option.link}
                        className={`block p-4 border border-${option.color}-200 rounded-lg hover:bg-${option.color}-50 transition-colors`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className={`font-medium text-${option.color}-900`}>{option.title}</h4>
                            <p className={`text-sm text-${option.color}-700 mt-1`}>{option.description}</p>
                          </div>
                          <div className={`text-${option.color}-600`}>
                            →
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternative Actions */}
              <div className="space-y-3">
                <Link
                  to={`/faculty/events/${eventId}`}
                  className="w-full bg-blue-600 text-white text-center py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium block"
                >
                  View Event Details
                </Link>

                <Link
                  to="/faculty/events"
                  className="w-full border border-gray-300 text-gray-700 text-center py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium block"
                >
                  Browse Other Events
                </Link>

                <Link
                  to="/faculty/dashboard"
                  className="w-full bg-gray-600 text-white text-center py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium block"
                >
                  Go to Dashboard
                </Link>
              </div>

              {/* Information */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Need Help?</h4>
                <p className="text-sm text-blue-700">
                  If you're having trouble registering or have questions about this event, 
                  please contact the event organizers or visit the help center.
                </p>
                <div className="mt-3 space-y-2">
                  <Link
                    to="/faculty/help"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Visit Help Center →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default FacultyNotRegistered;
