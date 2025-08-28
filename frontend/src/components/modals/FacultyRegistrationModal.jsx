import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { clientAPI } from '../../api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
// Phase 1 Integration: Validation & ID Generation
import { validators, useValidation } from '../../utils/validators';
import { 
  generateRegistrationId,
  generateTeamRegistrationId,
  generateSessionId,
  idValidators 
} from '../../utils/idGenerator';

const FacultyRegistrationModal = ({ 
  isOpen, 
  onClose, 
  eventId, 
  event,
  forceTeamMode = false,
  onRegistrationSuccess 
}) => {
  const { user, userType } = useAuth();

  // State management
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form data state
  const [formData, setFormData] = useState({
    full_name: '',
    employee_id: '',
    email: '',
    contact_no: '',
    department: '',
    team_name: '',
    participants: []
  });

  // Team registration state
  const [isTeamRegistration, setIsTeamRegistration] = useState(false);
  const [teamSizeMin, setTeamSizeMin] = useState(2);
  const [teamSizeMax, setTeamSizeMax] = useState(5);
  const [participantCount, setParticipantCount] = useState(0);

  // Phase 1 Integration: Validation & Session Management
  const { validationErrors: formValidationErrors, validateForm: validateFormData, clearValidationError } = useValidation();
  const [sessionId, setSessionId] = useState(null);
  const [tempRegistrationId, setTempRegistrationId] = useState(null);
  const [tempTeamId, setTempTeamId] = useState(null);

  // Initialize session and IDs for faculty
  useEffect(() => {
    if (isOpen && user && eventId) {
      const initializeSession = () => {
        const newSessionId = generateSessionId();
        setSessionId(newSessionId);
        
        // Generate REAL registration ID for faculty
        if (user?.employee_id && eventId) {
          const registrationId = generateRegistrationId(
            user.employee_id,
            eventId,
            user.full_name || 'Faculty'
          );
          setTempRegistrationId(registrationId);
        }
      };
      
      initializeSession();
    }
  }, [isOpen, user, eventId]);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && user && event) {
      // Utility function to resolve contact number from various field names
      const resolveContactNumber = (userData) => {
        const possibleFields = ['contact_no', 'phone_number', 'mobile_no', 'phone', 'mobile', 'contact'];
        for (const field of possibleFields) {
          if (userData[field] && userData[field].trim()) {
            return userData[field];
          }
        }
        return '';
      };

      // Get session storage data as fallback
      let sessionProfile = null;
      try {
        const sessionData = sessionStorage.getItem('complete_profile');
        if (sessionData) {
          sessionProfile = JSON.parse(sessionData);
        }
      } catch (e) {
        console.warn('Could not parse session profile data');
      }

      const sourceData = sessionProfile || user;
      const contactNumber = resolveContactNumber(sourceData);
      
      // Set registration mode
      const shouldUseTeamMode = forceTeamMode || event.registration_mode === 'team';
      setIsTeamRegistration(shouldUseTeamMode);
      setTeamSizeMin(event.team_size_min || 2);
      setTeamSizeMax(event.team_size_max || 5);
      
      const newFormData = {
        full_name: sourceData.full_name || '',
        employee_id: sourceData.employee_id || '',
        email: sourceData.email || '',
        contact_no: contactNumber,
        department: sourceData.department || '',
        team_name: '',
        participants: []
      };
      
      setFormData(newFormData);

      // Initialize participants for team registration
      if (shouldUseTeamMode) {
        const minParticipants = (event.team_size_min || 2) - 1;
        initializeParticipants(minParticipants);
      }
    }
  }, [isOpen, user, event, forceTeamMode]);

  // Initialize participants array for team registration
  const initializeParticipants = useCallback((count) => {
    const participants = Array(count).fill(null).map((_, index) => ({
      id: index + 1,
      employee_id: '',
      full_name: '',
      email: '',
      contact_no: '',
      department: '',
      isValid: false,
      errors: {}
    }));
    
    setFormData(prev => ({
      ...prev,
      participants
    }));
    setParticipantCount(count);
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) {
      setError('');
    }
  };

  // Handle participant input changes
  const handleParticipantChange = (participantIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map((participant, index) => 
        index === participantIndex 
          ? { ...participant, [field]: value, errors: { ...participant.errors, [field]: '' } }
          : participant
      )
    }));
  };

  // Add participant
  const addParticipant = () => {
    if (participantCount >= teamSizeMax - 1) return;
    
    const newParticipant = {
      id: participantCount + 1,
      employee_id: '',
      full_name: '',
      email: '',
      contact_no: '',
      department: '',
      isValid: false,
      errors: {}
    };
    
    setFormData(prev => ({
      ...prev,
      participants: [...prev.participants, newParticipant]
    }));
    setParticipantCount(prev => prev + 1);
  };

  // Remove participant
  const removeParticipant = () => {
    if (participantCount <= teamSizeMin - 1) return;
    
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.slice(0, -1)
    }));
    setParticipantCount(prev => prev - 1);
  };

  // Legacy form validation
  const validateFormLegacy = () => {
    const errors = [];
    
    if (!formData.full_name.trim()) errors.push('Full name is required');
    if (!formData.employee_id.trim()) errors.push('Employee ID is required');
    if (!formData.email.trim()) errors.push('Email is required');
    if (!formData.contact_no.trim()) errors.push('Contact number is required');
    if (!formData.department) errors.push('Department is required');
    
    if (isTeamRegistration) {
      if (!formData.team_name.trim()) errors.push('Team name is required');
      
      const invalidParticipants = formData.participants.filter(p => !p.isValid);
      if (invalidParticipants.length > 0) {
        errors.push('Please ensure all team members have valid Employee IDs');
      }
    }
    
    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Phase 1: Use enhanced validation
    const isFormValid = validateFormData(formData, {
      full_name: validators.required,
      employee_id: validators.faculty,
      email: validators.email,
      contact_no: validators.mobileNumber,
      department: validators.required
    });

    if (!isFormValid) {
      const errorMessages = Object.values(formValidationErrors);
      if (errorMessages.length > 0) {
        setError(`Validation failed: ${errorMessages.join(', ')}`);
      } else {
        setError('Please fill in all required fields correctly');
      }
      return;
    }

    // Legacy validation as fallback
    const legacyValidationErrors = validateFormLegacy();
    if (legacyValidationErrors.length > 0) {
      setError(legacyValidationErrors.join(', '));
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      const registrationData = {
        registration_type: isTeamRegistration ? 'team' : 'individual',
        faculty_data: {
          ...formData,
          registration_id: tempRegistrationId
        },
        team_data: isTeamRegistration ? {
          team_name: formData.team_name,
          team_members: formData.participants.map(p => p.employee_id).filter(id => id.trim()),
          team_leader: user?.employee_id
        } : {},
        action: 'register'
      };
      
      if (isTeamRegistration) {
        registrationData.faculty_data.participants = formData.participants.filter(p => p.employee_id.trim());
      }
      
      const response = await clientAPI.registerForEvent(eventId, registrationData);
      
      if (response.data.success) {
        setSuccess('Registration successful!');
        setTimeout(() => {
          onRegistrationSuccess && onRegistrationSuccess();
          onClose();
        }, 1500);
      } else {
        setError(response.data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.response?.data?.message || 'An error occurred during registration');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError('');
      setSuccess('');
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* This element is to trick the browser into centering the modal contents */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-500 shadow-lg mr-3">
                  <i className="fas fa-chalkboard-teacher text-white text-lg"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900" id="modal-title">
                    Faculty Registration
                  </h3>
                  <p className="text-sm text-gray-600">
                    {event?.event_name || event?.title || event?.name || 'Event Registration'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                type="button"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded">
                <i className="fas fa-exclamation-triangle mr-2"></i>{error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 bg-green-50 border-l-4 border-green-400 text-green-700 px-4 py-3 rounded">
                <i className="fas fa-check-circle mr-2"></i>{success}
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="modal_full_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      id="modal_full_name"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                      value={formData.full_name}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="modal_employee_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Employee ID *
                    </label>
                    <input
                      type="text"
                      name="employee_id"
                      id="modal_employee_id"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                      value={formData.employee_id}
                      onChange={handleInputChange}
                      readOnly
                    />
                  </div>

                  <div>
                    <label htmlFor="modal_email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email ID *
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="modal_email"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="modal_contact_no" className="block text-sm font-medium text-gray-700 mb-1">
                      Contact No. *
                    </label>
                    <input
                      type="tel"
                      name="contact_no"
                      id="modal_contact_no"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                      pattern="[0-9]{10}"
                      value={formData.contact_no}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Department */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Academic Information</h4>
                <div>
                  <label htmlFor="modal_department" className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <select
                    name="department"
                    id="modal_department"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                    value={formData.department}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Department</option>
                    <option value="Computer Engineering">Computer Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Master of Computer Applications">Master of Computer Applications</option>
                    <option value="MBA">MBA</option>
                  </select>
                </div>
              </div>

              {/* Team Registration */}
              {isTeamRegistration && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Team Information</h4>
                  <div className="mb-4">
                    <label htmlFor="modal_team_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      name="team_name"
                      id="modal_team_name"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                      value={formData.team_name}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Simplified team participants for modal */}
                  <div className="text-sm text-gray-600">
                    <i className="fas fa-info-circle mr-1"></i>
                    Team member details will be collected after initial registration.
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-base font-medium text-white hover:from-purple-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane mr-2"></i>
                      {isTeamRegistration ? 'Submit Team Registration' : 'Submit Registration'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyRegistrationModal;
