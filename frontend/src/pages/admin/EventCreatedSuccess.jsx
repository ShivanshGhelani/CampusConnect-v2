import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';

function EventCreatedSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState(null);

  useEffect(() => {
    // Get event data from location state
    if (location.state?.eventData) {
      setEventData(location.state.eventData);
    } else {
      // If no event data, redirect to events list
      navigate('/admin/events');
    }
  }, [location.state, navigate]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!eventData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading event details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        {/* Success Header - Hidden in print */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 print:hidden">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {location.state?.message || 'Event Created Successfully!'}
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Your event "<span className="font-semibold text-blue-600">{eventData.event_name}</span>" has been created{location.state?.pendingApproval ? ' and is pending approval' : ' and is ready for registration'}.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                </svg>
                Print Details
              </button>
              <button
                onClick={() => navigate('/admin/events')}
                className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
                View All Events
              </button>
              <button
                onClick={() => navigate('/admin/events/create')}
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Create Another Event
              </button>
            </div>
          </div>
        </div>

        {/* Printable Event Details */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 print:shadow-none print:border-none">
            {/* Print Header */}
            <div className="hidden print:block text-center py-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">CampusConnect Event Management</h1>
              <p className="text-gray-600">Event Creation Confirmation</p>
            </div>

            <div className="p-8">
              {/* Event Header */}
              <div className="text-center mb-8 pb-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{eventData.event_name}</h2>
                <div className="flex flex-wrap justify-center gap-3 text-sm">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                    {eventData.event_type?.charAt(0).toUpperCase() + eventData.event_type?.slice(1)}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800">
                    {eventData.target_audience?.charAt(0).toUpperCase() + eventData.target_audience?.slice(1)}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-800">
                    {eventData.mode?.charAt(0).toUpperCase() + eventData.mode?.slice(1)}
                  </span>
                  {eventData.is_xenesis_event && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800">
                      Xenesis Event
                    </span>
                  )}
                </div>
              </div>

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Basic Information */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Basic Information
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Event ID</p>
                        <p className="text-gray-900 font-mono">{eventData.event_id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Short Description</p>
                        <p className="text-gray-900">{eventData.short_description}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Detailed Description</p>
                        <p className="text-gray-900 whitespace-pre-wrap">{eventData.detailed_description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Organizer Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                      </svg>
                      Organizer & Contact
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Department/Club</p>
                        <p className="text-gray-900">{eventData.organizing_department}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Organizers</p>
                        <div className="flex flex-wrap gap-2">
                          {eventData.organizers?.map((organizer, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 text-sm">
                              {typeof organizer === 'object' ? organizer.name : organizer}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Contact Information</p>
                        <div className="space-y-2">
                          {eventData.contacts?.map((contact, index) => (
                            <div key={index} className="flex justify-between items-center bg-white rounded p-2">
                              <span className="font-medium">{contact.name}</span>
                              <span className="text-gray-600">{contact.contact}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Target Outcomes */}
                  {eventData.target_outcomes && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Learning Objectives
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-900 whitespace-pre-wrap">{eventData.target_outcomes}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Schedule & Venue Information */}
                <div className="space-y-6">
                  {/* Schedule */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Schedule
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white rounded p-3">
                          <p className="text-sm font-medium text-gray-500 mb-1">Event Start</p>
                          <p className="text-gray-900 font-medium">{formatDate(eventData.start_date)}</p>
                          <p className="text-gray-600">{formatTime(eventData.start_time)}</p>
                        </div>
                        <div className="bg-white rounded p-3">
                          <p className="text-sm font-medium text-gray-500 mb-1">Event End</p>
                          <p className="text-gray-900 font-medium">{formatDate(eventData.end_date)}</p>
                          <p className="text-gray-600">{formatTime(eventData.end_time)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white rounded p-3">
                          <p className="text-sm font-medium text-gray-500 mb-1">Registration Opens</p>
                          <p className="text-gray-900 font-medium">{formatDate(eventData.registration_start_date)}</p>
                          <p className="text-gray-600">{formatTime(eventData.registration_start_time)}</p>
                        </div>
                        <div className="bg-white rounded p-3">
                          <p className="text-sm font-medium text-gray-500 mb-1">Registration Closes</p>
                          <p className="text-gray-900 font-medium">{formatDate(eventData.registration_end_date)}</p>
                          <p className="text-gray-600">{formatTime(eventData.registration_end_time)}</p>
                        </div>
                      </div>
                      <div className="bg-white rounded p-3">
                        <p className="text-sm font-medium text-gray-500 mb-1">Certificate Available Until</p>
                        <p className="text-gray-900 font-medium">{formatDate(eventData.certificate_end_date)}</p>
                        <p className="text-gray-600">{formatTime(eventData.certificate_end_time)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Venue Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                      Venue & Location
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="bg-white rounded p-3">
                        <p className="text-sm font-medium text-gray-500 mb-1">Mode</p>
                        <p className="text-gray-900 font-medium capitalize">{eventData.mode}</p>
                        <p className="text-sm font-medium text-gray-500 mb-1 mt-3">Location/Platform</p>
                        <p className="text-gray-900">{eventData.venue}</p>
                      </div>
                    </div>
                  </div>

                  {/* Registration Details */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                      </svg>
                      Registration Details
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded p-3">
                          <p className="text-sm font-medium text-gray-500">Type</p>
                          <p className="text-gray-900 capitalize">{eventData.registration_type}</p>
                        </div>
                        <div className="bg-white rounded p-3">
                          <p className="text-sm font-medium text-gray-500">Mode</p>
                          <p className="text-gray-900 capitalize">{eventData.registration_mode}</p>
                        </div>
                      </div>
                      {eventData.registration_fee && (
                        <div className="bg-white rounded p-3">
                          <p className="text-sm font-medium text-gray-500">Registration Fee</p>
                          <p className="text-gray-900 font-medium">₹{eventData.registration_fee}</p>
                          {eventData.fee_description && (
                            <p className="text-gray-600 text-sm mt-1">{eventData.fee_description}</p>
                          )}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded p-3">
                          <p className="text-sm font-medium text-gray-500">Min Participants</p>
                          <p className="text-gray-900">{eventData.min_participants || 1}</p>
                        </div>
                        {eventData.max_participants && (
                          <div className="bg-white rounded p-3">
                            <p className="text-sm font-medium text-gray-500">Max Participants</p>
                            <p className="text-gray-900">{eventData.max_participants}</p>
                          </div>
                        )}
                      </div>
                      {eventData.registration_mode === 'team' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white rounded p-3">
                            <p className="text-sm font-medium text-gray-500">Min Team Size</p>
                            <p className="text-gray-900">{eventData.team_size_min}</p>
                          </div>
                          <div className="bg-white rounded p-3">
                            <p className="text-sm font-medium text-gray-500">Max Team Size</p>
                            <p className="text-gray-900">{eventData.team_size_max}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Prerequisites & What to Bring */}
                  {(eventData.prerequisites || eventData.what_to_bring) && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        Requirements
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        {eventData.prerequisites && (
                          <div className="bg-white rounded p-3">
                            <p className="text-sm font-medium text-gray-500 mb-2">Prerequisites</p>
                            <p className="text-gray-900 whitespace-pre-wrap">{eventData.prerequisites}</p>
                          </div>
                        )}
                        {eventData.what_to_bring && (
                          <div className="bg-white rounded p-3">
                            <p className="text-sm font-medium text-gray-500 mb-2">What to Bring</p>
                            <p className="text-gray-900 whitespace-pre-wrap">{eventData.what_to_bring}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Print Footer */}
              <div className="hidden print:block mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
                <p>Generated on {new Date().toLocaleDateString('en-IN')} • CampusConnect Event Management System</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body { margin: 0; }
            .print\\:hidden { display: none !important; }
            .print\\:block { display: block !important; }
            .print\\:shadow-none { box-shadow: none !important; }
            .print\\:border-none { border: none !important; }
            @page { margin: 0.5in; }
          }
        `
      }} />
    </AdminLayout>
  );
}

export default EventCreatedSuccess;
