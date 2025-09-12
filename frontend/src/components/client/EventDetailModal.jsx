import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

const EventDetailModal = ({ isOpen, onClose, selectedEventDetail }) => {
  
  
  
  

  // Lock body scroll when modal is open (especially important for mobile)
  useEffect(() => {
    if (isOpen) {
      
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      
    } else {
      
      document.body.style.overflow = '';
      document.body.style.height = '';
      
    }
    
    // Cleanup on unmount
    return () => {
      
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [isOpen]);

  // Debug useEffect to track component lifecycle
  useEffect(() => {
    
    
    
    if (isOpen) {
      // Check if modal exists in DOM
      setTimeout(() => {
        const modalElement = document.querySelector('[data-event-modal="true"]');
        
        if (modalElement) {
          const computedStyle = window.getComputedStyle(modalElement);
          console.log('EventDetailModal: Computed styles:', {
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            zIndex: computedStyle.zIndex,
            position: computedStyle.position
          });
        }
      }, 100);
    }
    
    return () => {
      
    };
  }, [isOpen, selectedEventDetail]);

  if (!isOpen || !selectedEventDetail) {
    
    return null;
  }

  
  
  

  // Use createPortal to render the modal directly to document.body
  const modalContent = (
    <div 
      data-event-modal="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999999,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        visibility: 'visible',
        opacity: 1,
        pointerEvents: 'auto'
      }}
      onClick={(e) => {
        
        // Allow clicking backdrop to close on desktop
        if (e.target === e.currentTarget && typeof window !== 'undefined' && window.innerWidth >= 1024) {
          onClose();
        }
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'auto' : '100%',
          height: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'auto' : '100%',
          maxWidth: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '42rem' : '100%',
          maxHeight: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '90vh' : '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '1.5rem' : '0',
          opacity: 1,
          visibility: 'visible',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          margin: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '2rem' : '0',
          border: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '1px solid #e5e7eb' : 'none'
        }}
        onClick={(e) => {
          
          e.stopPropagation();
        }}
      >
        {/* Modal Header */}
        <div className="px-4 lg:px-8 py-4 lg:py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg lg:text-xl font-bold text-slate-900 truncate">
                  {selectedEventDetail.event.event_name}
                </h3>
                <span className="text-xs lg:text-sm text-slate-500 font-medium">Event Details & Status</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all duration-200 group flex-shrink-0 ml-3"
            >
              <svg className="w-4 h-4 lg:w-5 lg:h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-gray-50">
          <div className="space-y-4 lg:space-y-6">
            {/* Event Information */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl lg:rounded-2xl p-4 lg:p-6">
              <h4 className="text-base lg:text-lg font-bold text-slate-900 mb-3 lg:mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Event Information
              </h4>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                <div className="bg-white rounded-lg lg:rounded-xl p-3 lg:p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-3 h-3 lg:w-4 lg:h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs lg:text-sm font-medium text-slate-600">Date & Time</span>
                  </div>
                  <p className="text-xs lg:text-sm font-semibold text-slate-900">
                    {selectedEventDetail.event.start_datetime ?
                      new Date(selectedEventDetail.event.start_datetime).toLocaleString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'TBD'
                    }
                  </p>
                </div>

                <div className="bg-white rounded-lg lg:rounded-xl p-3 lg:p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-3 h-3 lg:w-4 lg:h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-xs lg:text-sm font-medium text-slate-600">Venue</span>
                  </div>
                  <p className="text-xs lg:text-sm font-semibold text-slate-900">
                    {selectedEventDetail.event.venue && selectedEventDetail.event.venue !== 'N/A' ? selectedEventDetail.event.venue : 'TBD'}
                  </p>
                </div>

                <div className="bg-white rounded-lg lg:rounded-xl p-3 lg:p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-3 h-3 lg:w-4 lg:h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="text-xs lg:text-sm font-medium text-slate-600">Category</span>
                  </div>
                  <p className="text-xs lg:text-sm font-semibold text-slate-900">
                    {selectedEventDetail.event.category || 'General'}
                  </p>
                </div>

                <div className="bg-white rounded-lg lg:rounded-xl p-3 lg:p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-3 h-3 lg:w-4 lg:h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs lg:text-sm font-medium text-slate-600">Registration ID</span>
                  </div>
                  <p className="text-xs lg:text-sm font-semibold text-slate-900 font-mono">
                    {selectedEventDetail.registration?.registrar_id || selectedEventDetail.registration?.registration_id || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Participation Status */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl lg:rounded-2xl p-4 lg:p-6">
              <h4 className="text-base lg:text-lg font-bold text-slate-900 mb-3 lg:mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Your Participation Status
              </h4>

              <div className="grid grid-cols-1 gap-3 lg:gap-4">
                {/* Attendance Status */}
                <div className="bg-white rounded-lg lg:rounded-xl p-3 lg:p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 lg:w-4 lg:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <span className="text-xs lg:text-sm font-semibold text-slate-900">Attendance</span>
                    </div>
                    {selectedEventDetail.participation_status?.attended ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Marked
                      </span>
                    ) : selectedEventDetail.event.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-lg text-xs font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Not Marked
                      </span>
                    ) : selectedEventDetail.event.status === 'ongoing' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-lg text-xs font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Available Soon
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Pending
                      </span>
                    )}
                  </div>

                  {selectedEventDetail.participation_status?.attended && (
                    <div className="space-y-3">
                      {/* Attendance Details */}
                      <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-3 h-3 lg:w-4 lg:h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs lg:text-sm font-semibold text-emerald-800">Attendance Confirmed</span>
                        </div>
                        <div className="text-xs text-emerald-700 space-y-1">
                          <p><strong>Attendance ID:</strong> <span className="font-mono bg-white px-2 py-0.5 rounded border">{selectedEventDetail.participation_status.attendance_id}</span></p>
                          {selectedEventDetail.participation_status.attendance_date && (
                            <p><strong>Marked At:</strong> {new Date(selectedEventDetail.participation_status.attendance_date).toLocaleString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</p>
                          )}
                        </div>
                      </div>

                      {/* Attendance Type Indicators */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="w-2 h-2 lg:w-3 lg:h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-xs font-medium text-blue-800">Physical</span>
                          <svg className="w-3 h-3 text-emerald-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="w-2 h-2 lg:w-3 lg:h-3 bg-purple-500 rounded-full"></div>
                          <span className="text-xs font-medium text-purple-800">Virtual</span>
                          <svg className="w-3 h-3 text-emerald-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedEventDetail.event.status === 'ongoing' && !selectedEventDetail.participation_status?.attended && (
                    <div className="space-y-3 mt-3">
                      <p className="text-xs text-slate-600">
                        Attendance marking is now available! Choose your attendance method:
                      </p>

                      {/* Attendance Options */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="w-2 h-2 lg:w-3 lg:h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-xs font-medium text-blue-800">Physical</span>
                          <svg className="w-3 h-3 text-orange-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="w-2 h-2 lg:w-3 lg:h-3 bg-purple-500 rounded-full"></div>
                          <span className="text-xs font-medium text-purple-800">Virtual</span>
                          <svg className="w-3 h-3 text-orange-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                        <p><strong>Physical:</strong> Be present at the venue and use QR code or location-based marking.</p>
                        <p><strong>Virtual:</strong> Join online session and mark attendance through the platform.</p>
                      </div>
                    </div>
                  )}

                  {selectedEventDetail.event.status === 'upcoming' && (
                    <div className="mt-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200 opacity-75">
                          <div className="w-2 h-2 lg:w-3 lg:h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-xs font-medium text-blue-800">Physical</span>
                          <svg className="w-3 h-3 text-slate-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200 opacity-75">
                          <div className="w-2 h-2 lg:w-3 lg:h-3 bg-purple-500 rounded-full"></div>
                          <span className="text-xs font-medium text-purple-800">Virtual</span>
                          <svg className="w-3 h-3 text-slate-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 mt-2">
                        Both physical and virtual attendance options will be available during the event.
                      </p>
                    </div>
                  )}
                </div>

                {/* Feedback Status */}
                <div className="bg-white rounded-lg lg:rounded-xl p-3 lg:p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 lg:w-4 lg:h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-xs lg:text-sm font-semibold text-slate-900">Feedback</span>
                    </div>
                    {selectedEventDetail.participation_status?.feedback_submitted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Submitted
                      </span>
                    ) : selectedEventDetail.event.status === 'completed' || selectedEventDetail.event.status === 'ongoing' ? (
                      <Link
                        to={`/client/events/${selectedEventDetail.event_id}/feedback`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors"
                        onClick={onClose}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Submit Now
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Not Available
                      </span>
                    )}
                  </div>
                  {selectedEventDetail.participation_status?.feedback_submitted && (
                    <div className="text-xs text-slate-600">
                      <p><strong>Feedback ID:</strong> {selectedEventDetail.participation_status.feedback_id}</p>
                      {selectedEventDetail.participation_status.feedback_date && (
                        <p><strong>Submitted At:</strong> {new Date(selectedEventDetail.participation_status.feedback_date).toLocaleString()}</p>
                      )}
                    </div>
                  )}
                  {(selectedEventDetail.event.status === 'completed' || selectedEventDetail.event.status === 'ongoing') && !selectedEventDetail.participation_status?.feedback_submitted && (
                    <p className="text-xs text-slate-600 mt-2">
                      Your feedback helps us improve future events. Please take a moment to share your experience.
                    </p>
                  )}
                </div>

                {/* Certificate Status */}
                <div className="bg-white rounded-lg lg:rounded-xl p-3 lg:p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 lg:w-4 lg:h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <span className="text-xs lg:text-sm font-semibold text-slate-900">Certificate</span>
                    </div>
                    {selectedEventDetail.participation_status?.certificate_earned ? (
                      <Link
                        to="/client/certificates"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 transition-colors"
                        onClick={onClose}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </Link>
                    ) : selectedEventDetail.event.status === 'completed' && selectedEventDetail.participation_status?.attended ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-lg text-xs font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Processing
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Not Available
                      </span>
                    )}
                  </div>
                  {selectedEventDetail.participation_status?.certificate_earned && (
                    <div className="text-xs text-slate-600">
                      <p><strong>Certificate ID:</strong> {selectedEventDetail.participation_status.certificate_id}</p>
                    </div>
                  )}
                  {selectedEventDetail.event.status === 'completed' && selectedEventDetail.participation_status?.attended && !selectedEventDetail.participation_status?.certificate_earned && (
                    <p className="text-xs text-slate-600 mt-2">
                      Your certificate is being processed. It will be available in your certificates section once ready.
                    </p>
                  )}
                  {(!selectedEventDetail.participation_status?.attended && selectedEventDetail.event.status === 'completed') && (
                    <p className="text-xs text-slate-600 mt-2">
                      Attendance is required to receive a certificate for this event.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Action Buttons */}
        <div className="p-4 lg:p-6 border-t border-slate-200 bg-white flex-shrink-0">
          <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
            <Link
              to={`/client/events/${selectedEventDetail.event_id}`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold text-sm"
              onClick={onClose}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Full Event
            </Link>
            <button
              onClick={onClose}
              className="px-6 py-3 text-slate-600 hover:text-slate-800 transition-colors font-semibold rounded-xl hover:bg-slate-50 border border-slate-200 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Use createPortal to render outside of any parent containers
  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default EventDetailModal;
