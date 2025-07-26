import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { clientAPI } from '../../../../api/axios';
import ClientLayout from '../../../../components/client/Layout';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';

const StudentAlreadyRegistered = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [event, setEvent] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
        navigate('/student/events');
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
            {/* Warning Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Already Registered</h1>
              <p className="text-orange-100">
                You are already registered for this event
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

              {/* Registration Status */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Registration Status</h3>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <span className="text-sm font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded">
                      {getRegistrationStatus()}
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
                    <span className="text-sm text-gray-900">{getRegistrationDate()}</span>
                  </div>
                  {registration?.registration_id && (
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-medium text-gray-700">Registration ID:</span>
                      <span className="text-sm font-mono text-orange-600 bg-white px-2 py-1 rounded">
                        {registration.registration_id}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Available Actions */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Available Actions</h3>
                <div className="space-y-3">
                  <Link
                    to={`/student/events/${eventId}`}
                    className="w-full bg-blue-600 text-white text-center py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium block"
                  >
                    View Event Details
                  </Link>

                  {event?.has_attendance && (
                    <Link
                      to={`/student/events/${eventId}/attendance`}
                      className="w-full bg-green-600 text-white text-center py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium block"
                    >
                      Mark Attendance
                    </Link>
                  )}

                  {event?.has_certificate && (
                    <Link
                      to={`/student/events/${eventId}/certificate`}
                      className="w-full bg-purple-600 text-white text-center py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium block"
                    >
                      Download Certificate
                    </Link>
                  )}

                  <Link
                    to="/student/events"
                    className="w-full border border-gray-300 text-gray-700 text-center py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium block"
                  >
                    Browse Other Events
                  </Link>
                </div>
              </div>

              {/* Cancel Registration Option */}
              {canModifyRegistration() && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Cancel Registration</h4>
                  <p className="text-sm text-red-700 mb-3">
                    You can cancel your registration if needed. This action cannot be undone.
                  </p>
                  <button
                    onClick={handleCancelRegistration}
                    disabled={isLoading}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {isLoading ? 'Cancelling...' : 'Cancel Registration'}
                  </button>
                </div>
              )}

              {/* Information Note */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Information</h4>
                <p className="text-sm text-blue-700">
                  Your registration is confirmed. Please check your email for event updates and reminders.
                  Make sure to mark your attendance on the event day to be eligible for certificates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default StudentAlreadyRegistered;
