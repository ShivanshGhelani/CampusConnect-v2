import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/base';

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
    }, ongoing: {
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
const ProfileEventCard = ({ reg, showActions = true, onCancelRegistration, onViewDetails, onViewTeam, onViewQRCode }) => {
  // Registration data available for debugging if needed
  // reg.event_id, reg.event?.event_name, reg.registration?.registration_type, etc.

  // State for dynamic team name fetching
  const [teamName, setTeamName] = useState(reg.registration?.team_name);

  // Debug: Check event status for cancel button visibility
  const shouldShowCancelButtons = reg.event.status === "upcoming" && reg.event.sub_status === "registration_open";

  // Debug: Check View Team button visibility - show for team members who are not team leaders
  const shouldShowViewTeamButton = (reg.registration?.registration_type === "team_member" || reg.registration?.registration_type === "team") && 
    !(reg.registration?.is_team_leader || reg.registration?.registration_type === "team_leader");

  // Effect to fetch team name if it's null for team members
  useEffect(() => {
    const fetchTeamName = async () => {
      if (reg.registration?.registration_type === 'team_member' &&
        !reg.registration?.team_name &&
        reg.registration?.team_registration_id) {
        try {
          const response = await api.get(`/api/v1/client/profile/team-info/${reg.event_id}/${reg.registration.team_registration_id}`);
          if (response.data.success && response.data.data?.team_name) {
            setTeamName(response.data.data.team_name);
          }
        } catch (error) {
          console.error('Error fetching team name:', error);
        }
      }
    };

    fetchTeamName();
  }, [reg.event_id, reg.registration?.team_registration_id, reg.registration?.team_name, reg.registration?.registration_type]);

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
          </div>
        </div>

        {/* Registration Details and Action Buttons - Left/Right Layout */}
        <div className="grid grid-cols-[60%_40%] pt-2 border-t border-slate-100 items-start">
          {/* Left Column: Registration Details Badges */}
          <div className="flex flex-col gap-2.5 ">
            {/* Registration Type Badge */}
            {reg.registration?.registration_type && (
              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium w-fit ${(reg.registration.registration_type === 'team_leader' || reg.registration.registration_type === 'team')
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : reg.registration.registration_type === 'individual'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : reg.registration.registration_type === 'team_member'
                    ? 'bg-orange-50 text-orange-700 border border-orange-200'
                    : 'bg-slate-50 text-slate-700 border border-slate-200'
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
                {reg.registration.registration_type === 'team_member' && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                )}
                
                {reg.registration.is_team_leader || reg.registration.registration_type === 'team_leader' ? `Team Leader${teamName ? ` - ${teamName}` : ''}` :
                  (reg.registration.registration_type === 'team_member' || reg.registration.registration_type === 'team') ?
                    `Team Member${teamName ? ` - ${teamName}` : ''}` :
                    reg.registration.registration_type === 'individual' ? 'Individual' :
                      reg.registration.registration_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            )}
            <div className="gap-2 flex h-auto">
              {/* Registration ID Badge */}
              <span className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 w-fit">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-mono font-semibold">
                  {reg.registration?.registrar_id || reg.registration?.registration_id || 'N/A'}
                </span>
              </span>
              {/* Team Registration ID Badge (only for team registrations) */}
              {(reg.registration?.registration_type === 'team' || reg.registration?.registration_type === 'team_member' || reg.registration?.registration_type === 'team_leader') && reg.registration?.team_registration_id && (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 w-fit">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                  <span className="font-mono font-semibold text-xs">
                    {reg.registration?.team_registration_id}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Action Buttons (2 per row) */}
          {showActions && (
            <div className="flex flex-col gap-1.5 max-w-sm justify-between items-end">
              {/* Row 1: QR Code + Details */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => onViewQRCode && onViewQRCode({
                    registration: reg.registration,
                    event: reg.event,
                    eventId: reg.event_id,
                    eventName: reg.event.event_name,
                    registrationType: reg.registration?.registration_type,
                    teamName: teamName || reg.registration?.team_name
                  })}
                  className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1.5 rounded-lg transition-all duration-200 border border-green-100 hover:border-green-200 flex-1 justify-center text-nowrap"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  QR Code
                </button>

                <button
                  onClick={() => onViewDetails && onViewDetails(reg)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1.5 rounded-lg transition-all duration-200 border border-blue-100 hover:border-blue-200 flex-1 justify-center"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Details
                </button>
              </div>

              {/* Row 2: Conditional buttons (Team Management / View Team) */}
              <div className="flex gap-1.5">
                {/* Team Management Button - Show only for team leaders */}
                {(reg.registration?.registration_type === "team_leader" || reg.registration?.is_team_leader) && (
                  <Link
                    to={`/client/events/${reg.event_id}/manage-team`}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium transition-colors duration-200 border border-indigo-100 flex-1 justify-center"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Manage Team
                  </Link>
                )}

                {/* View Team Button - Show only for team participants */}
                {shouldShowViewTeamButton && (
                  <button
                    onClick={() => onViewTeam && onViewTeam({
                      eventId: reg.event_id,
                      eventName: reg.event.event_name,
                      teamName: teamName || reg.registration?.team_name,
                      teamId: reg.registration?.team_registration_id,
                      userRole: reg.registration?.registration_type
                    })}
                    className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 -mx-1 py-1.5 rounded-lg transition-all duration-200 border border-purple-100 hover:border-purple-200 flex-1 justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 1024 1024" class="icon" version="1.1"><path d="M764.077495 365.4687c25.787576-28.703601 41.628106-66.514662 41.628106-108.047547 0-89.337066-72.67538-162.023709-162.023709-162.02371S481.658182 168.084087 481.658182 257.421153h45.226039c0-64.405459 52.403475-116.797671 116.797671-116.797671s116.797671 52.392212 116.79767 116.797671-52.403475 116.797671-116.79767 116.79767c-20.647671 0-40.964628-5.4655-58.741325-15.822099l-22.745613 39.086822c24.666421 14.365111 52.844769 21.961316 81.486938 21.961316 31.034988 0 59.955653-8.924184 84.62105-24.116595 2.73275 4.021822 144.402643 55.220183 154.273921 292.470796 0.507847 12.15659 10.511207 21.674628 22.568481 21.674628 0.330715 0 0.639928-0.011263 0.971667-0.022526 12.477067-0.51911 22.171213-11.052842 21.641864-23.529908-9.692098-233.333227-126.929016-303.970051-163.68138-320.452557z" fill="violet" /><path d="M541.966052 518.12181c29.268786-33.91313 47.104868-77.952485 47.104868-126.15803 0-106.683731-86.809093-193.481562-193.492825-193.481562S202.107796 285.279025 202.107796 391.962756c0 48.204521 17.828915 92.240805 47.090534 126.153935-51.365255 30.577311-153.310445 121.144064-153.310445 358.758155 0 12.488329 10.113939 22.613531 22.613531 22.613531s22.613531-10.125202 22.613531-22.613531c0-244.454669 113.552978-312.788776 143.593774-326.583583 31.432256 22.083159 69.622154 35.163294 110.869374 35.163294 41.246196 0 79.440191-13.080135 110.876542-35.163294 30.045915 13.80607 143.609132 82.134033 143.609132 326.583583 0 12.488329 10.113939 22.613531 22.613531 22.613531 12.498568 0 22.613531-10.125202 22.613531-22.613531-0.001024-237.6059-101.951333-328.172653-153.324779-358.753036zM247.333835 391.962756c0-81.752124 66.492137-148.255523 148.24426-148.255523s148.265762 66.5034 148.265762 148.255523-66.514662 148.265762-148.265762 148.265762-148.244261-66.513638-148.24426-148.265762z" fill="violet" /></svg>
                    View Team
                  </button>
                )}
              

              {/* Row 3: Cancel buttons (when registration is open) */}
              {reg.event.status === "upcoming" && reg.event.sub_status === "registration_open" && (
                <div className="flex gap-1.5">
                  {(reg.registration?.registration_type === "team_leader" || reg.registration?.is_team_leader) && (
                    <button
                      onClick={() => onCancelRegistration && onCancelRegistration(reg.event_id, reg.event.event_name)}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium transition-colors duration-200 border border-red-100 flex-1 justify-center"
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
                      className="inline-flex items-center gap-1 text-xs px-2 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium transition-colors duration-200 border border-red-100 flex-1 justify-center"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel Registration
                    </button>
                  )}
                </div>
              )}
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileEventCard;
