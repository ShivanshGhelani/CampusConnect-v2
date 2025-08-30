import React, { useState } from 'react';
import { clientAPI } from '../../api/client';

const InvitationCard = ({ invitation, onAccept, onDecline, onViewDetails, onViewTeam }) => {
  const [isResponding, setIsResponding] = useState(false);
  const [responseType, setResponseType] = useState(null); // 'accept' or 'decline'

  const handleResponse = async (response) => {
    setIsResponding(true);
    setResponseType(response);

    try {
      const result = await clientAPI.respondToInvitation(invitation.invitation_id, response);
      
      if (result.data.success) {
        if (response === 'accept') {
          onAccept?.(invitation);
        } else {
          onDecline?.(invitation);
        }
      } else {
        console.error('Failed to respond to invitation:', result.data.message);
        // You might want to show an error message here
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      // You might want to show an error message here
    } finally {
      setIsResponding(false);
      setResponseType(null);
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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

        {/* Action Buttons */}
        <div className="mt-4 space-y-2">
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
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
              onClick={() => onViewTeam?.(invitation)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              View Team
            </button>
            
            <button
              onClick={() => onViewDetails?.(invitation)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Event Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvitationCard;
