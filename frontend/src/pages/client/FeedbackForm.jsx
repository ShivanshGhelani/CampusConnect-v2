import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clientAPI } from '../../api/axios';
import ClientLayout from '../../components/client/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';

const FeedbackForm = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // Mapping functions to convert form values to backend expected formats
  const mapSatisfactionToNumber = (value) => {
    const mapping = {
      'excellent': 5,
      'very_good': 4,
      'good': 3,
      'fair': 2,
      'poor': 1
    };
    return mapping[value] || 3;
  };

  const mapRatingToNumber = (value) => {
    const mapping = {
      'excellent': 5,
      'very_good': 4,
      'good': 3,
      'fair': 2,
      'poor': 1
    };
    return mapping[value] || 3;
  };

  const mapRelevanceToNumber = (value) => {
    const mapping = {
      'highly_relevant': 5,
      'relevant': 4,
      'somewhat_relevant': 3,
      'not_very_relevant': 2,
      'not_relevant': 1
    };
    return mapping[value] || 3;
  };

  const mapExpectationsToNumber = (value) => {
    const mapping = {
      'exceeded': 5,
      'met': 4,
      'somewhat_met': 3,
      'did_not_meet': 2,
      'far_below': 1
    };
    return mapping[value] || 3;
  };

  const mapLikelihoodToNumber = (value) => {
    const mapping = {
      'very_likely': 5,
      'likely': 4,
      'neutral': 3,
      'unlikely': 2,
      'very_unlikely': 1
    };
    return mapping[value] || 3;
  };

  const mapClarityToNumber = (value) => {
    const mapping = {
      'very_clear': 5,
      'clear': 4,
      'somewhat_clear': 3,
      'unclear': 2,
      'very_unclear': 1
    };
    return mapping[value] || 3;
  };

  const mapValueToNumber = (value) => {
    const mapping = {
      'excellent_value': 5,
      'good_value': 4,
      'fair_value': 3,
      'poor_value': 2,
      'very_poor_value': 1
    };
    return mapping[value] || 3;
  };

  const mapProcessToNumber = (value) => {
    const mapping = {
      'very_easy': 5,
      'easy': 4,
      'neutral': 3,
      'difficult': 2,
      'very_difficult': 1
    };
    return mapping[value] || 3;
  };

  const mapExpectationsToBool = (value) => {
    return ['exceeded', 'met', 'somewhat_met'].includes(value);
  };

  const mapLikelihoodToBool = (value) => {
    return ['very_likely', 'likely'].includes(value);
  };

  // State management
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoPopulated, setAutoPopulated] = useState(false);

  // Form states
  const [currentActualStep, setCurrentActualStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Participant Details
    participant_name: '',
    participant_email: '',
    department: '',
    year_of_study: '',
    registration_type: 'student',

    // Step 2: Event Experience & Suggestions
    overall_satisfaction: '',
    recommendation_likelihood: '',
    future_suggestions: '',
    additional_comments: '',

    // Step 3: Content & Delivery
    content_relevance: '',
    speaker_engagement: '',
    met_expectations: '',

    // Step 4: Team Events Only (Conditional)
    team_format_management: '',
    rules_clarity: '',

    // Step 5: Paid Events Only (Conditional)
    value_for_money: '',
    payment_process: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }
    
    fetchEventDetails();
  }, [eventId, isAuthenticated]);

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await clientAPI.getEventDetails(eventId);
      
      if (response.data.success) {
        const eventData = response.data.event;
        setEvent(eventData);
        
        // Check if feedback already exists
        try {
          const feedbackResponse = await clientAPI.getFeedbackStatus(eventId);
          console.log('Feedback status response:', feedbackResponse.data);
          
          if (feedbackResponse.data.success && feedbackResponse.data.feedback_submitted) {
            console.log('Feedback already submitted, redirecting to confirmation');
            // Feedback already submitted, redirect to confirmation page
            navigate(`/client/events/${eventId}/feedback-confirmation`);
            return;
          }
        } catch (feedbackError) {
          // No feedback found, continue with form
          console.log('No feedback found, proceeding with form:', feedbackError);
        }
        
        // Auto-populate user data if available
        if (user) {
          setFormData(prev => ({
            ...prev,
            participant_name: user.full_name || user.name || '',
            participant_email: user.email || '',
            department: user.department || '',
            year_of_study: user.year || ''
          }));
          setAutoPopulated(true);
        }
      } else {
        setError('Failed to load event details');
      }
    } catch (error) {
      console.error('Event details fetch error:', error);
      setError('Failed to load event details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get list of visible steps based on event type
  const getVisibleSteps = () => {
    const steps = [1, 2, 3]; // Always visible steps
    if (event?.is_team_based || event?.registration_mode === 'team') steps.push(4); // Team step
    if (event?.is_paid || event?.registration_fee > 0) steps.push(5); // Paid step
    return steps;
  };

  // Create mapping between actual steps and display step numbers
  const createStepMapping = () => {
    const visibleSteps = getVisibleSteps();
    const actualToDisplay = {};
    const displayToActual = {};
    
    visibleSteps.forEach((actualStep, index) => {
      const displayStep = index + 1;
      actualToDisplay[actualStep] = displayStep;
      displayToActual[displayStep] = actualStep;
    });
    
    return { actualToDisplay, displayToActual, totalSteps: visibleSteps.length };
  };

  // Get display step number for current actual step
  const getCurrentDisplayStep = () => {
    const stepMapping = createStepMapping();
    return stepMapping.actualToDisplay[currentActualStep] || 1;
  };

  // Calculate step mapping for conditional steps
  const getNextStepNumber = (currentActualStepNum) => {
    const visibleSteps = getVisibleSteps();
    const currentIndex = visibleSteps.indexOf(currentActualStepNum);
    
    if (currentIndex !== -1 && currentIndex < visibleSteps.length - 1) {
      return visibleSteps[currentIndex + 1];
    }
    
    return currentActualStepNum; // Can't go further
  };

  const getPrevStepNumber = (currentActualStepNum) => {
    const visibleSteps = getVisibleSteps();
    const currentIndex = visibleSteps.indexOf(currentActualStepNum);
    
    if (currentIndex > 0) {
      return visibleSteps[currentIndex - 1];
    }
    
    return currentActualStepNum; // Can't go back
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateCurrentStep = () => {
    const currentStepElement = document.getElementById(`step-${currentActualStep}`);
    if (!currentStepElement) return true;

    const requiredFields = currentStepElement.querySelectorAll('input[required], textarea[required], select[required]');
    const errors = [];
    const processedRadioGroups = new Set();
    
    requiredFields.forEach(field => {
      if (field.type === 'radio') {
        // Avoid duplicate checks for the same radio group
        if (!processedRadioGroups.has(field.name)) {
          processedRadioGroups.add(field.name);
          const radioGroup = currentStepElement.querySelectorAll(`input[name="${field.name}"]`);
          const checked = Array.from(radioGroup).some(radio => radio.checked);
          if (!checked) {
            const label = field.closest('div').querySelector('label');
            const fieldName = label ? label.textContent.replace(' *', '').replace('*', '').trim() : field.name.replace(/_/g, ' ');
            errors.push(`We'd love to hear about: ${fieldName}`);
          }
        }
      } else if (!field.value.trim()) {
        const label = field.closest('div').querySelector('label');
        const fieldName = label ? label.textContent.replace(' *', '').replace('*', '').trim() : field.name.replace(/_/g, ' ');
        errors.push(`We'd love to hear about: ${fieldName}`);
      }
    });
    
    if (errors.length > 0) {
      showValidationError(errors);
      return false;
    }
    
    return true;
  };

  const showValidationError = (errors) => {
    // Remove existing error messages
    document.querySelectorAll('.step-error').forEach(el => el.remove());
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'step-error bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4';
    errorDiv.innerHTML = `
      <div class="flex items-start">
        <svg class="h-5 w-5 text-red-400 mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
        <div>
          <h4 class="font-medium mb-1">Help us improve - just a few more details:</h4>
          <ul class="list-disc list-inside text-sm">
            ${errors.map(error => `<li>${error}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
    
    const currentStepElement = document.getElementById(`step-${currentActualStep}`);
    currentStepElement.insertBefore(errorDiv, currentStepElement.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => errorDiv.remove(), 5000);
  };

  const showStep = (stepNumber) => {
    setCurrentActualStep(stepNumber);
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      const nextStep = getNextStepNumber(currentActualStep);
      if (nextStep > currentActualStep) {
        showStep(nextStep);
      }
    }
  };

  const handlePrev = () => {
    const prevStep = getPrevStepNumber(currentActualStep);
    if (prevStep < currentActualStep) {
      showStep(prevStep);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Remove any existing error messages
    document.querySelectorAll('.step-error, .form-error').forEach(el => el.remove());
    
    // Step-wise validation for comprehensive feedback form
    const requiredFields = [
      // Step 2 - Event Experience & Suggestions
      'overall_satisfaction',
      'recommendation_likelihood', 
      'future_suggestions',
      
      // Step 3 - Content & Delivery
      'content_relevance',
      'speaker_engagement',
      'met_expectations'
    ];

    // Conditional validations based on event type
    if (event?.is_team_based || event?.registration_mode === 'team') {
      requiredFields.push('team_format_management', 'rules_clarity');
    }

    if (event?.is_paid || event?.registration_fee > 0) {
      requiredFields.push('value_for_money', 'payment_process');
    }

    let errors = [];
    
    // Check each required field
    requiredFields.forEach(field => {
      const value = formData[field];
      if (!value || !value.toString().trim()) {
        const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        errors.push(`Please provide feedback on: ${fieldLabel}`);
      }
    });

    // Show errors if any
    if (errors.length > 0) {
      // Create a more user-friendly error display
      const errorDiv = document.createElement('div');
      errorDiv.className = 'form-error fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md';
      errorDiv.innerHTML = `
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Please complete all required fields</h3>
            <div class="mt-2 text-sm text-red-700">
              <ul class="list-disc pl-5 space-y-1">
                ${errors.slice(0, 3).map(error => `<li>${error}</li>`).join('')}
                ${errors.length > 3 ? `<li>And ${errors.length - 3} more fields...</li>` : ''}
              </ul>
            </div>
          </div>
          <button type="button" onclick="this.parentElement.parentElement.remove()" class="ml-auto -mx-1.5 -my-1.5 text-red-400 hover:text-red-600">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
      `;
      
      document.body.appendChild(errorDiv);
      
      // Auto-remove after 8 seconds
      setTimeout(() => {
        if (errorDiv.parentElement) {
          errorDiv.remove();
        }
      }, 8000);
      
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Submit feedback to API
      const feedbackPayload = {
        // Participant Details
        participant_name: formData.participant_name,
        participant_email: formData.participant_email,
        department: formData.department,
        year_of_study: formData.year_of_study,
        registration_type: formData.registration_type,

        // Map form fields to backend expected fields
        overall_satisfaction: mapSatisfactionToNumber(formData.overall_satisfaction),
        speaker_effectiveness: mapRatingToNumber(formData.speaker_engagement),
        content_quality: mapRelevanceToNumber(formData.content_relevance),
        organization: mapExpectationsToNumber(formData.met_expectations),
        venue_rating: 4, // Default venue rating
        likelihood_recommend: mapLikelihoodToNumber(formData.recommendation_likelihood),

        // Text fields
        most_valuable: "Event content and presentation", // Default
        suggestions: formData.future_suggestions || '',
        additional_comments: formData.additional_comments || '',

        // Boolean fields
        attended_similar: false, // Default
        learned_something_new: true, // Default
        met_expectations: mapExpectationsToBool(formData.met_expectations),
        would_attend_future: mapLikelihoodToBool(formData.recommendation_likelihood),

        // Conditional fields
        ...(event?.is_team_based || event?.registration_mode === 'team' ? {
          team_format_management: mapRatingToNumber(formData.team_format_management),
          rules_clarity: mapClarityToNumber(formData.rules_clarity)
        } : {}),

        ...(event?.is_paid || event?.registration_fee > 0 ? {
          value_for_money: mapValueToNumber(formData.value_for_money),
          payment_process: mapProcessToNumber(formData.payment_process)
        } : {})
      };

      console.log('Submitting feedback payload:', feedbackPayload);
      const response = await clientAPI.submitEventFeedback(eventId, feedbackPayload);
      console.log('Feedback submission response:', response.data);
      
      if (response.data.success) {
        // Show success message and redirect
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200';
        successDiv.innerHTML = `
          <div class="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-2">Thank You!</h3>
            <p class="text-gray-600 mb-4">Your feedback has been submitted successfully. You can now download your certificate!</p>
            <div class="text-sm text-green-600 font-medium">Redirecting to certificate download...</div>
          </div>
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
          navigate(`/client/events/${eventId}/feedback-success?feedback_submitted=True`);
        }, 2000);
        
      } else {
        throw new Error(response.data.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      setError('Failed to submit feedback. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </ClientLayout>
    );
  }

  if (error || !event) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Event Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'The event you are looking for does not exist.'}</p>
            <Link 
              to="/client/events" 
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Events
            </Link>
          </div>
        </div>
      </ClientLayout>
    );
  }

  const stepMapping = createStepMapping();
  const currentDisplayStep = getCurrentDisplayStep();

  return (
    <ClientLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Navigation */}
        <nav className="mb-8">
          <Link 
            to={`/client/events/${eventId}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Back to Event Details
          </Link>
        </nav>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-2xl text-white p-8 mb-8">
          <h1 className="text-3xl font-bold mb-4">Event Feedback</h1>
          <h2 className="text-xl font-semibold mb-2">{event.event_name || event.name}</h2>
          <p className="text-blue-100">Your feedback helps us improve future events. Please take a moment to share your thoughts.</p>
        </div>

        {autoPopulated && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6" role="alert">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <p className="font-medium">✓ Registration and attendance verified successfully - you're eligible for certificate collection!</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Feedback Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8" id="feedback-form">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-500" id="step-counter">
                Step {currentDisplayStep} of {stepMapping.totalSteps}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                id="progress-bar" 
                style={{ width: `${Math.min((currentDisplayStep / stepMapping.totalSteps) * 100, 100)}%` }}
              ></div>
            </div>
            
            {/* Step Navigation Dots */}
            <div className="flex justify-center mt-4 space-x-2">
              {getVisibleSteps().map((step, index) => (
                <div 
                  key={step}
                  className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                    index + 1 <= currentDisplayStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  data-step={step}
                ></div>
              ))}
            </div>
          </div>

          {/* Step 1: Participant Details */}
          <div className={`form-step ${currentActualStep === 1 ? 'block' : 'hidden'}`} id="step-1">
            <div className="mb-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="mr-3 text-2xl">👤</span>
                Step 1: Participant Details
              </h3>
              <p className="text-sm text-gray-600 mb-6">Help us identify context - name and email are optional for anonymity.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.participant_name}
                    onChange={(e) => handleInputChange('participant_name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={formData.participant_email}
                    onChange={(e) => handleInputChange('participant_email', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your.email@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your department"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year of Study (Optional)
                  </label>
                  <select
                    value={formData.year_of_study}
                    onChange={(e) => handleInputChange('year_of_study', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select year</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
                
                <input type="hidden" name="registration_type" value="student" />
              </div>
              
              <div className="flex justify-end mt-8">
                <button
                  type="button"
                  onClick={handleNext}
                  className="next-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Next Step →
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Event Experience & Suggestions */}
          <div className={`form-step ${currentActualStep === 2 ? 'block' : 'hidden'}`} id="step-2">
            <div className="mb-8 p-6 bg-blue-50 rounded-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="mr-3 text-2xl">⭐</span>
                Step 2: Event Experience & Suggestions
              </h3>
              <p className="text-sm text-gray-600 mb-6">Tell us about your overall satisfaction and share your suggestions for improvement.</p>
              
              <div className="space-y-8">
                {/* Overall Satisfaction */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Overall Satisfaction *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Excellent', 'Very Good', 'Good', 'Fair', 'Poor'].map((option) => (
                      <label key={option} className="flex items-center cursor-pointer border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="overall_satisfaction"
                          value={option.toLowerCase().replace(' ', '_')}
                          checked={formData.overall_satisfaction === option.toLowerCase().replace(' ', '_')}
                          onChange={(e) => handleInputChange('overall_satisfaction', e.target.value)}
                          className="sr-only"
                          required
                        />
                        <span className="text-sm font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Recommendation Likelihood */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    How likely are you to recommend this event to others? *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Very Likely', 'Likely', 'Neutral', 'Unlikely', 'Very Unlikely'].map((option) => (
                      <label key={option} className="flex items-center cursor-pointer border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="recommendation_likelihood"
                          value={option.toLowerCase().replace(' ', '_')}
                          checked={formData.recommendation_likelihood === option.toLowerCase().replace(' ', '_')}
                          onChange={(e) => handleInputChange('recommendation_likelihood', e.target.value)}
                          className="sr-only"
                          required
                        />
                        <span className="text-sm font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Future Suggestions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What events would you like to see in the future? *
                  </label>
                  <textarea
                    name="future_suggestions"
                    value={formData.future_suggestions}
                    onChange={(e) => handleInputChange('future_suggestions', e.target.value)}
                    required
                    maxLength="500"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="4"
                    placeholder="Suggest topics, formats, or types of events you'd be interested in..."
                  ></textarea>
                </div>

                {/* Additional Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Any additional comments or feedback?
                  </label>
                  <textarea
                    name="additional_comments"
                    value={formData.additional_comments}
                    onChange={(e) => handleInputChange('additional_comments', e.target.value)}
                    maxLength="500"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="4"
                    placeholder="Share any other thoughts or feedback..."
                  ></textarea>
                </div>
              </div>
              
              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="prev-btn bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="next-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Next Step →
                </button>
              </div>
            </div>
          </div>

          {/* Step 3: Content & Delivery */}
          <div className={`form-step ${currentActualStep === 3 ? 'block' : 'hidden'}`} id="step-3">
            <div className="mb-8 p-6 bg-yellow-50 rounded-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="mr-3 text-2xl">📚</span>
                Step 3: Content & Delivery
              </h3>
              <p className="text-sm text-gray-600 mb-6">Rate the educational value and delivery quality of the event.</p>
              
              <div className="space-y-8">
                {/* Content Relevance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    How relevant was the content to your needs? *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Highly Relevant', 'Relevant', 'Somewhat Relevant', 'Not Very Relevant', 'Not Relevant'].map((option) => (
                      <label key={option} className="flex items-center cursor-pointer border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="content_relevance"
                          value={option.toLowerCase().replace(/\s+/g, '_')}
                          checked={formData.content_relevance === option.toLowerCase().replace(/\s+/g, '_')}
                          onChange={(e) => handleInputChange('content_relevance', e.target.value)}
                          className="sr-only"
                          required
                        />
                        <span className="text-sm font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Speaker Engagement */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    How engaging were the speakers/presenters? *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Excellent', 'Very Good', 'Good', 'Fair', 'Poor'].map((option) => (
                      <label key={option} className="flex items-center cursor-pointer border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="speaker_engagement"
                          value={option.toLowerCase().replace(' ', '_')}
                          checked={formData.speaker_engagement === option.toLowerCase().replace(' ', '_')}
                          onChange={(e) => handleInputChange('speaker_engagement', e.target.value)}
                          className="sr-only"
                          required
                        />
                        <span className="text-sm font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Met Expectations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Did the event meet your expectations? *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Exceeded', 'Met', 'Somewhat Met', 'Did Not Meet', 'Far Below'].map((option) => (
                      <label key={option} className="flex items-center cursor-pointer border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="met_expectations"
                          value={option.toLowerCase().replace(/\s+/g, '_')}
                          checked={formData.met_expectations === option.toLowerCase().replace(/\s+/g, '_')}
                          onChange={(e) => handleInputChange('met_expectations', e.target.value)}
                          className="sr-only"
                          required
                        />
                        <span className="text-sm font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="prev-btn bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  ← Previous
                </button>
                {((event?.is_team_based || event?.registration_mode === 'team') || (event?.is_paid || event?.registration_fee > 0)) ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="next-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                  >
                    Next Step →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback & Get Certificate 🎯'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Step 4: Team Events Only (Conditional) - Show when team event and not paid, OR when both team and paid */}
          {(event?.is_team_based || event?.registration_mode === 'team') && (
            <div className={`form-step ${currentActualStep === 4 ? 'block' : 'hidden'}`} id="step-4">
              <div className="mb-8 p-6 bg-purple-50 rounded-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-3 text-2xl">👥</span>
                  Step 4: Team Event Experience
                </h3>
                <p className="text-sm text-gray-600 mb-6">Tell us about the team-based aspects of this event.</p>
                
                <div className="space-y-8">
                  {/* Team Format Management */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      How well was the team format managed? *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Excellent', 'Very Good', 'Good', 'Fair', 'Poor'].map((option) => (
                        <label key={option} className="flex items-center cursor-pointer border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name="team_format_management"
                            value={option.toLowerCase().replace(' ', '_')}
                            checked={formData.team_format_management === option.toLowerCase().replace(' ', '_')}
                            onChange={(e) => handleInputChange('team_format_management', e.target.value)}
                            className="sr-only"
                            required
                          />
                          <span className="text-sm font-medium">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Rules Clarity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      How clear were the team rules and guidelines? *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Very Clear', 'Clear', 'Somewhat Clear', 'Unclear', 'Very Unclear'].map((option) => (
                        <label key={option} className="flex items-center cursor-pointer border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name="rules_clarity"
                            value={option.toLowerCase().replace(/\s+/g, '_')}
                            checked={formData.rules_clarity === option.toLowerCase().replace(/\s+/g, '_')}
                            onChange={(e) => handleInputChange('rules_clarity', e.target.value)}
                            className="sr-only"
                            required
                          />
                          <span className="text-sm font-medium">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="prev-btn bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                  >
                    ← Previous
                  </button>
                  {(event?.is_paid || event?.registration_fee > 0) ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="next-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                    >
                      Next Step →
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Feedback & Get Certificate 🎯'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Paid Events Only (Conditional) - Show when paid event */}
          {(event?.is_paid || event?.registration_fee > 0) && (
            <div className={`form-step ${currentActualStep === 5 ? 'block' : 'hidden'}`} id="step-5">
              <div className="mb-8 p-6 bg-orange-50 rounded-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-3 text-2xl">💰</span>
                  Step 5: Payment & Value
                </h3>
                <p className="text-sm text-gray-600 mb-6">Help us understand the value and payment experience.</p>
                
                <div className="space-y-8">
                  {/* Value for Money */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      How would you rate the value for money? *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Excellent Value', 'Good Value', 'Fair Value', 'Poor Value', 'Very Poor Value'].map((option) => (
                        <label key={option} className="flex items-center cursor-pointer border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name="value_for_money"
                            value={option.toLowerCase().replace(/\s+/g, '_')}
                            checked={formData.value_for_money === option.toLowerCase().replace(/\s+/g, '_')}
                            onChange={(e) => handleInputChange('value_for_money', e.target.value)}
                            className="sr-only"
                            required
                          />
                          <span className="text-sm font-medium">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Payment Process */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      How was the payment process? *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Very Easy', 'Easy', 'Neutral', 'Difficult', 'Very Difficult'].map((option) => (
                        <label key={option} className="flex items-center cursor-pointer border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name="payment_process"
                            value={option.toLowerCase().replace(/\s+/g, '_')}
                            checked={formData.payment_process === option.toLowerCase().replace(/\s+/g, '_')}
                            onChange={(e) => handleInputChange('payment_process', e.target.value)}
                            className="sr-only"
                            required
                          />
                          <span className="text-sm font-medium">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="prev-btn bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                  >
                    ← Previous
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback & Get Certificate 🎯'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </ClientLayout>
  );
};

export default FeedbackForm;
