import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clientAPI } from '../../api/axios';
import ClientLayout from '../../components/client/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';

const MarkAttendance = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  // State management
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registration, setRegistration] = useState(null);
  const [autoFilled, setAutoFilled] = useState(false);
  const [formData, setFormData] = useState({
    registration_id: '',
    student_name: '',
    enrollment_no: ''
  });
  const [studentInfo, setStudentInfo] = useState(null);
  const [validationLoading, setValidationLoading] = useState(false);

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
      
      if (isDevelopmentMode && !eventId) {
        // Provide mock data for development testing
        const mockEventData = {
          event_name: 'Mock Event - Mark Attendance',
          event_id: 'mock-event-123',
          start_datetime: '2025-07-25T10:00:00Z',
          formatted_start: 'July 25, 2025 at 10:00 AM'
        };
        
        setEvent(mockEventData);
        
        // Set mock student data if available
        if (user) {
          const mockRegistration = {
            registrar_id: 'REG123456',
            full_name: user.full_name || 'John Doe',
            enrollment_no: user.enrollment_no || '21BECE40015',
            email: user.email || 'john.doe@example.com',
            department: user.department || 'Computer Engineering',
            semester: user.semester || '6',
            mobile_no: user.mobile_no || '9876543210',
            registration_type: 'individual'
          };
          
          setRegistration(mockRegistration);
          setFormData({
            registration_id: mockRegistration.registrar_id,
            student_name: mockRegistration.full_name,
            enrollment_no: mockRegistration.enrollment_no
          });
          setAutoFilled(true);
        }
        
        setIsLoading(false);
        return;
      }
      
      const response = await clientAPI.getEventDetails(eventId);
      
      if (response.data.success) {
        const eventData = response.data.event;
        setEvent(eventData);
        
        // Try to auto-fill if user is authenticated and has registration
        if (user) {
          await tryAutoFillRegistration();
        }
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

  const tryAutoFillRegistration = async () => {
    try {
      // Check if user has a registration for this event
      const response = await clientAPI.getRegistrationStatus(eventId);
      
      if (response.data.success && response.data.registration) {
        const reg = response.data.registration;
        setRegistration(reg);
        setFormData({
          registration_id: reg.registrar_id,
          student_name: reg.full_name,
          enrollment_no: reg.enrollment_no
        });
        setAutoFilled(true);
      }
    } catch (error) {
      console.log('No existing registration found or error:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear student info when changing registration ID
    if (name === 'registration_id') {
      setStudentInfo(null);
      setError('');
      if (!autoFilled) {
        setFormData(prev => ({
          ...prev,
          student_name: '',
          enrollment_no: ''
        }));
      }
    }
  };

  // Debounced validation for registration ID
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.registration_id.trim() && !autoFilled) {
        validateRegistration(formData.registration_id.trim());
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.registration_id, autoFilled]);

  const validateRegistration = async (registrationId) => {
    if (!registrationId.trim()) return;

    try {
      setValidationLoading(true);
      setError('');
      
      // Check if we're in development mode
      const isDevelopmentMode = location.pathname.startsWith('/dev/');
      
      if (isDevelopmentMode) {
        // Mock validation response
        setTimeout(() => {
          const mockStudent = {
            full_name: 'Jane Smith',
            enrollment_no: '21BEIT40025',
            email: 'jane.smith@example.com',
            department: 'Information Technology',
            semester: '4',
            mobile_no: '9876543210',
            registration_type: 'individual'
          };
          
          setStudentInfo(mockStudent);
          setFormData(prev => ({
            ...prev,
            student_name: mockStudent.full_name,
            enrollment_no: mockStudent.enrollment_no
          }));
          setValidationLoading(false);
        }, 1000);
        return;
      }

      const response = await clientAPI.validateRegistration({
        registration_id: registrationId,
        event_id: eventId
      });
      
      if (response.data.success) {
        const student = response.data.student;
        setStudentInfo(student);
        setFormData(prev => ({
          ...prev,
          student_name: student.full_name,
          enrollment_no: student.enrollment_no
        }));
        setError('');
      } else {
        setError(response.data.message || 'Registration ID not found for this event');
        setStudentInfo(null);
        setFormData(prev => ({
          ...prev,
          student_name: '',
          enrollment_no: ''
        }));
      }
    } catch (error) {
      console.error('Validation error:', error);
      setError('An unexpected error occurred. Please try again.');
      setStudentInfo(null);
    } finally {
      setValidationLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.registration_id.trim() || !formData.student_name.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    // Check if we're in development mode
    const isDevelopmentMode = location.pathname.startsWith('/dev/');
    
    if (isDevelopmentMode) {
      // Mock successful attendance marking
      setSuccess('Mock attendance marked successfully! (Development Mode)');
      console.log('Mock attendance data:', {
        event_id: eventId || 'mock-event-123',
        registration_id: formData.registration_id,
        student_name: formData.student_name,
        enrollment_no: formData.enrollment_no
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await clientAPI.markAttendance(eventId, {
        registration_id: formData.registration_id,
        student_name: formData.student_name,
        enrollment_no: formData.enrollment_no
      });
      
      if (response.data.success) {
        setSuccess('Attendance marked successfully!');
        // Redirect after success
        setTimeout(() => {
          navigate(`/client/events/${eventId}`);
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to mark attendance. Please try again.');
      }
    } catch (error) {
      console.error('Attendance marking error:', error);
      setError('Failed to mark attendance. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <LoadingSpinner />
      </ClientLayout>
    );
  }

  if (!event) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-lg mx-auto text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700">Event not found or could not be loaded.</p>
                </div>
              </div>
            </div>
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
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            
            {/* Development Mode Notice */}
            {location.pathname.startsWith('/dev/') && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                <i className="fas fa-code mr-2"></i>
                <strong>Development Mode:</strong> This is a test version of the attendance page with mock data.
              </div>
            )}
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Mark Attendance</h1>
            <p className="text-gray-600">{event.event_name}</p>
            <p className="text-sm text-gray-500 mt-1">
              {event.formatted_start || event.start_datetime || "Date to be announced"}
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-800">Success</p>
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">Instructions</p>
                  {autoFilled ? (
                    <p className="text-sm text-blue-700">
                      Your registration details have been automatically filled. Please verify they are correct before submitting.
                    </p>
                  ) : (
                    <p className="text-sm text-blue-700">
                      Enter your registration details exactly as you registered for the event.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Auto-filled Success Message */}
            {autoFilled && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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
                  readOnly
                />
                {autoFilled && (
                  <p className="text-xs text-gray-600 mt-1">This field has been auto-filled from your registration data.</p>
                )}
              </div>

              {/* Student Information Display (when auto-filled or validated) */}
              {(autoFilled && registration) && (
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
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mobile:</span>
                      <span className="font-medium text-right">{registration.mobile_no}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Registration Type:</span>
                      <span className="font-medium capitalize text-right">{registration.registration_type}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Loading */}
              {validationLoading && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-center py-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Validating registration...</span>
                  </div>
                </div>
              )}

              {/* Student Info from Validation */}
              {studentInfo && !autoFilled && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="mb-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-green-800">Registration Validated</p>
                        <p className="text-sm text-green-700">Student details have been auto-filled</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Enrollment No:</span>
                      <span className="font-medium">{studentInfo.enrollment_no}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{studentInfo.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium">{studentInfo.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Semester:</span>
                      <span className="font-medium">{studentInfo.semester}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mobile:</span>
                      <span className="font-medium">{studentInfo.mobile_no}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Registration Type:</span>
                      <span className="font-medium capitalize">{studentInfo.registration_type}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Event Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Event Details</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Event Name:</span>
                    <span className="font-medium text-right">{event.event_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date & Time:</span>
                    <span className="font-medium text-right">
                      {event.formatted_start || event.start_datetime || "To be announced"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Venue:</span>
                    <span className="font-medium text-right">{event.venue || "To be announced"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Event ID:</span>
                    <span className="font-medium text-right">{event.event_id}</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || validationLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    Marking Attendance...
                  </>
                ) : (
                  'Mark My Attendance'
                )}
              </button>
            </form>

            {/* Back Link */}
            <div className="mt-6 text-center">
              <Link
                to={`/client/events/${eventId}`}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                ← Back to Event Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default MarkAttendance;
