import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { adminAPI } from '../../api/admin';
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
  MessageSquare,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';

function Feedbacks() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [event, setEvent] = useState(null);
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
      
      // Fetch event details
      const eventResponse = await adminAPI.getEvent(eventId);
      const eventData = eventResponse.data;
      
      let feedbackForm = null;
      let feedbackAnalytics = null;
      let feedbackResponses = null;
      
      try {
        // Try to fetch feedback form
        const formResponse = await adminAPI.getFeedbackForm(eventId);
        if (formResponse.data.success) {
          feedbackForm = formResponse.data.feedback_form;
          
          // Fetch analytics and responses if form exists
          const [analyticsResponse, responsesResponse] = await Promise.all([
            adminAPI.getFeedbackAnalytics(eventId),
            adminAPI.getFeedbackResponses(eventId, { page: 1, limit: 10 })
          ]);
          
          if (analyticsResponse.data.success) {
            feedbackAnalytics = analyticsResponse.data;
          }
          
          if (responsesResponse.data.success) {
            feedbackResponses = responsesResponse.data;
          }
        }
      } catch (feedbackError) {
        
      }
      
      setEvent({
        ...eventData,
        feedback_form: feedbackForm,
        feedback_analytics: feedbackAnalytics,
        feedback_responses: feedbackResponses
      });
      
    } catch (error) {
      setError('Failed to load event and feedback data');
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFeedbackForm = () => {
    navigate(`/admin/events/${eventId}/feedback/setup`);
  };

  const handleEditFeedbackForm = () => {
    navigate(`/admin/events/${eventId}/feedback/setup`);
  };

  const handleDeleteFeedbackForm = async () => {
    if (!confirm('Are you sure you want to delete the feedback form? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await adminAPI.deleteFeedbackForm(eventId);
      if (response.data.success) {
        alert('Feedback form deleted successfully');
        fetchEventAndFeedbackData(); // Refresh data
      } else {
        throw new Error(response.data.message || 'Failed to delete feedback form');
      }
    } catch (error) {
      
      alert(`Failed to delete feedback form: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleViewResponses = () => {
    // Could navigate to a detailed responses page or show modal
    navigate(`/admin/events/${eventId}/feedback/responses`);
  };

  const handleExportData = async () => {
    try {
      // This could be implemented as a CSV/Excel export
      alert('Export functionality will be implemented here');
    } catch (error) {
      
      alert('Failed to export data');
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
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
          {Icon && (
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Icon className="w-6 h-6 text-gray-600" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const formatDateTime = (dateTimeString) => {
    try {
      return new Date(dateTimeString).toLocaleString('en-US', {
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
                {event.feedback_form ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Form Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                    <Clock className="w-4 h-4 mr-1" />
                    No Form
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
              {!event.feedback_form ? (
                <ActionButton
                  onClick={handleCreateFeedbackForm}
                  variant="primary"
                  icon={Plus}
                >
                  Create Feedback Form
                </ActionButton>
              ) : (
                <>
                  <ActionButton
                    onClick={handleEditFeedbackForm}
                    variant="secondary"
                    icon={Edit}
                  >
                    Edit Form
                  </ActionButton>
                  
                  <ActionButton
                    onClick={handleViewResponses}
                    variant="primary"
                    icon={Eye}
                  >
                    View Responses
                  </ActionButton>
                  
                  <ActionButton
                    onClick={handleExportData}
                    variant="secondary"
                    icon={Download}
                  >
                    Export Data
                  </ActionButton>
                  
                  <ActionButton
                    onClick={handleDeleteFeedbackForm}
                    variant="danger"
                    icon={Trash2}
                  >
                    Delete Form
                  </ActionButton>
                </>
              )}
            </div>
          </div>

          {/* Feedback Stats */}
          {event.feedback_analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <StatCard
                icon={Users}
                title="Total Responses"
                value={event.feedback_analytics.summary.total_responses}
                subtitle={`${event.feedback_analytics.summary.response_rate}% response rate`}
                variant="info"
              />
              
              <StatCard
                icon={Users}
                title="Total Registrations"
                value={event.feedback_analytics.summary.total_registrations}
                subtitle="Registered participants"
                variant="default"
              />
              
              {event.feedback_analytics.element_analytics && Object.keys(event.feedback_analytics.element_analytics).length > 0 && (
                <>
                  {Object.entries(event.feedback_analytics.element_analytics).map(([elementId, analytics]) => {
                    if (analytics.type === 'rating' && analytics.average) {
                      return (
                        <StatCard
                          key={elementId}
                          icon={Star}
                          title={analytics.label}
                          value={`${analytics.average.toFixed(1)}/5`}
                          subtitle={`${analytics.count} responses`}
                          variant="success"
                        />
                      );
                    }
                    return null;
                  })}
                </>
              )}
            </div>
          )}

          {/* No Feedback Form Message */}
          {!event.feedback_form && (
            <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-3">No Feedback Form Setup</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Create a feedback form to collect valuable insights from event participants.
              </p>
              <ActionButton onClick={handleCreateFeedbackForm} variant="primary" icon={Plus}>
                Create Feedback Form
              </ActionButton>
            </div>
          )}

          {/* Recent Responses */}
          {event.feedback_responses && event.feedback_responses.responses.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Responses</h2>
                <ActionButton onClick={handleViewResponses} variant="secondary" icon={Eye}>
                  View All
                </ActionButton>
              </div>
              
              <div className="space-y-4">
                {event.feedback_responses.responses.slice(0, 5).map((response, index) => (
                  <div key={response.feedback_id || index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {response.student_info.name || 'Anonymous'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {response.student_info.enrollment_no}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {formatDateTime(response.submitted_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </AdminLayout>
  );
}

export default Feedbacks;
