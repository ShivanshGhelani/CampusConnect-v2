import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import FeedbackResponseCard from '../../components/admin/FeedbackResponseCard';
import { adminAPI } from '../../api/admin';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const location = useLocation();
  const { user } = useAuth();
  
  // Get data passed from EventDetail via navigation state
  const passedData = location.state;
  const registrationsCountFromProps = passedData?.registrations_count || 0;
  
  // State management
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allResponses, setAllResponses] = useState([]);
  const [hasMoreResponses, setHasMoreResponses] = useState(true);

  const RESPONSES_PER_PAGE = 20;

  useEffect(() => {
    if (eventId) {
      fetchEventAndFeedbackData();
    }
  }, [eventId]);

  const fetchEventAndFeedbackData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Start with event data (use passed data if available)
      let eventData;
      if (passedData?.event_data) {
        eventData = passedData.event_data;
      } else {
        const eventResponse = await adminAPI.getEvent(eventId);
        eventData = eventResponse.data;
      }
      
      let feedbackForm = null;
      let feedbackAnalytics = null;
      let feedbackResponses = null;
      let eventStats = null;
      
      try {
        // Try to fetch feedback form and event stats
        const [formResponse, statsResponse] = await Promise.all([
          adminAPI.getFeedbackForm(eventId),
          adminAPI.getEventStats(eventId)
        ]);
        
        if (statsResponse.data) {
          eventStats = statsResponse.data;
        }
        
        if (formResponse.data.success) {
          feedbackForm = formResponse.data.feedback_form;
          
          // Fetch analytics and initial responses if form exists
          const [analyticsResponse, responsesResponse] = await Promise.all([
            adminAPI.getFeedbackAnalytics(eventId),
            adminAPI.getFeedbackResponses(eventId, { page: 1, limit: RESPONSES_PER_PAGE })
          ]);
          
          if (analyticsResponse.data.success) {
            feedbackAnalytics = analyticsResponse.data;
          }
          
          if (responsesResponse.data.success) {
            feedbackResponses = responsesResponse.data;
            setAllResponses(responsesResponse.data.responses || []);
            setHasMoreResponses((responsesResponse.data.responses || []).length === RESPONSES_PER_PAGE);
            setCurrentPage(1);
          }
        }
      } catch (feedbackError) {
        console.error('Error fetching feedback data:', feedbackError);
      }
      
      setEvent({
        ...eventData,
        event_stats: eventStats || passedData?.event_stats || {},
        attendance_stats: passedData?.attendance_stats || null,
        registrations_count: registrationsCountFromProps,
        feedback_form: feedbackForm,
        feedback_analytics: feedbackAnalytics,
        feedback_responses: feedbackResponses
      });
      
    } catch (error) {
      setError('Failed to load event and feedback data');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreResponses = async () => {
    if (isLoadingMore || !hasMoreResponses) return;

    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      
      const responsesResponse = await adminAPI.getFeedbackResponses(eventId, { 
        page: nextPage, 
        limit: RESPONSES_PER_PAGE 
      });
      
      if (responsesResponse.data.success) {
        const newResponses = responsesResponse.data.responses || [];
        setAllResponses(prev => [...prev, ...newResponses]);
        setCurrentPage(nextPage);
        setHasMoreResponses(newResponses.length === RESPONSES_PER_PAGE);
        
        // Update event state with new total count
        setEvent(prev => ({
          ...prev,
          feedback_responses: {
            ...prev.feedback_responses,
            responses: [...allResponses, ...newResponses],
            total_responses: responsesResponse.data.total_responses || prev.feedback_responses?.total_responses
          }
        }));
      }
    } catch (error) {
      console.error('Error loading more responses:', error);
    } finally {
      setIsLoadingMore(false);
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

  const handleExportData = async () => {
    try {
      if (!event || !event.feedback_form || allResponses.length === 0) {
        alert('No feedback data available to export');
        return;
      }

      // Fetch HTML template
      const templateResponse = await fetch('/templates/feedback_report.html');
      let htmlTemplate = await templateResponse.text();
      
      // Replace placeholders with actual data
      htmlTemplate = populateTemplate(htmlTemplate);
      
      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlTemplate);
      printWindow.document.close();
      
      // Wait for content to load then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export feedback data. Please try again.');
    }
  };

  const populateTemplate = (template) => {
    const genDate = new Date().toLocaleDateString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    const responseRate = event.feedback_analytics?.summary?.response_rate || 
                        (event.registrations_count > 0 ? Math.round((allResponses.length / event.registrations_count) * 100) : 0);
    
    const startDate = event.start_datetime ? new Date(event.start_datetime).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) : 'N/A';
    
    const endDate = event.end_datetime ? new Date(event.end_datetime).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) : 'N/A';

    // Format organizer details
    let organizerInfo = 'N/A';
    if (event.organizer_details && event.organizer_details.length > 0) {
      organizerInfo = event.organizer_details
        .map(org => `${org.full_name || org.name || 'Unknown'}, ${org.department || 'N/A'}`)
        .join(' | ');
    } else if (event.contacts && event.contacts.length > 0) {
      organizerInfo = event.contacts[0].name;
    }

    // Generate ratings HTML
    let ratingsHTML = '';
    if (event.feedback_analytics?.element_analytics) {
      Object.entries(event.feedback_analytics.element_analytics).forEach(([elementId, analytics]) => {
        if (analytics.type === 'rating' && analytics.average && typeof analytics.average === 'number') {
          const rating = Math.round(analytics.average);
          const filledStars = '★'.repeat(rating);
          const emptyStars = '☆'.repeat(5 - rating);
          ratingsHTML += `
            <div class="rating-row">
              <span class="rating-label">${analytics.label || 'Rating'}</span>
              <span class="rating-stars">${filledStars}${emptyStars}</span>
              <span class="rating-value">${analytics.average.toFixed(1)}/5</span>
            </div>
          `;
        }
      });
    }
    
    if (!ratingsHTML) {
      ratingsHTML = '<p style="padding: 10px; color: #666;">No rating data available</p>';
    }

    // Generate table rows
    let tableRows = '';
    allResponses.forEach((response, index) => {
      const rating = event.feedback_form?.elements?.find(el => el.type === 'rating' || el.type === 'star_rating');
      const ratingValue = rating ? (response.responses?.[rating.id] || 'N/A') : 'N/A';
      const enrollmentId = response.student_enrollment || response.employee_id || 'N/A';
      const submitTime = new Date(response.submitted_at).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      tableRows += `
        <tr>
          <td>${index + 1}</td>
          <td>${enrollmentId}</td>
          <td>${response.registration_id || 'N/A'}</td>
          <td>${response.student_info?.name || response.faculty_info?.name || 'Anonymous'}</td>
          <td>${response.student_info?.department || response.faculty_info?.department || 'N/A'}</td>
          <td>${submitTime}</td>
          <td>${ratingValue !== 'N/A' ? `${ratingValue}/5` : 'N/A'}</td>
        </tr>
      `;
    });

    // Generate detailed responses
    let detailedResponses = '';
    allResponses.forEach((response, index) => {
      const enrollmentId = response.student_enrollment || response.employee_id || 'N/A';
      const respondent = response.student_info?.name || response.faculty_info?.name || 'Anonymous';
      const submitTime = new Date(response.submitted_at).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      let qaHTML = '';
      if (event.feedback_form?.elements && response.responses) {
        event.feedback_form.elements.forEach(element => {
          const value = response.responses[element.id];
          if (value !== null && value !== undefined && value !== '') {
            let displayValue = value;
            if (element.type === 'rating' || element.type === 'star_rating') {
              const filledStars = '★'.repeat(parseInt(value));
              const emptyStars = '☆'.repeat(5 - parseInt(value));
              displayValue = `${value}/5 <span class="stars">${filledStars}${emptyStars}</span>`;
            } else if (Array.isArray(value)) {
              displayValue = value.join(', ');
            } else {
              displayValue = String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }
            qaHTML += `
              <tr>
                <td class="question">${element.label || element.id}</td>
                <td class="answer">${displayValue}</td>
              </tr>
            `;
          }
        });
      }

      detailedResponses += `
        <div class="response-card">
          <div class="response-header">
            <span class="response-name">#${index + 1} - ${respondent}</span>
            <div class="response-meta">ID: ${enrollmentId} | Reg: ${response.registration_id || 'N/A'}<br>${submitTime}</div>
          </div>
          <table class="response-table">
            ${qaHTML}
          </table>
        </div>
      `;
    });

    // Replace template placeholders
    return template
      .replace(/{{DOCUMENT_TITLE}}/g, `Feedback Report - ${event.event_name}`)
      .replace(/{{LOGO_URL}}/g, '/logo/ksv.png')
      .replace(/{{EVENT_ID}}/g, eventId)
      .replace(/{{EVENT_NAME}}/g, event.event_name)
      .replace(/{{GENERATION_DATE}}/g, genDate)
      .replace(/{{START_DATE}}/g, startDate)
      .replace(/{{END_DATE}}/g, endDate)
      .replace(/{{VENUE}}/g, event.venue || 'N/A')
      .replace(/{{SHORT_DESCRIPTION}}/g, event.short_description || 'N/A')
      .replace(/{{ORGANIZER}}/g, organizerInfo)
      .replace(/{{DEPARTMENT_CLUB}}/g, event.organizing_department || 'N/A')
      .replace(/{{TOTAL_REGISTRATIONS}}/g, event.registrations_count || 0)
      .replace(/{{ATTENDANCE_COUNT}}/g, 
        event.attendance_stats?.present_count + (event.attendance_stats?.partial_count || 0) || 
        event.event_stats?.stats?.attendance_count || 
        0)
      .replace(/{{TOTAL_RESPONSES}}/g, allResponses.length)
      .replace(/{{RESPONSE_RATE}}/g, responseRate)
      .replace(/{{RATINGS_HTML}}/g, ratingsHTML)
      .replace(/{{TABLE_ROWS}}/g, tableRows)
      .replace(/{{DETAILED_RESPONSES}}/g, detailedResponses)
      .replace(/{{CURRENT_YEAR}}/g, new Date().getFullYear());
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
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 max-w-6xl mx-auto">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl gap-6 mb-6 justify-between items-center mx-auto ">
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
                value={event.registrations_count || 0}
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
            <div className="text-center py-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl border border-blue-100 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-10 left-10">
                  <MessageSquare className="w-16 h-16" />
                </div>
                <div className="absolute top-20 right-16">
                  <Star className="w-12 h-12" />
                </div>
                <div className="absolute bottom-16 left-20">
                  <BarChart3 className="w-14 h-14" />
                </div>
                <div className="absolute bottom-10 right-10">
                  <Users className="w-18 h-18" />
                </div>
              </div>
              
              <div className="relative z-10">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <MessageSquare className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Start Collecting Feedback</h3>
                <p className="text-gray-600 mb-8 max-w-lg mx-auto leading-relaxed">
                  Create a customized feedback form to gather valuable insights, ratings, and suggestions from your event participants. Build better events with data-driven decisions.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <ActionButton 
                    onClick={handleCreateFeedbackForm} 
                    variant="primary" 
                    icon={Plus}
                    className="px-8 py-3 text-base font-semibold shadow-lg"
                  >
                    Create Feedback Form
                  </ActionButton>
                  
                  <ActionButton 
                    onClick={() => navigate(`/admin/events/${eventId}/feedback/templates`)} 
                    variant="secondary" 
                    icon={FileText}
                    className="px-8 py-3 text-base"
                  >
                    Use Template
                  </ActionButton>
                </div>
                
                <div className="mt-8 flex flex-wrap justify-center gap-8 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    <span>Rating Questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>Text Responses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    <span>Multiple Choice</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>Live Analytics</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Responses Yet Message */}
          {event.feedback_form && allResponses.length === 0 && (
            <div className="text-center py-16 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 rounded-xl border border-amber-100 relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-amber-800 mb-3">Waiting for Responses</h3>
                <p className="text-amber-700 mb-6 max-w-md mx-auto">
                  Your feedback form is active and ready. Share the event link with participants to start collecting responses.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <ActionButton 
                    onClick={() => navigator.clipboard.writeText(window.location.origin + `/client/events/${eventId}`)} 
                    variant="warning" 
                    icon={Eye}
                    className="px-6 py-2"
                  >
                    Copy Event Link
                  </ActionButton>
                  
                  <ActionButton 
                    onClick={handleEditFeedbackForm} 
                    variant="secondary" 
                    icon={Edit}
                    className="px-6 py-2"
                  >
                    Edit Form
                  </ActionButton>
                </div>
              </div>
            </div>
          )}

          {/* Recent Responses */}
          {allResponses.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-t-xl p-6 max-w-6xl mx-auto ">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Recent Responses 
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({allResponses.length}{event.feedback_responses?.total_responses ? ` of ${event.feedback_responses.total_responses}` : ''})
                  </span>
                </h2>
              </div>
              
              {/* 3-Column Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {allResponses.map((response, index) => (
                  <FeedbackResponseCard
                    key={response.feedback_id || index}
                    response={response}
                    feedbackForm={event.feedback_form}
                    showStudentInfo={true}
                    className="hover:shadow-lg transition-shadow duration-200"
                  />
                ))}
              </div>
              
              {/* Load More Button */}
              {hasMoreResponses && (
                <div className="flex justify-center mt-8 pt-6 border-t border-gray-100">
                  <ActionButton 
                    onClick={loadMoreResponses}
                    variant="secondary"
                    disabled={isLoadingMore}
                    className="px-8 py-3 text-base"
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        Load More Responses
                        {event.feedback_responses?.total_responses && (
                          <span className="ml-2 text-sm opacity-75">
                            ({event.feedback_responses.total_responses - allResponses.length} remaining)
                          </span>
                        )}
                      </>
                    )}
                  </ActionButton>
                </div>
              )}
              
              {/* End of Results Message */}
              {!hasMoreResponses && allResponses.length >= RESPONSES_PER_PAGE && (
                <div className="text-center mt-8 pt-6 border-t border-gray-100">
                  <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    All responses loaded ({allResponses.length} total)
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </AdminLayout>
  );
}

export default Feedbacks;
