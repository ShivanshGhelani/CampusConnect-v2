import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { clientAPI } from '../../../api/client';
import LoadingSpinner from '../../../components/LoadingSpinner';

function NotRegistered() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      setError('');

      const eventResponse = await clientAPI.getEventDetails(eventId);
      if (eventResponse.data.success) {
        setEvent(eventResponse.data.event);
      } else {
        setError('Failed to load event details');
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      setError('Failed to load event information');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date to be announced';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-2xl text-red-500"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Unable to Load</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/client/events')}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Error Message with Animation */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-block p-4 rounded-full bg-red-100 mb-4 animate-alert-bounce">
              <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Not Registered</h1>
            <p className="text-lg text-gray-600 mb-8">You are not registered as a participant for this event.</p>
          </div>

          {/* Event Details Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8 transform hover:scale-[1.02] transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
              </svg>
              {event?.event_name || event?.name || 'Event Details'}
            </h2>
            
            {/* Event Info */}
            {event && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date & Time:</span>
                    <span className="font-medium text-right">{formatDate(event.start_datetime || event.start_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Venue:</span>
                    <span className="font-medium text-right">{event.venue || 'TBA'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mode:</span>
                    <span className="font-medium text-right capitalize">{event.mode || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium text-right">{event.category || 'General'}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              {/* Help Box */}
              <div className="mt-6 bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                  </svg>
                  Need Help?
                </h3>
                <p className="text-blue-700">
                  If you believe this is an error or need assistance, please contact our support team at{' '}
                  <a href="mailto:support@campusconnect.edu" className="underline hover:text-blue-800">
                    support@campusconnect.edu
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {/* Register Button - Show if registration is still open */}
            {event && event.status === 'upcoming' && event.sub_status === 'registration_open' && (
              <button
                onClick={() => navigate(`/client/events/${eventId}/register`)}
                className="group bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg inline-flex items-center justify-center transition-all duration-200 transform hover:scale-105"
              >
                <svg className="w-4 h-4 mr-2 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                </svg>
                Register for Event
              </button>
            )}
            
            <button
              onClick={() => navigate('/client/events')}
              className="group bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg inline-flex items-center justify-center transition-all duration-200 transform hover:scale-105"
            >
              <svg className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Back to Events
            </button>
            
            <button
              onClick={() => navigate('/client/dashboard')}
              className="group bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg inline-flex items-center justify-center transition-all duration-200 transform hover:scale-105"
            >
              <svg className="w-4 h-4 mr-2 group-hover:animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes alert-bounce {
          0% { transform: scale(0.8); opacity: 0; }
          45% { transform: scale(1.2); opacity: 0.8; }
          80% { transform: scale(0.95); opacity: 0.9; }
          100% { transform: scale(1); opacity: 1; }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .animate-alert-bounce {
          animation: alert-bounce 0.5s ease-out forwards;
        }
      `}</style>
    </>
  );
}

export default NotRegistered;
