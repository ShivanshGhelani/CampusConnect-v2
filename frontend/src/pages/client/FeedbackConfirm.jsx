import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clientAPI } from '../../api/client';
import ClientLayout from '../../components/client/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';

const FeedbackConfirm = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // State management
  const [event, setEvent] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [feedback, setFeedback] = useState(null);
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

      // Fetch registration status
      const registrationResponse = await clientAPI.getRegistrationStatus(eventId);
      if (registrationResponse.data.success) {
        setRegistration(registrationResponse.data.registration);
      }

      // Check feedback status
      try {
        const feedbackResponse = await clientAPI.getFeedbackStatus(eventId);
        console.log('Feedback status response in confirmation:', feedbackResponse.data);
        
        if (feedbackResponse.data.success && feedbackResponse.data.feedback_submitted) {
          setFeedback({
            submitted_at: feedbackResponse.data.feedback_data?.feedback_submitted_at,
            feedback_id: feedbackResponse.data.feedback_data?.feedback_id
          });
        } else {
          // If no feedback found, redirect to feedback form
          console.log('No feedback found in confirmation, redirecting to form');
          navigate(`/client/events/${eventId}/feedback`);
          return;
        }
      } catch (feedbackError) {
        // If feedback not found, redirect to feedback form
        console.log('Feedback error in confirmation, redirecting to form:', feedbackError);
        navigate(`/client/events/${eventId}/feedback`);
        return;
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
        {/* Confirmation Message */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 rounded-full bg-blue-100 mb-4">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Feedback Already Submitted</h1>
          <p className="text-lg text-gray-600 mb-8">You have already provided feedback for this event.</p>
        </div>

        {/* Event Details Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{event.event_name || event.name}</h2>
          <div className="border-t border-gray-200 pt-4">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Registration ID</dt>
                <dd className="mt-1 text-lg font-medium text-gray-900">
                  {registration?.registrar_id || registration?.registration_id || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Feedback Submitted On</dt>
                <dd className="mt-1 text-lg text-gray-900">
                  {feedback ? formatDateTime(feedback.submitted_at || feedback.created_at, 'full') : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Certificate Download Card */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Download Your Certificate</h2>
          <div className="space-y-4">
            <p className="text-gray-600">Since you've already submitted feedback, you can proceed to download your certificate.</p>
            
            {attendance && attendance.attendance_id && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <p className="text-sm font-medium">All requirements completed - ready for certificate download</p>
                </div>
              </div>
            )}
            
            <div className="flex justify-center">
              <Link 
                to={`/client/events/${eventId}/certificate`}
                className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-bold py-3 px-8 rounded-lg inline-block text-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
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
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Events
          </Link>
        </div>
      </div>
    </ClientLayout>
  );
};

export default FeedbackConfirm;
