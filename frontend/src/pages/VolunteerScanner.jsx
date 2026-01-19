import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import volunteerScannerService from '../services/volunteerScannerService';
import QRScanner from '../components/client/QRScanner';

const VolunteerScanner = () => {
  const { invitationCode } = useParams();
  const navigate = useNavigate();
  
  // State
  const [step, setStep] = useState('loading'); // 'loading' | 'identify' | 'scanning' | 'expired'
  const [volunteerName, setVolunteerName] = useState('');
  const [volunteerContact, setVolunteerContact] = useState('');
  const [sessionData, setSessionData] = useState(null);
  const [invitationData, setInvitationData] = useState(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [error, setError] = useState('');
  const [scanHistory, setScanHistory] = useState([]);
  const [showScanner, setShowScanner] = useState(false);

  // Validate invitation on mount
  useEffect(() => {
    validateInvitation();
  }, [invitationCode]);

  const validateInvitation = async () => {
    try {
      // Check for existing session first
      const existingSession = volunteerScannerService.getStoredSession(invitationCode);
      if (existingSession) {
        // Verify session is still valid on server
        try {
          await volunteerScannerService.getSessionStatus(existingSession.session_id);
          setSessionData(existingSession);
          setInvitationData(existingSession.event_details);
          setStep('scanning');
          return;
        } catch (err) {
          // Session expired on server, clear local storage
          volunteerScannerService.clearSession(invitationCode);
        }
      }

      // Validate invitation
      const data = await volunteerScannerService.validateInvitation(invitationCode);
      setInvitationData(data);
      
      // Check if invitation is active (within attendance time window)
      if (!data.is_active) {
        setStep('expired');
        return;
      }
      
      setStep('identify');
    } catch (error) {
      setError(error.message);
      setStep('expired');
    }
  };

  const createVolunteerSession = async () => {
    if (!volunteerName.trim() || !volunteerContact.trim()) {
      setError('Please enter your full name and contact information.');
      return;
    }

    setIsCreatingSession(true);
    setError('');

    try {
      const sessionData = await volunteerScannerService.createSession(
        invitationCode,
        volunteerName,
        volunteerContact
      );
      
      // Store session locally
      volunteerScannerService.storeSession(invitationCode, {
        ...sessionData,
        event_details: invitationData
      });
      
      setSessionData(sessionData);
      setStep('scanning');
      
    } catch (error) {
      setError(error.message);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleScanResult = async (qrData, attendanceData) => {
    try {
      // Mark attendance via API
      const result = await volunteerScannerService.markAttendance(
        sessionData.session_id,
        qrData,
        attendanceData
      );
      
      // Calculate total present
      const totalPresent = attendanceData.student ? 
        (attendanceData.student.attendance_status === 'present' ? 1 : 0) :
        (attendanceData.leader?.attendance_status === 'present' ? 1 : 0) + 
        (attendanceData.members?.filter(m => m.attendance_status === 'present').length || 0);
      
      // Add to scan history
      const scanRecord = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        qrData,
        attendanceData,
        totalPresent,
        result
      };
      
      setScanHistory(prev => [scanRecord, ...prev]);
      
      // Show success notification
      alert(`✅ Attendance marked successfully!\n${totalPresent} person(s) marked present.\nScanned by: ${sessionData.volunteer_name}`);
      
    } catch (error) {
      console.error('Failed to mark attendance:', error);
      alert(`❌ Failed to mark attendance: ${error.message}`);
    }
  };

  const formatTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Loading state
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // Expired or invalid invitation
  if (step === 'expired') {
    const isBeforeStart = invitationData && new Date() < new Date(invitationData.attendance_start_time);
    const isAfterEnd = invitationData && new Date() > new Date(invitationData.attendance_end_time);
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.268 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isBeforeStart ? 'Not Yet Active' : isAfterEnd ? 'Event Ended' : 'Invalid Invitation'}
          </h1>
          
          {invitationData ? (
            <div className="text-left mb-6">
              <p className="text-gray-600 mb-4 text-center">
                {isBeforeStart && 'This scanning link will become active during the event attendance window.'}
                {isAfterEnd && 'The attendance marking period for this event has ended.'}
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-gray-900">{invitationData.event_name}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <strong>Attendance Window:</strong>
                  </p>
                  <p>
                    📅 Start: {formatDateTime(invitationData.attendance_start_time)}
                  </p>
                  <p>
                    📅 End: {formatDateTime(invitationData.attendance_end_time)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 mb-6">
              {error || 'This invitation link is invalid or has expired.'}
            </p>
          )}
          
          <button
            onClick={() => navigate('/')}
            className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Event Attendance Scanner</h1>
              <p className="text-sm text-gray-600">{invitationData?.event_name}</p>
            </div>
            {sessionData && (
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{sessionData.volunteer_name}</p>
                <p className="text-xs text-gray-500">{formatTimeRemaining(sessionData.expires_at)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {/* Step 1: Volunteer Identification */}
        {step === 'identify' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Join as Volunteer</h2>
              <p className="text-gray-600">Enter your details to start scanning attendance</p>
            </div>

            {/* Event Info */}
            {invitationData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-green-900">Active Invitation</span>
                </div>
                <div className="text-sm text-green-800 space-y-1">
                  <p><strong>Event:</strong> {invitationData.event_name}</p>
                  <p><strong>Attendance Window:</strong></p>
                  <p className="ml-4">Start: {formatDateTime(invitationData.attendance_start_time)}</p>
                  <p className="ml-4">End: {formatDateTime(invitationData.attendance_end_time)}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  value={volunteerName}
                  onChange={(e) => setVolunteerName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Contact (Phone/Email) *
                </label>
                <input
                  type="text"
                  value={volunteerContact}
                  onChange={(e) => setVolunteerContact(e.target.value)}
                  placeholder="Phone number or email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                onClick={createVolunteerSession}
                disabled={!volunteerName.trim() || !volunteerContact.trim() || isCreatingSession}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {isCreatingSession ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Session...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    Start Scanning
                  </>
                )}
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">How it works:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Enter your name and contact info</li>
                    <li>• Scan student/team QR codes</li>
                    <li>• Mark who is present</li>
                    <li>• Your name will be recorded with each scan</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Scanning Interface */}
        {step === 'scanning' && (
          <div className="space-y-4">
            {/* Current Session Info */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
              <div className="text-center">
                <h3 className="font-bold text-gray-900 mb-2">Scanning Active</h3>
                <p className="text-sm text-gray-600">
                  <strong>Volunteer:</strong> {sessionData.volunteer_name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Contact:</strong> {sessionData.volunteer_contact}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Session {formatTimeRemaining(sessionData.expires_at)}
                </p>
              </div>
            </div>

            {/* Start Scanning Button */}
            <button
              onClick={() => setShowScanner(true)}
              className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Scan QR Code
            </button>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  volunteerScannerService.clearSession(invitationCode);
                  setStep('identify');
                  setSessionData(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm"
              >
                Change Details
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to end your scanning session?')) {
                    volunteerScannerService.clearSession(invitationCode);
                    navigate('/');
                  }
                }}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm"
              >
                End Session
              </button>
            </div>

            {/* Scan History */}
            {scanHistory.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Recent Scans ({scanHistory.length})</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {scanHistory.map((scan) => (
                    <div key={scan.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">
                            {scan.attendanceData.team_name || scan.attendanceData.student?.name || 'Registration'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {new Date(scan.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {scan.totalPresent} ✓
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-medium text-yellow-900 mb-1">Scanning Tips:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Hold device steady while scanning</li>
                    <li>• Ensure good lighting conditions</li>
                    <li>• For teams, mark each member individually</li>
                    <li>• All scans are logged under your name</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleScanResult}
          onError={(error) => {
            console.error('Scan error:', error);
            alert(`Scan Error: ${error}`);
          }}
        />
      )}
    </div>
  );
};

export default VolunteerScanner;
