import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { clientAPI } from '../../../api/axios';
import ClientLayout from '../../../components/client/Layout';
import LoadingSpinner from '../../../components/LoadingSpinner';

const StudentIndividualRegistration = () => {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  // State management
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registrationBlocked, setRegistrationBlocked] = useState(false);
  
  // Form data based on Student model
  const [formData, setFormData] = useState({
    enrollment_no: '',
    full_name: '',
    email: '',
    mobile_no: '',
    department: '',
    semester: '',
    gender: '',
    date_of_birth: '',
    additional_notes: '',
    emergency_contact: '',
    emergency_contact_name: '',
    food_preference: '',
    accommodation_needed: false,
    previous_participation: '',
    expectations: ''
  });

  useEffect(() => {
    // Check if we're in development mode
    const isDevelopmentMode = location.pathname.startsWith('/dev/');
    const eventIdFromParams = eventId || searchParams.get('eventId');
    
    if (!isAuthenticated && !isDevelopmentMode) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }
    
    fetchEventData(eventIdFromParams, isDevelopmentMode);
  }, [eventId, isAuthenticated, location]);

  const fetchEventData = async (eventIdParam, isDevelopmentMode) => {
    try {
      setIsLoading(true);
      
      if (isDevelopmentMode) {
        // Mock data for development
        const mockEvent = {
          event_id: 'mock-event-123',
          title: 'Mock Individual Event for Testing',
          target_audience: 'student',
          event_type: 'individual',
          registration_type: 'individual',
          sub_status: 'registration_open'
        };
        setEvent(mockEvent);
        
        // Mock student data for development
        const mockStudent = {
          enrollment_no: '21BECE40015',
          full_name: 'John Doe',
          email: 'john.doe@ldrp.ac.in',
          mobile_no: '9876543210',
          department: 'Computer Engineering',
          semester: 6,
          gender: 'Male',
          date_of_birth: '2003-01-15'
        };
        
        // Autofill form with student data
        setFormData(prev => ({
          ...prev,
          enrollment_no: mockStudent.enrollment_no,
          full_name: mockStudent.full_name,
          email: mockStudent.email,
          mobile_no: mockStudent.mobile_no,
          department: mockStudent.department,
          semester: mockStudent.semester.toString(),
          gender: mockStudent.gender,
          date_of_birth: mockStudent.date_of_birth
        }));
      } else {
        // Fetch real event details
        const eventResponse = await clientAPI.getEventDetails(eventIdParam);
        if (eventResponse.data.success) {
          const eventData = eventResponse.data.event;
          setEvent(eventData);
          
          // Verify this is a student event and supports individual registration
          if (eventData.target_audience !== 'student' && eventData.target_audience !== 'both') {
            setError('This event is not available for student registration.');
            setRegistrationBlocked(true);
            return;
          }

          if (eventData.event_type === 'team' || eventData.registration_type === 'team') {
            setError('This event requires team registration.');
            setRegistrationBlocked(true);
            return;
          }
        }

        // Autofill with current user data
        if (user) {
          setFormData(prev => ({
            ...prev,
            enrollment_no: user.enrollment_no || '',
            full_name: user.full_name || '',
            email: user.email || '',
            mobile_no: user.mobile_no || '',
            department: user.department || '',
            semester: user.semester?.toString() || '',
            gender: user.gender || '',
            date_of_birth: user.date_of_birth ? user.date_of_birth.split('T')[0] : ''
          }));
        }
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load registration details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    // Validate required fields based on Student model
    if (!formData.enrollment_no || !formData.full_name || !formData.email || !formData.mobile_no) {
      setError('Please fill in all required fields (Enrollment No, Name, Email, Mobile).');
      return false;
    }

    // Validate mobile number format
    if (!/^[0-9]{10}$/.test(formData.mobile_no)) {
      setError('Please enter a valid 10-digit mobile number.');
      return false;
    }

    // Validate email format
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address.');
      return false;
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
        event_id: event.event_id,
        registration_type: 'individual',
        student_data: formData,
        timestamp: new Date().toISOString()
      };

      // Submit registration (replace with actual API call)
      console.log('Student Individual Registration Data:', registrationData);
      
      // For now, just simulate success
      setSuccess('Registration submitted successfully!');
      
      // Navigate to success page after a delay
      setTimeout(() => {
        if (location.pathname.startsWith('/dev/')) {
          navigate('/dev/registration-success');
        } else {
          navigate(`/client/events/${event.event_id}/registration-success`);
        }
      }, 2000);

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
                onClick={() => navigate('/client/events')}
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
              <h1 className="text-2xl font-bold mb-2">Student Registration</h1>
              {event && (
                <p className="text-blue-100">
                  Registering for: <span className="font-semibold">{event.title}</span>
                </p>
              )}
              <p className="text-xs text-blue-100 mt-1">Individual Registration</p>
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
                {/* Basic Student Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Enrollment Number *
                      </label>
                      <input
                        type="text"
                        name="enrollment_no"
                        value={formData.enrollment_no}
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
                        value={formData.full_name}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
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
                        value={formData.mobile_no}
                        onChange={handleInputChange}
                        required
                        pattern="[0-9]{10}"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Semester
                      </label>
                      <select
                        name="semester"
                        value={formData.semester}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Semester</option>
                        {[1,2,3,4,5,6,7,8].map(sem => (
                          <option key={sem} value={sem}>{sem}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gender
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Additional Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Emergency Contact Name
                      </label>
                      <input
                        type="text"
                        name="emergency_contact_name"
                        value={formData.emergency_contact_name}
                        onChange={handleInputChange}
                        placeholder="Parent/Guardian name"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Emergency Contact Number
                      </label>
                      <input
                        type="tel"
                        name="emergency_contact"
                        value={formData.emergency_contact}
                        onChange={handleInputChange}
                        pattern="[0-9]{10}"
                        placeholder="10-digit number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Food Preference
                      </label>
                      <select
                        name="food_preference"
                        value={formData.food_preference}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Preference</option>
                        <option value="Vegetarian">Vegetarian</option>
                        <option value="Non-Vegetarian">Non-Vegetarian</option>
                        <option value="Vegan">Vegan</option>
                        <option value="Jain">Jain</option>
                      </select>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="accommodation_needed"
                        id="accommodation_needed"
                        checked={formData.accommodation_needed}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <label htmlFor="accommodation_needed" className="text-sm font-medium text-gray-700">
                        Accommodation needed
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Previous Event Participation
                    </label>
                    <textarea
                      name="previous_participation"
                      value={formData.previous_participation}
                      onChange={handleInputChange}
                      rows="2"
                      placeholder="List any relevant events you've participated in..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expectations from this Event
                    </label>
                    <textarea
                      name="expectations"
                      value={formData.expectations}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="What do you hope to learn or achieve from this event..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes
                    </label>
                    <textarea
                      name="additional_notes"
                      value={formData.additional_notes}
                      onChange={handleInputChange}
                      rows="2"
                      placeholder="Any additional information or special requirements..."
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
                        <span className="ml-2">Submitting...</span>
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
