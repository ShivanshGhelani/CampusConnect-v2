import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clientAPI } from '../../api/axios';
import ClientLayout from '../../components/client/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';

const FeedbackSuccess = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();

  // State management
  const [event, setEvent] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }
    
    fetchData();
  }, [eventId, isAuthenticated]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Fetch event details
      const eventResponse = await clientAPI.getEventDetails(eventId);
      if (eventResponse.data.success) {
        setEvent(eventResponse.data.event);
      }

      // Fetch registration status to get registration details
      const registrationResponse = await clientAPI.getRegistrationStatus(eventId);
      if (registrationResponse.data.success) {
        setRegistration(registrationResponse.data.registration);
      }

      // Fetch attendance status
      try {
        const attendanceResponse = await clientAPI.getAttendanceStatus(eventId);
        if (attendanceResponse.data.success && attendanceResponse.data.attended) {
          setAttendance({
            attendance_id: attendanceResponse.data.attendance_data?.attendance_id
          });
        }
      } catch (attendanceError) {
        // Attendance might not be marked yet, which is okay
        console.log('Attendance not found:', attendanceError);
      }

    } catch (error) {
      console.error('Data fetch error:', error);
      setError('Failed to load event details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateTimeString, format = 'full') => {
    if (!dateTimeString) return 'N/A';
    
    const date = new Date(dateTimeString);
    
    if (format === 'full') {
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </ClientLayout>
    );
  }

  if (error || !event) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Event Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'The event you are looking for does not exist.'}</p>
            <Link 
              to="/client/events" 
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Events
            </Link>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Success Message with Animation */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-block p-4 rounded-full bg-green-100 mb-4 animate-success-pop">
            <svg className="w-12 h-12 text-green-600 animate-success-check" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Thank You for Your Feedback!</h1>
          <p className="text-lg text-gray-600 mb-8">Your feedback will help us improve future events.</p>
        </div>

        {/* Event Details Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 transform hover:scale-[1.02] transition-all duration-300">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
            </svg>
            Event Details
          </h2>
          <div className="border-t border-gray-200 pt-4">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="transform hover:-translate-y-1 transition-all duration-200">
                <dt className="text-sm font-medium text-gray-500">Registration ID</dt>
                <dd className="mt-1 text-lg font-medium text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                  </svg>
                  {registration?.registrar_id || registration?.registration_id || 'N/A'}
                </dd>
              </div>
              <div className="transform hover:-translate-y-1 transition-all duration-200">
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-lg text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                  </svg>
                  {registration?.full_name || user?.full_name || user?.name || 'N/A'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Next Steps Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-8 transform hover:scale-[1.02] transition-all duration-300">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            Next Steps
          </h2>
          <div className="space-y-4">
            <p className="text-gray-600">Your feedback has been successfully submitted! You can now proceed to collect your certificate.</p>
            
            {attendance && attendance.attendance_id && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <div>
                    <p className="font-medium">Certificate Eligibility Confirmed</p>
                    <p className="text-sm">Registration ID: {registration?.registrar_id || registration?.registration_id} | Attendance ID: {attendance.attendance_id}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-center">
              <Link 
                to={`/client/events/${eventId}/certificate${searchParams.get('feedback_submitted') ? '?feedback_submitted=True' : ''}`}
                className="group bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-bold py-3 px-8 rounded-lg inline-flex items-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <svg className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                Download Certificate
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-8 text-center">
          <Link 
            to="/client/events"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium group transition-all duration-200"
          >
            <svg className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Back to Events
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes success-pop {
          0% { transform: scale(0.8); opacity: 0; }
          45% { transform: scale(1.2); opacity: 0.8; }
          80% { transform: scale(0.95); opacity: 0.9; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes success-check {
          0% { stroke-dasharray: 1000; stroke-dashoffset: 1000; }
          100% { stroke-dasharray: 1000; stroke-dashoffset: 0; }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .animate-success-pop {
          animation: success-pop 0.5s ease-out forwards;
        }

        .animate-success-check {
          animation: success-check 1s ease-out forwards;
        }
      `}</style>
    </ClientLayout>
  );
};

export default FeedbackSuccess;
