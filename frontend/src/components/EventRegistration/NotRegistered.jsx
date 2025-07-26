import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clientAPI } from '../../api/axios';
import ClientLayout from '../client/Layout';
import LoadingSpinner from '../LoadingSpinner';

const NotRegistered = ({ userType = 'student' }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [registrationError, setRegistrationError] = useState('');

  // Configuration based on user type
  const userConfig = {
    student: {
      routes: {
        login: '/auth/login',
        events: '/student/events',
        dashboard: '/student/dashboard',
        individualReg: `/student/events/${eventId}/register/individual`,
        teamReg: `/student/events/${eventId}/register/team`
      },
      targetAudience: ['students', 'both'],
      errorMessages: {
        notEligible: 'This event is not available for student registration.',
        contactInfo: 'For assistance, please contact the student affairs office.'
      }
    },
    faculty: {
      routes: {
        login: '/auth/login',
        events: '/faculty/events',
        dashboard: '/faculty/dashboard',
        individualReg: `/faculty/events/${eventId}/register/individual`,
        teamReg: `/faculty/events/${eventId}/register/team`
      },
      targetAudience: ['faculty', 'both'],
      errorMessages: {
        notEligible: 'This event is not available for faculty registration.',
        contactInfo: 'For assistance, please contact the faculty coordinator.'
      }
    }
  };

  const config = userConfig[userType];

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(config.routes.login);
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
      if (!config.targetAudience.includes(eventData.target_audience)) {
        setRegistrationError(config.errorMessages.notEligible);
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
        description: 'Register as an individual participant',
        icon: 'fas fa-user',
        color: 'blue',
        route: config.routes.individualReg
      });
    }

    if (event.registration_type === 'both' || event.registration_type === 'team') {
      options.push({
        type: 'team',
        title: 'Team Registration',
        description: 'Register as part of a team',
        icon: 'fas fa-users',
        color: 'purple',
        route: config.routes.teamReg
      });
    }

    return options;
  };

  const isRegistrationAvailable = () => {
    if (!event) return false;
    
    const now = new Date();
    const registrationDeadline = new Date(event.registration_deadline);
    
    return (
      now <= registrationDeadline &&
      event.current_registrations < event.max_participants &&
      config.targetAudience.includes(event.target_audience) &&
      event.status === 'upcoming' &&
      (event.sub_status === 'registration_open' || !event.sub_status)
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
            <div className="mx-auto mb-6 w-20 h-20 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
              <i className="fas fa-exclamation-triangle text-red-600 text-3xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Registration Required</h1>
            <p className="text-lg text-gray-600">You are not currently registered for this event</p>
          </div>

          {/* Event Information Card */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <i className="fas fa-calendar-alt text-blue-600 mr-3"></i>
                Event Details
              </h2>
            </div>
            <div className="p-6">
              {/* Event Name */}
              <div className="mb-6 text-center">
                <h3 className="text-2xl font-bold text-blue-600 mb-2">{event?.title || event?.event_name}</h3>
                <p className="text-gray-600">{event?.description}</p>
              </div>

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <i className="fas fa-info-circle text-gray-600 mr-2"></i>
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

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <i className="fas fa-users text-gray-600 mr-2"></i>
                    Registration Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Deadline:</span>
                      <span className="font-medium">{event ? new Date(event.registration_deadline).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Participants:</span>
                      <span className="font-medium">{event?.current_registrations || 0} / {event?.max_participants || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fee:</span>
                      <span className="font-medium">
                        {event?.registration_type === 'paid' ? `₹${event?.registration_fee || 0}` : 'Free'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Target:</span>
                      <span className="font-medium capitalize">{event?.target_audience || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration Status */}
              <div className={`p-4 rounded-lg border ${
                isRegistrationAvailable() 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-center">
                  <i className={`text-xl mr-3 ${
                    isRegistrationAvailable() 
                      ? 'fas fa-check-circle text-green-600' 
                      : 'fas fa-times-circle text-red-600'
                  }`}></i>
                  <div className="text-center">
                    <span className={`font-medium ${
                      isRegistrationAvailable() 
                        ? 'text-green-700' 
                        : 'text-red-700'
                    }`}>
                      {isRegistrationAvailable() ? 'Registration Available' : 'Registration Not Available'}
                    </span>
                    {registrationError && (
                      <p className="text-sm text-gray-600 mt-1">{registrationError}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Options */}
          {isRegistrationAvailable() && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
              <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <i className="fas fa-user-plus text-green-600 mr-3"></i>
                  Registration Options
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {getRegistrationOptions().map((option) => (
                    <Link
                      key={option.type}
                      to={option.route}
                      className={`bg-gradient-to-br from-${option.color}-50 to-${option.color}-100 border-2 border-${option.color}-200 rounded-lg p-6 hover:from-${option.color}-100 hover:to-${option.color}-200 hover:border-${option.color}-300 transition-all duration-200 transform hover:scale-105 block text-center`}
                    >
                      <div className={`w-16 h-16 bg-${option.color}-600 rounded-full flex items-center justify-center mx-auto mb-4`}>
                        <i className={`${option.icon} text-white text-2xl`}></i>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{option.title}</h3>
                      <p className="text-gray-600 text-sm mb-4">{option.description}</p>
                      <div className={`bg-${option.color}-600 text-white px-4 py-2 rounded-lg font-semibold inline-flex items-center`}>
                        Register Now
                        <i className="fas fa-arrow-right ml-2"></i>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex items-start">
              <i className="fas fa-question-circle text-yellow-600 text-lg mt-1 mr-3 flex-shrink-0"></i>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Need Help with Registration?</h4>
                <div className="text-sm text-gray-700 space-y-2">
                  <p>• Make sure you meet the eligibility criteria for this event</p>
                  <p>• Check that the registration deadline hasn't passed</p>
                  <p>• Ensure there are still available spots</p>
                  {event?.registration_type === 'paid' && (
                    <p>• Have your payment method ready for paid events</p>
                  )}
                  <p>• {config.errorMessages.contactInfo}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={config.routes.events}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center flex items-center justify-center"
            >
              <i className="fas fa-calendar mr-2"></i>
              Browse Other Events
            </Link>
            <Link
              to={config.routes.dashboard}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors text-center flex items-center justify-center"
            >
              <i className="fas fa-tachometer-alt mr-2"></i>
              Go to Dashboard
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              <i className="fas fa-sync-alt mr-2"></i>
              Refresh Status
            </button>
          </div>

          {/* Contact Information */}
          <div className="mt-8 bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Still Need Help?</h3>
            <p className="text-gray-600 mb-4">If you're having trouble with registration, please contact us:</p>
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

export default NotRegistered;
