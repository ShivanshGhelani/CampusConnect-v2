import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Send, 
  Star, 
  CheckSquare, 
  Circle, 
  Loader,
  AlertCircle,
  CheckCircle,
  Calendar,
  MapPin,
  TestTube,
  RefreshCw,
  Play
} from 'lucide-react';
import { clientAPI } from '../../api/client';
import api from '../../api/base';

const FeedbackPreviewClient = () => {
  // Test configuration
  const TEST_ENROLLMENT = '22beit3004111';
  const TEST_REGISTRATION_ID = `reg_test_${Date.now()}`;
  
  // State management
  const [eventId, setEventId] = useState('');
  const [feedbackForm, setFeedbackForm] = useState(null);
  const [event, setEvent] = useState(null);
  const [responses, setResponses] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submissionCount, setSubmissionCount] = useState(0);

  const loadFeedbackForm = async () => {
    if (!eventId.trim()) {
      alert('Please enter an Event ID');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setSuccessMessage('');
      
      // Use the configured API client instead of direct fetch
      const response = await api.get(`/api/v1/client/feedback/test-form/${eventId}`);
      const data = response.data;
      
      if (data.success) {
        setFeedbackForm(data.feedback_form);
        setEvent(data.event);
        
        // Initialize responses object based on actual form elements
        const initialResponses = {};
        data.feedback_form.elements.forEach(element => {
          if (element.type === 'checkbox' || element.type === 'checkboxes') {
            initialResponses[element.id] = [];
          } else {
            initialResponses[element.id] = '';
          }
        });
        setResponses(initialResponses);
        
      } else {
        setError(data.detail || 'Failed to load feedback form');
        setFeedbackForm(null);
        setEvent(null);
      }
      
    } catch (error) {
      console.error('Error loading feedback form:', error);
      setError(`Network error: ${error.response?.data?.detail || error.message}`);
      setFeedbackForm(null);
      setEvent(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponseChange = (elementId, value) => {
    setResponses(prev => ({
      ...prev,
      [elementId]: value
    }));
  };

  const handleCheckboxChange = (elementId, option, checked) => {
    setResponses(prev => {
      const currentValues = prev[elementId] || [];
      if (checked) {
        return {
          ...prev,
          [elementId]: [...currentValues, option]
        };
      } else {
        return {
          ...prev,
          [elementId]: currentValues.filter(val => val !== option)
        };
      }
    });
  };

  const validateForm = () => {
    if (!feedbackForm) return false;

    for (const element of feedbackForm.elements) {
      if (element.required) {
        const response = responses[element.id];
        
        if (element.type === 'checkbox') {
          if (!response || response.length === 0) {
            return false;
          }
        } else {
          if (!response || response.toString().trim() === '') {
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert('Please fill out all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Add test marker to responses
      const testResponses = {
        ...responses,
        _test_submission: `Tested feedback submission #${submissionCount + 1} - ${new Date().toLocaleString()}`
      };
      
      // Prepare form data for test submission endpoint
      const formData = new FormData();
      formData.append('event_id', eventId);
      formData.append('student_enrollment', TEST_ENROLLMENT);
      formData.append('responses', JSON.stringify(testResponses));
      
      // Use the configured API client for test submission
      const response = await api.post('/api/v1/client/feedback/test-submit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const result = response.data;
      
      if (result.success) {
        setSubmissionCount(prev => prev + 1);
        setSuccessMessage(`✅ Test feedback submitted successfully! (Submission #${submissionCount + 1})`);
        
        // Open success page in new tab (use current origin for environment compatibility)
        const successUrl = `${window.location.origin}/client/events/${eventId}/feedback/success?feedback_submitted=True&test_mode=true`;
        window.open(successUrl, '_blank');
        
        // Reset form for next test
        const initialResponses = {};
        feedbackForm.elements.forEach(element => {
          if (element.type === 'checkbox') {
            initialResponses[element.id] = [];
          } else {
            initialResponses[element.id] = '';
          }
        });
        setResponses(initialResponses);
        
      } else {
        throw new Error(result.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setError(`Failed to submit feedback: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormElement = (element) => {
    const { id, type, label, required, properties = {}, props = {} } = element;
    const value = responses[id] || '';
    
    // Use properties or props for backward compatibility
    const elementProps = { ...properties, ...props };

    switch (type) {
      case 'text':
      case 'text_input':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleResponseChange(id, e.target.value)}
            placeholder={elementProps.placeholder || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={required}
          />
        );

      case 'textarea':
      case 'text_area':
        return (
          <textarea
            value={value}
            onChange={(e) => handleResponseChange(id, e.target.value)}
            placeholder={elementProps.placeholder || ''}
            rows={elementProps.rows || 4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
            required={required}
          />
        );

      case 'rating':
      case 'star_rating':
        const maxRating = elementProps.max || elementProps.max_stars || 5;
        return (
          <div className="flex gap-1">
            {[...Array(maxRating)].map((_, index) => {
              const ratingValue = index + 1;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleResponseChange(id, ratingValue)}
                  className={`text-2xl transition-colors ${
                    ratingValue <= value 
                      ? 'text-yellow-400' 
                      : 'text-gray-300 hover:text-yellow-300'
                  }`}
                >
                  <Star fill={ratingValue <= value ? 'currentColor' : 'none'} />
                </button>
              );
            })}
            {value > 0 && (
              <span className="ml-2 text-sm text-gray-600">
                {value} out of {maxRating}
              </span>
            )}
          </div>
        );

      case 'select':
      case 'dropdown':
        return (
          <select
            value={value}
            onChange={(e) => handleResponseChange(id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={required}
          >
            <option value="">Select an option...</option>
            {(elementProps.options || []).map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
      case 'radio_buttons':
        return (
          <div className="space-y-2">
            {(elementProps.options || []).map((option, index) => {
              const optionValue = typeof option === 'object' ? option.value : option;
              const optionLabel = typeof option === 'object' ? option.label : option;
              
              return (
                <label key={index} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name={id}
                    value={optionValue}
                    checked={value === optionValue}
                    onChange={(e) => handleResponseChange(id, e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                    required={required}
                  />
                  <span className="text-sm text-gray-700">{optionLabel}</span>
                </label>
              );
            })}
          </div>
        );

      case 'checkbox':
      case 'checkboxes':
        const selectedOptions = responses[id] || [];
        return (
          <div className="space-y-2">
            {(elementProps.options || []).map((option, index) => {
              const optionValue = typeof option === 'object' ? option.value : option;
              const optionLabel = typeof option === 'object' ? option.label : option;
              
              return (
                <label key={index} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(optionValue)}
                    onChange={(e) => handleCheckboxChange(id, optionValue, e.target.checked)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{optionLabel}</span>
                </label>
              );
            })}
          </div>
        );

      case 'number':
      case 'number_input':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleResponseChange(id, e.target.value)}
            min={elementProps.min}
            max={elementProps.max}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={required}
          />
        );

      case 'date':
      case 'date_input':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleResponseChange(id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={required}
          />
        );

      default:
        return <div className="text-red-500">Unsupported element type: {type}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Test Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <TestTube className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Feedback Form Test Environment</h1>
              <p className="text-purple-100">Test feedback forms without restrictions</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="font-semibold">Test Enrollment</div>
              <div className="text-purple-100">{TEST_ENROLLMENT}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="font-semibold">Submissions Made</div>
              <div className="text-purple-100">{submissionCount}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="font-semibold">Status</div>
              <div className="text-purple-100">Testing Mode</div>
            </div>
          </div>
        </div>

        {/* Event ID Input */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Play className="w-5 h-5" />
            <span>Load Feedback Form</span>
          </h2>
          
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event ID
              </label>
              <input
                type="text"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                placeholder="Enter event ID (e.g., event_123)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={loadFeedbackForm}
                disabled={isLoading}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Loading...' : 'Load Form'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-700 mt-2">{error}</p>
          </div>
        )}

        {/* Success Display */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Success</span>
            </div>
            <p className="text-green-700 mt-2">{successMessage}</p>
          </div>
        )}

        {/* Feedback Form Display */}
        {feedbackForm && event && (
          <>
            {/* Event Info Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900">{feedbackForm.title}</h1>
                <p className="text-gray-600 mt-2">{feedbackForm.description}</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h2 className="font-semibold text-blue-900 mb-2">{event.event_name}</h2>
                <div className="text-sm text-blue-700 space-y-1">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Event ID: {event.event_id}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
              <div className="space-y-6">
                {feedbackForm.elements.map((element, index) => (
                  <div key={element.id} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-900">
                      {element.label}
                      {element.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderFormElement(element)}
                  </div>
                ))}
                
                {/* Test-specific field */}
                <div className="border-t pt-6 mt-6">
                  <div className="bg-purple-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-purple-900 mb-2">
                      Test Feedback Note
                    </label>
                    <textarea
                      value={responses._test_note || ''}
                      onChange={(e) => handleResponseChange('_test_note', e.target.value)}
                      placeholder="Enter any test notes or observations..."
                      rows={3}
                      className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-vertical"
                    />
                    <p className="text-xs text-purple-600 mt-1">This field is for testing purposes only</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    // Reset form
                    const initialResponses = {};
                    feedbackForm.elements.forEach(element => {
                      if (element.type === 'checkbox') {
                        initialResponses[element.id] = [];
                      } else {
                        initialResponses[element.id] = '';
                      }
                    });
                    setResponses(initialResponses);
                    setSuccessMessage('');
                    setError('');
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Reset Form
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Test Feedback'}</span>
                </button>
              </div>
            </form>
          </>
        )}

        {/* No Form Loaded */}
        {!feedbackForm && !isLoading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <TestTube className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Feedback Form Loaded</h3>
            <p className="text-gray-600 mb-6">Enter an Event ID above to load and test a feedback form</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default FeedbackPreviewClient;
