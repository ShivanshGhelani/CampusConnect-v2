import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { 
  ArrowLeft, 
  Settings, 
  FileText, 
  Users, 
  BarChart3, 
  Download, 
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  MessageSquare
} from 'lucide-react';

function Feedbacks() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [event, setEvent] = useState(null);
  const [feedbackData, setFeedbackData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (eventId) {
      fetchEventAndFeedbackData();
    }
  }, [eventId]);

  const fetchEventAndFeedbackData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // TODO: Replace with actual API calls
      // Simulated data for now
      const mockEvent = {
        event_id: eventId,
        event_name: 'Sample Event Name',
        status: 'completed',
        feedback_enabled: true,
        feedback_setup_completed: true
      };
      
      const mockFeedbackData = {
        total_responses: 87,
        response_rate: 65.4, // percentage
        average_rating: 4.2,
        feedback_questions: [
          {
            id: 1,
            question_text: 'How would you rate the overall event?',
            question_type: 'rating',
            responses_count: 87,
            average_rating: 4.2
          },
          {
            id: 2,
            question_text: 'What did you like most about the event?',
            question_type: 'text',
            responses_count: 73
          }
        ],
        recent_responses: [
          {
            id: 1,
            participant_name: 'John Doe',
            submitted_at: '2024-12-15T10:30:00Z',
            overall_rating: 5
          },
          {
            id: 2,
            participant_name: 'Jane Smith',
            submitted_at: '2024-12-15T09:15:00Z',
            overall_rating: 4
          }
        ]
      };
      
      setEvent(mockEvent);
      setFeedbackData(mockFeedbackData);
    } catch (error) {
      setError('Failed to load feedback data');
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const ActionButton = ({ onClick, variant = 'secondary', icon: Icon, children, disabled = false, className = "" }) => {
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
      secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300',
      success: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
      warning: 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600',
      danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600'
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          inline-flex items-center px-4 py-2 border rounded-lg font-medium text-sm
          transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variants[variant]} ${className}
        `}
      >
        {Icon && <Icon className={`w-4 h-4 ${children ? 'mr-2' : ''}`} />}
        {children}
      </button>
    );
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, variant = 'default' }) => {
    const variants = {
      default: 'border-gray-200',
      success: 'border-green-200 bg-green-50',
      warning: 'border-amber-200 bg-amber-50',
      info: 'border-blue-200 bg-blue-50'
    };

    return (
      <div className={`bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow ${variants[variant]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Icon className="w-6 h-6 text-gray-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-16 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
          <div className="w-20 h-20 bg-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-red-700 mb-3">Error Loading Feedback Data</h3>
          <p className="text-red-600 mb-6 max-w-md mx-auto">{error}</p>
          <div className="space-x-3">
            <ActionButton onClick={fetchEventAndFeedbackData} variant="danger">
              Try Again
            </ActionButton>
            <ActionButton onClick={() => navigate(`/admin/events/${eventId}`)} variant="secondary">
              Back to Event Details
            </ActionButton>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout>
        <div className="text-center py-16">
          <h3 className="text-lg font-medium text-gray-900">Event not found</h3>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Feedback Management - Event Management">
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4">
          
          {/* Header */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigate(`/admin/events/${eventId}`)}
                className="inline-flex items-center text-gray-600 hover:text-blue-600 transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Event Details
              </button>

              <div className="flex items-center gap-3">
                {event.feedback_setup_completed ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Setup Complete
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                    <Clock className="w-4 h-4 mr-1" />
                    Setup Pending
                  </span>
                )}
              </div>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-blue-50 mb-4">
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Feedback Management</h1>
              <p className="text-gray-600">{event.event_name} • Manage and analyze event feedback</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <ActionButton
                onClick={() => navigate(`/admin/events/${eventId}/feedback/setup`)}
                variant="primary"
                icon={Settings}
              >
                Setup Feedback
              </ActionButton>

              {event.feedback_setup_completed && (
                <>
                  <ActionButton
                    onClick={() => {
                      // TODO: Implement view form functionality
                      console.log('View form clicked');
                    }}
                    variant="secondary"
                    icon={Eye}
                  >
                    Preview Form
                  </ActionButton>

                  <ActionButton
                    onClick={() => {
                      // TODO: Implement export functionality
                      console.log('Export responses clicked');
                    }}
                    variant="success"
                    icon={Download}
                  >
                    Export Responses
                  </ActionButton>
                </>
              )}
            </div>
          </div>

          {/* Feedback Setup Status */}
          {!event.feedback_setup_completed ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-medium text-amber-800 mb-2">Feedback Setup Required</h3>
                  <p className="text-amber-700 mb-4">
                    Configure your feedback form before participants can submit their responses. 
                    Set up questions, question types, and validation rules to collect meaningful feedback.
                  </p>
                  <ActionButton
                    onClick={() => navigate(`/admin/events/${eventId}/feedback/setup`)}
                    variant="warning"
                    icon={Settings}
                  >
                    Setup Feedback Now
                  </ActionButton>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Statistics Cards */}
              {feedbackData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <StatCard
                    icon={Users}
                    title="Total Responses"
                    value={feedbackData.total_responses}
                    subtitle="Feedback submissions"
                    variant="info"
                  />
                  <StatCard
                    icon={BarChart3}
                    title="Response Rate"
                    value={`${feedbackData.response_rate}%`}
                    subtitle="Of total participants"
                    variant={feedbackData.response_rate > 50 ? "success" : "warning"}
                  />
                  <StatCard
                    icon={Star}
                    title="Average Rating"
                    value={feedbackData.average_rating}
                    subtitle="Out of 5 stars"
                    variant={feedbackData.average_rating >= 4 ? "success" : "warning"}
                  />
                  <StatCard
                    icon={FileText}
                    title="Questions"
                    value={feedbackData.feedback_questions?.length || 0}
                    subtitle="Configured questions"
                    variant="default"
                  />
                </div>
              )}

              {/* Feedback Questions Overview */}
              {feedbackData?.feedback_questions && feedbackData.feedback_questions.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Feedback Questions</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Overview of configured questions and response statistics
                      </p>
                    </div>
                    <ActionButton
                      onClick={() => navigate(`/admin/events/${eventId}/feedback/setup`)}
                      variant="secondary"
                      icon={Settings}
                    >
                      Manage Questions
                    </ActionButton>
                  </div>

                  <div className="space-y-4">
                    {feedbackData.feedback_questions.map((question, index) => (
                      <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                                {index + 1}
                              </span>
                              <span className="text-sm font-medium text-blue-600 capitalize">
                                {question.question_type.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-gray-900 font-medium mb-2">{question.question_text}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{question.responses_count} responses</span>
                              {question.question_type === 'rating' && question.average_rating && (
                                <span className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                  {question.average_rating} avg
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Responses */}
              {feedbackData?.recent_responses && feedbackData.recent_responses.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Recent Responses</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Latest feedback submissions from participants
                      </p>
                    </div>
                    <ActionButton
                      onClick={() => {
                        // TODO: Implement view all responses
                        console.log('View all responses clicked');
                      }}
                      variant="secondary"
                      icon={Eye}
                    >
                      View All
                    </ActionButton>
                  </div>

                  <div className="space-y-3">
                    {feedbackData.recent_responses.map((response) => (
                      <div key={response.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{response.participant_name}</h4>
                            <p className="text-sm text-gray-600">{formatDateTime(response.submitted_at)}</p>
                          </div>
                          {response.overall_rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-sm font-medium text-gray-900">{response.overall_rating}/5</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </AdminLayout>
  );
}

export default Feedbacks;
