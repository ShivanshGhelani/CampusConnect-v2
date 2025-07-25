import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { clientAPI } from '../../../api/axios';
import ClientLayout from '../../../components/client/Layout';
import LoadingSpinner from '../../../components/LoadingSpinner';

const AttendanceSuccess = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();

  // State management
  const [event, setEvent] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [alreadyMarked, setAlreadyMarked] = useState(false);

  useEffect(() => {
    // Check if we're in development mode and accessing via /dev/ route
    const isDevelopmentMode = location.pathname.startsWith('/dev/');
    
    if (!isAuthenticated && !isDevelopmentMode) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }
    
    fetchAttendanceData();
  }, [eventId, isAuthenticated, location]);

  const fetchAttendanceData = async () => {
    try {
      setIsLoading(true);
      
      // Check if we're in development mode
      const isDevelopmentMode = location.pathname.startsWith('/dev/');
      
      if (isDevelopmentMode) {
        // Provide mock data for development testing
        const wasAlreadyMarked = searchParams.get('already_marked') === 'true';
        
        const mockEventData = {
          event_name: 'Mock Event: Web Development Workshop',
          event_id: 'mock-event-456',
          start_datetime: '2025-07-25T10:00:00Z',
          venue: 'Computer Lab 1, Main Building'
        };
        
        const mockRegistrationData = {
          full_name: 'Jane Smith',
          registrar_id: 'REG-2025-001234'
        };
        
        const mockAttendanceData = {
          attendance_id: 'ATT-2025-789012',
          attendance_marked_at: new Date().toISOString()
        };
        
        setEvent(mockEventData);
        setRegistration(mockRegistrationData);
        setAttendance(mockAttendanceData);
        setAlreadyMarked(wasAlreadyMarked);
        setIsLoading(false);
        return;
      }
      
      // In production, fetch actual data
      const response = await clientAPI.getAttendanceDetails(eventId);
      
      if (response.data.success) {
        setEvent(response.data.event);
        setRegistration(response.data.registration);
        setAttendance(response.data.attendance);
        setAlreadyMarked(response.data.already_marked || false);
      } else {
        setError('Failed to load attendance details');
      }
    } catch (error) {
      console.error('Attendance fetch error:', error);
      setError('Failed to load attendance details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateTimeStr, format = 'full') => {
    if (!dateTimeStr) return 'TBD';
    
    const date = new Date(dateTimeStr);
    
    switch (format) {
      case 'date_only':
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'time_only':
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      case 'full':
        return date.toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      default:
        return date.toLocaleString();
    }
  };

  const formatVenue = (venue) => {
    if (!venue) return 'TBD';
    return venue;
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
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
              </div>
              <h1 className="text-xl font-bold text-red-900 mb-2">Error Loading Attendance</h1>
              <p className="text-red-700 mb-4">{error}</p>
              <button 
                onClick={() => navigate('/client/dashboard')}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Return to Dashboard
              </button>
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
              <i className="fas fa-user-check text-green-600 text-4xl"></i>
            </div>
            {alreadyMarked ? (
              <>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Attendance Already Recorded</h1>
                <p className="text-lg text-gray-600">Your attendance was previously marked for this event</p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Attendance Marked Successfully!</h1>
                <p className="text-lg text-gray-600">Your attendance has been recorded for this event</p>
              </>
            )}
          </div>

          {/* Attendance Details Card */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
              <h2 className="text-xl font-semibold text-gray-900">Attendance Confirmation</h2>
            </div>
            <div className="p-6">
              {/* Event Name */}
              <div className="mb-6 text-center">
                <h3 className="text-2xl font-bold text-green-600 mb-2">{event?.event_name}</h3>
              </div>

              {/* Attendance ID Section */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">Attendance ID</label>
                <div className="text-2xl font-mono font-bold text-green-600 bg-white border-2 border-green-300 rounded-lg py-3 px-4 inline-block">
                  {attendance?.attendance_id}
                </div>
                <p className="text-sm text-gray-600 mt-2">Keep this ID for your records</p>
              </div>

              {/* Student & Event Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student Information */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <i className="fas fa-user text-blue-600 mr-2"></i>
                    Student Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{registration?.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Registration ID:</span>
                      <span className="font-medium font-mono">{registration?.registrar_id}</span>
                    </div>
                  </div>
                </div>

                {/* Event Information */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <i className="fas fa-calendar text-blue-600 mr-2"></i>
                    Event Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date & Time:</span>
                      <span className="font-medium text-right">
                        {event?.start_datetime ? (
                          <>
                            {formatDateTime(event.start_datetime, 'date_only')}<br />
                            {formatDateTime(event.start_datetime, 'time_only')}
                          </>
                        ) : (
                          'TBD'
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium text-right">{formatVenue(event?.venue)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Confirmation */}
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-center">
                  <i className="fas fa-check-circle text-green-600 text-xl mr-3"></i>
                  <div>
                    <p className="font-semibold text-green-800">Attendance Status: Present</p>
                    <p className="text-sm text-green-700">
                      Recorded on {formatDateTime(attendance?.attendance_marked_at, 'full')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <i className="fas fa-info-circle text-blue-600 text-lg mt-1 mr-3 flex-shrink-0"></i>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Important Notice</h4>
                <p className="text-sm text-gray-700">
                  {alreadyMarked ? (
                    'Your attendance was previously recorded in our system and cannot be marked again. This confirmation serves as proof of your participation in the event. Please save this information for future reference, especially for certificate generation.'
                  ) : (
                    'Your attendance has been successfully recorded in our system. This confirmation serves as proof of your participation in the event. Please save this information for future reference, especially for certificate generation.'
                  )}
                </p>
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
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors text-center flex items-center justify-center"
            >
              <i className="fas fa-calendar mr-2"></i>
              Browse Events
            </button>
          </div>

          {/* Contact Information */}
          <div className="mt-8 bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Assistance?</h3>
            <p className="text-gray-600 mb-4">For any queries regarding your attendance or event details:</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm">
              <div className="flex items-center justify-center">
                <i className="fas fa-envelope text-blue-600 mr-2"></i>
                <span>support@college.edu</span>
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

export default AttendanceSuccess;
