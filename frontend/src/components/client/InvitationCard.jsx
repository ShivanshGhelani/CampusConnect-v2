import React, { useState } from 'react';
import { clientAPI } from '../../api/client';

const InvitationCard = ({ invitation, onAccept, onDecline, onViewDetails, onViewTeam, onRefresh }) => {
  const [isResponding, setIsResponding] = useState(false);
  const [responseType, setResponseType] = useState(null); // 'accept' or 'decline'
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamDetails, setTeamDetails] = useState(null);
  const [loadingTeamDetails, setLoadingTeamDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showError, setShowError] = useState(false);
  const [showRefreshButton, setShowRefreshButton] = useState(false);

  const handleResponse = async (response) => {
    setIsResponding(true);
    setResponseType(response);
    setErrorMessage(null);
    setShowError(false);

    try {
      const result = await clientAPI.respondToInvitation(invitation.invitation_id, response);
      
      if (result.data.success) {
        if (response === 'accept') {
          onAccept?.(invitation, 'accept', true);
        } else {
          onDecline?.(invitation, 'decline', true);
        }
      } else {
        console.error('Failed to respond to invitation:', result.data.message);
        // Show error message to user
        setErrorMessage(result.data.message || 'Failed to respond to invitation');
        setShowError(true);
        
        // Check if this is a team full error to show refresh button
        const isTeamFullError = result.data.message?.includes('team is full') || result.data.message?.includes('already full');
        if (isTeamFullError) {
          setShowRefreshButton(true);
        }
        
        // Notify parent of failure (don't remove invitation from list)
        if (response === 'accept') {
          onAccept?.(invitation, 'accept', false, result.data.message);
        } else {
          onDecline?.(invitation, 'decline', false, result.data.message);
        }
        
        // Auto-hide error after 8 seconds for team full errors (longer read time), but keep refresh button
        const hideDelay = isTeamFullError ? 8000 : 5000;
        setTimeout(() => {
          setShowError(false);
          if (!isTeamFullError) {
            setErrorMessage(null);
          }
        }, hideDelay);
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      // Show error message to user
      setErrorMessage('Network error. Please try again.');
      setShowError(true);
      
      // Notify parent of failure (don't remove invitation from list)
      if (response === 'accept') {
        onAccept?.(invitation, 'accept', false, 'Network error. Please try again.');
      } else {
        onDecline?.(invitation, 'decline', false, 'Network error. Please try again.');
      }
      
      // Auto-hide error after 5 seconds
      setTimeout(() => {
        setShowError(false);
        setErrorMessage(null);
      }, 5000);
    } finally {
      setIsResponding(false);
      setResponseType(null);
    }
  };

  const handleViewTeam = async () => {
    setLoadingTeamDetails(true);
    setShowTeamModal(true);

    try {
      // Fetch team details using the team_registration_id from invitation
      const result = await clientAPI.getTeamDetailsByRegistrationId(invitation.team_registration_id);
      
      if (result.data.success && result.data.team) {
        const teamData = result.data.team;
        setTeamDetails({
          team_name: teamData.team_name,
          team_leader: teamData.team_leader,
          members: teamData.members || [],
          registration_id: teamData.registration_id,
          event_name: teamData.event_name,
          total_members: teamData.total_members,
          status: teamData.status,
          registered_at: teamData.registered_at
        });
      } else {
        console.error('Failed to fetch team details:', result.data.message);
        // Fallback: create basic team info from invitation data
        setTeamDetails({
          team_name: invitation.team_name,
          team_leader: invitation.inviter_name,
          members: [
            {
              student: {
                name: invitation.inviter_name,
                enrollment_no: 'Team Leader'
              },
              role: 'leader',
              is_team_leader: true
            }
          ],
          event_name: invitation.event_name,
          error: result.data.message || 'Could not load complete team details'
        });
      }
    } catch (error) {
      console.error('Error fetching team details:', error);
      // Fallback: create basic team info from invitation data
      setTeamDetails({
        team_name: invitation.team_name,
        team_leader: invitation.inviter_name,
        members: [
          {
            student: {
              name: invitation.inviter_name,
              enrollment_no: 'Team Leader'
            },
            role: 'leader',
            is_team_leader: true
          }
        ],
        event_name: invitation.event_name,
        error: 'Could not load team details'
      });
    } finally {
      setLoadingTeamDetails(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200">
      {/* Header with invitation badge */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 616 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Team Invitation</h3>
              <p className="text-blue-100 text-xs">From {invitation.inviter_name}</p>
            </div>
          </div>
          <span className="bg-white/20 px-2 py-1 rounded-md text-xs font-medium">
            Pending
          </span>
        </div>
      </div>

      {/* Invitation Details */}
      <div className="px-4 py-4">
        <div className="space-y-3">
          {/* Event Information */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">{invitation.event_name}</h4>
            <p className="text-sm text-gray-600">
              You've been invited to join the team <strong>"{invitation.team_name}"</strong>
            </p>
          </div>

          {/* Invitation Meta */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-xs text-gray-500">Invited on</p>
                <p className="text-xs font-semibold text-gray-900">{formatDate(invitation.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs text-gray-500">Expires</p>
                <p className="text-xs font-semibold text-gray-900">{formatTime(invitation.expires_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {showError && errorMessage && (
          <div className={`mt-3 p-3 rounded-lg border ${
            errorMessage.includes('team is full') || errorMessage.includes('already full')
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-2">
              <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                errorMessage.includes('team is full') || errorMessage.includes('already full')
                  ? 'text-yellow-600' 
                  : 'text-red-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {errorMessage.includes('team is full') || errorMessage.includes('already full') ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  errorMessage.includes('team is full') || errorMessage.includes('already full')
                    ? 'text-yellow-800' 
                    : 'text-red-800'
                }`}>
                  {errorMessage.includes('team is full') || errorMessage.includes('already full')
                    ? 'Team Full' 
                    : 'Unable to respond to invitation'
                  }
                </p>
                <p className={`text-sm mt-1 ${
                  errorMessage.includes('team is full') || errorMessage.includes('already full')
                    ? 'text-yellow-700' 
                    : 'text-red-700'
                }`}>
                  {errorMessage}
                </p>
                {(errorMessage.includes('team is full') || errorMessage.includes('already full')) && (
                  <p className="text-xs text-yellow-600 mt-2">
                    💡 Tip: Try looking for other teams or check if the team leader can remove inactive members.
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowError(false);
                  setErrorMessage(null);
                }}
                className={`transition-colors ${
                  errorMessage.includes('team is full') || errorMessage.includes('already full')
                    ? 'text-yellow-400 hover:text-yellow-600' 
                    : 'text-red-400 hover:text-red-600'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 space-y-2">
          {showRefreshButton ? (
            /* Refresh Button for Team Full Error */
            <div className="flex gap-2">
              <button
                onClick={() => onRefresh?.()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh to Check Updates
              </button>
            </div>
          ) : (
            <>
              {/* Primary Actions Row */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleResponse('accept')}
                  disabled={isResponding}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    isResponding && responseType === 'accept'
                      ? 'bg-green-400 text-white cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isResponding && responseType === 'accept' ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Accepting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Accept Invitation
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => handleResponse('decline')}
                  disabled={isResponding}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    isResponding && responseType === 'decline'
                      ? 'bg-red-400 text-white cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {isResponding && responseType === 'decline' ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Declining...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Decline
                    </>
                  )}
                </button>
              </div>

              {/* Secondary Actions Row */}
              <div className="flex gap-2">
                <button
                  onClick={handleViewTeam}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 616 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  View Team
                </button>
                
                <button
                  onClick={() => onViewDetails?.(invitation)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 616 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Event Details
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Team Details Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Team Details</h3>
              <button
                onClick={() => setShowTeamModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {loadingTeamDetails ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="w-8 h-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="ml-3 text-gray-600">Loading team details...</span>
                </div>
              ) : teamDetails ? (
                <div className="space-y-4">
                  {/* Team Info */}
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 616 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{teamDetails.team_name}</h4>
                        <p className="text-sm text-gray-600">{teamDetails.event_name}</p>
                      </div>
                    </div>

                    {/* Team Leader */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <span className="text-sm font-medium text-blue-900">Team Leader</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{teamDetails.team_leader}</p>
                    </div>

                    {/* Team Members */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">
                          All Members ({teamDetails.total_members || teamDetails.members?.length || 0})
                        </span>
                      </div>

                      {teamDetails.members && teamDetails.members.length > 0 ? (
                        <div className="space-y-2">
                          {teamDetails.members.map((member, index) => (
                            <div key={member.registration_id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {member.student?.name || member.student?.full_name || member.name || 'Member Name'}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {member.student?.enrollment_no || member.enrollment_no || 'Enrollment No.'}
                                  </p>
                                  {member.student?.department && (
                                    <p className="text-xs text-gray-500">
                                      {member.student.department} • {member.student.semester || member.student.year}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {(member.is_team_leader || member.role === 'leader') && (
                                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                                      Leader
                                    </span>
                                  )}
                                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                                    Confirmed
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 616 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <p className="text-sm text-gray-600">No additional members yet</p>
                        </div>
                      )}

                      {/* Team Stats */}
                      {teamDetails.total_members && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-blue-700 font-medium">Team Size:</span>
                            <span className="text-blue-900 font-semibold">{teamDetails.total_members} members</span>
                          </div>
                          {teamDetails.registered_at && (
                            <div className="flex items-center justify-between text-sm mt-1">
                              <span className="text-blue-700 font-medium">Registered:</span>
                              <span className="text-blue-900">{new Date(teamDetails.registered_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Note or Error */}
                    {teamDetails.note && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm text-yellow-800">{teamDetails.note}</span>
                        </div>
                      </div>
                    )}

                    {teamDetails.error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm text-red-800">{teamDetails.error}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-600">Failed to load team details</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowTeamModal(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitationCard;
