import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clientAPI } from '../../api/axios';
import ClientLayout from '../../components/client/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';

function EventDetail() {
  const { eventId } = useParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [registrationStatus, setRegistrationStatus] = useState(null);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await clientAPI.getEventDetails(eventId);      if (response.data.success) {
        setEvent(response.data.event);
        // Check registration status if user is authenticated
        if (isAuthenticated) {
          // This would be an API call to check if user is registered
          // setRegistrationStatus(response.data.registrationStatus);
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
  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const day = date.getDate();
    const suffix = day % 10 === 1 && day !== 11 ? 'st' : 
                   day % 10 === 2 && day !== 12 ? 'nd' : 
                   day % 10 === 3 && day !== 13 ? 'rd' : 'th';
    
    return {
      full: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      short: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      dayWithSuffix: `${day}${suffix} ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    };
  };
  const getStatusInfo = () => {
    if (!event) return { bgClass: 'bg-gray-50', textClass: 'text-gray-600', label: 'EVENT', iconPath: 'M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z' };
    
    const status = event.sub_status || event.status;
    
    switch(status) {
      case 'registration_not_started':
        return {
          bgClass: 'bg-gradient-to-r from-yellow-500 to-orange-500',
          textClass: 'text-white',
          label: 'Registration Opening Soon',
          animate: 'animate-pulse',
          iconPath: 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z'
        };
      case 'registration_open':
        return {
          bgClass: 'bg-gradient-to-r from-green-500 to-emerald-500',
          textClass: 'text-white',
          label: 'Registration Open',
          animate: 'animate-pulse',
          iconPath: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
        };
      case 'registration_closed':
        return {
          bgClass: 'bg-gradient-to-r from-red-500 to-pink-500',
          textClass: 'text-white',
          label: 'Registration Closed',
          iconPath: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
        };
      case 'event_started':
      case 'ongoing':
        return {
          bgClass: 'bg-gradient-to-r from-orange-500 to-red-500',
          textClass: 'text-white',
          label: 'Live Event',
          animate: 'animate-bounce',
          iconPath: 'M10 18a8 8 0 100-16 8 8 0 000 16zm.293-13.707a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L12.586 9H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z'
        };
      case 'certificate_available':
      case 'completed':
        return {
          bgClass: 'bg-gradient-to-r from-purple-500 to-indigo-500',
          textClass: 'text-white',
          label: 'Certificate Ready',
          iconPath: 'M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
        };
      default:
        return {
          bgClass: 'bg-gradient-to-r from-blue-500 to-indigo-500',
          textClass: 'text-white',
          label: 'Event',
          iconPath: 'M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z'
        };
    }
  };
  // Calculate time remaining until a specific date
  const getTimeRemaining = (targetDate) => {
    if (!targetDate) return null;
    
    const now = new Date();
    const target = new Date(targetDate);
    const diff = target - now;
    
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const handleRegister = () => {
    if (!isAuthenticated) {
      navigate(`/auth/login?returnTo=/client/events/${eventId}`);
      return;
    }
    
    // Determine if it's faculty or student based on user context
    const userType = user?.role || user?.userType || 'student'; // Adjust based on your auth structure
    const isTeamEvent = event?.event_type === 'team' || event?.registration_type === 'team';
    
    if (userType === 'faculty') {
      // Faculty registration routes
      if (isTeamEvent) {
        navigate(`/faculty/events/${eventId}/register-team`);
      } else {
        navigate(`/faculty/events/${eventId}/register`);
      }
    } else {
      // Student registration routes (dev for now, will be moved to proper routes)
      if (isTeamEvent) {
        navigate(`/dev/event-registration-team?eventId=${eventId}`);
      } else {
        navigate(`/dev/event-registration?eventId=${eventId}`);
      }
    }
  };

  const handleFeedback = () => {
    if (!isAuthenticated) {
      navigate(`/auth/login?returnTo=/client/events/${eventId}/feedback`);
      return;
    }
    navigate(`/client/events/${eventId}/feedback`);
  };

  const handleCertificate = () => {
    if (!isAuthenticated) {
      navigate(`/auth/login?returnTo=/client/events/${eventId}/certificate`);
      return;
    }
    navigate(`/client/events/${eventId}/certificate`);
  };

  const handleAttendance = () => {
    if (!isAuthenticated) {
      navigate(`/auth/login?returnTo=/client/events/${eventId}/attendance`);
      return;
    }
    navigate(`/client/events/${eventId}/mark-attendance`);
  };
  // Smart content formatter component - exact replica of HTML template
  const SmartContent = ({ content, color = 'blue', wordLimit = 40 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    if (!content) return null;
    
    const words = content.trim().split(/\s+/);
    const shouldTruncate = words.length > wordLimit;
    
    // Parse content for bullets like HTML template
    const contentLines = content.trim().split('\n');
    let hasStructuredBullets = false;
    
    // Check for structured bullets
    contentLines.forEach(line => {
      const stripped = line.trim();
      if (stripped.startsWith('•') || stripped.startsWith('-') || stripped.startsWith('*') ||
          stripped.startsWith('▪') || stripped.startsWith('◦') || stripped.startsWith('‣') ||
          stripped.startsWith('○') || stripped.startsWith('●') ||
          (stripped.length >= 2 && /^\d+\./.test(stripped)) ||
          (stripped.length >= 3 && /^[a-zA-Z][\.\)]/.test(stripped))) {
        hasStructuredBullets = true;
      }
    });

    const renderContent = () => {
      if (hasStructuredBullets) {
        return contentLines.map((line, index) => {
          if (!line.trim()) return null;
          
          const stripped = line.trim();
          let isBullet = false;
          let bulletContent = stripped;
          
          // Detect bullet formats
          if (stripped.startsWith('•') || stripped.startsWith('-') || stripped.startsWith('*') ||
              stripped.startsWith('▪') || stripped.startsWith('◦') || stripped.startsWith('‣') ||
              stripped.startsWith('○') || stripped.startsWith('●')) {
            isBullet = true;
            bulletContent = stripped.substring(1).trim();
          } else if (/^\d+\./.test(stripped)) {
            isBullet = true;
            bulletContent = stripped.substring(stripped.indexOf('.') + 1).trim();
          } else if (/^[a-zA-Z][\.\)]/.test(stripped)) {
            isBullet = true;
            bulletContent = stripped.substring(2).trim();
          }
          
          if (isBullet) {
            return (
              <div key={index} className="flex items-start space-x-3 mb-2">
                <div className={`w-5 h-5 bg-${color}-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-gray-700 leading-relaxed flex-1">
                  {bulletContent}
                </div>
              </div>
            );
          }
          
          return (
            <div key={index} className="text-gray-700 leading-relaxed mb-2">
              {stripped}
            </div>
          );
        }).filter(Boolean);
      } else {
        // Auto-bullet creation for paragraph content
        if (contentLines.length === 1) {
          const singleContent = contentLines[0].trim();
          if (singleContent.includes('. ') && singleContent.split('. ').length > 2) {
            const sentences = singleContent.split('. ').filter(s => s.trim());
            return sentences.map((sentence, index) => (
              <div key={index} className="flex items-start space-x-3 mb-3">
                <div className={`w-5 h-5 bg-${color}-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-gray-700 leading-relaxed flex-1">
                  {sentence.trim()}{!sentence.trim().endsWith('.') ? '.' : ''}
                </div>
              </div>
            ));
          }
        }
        
        return contentLines.map((line, index) => (
          line.trim() ? (
            <div key={index} className="text-gray-700 leading-relaxed mb-2">
              {line.trim()}
            </div>
          ) : null
        )).filter(Boolean);
      }
    };

    return (
      <div className="read-more-wrapper" data-word-limit={wordLimit}>
        <div className={`read-more-content bg-${color}-50 p-4 rounded-lg border border-${color}-200 ${!isExpanded && shouldTruncate ? 'max-h-48 overflow-hidden relative' : ''}`}>
          {!isExpanded && shouldTruncate ? (
            <>
              <div className="truncated-content">
                {words.slice(0, wordLimit).join(' ')}...
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
            </>
          ) : (
            renderContent()
          )}
        </div>
        {shouldTruncate && (
          <span 
            className={`read-more-link text-${color}-500 hover:text-${color}-600 text-xs font-medium cursor-pointer transition-all duration-200 inline-flex items-center gap-1 mt-2`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span className="link-text">{isExpanded ? 'Read less' : 'Read more'}</span>
            <svg 
              className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        )}
      </div>
    );
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
              <i className="fas fa-exclamation-triangle text-2xl text-red-500"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Event Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'The event you are looking for does not exist.'}</p>
            <Link 
              to="/client/events" 
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i className="fas fa-arrow-left mr-2"></i>Back to Events
            </Link>
          </div>
        </div>
      </ClientLayout>
    );
  }

  const statusInfo = getStatusInfo();
  const startDate = formatDate(event.start_date || event.start_datetime);
  const endDate = formatDate(event.end_date || event.end_datetime);
  const registrationStart = formatDate(event.registration_start_date);
  const registrationEnd = formatDate(event.registration_end_date);
  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <style>
          {`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          @keyframes float-slow {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(-3deg); }
          }
          @keyframes title-glow {
            0%, 100% { text-shadow: 0 0 20px rgba(255, 255, 255, 0.3); }            50% { text-shadow: 0 0 40px rgba(255, 255, 255, 0.5), 0 0 60px rgba(59, 130, 246, 0.3); }
          }
          .animate-float { animation: float 6s ease-in-out infinite; }
          .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
          .animate-title-glow { animation: title-glow 3s ease-in-out infinite; }
        `}
        </style>
        
        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>

          {/* Floating Elements */}
          <div className="absolute top-10 right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-10 left-10 w-24 h-24 bg-yellow-300/10 rounded-full blur-2xl animate-float-slow"></div>
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-pink-300/10 rounded-full blur-xl animate-pulse"></div>

          <div className="relative container mx-auto max-w-7xl px-4 pt-6 pb-0 mb-6">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-8">              <div className="flex-1 space-y-6">
                {/* Status Badge */}
                <div className={`inline-flex items-center px-3 py-1.5 ${statusInfo.bgClass} ${statusInfo.textClass} rounded-full text-sm font-medium border border-white/20 hover:scale-105 transition-all duration-300 ${statusInfo.animate || ''}`}>
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d={statusInfo.iconPath} clipRule="evenodd" />
                  </svg>
                  {statusInfo.label}
                </div>

                {/* Event Type Badge */}
                {(event.event_type || event.category) && (
                  <div className="inline-flex items-center px-2 py-1.5 bg-white/15 backdrop-blur-sm rounded-full text-sm font-medium border border-white/20 hover:bg-white/20 transition-all duration-300 ml-2">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    {event.event_type || event.category}
                  </div>
                )}

                {/* Event Title */}
                <h1 className="text-4xl lg:text-4xl font-bold -mt-5 mb-2 py-1.5 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent leading-normal animate-title-glow">
                  {event.event_name || event.name || event.title || 'Event Details'}
                </h1>                {/* Description Preview */}
                {(event.short_description || event.detailed_description || event.description || event.event_description || event.details || event.about) && (
                  <div className="relative mb-6">
                    <p className="text-lg lg:text-xl text-blue-100 -my-1 py-3 leading-relaxed max-w-4xl font-light relative z-10">
                      {event.short_description || 
                       (event.detailed_description && event.detailed_description.substring(0, 200) + '...') ||
                       (event.description && event.description.substring(0, 200) + '...') ||
                       (event.event_description && event.event_description.substring(0, 200) + '...') ||
                       (event.details && event.details.substring(0, 200) + '...') ||
                       (event.about && event.about.substring(0, 200) + '...')}
                    </p>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-xl -z-0 blur-xl"></div>
                  </div>
                )}
                {/* Enhanced Quick Info Cards */}
                <div className="flex flex-wrap gap-3 my-3 mt-6">
                  {event.venue && (
                    <div className="group flex items-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 transform">
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center mr-3 group-hover:bg-emerald-500/30 transition-colors">
                        <svg className="w-4 h-4 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-blue-200">Venue</p>
                        <p className="font-semibold text-sm">{event.venue}</p>
                      </div>
                    </div>
                  )}

                  {/* Duration card */}
                  {startDate && endDate && (
                    <div className="group flex items-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 transform">
                      <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center mr-3 group-hover:bg-amber-500/30 transition-colors">
                        <svg className="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-blue-200">Duration</p>
                        <p className="font-semibold text-sm">
                          {startDate.short} - {endDate.short}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>                
              {/* Action Panel */}
              <div className="bg-gradient-to-br from-white/15 via-white/10 to-white/5 backdrop-blur-lg rounded-2xl mt-4 p-5 max-w-xs border border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-300">                {event.sub_status === 'registration_open' && (
                  <div className="text-center space-y-4">
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-white drop-shadow-lg">Ready to Join?</h3>
                      <p className="text-green-100 text-sm drop-shadow">Secure your spot today!</p>
                    </div>

                    {/* Registration time remaining */}
                    {registrationEnd && (
                      <div className="bg-gradient-to-r from-orange-400/20 to-red-400/20 backdrop-blur-sm rounded-xl p-3 border border-orange-300/30 shadow-inner">
                        <div className="flex items-center justify-center space-x-2">
                          <svg className="w-4 h-4 text-orange-300" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-orange-200 font-medium">Registration closes in:</span>
                        </div>
                        <span className="text-lg font-bold text-yellow-300 drop-shadow block mt-1">
                          {getTimeRemaining(event.registration_end_date) || registrationEnd.dayWithSuffix}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={handleRegister}
                      className="group relative w-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white font-bold py-4 px-5 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg overflow-hidden border border-emerald-400/50"
                    >
                      {/* Animated background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                      
                      {/* Shine effect */}
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      
                      <div className="relative flex items-center justify-center space-x-2">
                        <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 2L3 7v11a2 2 0 002 2h10a2 2 0 002-2V7l-7-5zM8 15a1 1 0 112 0v1H8v-1zm2-3a1 1 0 10-2 0v1h2v-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-base font-extrabold tracking-wide">Register Now</span>
                      </div>
                      
                      {/* Glow effect */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-300 to-teal-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-lg"></div>
                    </button>
                  </div>
                )}

                {event.sub_status === 'registration_not_started' && (
                  <div className="text-center space-y-4">
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-white drop-shadow-lg">Coming Soon</h3>
                      <p className="text-yellow-100 text-sm drop-shadow">Get ready to register</p>
                    </div>
                    {registrationStart && (
                      <div className="bg-gradient-to-r from-blue-400/20 to-purple-400/20 backdrop-blur-sm rounded-xl p-3 border border-blue-300/30 shadow-inner">
                        <div className="flex items-center justify-center space-x-2">
                          <svg className="w-4 h-4 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-blue-200 font-medium">Registration opens in:</span>
                        </div>
                        <span className="text-lg font-bold text-cyan-300 drop-shadow block mt-1">
                          {getTimeRemaining(event.registration_start_date) || registrationStart.dayWithSuffix}
                        </span>
                      </div>
                    )}
                    
                    <div className="w-full bg-gradient-to-r from-gray-500 via-gray-400 to-gray-500 text-white font-bold py-4 px-5 rounded-xl cursor-not-allowed opacity-70 shadow-lg">
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-base font-extrabold tracking-wide">Registration Locked</span>
                      </div>
                    </div>
                  </div>
                )}

                {event.sub_status === 'registration_closed' && (
                  <div className="text-center space-y-4">
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-white drop-shadow-lg">Registration Closed</h3>
                      <p className="text-red-100 text-sm drop-shadow">Registration period has ended</p>
                    </div>
                    
                    <div className="w-full bg-gradient-to-r from-red-500 via-red-400 to-red-500 text-white font-bold py-4 px-5 rounded-xl cursor-not-allowed opacity-70 shadow-lg">
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-base font-extrabold tracking-wide">Registration Closed</span>
                      </div>
                    </div>
                  </div>
                )}{event.sub_status === 'event_started' && (
                  <div className="text-center space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-white">Event Active</h3>
                      <p className="text-orange-100 text-sm">Mark your attendance now</p>
                    </div>                    <button
                      onClick={handleAttendance}
                      className="group relative w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 hover:from-orange-600 hover:via-red-600 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl shadow-lg overflow-hidden"
                    >
                      {/* Shine effect */}
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      
                      <div className="relative flex items-center justify-center">
                        <svg className="w-5 h-5 mr-3 transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-lg font-extrabold tracking-wide">Mark Attendance</span>
                      </div>
                      
                      {/* Glow effect */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-400 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"></div>
                    </button>
                  </div>
                )}                
                {event.sub_status === 'certificate_available' && (
                  <div className="text-center space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-white">Congratulations!</h3>
                      <p className="text-purple-100 text-sm">Your certificate is ready</p>
                    </div>                    <div className="space-y-3">
                      {/* Submit Feedback Button */}
                      <button
                        onClick={handleFeedback}
                        className="group relative w-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 hover:from-emerald-600 hover:via-green-600 hover:to-teal-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl shadow-lg overflow-hidden"
                      >
                        {/* Shine effect */}
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        
                        <div className="relative flex items-center justify-center">
                          <svg className="w-5 h-5 mr-3 transition-transform duration-300 group-hover:rotate-12" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                          </svg>
                          <span className="text-lg font-extrabold tracking-wide">Submit Feedback</span>
                        </div>
                        
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"></div>
                      </button>

                      {/* Collect Certificate Button */}
                      <button
                        onClick={handleCertificate}
                        className="group relative w-full bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 hover:from-violet-700 hover:via-purple-700 hover:to-indigo-800 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl shadow-lg overflow-hidden"
                      >
                        {/* Shine effect */}
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        
                        <div className="relative flex items-center justify-center">
                          <svg className="w-5 h-5 mr-3 transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-lg font-extrabold tracking-wide">Collect Certificate</span>
                        </div>
                        
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"></div>
                      </button>
                    </div>
                  </div>
                )}                {event.sub_status === 'registration_not_started' && (
                  <div className="text-center space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-white">Coming Soon</h3>
                      <p className="text-yellow-100 text-sm">Get ready to register</p>
                    </div>
                    {registrationStart && (
                      <div className="bg-white/10 rounded-xl p-3 border border-white/20">
                        <span className="text-xs text-blue-200 block">Registration opens:</span>
                        <span className="font-bold text-yellow-300 text-sm">{registrationStart.full}</span>
                      </div>
                    )}                    <button className="w-full bg-gray-400/50 text-gray-200 px-6 py-3 rounded-xl font-bold cursor-not-allowed" disabled>
                      Not Available Yet
                    </button>
                  </div>
                )}

                {/* Fallback for other statuses */}
                {!['registration_open', 'event_started', 'certificate_available', 'registration_not_started'].includes(event.sub_status) && (
                  <div className="text-center space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-white">Registration Closed</h3>
                      <p className="text-red-100 text-sm">This event is no longer accepting registrations</p>
                    </div>                    <button className="w-full bg-gray-400/50 text-gray-200 px-6 py-3 rounded-xl font-bold cursor-not-allowed" disabled>
                      Registration Unavailable
                    </button>
                  </div>                
                )}
              </div>
            </div>
          </div>
        </div>        
        {/* Event Timeline */}
        <div className="container mx-auto max-w-5xl px-4 py-4 mt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/80 rounded-2xl shadow border border-blue-100 py-6 px-2">
            <div className="flex w-full justify-between items-center relative">              {/* Registration Opens */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.5 9.293 10.793a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="mt-2 text-xs font-semibold text-gray-700 text-center whitespace-nowrap">
                  Registration Opens
                </div>
                <div className="mt-1 text-xs text-gray-500 text-center">
                  {registrationStart ? (
                    <>
                      {registrationStart.dayWithSuffix}
                      {event.registration_start_time && <br />}-  
                      {event.registration_start_time || registrationStart.time}
                    </>
                  ) : 'TBA'}
                </div>
              </div>

              {/* Connecting line */}
              <div className="hidden md:block h-1 w-15 bg-gradient-to-r from-gray-200 to-gray-300 mx-1"></div>

              {/* Registration Closes */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-10 h-10 bg-gradient-to-r from-red-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="mt-2 text-xs font-semibold text-gray-700 text-center whitespace-nowrap">
                  Registration Closes
                </div>
                <div className="mt-1 text-xs text-gray-500 text-center">
                  {registrationEnd ? (
                    <>
                      {registrationEnd.dayWithSuffix}
                      {event.registration_end_time && <br />}-
                      {event.registration_end_time || registrationEnd.time}
                    </>
                  ) : 'TBA'}
                </div>
              </div>

              {/* Connecting line */}
              <div className="hidden md:block h-1 w-15 bg-gradient-to-r from-gray-200 to-gray-300 mx-1"></div>

              {/* Event Starts */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="mt-2 text-xs font-semibold text-gray-700 text-center whitespace-nowrap">
                  Event Starts
                </div>
                <div className="mt-1 text-xs text-gray-500 text-center">
                  {startDate ? (
                    <>
                      {startDate.dayWithSuffix}
                      {event.start_time && <br />}-
                      {event.start_time || startDate.time}
                    </>
                  ) : 'TBA'}
                </div>
              </div>

              {/* Connecting line */}
              <div className="hidden md:block h-1 w-15 bg-gradient-to-r from-gray-200 to-gray-300 mx-1"></div>

              {/* Event Ends */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="mt-2 text-xs font-semibold text-gray-700 text-center whitespace-nowrap">
                  Event Ends
                </div>
                <div className="mt-1 text-xs text-gray-500 text-center">
                  {endDate ? (
                    <>
                      {endDate.dayWithSuffix}
                      {event.end_time && <br />}-
                      {event.end_time || endDate.time}
                    </>
                  ) : 'TBA'}
                </div>
              </div>

              {/* Connecting line */}
              <div className="hidden md:block h-1 w-15 bg-gradient-to-r from-gray-200 to-gray-300 mx-1"></div>

              {/* Certificate Available */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="mt-2 text-xs font-semibold text-gray-700 text-center whitespace-nowrap">
                  Certificate Available
                </div>
                <div className="mt-1 text-xs text-gray-500 text-center">
                  {event.certificate_end_date ? (
                    <>
                      {formatDate(event.certificate_end_date)?.dayWithSuffix}
                      {event.certificate_available_time && <br />}
                      {event.certificate_available_time}
                    </>
                  ) : 'After event'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Details Section */}
        <div className="container mx-auto max-w-5xl px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="flex flex-col space-y-8">              
              {/* Event Organizers */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100 p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                      <path d="M6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Event Organizers</h2>
                </div>
                <div className="space-y-4">
                  {/* Organizing Department */}
                  {event.organizing_department && (
                    <div className="text-sm font-medium text-gray-800 mb-3">
                      {event.organizing_department}
                    </div>
                  )}

                  {/* Organizing Team */}
                  {(event.organizers || event.organizer_name || event.contacts) && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-800 mb-3">Organizing Team</div>

                      {/* Display organizers from array */}
                      {event.organizers && event.organizers.map((organizer, index) => {
                        if (!organizer) return null;
                        
                        const organizerParts = organizer.split(' - ');
                        const organizerName = organizerParts[0] || organizer;
                        const organizerTitle = organizerParts[1] || '';
                        const organizerInitial = organizerName.charAt(0).toUpperCase();

                        return (
                          <div key={index} className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                            <div className="flex items-start space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {organizerInitial}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-800 mb-1">{organizer}</div>
                                
                                {/* Contact Details */}
                                {event.contacts && event.contacts.length > 0 && event.contacts.map((contact, contactIndex) => {
                                  if (!contact || !contact.name || !contact.contact) return null;
                                  
                                  const contactName = contact.name.toLowerCase();
                                  const organizerNameLower = organizerName.toLowerCase();
                                  
                                  if (contactName === organizerNameLower || 
                                      contactName.includes(organizerNameLower) || 
                                      organizerNameLower.includes(contactName)) {
                                    
                                    const isEmail = contact.contact.includes('@');
                                    const isPhone = contact.contact.startsWith('+') || 
                                                   contact.contact.replace(/[-\s]/g, '').match(/^\d+$/);
                                    
                                    return (
                                      <div key={contactIndex} className="mt-2 space-y-1">
                                        <div className="flex items-center">
                                          {isEmail ? (
                                            <>
                                              <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                              </svg>
                                              <a href={`mailto:${contact.contact}`} className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                                                {contact.contact}
                                              </a>
                                            </>
                                          ) : isPhone ? (
                                            <>
                                              <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                              </svg>
                                              <a href={`tel:${contact.contact}`} className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                                                {contact.contact}
                                              </a>
                                            </>
                                          ) : (
                                            <>
                                              <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                              </svg>
                                              <span className="text-sm text-gray-600">{contact.contact}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Fallback for single organizer */}
                      {!event.organizers && event.organizer_name && (
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {event.organizer_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-800 mb-1">{event.organizer_name}</div>
                              
                              {(event.organizer_email || event.organizer_phone) && (
                                <div className="mt-2 space-y-1">
                                  {event.organizer_email && (
                                    <div className="flex items-center">
                                      <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                      </svg>
                                      <a href={`mailto:${event.organizer_email}`} className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                                        {event.organizer_email}
                                      </a>
                                    </div>
                                  )}
                                  {event.organizer_phone && (
                                    <div className="flex items-center">
                                      <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                      </svg>
                                      <a href={`tel:${event.organizer_phone}`} className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                                        {event.organizer_phone}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Fallback for contacts only */}
                      {!event.organizers && !event.organizer_name && event.contacts && event.contacts.map((contact, index) => {
                        if (!contact || !contact.name || !contact.contact) return null;
                        
                        const isEmail = contact.contact.includes('@');
                        const isPhone = contact.contact.startsWith('+') || 
                                       contact.contact.replace(/[-\s]/g, '').match(/^\d+$/);
                        
                        return (
                          <div key={index} className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                            <div className="flex items-start space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {contact.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-800 mb-1">{contact.name}</div>
                                
                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center">
                                    {isEmail ? (
                                      <>
                                        <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                        </svg>
                                        <a href={`mailto:${contact.contact}`} className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                                          {contact.contact}
                                        </a>
                                      </>
                                    ) : isPhone ? (
                                      <>
                                        <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                        </svg>
                                        <a href={`tel:${contact.contact}`} className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                                          {contact.contact}
                                        </a>
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-sm text-gray-600">{contact.contact}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}                  {/* Fallback message if no organizers found */}
                  {!event.organizers && !event.organizer_name && !event.contacts && (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                      </svg>
                      <p>Organizer information will be updated soon.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Description */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100 p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-center text-white mr-3">
                    <i className="fas fa-info-circle text-lg"></i>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Event Description</h2>
                </div>                {(event.detailed_description || event.description || event.event_description || event.details || event.about) ? (
                  <SmartContent content={event.detailed_description || event.description || event.event_description || event.details || event.about} color="blue" wordLimit={50} />
                ) : (
                  <div className="text-gray-500 italic">No description available for this event.</div>
                )}
              </div>

              {/* What to Bring */}
              {event.what_to_bring && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-cyan-100 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-teal-600 rounded-full flex items-center justify-center text-white mr-3">
                      <i className="fas fa-suitcase text-lg"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">What to Bring</h2>
                  </div>
                  <SmartContent content={event.what_to_bring} color="cyan" wordLimit={30} />
                </div>
              )}

              {/* Objectives */}
              {event.objectives && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-indigo-100 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white mr-3">
                      <i className="fas fa-bullseye text-lg"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Objectives</h2>
                  </div>
                  <SmartContent content={event.objectives} color="indigo" wordLimit={40} />
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="flex flex-col space-y-8">              {/* Registration Details */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-green-100 p-6 w-full max-w-full">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zM8 6a2 2 0 114 0v1H8V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Registration Details</h2>
                </div>

                <div className="space-y-4">
                  {/* Mode - Always shown */}
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Mode</span>
                    <span className="text-sm font-semibold text-gray-800">                      {event.mode ? (
                        event.mode === 'online' ? (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm1 7a1 1 0 011-1h6a1 1 0 110 2H5a1 1 0 01-1-1zm3 3a1 1 0 011-1h2a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                            Online
                          </span>
                        ) :
                        event.mode === 'offline' ? (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            Offline
                          </span>
                        ) :
                        event.mode === 'hybrid' ? (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            Hybrid
                          </span>
                        ) :
                        event.mode.charAt(0).toUpperCase() + event.mode.slice(1)
                      ) : 'Not specified'}
                    </span>
                  </div>

                  {/* Type - Always shown */}
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Type</span>
                    <span className="text-sm font-semibold text-gray-800">                      {event.registration_type ? (
                        event.registration_type === 'free' ? (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                            Free
                          </span>
                        ) :
                        event.registration_type === 'paid' ? (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            Paid
                          </span>
                        ) :
                        event.registration_type.charAt(0).toUpperCase() + event.registration_type.slice(1)
                      ) : 'Not specified'}
                    </span>
                  </div>

                  {/* Registration Mode - Only if exists */}
                  {event.registration_mode && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Registration Mode</span>
                      <span className="text-sm font-semibold text-gray-800">                        {event.registration_mode === 'individual' ? (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            Individual
                          </span>
                        ) :
                         event.registration_mode === 'team' ? (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                              <path d="M6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                            </svg>
                            Team Based
                          </span>
                        ) :
                         event.registration_mode.charAt(0).toUpperCase() + event.registration_mode.slice(1)}
                      </span>
                    </div>
                  )}

                  {/* Team Size - Only for team mode with min/max */}
                  {event.registration_mode === 'team' && (event.team_size_min || event.team_size_max) && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Team Size</span>
                      <span className="text-sm font-semibold text-gray-800">
                        {event.team_size_min && event.team_size_max
                          ? `${event.team_size_min} - ${event.team_size_max} members`
                          : event.team_size_min
                            ? `Min: ${event.team_size_min} members`
                            : event.team_size_max
                              ? `Max: ${event.team_size_max} members`
                              : ''}
                      </span>
                    </div>
                  )}

                  {/* Registration Fee - Only if > 0, labeled as "Fee" */}
                  {event.registration_fee && event.registration_fee > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Fee</span>
                      <span className="text-sm font-semibold text-green-600">₹{event.registration_fee}</span>
                    </div>
                  )}

                  {/* Participants Range */}
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600">
                      {event.registration_mode && event.registration_mode.toLowerCase() === 'team' ? 'Team Size' : 'Participants'}
                    </span>
                    <span className="text-sm font-semibold text-gray-800">
                      {(event.min_participants || event.max_participants) ? (
                        event.min_participants && event.max_participants
                          ? `${event.min_participants} - ${event.max_participants}`
                          : event.min_participants
                            ? `Min: ${event.min_participants}`
                            : event.max_participants
                              ? `Max: ${event.max_participants}`
                              : 'No limit specified'
                      ) : 'No limit specified'}
                    </span>
                  </div>

                  {/* Current Registrations */}
                  {event.registration_stats && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Registered</span>
                      {event.registration_mode && event.registration_mode.toLowerCase() === 'team' ? (
                        <div className="text-right">
                          <span className="text-sm font-semibold text-blue-600">
                            {event.registration_stats.total_teams || 0} teams
                          </span>
                          {event.registration_stats.total_participants && event.registration_stats.total_participants > 0 && (
                            <div className="text-xs text-gray-500">{event.registration_stats.total_participants} total participants</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-blue-600">
                          {event.registration_stats.total_participants || event.registration_stats.total_registrations || 0} participants
                        </span>
                      )}
                    </div>
                  )}

                  {/* Fee Details - Only if registration fee exists */}
                  {event.registration_fee && event.registration_fee > 0 && (
                    <div className="py-2">
                      <span className="text-sm font-medium text-gray-600 block mb-2">Fee Details</span>
                      <div className="text-sm text-gray-700 bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Registration Fee:</span>
                          <span className="text-green-600 font-bold">₹{event.registration_fee}</span>
                        </div>
                        {event.fee_description && (
                          <div className="text-xs text-gray-600 mt-2">
                            <span className="font-medium">Description:</span> {event.fee_description}
                          </div>
                        )}
                        {event.fee_includes && (
                          <div className="text-xs text-gray-600 mt-2">
                            <span className="font-medium">Includes:</span> {event.fee_includes}
                          </div>
                        )}
                        {event.payment_method && (
                          <div className="text-xs text-gray-600 mt-1">
                            <span className="font-medium">Payment Method:</span> {event.payment_method}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Target Goals */}
              {event.target_goals && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white mr-3">
                      <i className="fas fa-trophy text-lg"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Target Goals</h2>
                  </div>
                  <SmartContent content={event.target_goals} color="amber" />
                </div>
              )}

              {/* Expected Outcomes */}
              {(event.target_outcomes || event.expected_outcomes || event.learning_outcomes) && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-green-100 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white mr-3">
                      <i className="fas fa-chart-line text-lg"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Expected Outcomes</h2>
                  </div>
                  <SmartContent 
                    content={event.target_outcomes || event.expected_outcomes || event.learning_outcomes} 
                    color="green" 
                    wordLimit={35} 
                  />
                </div>
              )}

              {/* Prerequisites */}
              {event.prerequisites && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-red-100 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center text-white mr-3">
                      <i className="fas fa-exclamation-triangle text-lg"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Prerequisites</h2>
                  </div>
                  <SmartContent content={event.prerequisites} color="red" />
                </div>
              )}

              {/* Success Metrics */}
              {event.success_metrics && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white mr-3">
                      <i className="fas fa-chart-bar text-lg"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Success Metrics</h2>
                  </div>
                  <SmartContent content={event.success_metrics} color="purple" />
                </div>
              )}
            </div>
          </div>        </div>
      </div>
    </ClientLayout>
  );
}

export default EventDetail;
