import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  MapPin
} from 'lucide-react';
import { clientAPI } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const FeedbackForm = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State management
  const [feedbackForm, setFeedbackForm] = useState(null);
  const [event, setEvent] = useState(null);
  const [responses, setResponses] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [eligibility, setEligibility] = useState(null);

  useEffect(() => {
    loadFeedbackForm();
    checkEligibility();
  }, [eventId]);

  const loadFeedbackForm = async () => {
    try {
      setIsLoading(true);
      const response = await clientAPI.getFeedbackForm(eventId);
      
      if (response.data.success) {
        setFeedbackForm(response.data.feedback_form);
        setEvent(response.data.event);
        
        // Initialize responses object
        const initialResponses = {};
        response.data.feedback_form.elements.forEach(element => {
          if (element.type === 'checkbox') {
            initialResponses[element.id] = [];
          } else {
            initialResponses[element.id] = '';
          }
        });
        setResponses(initialResponses);
      }
    } catch (error) {
      
      setError(error.response?.data?.detail || 'Failed to load feedback form');
    } finally {
      setIsLoading(false);
    }
  };

  const checkEligibility = async () => {
    try {
      const response = await clientAPI.checkFeedbackEligibility(eventId);
      console.log('Eligibility Check:', response.data);
      setEligibility(response.data);
    } catch (error) {
      console.error('Eligibility Error:', error.response?.data);
      setEligibility({ 
        eligible: false, 
        reason: 'error',
        message: 'Unable to check eligibility' 
      });
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
      
      const response = await clientAPI.submitEventFeedback(eventId, responses);
      
      if (response.data.success) {
        // Navigate to the feedback success page
        navigate(`/client/events/${eventId}/feedback/success`);
      } else {
        throw new Error(response.data.message || 'Failed to submit feedback');
      }
    } catch (error) {
      
      alert(`Failed to submit feedback: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormElement = (element) => {
    const { id, type, label, required, props = {} } = element;
    const value = responses[id] || '';

    switch (type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleResponseChange(id, e.target.value)}
            placeholder={props.placeholder || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleResponseChange(id, e.target.value)}
            placeholder={props.placeholder || ''}
            rows={props.rows || 4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
            required={required}
          />
        );

      case 'rating':
        const maxRating = props.max || 5;
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
        return (
          <select
            value={value}
            onChange={(e) => handleResponseChange(id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={required}
          >
            <option value="">Select an option...</option>
            {(props.options || []).map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {(props.options || []).map((option, index) => (
              <label key={index} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name={id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleResponseChange(id, e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                  required={required}
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        const selectedOptions = responses[id] || [];
        return (
          <div className="space-y-2">
            {(props.options || []).map((option, index) => (
              <label key={index} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedOptions.includes(option)}
                  onChange={(e) => handleCheckboxChange(id, option, e.target.checked)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleResponseChange(id, e.target.value)}
            min={props.min}
            max={props.max}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={required}
          />
        );

      case 'date':
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader className="w-5 h-5 animate-spin" />
          <span>Loading feedback form...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="flex items-center space-x-2 text-red-600 mb-4">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => navigate('/client/dashboard')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (eligibility && !eligibility.eligible) {
    const getTitle = () => {
      if (eligibility.reason === 'already_submitted') return 'Already Submitted';
      if (eligibility.reason === 'not_registered') return 'Not Registered';
      return 'Not Eligible';
    };

    const getIcon = () => {
      if (eligibility.reason === 'already_submitted') return <CheckCircle className="w-5 h-5" />;
      return <AlertCircle className="w-5 h-5" />;
    };

    const getColor = () => {
      if (eligibility.reason === 'already_submitted') return 'text-green-600';
      return 'text-amber-600';
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className={`flex items-center space-x-2 ${getColor()} mb-4`}>
            {getIcon()}
            <span className="font-medium">{getTitle()}</span>
          </div>
          <p className="text-gray-700 mb-4">{eligibility.message}</p>
          <button
            onClick={() => navigate('/client/dashboard')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!feedbackForm || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No feedback form available for this event.</p>
        </div>
      </div>
    );
  }

  // Check if feedback collection period has ended for non-certificate events
  if (event && !event.is_certificate_based && event.feedback_end_date) {
    const now = new Date();
    const feedbackEndDate = new Date(event.feedback_end_date);
    
    if (now > feedbackEndDate) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <div className="flex items-center space-x-2 text-amber-600 mb-4">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Feedback Period Ended</span>
            </div>
            <p className="text-gray-700 mb-4">
              The feedback collection period for this event ended on{' '}
              {feedbackEndDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
            </p>
            <button
              onClick={() => navigate('/client/dashboard')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => navigate('/client/dashboard')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>
          
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
          </div>

          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/client/dashboard')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !validateForm()}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackForm;
