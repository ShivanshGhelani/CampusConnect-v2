import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/base';
import { Users } from 'lucide-react';

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
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 hover:border-blue-300">
      {/* Event Header */}
      <div className="px-4 py-6 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Event Icon */}
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-base mb-1 group-hover:text-blue-700 transition-colors leading-tight">
                {reg.event.event_name}
              </h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{reg.event.start_datetime ? new Date(reg.event.start_datetime).toLocaleDateString() : 'TBD'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4  text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className='text-wrap'>{reg.event.venue && reg.event.venue !== 'N/A' && reg.event.venue !== 'n/a' && reg.event.venue !== 'NA' ? reg.event.venue : 'TBD'}</span>
                </div>
              </div>
            </div>
          </div>

          <StatusBadge status={reg.event.status} />
        </div>
      </div>

      {/* Event Details */}
      <div className="px-4 py-3">
        {/* Action Buttons */}
        {showActions && (
          <div className="space-y-3">
            {/* For Individual registrations - Special mobile/tablet layout */}
            {reg.registration?.registration_type === 'individual' ? (
              <>
                {/* Row 1: Individual badge - Registration ID badge - QR Code button */}
                <div className="flex items-center justify-between gap-2 lg:hidden">
                  {/* Individual Badge */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Individual
                  </span>
                  
                  {/* Registration ID Badge - take only needed space */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-50 text-gray-700 border border-gray-200 flex-shrink-0">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-mono text-xs">
                      {reg.registration?.registrar_id || reg.registration?.registration_id || 'N/A'}
                    </span>
                  </span>


                </div>

                {/* Row 2: Details button - Cancel Registration button */}
                <div className="flex flex-wrap justify-between gap-2 lg:hidden">
                  {/* QR Code Button */}
                  <button
                    onClick={() => onViewQRCode && onViewQRCode({
                      registration: reg.registration,
                      event: reg.event,
                      eventId: reg.event_id,
                      eventName: reg.event.event_name,
                      registrationType: reg.registration?.registration_type,
                      teamName: teamName || reg.registration?.team_name
                    })}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-all duration-200 flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    QR Code
                  </button>
                  {/* Details Button */}
                  <button
                    onClick={() => onViewDetails && onViewDetails(reg)}
                    className="inline-flex flex-1 items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Details
                  </button>

                  {/* Cancel Registration Button (only when registration is open) */}
                  {reg.event.status === "upcoming" && reg.event.sub_status === "registration_open" && (
                    <button
                      onClick={() => onCancelRegistration && onCancelRegistration(reg.event_id, reg.event.event_name)}
                      className="inline-flex w-full items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </button>
                  )}
                </div>

                {/* Desktop layout for individual registrations */}
                <div className="hidden lg:flex lg:flex-col lg:gap-2">
                  {/* Registration Type Badge and ID for desktop */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Individual
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-50 text-gray-700 border border-gray-200 shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="font-mono">
                        {reg.registration?.registrar_id || reg.registration?.registration_id || 'N/A'}
                      </span>
                    </span>
                  </div>

                  {/* Action buttons for desktop */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onViewQRCode && onViewQRCode({
                        registration: reg.registration,
                        event: reg.event,
                        eventId: reg.event_id,
                        eventName: reg.event.event_name,
                        registrationType: reg.registration?.registration_type,
                        teamName: teamName || reg.registration?.team_name
                      })}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      QR Code
                    </button>

                    <button
                      onClick={() => onViewDetails && onViewDetails(reg)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Details
                    </button>

                    {reg.event.status === "upcoming" && reg.event.sub_status === "registration_open" && (
                      <button
                        onClick={() => onCancelRegistration && onCancelRegistration(reg.event_id, reg.event.event_name)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel Registration
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* For non-individual registrations - Keep original layout */
              <>
                {/* Registration Type Badge and ID */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {reg.registration?.registration_type && (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${(reg.registration.registration_type === 'team_leader' || reg.registration.registration_type === 'team')
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : reg.registration.registration_type === 'team_member'
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-slate-50 text-slate-700 border border-slate-200'
                        }`}>
                        {(reg.registration.registration_type === 'team_leader' || reg.registration.registration_type === 'team') && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        )}
                        {reg.registration.registration_type === 'team_member' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                        )}

                        {reg.registration.is_team_leader || reg.registration.registration_type === 'team_leader' ? `Team Leader${teamName ? ` - ${teamName}` : ''}` :
                          (reg.registration.registration_type === 'team_member' || reg.registration.registration_type === 'team') ?
                            `Team Member${teamName ? ` - ${teamName}` : ''}` :
                            reg.registration.registration_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-50 text-gray-700 border border-gray-200 shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-mono">
                      {reg.registration?.registrar_id || reg.registration?.registration_id || 'N/A'}
                    </span>
                  </span>
                </div>

                {/* Action buttons for team registrations */}
                <div className="flex flex-wrap sm:flex-row gap-2">
                  <button
                    onClick={() => onViewQRCode && onViewQRCode({
                      registration: reg.registration,
                      event: reg.event,
                      eventId: reg.event_id,
                      eventName: reg.event.event_name,
                      registrationType: reg.registration?.registration_type,
                      teamName: teamName || reg.registration?.team_name
                    })}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    QR Code
                  </button>

                  {(reg.registration?.registration_type === "team_leader" || reg.registration?.is_team_leader) && (
                    <Link
                      to={`/client/events/${reg.event_id}/manage-team`}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all duration-200"
                    >
                      <Users className='w-4 h-4' />
                      Manage Team
                    </Link>
                  )}

                  {shouldShowViewTeamButton && (
                    <button
                      onClick={() => onViewTeam && onViewTeam({
                        eventId: reg.event_id,
                        eventName: reg.event.event_name,
                        teamName: teamName || reg.registration?.team_name,
                        teamId: reg.registration?.team_registration_id,
                        userRole: reg.registration?.registration_type
                      })}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      View Team
                    </button>
                  )}

                  {/* Cancel Registration Button - Only show for team leaders */}
                  {reg.event.status === "upcoming" && reg.event.sub_status === "registration_open" &&
                    (reg.registration?.registration_type === "team_leader" || reg.registration?.is_team_leader) && (
                      <button
                        onClick={() => onCancelRegistration && onCancelRegistration(reg.event_id, reg.event.event_name)}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel Team
                      </button>
                    )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileEventCard;
