import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { clientAPI } from '../../../../api/client';
import { useNavigate } from 'react-router-dom';
import InvitationCard from '../../../../components/client/InvitationCard';
import LoadingSpinner from '../../../../components/LoadingSpinner';

const Invitations = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
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

    const handleInvitationResponse = (invitation, response, success = true, message = null) => {
        if (success) {
            // Remove the responded invitation from the list only if successful
            setInvitations(prev => prev.filter(inv => inv.invitation_id !== invitation.invitation_id));

            // Show success message
            const successMessage = response === 'accept'
                ? `Successfully joined team "${invitation.team_name}"!`
                : `Declined invitation to team "${invitation.team_name}"`;

            console.log(successMessage);
            // You might want to show a toast notification here
        } else {
            // Don't remove invitation from list if it failed
            // The error will be shown in the InvitationCard itself
            console.log(`Failed to ${response} invitation: ${message}`);
        }
    };

    const handleRefresh = () => {
        // Refresh the page to check for updates
        window.location.reload();
    };

    const handleViewTeam = (invitation) => {
        // Navigate to team details or event details with team focus
        if (invitation.event_id) {
            console.log('Navigating to team view for event:', invitation.event_id);
            // Navigate to event details page
            navigate(`/client/events/${invitation.event_id}`, {
                state: {
                    focusTab: 'teams',
                    highlightTeam: invitation.team_registration_id
                }
            });
        } else {
            console.warn('No event ID found in invitation:', invitation);
        }
    };

    const handleViewDetails = (invitation) => {
        // Navigate to event details page
        if (invitation.event_id) {
            console.log('Navigating to event details for event:', invitation.event_id);
            navigate(`/client/events/${invitation.event_id}`);
        } else {
            console.warn('No event ID found in invitation:', invitation);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-64">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
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
                            onAccept={(inv, response, success, message) => handleInvitationResponse(inv, response, success, message)}
                            onDecline={(inv, response, success, message) => handleInvitationResponse(inv, response, success, message)}
                            onViewTeam={handleViewTeam}
                            onViewDetails={handleViewDetails}
                            onRefresh={handleRefresh}
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
