import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clientAPI } from '../../api/axios';
import ClientLayout from '../client/Layout';
import LoadingSpinner from '../LoadingSpinner';

const IndividualRegistration = ({ userType = 'student' }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  // State management
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registrationBlocked, setRegistrationBlocked] = useState(false);
  
  // Configuration based on user type
  const userConfig = {
    student: {
      routes: {
        login: '/auth/login',
        events: '/student/events',
        success: `/student/events/${eventId}/registration-success`
      },
      dataFields: {
        enrollment_no: user?.enrollment_no || '',
        full_name: user?.full_name || user?.name || '',
        email: user?.email || '',
        mobile_no: user?.mobile_no || user?.phone || '',
        department: user?.department || '',
        semester: user?.semester || '',
        year_of_study: user?.year_of_study || '',
        emergency_contact: '',
        dietary_requirements: '',
        special_accommodations: ''
      },
      targetAudience: ['students', 'both'],
      title: 'Student Individual Registration',
      subtitle: 'Register yourself for this event'
    },
    faculty: {
      routes: {
        login: '/auth/login',
        events: '/faculty/events',
        success: `/faculty/events/${eventId}/registration-success`
      },
      dataFields: {
        employee_id: user?.employee_id || user?.faculty_id || '',
        full_name: user?.full_name || user?.name || user?.faculty_name || '',
        email: user?.email || '',
        mobile_no: user?.mobile_no || user?.phone || '',
        department: user?.department || '',
        designation: user?.designation || '',
        experience_years: user?.experience_years || '',
        emergency_contact: '',
        dietary_requirements: '',
        special_accommodations: ''
      },
      targetAudience: ['faculty', 'both'],
      title: 'Faculty Individual Registration',
      subtitle: 'Register yourself for this event'
    }
  };

  const config = userConfig[userType];
  
  // User data state
  const [userData, setUserData] = useState(config.dataFields);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(config.routes.login, { state: { from: location } });
      return;
    }
    
    fetchEventData();
  }, [eventId, isAuthenticated, location]);

  const fetchEventData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch event details
      const eventResponse = await clientAPI.getEventDetails(eventId);
      if (eventResponse.data.success) {
        const eventData = eventResponse.data.event;
        setEvent(eventData);
        
        // Check if registration is allowed
        await validateRegistrationEligibility(eventData);
      } else {
        setError('Event not found or not accessible.');
        setRegistrationBlocked(true);
      }

    } catch (error) {
      console.error('Error fetching event data:', error);
      setError('Failed to load event details. Please try again.');
      setRegistrationBlocked(true);
    } finally {
      setIsLoading(false);
    }
  };

  const validateRegistrationEligibility = async (eventData) => {
    try {
      // Check if user is already registered
      const registrationResponse = await clientAPI.getRegistrationDetails(eventId);
      if (registrationResponse.data.success) {
        setError('You are already registered for this event.');
        setRegistrationBlocked(true);
        setTimeout(() => {
          navigate(`${config.routes.success}`);
        }, 2000);
        return;
      }
    } catch (regError) {
      // User is not registered, which is expected
    }

    // Check basic eligibility
    const now = new Date();
    const registrationDeadline = new Date(eventData.registration_deadline);
    
    if (now > registrationDeadline) {
      setError('Registration deadline has passed.');
      setRegistrationBlocked(true);
      return;
    }

    if (eventData.current_registrations >= eventData.max_participants) {
      setError('Event is full. No more registrations are accepted.');
      setRegistrationBlocked(true);
      return;
    }

    if (!config.targetAudience.includes(eventData.target_audience)) {
      setError(`This event is not available for ${userType} registration.`);
      setRegistrationBlocked(true);
      return;
    }

    if (eventData.registration_type === 'team') {
      setError('This event requires team registration only.');
      setRegistrationBlocked(true);
      return;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const requiredFields = userType === 'student' 
      ? ['enrollment_no', 'full_name', 'email', 'mobile_no', 'department']
      : ['employee_id', 'full_name', 'email', 'mobile_no', 'department'];
    
    for (let field of requiredFields) {
      if (!userData[field] || userData[field].trim() === '') {
        return `Please fill in the ${field.replace('_', ' ')} field.`;
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      return 'Please enter a valid email address.';
    }

    // Mobile number validation
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(userData.mobile_no.replace(/\s/g, ''))) {
      return 'Please enter a valid 10-digit mobile number.';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (registrationBlocked) {
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const registrationData = {
        event_id: eventId,
        registration_type: 'individual',
        user_type: userType,
        user_data: userData
      };

      const response = await clientAPI.registerForEvent(registrationData);
      
      if (response.data.success) {
        setSuccess('Registration submitted successfully! Redirecting...');
        setTimeout(() => {
          navigate(config.routes.success);
        }, 2000);
      } else {
        setError(response.data.message || 'Registration failed. Please try again.');
      }

    } catch (error) {
      console.error('Registration error:', error);
      setError(error.response?.data?.message || 'Registration failed. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
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

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <i className="fas fa-user-plus text-blue-600 text-3xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{config.title}</h1>
            <p className="text-lg text-gray-600">{config.subtitle}</p>
          </div>

          {/* Event Information Card */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <i className="fas fa-calendar-alt text-blue-600 mr-3"></i>
                Event Details
              </h2>
            </div>
            <div className="p-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-blue-600 mb-2">{event?.title || event?.event_name}</h3>
                <p className="text-gray-600">{event?.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Event Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{event ? new Date(event.date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">{event?.time || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Venue:</span>
                      <span className="font-medium">{event?.venue || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Registration Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Deadline:</span>
                      <span className="font-medium">{event ? new Date(event.registration_deadline).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fee:</span>
                      <span className="font-medium">
                        {event?.registration_type === 'paid' ? `₹${event?.registration_fee || 0}` : 'Free'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Spots:</span>
                      <span className="font-medium">{event?.current_registrations || 0} / {event?.max_participants || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <i className="fas fa-exclamation-circle text-red-600 mr-3"></i>
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <i className="fas fa-check-circle text-green-600 mr-3"></i>
                <span className="text-green-700">{success}</span>
              </div>
            </div>
          )}

          {/* Registration Form */}
          {!registrationBlocked && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <i className="fas fa-user-edit text-green-600 mr-3"></i>
                  Registration Form
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userType === 'student' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Enrollment Number *
                        </label>
                        <input
                          type="text"
                          name="enrollment_no"
                          value={userData.enrollment_no}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter your enrollment number"
                          required
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Employee ID *
                        </label>
                        <input
                          type="text"
                          name="employee_id"
                          value={userData.employee_id}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter your employee ID"
                          required
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        value={userData.full_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={userData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your email address"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        name="mobile_no"
                        value={userData.mobile_no}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your mobile number"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Department *
                      </label>
                      <input
                        type="text"
                        name="department"
                        value={userData.department}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your department"
                        required
                      />
                    </div>
                    {userType === 'student' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Semester
                          </label>
                          <input
                            type="text"
                            name="semester"
                            value={userData.semester}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Current semester"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Year of Study
                          </label>
                          <input
                            type="text"
                            name="year_of_study"
                            value={userData.year_of_study}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Year of study"
                          />
                        </div>
                      </>
                    )}
                    {userType === 'faculty' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Designation
                          </label>
                          <input
                            type="text"
                            name="designation"
                            value={userData.designation}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Your designation"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Years of Experience
                          </label>
                          <input
                            type="number"
                            name="experience_years"
                            value={userData.experience_years}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Years of experience"
                            min="0"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emergency Contact
                      </label>
                      <input
                        type="tel"
                        name="emergency_contact"
                        value={userData.emergency_contact}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Emergency contact number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dietary Requirements
                      </label>
                      <textarea
                        name="dietary_requirements"
                        value={userData.dietary_requirements}
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Any dietary restrictions or requirements"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Special Accommodations
                      </label>
                      <textarea
                        name="special_accommodations"
                        value={userData.special_accommodations}
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Any special accommodations needed"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting || registrationBlocked}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Registering...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check mr-2"></i>
                        Register for Event
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(config.routes.events)}
                    className="bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center"
                  >
                    <i className="fas fa-arrow-left mr-2"></i>
                    Back to Events
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Blocked Registration Message */}
          {registrationBlocked && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
              <div className="text-red-500 text-4xl mb-4">
                <i className="fas fa-ban"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Registration Not Available</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => navigate(config.routes.events)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Back to Events
              </button>
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
};

export default IndividualRegistration;
