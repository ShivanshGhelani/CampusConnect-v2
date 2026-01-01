import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import Dropdown from '../../components/ui/Dropdown';

function EventDetailPreview() {
  const navigate = useNavigate();
  
  // State for demo controls
  const [demoConfig, setDemoConfig] = useState({
    eventStatus: 'upcoming',
    eventType: 'workshop',
    userLoggedIn: true,
    userType: 'student',
    registrationStatus: 'not_registered',
    attendanceMarked: false,
    feedbackSubmitted: false,
    certificateAvailable: false,
    currentPhase: 'registration_open',
    seatsAvailable: true
  });

  // Event Status Options
  const eventStatusOptions = [
    { value: 'upcoming', label: 'Upcoming', description: 'Event has not started yet' },
    { value: 'ongoing', label: 'Ongoing', description: 'Event is currently happening' },
    { value: 'completed', label: 'Completed', description: 'Event has ended' },
    { value: 'cancelled', label: 'Cancelled', description: 'Event was cancelled' }
  ];

  // Event Type Options
  const eventTypeOptions = [
    { value: 'workshop', label: 'Workshop', description: 'Interactive learning session' },
    { value: 'seminar', label: 'Seminar', description: 'Educational presentation' },
    { value: 'webinar', label: 'Webinar', description: 'Online seminar' },
    { value: 'competition', label: 'Competition', description: 'Competitive event' },
    { value: 'cultural', label: 'Cultural', description: 'Cultural activity' },
    { value: 'sports', label: 'Sports', description: 'Sports event' },
    { value: 'hackathon', label: 'Hackathon', description: 'Coding competition' },
    { value: 'conference', label: 'Conference', description: 'Large gathering' }
  ];

  // Current Phase Options
  const phaseOptions = [
    { value: 'before_registration', label: 'Before Registration', description: 'Registration not yet open' },
    { value: 'registration_open', label: 'Registration Open', description: 'Users can register' },
    { value: 'registration_closed', label: 'Registration Closed', description: 'Registration period ended' },
    { value: 'event_ongoing', label: 'Event Ongoing', description: 'Event is happening now' },
    { value: 'event_completed', label: 'Event Completed', description: 'Event finished' }
  ];

  // User Type Options
  const userTypeOptions = [
    { value: 'student', label: 'Student' },
    { value: 'faculty', label: 'Faculty' },
    { value: 'admin', label: 'Admin' }
  ];

  // Registration Status Options
  const registrationStatusOptions = [
    { value: 'not_registered', label: 'Not Registered', description: 'User has not registered' },
    { value: 'registered', label: 'Registered', description: 'User is registered' },
    { value: 'waitlisted', label: 'Waitlisted', description: 'User is on waiting list' },
    { value: 'cancelled', label: 'Cancelled', description: 'Registration cancelled' }
  ];

  // Boolean Options
  const booleanOptions = [
    { value: true, label: 'Yes' },
    { value: false, label: 'No' }
  ];

  // Get status badge configuration
  const getStatusBadge = () => {
    switch (demoConfig.eventStatus) {
      case 'upcoming':
        return { text: 'Upcoming', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'ongoing':
        return { text: 'Ongoing', color: 'bg-green-100 text-green-800 border-green-200' };
      case 'completed':
        return { text: 'Completed', color: 'bg-gray-100 text-gray-800 border-gray-200' };
      case 'cancelled':
        return { text: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200' };
      default:
        return { text: 'Unknown', color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  // Get registration button/badge
  const getRegistrationButton = () => {
    if (!demoConfig.userLoggedIn) {
      return {
        type: 'button',
        text: 'Login to Register',
        icon: 'fa-sign-in-alt',
        color: 'bg-blue-600 hover:bg-blue-700 text-white',
        disabled: false
      };
    }

    if (demoConfig.registrationStatus === 'registered') {
      return {
        type: 'badge',
        text: 'You\'re Registered!',
        icon: 'fa-check-circle',
        color: 'bg-green-100 text-green-800 border-green-200'
      };
    }

    if (demoConfig.registrationStatus === 'waitlisted') {
      return {
        type: 'badge',
        text: 'On Waiting List',
        icon: 'fa-clock',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      };
    }

    if (demoConfig.registrationStatus === 'cancelled') {
      return {
        type: 'badge',
        text: 'Registration Cancelled',
        icon: 'fa-times-circle',
        color: 'bg-red-100 text-red-800 border-red-200'
      };
    }

    // Not registered
    if (demoConfig.currentPhase === 'before_registration') {
      return {
        type: 'button',
        text: 'Registration Opens Soon',
        icon: 'fa-clock',
        color: 'bg-gray-400 text-white cursor-not-allowed',
        disabled: true
      };
    }

    if (demoConfig.currentPhase === 'registration_open' && demoConfig.seatsAvailable) {
      return {
        type: 'button',
        text: 'Register Now',
        icon: 'fa-user-plus',
        color: 'bg-green-600 hover:bg-green-700 text-white',
        disabled: false
      };
    }

    if (demoConfig.currentPhase === 'registration_open' && !demoConfig.seatsAvailable) {
      return {
        type: 'button',
        text: 'Join Waiting List',
        icon: 'fa-list-ul',
        color: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        disabled: false
      };
    }

    if (demoConfig.currentPhase === 'registration_closed' || demoConfig.eventStatus === 'ongoing' || demoConfig.eventStatus === 'completed') {
      return {
        type: 'button',
        text: 'Registration Closed',
        icon: 'fa-ban',
        color: 'bg-red-400 text-white cursor-not-allowed',
        disabled: true
      };
    }

    return null;
  };

  // Get action buttons
  const getActionButtons = () => {
    const buttons = [];

    if (!demoConfig.userLoggedIn || demoConfig.registrationStatus !== 'registered') {
      return buttons;
    }

    // Attendance button (only during event)
    if (demoConfig.eventStatus === 'ongoing' && !demoConfig.attendanceMarked) {
      buttons.push({
        text: 'Mark Attendance',
        icon: 'fa-clipboard-check',
        color: 'bg-blue-600 hover:bg-blue-700 text-white',
        disabled: false
      });
    }

    if (demoConfig.attendanceMarked) {
      buttons.push({
        text: 'Attendance Confirmed',
        icon: 'fa-check-circle',
        color: 'bg-green-600 text-white cursor-not-allowed',
        disabled: true
      });
    }

    // Feedback button
    if ((demoConfig.eventStatus === 'ongoing' || demoConfig.eventStatus === 'completed') && !demoConfig.feedbackSubmitted && demoConfig.attendanceMarked) {
      buttons.push({
        text: 'Submit Feedback',
        icon: 'fa-comment-dots',
        color: 'bg-purple-600 hover:bg-purple-700 text-white',
        disabled: false
      });
    }

    if (demoConfig.feedbackSubmitted) {
      buttons.push({
        text: 'Feedback Submitted',
        icon: 'fa-check-circle',
        color: 'bg-purple-600 text-white cursor-not-allowed',
        disabled: true
      });
    }

    // Certificate button
    if (demoConfig.certificateAvailable && demoConfig.attendanceMarked && demoConfig.feedbackSubmitted) {
      buttons.push({
        text: 'Download Certificate',
        icon: 'fa-certificate',
        color: 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white',
        disabled: false
      });
    }

    return buttons;
  };

  // Get timeline status
  const getTimelinePhases = () => {
    const now = new Date();
    
    return [
      {
        title: 'Registration Period',
        date: 'Jan 1 - Jan 10, 2026',
        icon: 'fa-calendar-check',
        status: demoConfig.currentPhase === 'before_registration' ? 'pending' :
                demoConfig.currentPhase === 'registration_open' ? 'active' :
                'completed',
        message: demoConfig.currentPhase === 'before_registration' ? 'Starts in 5 days' :
                 demoConfig.currentPhase === 'registration_open' ? 'Registration is open!' :
                 'Registration closed'
      },
      {
        title: 'Event Day',
        date: 'Jan 15, 2026 • 10:00 AM',
        icon: 'fa-calendar-day',
        status: demoConfig.eventStatus === 'ongoing' ? 'active' :
                demoConfig.eventStatus === 'completed' ? 'completed' :
                'pending',
        message: demoConfig.eventStatus === 'ongoing' ? 'Event is happening now!' :
                 demoConfig.eventStatus === 'completed' ? 'Event completed' :
                 demoConfig.attendanceMarked ? 'Attendance marked' : 'Event starts soon'
      },
      {
        title: 'Feedback & Certificates',
        date: 'After event completion',
        icon: 'fa-award',
        status: demoConfig.eventStatus === 'completed' && demoConfig.certificateAvailable ? 'completed' :
                demoConfig.eventStatus === 'completed' ? 'active' :
                'pending',
        message: demoConfig.certificateAvailable ? 'Certificate available!' :
                 demoConfig.feedbackSubmitted ? 'Waiting for certificate' :
                 demoConfig.eventStatus === 'completed' ? 'Submit feedback to get certificate' :
                 'Available after event'
      }
    ];
  };

  const statusBadge = getStatusBadge();
  const registrationButton = getRegistrationButton();
  const actionButtons = getActionButtons();
  const timelinePhases = getTimelinePhases();

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Event Detail Preview</h1>
              <p className="text-gray-600 mt-1">See how the UI looks with different states</p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Configuration Panel - Sticky Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 sticky top-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i className="fas fa-sliders-h text-blue-600"></i>
                Controls
              </h2>

              <div className="space-y-4">
                {/* Event Status */}
                <Dropdown
                  label="Event Status"
                  options={eventStatusOptions}
                  value={demoConfig.eventStatus}
                  onChange={(value) => setDemoConfig({...demoConfig, eventStatus: value})}
                  size="sm"
                />

                {/* Current Phase */}
                <Dropdown
                  label="Current Phase"
                  options={phaseOptions}
                  value={demoConfig.currentPhase}
                  onChange={(value) => setDemoConfig({...demoConfig, currentPhase: value})}
                  size="sm"
                />

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="font-semibold text-gray-700 mb-3 text-sm">User State</h3>
                  
                  {/* User Logged In */}
                  <Dropdown
                    label="User Logged In?"
                    options={booleanOptions}
                    value={demoConfig.userLoggedIn}
                    onChange={(value) => setDemoConfig({...demoConfig, userLoggedIn: value})}
                    size="sm"
                  />

                  {demoConfig.userLoggedIn && (
                    <>
                      {/* Registration Status */}
                      <div className="mt-4">
                        <Dropdown
                          label="Registration Status"
                          options={registrationStatusOptions}
                          value={demoConfig.registrationStatus}
                          onChange={(value) => setDemoConfig({...demoConfig, registrationStatus: value})}
                          size="sm"
                        />
                      </div>

                      {/* Seats Available */}
                      <div className="mt-4">
                        <Dropdown
                          label="Seats Available?"
                          options={booleanOptions}
                          value={demoConfig.seatsAvailable}
                          onChange={(value) => setDemoConfig({...demoConfig, seatsAvailable: value})}
                          size="sm"
                        />
                      </div>

                      {demoConfig.registrationStatus === 'registered' && (
                        <>
                          {/* Attendance Marked */}
                          <div className="mt-4">
                            <Dropdown
                              label="Attendance Marked?"
                              options={booleanOptions}
                              value={demoConfig.attendanceMarked}
                              onChange={(value) => setDemoConfig({...demoConfig, attendanceMarked: value})}
                              size="sm"
                            />
                          </div>

                          {/* Feedback Submitted */}
                          <div className="mt-4">
                            <Dropdown
                              label="Feedback Submitted?"
                              options={booleanOptions}
                              value={demoConfig.feedbackSubmitted}
                              onChange={(value) => setDemoConfig({...demoConfig, feedbackSubmitted: value})}
                              size="sm"
                            />
                          </div>

                          {/* Certificate Available */}
                          <div className="mt-4">
                            <Dropdown
                              label="Certificate Available?"
                              options={booleanOptions}
                              value={demoConfig.certificateAvailable}
                              onChange={(value) => setDemoConfig({...demoConfig, certificateAvailable: value})}
                              size="sm"
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-3 space-y-6">
            {/* ACTUAL EVENT DETAIL HEADER - This is what shows in real EventDetail page */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Hero Section with Image */}
              <div className="relative h-64 bg-gradient-to-r from-blue-600 to-purple-600">
                <div className="absolute inset-0 flex items-center justify-center">
                  <i className="fas fa-image text-white text-6xl opacity-30"></i>
                </div>
              </div>

              {/* Header Content */}
              <div className="p-8">
                {/* Title and Status Badge */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                      {demoConfig.eventType.charAt(0).toUpperCase() + demoConfig.eventType.slice(1)} Event Title
                    </h1>
                    <div className="flex items-center gap-3 text-gray-600">
                      <span className="flex items-center gap-1">
                        <i className="fas fa-calendar"></i>
                        Jan 15, 2026
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="fas fa-clock"></i>
                        10:00 AM - 4:00 PM
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="fas fa-map-marker-alt"></i>
                        Main Hall
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <div className={`px-4 py-2 rounded-lg border-2 font-semibold ${statusBadge.color}`}>
                    {statusBadge.text}
                  </div>
                </div>

                {/* Registration Section */}
                <div className="flex items-center gap-4 mb-6">
                  {registrationButton && (
                    registrationButton.type === 'button' ? (
                      <button
                        disabled={registrationButton.disabled}
                        className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${registrationButton.color}`}
                      >
                        <i className={`fas ${registrationButton.icon}`}></i>
                        {registrationButton.text}
                      </button>
                    ) : (
                      <div className={`px-4 py-2 rounded-lg border-2 font-semibold flex items-center gap-2 ${registrationButton.color}`}>
                        <i className={`fas ${registrationButton.icon}`}></i>
                        {registrationButton.text}
                      </div>
                    )
                  )}

                  {/* Action Buttons */}
                  {actionButtons.map((button, index) => (
                    <button
                      key={index}
                      disabled={button.disabled}
                      className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${button.color}`}
                    >
                      <i className={`fas ${button.icon}`}></i>
                      {button.text}
                    </button>
                  ))}
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Seats</p>
                    <p className="text-2xl font-bold text-gray-900">100</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Available</p>
                    <p className={`text-2xl font-bold ${demoConfig.seatsAvailable ? 'text-green-600' : 'text-red-600'}`}>
                      {demoConfig.seatsAvailable ? '45' : '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Registered</p>
                    <p className="text-2xl font-bold text-blue-600">55</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTUAL TIMELINE - This is what shows in real EventDetail page */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <i className="fas fa-stream text-blue-600"></i>
                Event Timeline
              </h2>

              <div className="space-y-6">
                {timelinePhases.map((phase, index) => {
                  const isCompleted = phase.status === 'completed';
                  const isActive = phase.status === 'active';
                  const isPending = phase.status === 'pending';

                  return (
                    <div key={index} className="relative">
                      {/* Connecting Line */}
                      {index < timelinePhases.length - 1 && (
                        <div className={`absolute left-6 top-14 w-0.5 h-14 ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                      )}

                      {/* Phase Item */}
                      <div className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                        isActive ? 'border-blue-500 bg-blue-50 shadow-md' :
                        isCompleted ? 'border-green-500 bg-green-50' :
                        'border-gray-200 bg-white'
                      }`}>
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                          isCompleted ? 'bg-green-500 border-green-500 text-white' :
                          isActive ? 'bg-blue-500 border-blue-500 text-white animate-pulse' :
                          'bg-white border-gray-300 text-gray-400'
                        }`}>
                          {isCompleted ? (
                            <i className="fas fa-check text-lg"></i>
                          ) : isActive ? (
                            <i className={`fas ${phase.icon} text-lg`}></i>
                          ) : (
                            <i className={`fas ${phase.icon} text-lg`}></i>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <h3 className={`text-lg font-bold mb-1 ${
                            isActive ? 'text-blue-700' :
                            isCompleted ? 'text-green-700' :
                            'text-gray-500'
                          }`}>
                            {phase.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">{phase.date}</p>
                          <p className={`text-sm font-medium ${
                            isActive ? 'text-blue-600' :
                            isCompleted ? 'text-green-600' :
                            'text-gray-500'
                          }`}>
                            {phase.message}
                          </p>
                        </div>

                        {/* Status Label */}
                        <div className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${
                          isCompleted ? 'bg-green-100 text-green-800' :
                          isActive ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {isCompleted ? 'Completed' : isActive ? 'Active' : 'Pending'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Helper Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <i className="fas fa-info-circle text-blue-600 mt-0.5"></i>
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">This is how it looks in the actual EventDetail page</p>
                  <p>Use the controls on the left to test different states and see how the design changes!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default EventDetailPreview;
