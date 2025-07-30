import React from 'react';
import { Link } from 'react-router-dom';

// Status badge component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    upcoming: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      label: 'Upcoming',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },    ongoing: {
      bg: '',
      text: 'text-emerald-700',
      label: 'Live',
      icon: (
        <div className="relative flex items-center justify-center">
          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          <div className="absolute w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
        </div>
      )
    },
    completed: {
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      label: 'Completed',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    }
  };
  const config = statusConfig[status] || statusConfig.upcoming;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${config.bg} ${config.text} ${status !== 'ongoing' ? 'border' : ''}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

// Main ProfileEventCard component
const ProfileEventCard = ({ reg, showActions = true, onCancelRegistration }) => {
  // Registration data available for debugging if needed
  // reg.event_id, reg.event?.event_name, reg.registration?.registration_type, etc.
  
  // Debug: Check event status for cancel button visibility
  const shouldShowCancelButtons = reg.event.status === "upcoming" && reg.event.sub_status === "registration_open";
  
  console.log('ProfileEventCard - Event Status Debug:', {
    event_name: reg.event?.event_name,
    status: reg.event?.status,
    sub_status: reg.event?.sub_status,
    registration_type: reg.registration?.registration_type,
    shouldShowCancelButtons: shouldShowCancelButtons,
    hasOnCancelFunction: !!onCancelRegistration
  });

  return (
    <div className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 hover:border-blue-300">
      {/* Compact Header */}
      <div className="px-3 py-2.5 border-b border-gray-100">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {/* Compact Event Icon */}
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 text-sm mb-0.5 truncate group-hover:text-blue-700 transition-colors">
                {reg.event.event_name}
              </h3>
            </div>
          </div>
          
          <StatusBadge status={reg.event.status} />
        </div>
      </div>

      {/* Compact Event Details */}
      <div className="px-3 py-3">
        {/* Event Meta Information - Unequal columns: smaller date, larger venue */}
        <div className="grid grid-cols-5 gap-2 mb-3">
          <div className="col-span-1 flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
            <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500">Date</p>
              <p className="text-xs font-semibold text-slate-900 truncate">
                {reg.event.start_datetime ? new Date(reg.event.start_datetime).toLocaleDateString() : 'TBD'}
              </p>
            </div>
          </div>
          
          <div className="col-span-4 flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
            <div className="w-6 h-6 bg-emerald-100 rounded-md flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500">Venue</p>
              <p className="text-xs font-semibold text-slate-900 truncate">
                {reg.event.venue && reg.event.venue !== 'N/A' && reg.event.venue !== 'n/a' && reg.event.venue !== 'NA' ? reg.event.venue : 'TBD'}
              </p>
            </div>
          </div>        </div>

        {/* Registration Type Badge and Registration ID - Combined Row */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {/* Registration Type Badge and Registration ID */}
          <div className="flex items-center gap-3">
            {reg.registration?.registration_type && (
              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                (reg.registration.registration_type === 'team_leader' || reg.registration.registration_type === 'team')
                  ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                  : reg.registration.registration_type === 'individual'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-orange-50 text-orange-700 border border-orange-200'
              }`}>
                {(reg.registration.registration_type === 'team_leader' || reg.registration.registration_type === 'team') && (
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
                {reg.registration.registration_type === 'team' ? 'Team Leader' : reg.registration.registration_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            )}
            
            {/* Registration ID Badge */}
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-mono font-semibold">
                {reg.registration?.registrar_id || reg.registration?.registration_id || 'N/A'}
              </span>
            </span>
          </div>

          {/* Action Buttons */}
          {showActions && (
            <div className="flex items-center gap-1.5">              <Link
                to={`/client/events/${reg.event_id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-all duration-200 border border-blue-100 hover:border-blue-200"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View
              </Link>

              {/* Team Management Button - Always show for team leaders */}
              {(reg.registration?.registration_type === "team_leader" || reg.registration?.registration_type === "team") && (
                <Link
                  to={`/client/events/${reg.event_id}/manage-team`}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium transition-colors duration-200 border border-indigo-100"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Manage Team
                </Link>
              )}

              {/* Registration Management Buttons - Show only when registration is open */}
              {reg.event.status === "upcoming" && reg.event.sub_status === "registration_open" && (
                <>
                  {(reg.registration?.registration_type === "team_leader" || reg.registration?.registration_type === "team") && (
                    <button
                      onClick={() => onCancelRegistration && onCancelRegistration(reg.event_id, reg.event.event_name)}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium transition-colors duration-200 border border-red-100"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel Team
                    </button>
                  )}

                  {reg.registration?.registration_type === "individual" && (
                    <button
                      onClick={() => onCancelRegistration && onCancelRegistration(reg.event_id, reg.event.event_name)}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium transition-colors duration-200 border border-red-100"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel Registration
                    </button>
                  )}

                  {reg.registration?.registration_type === "team_participant" && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1.5 bg-slate-50 text-slate-600 rounded-lg font-medium border border-slate-200">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Contact Leader
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileEventCard;
