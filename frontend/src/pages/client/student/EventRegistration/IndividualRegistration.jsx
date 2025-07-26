import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { clientAPI } from '../../../../api/axios';
import ClientLayout from '../../../../components/client/Layout';
import LoadingSpinner from '../../../../components/LoadingSpinner';

const StudentIndividualRegistration = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  // State management
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registrationBlocked, setRegistrationBlocked] = useState(false);
  
  // Student data state
  const [studentData, setStudentData] = useState({
    enrollment_no: '',
    full_name: '',
    email: '',
    mobile_no: '',
    department: '',
    semester: '',
    year_of_study: '',
    emergency_contact: '',
    dietary_requirements: '',
    special_accommodations: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login', { state: { from: location } });
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
        
        // Verify this is a student event
        if (eventData.target_audience !== 'students' && eventData.target_audience !== 'both') {
          setError('This event is not available for student registration.');
          setRegistrationBlocked(true);
          return;
        }

        // Verify this supports individual registration
        if (eventData.registration_type === 'team' && eventData.event_type === 'team') {
          setError('This event only supports team registration.');
          setRegistrationBlocked(true);
          return;
        }
      }

      // Pre-populate student data if available
      if (user) {
        setStudentData(prev => ({
          ...prev,
          enrollment_no: user.enrollment_no || '',
          full_name: user.full_name || user.name || '',
          email: user.email || '',
          mobile_no: user.mobile_no || '',
          department: user.department || '',
          semester: user.semester || ''
        }));
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load registration details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStudentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const required = ['enrollment_no', 'full_name', 'email', 'mobile_no', 'department', 'semester'];
    for (let field of required) {
      if (!studentData[field]) {
        setError(`Please fill in the ${field.replace('_', ' ')} field.`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');

      const registrationData = {
        event_id: eventId,
        registration_type: 'individual',
        student_data: studentData,
        timestamp: new Date().toISOString()
      };

      // Submit registration
      const response = await clientAPI.registerForEvent(registrationData);
      
      if (response.data.success) {
        setSuccess('Registration submitted successfully!');
        
        // Navigate to success page
        setTimeout(() => {
          navigate(`/student/events/${eventId}/registration-success`);
        }, 2000);
      } else {
        setError(response.data.message || 'Registration failed. Please try again.');
      }

    } catch (error) {
      console.error('Registration error:', error);
      setError('Failed to submit registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !event) {
    return (
      <ClientLayout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </ClientLayout>
    );
  }

  if (registrationBlocked) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-md mx-auto">
            <div className="bg-white shadow-lg rounded-lg p-6 text-center">
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Not Available</h2>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={() => navigate('/student/events')}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Back to Events
              </button>
            </div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <h1 className="text-2xl font-bold mb-2">Student Individual Registration</h1>
              {event && (
                <p className="text-blue-100">
                  Registering for: <span className="font-semibold">{event.title}</span>
                </p>
              )}
            </div>

            {/* Form */}
            <div className="p-6">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Enrollment Number *
                      </label>
                      <input
                        type="text"
                        name="enrollment_no"
                        value={studentData.enrollment_no}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        value={studentData.full_name}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={studentData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        name="mobile_no"
                        value={studentData.mobile_no}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department *
                      </label>
                      <input
                        type="text"
                        name="department"
                        value={studentData.department}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Semester *
                      </label>
                      <select
                        name="semester"
                        value={studentData.semester}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Semester</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                          <option key={sem} value={sem}>{sem}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Year of Study
                      </label>
                      <select
                        name="year_of_study"
                        value={studentData.year_of_study}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Year</option>
                        <option value="1">First Year</option>
                        <option value="2">Second Year</option>
                        <option value="3">Third Year</option>
                        <option value="4">Fourth Year</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Emergency Contact
                      </label>
                      <input
                        type="tel"
                        name="emergency_contact"
                        value={studentData.emergency_contact}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dietary Requirements
                    </label>
                    <textarea
                      name="dietary_requirements"
                      value={studentData.dietary_requirements}
                      onChange={handleInputChange}
                      rows="2"
                      placeholder="Any dietary restrictions or preferences..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Special Accommodations
                    </label>
                    <textarea
                      name="special_accommodations"
                      value={studentData.special_accommodations}
                      onChange={handleInputChange}
                      rows="2"
                      placeholder="Any special accommodations needed..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Submitting Registration...</span>
                      </span>
                    ) : (
                      'Submit Registration'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default StudentIndividualRegistration;
