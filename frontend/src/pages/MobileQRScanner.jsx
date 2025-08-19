import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QRScanner from '../components/client/QRScanner';

const MobileQRScanner = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showScanner, setShowScanner] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get event from URL params
  const eventId = searchParams.get('event');
  const eventName = searchParams.get('name');
  const venue = searchParams.get('venue');

  useEffect(() => {
    // Auto-set event if passed via URL params
    if (eventId && eventName) {
      setCurrentEvent({
        event_id: eventId,
        event_name: decodeURIComponent(eventName),
        venue: venue ? decodeURIComponent(venue) : 'Event Venue',
        date: new Date().toISOString().split('T')[0],
        status: 'ongoing'
      });
      setShowScanner(true);
    }
    setIsLoading(false);
  }, [eventId, eventName, venue]);

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

  const handleStartScanning = () => {
    setShowScanner(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scanner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-first Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10 shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Mobile QR Scanner</h1>
                <p className="text-xs text-gray-600">Event Attendance</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Current Event Info */}
        {currentEvent && (
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <h3 className="font-bold text-gray-900 mb-1">{currentEvent.event_name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {currentEvent.venue}
            </div>
            
            <button
              onClick={handleStartScanning}
              className="mt-3 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Start Camera Scanner
            </button>
          </div>
        )}

        {/* Quick Instructions */}
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-medium text-yellow-900 mb-1">Scanner Tips</h3>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Hold device steady while scanning</li>
                <li>• Ensure good lighting conditions</li>
                <li>• Position QR code within the frame</li>
                <li>• Mark individual team members present</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Recent Scans */}
        {scanHistory.length > 0 && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Scans</h2>
            <div className="space-y-3">
              {scanHistory.slice(0, 3).map((scan) => (
                <div key={scan.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {scan.attendanceData.team_name || scan.attendanceData.student?.name || 'Registration'}
                    </h4>
                    <div className="flex items-center gap-1">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {scan.qrData.type}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {scan.totalPresent} ✓
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    {new Date(scan.timestamp).toLocaleTimeString()} • {scan.qrData.reg_id}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Event Selected */}
        {!currentEvent && (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Event Selected</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Please use a valid scanner link or select an event from the admin panel.
            </p>
            <button
              onClick={() => navigate('/admin/qr-scanner')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Event Selection
            </button>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScanResult}
        onError={(error) => console.error('Scan error:', error)}
      />
    </div>
  );
};

export default MobileQRScanner;
