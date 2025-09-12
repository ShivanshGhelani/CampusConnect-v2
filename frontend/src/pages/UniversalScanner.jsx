import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRScanner from '../components/client/QRScanner';
import universalScannerService from '../services/UniversalScannerService';

const UniversalScanner = () => {
  const { eventSlug } = useParams(); // e.g., "hackathon-2025"
  const navigate = useNavigate();
  
  const [step, setStep] = useState('access'); // 'access' | 'location' | 'scanning'
  const [accessCode, setAccessCode] = useState('');
  const [volunteerName, setVolunteerName] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [sessionData, setSessionData] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [scanHistory, setScanHistory] = useState([]);

  // Mock event data - would come from API
  const eventData = {
    hackathon_2025: {
      event_name: '48-Hour Hackathon Challenge 2025',
      event_id: 'EVT_HACKATHON_2025',
      venues: [
        'Main Entrance',
        'Registration Desk',
        'Lab A1 - Development Floor',
        'Lab A2 - Design Floor', 
        'Cafeteria Entrance',
        'Auditorium - Presentation Area',
        'Parking Gate',
        'Emergency Exit'
      ]
    }
  };

  const currentEvent = eventData[eventSlug];

  const validateAccessCode = async (code, name) => {
    setIsValidating(true);
    setError('');

    try {
      const session = await universalScannerService.validateAccessCodeAndCreateSession(
        eventSlug, 
        code, 
        name
      );

      setSessionData(session);
      setStep('location');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsValidating(false);
    }
  };

  const startScanning = () => {
    if (!selectedLocation) {
      setError('Please select your check-in point location.');
      return;
    }
    
    setStep('scanning');
    setError('');
  };

  const handleScanResult = async (qrData, attendanceData) => {
    try {
      // Record scan with backend service
      const result = await universalScannerService.recordAttendanceScan(
        sessionData.session_id,
        selectedLocation,
        qrData,
        attendanceData
      );

      const scanRecord = {
        id: result.scan_id || Date.now(),
        timestamp: result.timestamp || new Date().toISOString(),
        volunteer_name: sessionData.volunteer_name,
        check_in_point: selectedLocation,
        qrData,
        attendanceData,
        event: currentEvent,
        totalPresent: attendanceData.student ? 
          (attendanceData.student.attendance_status === 'present' ? 1 : 0) :
          (attendanceData.leader?.attendance_status === 'present' ? 1 : 0) + 
          (attendanceData.members?.filter(m => m.attendance_status === 'present').length || 0)
      };

      setScanHistory(prev => [scanRecord, ...prev]);
    } catch (error) {
      
      // Still add to local history for fallback
      const scanRecord = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        volunteer_name: sessionData.volunteer_name,
        check_in_point: selectedLocation,
        qrData,
        attendanceData,
        event: currentEvent,
        totalPresent: attendanceData.student ? 
          (attendanceData.student.attendance_status === 'present' ? 1 : 0) :
          (attendanceData.leader?.attendance_status === 'present' ? 1 : 0) + 
          (attendanceData.members?.filter(m => m.attendance_status === 'present').length || 0),
        error: 'Failed to sync with server'
      };

      setScanHistory(prev => [scanRecord, ...prev]);
    }
  };

  const formatTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m remaining`;
  };

  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h1>
          <p className="text-gray-600 mb-4">The event "{eventSlug}" could not be found.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
              <h1 className="text-xl font-bold text-gray-900">Event Scanner</h1>
              <p className="text-sm text-gray-600">{currentEvent.event_name}</p>
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
        {/* Step 1: Access Code Entry */}
        {step === 'access' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Scanner Access</h2>
              <p className="text-gray-600">Enter the current access code and your name to begin scanning</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Access Code
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="123-456"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono"
                  maxLength={7}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ask the event organizer for the current code
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Full Name
                </label>
                <input
                  type="text"
                  value={volunteerName}
                  onChange={(e) => setVolunteerName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                onClick={() => validateAccessCode(accessCode, volunteerName)}
                disabled={!accessCode || !volunteerName || isValidating}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {isValidating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Validating...
                  </>
                ) : (
                  'Get Access'
                )}
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">How to get started:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Ask the event organizer for the current access code</li>
                    <li>Enter the code and your full name</li>
                    <li>Select your scanning location</li>
                    <li>Start scanning QR codes</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Location Selection */}
        {step === 'location' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Location</h2>
              <p className="text-gray-600">Choose your current check-in point</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800">
                ✅ <strong>Access Granted:</strong> {sessionData.volunteer_name}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Current Check-in Point
              </label>
              <div className="space-y-2">
                {currentEvent.venues.map((venue) => (
                  <label key={venue} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="location"
                      value={venue}
                      checked={selectedLocation === venue}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-900">{venue}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={startScanning}
              disabled={!selectedLocation}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Start QR Scanner
            </button>
          </div>
        )}

        {/* Step 3: Scanning Interface */}
        {step === 'scanning' && (
          <div className="space-y-4">
            {/* Current Session Info */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
              <div className="text-center">
                <h3 className="font-bold text-gray-900">Scanning Active</h3>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Volunteer:</strong> {sessionData.volunteer_name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Location:</strong> {selectedLocation}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Session {formatTimeRemaining(sessionData.expires_at)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setStep('location')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm"
              >
                Change Location
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm"
              >
                End Session
              </button>
            </div>

            {/* Scan History */}
            {scanHistory.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Recent Scans</h4>
                <div className="space-y-2">
                  {scanHistory.slice(0, 3).map((scan) => (
                    <div key={scan.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {scan.attendanceData.team_name || scan.attendanceData.student?.name || 'Registration'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {new Date(scan.timestamp).toLocaleTimeString()} • {scan.totalPresent} present
                          </p>
                        </div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Verified
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    <li>• Mark individual team members present/absent</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QR Scanner Modal - only show when actively scanning */}
      {step === 'scanning' && (
        <QRScanner
          isOpen={true}
          onClose={() => {}} // Can't close during active scanning
          onScan={handleScanResult}
          onError={(error) => console.error('Scan error:', error)}
        />
      )}
    </div>
  );
};

export default UniversalScanner;
