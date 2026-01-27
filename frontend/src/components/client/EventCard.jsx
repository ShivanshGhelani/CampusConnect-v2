import React from 'react';
import { Link } from 'react-router-dom';

const EventCard = ({ event }) => {
  // Format date helper
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      dateOnly: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
      timeOnly: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  // Format venue helper
  const formatVenue = (venue) => {
    if (!venue) return 'Venue TBA';
    return venue.length > 30 ? venue.substring(0, 30) + '...' : venue;
  };

  // Get status badge info
  const getStatusInfo = () => {
    if (event.status === 'ongoing') {
      return {
        bgClass: 'bg-green-50',
        iconClass: 'bg-green-500 animate-pulse',
        textClass: 'text-green-700',
        label: 'LIVE NOW'
      };
    } else if (event.status === 'upcoming') {
      return {
        bgClass: 'bg-blue-50',
        iconClass: 'bg-blue-500',
        textClass: 'text-blue-700',
        label: 'UPCOMING'
      };
    } else if (event.status === 'completed') {
      // Check if feedback is active
      const isCertificateBased = event.certificate_based === true || event.is_certificate_based === true;
      const feedbackEndDate = event.feedback_end_date || event.feedback_form?.end_date;
      
      if (!isCertificateBased && feedbackEndDate) {
        const feedbackDeadline = new Date(feedbackEndDate);
        const now = new Date();
        if (now <= feedbackDeadline) {
          return {
            bgClass: 'bg-green-50',
            iconClass: 'bg-green-500',
            textClass: 'text-green-700',
            label: 'FEEDBACK OPEN'
          };
        }
      }
      
      return {
        bgClass: 'bg-gray-50',
        iconClass: 'bg-gray-400',
        textClass: 'text-gray-600',
        label: 'COMPLETED'
      };
    } else {
      return {
        bgClass: 'bg-gray-50',
        iconClass: 'bg-gray-400',
        textClass: 'text-gray-600',
        label: 'EVENT'
      };
    }
  };

  // Get sub-status info
  const getSubStatusInfo = () => {
    if (event.status === 'ongoing') {
      if (event.sub_status === 'certificate_available') {
        return { text: 'Certificates Available', class: 'text-purple-600' };
      } else if (event.sub_status === 'event_started') {
        return { text: 'Attendance Ongoing', class: 'text-orange-600' };
      } else {
        return { text: 'In Progress', class: 'text-green-600' };
      }
    } else if (event.status === 'upcoming') {
      if (event.sub_status === 'registration_not_started') {
        return { text: 'Registration Not Started', class: 'text-orange-600' };
      } else if (event.sub_status === 'registration_open') {
        return { text: 'Registration Open', class: 'text-blue-600' };
      } else {
        return { text: 'Registration Closed', class: 'text-red-600' };
      }
    } else if (event.status === 'completed') {
      // Check if feedback is active
      const isCertificateBased = event.certificate_based === true || event.is_certificate_based === true;
      const feedbackEndDate = event.feedback_end_date || event.feedback_form?.end_date;
      
      if (!isCertificateBased && feedbackEndDate) {
        const feedbackDeadline = new Date(feedbackEndDate);
        const now = new Date();
        if (now <= feedbackDeadline) {
          // Calculate days remaining
          const daysRemaining = Math.ceil((feedbackDeadline - now) / (1000 * 60 * 60 * 24));
          return { 
            text: `Feedback closes in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`, 
            class: 'text-green-600' 
          };
        }
      }
      
      return { text: 'Completed', class: 'text-gray-600' };
    }
    return { text: '', class: '' };
  };

  // Get action button info
  const getActionButton = () => {
    if (event.status === 'ongoing') {
      if (event.sub_status === 'certificate_available') {
        return {
          bgClass: 'bg-purple-600 hover:bg-purple-700',
          icon: 'fas fa-certificate',
          text: 'Collect Certificate'
        };
      } else if (event.sub_status === 'event_started') {
        return {
          bgClass: 'bg-orange-600 hover:bg-orange-700',
          icon: 'fas fa-broadcast-tower',
          text: 'Event Live'
        };
      } else {
        return {
          bgClass: 'bg-green-600 hover:bg-green-700',
          icon: 'fas fa-play',
          text: 'Join Live Event'
        };
      }
    } else if (event.status === 'upcoming') {
      if (event.sub_status === 'registration_not_started') {
        return {
          bgClass: 'bg-blue-600 hover:bg-blue-700',
          icon: 'fas fa-eye',
          text: 'View Details'
        };
      } else if (event.sub_status === 'registration_open') {
        return {
          bgClass: 'bg-blue-600 hover:bg-blue-700',
          icon: 'fas fa-user-plus',
          text: 'Register Now'
        };
      } else {
        return {
          bgClass: 'bg-red-600 hover:bg-red-700',
          icon: 'fas fa-times-circle',
          text: 'Registration Closed'
        };
      }
    } else if (event.status === 'completed') {
      // Check if feedback is available
      const isCertificateBased = event.certificate_based === true || event.is_certificate_based === true;
      const feedbackEndDate = event.feedback_end_date || event.feedback_form?.end_date;
      
      if (!isCertificateBased && feedbackEndDate) {
        const feedbackDeadline = new Date(feedbackEndDate);
        const now = new Date();
        if (now <= feedbackDeadline) {
          // Show feedback button
          return {
            bgClass: 'bg-green-600 hover:bg-green-700',
            icon: 'fas fa-comment-dots',
            text: 'Submit Feedback'
          };
        }
      }
      
      // Default for completed events
      return {
        bgClass: 'bg-gray-600 hover:bg-gray-700',
        icon: 'fas fa-eye',
        text: 'View Details'
      };
    } else {
      return {
        bgClass: 'bg-gray-600 hover:bg-gray-700',
        icon: 'fas fa-eye',
        text: 'View Details'
      };
    }
  };

  const dateInfo = formatDate(event.start_datetime);
  const statusInfo = getStatusInfo();
  const subStatusInfo = getSubStatusInfo();
  const actionButton = getActionButton();

  return (
    <div 
      className="event-card bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 flex flex-col h-full transform hover:-translate-y-1"
      data-category={event.event_type?.toLowerCase() || 'other'}
      data-name={event.event_name?.toLowerCase() || ''}
      data-department={event.organizing_department?.toLowerCase() || ''}
    >
      {/* Status Header */}
      <div className={`px-4 py-3 ${statusInfo.bgClass}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 ${statusInfo.iconClass} rounded-full`}></div>
            <span className={`${statusInfo.textClass} font-bold text-sm uppercase tracking-wide`}>
              {statusInfo.label}
            </span>
          </div>
          <span className="text-xs text-gray-500 font-medium bg-white px-2 py-1 rounded-full">
            {event.event_type || 'General'}
          </span>
        </div>
      </div>

      {/* Event Content */}
      <div className="p-5 flex-grow flex flex-col">
        <h3 className="font-bold text-xl text-gray-900 mb-2 leading-tight line-clamp-2">
          {event.event_name}
        </h3>

        <div className="mb-4 flex-grow">
          {event.short_description || event.description ? (
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
              {event.short_description || 
               (event.description && event.description.length > 100 
                 ? event.description.substring(0, 100) + '...' 
                 : event.description)}
            </p>
          ) : (
            <p className="text-gray-400 text-sm italic">No description available</p>
          )}
        </div>

        {/* Event Details */}
        <div className="space-y-2 mb-5">
          {/* Date */}
          <div className="flex items-center text-sm">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2 flex-shrink-0">
              <i className="fas fa-calendar text-gray-600 text-xs"></i>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 text-xs truncate">
                {dateInfo.dateOnly}
              </div>
              <div className="text-gray-500 text-xs">
                {dateInfo.weekday}
              </div>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center text-sm">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2 flex-shrink-0">
              <i className="fas fa-clock text-gray-600 text-xs"></i>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 text-xs">
                {dateInfo.timeOnly}
              </div>
              <div className="text-xs font-medium">
                <span className={subStatusInfo.class}>
                  {subStatusInfo.text}
                </span>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center text-sm">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2 flex-shrink-0">
              <i className="fas fa-map-marker-alt text-gray-600 text-xs"></i>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 text-xs truncate">
                {formatVenue(event.venue)}
              </div>
              <div className="text-gray-500 text-xs truncate">
                {event.organizing_department || 'Campus Event'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-auto">
          <Link
            to={`/client/events/${event.event_id}`}
            className={`block w-full ${actionButton.bgClass} text-white text-center py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-sm text-sm`}
          >
            <i className={`${actionButton.icon} mr-2`}></i>
            {actionButton.text}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
