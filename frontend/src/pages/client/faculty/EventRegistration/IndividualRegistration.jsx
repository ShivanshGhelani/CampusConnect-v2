import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { clientAPI } from '../../../../api/axios';
import ClientLayout from '../../../../components/client/Layout';
import LoadingSpinner from '../../../../components/LoadingSpinner';

const FacultyIndividualRegistration = () => {
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
  
  // Faculty data state
  const [facultyData, setFacultyData] = useState({
    employee_id: '',
    full_name: '',
    email: '',
    mobile_no: '',
    department: '',
    designation: '',
    qualification: '',
    specialization: '',
    experience_years: '',
    research_interests: '',
    professional_memberships: '',
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
        
        // Verify this is a faculty event
        if (eventData.target_audience !== 'faculty' && eventData.target_audience !== 'both') {
          setError('This event is not available for faculty registration.');
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

      // Pre-populate faculty data if available
      if (user) {
        setFacultyData(prev => ({
          ...prev,
          employee_id: user.employee_id || user.faculty_id || '',
          full_name: user.full_name || user.name || user.faculty_name || '',
          email: user.email || '',
          mobile_no: user.mobile_no || user.phone || '',
          department: user.department || '',
          designation: user.designation || '',
          qualification: user.qualification || '',
          specialization: user.specialization || ''
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
    setFacultyData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const required = ['employee_id', 'full_name', 'email', 'mobile_no', 'department', 'designation'];
    for (let field of required) {
      if (!facultyData[field]) {
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
        faculty_data: facultyData,
        timestamp: new Date().toISOString()
      };

      // Submit registration
      const response = await clientAPI.registerForEvent(registrationData);
      
      if (response.data.success) {
        setSuccess('Registration submitted successfully!');
        
        // Navigate to success page
        setTimeout(() => {
          navigate(`/faculty/events/${eventId}/registration-success`);
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
                onClick={() => navigate('/faculty/events')}
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6">
              <h1 className="text-2xl font-bold mb-2">Faculty Individual Registration</h1>
              {event && (
                <p className="text-green-100">
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
                        Employee ID *
                      </label>
                      <input
                        type="text"
                        name="employee_id"
                        value={facultyData.employee_id}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        value={facultyData.full_name}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={facultyData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        name="mobile_no"
                        value={facultyData.mobile_no}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department *
                      </label>
                      <input
                        type="text"
                        name="department"
                        value={facultyData.department}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Designation *
                      </label>
                      <select
                        name="designation"
                        value={facultyData.designation}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Select Designation</option>
                        <option value="Professor">Professor</option>
                        <option value="Associate Professor">Associate Professor</option>
                        <option value="Assistant Professor">Assistant Professor</option>
                        <option value="Lecturer">Lecturer</option>
                        <option value="Senior Lecturer">Senior Lecturer</option>
                        <option value="Research Associate">Research Associate</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Qualification
                      </label>
                      <input
                        type="text"
                        name="qualification"
                        value={facultyData.qualification}
                        onChange={handleInputChange}
                        placeholder="e.g., Ph.D., M.Tech., M.Sc."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Experience (Years)
                      </label>
                      <input
                        type="number"
                        name="experience_years"
                        value={facultyData.experience_years}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Specialization
                    </label>
                    <input
                      type="text"
                      name="specialization"
                      value={facultyData.specialization}
                      onChange={handleInputChange}
                      placeholder="Area of specialization"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Research Interests
                    </label>
                    <textarea
                      name="research_interests"
                      value={facultyData.research_interests}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Current research interests and focus areas..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Professional Memberships
                    </label>
                    <textarea
                      name="professional_memberships"
                      value={facultyData.professional_memberships}
                      onChange={handleInputChange}
                      rows="2"
                      placeholder="Professional organizations, societies, etc."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Emergency Contact
                      </label>
                      <input
                        type="tel"
                        name="emergency_contact"
                        value={facultyData.emergency_contact}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dietary Requirements
                      </label>
                      <input
                        type="text"
                        name="dietary_requirements"
                        value={facultyData.dietary_requirements}
                        onChange={handleInputChange}
                        placeholder="Any dietary restrictions"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Special Accommodations
                    </label>
                    <textarea
                      name="special_accommodations"
                      value={facultyData.special_accommodations}
                      onChange={handleInputChange}
                      rows="2"
                      placeholder="Any special accommodations needed..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default FacultyIndividualRegistration;
