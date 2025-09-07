import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { 
  QrCode, 
  Scan,
  CheckCircle,
  AlertCircle,
  Users,
  Clock,
  Shield,
  Smartphone,
  ArrowLeft,
  RefreshCw,
  UserCheck,
  X,
  Target,
  Calendar
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/ui/Toast';
import { scannerAPI } from '../api/scanner';

const UnifiedQRScanner = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventInfo, setEventInfo] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [notification, setNotification] = useState(null);
  
  // Volunteer information state
  const [volunteerInfo, setVolunteerInfo] = useState({
    name: '',
    email: ''
  });
  const [volunteerInfoSet, setVolunteerInfoSet] = useState(false);
  const [showVolunteerForm, setShowVolunteerForm] = useState(true);

  useEffect(() => {
    if (token) {
      loadScannerInfo();
    }
    
    // Check if volunteer info exists in sessionStorage
    const savedVolunteerInfo = sessionStorage.getItem('volunteer_info');
    if (savedVolunteerInfo) {
      try {
        const parsed = JSON.parse(savedVolunteerInfo);
        setVolunteerInfo(parsed);
        setVolunteerInfoSet(true);
        setShowVolunteerForm(false);
      } catch (err) {
        console.error('Error parsing saved volunteer info:', err);
      }
    }
  }, [token]);

  const loadScannerInfo = async () => {
    try {
      setLoading(true);
      const response = await scannerAPI.getScannerInfo(token);
      
      if (response.data.success) {
        setEventInfo(response.data.data);
      } else {
        setError('Invalid or expired scanner token');
      }
    } catch (err) {
      console.error('Error loading scanner info:', err);
      if (err.response?.status === 401) {
        setError('Scanner token has expired or is invalid');
      } else if (err.response?.status === 404) {
        setError('Event not found');
      } else {
        setError('Failed to load scanner information');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVolunteerSubmit = (e) => {
    e.preventDefault();
    
    if (!volunteerInfo.name.trim() || !volunteerInfo.email.trim()) {
      showNotification('Please enter both name and email', 'error');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(volunteerInfo.email)) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }

    // Save to session storage
    sessionStorage.setItem('volunteer_info', JSON.stringify(volunteerInfo));
    setVolunteerInfoSet(true);
    setShowVolunteerForm(false);
    showNotification(`Welcome ${volunteerInfo.name}! You can now start scanning.`, 'success');
  };

  const initializeScanner = async () => {
    try {
      // Check camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      
      // Set scanning state to show scanner component
      setIsScanning(true);
      showNotification('Scanner started. Point your camera at a QR code.', 'success');
    } catch (error) {
      console.error('Camera permission denied:', error);
      toast.error('Camera access is required for scanning QR codes');
    }
  };


  const stopScanning = () => {
    setIsScanning(false);
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStrategyIcon = (strategy) => {
    switch (strategy) {
      case 'session_based': return <Clock className="w-4 h-4" />;
      case 'day_based': return <Calendar className="w-4 h-4" />;
      case 'milestone_based': return <Target className="w-4 h-4" />;
      case 'single_mark': return <UserCheck className="w-4 h-4" />;
      default: return <QrCode className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Validating scanner access...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Scanner Access Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-green-600" />
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">QR Attendance Scanner</h1>
                  <p className="text-sm text-gray-500">{eventInfo?.event_name}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {volunteerInfoSet && (
                <div className="text-right text-sm">
                  <div className="text-gray-600">Operator: <span className="font-medium">{volunteerInfo.name}</span></div>
                  <div className="text-gray-500">{volunteerInfo.email}</div>
                  <button
                    onClick={() => {
                      sessionStorage.removeItem('volunteer_info');
                      setVolunteerInfoSet(false);
                      setShowVolunteerForm(true);
                      if (isScanning) {
                        stopScanning();
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                  >
                    Change Volunteer
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                {getStrategyIcon(eventInfo?.attendance_strategy)}
                <span className="text-gray-600">
                  {eventInfo?.attendance_strategy?.replace('_', ' ').toUpperCase() || 'SINGLE MARK'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Volunteer Information Form */}
        {showVolunteerForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="text-center mb-6">
              <UserCheck className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-gray-900">Volunteer Information</h2>
              <p className="text-gray-600">Please provide your details to start marking attendance</p>
            </div>

            <form onSubmit={handleVolunteerSubmit} className="max-w-md mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={volunteerInfo.name}
                  onChange={(e) => setVolunteerInfo(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={volunteerInfo.email}
                  onChange={(e) => setVolunteerInfo(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <UserCheck className="w-5 h-5" />
                Continue to Scanner
              </button>
            </form>

            <div className="mt-6 text-xs text-gray-500 text-center space-y-1">
              <p>• Your information will be recorded with each attendance mark</p>
              <p>• This information is stored temporarily for this session only</p>
            </div>
          </div>
        )}

        {/* Scanner Interface - Only show when volunteer info is set */}
        {volunteerInfoSet && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              <QrCode className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-gray-900">Scan QR Codes</h2>
              <p className="text-gray-600">Point camera at participant's QR code</p>
            </div>

            {!isScanning ? (
              <div className="space-y-4">
                <button
                  onClick={initializeScanner}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-medium"
                >
                  <Scan className="w-5 h-5" />
                  Start Scanning
                </button>

                <div className="text-sm text-gray-500 space-y-1">
                  <p>• Ensure good lighting for better scanning</p>
                  <p>• Hold device steady when scanning</p>
                  <p>• QR codes work from 6-12 inches away</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {scanResult && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <h4 className="font-medium text-green-800">Attendance Marked!</h4>
                        <p className="text-sm text-green-700">
                          {scanResult.student_name || scanResult.full_name} - {scanResult.result?.status}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* React QR Scanner */}
                <div className="w-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Scanner
                    onScan={(result) => {
                      if (result && result.length > 0) {
                        handleScanSuccess(result[0].rawValue);
                      }
                    }}
                    onError={(error) => console.warn('QR Scanner error:', error)}
                    constraints={{
                      facingMode: 'environment'
                    }}
                    styles={{
                      container: { width: '100%', height: '400px' }
                    }}
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                      <div className="bg-white rounded-lg p-4 flex items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="text-gray-700">Processing...</span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={stopScanning}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                  Stop Scanner
                </button>
              </div>
            )}
          </div>

          {/* Recent Scans Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Scans</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                {scanHistory.length} scanned
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {scanHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Smartphone className="w-8 h-8 mx-auto mb-2" />
                  <p>No scans yet</p>
                  <p className="text-sm">Start scanning to see results here</p>
                </div>
              ) : (
                scanHistory.map((scan, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border ${
                      scan.status === 'success' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">
                        {scan.student_name || scan.full_name || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(scan.timestamp)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {scan.status === 'success' ? (
                        <>
                          Status: <span className="font-medium">{scan.result?.status}</span>
                          {scan.result?.percentage && (
                            <> • {scan.result.percentage}% attendance</>
                          )}
                          <br />
                          <span className="text-gray-500">Marked by: {scan.marked_by}</span>
                        </>
                      ) : (
                        <span className="text-red-600">Error: {scan.error}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        )}

        {/* Event Info Footer */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
            <div>
              <div className="text-gray-500">Event</div>
              <div className="font-medium">{eventInfo?.event_name}</div>
            </div>
            <div>
              <div className="text-gray-500">Strategy</div>
              <div className="font-medium">{eventInfo?.attendance_strategy?.replace('_', ' ')}</div>
            </div>
            <div>
              <div className="text-gray-500">Token Expires</div>
              <div className="font-medium">
                {eventInfo?.token_expires_at 
                  ? new Date(eventInfo.token_expires_at).toLocaleDateString()
                  : 'N/A'
                }
              </div>
            </div>
            <div>
              <div className="text-gray-500">Total Scanned</div>
              <div className="font-medium">{scanHistory.filter(s => s.status === 'success').length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <Toast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default UnifiedQRScanner;
