import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { clientAPI } from '../../../api/axios';
import ClientLayout from '../../../components/client/Layout';
import LoadingSpinner from '../../../components/LoadingSpinner';

const AttendanceConfirmation = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  // State management
  const [event, setEvent] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
        const mockEventData = {
          event_name: 'Mock Event: Advanced React Workshop',
          event_id: 'mock-event-789',
          start_datetime: '2025-07-28T14:00:00Z',
          venue: 'Conference Hall, Academic Block'
        };
        
        const mockRegistrationData = {
          full_name: 'Alex Johnson',
          registrar_id: 'REG-2025-567890'
        };
        
        const mockAttendanceData = {
          attendance_id: 'ATT-2025-345678'
        };
        
        setEvent(mockEventData);
        setRegistration(mockRegistrationData);
        setAttendance(mockAttendanceData);
        setIsLoading(false);
        return;
      }
      
      // In production, fetch actual data
      const response = await clientAPI.getAttendanceConfirmation(eventId);
      
      if (response.data.success) {
        setEvent(response.data.event);
        setRegistration(response.data.registration);
        setAttendance(response.data.attendance);
      } else {
        setError('Failed to load attendance confirmation details');
      }
    } catch (error) {
      console.error('Attendance confirmation fetch error:', error);
      setError('Failed to load attendance confirmation. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateTimeStr, format = 'full') => {
    if (!dateTimeStr) return 'To be determined';
    
    const date = new Date(dateTimeStr);
    
    switch (format) {
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
          <div className="max-w-2xl mx-auto px-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
              </div>
              <h1 className="text-xl font-bold text-red-900 mb-2">Error Loading Confirmation</h1>
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
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
            <div className="border-b border-gray-100 px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-100 p-2 rounded-full">
                  <i className="fas fa-exclamation-triangle text-orange-600 text-xl"></i>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Attendance Already Recorded</h1>
                  <p className="text-sm text-gray-600">Your attendance has been previously confirmed</p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                <div className="flex items-start space-x-3">
                  <i className="fas fa-info-circle text-orange-600 mt-0.5"></i>
                  <div className="text-sm text-orange-800">
                    <strong>Note:</strong> You have already marked your attendance for this event. 
                    Duplicate attendance records are not permitted to maintain accurate event records.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Event Details Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <i className="fas fa-calendar-check text-blue-600"></i>
                <span>Event Information</span>
              </h2>
            </div>
            
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <dt className="text-sm font-medium text-gray-600">Event Name</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-medium">{event?.event_name}</dd>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <dt className="text-sm font-medium text-gray-600">Student Name</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-medium">{registration?.full_name}</dd>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <dt className="text-sm font-medium text-gray-600">Registration ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{registration?.registrar_id}</dd>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <dt className="text-sm font-medium text-gray-600">Date & Time</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {event?.start_datetime ? (
                        formatDateTime(event.start_datetime, 'full')
                      ) : (
                        <span className="text-gray-500">To be determined</span>
                      )}
                    </dd>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <dt className="text-sm font-medium text-gray-600">Location</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatVenue(event?.venue)}
                    </dd>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <dt className="text-sm font-medium text-gray-600">Attendance ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">
                      {attendance?.attendance_id || 'N/A'}
                    </dd>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <i className="fas fa-check-circle text-green-600"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Attendance Status</h3>
                    <p className="text-sm text-green-600 font-medium">Confirmed and Recorded</p>
                  </div>
                </div>
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  PRESENT
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/client/events')}
              className="flex-1 bg-blue-600 text-white text-center py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <i className="fas fa-arrow-left"></i>
              <span>Return to Events</span>
            </button>
            
            <button
              onClick={() => navigate('/client/dashboard')}
              className="flex-1 bg-gray-600 text-white text-center py-3 px-4 rounded-md font-medium hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <i className="fas fa-home"></i>
              <span>Dashboard</span>
            </button>
          </div>

          {/* Footer Info */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              If you believe this is an error, please contact the event administrator.
            </p>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default AttendanceConfirmation;
