import React from 'react';
import { Link } from 'react-router-dom';

// Status badge component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    upcoming: {
      bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
      text: 'text-white',
      label: 'Upcoming',
      icon: '⏳'
    },
    ongoing: {
      bg: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
      text: 'text-white',
      label: 'Live',
      icon: '🔴'
    },
    completed: {
      bg: 'bg-gradient-to-r from-slate-500 to-slate-600',
      text: 'text-white',
      label: 'Completed',
      icon: '✅'
    }
  };

  const config = statusConfig[status] || statusConfig.upcoming;

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${config.bg} ${config.text}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
};

// Main ProfileEventCard component
const ProfileEventCard = ({ reg, showActions = true, onCancelRegistration }) => {
  return (
    <div className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:border-blue-200">
      {/* Event Header with Gradient Background */}
      <div className="relative bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-6 border-b border-gray-100">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200 rounded-full -translate-y-10 translate-x-10"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-purple-200 rounded-full translate-y-8 -translate-x-8"></div>
        </div>
        
        <div className="relative flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Enhanced Event Icon */}
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              {/* Pulse ring for ongoing events */}
              {reg.event.status === 'ongoing' && (
                <div className="absolute inset-0 rounded-xl bg-emerald-400 animate-ping opacity-25"></div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 text-lg mb-2 truncate group-hover:text-blue-700 transition-colors duration-200">
                {reg.event.event_name}
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <p className="text-slate-600 text-sm font-medium">
                  {reg.event.organizing_department}
                </p>
              </div>
            </div>
          </div>
          
          <StatusBadge status={reg.event.status} />
        </div>
      </div>

      {/* Event Details */}
      <div className="p-6">
        {/* Event Meta Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 mb-0.5">Event Date</p>
              <p className="text-sm font-semibold text-slate-900 truncate">
                {reg.event.start_datetime ? new Date(reg.event.start_datetime).toLocaleDateString() : 'TBD'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 mb-0.5">Venue</p>
              <p className="text-sm font-semibold text-slate-900 truncate">
                {reg.event.venue || 'TBD'}
              </p>
            </div>
          </div>
        </div>

        {/* Registration Type Badge */}
        {reg.registration?.registration_type && (
          <div className="mb-4">
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
              reg.registration.registration_type === 'team_leader' 
                ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                : reg.registration.registration_type === 'individual'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-orange-100 text-orange-700 border border-orange-200'
            }`}>
              {reg.registration.registration_type === 'team_leader' && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              )}
              {reg.registration.registration_type === 'individual' && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              {reg.registration.registration_type === 'team_participant' && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              )}
              {reg.registration.registration_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Link
              to={`/client/events/${reg.event_id}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl transition-all duration-200 group border border-blue-100 hover:border-blue-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Details
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            {reg.event.status === "upcoming" && reg.event.sub_status === "registration_open" && (
              <div className="flex items-center gap-2">
                {reg.registration?.registration_type === "team_leader" && (
                  <>
                    <Link
                      to={`/client/events/${reg.event_id}/manage-team`}
                      className="inline-flex items-center gap-2 text-xs px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 font-semibold transition-colors duration-200 border border-indigo-100"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Manage Team
                    </Link>
                    <button
                      onClick={() => onCancelRegistration && onCancelRegistration(reg.event_id, reg.event.event_name)}
                      className="inline-flex items-center gap-2 text-xs px-3 py-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 font-semibold transition-colors duration-200 border border-red-100"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </button>
                  </>
                )}

                {reg.registration?.registration_type === "individual" && (
                  <button
                    onClick={() => onCancelRegistration && onCancelRegistration(reg.event_id, reg.event.event_name)}
                    className="inline-flex items-center gap-2 text-xs px-3 py-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 font-semibold transition-colors duration-200 border border-red-100"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel Registration
                  </button>
                )}

                {reg.registration?.registration_type === "team_participant" && (
                  <span className="inline-flex items-center gap-2 text-xs px-3 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium border border-slate-200">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Contact Team Leader
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileEventCard;
