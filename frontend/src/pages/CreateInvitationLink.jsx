import React, { useState, useEffect } from 'react';
import Layout from '../components/client/Layout';
import invitationScannerService from '../services/InvitationScannerService';

const CreateInvitationLink = () => {
  const [eventId] = useState('EVT_HACKATHON_2025');
  const [eventName] = useState('48-Hour Hackathon Challenge 2025');
  const [invitationLink, setInvitationLink] = useState('');
  const [expiryTime, setExpiryTime] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeVolunteers, setActiveVolunteers] = useState([]);
  const [eventStats, setEventStats] = useState({
    totalScans: 0,
    activeVolunteers: 0,
    checkInPoints: 0
  });

  useEffect(() => {
    // Set default expiry to end of day
    const today = new Date();
    today.setHours(17, 0, 0, 0); // 5:00 PM
    setExpiryTime(today.toISOString().slice(0, 16));
    
    // Load any existing invitation
    loadExistingInvitation();
    loadEventStats();
  }, []);

  const loadExistingInvitation = async () => {
    try {
      const data = await invitationScannerService.getExistingInvitation(eventId);
      if (data && data.invitation_link && new Date(data.expires_at) > new Date()) {
        setInvitationLink(data.invitation_link);
        setExpiryTime(new Date(data.expires_at).toISOString().slice(0, 16));
      }
    } catch (error) {
      console.error('Error loading invitation:', error);
    }
  };

  const loadEventStats = async () => {
    try {
      const data = await invitationScannerService.getVolunteerStats(eventId);
      setEventStats(data.stats);
      setActiveVolunteers(data.active_volunteers || []);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const createInvitationLink = async () => {
    setIsCreating(true);
    
    try {
      const data = await invitationScannerService.createInvitationLink(eventId, expiryTime);
      setInvitationLink(data.invitation_link);
    } catch (error) {
      console.error('Error creating invitation:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const generateWhatsAppMessage = () => {
    return invitationScannerService.generateWhatsAppMessage(eventName, invitationLink, expiryTime);
  };

  const isLinkExpired = () => {
    if (!expiryTime) return false;
    return new Date(expiryTime) <= new Date();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Volunteer Management</h1>
                <p className="text-gray-600 mt-1">{eventName}</p>
              </div>
              <div className="mt-4 md:mt-0 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{eventStats.totalScans}</p>
                  <p className="text-sm text-gray-500">Total Scans</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{eventStats.activeVolunteers}</p>
                  <p className="text-sm text-gray-500">Active Volunteers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{eventStats.checkInPoints}</p>
                  <p className="text-sm text-gray-500">Check-in Points</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Invitation Link Creation */}
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🔗 Create Volunteer Invitation</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Link Expires At
                    </label>
                    <input
                      type="datetime-local"
                      value={expiryTime}
                      onChange={(e) => setExpiryTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <button
                    onClick={createInvitationLink}
                    disabled={isCreating}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        {invitationLink ? 'Regenerate Link' : 'Create Volunteer Link'}
                      </>
                    )}
                  </button>
                </div>

                {/* Generated Link Display */}
                {invitationLink && (
                  <div className="mt-6 space-y-4">
                    <div className={`p-4 rounded-lg border-2 ${isLinkExpired() ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className={`w-5 h-5 ${isLinkExpired() ? 'text-red-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isLinkExpired() ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                        </svg>
                        <span className={`font-medium ${isLinkExpired() ? 'text-red-900' : 'text-green-900'}`}>
                          {isLinkExpired() ? 'Link Expired' : 'Active Invitation Link'}
                        </span>
                      </div>
                      
                      <div className="bg-white p-3 rounded border font-mono text-sm break-all mb-3">
                        {invitationLink}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => copyToClipboard(invitationLink)}
                          className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy Link
                        </button>
                        
                        <a
                          href={`https://wa.me/?text=${generateWhatsAppMessage()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                          </svg>
                          Share on WhatsApp
                        </a>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600">
                      <p><strong>Expires:</strong> {new Date(expiryTime).toLocaleString()}</p>
                      <p><strong>Valid for:</strong> Multiple volunteers can use the same link</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-bold text-blue-900 mb-2">How the Reusable Link Works:</h4>
                    <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                      <li><strong>Create once:</strong> Generate a single invitation link with expiry time</li>
                      <li><strong>Share everywhere:</strong> Send the same link to all volunteers (WhatsApp, email, etc.)</li>
                      <li><strong>Self-registration:</strong> Each volunteer enters their name and starts scanning</li>
                      <li><strong>Individual sessions:</strong> Each phone gets its own named session</li>
                      <li><strong>Full accountability:</strong> All scans are logged with the volunteer's name</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Active Volunteers */}
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">👥 Active Volunteers</h3>
                  <span className="text-sm text-gray-500">{activeVolunteers.length} currently scanning</span>
                </div>

                {activeVolunteers.length > 0 ? (
                  <div className="space-y-3">
                    {activeVolunteers.map((volunteer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-bold">{volunteer.name[0]}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{volunteer.name}</p>
                            <p className="text-sm text-gray-600">{volunteer.location}</p>
                            <p className="text-xs text-gray-500">Joined {new Date(volunteer.joinedAt).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-sm font-medium text-gray-900">{volunteer.scansCount} scans</span>
                          </div>
                          <p className="text-xs text-gray-500">Last: {volunteer.lastScan}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-500">No active volunteers yet</p>
                    <p className="text-sm text-gray-400">Share the invitation link to get started</p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={loadEventStats}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                    <button
                      onClick={() => window.open(`${invitationLink}`, '_blank')}
                      disabled={!invitationLink}
                      className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Test Link
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateInvitationLink;
