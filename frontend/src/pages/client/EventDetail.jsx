import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clientAPI } from '../../api/client';
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
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  useEffect(() => {
    fetchEventDetails();
    // Reset state when eventId changes
    setFeedbackSubmitted(false);
    setAttendanceMarked(false);
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await clientAPI.getEventDetails(eventId);
      
      if (response.data.success) {
        setEvent(response.data.event);
        
        // Debug: Log the event data to console to check organizers and contacts
        console.log('Event data received:', response.data.event);
        console.log('Organizers:', response.data.event.organizers);
        console.log('Contacts:', response.data.event.contacts);
        
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
          iconPath: 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'
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
      navigate(`/auth/login?redirect=${encodeURIComponent(`/client/events/${eventId}`)}`);
      return;
    }
    
    // Determine if it's faculty or student based on user context
    const userType = user?.role || user?.userType || 'student';
    const isTeamEvent = event?.event_type === 'team' || event?.registration_type === 'team';
    
    if (userType === 'faculty') {
      // Faculty registration routes (future implementation)
      if (isTeamEvent) {
        navigate(`/faculty/events/${eventId}/register-team`);
      } else {
        navigate(`/faculty/events/${eventId}/register`);
      }
    } else {
      // Student registration routes - use new comprehensive router
      if (isTeamEvent) {
        navigate(`/student/events/${eventId}/register-team`);
      } else {
        navigate(`/student/events/${eventId}/register`);
      }
    }
  };

  const handleFeedback = () => {
    if (!isAuthenticated) {
      navigate(`/auth/login?returnTo=/client/events/${eventId}/feedback`);
      return;
    }
    
    // Set feedback submitted state and show thank you message
    setFeedbackSubmitted(true);
    
    // Navigate to feedback page after a brief delay
    setTimeout(() => {
      navigate(`/client/events/${eventId}/feedback`);
    }, 1500);
  };

  const handleAttendance = () => {
    if (!isAuthenticated) {
      navigate(`/auth/login?redirect=${encodeURIComponent(`/client/events/${eventId}/mark-attendance`)}`);
      return;
    }
    
    // Check if user is a student
    if (user?.user_type !== 'student') {
      alert('Only students can mark attendance for events');
      return;
    }
    
    // Set attendance marked state temporarily
    setAttendanceMarked(true);
    
    // Navigate after showing confirmation
    setTimeout(() => {
      navigate(`/client/events/${eventId}/mark-attendance`);
    }, 1500);
  };

  // Timeline status helper function
  const getCurrentTimelineStatus = (phase) => {
    const now = new Date();
    
    switch (phase) {
      case 'registration_start':
        if (!event.registration_start_date) return 'upcoming';
        const regStart = new Date(event.registration_start_date);
        return now >= regStart ? 'completed' : 'upcoming';
        
      case 'registration_end':
        if (!event.registration_end_date) return 'upcoming';
        const regEnd = new Date(event.registration_end_date);
        const regStart2 = new Date(event.registration_start_date);
        if (now >= regEnd) return 'completed';
        if (now >= regStart2) return 'current';
        return 'upcoming';
        
      case 'event_start':
        const eventStartField = event.start_date || event.start_datetime;
        if (!eventStartField) return 'upcoming';
        const eventStart = new Date(eventStartField);
        return now >= eventStart ? 'completed' : 'upcoming';
        
      case 'event_end':
        const eventEndField = event.end_date || event.end_datetime;
        const eventStartField2 = event.start_date || event.start_datetime;
        if (!eventEndField) return 'upcoming';
        const eventEnd = new Date(eventEndField);
        const eventStart2 = new Date(eventStartField2);
        if (now >= eventEnd) return 'completed';
        if (now >= eventStart2) return 'current';
        return 'upcoming';
        
      case 'certificate':
        const eventEndField2 = event.end_date || event.end_datetime;
        if (!eventEndField2) return 'upcoming';
        const eventEnd2 = new Date(eventEndField2);
        if (now >= eventEnd2) return 'current';
        return 'upcoming';
        
      default:
        return 'upcoming';
    }
  };

  // Get dynamic timeline message based on current phase
  const getDynamicTimelineMessage = () => {
    const now = new Date();
    
    // Registration not started
    if (event.registration_start_date && now < new Date(event.registration_start_date)) {
      const timeLeft = getTimeRemaining(event.registration_start_date);
      return timeLeft ? `Registration opens in ${timeLeft}` : 'Registration opening soon';
    }
    
    // Registration open
    if (event.registration_start_date && now >= new Date(event.registration_start_date) && 
        event.registration_end_date && now < new Date(event.registration_end_date)) {
      const timeLeft = getTimeRemaining(event.registration_end_date);
      return timeLeft ? `Registration closes in ${timeLeft}` : 'Registration closing soon';
    }
    
    // Registration closed, event not started
    const eventStartField = event.start_date || event.start_datetime;
    if (event.registration_end_date && now >= new Date(event.registration_end_date) &&
        eventStartField && now < new Date(eventStartField)) {
      const timeLeft = getTimeRemaining(eventStartField);
      return timeLeft ? `Event starts in ${timeLeft}` : 'Event starting soon';
    }
    
    // Event started, not ended
    const eventStartField2 = event.start_date || event.start_datetime;
    const eventEndField = event.end_date || event.end_datetime;
    if (eventStartField2 && now >= new Date(eventStartField2) &&
        eventEndField && now < new Date(eventEndField)) {
      const timeLeft = getTimeRemaining(eventEndField);
      return timeLeft ? `Event ends in ${timeLeft}` : 'Event ending soon';
    }
    
    // Event ended
    const eventEndField2 = event.end_date || event.end_datetime;
    if (eventEndField2 && now >= new Date(eventEndField2)) {
      return 'Certificate available';
    }
    
    return 'Timeline unavailable';
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

    // Function to convert any content into bullet points
    const convertToBullets = (content) => {
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
            return {
              type: 'bullet',
              content: bulletContent,
              index: index
            };
          }
          
          return {
            type: 'text',
            content: stripped,
            index: index
          };
        }).filter(item => item && item.content);
      } else {
        // Auto-bullet creation for paragraph content
        if (contentLines.length === 1) {
          const singleContent = contentLines[0].trim();
          if (singleContent.includes('. ') && singleContent.split('. ').length > 2) {
            const sentences = singleContent.split('. ').filter(s => s.trim());
            return sentences.map((sentence, index) => ({
              type: 'bullet',
              content: sentence.trim() + (!sentence.trim().endsWith('.') ? '.' : ''),
              index: index
            }));
          }
        }
        
        // Convert each line to a bullet point
        return contentLines.map((line, index) => (
          line.trim() ? {
            type: 'bullet',
            content: line.trim(),
            index: index
          } : null
        )).filter(Boolean);
      }
    };

    const renderBulletPoints = (bulletData, maxItems = null) => {
      const itemsToShow = maxItems ? bulletData.slice(0, maxItems) : bulletData;
      
      return itemsToShow.map((item) => (
        <div key={item.index} className="flex items-start space-x-3 mb-2">
          <div className={`w-5 h-5 bg-${color}-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-gray-700 leading-relaxed flex-1">
            {item.content}
          </div>
        </div>
      ));
    };

    // Convert content to bullet points
    const bulletData = convertToBullets(content);
    const maxItemsToShow = isExpanded ? bulletData.length : Math.min(Math.ceil(wordLimit / 10), bulletData.length);

    return (
      <div className="read-more-wrapper" data-word-limit={wordLimit}>
        <div className={`read-more-content bg-${color}-50 p-4 rounded-lg border border-${color}-200 ${!isExpanded && shouldTruncate ? 'relative' : ''}`}>
          {renderBulletPoints(bulletData, maxItemsToShow)}
          {!isExpanded && shouldTruncate && maxItemsToShow < bulletData.length && (
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
          )}
        </div>
        {shouldTruncate && bulletData.length > Math.ceil(wordLimit / 10) && (
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
          @keyframes sparkle {
            0%, 100% { 
              opacity: 0; 
              transform: scale(0.8) rotate(0deg); 
            }
            50% { 
              opacity: 1; 
              transform: scale(1.2) rotate(180deg); 
            }
          }
          
          @keyframes gentle-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          
          @keyframes pulse-glow {
            0%, 100% { 
              box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
              transform: scale(1);
            }
            50% { 
              box-shadow: 0 0 30px rgba(59, 130, 246, 0.8);
              transform: scale(1.05);
            }
          }
          
          @keyframes icon-bounce {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-4px) rotate(3deg); }
            50% { transform: translateY(-8px) rotate(0deg); }
            75% { transform: translateY(-4px) rotate(-3deg); }
          }
          
          @keyframes time-bounce {
            0%, 100% { 
              transform: translateY(0) scale(1);
              text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
            }
            50% { 
              transform: translateY(-4px) scale(1.05);
              text-shadow: 0 0 20px rgba(251, 191, 36, 0.8);
            }
          }
          .animate-float { animation: float 6s ease-in-out infinite; }
          .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
          .animate-title-glow { animation: title-glow 3s ease-in-out infinite; }
          .animate-sparkle { animation: sparkle 2s ease-in-out infinite; }
          .animate-gentle-bounce { animation: gentle-bounce 2s ease-in-out infinite; }
          .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
          .animate-icon-bounce { animation: icon-bounce 2.5s ease-in-out infinite; }
          .animate-time-bounce { animation: time-bounce 1.5s ease-in-out infinite; }
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
                {/* Enhanced Status Badge with Better Visibility */}
                <div className={`inline-flex items-center px-4 py-2 ${statusInfo.bgClass} ${statusInfo.textClass} rounded-full text-sm font-medium border-2 border-white/30 hover:scale-105 transition-all duration-300 shadow-lg ${statusInfo.animate || ''}`}>
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d={statusInfo.iconPath} clipRule="evenodd" />
                  </svg>
                  <span className="font-bold tracking-wide">{statusInfo.label}</span>
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
              {/* Enhanced Action Panel with Consistent Sizing */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-80 min-h-[280px] border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.02] relative overflow-hidden flex flex-col justify-between">
                {/* Floating background elements */}
                <div className="absolute top-2 right-2 w-16 h-16 bg-white/5 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute bottom-2 left-2 w-12 h-12 bg-blue-300/10 rounded-full blur-xl animate-float-slow"></div>                {event.sub_status === 'registration_open' && (
                  <div className="text-center space-y-4 relative z-10 flex flex-col justify-between min-h-[200px]">
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg animate-pulse-glow">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-white drop-shadow-lg animate-title-glow">Ready to Join?</h3>
                      <p className="text-green-100 text-sm drop-shadow">Secure your spot today!</p>
                    </div>

                    <div className="space-y-3">
                      {/* Registration time remaining */}
                      {registrationEnd && (
                        <div className="bg-gradient-to-r from-orange-400/20 to-red-400/20 backdrop-blur-sm rounded-xl p-3 border border-orange-300/30 shadow-inner hover:shadow-lg transition-all duration-300">
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
                        className="group relative w-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white font-bold py-4 px-5 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg overflow-hidden border border-emerald-400/50 hover:border-emerald-300/70"
                      >
                        {/* Animated background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                        
                        {/* Shine effect */}
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        
                        {/* Sparkle effect */}
                        <div className="absolute top-1 right-1 w-2 h-2 bg-white/60 rounded-full opacity-0 group-hover:opacity-100 animate-sparkle"></div>
                        <div className="absolute bottom-2 left-3 w-1 h-1 bg-white/40 rounded-full opacity-0 group-hover:opacity-100 animate-sparkle" style={{animationDelay: '0.3s'}}></div>
                        
                        <div className="relative flex items-center justify-center space-x-2">
                          <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M9 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4"/>
                            <path d="M9 3h6a2 2 0 0 1 2 2v1H7V5a2 2 0 0 1 2-2z"/>
                            <path d="M9 14l2 2l4-4"/>
                          </svg>
                          <span className="text-base font-extrabold tracking-wide">Register Now</span>
                        </div>
                        
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-300 to-teal-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-lg"></div>
                      </button>
                    </div>
                  </div>
                )}

                {event.sub_status === 'registration_not_started' && (
                  <div className="text-center space-y-4 relative z-10 flex flex-col justify-between min-h-[200px]">
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg animate-pulse-glow">
                        <svg className="w-6 h-6 text-white animate-icon-bounce" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-white drop-shadow-lg">Coming Soon</h3>
                      <p className="text-yellow-100 text-sm drop-shadow">Get ready to register</p>
                    </div>

                    <div className="space-y-3">
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
                  </div>
                )}               
                {(event.sub_status === 'event_started' || event.sub_status === 'ongoing') && (
                  <div className="text-center space-y-4 relative z-10 flex flex-col justify-between min-h-[200px]">
                    <div className="space-y-1">
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg animate-pulse-glow">
                        <svg className="w-6 h-6 text-white animate-icon-bounce" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-white animate-title-glow">Event Active</h3>
                      <p className="text-orange-100 text-sm">Mark your attendance now</p>
                      
                      {/* Show success message if attendance marked */}
                      {attendanceMarked && (
                        <div className="bg-green-500/20 backdrop-blur-sm rounded-lg p-2 border border-green-300/30 mt-2">
                          <p className="text-green-200 text-xs font-medium">
                            ✓ Redirecting to attendance page...
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleAttendance}
                      disabled={attendanceMarked}
                      className={`group relative w-full transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl shadow-lg overflow-hidden border ${
                        attendanceMarked 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-400/50 cursor-not-allowed'
                          : 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 hover:from-orange-600 hover:via-red-600 hover:to-pink-700 border-orange-400/50 hover:border-orange-300/70'
                      } text-white font-bold py-4 px-6 rounded-2xl`}
                    >
                      {/* Animated background */}
                      {!attendanceMarked && (
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-red-400 to-pink-500 opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                      )}
                      
                      {/* Shine effect */}
                      {!attendanceMarked && (
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      )}
                      
                      {/* Sparkle effect */}
                      {!attendanceMarked && (
                        <>
                          <div className="absolute top-1 right-2 w-2 h-2 bg-white/60 rounded-full opacity-0 group-hover:opacity-100 animate-sparkle"></div>
                          <div className="absolute bottom-2 left-4 w-1 h-1 bg-white/40 rounded-full opacity-0 group-hover:opacity-100 animate-sparkle" style={{animationDelay: '0.4s'}}></div>
                        </>
                      )}
                      
                      <div className="relative flex items-center justify-center">
                        {attendanceMarked ? (
                          <>
                            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-lg font-extrabold tracking-wide">Processing...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 mr-3 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                              <path d="M16 11l2 2l4-4"/>
                            </svg>
                            <span className="text-lg font-extrabold tracking-wide">Mark Attendance</span>
                          </>
                        )}
                      </div>
                      
                      {/* Glow effect */}
                      {!attendanceMarked && (
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-400 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"></div>
                      )}
                    </button>
                  </div>
                )}                
                {event.sub_status === 'certificate_available' && (
                  <div className="text-center space-y-4 relative z-10 flex flex-col justify-between min-h-[200px]">
                    <div className="space-y-1">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg animate-pulse-glow">
                        <svg className="w-6 h-6 text-white animate-icon-bounce" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-white animate-title-glow">Congratulations!</h3>
                      <p className="text-purple-100 text-sm">Your certificate is ready</p>
                    </div>

                    <div className="flex justify-center">
                      {/* Submit Feedback Button with State Management */}
                      <button
                        onClick={handleFeedback}
                        disabled={feedbackSubmitted}
                        className={`group relative w-full transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl shadow-lg overflow-hidden border ${
                          feedbackSubmitted 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-400/50 cursor-not-allowed'
                            : 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 hover:from-emerald-600 hover:via-green-600 hover:to-teal-700 border-emerald-400/50 hover:border-emerald-300/70'
                        } text-white font-bold py-4 px-6 rounded-2xl`}
                      >
                        {/* Animated background */}
                        {!feedbackSubmitted && (
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-500 opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                        )}
                        
                        {/* Shine effect */}
                        {!feedbackSubmitted && (
                          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        )}
                        
                        {/* Sparkle effect */}
                        {!feedbackSubmitted && (
                          <div className="absolute top-1 right-2 w-2 h-2 bg-white/60 rounded-full opacity-0 group-hover:opacity-100 animate-sparkle"></div>
                        )}
                        
                        <div className="relative flex items-center justify-center">
                          {feedbackSubmitted ? (
                            <>
                              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="text-lg font-extrabold tracking-wide">Thank You!</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5 mr-3 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <path d="M21 11.5a8.38 8.38 0 0 1-1.9 5.4 8.5 8.5 0 0 1-6.6 3.1 8.38 8.38 0 0 1-5.4-1.9L3 21l1.9-4.1a8.38 8.38 0 0 1-1.9-5.4 8.5 8.5 0 0 1 3.1-6.6 8.38 8.38 0 0 1 5.4-1.9h.5"/>
                                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L14 13l-4 1 1-4 7.5-7.5z"/>
                              </svg>
                              <span className="text-lg font-extrabold tracking-wide">Submit Feedback</span>
                            </>
                          )}
                        </div>
                        
                        {/* Glow effect */}
                        {!feedbackSubmitted && (
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"></div>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Fallback for other statuses */}
                {!['registration_open', 'event_started', 'ongoing', 'certificate_available', 'registration_not_started'].includes(event.sub_status) && (
                  <div className="text-center space-y-4 relative z-10 flex flex-col justify-between min-h-[200px]">
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-white drop-shadow-lg">Registration Closed</h3>
                      <p className="text-red-100 text-sm drop-shadow">This event is no longer accepting registrations</p>
                    </div>

                    <div className="w-full bg-gradient-to-r from-red-500 via-red-400 to-red-500 text-white font-bold py-4 px-6 rounded-xl cursor-not-allowed opacity-70 shadow-lg border border-red-400/30">
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-base font-extrabold tracking-wide text-white">Registration Unavailable</span>
                      </div>
                    </div>
                  </div>                
                )}
              </div>
            </div>
          </div>
        </div>        
        {/* Compact Event Timeline */}
        <div className="container mx-auto max-w-5xl px-4 py-4 mt-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100/50 overflow-hidden">
            {/* Timeline Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-3 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                  Event Timeline
                </h2>
                <div className={`text-sm font-semibold px-3 py-1 rounded-full transition-all duration-300 ${
                  getCurrentTimelineStatus('registration_start') === 'current' || getCurrentTimelineStatus('registration_end') === 'current'
                    ? 'text-orange-600 bg-orange-100 animate-pulse'
                    : getCurrentTimelineStatus('event_start') === 'current' || getCurrentTimelineStatus('event_end') === 'current'
                      ? 'text-red-600 bg-red-100 animate-pulse'
                      : getCurrentTimelineStatus('certificate') === 'current'
                        ? 'text-purple-600 bg-purple-100 animate-pulse'
                        : 'text-blue-600 bg-blue-100'
                }`}>
                  {getDynamicTimelineMessage()}
                </div>
              </div>
            </div>

            {/* Timeline Content */}
            <div className="p-6">
              <div className="relative">
                {/* Timeline Steps */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-2">
                  
                  {/* Registration Opens */}
                  <div className={`flex flex-col items-center group transition-all duration-300 ${
                    getCurrentTimelineStatus('registration_start') === 'completed' 
                      ? 'scale-105' 
                      : getCurrentTimelineStatus('registration_start') === 'current' 
                        ? 'scale-110' 
                        : 'scale-100'
                  }`}>
                    <div className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${
                      getCurrentTimelineStatus('registration_start') === 'completed'
                        ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                        : getCurrentTimelineStatus('registration_start') === 'current'
                          ? 'bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse'
                          : 'bg-gradient-to-br from-gray-300 to-gray-400'
                    }`}>
                      {getCurrentTimelineStatus('registration_start') === 'completed' ? (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <path d="M9 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4"/>
                          <path d="M9 3h6a2 2 0 0 1 2 2v1H7V5a2 2 0 0 1 2-2z"/>
                          <path d="M9 14l2 2l4-4"/>
                        </svg>
                      )}
                      {getCurrentTimelineStatus('registration_start') === 'current' && (
                        <div className="absolute inset-0 rounded-full bg-yellow-400 opacity-30 animate-ping"></div>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-xs font-semibold text-gray-800 whitespace-nowrap">
                        Registration Opens
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {registrationStart ? (
                          <>
                            <div className="font-medium">{registrationStart.dayWithSuffix}</div>
                            {event.registration_start_time && (
                              <div className="text-gray-500 text-xs">{event.registration_start_time || registrationStart.time}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">TBA</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Connecting Line 1 */}
                  <div className="hidden lg:flex flex-1 items-center justify-center px-2">
                    <div className={`h-0.5 w-full rounded-full transition-all duration-500 ${
                      getCurrentTimelineStatus('registration_start') === 'completed'
                        ? 'bg-gradient-to-r from-green-400 to-yellow-400'
                        : 'bg-gradient-to-r from-gray-200 to-gray-300'
                    }`}></div>
                  </div>

                  {/* Registration Closes */}
                  <div className={`flex flex-col items-center group transition-all duration-300 ${
                    getCurrentTimelineStatus('registration_end') === 'completed' 
                      ? 'scale-105' 
                      : getCurrentTimelineStatus('registration_end') === 'current' 
                        ? 'scale-110' 
                        : 'scale-100'
                  }`}>
                    <div className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${
                      getCurrentTimelineStatus('registration_end') === 'completed'
                        ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                        : getCurrentTimelineStatus('registration_end') === 'current'
                          ? 'bg-gradient-to-br from-red-400 to-pink-500 animate-pulse'
                          : 'bg-gradient-to-br from-gray-300 to-gray-400'
                    }`}>
                      {getCurrentTimelineStatus('registration_end') === 'completed' ? (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12,6 12,12 16,14"/>
                        </svg>
                      )}
                      {getCurrentTimelineStatus('registration_end') === 'current' && (
                        <div className="absolute inset-0 rounded-full bg-red-400 opacity-30 animate-ping"></div>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-xs font-semibold text-gray-800 whitespace-nowrap">
                        Registration Closes
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {registrationEnd ? (
                          <>
                            <div className="font-medium">{registrationEnd.dayWithSuffix}</div>
                            {event.registration_end_time && (
                              <div className="text-gray-500 text-xs">{event.registration_end_time || registrationEnd.time}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">TBA</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Connecting Line 2 */}
                  <div className="hidden lg:flex flex-1 items-center justify-center px-2">
                    <div className={`h-0.5 w-full rounded-full transition-all duration-500 ${
                      getCurrentTimelineStatus('registration_end') === 'completed'
                        ? 'bg-gradient-to-r from-red-400 to-green-400'
                        : 'bg-gradient-to-r from-gray-200 to-gray-300'
                    }`}></div>
                  </div>

                  {/* Event Starts */}
                  <div className={`flex flex-col items-center group transition-all duration-300 ${
                    getCurrentTimelineStatus('event_start') === 'completed' 
                      ? 'scale-105' 
                      : getCurrentTimelineStatus('event_start') === 'current' 
                        ? 'scale-110' 
                        : 'scale-100'
                  }`}>
                    <div className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${
                      getCurrentTimelineStatus('event_start') === 'completed'
                        ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                        : getCurrentTimelineStatus('event_start') === 'current'
                          ? 'bg-gradient-to-br from-orange-400 to-red-500 animate-pulse'
                          : 'bg-gradient-to-br from-gray-300 to-gray-400'
                    }`}>
                      {getCurrentTimelineStatus('event_start') === 'completed' ? (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      )}
                      {getCurrentTimelineStatus('event_start') === 'current' && (
                        <div className="absolute inset-0 rounded-full bg-orange-400 opacity-30 animate-ping"></div>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-xs font-semibold text-gray-800 whitespace-nowrap">
                        Event Starts
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {startDate ? (
                          <>
                            <div className="font-medium">{startDate.dayWithSuffix}</div>
                            {event.start_time && (
                              <div className="text-gray-500 text-xs">{event.start_time || startDate.time}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">TBA</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Connecting Line 3 */}
                  <div className="hidden lg:flex flex-1 items-center justify-center px-2">
                    <div className={`h-0.5 w-full rounded-full transition-all duration-500 ${
                      getCurrentTimelineStatus('event_start') === 'completed'
                        ? 'bg-gradient-to-r from-orange-400 to-blue-400'
                        : 'bg-gradient-to-r from-gray-200 to-gray-300'
                    }`}></div>
                  </div>

                  {/* Event Ends */}
                  <div className={`flex flex-col items-center group transition-all duration-300 ${
                    getCurrentTimelineStatus('event_end') === 'completed' 
                      ? 'scale-105' 
                      : getCurrentTimelineStatus('event_end') === 'current' 
                        ? 'scale-110' 
                        : 'scale-100'
                  }`}>
                    <div className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${
                      getCurrentTimelineStatus('event_end') === 'completed'
                        ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                        : getCurrentTimelineStatus('event_end') === 'current'
                          ? 'bg-gradient-to-br from-blue-400 to-indigo-500 animate-pulse'
                          : 'bg-gradient-to-br from-gray-300 to-gray-400'
                    }`}>
                      {getCurrentTimelineStatus('event_end') === 'completed' ? (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                      )}
                      {getCurrentTimelineStatus('event_end') === 'current' && (
                        <div className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping"></div>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-xs font-semibold text-gray-800 whitespace-nowrap">
                        Event Ends
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {endDate ? (
                          <>
                            <div className="font-medium">{endDate.dayWithSuffix}</div>
                            {event.end_time && (
                              <div className="text-gray-500 text-xs">{event.end_time || endDate.time}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">TBA</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Connecting Line 4 */}
                  <div className="hidden lg:flex flex-1 items-center justify-center px-2">
                    <div className={`h-0.5 w-full rounded-full transition-all duration-500 ${
                      getCurrentTimelineStatus('event_end') === 'completed'
                        ? 'bg-gradient-to-r from-blue-400 to-purple-400'
                        : 'bg-gradient-to-r from-gray-200 to-gray-300'
                    }`}></div>
                  </div>

                  {/* Certificate Available */}
                  <div className={`flex flex-col items-center group transition-all duration-300 ${
                    getCurrentTimelineStatus('certificate') === 'completed' 
                      ? 'scale-105' 
                      : getCurrentTimelineStatus('certificate') === 'current' 
                        ? 'scale-110' 
                        : 'scale-100'
                  }`}>
                    <div className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${
                      getCurrentTimelineStatus('certificate') === 'completed'
                        ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                        : getCurrentTimelineStatus('certificate') === 'current'
                          ? 'bg-gradient-to-br from-purple-400 to-indigo-500 animate-pulse'
                          : 'bg-gradient-to-br from-gray-300 to-gray-400'
                    }`}>
                      {getCurrentTimelineStatus('certificate') === 'completed' ? (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <circle cx="12" cy="8" r="7"/>
                          <path d="M8.5 14l-2.5 7l6-3l6 3l-2.5-7"/>
                        </svg>
                      )}
                      {getCurrentTimelineStatus('certificate') === 'current' && (
                        <div className="absolute inset-0 rounded-full bg-purple-400 opacity-30 animate-ping"></div>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-xs font-semibold text-gray-800 whitespace-nowrap">
                        Certificate Available
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {event.certificate_end_date ? (
                          <>
                            <div className="font-medium">{formatDate(event.certificate_end_date)?.dayWithSuffix}</div>
                            {event.certificate_available_time && (
                              <div className="text-gray-500 text-xs">{event.certificate_available_time}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">After event</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Timeline Connector */}
                <div className="lg:hidden absolute left-6 top-16 bottom-16 w-0.5 bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200"></div>
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

                      {/* Debug info - remove this after fixing */}
                      {console.log('Debug - Organizers:', event.organizers)}
                      {console.log('Debug - Contacts:', event.contacts)}

                      {/* Display organizers from array */}
                      {event.organizers && Array.isArray(event.organizers) && event.organizers.length > 0 && event.organizers.map((organizer, index) => {
                        if (!organizer || typeof organizer !== 'string') return null;
                        
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
                                {event.contacts && Array.isArray(event.contacts) && event.contacts.length > 0 && event.contacts.map((contact, contactIndex) => {
                                  if (!contact || !contact.name || !contact.contact) return null;
                                  
                                  const contactName = contact.name.toLowerCase().trim();
                                  const organizerNameLower = organizerName.toLowerCase().trim();
                                  
                                  // Try to match organizer with contact
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
                      {(!event.organizers || !Array.isArray(event.organizers) || event.organizers.length === 0) && event.organizer_name && (
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

                      {/* Display contacts only (if no organizers found) */}
                      {(!event.organizers || !Array.isArray(event.organizers) || event.organizers.length === 0) && 
                       !event.organizer_name && 
                       event.contacts && Array.isArray(event.contacts) && event.contacts.length > 0 && 
                       event.contacts.map((contact, index) => {
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
                  {(!event.organizers || !Array.isArray(event.organizers) || event.organizers.length === 0) && 
                   !event.organizer_name && 
                   (!event.contacts || !Array.isArray(event.contacts) || event.contacts.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                      </svg>
                      <p>Organizer information will be updated soon.</p>
                      {/* Debug info - remove after fixing */}
                      <div className="text-xs text-red-500 mt-2">
                        Debug: organizers={event.organizers ? JSON.stringify(event.organizers) : 'null'}, 
                        contacts={event.contacts ? JSON.stringify(event.contacts) : 'null'}
                      </div>
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
                          {/* {event.registration_stats.total_participants && event.registration_stats.total_participants > 0 && (
                            <div className="text-xs text-gray-500">{event.registration_stats.total_participants} total participants</div>
                          )} */}
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
