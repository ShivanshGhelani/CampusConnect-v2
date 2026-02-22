import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import volunteerScannerService from '../services/volunteerScannerService';
import QRScanner from '../components/client/QRScanner';

const VolunteerScanner = () => {
  const { invitationCode } = useParams();
  const navigate = useNavigate();
  
  // State
  const [step, setStep] = useState('loading'); // 'loading' | 'waiting' | 'identify' | 'scanning' | 'expired'
  const [volunteerName, setVolunteerName] = useState('');
  const [volunteerContact, setVolunteerContact] = useState('');
  const [sessionData, setSessionData] = useState(null);
  const [invitationData, setInvitationData] = useState(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [error, setError] = useState('');
  const [scanHistory, setScanHistory] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);
  const [showScanFeedback, setShowScanFeedback] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  
  // Team selection state
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [teamData, setTeamData] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [scannedQrData, setScannedQrData] = useState(null);
  const [isLoadingTeamData, setIsLoadingTeamData] = useState(false);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [expandedScans, setExpandedScans] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);

  // Restore scan history from localStorage on mount
  useEffect(() => {
    const storedHistory = localStorage.getItem(`scan_history_${invitationCode}`);
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory);
        setScanHistory(parsed);
      } catch (error) {
        console.error('Failed to parse scan history:', error);
      }
    }
  }, [invitationCode]);

  // Validate invitation on mount
  useEffect(() => {
    validateInvitation();
  }, [invitationCode]);

  // Countdown timer — runs when waiting for the attendance window to open
  useEffect(() => {
    if (step !== 'waiting' || !invitationData?.attendance_start_time) return;

    const startTime = new Date(invitationData.attendance_start_time);

    const tick = () => {
      const diff = startTime - new Date();
      if (diff <= 0) {
        setTimeRemaining(null);
        validateInvitation(); // re-check now that window may have opened
      } else {
        setTimeRemaining(diff);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [step, invitationData?.attendance_start_time]);

  // Countdown timer for before-start scenario
  useEffect(() => {
    if (!invitationData?.attendance_start_time) return;
    
    const startTime = new Date(invitationData.attendance_start_time);
    const now = new Date();
    
    // Only run timer if event hasn't started yet
    if (now < startTime) {
      const updateCountdown = () => {
        const now = new Date();
        const diff = startTime - now;
        
        if (diff <= 0) {
          // Time's up! Re-validate to allow access
          setTimeRemaining(null);
          validateInvitation();
        } else {
          setTimeRemaining(diff);
        }
      };
      
      // Update immediately
      updateCountdown();
      
      // Update every second
      const interval = setInterval(updateCountdown, 1000);
      
      return () => clearInterval(interval);
    } else {
      setTimeRemaining(null);
    }
  }, [invitationData?.attendance_start_time]);

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
      console.log('📊 Invitation data received:', data);
      setInvitationData(data);

      // Frontend time-window check using the returned start/end times
      if (data.attendance_start_time && data.attendance_end_time) {
        const now = new Date();
        const start = new Date(data.attendance_start_time);
        const end = new Date(data.attendance_end_time);

        if (now < start) {
          // Too early — show countdown
          setStep('waiting');
          return;
        }
        if (now > end) {
          // Window has closed
          setStep('expired');
          return;
        }
        // Within window — proceed
        setStep('identify');
        return;
      }

      // No time window configured — fall back to backend flag
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
      
      console.log('📋 Volunteer session created, moving to scanning step');
      console.log('🎬 Scanner should auto-open in 500ms...');
      
      // Auto-start scanner after short delay
      setTimeout(() => {
        console.log('🚀 Opening scanner modal now!');
        setShowScanner(true);
      }, 500);
      
    } catch (error) {
      setError(error.message);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleScanResult = async (qrData, attendanceData) => {
    try {
      // Close scanner modal
      setShowScanner(false);
      
      // Check if this is a team QR code (version 4.0 directly or 5.0 resolved to team type)
      if (qrData.type === 'team') {
        // Team QR - fetch full data from backend
        setIsLoadingTeamData(true);
        setScannedQrData(qrData);
        
        try {
          const teamInfo = await volunteerScannerService.fetchTeamData(
            sessionData.session_id,
            qrData.registration_id
          );
          
          setTeamData(teamInfo);
          // Start with NO members selected - volunteer must choose who is present
          setSelectedMembers([]);
          setShowTeamSelection(true);
          setIsLoadingTeamData(false);
        } catch (error) {
          setIsLoadingTeamData(false);
          
          // Check for event mismatch
          if (error.type === 'event_mismatch') {
            alert(`❌ Wrong Event!\n\n` +
                  `This QR code is for:\n"${error.qr_event.name}"\n\n` +
                  `But your scanner is for:\n"${error.scanner_event.name}"\n\n` +
                  `Please scan QR codes only from the correct event.`);
          } else {
            alert(`❌ Failed to load team data: ${error.message}`);
          }
          
          // Reopen scanner
          setShowScanner(true);
        }
        
        return;
      }
      
      // Individual QR - mark immediately
      try {
        const result = await volunteerScannerService.markAttendance(
          sessionData.session_id,
          qrData,
          attendanceData
        );
        
        handleAttendanceMarked(qrData, attendanceData, result);
      } catch (error) {
        // Check for event mismatch
        if (error.type === 'event_mismatch') {
          alert(`❌ Wrong Event!\n\n` +
                `This QR code is for:\n"${error.qr_event.name}"\n\n` +
                `But your scanner is for:\n"${error.scanner_event.name}"\n\n` +
                `Please scan QR codes only from the correct event.`);
        } else {
          alert(`❌ Failed to mark attendance: ${error.message}`);
        }
        
        // Reopen scanner
        setShowScanner(true);
      }
      
    } catch (error) {
      console.error('Failed to process scan:', error);
      alert(`❌ Failed to process scan: ${error.message}`);
      setShowScanner(true);
    }
  };
  
  const handleAttendanceMarked = (qrData, attendanceData, result) => {
    // Calculate total present
    const totalPresent = result.is_team ? 
      result.members_count :
      (attendanceData.student ? 
        (attendanceData.student.attendance_status === 'present' ? 1 : 0) :
        (attendanceData.leader?.attendance_status === 'present' ? 1 : 0) + 
        (attendanceData.members?.filter(m => m.attendance_status === 'present').length || 0));
    
    // Add to scan history
    const scanRecord = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      qrData,
      attendanceData,
      totalPresent,
      result,
      alreadyMarked: result.already_marked || false,
      previousMarkedBy: result.previous_marked_by,
      message: result.message
    };
    
    // Show visual feedback
    setLastScanResult(scanRecord);
    setShowScanFeedback(true);
    
    // Show appropriate alert message
    if (result.message) {
      alert(`✓ ${result.message}`);
    } else if (result.already_marked) {
      alert(`✓ Already Marked!\n\nAttendance has been re-confirmed.`);
    } else {
      alert(`✓ Attendance marked successfully!`);
    }
    
    setTimeout(() => {
      setShowScanFeedback(false);
      // Auto-reopen scanner for next scan
      setShowScanner(true);
    }, 2000);
    
    setScanHistory(prev => {
      const newHistory = [scanRecord, ...prev];
      localStorage.setItem(`scan_history_${invitationCode}`, JSON.stringify(newHistory));
      return newHistory;
    });
  };
  
  const handleTeamMemberToggle = (enrollmentNo, action) => {
    if (action === 'present') {
      // Add to selected (mark present) - only if not already present
      if (!selectedMembers.includes(enrollmentNo)) {
        setSelectedMembers(prev => [...prev, enrollmentNo]);
      }
    } else if (action === 'absent') {
      // Remove from selected (mark absent) - only if currently present
      if (selectedMembers.includes(enrollmentNo)) {
        setSelectedMembers(prev => prev.filter(e => e !== enrollmentNo));
      }
    }
  };
  
  const handleConfirmTeamAttendance = async () => {
    // Allow confirming even with 0 selected (marking all as absent/pending)
    setIsMarkingAttendance(true);
    
    try {
      const result = await volunteerScannerService.markAttendance(
        sessionData.session_id,
        scannedQrData,
        { team: true }, // Dummy attendance data for teams
        selectedMembers  // Can be empty array - marks selected as present, rest remain as-is
      );
      
      // Close team selection modal
      setShowTeamSelection(false);
      setTeamData(null);
      setScannedQrData(null);
      setSelectedMembers([]);
      setIsMarkingAttendance(false);
      
      // Handle success
      const message = selectedMembers.length > 0 
        ? `✓ Marked ${selectedMembers.length} member(s) present`
        : '✓ Attendance recorded (no changes made)';
      
      handleAttendanceMarked(scannedQrData, { team: teamData.team }, { 
        ...result, 
        message 
      });
      
    } catch (error) {
      setIsMarkingAttendance(false);
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

  const formatCountdown = (milliseconds) => {
    if (!milliseconds || milliseconds <= 0) return '0s';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) {
      return 'Not Set';
    }
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // ── Waiting / countdown screen ──────────────────────────────────────────
  if (step === 'waiting') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-green-900 mb-1">Scanner Opens Soon</h1>
          <p className="text-gray-500 text-sm mb-4">{invitationData?.event_name}</p>

          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5 mb-5">
            <p className="text-green-700 font-medium mb-1">Opens in</p>
            <p className="text-4xl font-bold text-green-600">{formatCountdown(timeRemaining)}</p>
            <p className="text-xs text-green-600 mt-2">Page will refresh automatically</p>
          </div>

          {invitationData?.attendance_start_time && (
            <div className="text-sm text-gray-600 space-y-1 mb-5">
              <p>📅 <span className="font-medium">Start:</span> {formatDateTime(invitationData.attendance_start_time)}</p>
              <p>📅 <span className="font-medium">End:</span> {formatDateTime(invitationData.attendance_end_time)}</p>
            </div>
          )}

          <button onClick={() => navigate('/')} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
            Go Home
          </button>
        </div>
      </div>
    );
  }

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
    const isAfterEnd = invitationData?.attendance_end_time &&
                       new Date() > new Date(invitationData.attendance_end_time);

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.268 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {isAfterEnd ? 'Attendance Window Closed' : 'Invalid Invitation'}
          </h1>

          {invitationData ? (
            <div className="mb-6">
              <p className="text-gray-500 text-sm mb-4">
                {isAfterEnd
                  ? 'The attendance marking period for this event has ended.'
                  : 'This invitation is no longer active.'}
              </p>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-1 text-sm text-gray-600">
                <p className="font-semibold text-gray-900">{invitationData.event_name}</p>
                {invitationData.attendance_start_time && (
                  <p>📅 Start: {formatDateTime(invitationData.attendance_start_time)}</p>
                )}
                {invitationData.attendance_end_time && (
                  <p>📅 End: {formatDateTime(invitationData.attendance_end_time)}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 mb-6 text-sm">
              {error || 'This invitation link is invalid or has expired.'}
            </p>
          )}

          <button onClick={() => navigate('/')}
            className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
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
                  {invitationData.attendance_start_time && invitationData.attendance_end_time && (
                    <>
                      <p><strong>Attendance Window:</strong></p>
                      <p className="ml-4">Start: {formatDateTime(invitationData.attendance_start_time)}</p>
                      <p className="ml-4">End: {formatDateTime(invitationData.attendance_end_time)}</p>
                    </>
                  )}
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
              onClick={() => {
                console.log('👆 Scan QR Code button clicked!');
                console.log('📱 Opening scanner modal...');
                setShowScanner(true);
              }}
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
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Recent Scans ({scanHistory.length})</h4>
                  {scanHistory.length > 5 && (
                    <button
                      onClick={() => setShowAllHistory(!showAllHistory)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      {showAllHistory ? (
                        <>
                          Show Less
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </>
                      ) : (
                        <>
                          Show All
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(showAllHistory ? scanHistory : scanHistory.slice(0, 5)).map((scan) => {
                    const isExpanded = expandedScans[scan.id];
                    const isTeamScan = scan.result?.is_team || scan.attendanceData?.team_name;
                    
                    // Get list of marked names
                    let markedNames = [];
                    if (isTeamScan && scan.attendanceData?.members) {
                      markedNames = scan.attendanceData.members
                        .filter(m => m.attendance_status === 'present')
                        .map(m => m.name);
                      // Add leader if present
                      if (scan.attendanceData.leader?.attendance_status === 'present') {
                        markedNames.unshift(`${scan.attendanceData.leader.name} 👑`);
                      }
                    } else if (scan.attendanceData?.student?.name) {
                      markedNames = [scan.attendanceData.student.name];
                    }
                    
                    return (
                      <div key={scan.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div 
                          className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => setExpandedScans(prev => ({...prev, [scan.id]: !prev[scan.id]}))}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 text-sm">
                                  {scan.attendanceData.team_name || scan.attendanceData.student?.name || 'Registration'}
                                </p>
                                {isTeamScan && (
                                  <svg 
                                    className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                )}
                              </div>
                              <p className="text-xs text-gray-600">
                                {new Date(scan.timestamp).toLocaleTimeString()}
                                {scan.alreadyMarked && (
                                  <span className="ml-2 text-orange-600 font-medium">• Re-scan</span>
                                )}
                              </p>
                            </div>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {scan.totalPresent} ✓
                            </span>
                          </div>
                        </div>
                        
                        {/* Expanded Names List */}
                        {isExpanded && markedNames.length > 0 && (
                          <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                            <div className="bg-gray-50 rounded p-2 mt-2">
                              <p className="text-xs font-semibold text-gray-700 mb-1">Marked Present:</p>
                              <ul className="space-y-1">
                                {markedNames.map((name, idx) => (
                                  <li key={idx} className="text-xs text-gray-600 flex items-center gap-1">
                                    <span className="text-green-600">✓</span> {name}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
          sessionData={sessionData}
          onClose={() => {
            console.log('🚪 Scanner modal closing...');
            setShowScanner(false);
          }}
          onScan={handleScanResult}
          onError={(error) => {
            console.error('❌ Scan error from QRScanner:', error);
            alert(`Scan Error: ${error}`);
          }}
        />
      )}
      
      {/* Team Member Selection Modal */}
      {showTeamSelection && teamData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50">
              <h3 className="text-lg font-bold text-gray-900">Mark Team Attendance</h3>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-700">
                  <strong>Team:</strong> {teamData.team.name}
                </p>
                <p className="text-xs text-gray-600">
                  <strong>Team Registration ID:</strong> {scannedQrData?.registration_id || 'N/A'}
                </p>
              </div>
              {teamData.target.day && (
                <p className="text-sm text-blue-600 mt-2 font-medium">
                  📅 Marking for: <strong>{teamData.target.session_name || `Day ${teamData.target.day}`}</strong>
                </p>
              )}
              {teamData.target.session && (
                <p className="text-sm text-blue-600 mt-2 font-medium">
                  📋 Marking for: <strong>{teamData.target.session_name || teamData.target.session}</strong>
                </p>
              )}
            </div>
            
            {/* Member List */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="mb-3 bg-white p-3 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    {selectedMembers.length} of {teamData.members.length} marked present
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedMembers(teamData.members.map(m => m.enrollment_no))}
                      className="text-sm text-green-600 hover:text-green-700 font-medium px-3 py-1 rounded bg-green-50 hover:bg-green-100"
                    >
                      All Present
                    </button>
                    <button
                      onClick={() => setSelectedMembers([])}
                      className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1 rounded bg-red-50 hover:bg-red-100"
                    >
                      All Absent
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                {teamData.members.map((member) => {
                  const isMarkedPresent = selectedMembers.includes(member.enrollment_no);
                  const currentStatus = member.current_session_status || member.overall_status;
                  const markedBy = member.current_session_marked_by || null;
                  const sessionNotes = member.current_session_notes || null;
                  const isAlreadyMarkedForSession = member.current_session_status === 'present';
                  
                  // Determine if marked by organizer (via admin portal) or volunteer (via QR scanner)
                  let markedByDisplay = markedBy;
                  
                  if (isAlreadyMarkedForSession && markedBy && sessionNotes) {
                    // Check if marked via unified portal (admin)
                    if (sessionNotes.includes('unified portal')) {
                      markedByDisplay = 'Organizer';
                    }
                  }
                  
                  // Determine display status based on current session
                  let displayStatus = 'pending';
                  let displayPercentage = Math.min(member.percentage || 0, 100); // Cap at 100%
                  
                  // If current session status is present, show present
                  if (currentStatus === 'present') {
                    displayStatus = 'present';
                  } else if (currentStatus === 'absent') {
                    displayStatus = 'absent';
                  } else if (displayPercentage > 0 && displayPercentage < 100) {
                    displayStatus = 'partial';
                  } else if (displayPercentage === 100) {
                    displayStatus = 'present';
                  }
                  
                  return (
                    <div
                      key={member.enrollment_no}
                      className={`bg-white border-2 rounded-lg p-4 shadow-sm transition-all ${
                        isMarkedPresent 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Member Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900 text-base">
                                {member.name}
                              </h4>
                              {member.is_leader && (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                                  👑 Leader
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p>
                                <strong>Enrollment:</strong> {member.enrollment_no}
                              </p>
                              <p>
                                <strong>Department:</strong> {member.department}
                              </p>
                              {member.mobile_no && (
                                <p>
                                  <strong>Mobile:</strong> {member.mobile_no}
                                </p>
                              )}
                              {member.registration_id && (
                                <p className="text-xs text-gray-500">
                                  <strong>Reg ID:</strong> {member.registration_id}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Current Status Badge */}
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              displayStatus === 'present' 
                                ? 'bg-green-100 text-green-800' 
                                : displayStatus === 'partial'
                                ? 'bg-yellow-100 text-yellow-800'
                                : displayStatus === 'absent'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {displayStatus === 'present' ? '✓ Present' : 
                               displayStatus === 'partial' ? '⚠ Partial' : 
                               displayStatus === 'absent' ? '✗ Absent' :
                               '○ Pending'}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {displayPercentage}% overall
                            </p>
                          </div>
                        </div>
                        
                        {/* Action Buttons or Already Marked Message */}
                        {isAlreadyMarkedForSession ? (
                          <div className="pt-2 border-t border-gray-200">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                              <p className="text-sm font-semibold text-blue-900">✓ Already Marked Present</p>
                              {markedByDisplay && (
                                <p className="text-xs text-blue-700 mt-1">
                                  Marked by: <strong>{markedByDisplay}</strong>
                                </p>
                              )}
                              {member.current_session_marked_at && (
                                <p className="text-xs text-blue-600 mt-0.5">
                                  {new Date(member.current_session_marked_at).toLocaleString('en-IN', {
                                    timeZone: 'Asia/Kolkata',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: true
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 pt-2 border-t border-gray-200">
                            <button
                              onClick={() => handleTeamMemberToggle(member.enrollment_no, 'present')}
                              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                                isMarkedPresent
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-white text-gray-700 hover:bg-green-50 hover:text-green-700 border-2 border-gray-300 hover:border-green-500'
                              }`}
                            >
                              {isMarkedPresent ? '✓ Present' : 'Mark Present'}
                            </button>
                            <button
                              onClick={() => handleTeamMemberToggle(member.enrollment_no, 'absent')}
                              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors bg-white text-gray-700 hover:bg-red-50 hover:text-red-700 border-2 border-gray-300 hover:border-red-500`}
                            >
                              Mark Absent
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTeamSelection(false);
                    setTeamData(null);
                    setScannedQrData(null);
                    setSelectedMembers([]);
                    setShowScanner(true);
                  }}
                  className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                  disabled={isMarkingAttendance}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmTeamAttendance}
                  disabled={isMarkingAttendance}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
                >
                  {isMarkingAttendance ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      ✓ Confirm Attendance {selectedMembers.length > 0 && `(${selectedMembers.length} present)`}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Loading Team Data Overlay */}
      {isLoadingTeamData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-700 font-medium">Loading team data...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerScanner;
