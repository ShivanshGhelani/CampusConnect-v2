import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clientAPI } from '../../api/axios';
import ClientLayout from '../../components/client/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';

const NotRegistered = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  // State management
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if we're in development mode and accessing via /dev/ route
    const isDevelopmentMode = location.pathname.startsWith('/dev/');
    
    if (!isAuthenticated && !isDevelopmentMode) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }
    
    fetchEventData();
  }, [eventId, isAuthenticated, location]);

  const fetchEventData = async () => {
    try {
      setIsLoading(true);
      
      // Check if we're in development mode
      const isDevelopmentMode = location.pathname.startsWith('/dev/');
      
      if (isDevelopmentMode) {
        // Provide mock data for development testing
        const mockEventData = {
          event_name: 'Mock Event: AI/ML Workshop',
          event_id: 'mock-event-not-registered-001'
        };
        
        setEvent(mockEventData);
        setIsLoading(false);
        return;
      }
      
      // In production, fetch actual event data
      const response = await clientAPI.getEventDetails(eventId);
      
      if (response.data.success) {
        setEvent(response.data.event);
      } else {
        setError('Failed to load event details');
      }
    } catch (error) {
      console.error('Event fetch error:', error);
      setError('Failed to load event details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-red-900 mb-2">Error Loading Event</h1>
            <p className="text-red-700 mb-4">{error}</p>
            <button 
              onClick={() => navigate('/client/dashboard')}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
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
            {event?.event_name || 'Event Name'}
          </h2>
          <div className="border-t border-gray-200 pt-4">
            <div className="bg-orange-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-orange-800 mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                Important Information
              </h3>
              <p className="text-orange-700">To provide feedback and collect a certificate, you must:</p>
            </div>
            
            <ul className="space-y-4">
              <li className="flex items-start space-x-3 transform hover:-translate-y-1 transition-all duration-200">
                <svg className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
                <span className="text-gray-700">Be a registered participant of the event</span>
              </li>
              <li className="flex items-start space-x-3 transform hover:-translate-y-1 transition-all duration-200">
                <svg className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
                <span className="text-gray-700">Have attended the event</span>
              </li>
              <li className="flex items-start space-x-3 transform hover:-translate-y-1 transition-all duration-200">
                <svg className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
                <span className="text-gray-700">Wait until certificates are made available</span>
              </li>
            </ul>

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
                <a href="mailto:support@college.edu" className="underline hover:text-blue-800">
                  support@college.edu
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => navigate('/client/events')}
            className="group bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg inline-flex items-center transition-all duration-200 transform hover:scale-105"
          >
            <svg className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Back to Events
          </button>
          <button
            onClick={() => navigate('/client/dashboard')}
            className="group bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg inline-flex items-center transition-all duration-200 transform hover:scale-105"
          >
            <svg className="w-4 h-4 mr-2 group-hover:animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            Go to Dashboard
          </button>
        </div>
      </div>

      {/* Custom CSS Animation Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        @keyframes alert-bounce {
          0% { 
            transform: scale(0.8); 
            opacity: 0; 
          }
          45% { 
            transform: scale(1.2); 
            opacity: 0.8; 
          }
          80% { 
            transform: scale(0.95); 
            opacity: 0.9; 
          }
          100% { 
            transform: scale(1); 
            opacity: 1; 
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .animate-alert-bounce {
          animation: alert-bounce 0.5s ease-out forwards;
        }
      `}</style>
    </ClientLayout>
  );
};

export default NotRegistered;
