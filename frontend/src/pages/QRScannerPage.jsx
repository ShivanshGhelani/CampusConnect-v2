import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/client/Layout';
import QRScanner from '../components/client/QRScanner';

const QRScannerPage = () => {
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);

  // Mock event data
  const mockEvents = [
    {
      event_id: 'EVT_HACKATHON_2025',
      event_name: '48-Hour Hackathon Challenge 2025',
      venue: 'Innovation Hub - Tech Park Campus',
      date: '2025-09-20',
      status: 'ongoing',
      registered_teams: 25,
      registered_individuals: 45
    },
    {
      event_id: 'EVT_WORKSHOP_AI_2025',
      event_name: 'AI & Machine Learning Workshop',
      venue: 'Computer Lab A1',
      date: '2025-09-15',
      status: 'upcoming',
      registered_teams: 0,
      registered_individuals: 60
    },
    {
      event_id: 'EVT_SPORTS_CRICKET_2025',
      event_name: 'Inter-Department Cricket Tournament',
      venue: 'Sports Ground',
      date: '2025-09-25',
      status: 'upcoming',
      registered_teams: 12,
      registered_individuals: 0
    }
  ];

  const handleEventSelect = (event) => {
    setCurrentEvent(event);
  };

  const handleStartScanning = () => {
    if (!currentEvent) {
      alert('Please select an event first');
      return;
    }
    setShowScanner(true);
  };

  const handleScanResult = (qrData, attendanceData) => {
    const scanRecord = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      event: currentEvent,
      qrData,
      attendanceData,
      totalPresent: attendanceData.student ? 
        (attendanceData.student.attendance_status === 'present' ? 1 : 0) :
        (attendanceData.leader?.attendance_status === 'present' ? 1 : 0) + 
        (attendanceData.members?.filter(m => m.attendance_status === 'present').length || 0)
    };

    setScanHistory(prev => [scanRecord, ...prev]);
  };

  const getEventStatusColor = (status) => {
    switch (status) {
      case 'ongoing': return 'bg-green-100 text-green-800 border-green-200';
      case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile-first Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">QR Scanner</h1>
                  <p className="text-sm text-gray-600">Event Attendance System</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {currentEvent && (
                  <button
                    onClick={handleStartScanning}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <span className="hidden sm:inline">Start Scanning</span>
                    <span className="sm:hidden">Scan</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 max-w-6xl mx-auto">
          {/* Current Event Selection */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Select Event</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockEvents.map((event) => (
                <div
                  key={event.event_id}
                  onClick={() => handleEventSelect(event)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    currentEvent?.event_id === event.event_id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 text-sm leading-tight">{event.event_name}</h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getEventStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-xs text-gray-600">
                    <p className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {event.venue}
                    </p>
                    <p className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(event.date).toLocaleDateString()}
                    </p>
                    <p className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {event.registered_teams > 0 && `${event.registered_teams} teams`}
                      {event.registered_teams > 0 && event.registered_individuals > 0 && ', '}
                      {event.registered_individuals > 0 && `${event.registered_individuals} individuals`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Event Info */}
          {currentEvent && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{currentEvent.event_name}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-1">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {currentEvent.venue}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(currentEvent.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={handleStartScanning}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 self-start"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Start Scanning QR Codes
                </button>
              </div>
            </div>
          )}

          {/* Instructions */}
          {!currentEvent && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-medium text-yellow-900 mb-1">Getting Started</h3>
                  <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                    <li>Select the event you want to manage attendance for</li>
                    <li>Click "Start Scanning" to open the camera scanner</li>
                    <li>Point your camera at student registration QR codes</li>
                    <li>Mark individual attendance for team members</li>
                    <li>Save attendance records for each scan</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Scan History */}
          {scanHistory.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Scans</h2>
              <div className="space-y-3">
                {scanHistory.slice(0, 5).map((scan) => (
                  <div key={scan.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {scan.attendanceData.team_name || scan.attendanceData.student?.name || 'Registration'}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {scan.qrData.type}
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {scan.totalPresent} present
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">
                          Scanned at {new Date(scan.timestamp).toLocaleTimeString()} • Registration ID: {scan.qrData.reg_id}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile Scanning Instructions */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Scanner Instructions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">For Mobile Devices:</h4>
                <ul className="space-y-1">
                  <li>• Hold device steady while scanning</li>
                  <li>• Ensure good lighting conditions</li>
                  <li>• Allow camera permissions when prompted</li>
                  <li>• Position QR code within the scanning frame</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Team Attendance:</h4>
                <ul className="space-y-1">
                  <li>• One QR code shows all team members</li>
                  <li>• Mark individual members present/absent</li>
                  <li>• Members can arrive at different times</li>
                  <li>• Save attendance after marking all present members</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* QR Scanner Modal */}
        <QRScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleScanResult}
          onError={(error) => console.error('Scan error:', error)}
        />
      </div>
    </Layout>
  );
};

export default QRScannerPage;
