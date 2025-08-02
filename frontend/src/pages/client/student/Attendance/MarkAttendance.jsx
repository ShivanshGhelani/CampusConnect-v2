import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { clientAPI } from '../../../../api/axios';
import ClientLayout from '../../../../components/client/Layout';
import LoadingSpinner from '../../../../components/LoadingSpinner';

function MarkAttendance() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user, userType } = useAuth();
  
  const [event, setEvent] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoFilled, setAutoFilled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    registration_id: '',
    student_name: '',
    enrollment_no: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/auth/login?redirect=${encodeURIComponent(`/client/events/${eventId}/mark-attendance`)}`);
      return;
    }

    if (userType !== 'student') {
      setError('Only students can mark attendance for events');
      return;
    }

    fetchEventAndRegistration();

    // Cleanup timeout on unmount
    return () => {
      if (window.validationTimeout) {
        clearTimeout(window.validationTimeout);
      }
    };
  }, [eventId, isAuthenticated, userType]);

  const fetchEventAndRegistration = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Fetch event details
      const eventResponse = await clientAPI.getEventDetails(eventId);
      if (!eventResponse.data.success) {
        setError('Failed to load event details');
        return;
      }

      const eventData = eventResponse.data.event;
      setEvent(eventData);

      // Check if event allows attendance marking
      if (eventData.sub_status !== 'event_started' && eventData.sub_status !== 'ongoing') {
        setError('Attendance marking is not available for this event at this time');
        return;
      }

      // Check registration status - REQUIRED for attendance marking
      let registrationData = null;
      try {
        const registrationResponse = await clientAPI.getRegistrationStatus(eventId);
        console.log('Registration response:', registrationResponse.data);
        
        if (registrationResponse.data.success && registrationResponse.data.registered) {
          const regData = registrationResponse.data.registration_data;
          registrationData = regData;
          setRegistration(regData);
          setAutoFilled(true);
          setFormData({
            registration_id: regData.registrar_id || regData.registration_id || '',
            student_name: regData.full_name || '',
            enrollment_no: regData.enrollment_no || ''
          });
          console.log('Auto-filled form data:', {
            registration_id: regData.registrar_id || regData.registration_id || '',
            student_name: regData.full_name || '',
            enrollment_no: regData.enrollment_no || ''
          });
        } else {
          // Student is not registered for this event - redirect to NotRegistered page
          navigate(`/client/events/${eventId}/not-registered`);
          return;
        }
      } catch (regError) {
        // Registration not found - redirect to NotRegistered page
        console.log('No registration found, student must register first');
        navigate(`/client/events/${eventId}/not-registered`);
        return;
      }

      // Check if attendance is already marked
      try {
        const attendanceResponse = await clientAPI.getAttendanceStatus(eventId);
        console.log('Attendance status response:', attendanceResponse.data);
        
        if (attendanceResponse.data.success && attendanceResponse.data.attendance_marked) {
          // Attendance already marked - redirect to confirmation page
          navigate(`/client/events/${eventId}/attendance-confirmation`, {
            state: {
              event: eventData,
              registration: registrationData || {
                full_name: user?.full_name || 'N/A',
                enrollment_no: user?.enrollment_no || 'N/A',
                registration_id: 'N/A'
              },
              attendance: attendanceResponse.data.attendance_data
            }
          });
          return;
        }
      } catch (attError) {
        console.log('Could not check attendance status, proceeding with form');
      }

    } catch (error) {
      console.error('Error fetching event data:', error);
      setError('Failed to load event information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateRegistration = async (registrationId) => {
    try {
      const response = await clientAPI.validateRegistration({
        registration_id: registrationId,
        event_id: eventId
      });

      if (response.data.success) {
        const studentData = response.data.student_data;
        setRegistration(studentData);
        setAutoFilled(true);
        setFormData({
          registration_id: studentData.registration_id || registrationId,
          student_name: studentData.full_name,
          enrollment_no: studentData.enrollment_no
        });
        setError('');
        return true;
      } else {
        setError(response.data.message || 'Registration not found');
        setRegistration(null);
        setAutoFilled(false);
        setFormData({
          registration_id: registrationId,
          student_name: '',
          enrollment_no: ''
        });
        return false;
      }
    } catch (error) {
      console.error('Error validating registration:', error);
      setError('An error occurred while validating registration');
      return false;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-validate registration ID when user stops typing
    if (name === 'registration_id' && value.trim() && value.trim().length >= 3) {
      // Clear any existing timeout
      if (window.validationTimeout) {
        clearTimeout(window.validationTimeout);
      }
      
      // Set new timeout for validation
      window.validationTimeout = setTimeout(() => {
        validateRegistration(value.trim().toUpperCase());
      }, 500);
    } else if (name === 'registration_id' && !value.trim()) {
      // Clear registration data if input is empty
      setRegistration(null);
      setAutoFilled(false);
      setFormData(prev => ({
        ...prev,
        student_name: '',
        enrollment_no: ''
      }));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.registration_id || !formData.student_name) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const attendanceData = {
        registration_id: formData.registration_id.toUpperCase(),
        student_name: formData.student_name,
        enrollment_no: formData.enrollment_no
      };

      const response = await clientAPI.markAttendance(eventId, attendanceData);

      if (response.data.success) {
        // Navigate to success page
        navigate(`/client/events/${eventId}/attendance-success`, {
          state: {
            attendance: response.data.attendance,
            event: event,
            registration: response.data.registration || registration,
            already_marked: response.data.already_marked
          }
        });
      } else {
        if (response.data.already_marked) {
          // Navigate to confirmation page
          navigate(`/client/events/${eventId}/attendance-confirmation`, {
            state: {
              event: event,
              registration: response.data.registration || registration,
              attendance: response.data.attendance
            }
          });
        } else {
          setError(response.data.message || 'Failed to mark attendance');
        }
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      setError(error.response?.data?.message || 'Failed to mark attendance. Please try again.');
    } finally {
      setIsSubmitting(false);
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
      <ClientLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </ClientLayout>
    );
  }

  if (error && !event) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-exclamation-triangle text-2xl text-red-500"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Unable to Load</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => navigate(`/client/events/${eventId}`)}
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i className="fas fa-arrow-left mr-2"></i>Back to Event
            </button>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Mark Attendance</h1>
            <p className="text-gray-600">{event?.event_name || event?.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              {formatDate(event?.start_datetime || event?.start_date)}
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">Instructions</p>
                  {autoFilled ? (
                    <p className="text-sm text-blue-700">Your registration details have been automatically filled.
                      Please verify they are correct before submitting.</p>
                  ) : (
                    <p className="text-sm text-blue-700">Enter your registration details exactly as you registered for
                      the event.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Auto-filled Success Message */}
            {autoFilled && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-800">Registration Found</p>
                    <p className="text-sm text-green-700">Your registration details have been automatically retrieved.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Registration ID */}
              <div>
                <label htmlFor="registration_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Registration ID {autoFilled && <span className="text-green-600 text-xs">(Auto-filled)</span>}
                </label>
                <input
                  type="text"
                  id="registration_id"
                  name="registration_id"
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${autoFilled ? 'bg-green-50' : ''}`}
                  placeholder="Enter your registration ID"
                  value={formData.registration_id}
                  onChange={handleInputChange}
                  readOnly={autoFilled}
                  required
                />
                {autoFilled && (
                  <p className="text-xs text-gray-600 mt-1">This field has been auto-filled from your registration data.</p>
                )}
              </div>

              {/* Student Name */}
              <div>
                <label htmlFor="student_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name {autoFilled && <span className="text-green-600 text-xs">(Auto-filled)</span>}
                </label>
                <input
                  type="text"
                  id="student_name"
                  name="student_name"
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${autoFilled ? 'bg-green-50' : ''}`}
                  placeholder="Enter your full name"
                  value={formData.student_name}
                  onChange={handleInputChange}
                  readOnly={autoFilled}
                  required
                />
                {autoFilled && (
                  <p className="text-xs text-gray-600 mt-1">This field has been auto-filled from your registration data.</p>
                )}
              </div>

              {/* Enrollment Number */}
              <div>
                <label htmlFor="enrollment_no" className="block text-sm font-medium text-gray-700 mb-1">
                  Enrollment Number {autoFilled && <span className="text-green-600 text-xs">(Auto-filled)</span>}
                </label>
                <input
                  type="text"
                  id="enrollment_no"
                  name="enrollment_no"
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono ${autoFilled ? 'bg-green-50' : ''}`}
                  placeholder="Enrollment number will be auto-filled"
                  value={formData.enrollment_no}
                  onChange={handleInputChange}
                  readOnly
                />
                {autoFilled && (
                  <p className="text-xs text-gray-600 mt-1">This field has been auto-filled from your registration data.</p>
                )}
              </div>

              {/* Student Information Display (when auto-filled) */}
              {autoFilled && registration && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                    <i className="fas fa-user text-blue-600 mr-2"></i>
                    Your Registration Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium text-right">{registration.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium text-right">{registration.email}</span>
                    </div>
                    {registration.semester && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Semester:</span>
                        <span className="font-medium text-right">{registration.semester}</span>
                      </div>
                    )}
                    {registration.mobile_no && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Mobile:</span>
                        <span className="font-medium text-right">{registration.mobile_no}</span>
                      </div>
                    )}
                    {registration.registration_type && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Registration Type:</span>
                        <span className="font-medium text-right capitalize">{registration.registration_type}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Event Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Event Details</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Event:</span>
                    <span className="font-medium text-right">{event?.event_name || event?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date & Time:</span>
                    <span className="font-medium text-right">
                      {formatDate(event?.start_datetime || event?.start_date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Venue:</span>
                    <span className="font-medium text-right">{event?.venue || 'TBA'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mode:</span>
                    <span className="font-medium text-right capitalize">{event?.mode || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Marking Attendance...
                  </>
                ) : (
                  'Mark My Attendance'
                )}
              </button>
            </form>

            {/* Back Link */}
            <div className="mt-6 text-center">
              <button
                onClick={() => navigate(`/client/events/${eventId}`)}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                ← Back to Event Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

export default MarkAttendance;
