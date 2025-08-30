import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { clientAPI } from '../../../../api/client';
import InvitationCard from '../../../../components/client/InvitationCard';
import LoadingSpinner from '../../../../components/LoadingSpinner';

const Invitations = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInvitations();
  }, [user]);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await clientAPI.getMyInvitations();
      
      if (result.data.success) {
        setInvitations(result.data.invitations || []);
      } else {
        setError(result.data.message || 'Failed to fetch invitations');
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
      setError('Failed to load invitations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationResponse = (invitation, response) => {
    // Remove the responded invitation from the list
    setInvitations(prev => prev.filter(inv => inv.invitation_id !== invitation.invitation_id));
    
    // Show success message
    const message = response === 'accept' 
      ? `Successfully joined team "${invitation.team_name}"!` 
      : `Declined invitation to team "${invitation.team_name}"`;
    
    // You might want to show a toast notification here
    console.log(message);
  };

  const handleViewTeam = (invitation) => {
    // This could open a modal or navigate to a team details page
    console.log('View team details for:', invitation);
    // For now, just log - you can implement a modal or navigation
  };

  const handleViewDetails = (invitation) => {
    // This could open a modal or navigate to event details page
    console.log('View event details for:', invitation);
    // For now, just log - you can implement a modal or navigation
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M12 12v7" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Invitations</h1>
            <p className="text-gray-600">Manage your pending team invitations</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-900">
              {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}
            </span>
          </div>
          {invitations.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Remember to respond before they expire</span>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800 font-medium">Error</p>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
          <button
            onClick={fetchInvitations}
            className="mt-2 text-red-600 hover:text-red-700 font-medium text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Invitations List */}
      {invitations.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Invitations</h3>
          <p className="text-gray-600 mb-4">
            You don't have any pending team invitations at the moment.
          </p>
          <p className="text-sm text-gray-500">
            Team invitations will appear here when other students invite you to join their teams.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <InvitationCard
              key={invitation.invitation_id}
              invitation={invitation}
              onAccept={(inv) => handleInvitationResponse(inv, 'accept')}
              onDecline={(inv) => handleInvitationResponse(inv, 'decline')}
              onViewTeam={handleViewTeam}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {/* Refresh Button */}
      {invitations.length > 0 && (
        <div className="mt-8 text-center">
          <button
            onClick={fetchInvitations}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Invitations
          </button>
        </div>
      )}
    </div>
  );
};

export default Invitations;
