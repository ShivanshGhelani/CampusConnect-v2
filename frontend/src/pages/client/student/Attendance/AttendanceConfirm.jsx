import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ClientLayout from '../../../../components/client/Layout';

function AttendanceConfirm() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get data from navigation state
  const { event, registration, attendance } = location.state || {};

  // If no event data provided, redirect back to event
  if (!event) {
    React.useEffect(() => {
      navigate(`/client/events/${eventId}`);
    }, [eventId, navigate]);
    return null;
  }

  const formatDateTime = (dateString, format = 'full') => {
    if (!dateString) return 'To be determined';
    const date = new Date(dateString);
    
    switch (format) {
      case 'full':
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      case 'date_only':
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'time_only':
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
      default:
        return date.toLocaleDateString('en-US');
    }
  };

  const formatVenue = (venue) => {
    return venue || 'Venue to be announced';
  };

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
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-start space-x-3">
                  <i className="fas fa-check-circle text-green-600 mt-0.5"></i>
                  <div className="text-sm text-green-800">
                    <strong>Attendance Confirmed!</strong> Your attendance for this event has been successfully recorded.
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
                    <dd className="mt-1 text-sm text-gray-900 font-medium">{event.event_name || event.name}</dd>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <dt className="text-sm font-medium text-gray-600">Student Name</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-medium">{registration?.full_name || 'N/A'}</dd>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <dt className="text-sm font-medium text-gray-600">Registration ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{registration?.registrar_id || registration?.registration_id || attendance?.registration_id || 'N/A'}</dd>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <dt className="text-sm font-medium text-gray-600">Date & Time</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {event.start_datetime || event.start_date ? (
                        formatDateTime(event.start_datetime || event.start_date, 'full')
                      ) : (
                        <span className="text-gray-500">To be determined</span>
                      )}
                    </dd>
                  </div>
                    
                  <div className="bg-gray-50 p-3 rounded-md">
                    <dt className="text-sm font-medium text-gray-600">Location</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatVenue(event.venue)}
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
              
              {attendance?.attendance_marked_at && (
                <div className="mt-4 text-sm text-gray-600">
                  <strong>Recorded on:</strong> {formatDateTime(attendance.attendance_marked_at, 'full')}
                </div>
              )}
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

          {/* Additional Student Information */}
          {registration && (registration.department || registration.enrollment_no || registration.email) && (
            <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {registration.enrollment_no && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Enrollment No:</span>
                    <span className="font-medium font-mono">{registration.enrollment_no}</span>
                  </div>
                )}
                {registration.department && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Department:</span>
                    <span className="font-medium">{registration.department}</span>
                  </div>
                )}
                {registration.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{registration.email}</span>
                  </div>
                )}
                {registration.semester && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Semester:</span>
                    <span className="font-medium">{registration.semester}</span>
                  </div>
                )}
                {registration.mobile_no && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mobile:</span>
                    <span className="font-medium">{registration.mobile_no}</span>
                  </div>
                )}
                {registration.registration_type && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Registration Type:</span>
                    <span className="font-medium capitalize">{registration.registration_type}</span>
                  </div>
                )}
              </div>
            </div>
          )}

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
}

export default AttendanceConfirm;
